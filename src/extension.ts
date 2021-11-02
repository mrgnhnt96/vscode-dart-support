import * as vscode from "vscode";
import { Process } from "./process";
import { scanFile as scanWorkspaceForPubspecs } from "./scanFile";
import { NestTreeItem, NestTreeProvider } from "./tree";
import { BuildType } from "./models/enums";
import { addSetting } from "./helpers/vscode_helper";

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
    Process.instance.create(args, BuildType.build)
  );

  register(`${packageName}.watch`, (args: NestTreeItem) =>
    Process.instance.create(args, BuildType.watch)
  );

  register(`${packageName}.terminate`, (args: NestTreeItem) =>
    Process.instance.terminate(args)
  );

  register(`${packageName}.refresh`, () => {
    NestTreeProvider.instance.setTreeList([]);

    loadFiles();
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
  const processes = Object.keys(arg).map((key) => key.slice(0, -1));

  var uris = NestTreeProvider.instance.uris;

  uris = uris.filter((uri) => {
    return !processes.includes(uri);
  });

  console.log("uris", uris);
  console.log("running", processes);

  addSetting("dbr.running", processes);

  addSetting("dbr.notRunning", uris);

  NestTreeProvider.instance.refresh();
}

export function deactivate() {}
