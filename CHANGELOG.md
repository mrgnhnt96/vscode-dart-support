# [0.0.5] - [2021-11-15]

- Fix bug with closing psuedo terminal
  - Revert back to webpack compiler instead of es-build
- Few minor enhancements & style fixes

# [0.0.4] - [2021-11-03]

## Feature

- Add check for name in pubspec.yaml
- Add check if parent folder is empty
  - Hide if true

# [0.0.3] - [2021-11-03]

- Fix: could not find module
  - out folder was ignored from .vscodeignore

# [0.0.2] - [2021-11-03]

## Fix

- Pane view id
  - Path to outfiles were incorrect

## Refactor

- Renamed panel label to "Dart Support"

## Feature

- Add setting to close terminals on exit
  - Group
    - Any Workspace Folder
    - Dart support pane view
  - Individual
    - Any single pubspec file
- Add Check to hide "Dart Support" panel
  - Hidden if no pubspec files
- Add File watcher to watch for create, delete, and change of pubspec files (only)
  - Updates the list of pubspec files accordingly
    - Updates quick actions

# [0.0.1] - [2021-11-02]

- Initial release.

## Features

### Dart Support Pane

- run build runner
  - watch
  - build
  - clear cache
- get dependencies
- update dependencies
  - non-major
  - major
- open in terminal

### Explorer Pane

- run build runner, _coming soon: to be used with --build-filter_
  - watch
  - build
  - clear cache
