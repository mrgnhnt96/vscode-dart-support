import path = require("path");
import * as vscode from "vscode";
import { NestTreeItem } from "./tree";

export interface OutputTaskParams {
  title: string;
  onDispose: () => void;
}

export interface OutputTask {
  id?: number;
  show: () => void;
  hide: () => void;
  isShow: () => Promise<boolean>;
  write: (value: string, ...optionalParams: string[]) => void;
  activate: () => void;
  invalidate: () => void;
  close: () => void;
}

export const createTerminal = async (data: NestTreeItem) => {
  const pubspecStr = `${path.sep}pubspec`;
  const dir = data.resourceUri.fsPath.split(pubspecStr)[0];

  const terminal = vscode.window.createTerminal({
    name: data.title,
    cwd: dir,
  });

  terminal.show();
};

export const createOutput = async (
  title: string,
  onDispose: () => void
): Promise<OutputTask> => {
  let invalid = false;

  const writeEmitter = new vscode.EventEmitter<string>();
  const pty: vscode.Pseudoterminal = {
    onDidWrite: writeEmitter.event,
    open() {},
    handleInput: () => invalid && terminal.dispose(),
    close() {
      onDispose?.();
      writeEmitter.dispose();
    },
  };

  const terminal = vscode.window.createTerminal({ name: title, pty });
  const id = await terminal.processId;

  const isShow = async () => {
    const activeId = await vscode.window.activeTerminal?.processId;

    return activeId === id;
  };

  return {
    id: id,
    show: terminal.show,
    hide: terminal.hide,
    close: () => {
      pty.close();
      terminal.dispose();
    },
    isShow,
    write: (value: string, ...optionalParams: string[]) => {
      return (
        !invalid &&
        writeEmitter.fire(
          [value, ...optionalParams].join(" ").replace(/^   \w/g, "\r\n  ") +
            "\r\n"
        )
      );
    },
    activate: () => (invalid = false),

    invalidate: () => {
      writeEmitter.fire(
        "\r\n\r\nTerminal will be reused by tasks, press any key to close it.\r\n"
      );
      invalid = true;
    },
  };
};

export type LoadingTask = {
  report: (message: string) => void;
  stop: () => void;
};

export const createLoading = async (title: string) => {
  return new Promise<LoadingTask>((resolve) => {
    const option = {
      location: vscode.ProgressLocation.Window,
      title,
      cancellable: false,
    };
    vscode.window.withProgress(option, (progress) => {
      return new Promise<void>((stop) => {
        const report = (message: string) => progress.report({ message });
        resolve({
          report,
          stop: () => stop(),
        });
      });
    });
  });
};
