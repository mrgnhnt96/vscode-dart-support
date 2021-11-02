import * as vscode from "vscode";

export function readSetting(key: string) {
  return vscode.workspace.getConfiguration().get("dbr." + key);
}

export function addSetting(key: string, value: any) {
  return vscode.commands.executeCommand("setContext", key, value);
}

export function notify(message: string) {
  return vscode.window.showInformationMessage(message);
}
