import * as vscode from "vscode";
import { TreeModel } from "./models/pubspec";
import { Process } from "./process";
import { scanFile } from "./scanFile";
import { NestTreeItem, NestTreeProvider } from "./tree";
import { BuildType } from "./models/enums";

const packageName = "dart-build-runner";

export async function activate(context: vscode.ExtensionContext) {
  console.log(`${packageName} loading`);

  vscode.window.registerTreeDataProvider(
    `${packageName}-view`,
    NestTreeProvider.instance
  );

  const register = (
    command: string,
    callback: (...args: any[]) => any,
    thisArg?: any
  ) => {
    return context.subscriptions.push(
      vscode.commands.registerCommand(command, callback, thisArg)
    );
  };

  register(`${packageName}.${BuildType.build}`, (args: NestTreeItem) =>
    Process.instance.create(args, BuildType.build)
  );
  register(`${packageName}.${BuildType.watch}`, (args: NestTreeItem) =>
    Process.instance.create(args, BuildType.watch)
  );
  register(`${packageName}.${BuildType.terminate}`, (args: NestTreeItem) =>
    Process.instance.terminate(args)
  );

  const nestList = await scanFile();

  const recurse = (data: TreeModel): NestTreeItem => {
    return new NestTreeItem(
      data.name,
      data.uri,
      data.children?.map((e) => recurse(e))
    );
  };

  NestTreeProvider.instance.treeList = nestList.map((e) => recurse(e));
  NestTreeProvider.instance.refresh();
}

export function deactivate() {}
