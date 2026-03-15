import { FileSystemAdapter, Notice, Plugin, TFile } from "obsidian";
import { exec } from "child_process";
import { DEFAULT_SETTINGS, FmtOnSaveSettingTab } from "./settings";
import type { FmtOnSaveSettings } from "./settings";
import { buildFormatCommand } from "./shell";

/**
 * Obsidian plugin that runs an external formatter on explicit save (Ctrl+S / Cmd+S).
 *
 * Listens for keyboard save events and subsequent vault `modify` events, then
 * shells out to a user-configured CLI formatter (e.g. Prettier, deno fmt).
 * Auto-save does not trigger formatting, preventing disruption during typing.
 * Desktop only — relies on `child_process.exec`.
 */
export default class FmtOnSavePlugin extends Plugin {
	settings!: FmtOnSaveSettings;
	private formattingPaths: Set<string> = new Set();
	private saveRequested: Set<string> = new Set();

	/** Registers the save keydown listener, modify listener, format command, and settings tab. */
	override async onload() {
		await this.loadSettings();

		this.registerDomEvent(document, "keydown", (evt: KeyboardEvent) => {
			if (!(evt.ctrlKey || evt.metaKey) || evt.key !== "s") return;
			const file = this.app.workspace.getActiveFile();
			if (file && file.extension === "md") {
				this.saveRequested.add(file.path);
			}
		});

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(
				this.app.vault.on("modify", (file) => {
					if (!(file instanceof TFile)) return;
					if (file.extension !== "md") return;
					if (!this.saveRequested.has(file.path)) return;
					this.saveRequested.delete(file.path);
					if (!this.settings.enabled) return;
					if (this.formattingPaths.has(file.path)) return;
					this.formatFile(file);
				}),
			);
		});

		this.addCommand({
			id: "format-current-file",
			name: "Format current file",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== "md") return false;
				if (!checking) {
					this.formatFile(file);
				}
				return true;
			},
		});

		this.addSettingTab(new FmtOnSaveSettingTab(this.app, this));
	}

	/** Clears all tracking sets on plugin unload. */
	override onunload() {
		this.formattingPaths.clear();
		this.saveRequested.clear();
	}

	/** Loads persisted settings, falling back to {@link DEFAULT_SETTINGS}. */
	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<FmtOnSaveSettings>,
		);
	}

	/** Persists the current settings to disk. */
	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Runs the configured formatter against a file.
	 *
	 * Builds a shell command from {@link FmtOnSaveSettings.command},
	 * {@link FmtOnSaveSettings.args}, and the file's absolute path, then
	 * executes it via `child_process.exec`. Tracks in-flight paths to
	 * prevent concurrent formatting of the same file.
	 */
	private formatFile(file: TFile) {
		const { command, args } = this.settings;
		if (!command) {
			new Notice("Format on save: no command configured.");
			return;
		}

		if (!(this.app.vault.adapter instanceof FileSystemAdapter)) {
			new Notice("Format on save: cannot resolve vault path.");
			return;
		}

		const adapter = this.app.vault.adapter;
		const vaultPath = adapter.getBasePath();
		const filePath = adapter.getFullPath(file.path);

		let cmd: string;
		try {
			cmd = buildFormatCommand(command, args, filePath);
		} catch (e) {
			new Notice(`Format on save: ${(e as Error).message}`);
			return;
		}

		this.formattingPaths.add(file.path);
		exec(cmd, { cwd: vaultPath }, (error, _stdout, stderr) => {
			this.formattingPaths.delete(file.path);
			if (error) {
				new Notice(`Format on save: ${error.message}`);
				console.error("fmt-on-save error:", error);
				return;
			}
			if (stderr) {
				console.warn("fmt-on-save stderr:", stderr);
			}
		});
	}
}
