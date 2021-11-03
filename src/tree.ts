import { TreeModel } from "./models/pubspec";
import * as vscode from "vscode";
import path = require("path");
import { loadFiles, packageName } from "./extension";
import { addSetting } from "./helpers/vscode_helper";

type EventEmitterTreeItem = NestTreeItem | undefined | void;

const getTreeItems = (data: TreeModel): NestTreeItem => {
  return new NestTreeItem(
    data.name,
    data.uri,
    data.children
      ?.sort((a, b) => (a.name > b.name ? 1 : -1))
      .map((e) => getTreeItems(e))
  );
};

export class NestTreeProvider implements vscode.TreeDataProvider<NestTreeItem> {
  private constructor() {}

  private static _instance: NestTreeProvider;
  private static _fileWatcher: vscode.FileSystemWatcher | undefined;

  static get instance() {
    if (!this._instance) {
      this._instance ??= new NestTreeProvider();

      vscode.window.registerTreeDataProvider(
        `${packageName}-view`,
        this._instance
      );

      this.setupFileWatcher();
    }

    return this._instance;
  }

  private _uris: string[] = [];
  private _pubspecUris: string[] = [];

  private getDirPath = (uri: vscode.Uri, skipIfNotFile: boolean = false) => {
    const dir = uri.fsPath;

    const pubspecStr = `${path.sep}pubspec.`;

    if (dir.includes(pubspecStr)) {
      return dir.split(pubspecStr)[0];
    } else if (skipIfNotFile) {
      return;
    }

    return dir;
  };

  public get uris() {
    return this._uris;
  }
  public get pubspecUris() {
    return this._pubspecUris;
  }

  getUrisOf(item: NestTreeItem): string[] {
    const childrenDirs: string[] = [];

    item.children?.forEach((e) => {
      childrenDirs.push(...this.getUrisOf(e));
    });

    const dir = this.getDirPath(item.resourceUri, true);

    if (dir) {
      return [dir, ...childrenDirs];
    }

    return childrenDirs;
  }

  setTreeList(list: TreeModel[]) {
    // reset uris
    this._uris = [];
    this._pubspecUris = [];

    if (list.length > 0) {
      addSetting("showView", true);
    } else {
      addSetting("showView", false);
      return;
    }

    /*
    ? This will flatten the treen if theres only 1 workfolder
    ? but, this removes the ability to upgrade all pubspec.yaml files

    if (list.length === 1) {
      const items = list[0].children
      ?.sort((a, b) => (a.name > b.name ? 1 : -1))
      .map((e) => getTreeItems(e));

      if (items) {
        this.treeList = items;
      } else {
        return;
      }
    } else {
      this.treeList = list
      .sort((a, b) => (a.name > b.name ? 1 : -1))
      .map((e) => getTreeItems(e));
    }
    */

    this.treeList = list
      .sort((a, b) => (a.name > b.name ? 1 : -1))
      .map((e) => getTreeItems(e));

    const children: TreeModel[] = [];

    list.forEach((nest) => {
      this._uris.push(this.getDirPath(nest.uri)!);

      children.push(...(nest?.children ?? []));
    });

    const filesWithBuildRunner: string[] = [];

    children.forEach((child) => {
      const path = this.getDirPath(child.uri)!;
      this._uris.push(path);

      const pubspecPath = this.getDirPath(child.uri, true);

      if (pubspecPath) {
        this._pubspecUris.push(pubspecPath);
      }

      if (child.hasBuildRunnerDep) {
        filesWithBuildRunner.push(`file-${child.name}`);
      }
    });

    console.log("has build runner", filesWithBuildRunner);

    vscode.commands.executeCommand(
      "setContext",
      `${packageName}.hasBuildRunnerDep`,
      filesWithBuildRunner
    );

    this.refresh();
  }

  private static setupFileWatcher() {
    if (this._fileWatcher) {
      return;
    }

    this._fileWatcher = vscode.workspace.createFileSystemWatcher(
      "**/pubspec.{yml,yaml}"
    );

    const watcher = this._fileWatcher;

    let canLoadFiles = true;

    const refreshHandler = async () => {
      if (!canLoadFiles) {
        return;
      }

      canLoadFiles = false;
      await loadFiles();
      canLoadFiles = true;
    };

    watcher.onDidCreate(refreshHandler);

    watcher.onDidChange(refreshHandler);

    watcher.onDidDelete(refreshHandler);
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
