import * as childProcess from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as vscode from "vscode";
import { setPubspecSettings } from "./extension";
import { removeDuplicates } from "./helpers/remove_duplicates";
import { notify, readSetting } from "./helpers/vscode_helper";
import { BuildType } from "./models/enums";
import { getFilters } from "./get_filters";
import { NestTreeItem, NestTreeProvider } from "./tree";
import { createLoading, createOutput, LoadingTask, OutputTask } from "./util";

import pidtree = require("pidtree");
import path = require("path");

interface Processes {
  [key: string]: childProcess.ChildProcess;
}

enum TriggerType {
  individual = "individual",
  group = "group",
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

  private getTitle = (uri: string) => {
    if (uri.endsWith(path.sep)) {
      const segments = uri.split(path.sep);

      return segments[segments.length - 2];
    } else if (uri.endsWith(".dart")) {
      const segments = uri.split(path.sep);

      return segments
        .join(path.sep)
        .slice(0, -segments[segments.length - 1].length);
    }

    return uri.split(path.sep).pop()!;
  };

  setContext() {
    setPubspecSettings(this.processes);
  }

  processes: Processes = {};
  private outputs: Outputs = {};

  async runGetDependencies(data: NestTreeItem) {
    const args = ["pub", "get"];

    const details = this.getProcessData(data);

    notify(`[${data.title}]: Getting dependencies`);

    await this.create(
      details,
      args,
      (message) => (message.includes("Succeeded after") ? true : false),
      TriggerType.individual
    );
  }

  async runGetAllDependencies() {
    const args = ["pub", "get"];

    const uris = removeDuplicates(NestTreeProvider.instance.pubspecUris);

    const details = uris.map((uri) => {
      const data: ProcessData = {
        title: this.getTitle(uri),
        uri: uri,
      };

      return data;
    });

    notify(`[All: ${uris.length} Packages]: Getting dependencies`);

    const promises = details.map((data) => {
      return this.create(
        data,
        args,
        (message) => (message.includes("Succeeded after") ? true : false),
        TriggerType.group
      );
    });

    await Promise.all(promises);
  }

  async runGetChildrenDependencies(data: NestTreeItem) {
    const args = ["pub", "get"];

    const uris = removeDuplicates(NestTreeProvider.instance.getUrisOf(data));

    const details = uris.map((uri) => {
      const data: ProcessData = {
        title: this.getTitle(uri),
        uri: uri,
      };

      return data;
    });

    notify(`[${data.title}: ${uris.length} Packages]: Getting dependencies`);

    const promises = details.map((data) => {
      return this.create(
        data,
        args,
        (message) => (message.includes("Succeeded after") ? true : false),
        TriggerType.group
      );
    });

    await Promise.all(promises);
  }

  async runUpgradeDependencies(data: NestTreeItem) {
    const args = ["pub", "upgrade"];

    const details = this.getProcessData(data);

    notify(`[${data.title}]: Upgrading Dependencies`);

    await this.create(
      details,
      args,
      (message) => (message.includes("Succeeded after") ? true : false),
      TriggerType.individual
    );
  }

  async runUpgradeDependenciesMajor(data: NestTreeItem) {
    const args = ["pub", "upgrade", "--major-versions"];

    const details = this.getProcessData(data);

    notify(`[${data.title}]: Upgrading Dependencies (Major)`);

    await this.create(
      details,
      args,
      (message) => (message.includes("Succeeded after") ? true : false),
      TriggerType.individual
    );
  }

  async runBuildRunner(data: NestTreeItem | vscode.Uri, type: BuildType) {
    const args = ["pub", "run", "build_runner", type];

    if (type !== BuildType.clean) {
      args.push("--delete-conflicting-outputs");
    }

    let details: ProcessData;

    if (data instanceof NestTreeItem) {
      details = this.getProcessData(data);
    } else {
      const segments = data.fsPath.split(path.sep + "lib" + path.sep);
      const uri = segments[0];
      const title = this.getTitle(uri);

      details = {
        title: title,
        uri: uri,
      };
    }

    notify(`Running build_runner ${type} for ${details.title}`);

    await this.create(
      details,
      args,
      (message) => (message.includes("Succeeded after") ? true : false),
      TriggerType.individual
    );
  }

  /// can't get to work right...
  async runBuildRunnerFiltered(
    uri: vscode.Uri,
    type: BuildType.build | BuildType.watch
  ) {
    const filterData = getFilters(uri);

    if (!filterData || !filterData.filter) {
      notify("build_runner needs a dart file to run!");
      return;
    }

    const args = [
      "pub",
      "run",
      "build_runner",
      type,
      "--delete-conflicting-outputs",
      filterData.filter,
    ];

    const title = this.getTitle(filterData.uri);

    const details: ProcessData = {
      title: title,
      uri: filterData.uri,
    };

    notify(`[${title}]: Running build_runner ${type} (Filtered)`);

    await this.create(
      details,
      args,
      (message) => (message.includes("Succeeded after") ? true : false),
      TriggerType.individual
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
    triggeredBy: TriggerType
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

    const useFlutter = readSetting("useFlutterForCommands") as boolean;

    const command = useFlutter ? "flutter" : "dart";

    const pwdProcess = childProcess
      .exec(
        "pwd",
        {
          cwd: cwd,
        },
        function (_, stdout, __) {
          output.write("[CWD]:", stdout, "\r\n");
        }
      )
      .on("exit", () => {
        pwdProcess.kill();
      });

    const commandStr = [command, ...args].join(" ");

    output.write("[COMMAND]:", commandStr, "\r\n");

    await loading(commandStr);

    process = childProcess.spawn(command, args, {
      cwd: cwd,
      shell: os.platform() === "win32",
    });

    this.processes[cwd] = process;
    this.setContext();

    const getMessage = (value: any) =>
      (value.toString() as string).split("\n").join(" ");

    const handleMessage = async (value: any, isFinished: boolean = false) => {
      const message = getMessage(value);

      await loading(message, isFinished);

      output.write(message);
    };

    process.stdout?.on("data", async (value) =>
      handleMessage(value, isFinished(value))
    );

    process.on("error", async (value) => handleMessage(value));

    process.stderr?.on("data", async (value) => handleMessage(value));

    process.on("exit", async (code) => {
      this.processes[cwd]?.kill();

      await loading(`exit ${code}`, true);

      output?.write(`exit ${code}`);

      output?.invalidate();

      const closeOnFinish = readSetting(
        `closeTerminalsAfterUse.${triggeredBy}`
      );

      if (closeOnFinish) {
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
