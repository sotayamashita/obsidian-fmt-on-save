# Format on Save

An Obsidian plugin that runs any external formatter on save. Bring your own tool — Prettier, deno fmt, or anything else that accepts a file path.

## Features

- **Format on save** — automatically runs your configured formatter when a file is modified (debounced)
- **Manual command** — "Format current file" available from the command palette
- **Any formatter** — use whatever CLI tool you prefer with its own config files

## Configuration

| Setting | Description | Default | Example |
|---------|-------------|---------|---------|
| Enable | Toggle auto-format on save | `true` | on/off |
| Formatter command | Path to the formatter executable | `""` (empty) | `prettier`, `deno`, `/usr/local/bin/prettier` |
| Formatter arguments | Arguments passed before the file path | `""` (empty) | `--write`, `fmt` |
| Debounce delay (ms) | Wait time after last edit before formatting | `500` | `500` |

### Examples

**Prettier:**
- Command: `prettier`
- Arguments: `--write`

**deno fmt:**
- Command: `deno`
- Arguments: `fmt`

**oxfmt:**
- Command: `oxfmt`
- Arguments: `--write`

The file's absolute path is appended automatically as the last argument.

Place your formatter's config file (`.prettierrc`, `deno.json`, `.oxfmtrc.json`, etc.) in your vault root or home directory as usual.

## Installation

### Manual

1. Build the plugin: `pnpm install && pnpm run build`
2. Copy `main.js` and `manifest.json` to `<vault>/.obsidian/plugins/obsidian-fmt-on-save/`
3. Reload Obsidian and enable the plugin in **Settings → Community plugins**

## Desktop only

This plugin uses `child_process.exec` to run external commands and is desktop only.
