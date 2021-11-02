import path = require("path");
import * as vscode from "vscode";

interface FilterData {
  filter: string | null;
  uri: string;
}

export function getFilters(uri: vscode.Uri | undefined): FilterData | null {
  /// Get the current editor file uri and path
  uri = uri ?? vscode.window.activeTextEditor?.document.uri;

  const empty: FilterData = {
    filter: null,
    uri: "",
  };

  const uriPath = uri?.path;
  const sep = path.sep;

  /// Guard against welcome screen
  const isWelcomeScreen = uriPath === undefined;
  if (isWelcomeScreen) {
    return null;
  }

  /// Guard against untitled files
  const isUntitled = vscode.window.activeTextEditor?.document.isUntitled;
  if (isUntitled) {
    return empty;
  }

  /// Guard against no workspace name
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri!);
  const workspaceName = workspaceFolder?.name;
  if (workspaceName === undefined) {
    return empty;
  }

  /// Guard against no workspace path
  const workspacePath = workspaceFolder?.uri.path;
  if (workspacePath === undefined) {
    [];
  }

  const relativePath = uriPath?.replace(workspacePath!, "");
  const segments = relativePath?.split(sep).filter((e) => e !== "");

  /// Guard against no top level folder
  const hasTopLevelFolder = segments!.length > 1;
  if (!hasTopLevelFolder) {
    return empty;
  }

  const segmentsWithoutFilename = [...segments!].slice(0, segments!.length - 1);

  let cwd = `${workspacePath}${sep}${segmentsWithoutFilename.join(sep)}`;

  const libBasedPath = "lib" + sep + cwd.split(`${sep}lib${sep}`)[1] + sep;
  cwd = cwd.split(`${sep}lib${sep}`)[0] + sep;

  const baseFilter = {
    filter: `--build-filter="${libBasedPath}*.dart"`,
    uri: cwd,
  };

  return baseFilter;
}
