import * as vscode from "vscode";
import { packageName } from "../extension";

export function readSetting(key: string) {
  return vscode.workspace.getConfiguration().get(`${packageName}.` + key);
}

export function addSetting(key: string, value: any) {
  return vscode.commands.executeCommand(
    "setContext",
    `${packageName}.` + key,
    value
  );
}

export function notify(message: string) {
  return vscode.window.showInformationMessage(message);
}
