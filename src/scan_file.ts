import { privateEncrypt } from "crypto";
import path = require("path");
import * as vscode from "vscode";
import * as yaml from "yaml";
import { PubspecModel, TreeModel } from "./models/pubspec";

const readYaml = async (uri: vscode.Uri) => {
  const uint8Array = await vscode.workspace.fs.readFile(uri);
  let json: PubspecModel | null;
  try {
    json = yaml.parse(uint8Array.toString());

    if (json) {
      json["uri"] = uri;
    }
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

  const folderPromises = workspaces.map(async (workspace) => {
    const relativePattern = new vscode.RelativePattern(
      workspace,
      "**/pubspec.{yml,yaml}"
    );

    // List of all pubspec.yaml files
    const pubspecUris = await vscode.workspace.findFiles(relativePattern);

    for (var i = 0; i < pubspecUris.length; i++) {
      function containsPath(folder: string) {
        return pubspecUris[i]?.fsPath.includes(
          `${path.sep}${folder}${path.sep}`
        );
      }

      const restrictedPaths = [".symlinks", ".dart_tool"];

      restrictedPaths.forEach((folder) => {
        if (containsPath(folder)) {
          delete pubspecUris[i];
        }
      });
    }

    const pubspecObjsPromises = pubspecUris.map((uri) => readYaml(uri));

    const pubspecObjs = await Promise.all(pubspecObjsPromises);

    //All pubspec.yaml that contain build runner
    const effectList = pubspecObjs.filter((e) => (e ? true : false));

    if (effectList.length === 0) {
      return;
    }

    const ret: TreeModel = {
      name: workspace.name!,
      uri: workspace.uri!,
      hasBuildRunnerDep: false,
      children: effectList.map((e) => {
        return {
          name: e?.name ?? "NO_NAME",
          uri: e!.uri,
          hasBuildRunnerDep:
            Object.keys(e?.dependencies ?? {}).includes("build_runner") ||
            Object.keys(e?.dev_dependencies ?? {}).includes("build_runner"),
        };
      }),
    };

    return ret;
  });

  const effects = await Promise.all(folderPromises);

  const ret: TreeModel[] = [];

  effects.forEach((e) => {
    if (e) {
      ret.push(e);
    }
  });

  return ret;
};
