import path = require("path");
import * as vscode from "vscode";
import * as yaml from "yaml";
import { PubspecModel, TreeModel } from "./models/pubspec";

const readYaml = async (uri: vscode.Uri) => {
  const uint8Array = await vscode.workspace.fs.readFile(uri);
  let json: PubspecModel | null;
  try {
    json = yaml.parse(uint8Array.toString());
  } catch (error) {
    json = null;
  }
  return json;
};

/**
 * Classified by workspace, return a valid path tree diagram of pubspec.yaml
 * @returns
 */
export const scanFile = async (): Promise<TreeModel[]> => {
  // Workspace folders
  const workspaces = vscode.workspace.workspaceFolders ?? [];

  const effectListPromises = workspaces.map(async (workspace) => {
    const relativePattern = new vscode.RelativePattern(
      workspace.uri,
      "**/pubspec.yaml"
    );

    // List of all pubspec.yaml files
    const pubspecUris = await vscode.workspace.findFiles(relativePattern);

    for (var i = 0; i < pubspecUris.length; i++) {
      function containsPath(folder: string) {
        return pubspecUris[i].fsPath.includes(
          `${path.sep}${folder}${path.sep}`
        );
      }

      if (containsPath(".symlinks")) {
        delete pubspecUris[i];
      }
    }

    const pubspecObjsPromises = pubspecUris.map((uri) => readYaml(uri));
    const pubspecObjs = await Promise.all(pubspecObjsPromises);

    //All valid pubspec.yaml files
    const effectList = pubspecObjs.filter((e) => {
      return (
        Object.keys(e?.dependencies ?? {}).includes("build_runner") ||
        Object.keys(e?.dev_dependencies ?? {}).includes("build_runner")
      );
    });

    const ret: TreeModel = {
      name: workspace.name,
      uri: workspace.uri,
      children: effectList.map((e, i) => {
        return {
          name: e!.name,
          uri: pubspecUris[i],
        };
      }),
    };
    return ret;
  });

  const ret = Promise.all(effectListPromises);

  return ret;
};
