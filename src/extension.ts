import * as vscode from "vscode";
import { Process } from "./process";
import { scanFile as scanWorkspaceForPubspecs } from "./scanFile";
import { NestTreeItem, NestTreeProvider } from "./tree";
import { BuildType } from "./models/enums";
import { addSetting } from "./helpers/vscode_helper";
import path = require("path");
import { createTerminal } from "./util";

const packageName = "dart-build-runner";

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

  register(`${packageName}.build`, (args: NestTreeItem) =>
    Process.instance.runBuildRunner(args, BuildType.build)
  );

  register(`${packageName}.clean-build`, (args: NestTreeItem) =>
    Process.instance.runBuildRunner(args, BuildType.clean)
  );

  register(`${packageName}.watch`, (args: NestTreeItem) =>
    Process.instance.runBuildRunner(args, BuildType.watch)
  );

  register(`${packageName}.get-dependencies`, (args: NestTreeItem) => {
    if (args.contextValue.includes("file")) {
      return Process.instance.runGetDependencies(args);
    } else {
      Process.instance.runGetAllDependencies();
    }
  });

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
    return "file-" + key.split(path.sep).reverse()[0];
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
