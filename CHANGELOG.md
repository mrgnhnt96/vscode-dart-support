# [0.0.3] - [2021-11-03]

- Fix: could not find module
  - out folder was ignored from .vscodeignore

# [0.0.2] - [2021-11-03]

- Fix: pane view id
  - Path to outfiles were incorrect
- Added setting to close terminals on exit
  - Group
    - Any Workspace Folder
    - Dart support pane view
  - Individual
    - Any single pubspec file
- Renamed panel label to "Dart Support"
- Add setting to hide "Dart Support" panel
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

- run build runner
  - watch
  - build
  - clear cache
