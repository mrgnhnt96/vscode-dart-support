import { TreeModel } from "./models/pubspec";
import * as vscode from "vscode";
import { title } from "process";
import { EDEADLK } from "constants";
import path = require("path");

type EventEmitterTreeItem = NestTreeItem | undefined | void;

const recurse = (data: TreeModel): NestTreeItem => {
  return new NestTreeItem(
    data.name,
    data.uri,
    data.children
      ?.sort((a, b) => (a.name > b.name ? 1 : -1))
      .map((e) => recurse(e))
  );
};

export class NestTreeProvider implements vscode.TreeDataProvider<NestTreeItem> {
  private constructor() {}

  private static _instance: NestTreeProvider;

  static get instance() {
    this._instance ??= new NestTreeProvider();
    return this._instance;
  }

  private _uris: string[] = [];

  private getDirPath = (uri: vscode.Uri) => {
    const dir = uri.fsPath;

    const pubspecStr = `${path.sep}pubspec.yaml`;

    if (dir.endsWith(pubspecStr)) {
      return dir.slice(0, dir.length - pubspecStr.length);
    }

    return dir;
  };

  readonly uris = this._uris;

  getUrisOf(item: NestTreeItem): string[] {
    const childrenDirs: string[] = [];

    item.children?.forEach((e) => {
      childrenDirs.push(...this.getUrisOf(e));
    });

    return [this.getDirPath(item.resourceUri), ...childrenDirs];
  }

  setTreeList(list: TreeModel[]) {
    this.treeList = list
      .sort((a, b) => (a.name > b.name ? 1 : -1))
      .map((e) => recurse(e));

    const children: TreeModel[] = [];

    list.forEach((nest) => {
      this._uris.push(this.getDirPath(nest.uri));

      children.push(...(nest?.children ?? []));
    });

    const filesWithBuildRunner: string[] = [];

    children.forEach((child) => {
      const path = this.getDirPath(child.uri);
      this._uris.push(path);

      if (child.hasBuildRunnerDep) {
        filesWithBuildRunner.push(`file-${child.name}`);
      }
    });

    console.log("has build runner", filesWithBuildRunner);

    vscode.commands.executeCommand(
      "setContext",
      "dbr.hasBuildRunnerDep",
      filesWithBuildRunner
    );

    this.refresh();
  }

  private readonly eventEmitter =
    new vscode.EventEmitter<EventEmitterTreeItem>();

  readonly refresh = (): void => this.eventEmitter.fire();

  private treeList: NestTreeItem[] = [];

  readonly onDidChangeTreeData = this.eventEmitter.event;

  readonly getTreeItem = (element: NestTreeItem) => element;

  readonly getChildren = (element: NestTreeItem) =>
    !element ? this.treeList : element.children;
}

export class NestTreeItem extends vscode.TreeItem {
  constructor(
    public readonly title: string,
    public readonly resourceUri: vscode.Uri,
    public readonly children?: NestTreeItem[]
  ) {
    super(
      title,
      children ? vscode.TreeItemCollapsibleState.Expanded : undefined
    );
  }
  private isDir = this.children ? true : false;

  readonly contextValue = `${this.isDir ? "dir" : "file"}-${this.title}`;

  //Commands when click on the tree map item
  readonly command = this.isDir
    ? undefined
    : {
        title: "Open file",
        command: "vscode.open",
        arguments: [this.resourceUri],
      };

  readonly tooltip = `${this.resourceUri?.fsPath}`;
}
