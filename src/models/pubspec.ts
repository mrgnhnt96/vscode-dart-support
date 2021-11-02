import * as vscode from "vscode";

export interface PubspecModel {
  name: string;
  uri: vscode.Uri;
  dependencies: {
    [key: string]: Object | string;
  };
  // eslint-disable-next-line @typescript-eslint/naming-convention
  dev_dependencies: {
    [key: string]: Object | string;
  };
}

//pub tree in each workspace
export interface PubspecTreeModel {
  workspace: vscode.WorkspaceFolder;
  pubspec: PubspecTreePubspecModel[];
}

export interface PubspecTreePubspecModel {
  uri: vscode.Uri;
  name: string | null;
}

export interface TreeModel {
  name: string;
  uri: vscode.Uri;
  children?: TreeModel[];
}
