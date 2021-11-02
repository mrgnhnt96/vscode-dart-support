import * as childProcess from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as vscode from "vscode";
import { setPubspecSettings } from "./extension";
import { removeDuplicates } from "./helpers/remove_duplicates";
import { notify, readSetting } from "./helpers/vscode_helper";
import { BuildType } from "./models/enums";
import { NestTreeItem, NestTreeProvider } from "./tree";
import { createLoading, createOutput, LoadingTask, OutputTask } from "./util";

import pidtree = require("pidtree");
import path = require("path");

interface Processes {
  [key: string]: childProcess.ChildProcess;
}

interface ProcessData {
  title: string;
  uri: string;
}

type Outputs = {
  [key: string]: OutputTask;
};

export class Process {
  private static _instance: Process;
  public static get instance() {
    this._instance = this._instance ?? new Process();
    return this._instance;
  }

  private getDirPath(uri: vscode.Uri) {
    return fs.statSync(uri.fsPath).isFile()
      ? vscode.Uri.joinPath(uri, `..${path.sep}`).fsPath
      : uri.fsPath;
  }

  private getProcessData(data: NestTreeItem): ProcessData {
    const dir = this.getDirPath(data.resourceUri);

    return {
      title: data.title,
      uri: dir,
    };
  }

  setContext() {
    setPubspecSettings(this.processes);
  }

  processes: Processes = {};
  private outputs: Outputs = {};

  async runGetDependencies(data: NestTreeItem) {
    const args = ["pub", "get"];

    const details = this.getProcessData(data);

    notify(`[${data.title}]: Getting dependencies`);

    await this.create(details, args, (message) =>
      message.includes("Succeeded after") ? true : false
    );
  }

  async runGetAllDependencies() {
    const args = ["pub", "get"];

    const uris = removeDuplicates(NestTreeProvider.instance.uris);

    const getTitle = (uri: string) => {
      return uri.split(path.sep).pop()!;
    };

    const details = uris.map((uri) => {
      const data: ProcessData = {
        title: getTitle(uri),
        uri: uri,
      };

      return data;
    });

    notify("[All]: Getting dependencies");

    const promises = details.map((data) => {
      return this.create(
        data,
        args,
        (message) => (message.includes("Succeeded after") ? true : false),
        true
      );
    });

    await Promise.all(promises);
  }

  async runGetChildrenDependencies(data: NestTreeItem) {
    const args = ["pub", "get"];

    const uris = removeDuplicates(NestTreeProvider.instance.getUrisOf(data));

    const getTitle = (uri: string) => {
      return uri.split(path.sep).pop()!;
    };

    const details = uris.map((uri) => {
      const data: ProcessData = {
        title: getTitle(uri),
        uri: uri,
      };

      return data;
    });

    notify(`[${data.title} (workspace)]: Getting dependencies`);

    const promises = details.map((data) => {
      return this.create(
        data,
        args,
        (message) => (message.includes("Succeeded after") ? true : false),
        true
      );
    });

    await Promise.all(promises);
  }

  async runUpgradeDependencies(data: NestTreeItem) {
    const args = ["pub", "upgrade"];

    const details = this.getProcessData(data);

    notify(`[${data.title}]: Upgrading Dependencies`);

    await this.create(details, args, (message) =>
      message.includes("Succeeded after") ? true : false
    );
  }

  async runUpgradeDependenciesMajor(data: NestTreeItem) {
    const args = ["pub", "upgrade", "--major-versions"];

    const details = this.getProcessData(data);

    notify(`[${data.title}]: Upgrading Dependencies (Major)`);

    await this.create(details, args, (message) =>
      message.includes("Succeeded after") ? true : false
    );
  }

  async runBuildRunner(data: NestTreeItem, type: BuildType) {
    const args = ["pub", "run", "build_runner", type];

    if (type !== BuildType.clean) {
      args.push("--delete-conflicting-outputs");
    }

    const details = this.getProcessData(data);

    notify(`Running build_runner ${type} for ${data.title}`);

    await this.create(details, args, (message) =>
      message.includes("Succeeded after") ? true : false
    );
  }

  /**
   * Create the process
   * @param data
   * @param type
   * @returns
   */
  private async create(
    data: ProcessData,
    args: string[] = [],
    isFinished: (message: string) => boolean,
    closeOnFinish: boolean = false
  ) {
    const cwd = data.uri;

    this.outputs[cwd] =
      this.outputs[cwd] ??
      (await createOutput(data.title, async () => {
        delete this.outputs[cwd];

        await this.terminate(data);
      }));

    const output = this.outputs[cwd];
    output.activate();

    let process = this.processes[cwd];

    if (process) {
      const outputIsShow = await output.isShow();
      if (!outputIsShow) {
        return output.show();
      }
    }

    output.activate();

    let _loading: LoadingTask | undefined;
    const loading = async (text: string, stop = false) => {
      _loading = _loading ?? (await createLoading(data.title));
      _loading.report(text);

      if (stop) {
        _loading.stop();
        _loading = undefined;
      }
    };

    output.show();

    this.setContext();

    output.write(cwd);

    const useFlutter = readSetting("useFlutterForBuildRunner") as boolean;

    const command = useFlutter ? "flutter" : "dart";

    output.write([command, ...args].join(" "));

    await loading([command, ...args].join(" "));

    process = childProcess.spawn(command, args, {
      cwd,
      shell: os.platform() === "win32",
    });

    this.processes[cwd] = process;
    this.setContext();

    const getMessage = (value: any) =>
      (value.toString() as string).split("\n").join(" ");

    process.stdout?.on("data", async (value) => {
      const message = getMessage(value);
      const finished = isFinished(message);

      await loading(message, finished);

      output.write(message);
    });

    process.on("error", async (value) => {
      const message = getMessage(value);

      await loading(message);

      output.write(message);
    });

    process.stderr?.on("data", async (value) => {
      const message = getMessage(value);

      await loading(message);

      output.write(message);
    });

    process.on("exit", async (code) => {
      this.processes[cwd]?.kill();

      await loading(`exit ${code}`, true);

      output?.write(`exit ${code}`);

      output?.invalidate();

      console.log("closing on finish?", closeOnFinish);
      if (closeOnFinish) {
        console.log("closing!", cwd);
        output?.close();
      }

      delete this.processes[cwd];

      this.setContext();
    });
  }

  /**
   * Terminate the process
   * @param data
   */
  async terminate(data: ProcessData | NestTreeItem) {
    if (data instanceof NestTreeItem) {
      data = this.getProcessData(data);
    }

    const cwd = data.uri;

    const process = this.processes[cwd];

    if (process?.pid) {
      const isWindow = os.platform() === "win32";

      const kill = isWindow ? "tskill" : "kill";

      const pids = await pidtree(process.pid);

      pids?.forEach((cpid) => {
        childProcess.exec(`${kill} ${cpid}`);
      });
    }
    await new Promise<void>((resolve) => {
      const numid = setInterval(() => {
        if (!this.processes[cwd]) {
          clearInterval(numid);

          resolve();
        }
      }, 100);
    });
  }
}
