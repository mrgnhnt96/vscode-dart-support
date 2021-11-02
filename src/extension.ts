import * as vscode from "vscode";
import { Process } from "./process";
import { scanFile as scanWorkspaceForPubspecs } from "./scan_file";
import { NestTreeItem, NestTreeProvider } from "./tree";
import { BuildType } from "./models/enums";
import { addSetting } from "./helpers/vscode_helper";
import path = require("path");
import { createTerminal } from "./util";

const packageName = "dart-support";

export async function activate(context: vscode.ExtensionContext) {
  console.log(`${packageName} loading`);

  vscode.window.registerTreeDataProvider(`dbr-view`, NestTreeProvider.instance);

  const register = (
    command: string,
    callback: (...args: any[]) => any,
    thisArg?: any
  ) => {
    return context.subscriptions.push(
      vscode.commands.registerCommand(command, callback, thisArg)
    );
  };

  register(`${packageName}.build`, (args: NestTreeItem | vscode.Uri) =>
    Process.instance.runBuildRunner(args, BuildType.build)
  );

  register(`${packageName}.clean-build`, (args: NestTreeItem | vscode.Uri) =>
    Process.instance.runBuildRunner(args, BuildType.clean)
  );

  register(`${packageName}.watch`, (args: NestTreeItem | vscode.Uri) =>
    Process.instance.runBuildRunner(args, BuildType.watch)
  );

  // register(`${packageName}.filter-build`, (uri: vscode.Uri) =>
  //   Process.instance.runBuildRunnerFiltered(uri, BuildType.build)
  // );

  // register(`${packageName}.filter-watch`, (uri: vscode.Uri) =>
  //   Process.instance.runBuildRunnerFiltered(uri, BuildType.watch)
  // );

  register(
    `${packageName}.get-dependencies`,
    (args: NestTreeItem | undefined) => {
      // triggered by the view
      if (args === undefined) {
        return Process.instance.runGetAllDependencies();
      }

      if (args.contextValue.includes("file")) {
        Process.instance.runGetDependencies(args);
      } else if (args.contextValue.includes("dir")) {
        Process.instance.runGetChildrenDependencies(args);
      }
    }
  );

  register(`${packageName}.upgrade-dependencies`, (args: NestTreeItem) =>
    Process.instance.runUpgradeDependencies(args)
  );

  register(`${packageName}.upgrade-dependencies-major`, (args: NestTreeItem) =>
    Process.instance.runUpgradeDependenciesMajor(args)
  );

  register(`${packageName}.terminate`, (args: NestTreeItem) =>
    Process.instance.terminate(args)
  );

  register(`${packageName}.refresh`, () => {
    NestTreeProvider.instance.setTreeList([]);

    loadFiles();
  });

  register(`${packageName}.open-terminal`, (args: NestTreeItem) => {
    createTerminal(args);
  });

  await loadFiles();
}

async function loadFiles() {
  const nestList = await scanWorkspaceForPubspecs();

  console.log("all pubspec", nestList);

  NestTreeProvider.instance.setTreeList(nestList);

  setPubspecSettings({});
}

export function setPubspecSettings(arg: { [key: string]: any }) {
  const getContextValue = (key: string) => {
    return "file-" + key.split(path.sep).pop();
  };

  const running = Object.keys(arg).map((key) =>
    getContextValue(key.slice(0, -1))
  );

  var notRunning = NestTreeProvider.instance.uris.map((e) =>
    getContextValue(e)
  );

  notRunning = notRunning.filter((file) => {
    return !running.includes(file);
  });

  console.log("not running", notRunning);
  console.log("running", running);

  addSetting("dbr.running", running);
  addSetting("dbr.notRunning", notRunning);

  NestTreeProvider.instance.refresh();
}

export function deactivate() {}
