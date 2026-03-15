# Changelog

## [1.0.3](https://github.com/sotayamashita/obsidian-fmt-on-save/compare/1.0.2...1.0.3) (2026-03-15)


### Bug Fixes

* add inline eslint-disable for unbound-method in test files ([#32](https://github.com/sotayamashita/obsidian-fmt-on-save/issues/32)) ([30fbe82](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/30fbe8294441712ee4d24b441ba422da92fa00de))

## [1.0.2](https://github.com/sotayamashita/obsidian-fmt-on-save/compare/1.0.1...1.0.2) (2026-03-15)


### Bug Fixes

* remove eslint-disable comments from test files ([#29](https://github.com/sotayamashita/obsidian-fmt-on-save/issues/29)) ([174e8f6](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/174e8f60ead60a2ffa5540f6ff981d653c462ebb))

## [1.0.1](https://github.com/sotayamashita/obsidian-fmt-on-save/compare/1.0.0...1.0.1) (2026-03-15)


### Bug Fixes

* address ObsidianReviewBot eslint findings ([#27](https://github.com/sotayamashita/obsidian-fmt-on-save/issues/27)) ([9bdff2c](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/9bdff2c4ca05d8e25e17a9d93bfa4365e5808702))

## [1.0.0](https://github.com/sotayamashita/obsidian-fmt-on-save/compare/0.1.5...1.0.0) (2026-03-15)


### ⚠ BREAKING CHANGES

* The `debounceMs` setting has been removed. Formatting now triggers on explicit save instead of on every file modification.

### Features

* trigger format only on explicit save (Ctrl+S / Cmd+S) ([#25](https://github.com/sotayamashita/obsidian-fmt-on-save/issues/25)) ([f6dd47b](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/f6dd47b6610593e5f5fe687afc3ed0d13914ae91))

## [0.1.5](https://github.com/sotayamashita/obsidian-fmt-on-save/compare/0.1.4...0.1.5) (2026-03-12)


### Bug Fixes

* rename .release-please-config.json to release-please-config.json ([#19](https://github.com/sotayamashita/obsidian-fmt-on-save/issues/19)) ([11f850d](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/11f850d65ada545a2c378a2515de2bd2bfae6e64))
* use plain version tags for Obsidian compatibility ([#18](https://github.com/sotayamashita/obsidian-fmt-on-save/issues/18)) ([144df46](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/144df46a1d3cbc6a796fe93fa8d25d3583ed726d))

## [0.1.4](https://github.com/sotayamashita/obsidian-fmt-on-save/compare/fmt-on-save-v0.1.3...fmt-on-save-v0.1.4) (2026-03-11)

### Features

- extract shell module and enhance settings UI ([0d24e4c](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/0d24e4c9f5caf0d817d95849db7617c7edb6b5be))
- implement format-on-save plugin ([4b299d1](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/4b299d1a3998ffb574afd620712dfec24ee74dda))

### Bug Fixes

- **ci:** add release-please-config.json required by v4 ([#8](https://github.com/sotayamashita/obsidian-fmt-on-save/issues/8)) ([f8e36a1](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/f8e36a13f98e139dd4900958aefdc60bbea9340d))
- **ci:** update versions.json in release-please PR instead of direct push ([#12](https://github.com/sotayamashita/obsidian-fmt-on-save/issues/12)) ([f367d52](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/f367d526d1223de0055651a0a632b3ba27b9f2e3))
- prevent shell injection in formatter command execution ([04eb809](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/04eb809eafd990f339a17a3b61e9210573d3cbb6))
- prevent shell injection in formatter command execution ([94d69c1](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/94d69c1177d7c01bea2c50a74c062dd9a373eeae))

## [0.1.3](https://github.com/sotayamashita/obsidian-fmt-on-save/compare/obsidian-fmt-on-save-v0.1.2...obsidian-fmt-on-save-v0.1.3) (2026-03-11)

### Bug Fixes

- **ci:** update versions.json in release-please PR instead of direct push ([#12](https://github.com/sotayamashita/obsidian-fmt-on-save/issues/12)) ([f367d52](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/f367d526d1223de0055651a0a632b3ba27b9f2e3))

## [0.1.2](https://github.com/sotayamashita/obsidian-fmt-on-save/compare/obsidian-fmt-on-save-v0.1.1...obsidian-fmt-on-save-v0.1.2) (2026-03-11)

### Bug Fixes

- prevent shell injection in formatter command execution ([04eb809](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/04eb809eafd990f339a17a3b61e9210573d3cbb6))
- prevent shell injection in formatter command execution ([94d69c1](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/94d69c1177d7c01bea2c50a74c062dd9a373eeae))

## [0.1.1](https://github.com/sotayamashita/obsidian-fmt-on-save/compare/obsidian-fmt-on-save-v0.1.0...obsidian-fmt-on-save-v0.1.1) (2026-03-11)

### Features

- extract shell module and enhance settings UI ([0d24e4c](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/0d24e4c9f5caf0d817d95849db7617c7edb6b5be))
- implement format-on-save plugin ([4b299d1](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/4b299d1a3998ffb574afd620712dfec24ee74dda))

### Bug Fixes

- **ci:** add release-please-config.json required by v4 ([#8](https://github.com/sotayamashita/obsidian-fmt-on-save/issues/8)) ([f8e36a1](https://github.com/sotayamashita/obsidian-fmt-on-save/commit/f8e36a13f98e139dd4900958aefdc60bbea9340d))
