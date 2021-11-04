# Dart Support

# Features

## Dart Support pane

- run build runner
  - watch
  - build
  - clear cache
- get dependencies
- update dependencies
  - non-major
  - major
- open in terminal

## Explorer pane

- run build runner
  - watch
  - build
  - clear cache

# TODO

- [ ] Add tests
- [ ] Add ability to use fvm
  - [ ] Via list
    - [ ] Can add & remove?
- [ ] change the description of the tree item to the actual description of yaml
- [ ] Add Quick Actions
  - [ ] Organize file (or sort deps only?)
  - [ ] Add Dependencies
    - [ ] package
    - [ ] dev
  - [ ] Create sub package
    - [ ] Use very good cli
    - [ ] query for
      - [ ] name
      - [ ] description
      - [ ] etc...
- [ ] Solve `--build-filter` issue
  - issues:
    - runs, but doesn't update update any files
    - runs, tries to update, but has to delete all generated files to update one file
- [ ] Update Readme
  - include:
    - [ ] examples
    - [ ] images
    - [ ] features
