import { FileSystemAdapter, Notice, Plugin, TFile } from "obsidian";
import { exec } from "child_process";
import { DEFAULT_SETTINGS, FmtOnSaveSettingTab } from "./settings";
import type { FmtOnSaveSettings } from "./settings";
import { buildFormatCommand } from "./shell";

/**
 * Obsidian plugin that runs an external formatter on every file save.
 *
 * Listens for vault `modify` events, debounces rapid edits, and shells out
 * to a user-configured CLI formatter (e.g. Prettier, deno fmt).
 * Desktop only — relies on `child_process.exec`.
 */
const POST_FORMAT_COOLDOWN_MS = 1000;

export default class FmtOnSavePlugin extends Plugin {
	settings!: FmtOnSaveSettings;
	private formattingPaths: Set<string> = new Set();
	private recentlyFormatted: Set<string> = new Set();
	private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
	private cooldownTimers: Set<ReturnType<typeof setTimeout>> = new Set();

	/** Registers the modify listener, format command, and settings tab. */
	override async onload() {
		await this.loadSettings();

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(
				this.app.vault.on("modify", (file) => {
					if (!this.settings.enabled) return;
					if (!(file instanceof TFile)) return;
					if (file.extension !== "md") return;
					if (this.formattingPaths.has(file.path)) return;
					if (this.recentlyFormatted.has(file.path)) return;

					this.scheduleFormat(file);
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

	/** Clears all pending debounce timers on plugin unload. */
	override onunload() {
		for (const timer of this.debounceTimers.values()) {
			clearTimeout(timer);
		}
		this.debounceTimers.clear();
		for (const timer of this.cooldownTimers) {
			clearTimeout(timer);
		}
		this.cooldownTimers.clear();
		this.formattingPaths.clear();
		this.recentlyFormatted.clear();
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
	 * Debounces formatting for the given file.
	 *
	 * Resets the timer on each call so rapid edits coalesce into a single
	 * format invocation after {@link FmtOnSaveSettings.debounceMs} ms of quiet.
	 */
	private scheduleFormat(file: TFile) {
		const existing = this.debounceTimers.get(file.path);
		if (existing) {
			clearTimeout(existing);
		}

		const timer = setTimeout(() => {
			this.debounceTimers.delete(file.path);
			this.formatFile(file);
		}, this.settings.debounceMs);

		this.debounceTimers.set(file.path, timer);
	}

	/**
	 * Runs the configured formatter against a file.
	 *
	 * Builds a shell command from {@link FmtOnSaveSettings.command},
	 * {@link FmtOnSaveSettings.args}, and the file's absolute path, then
	 * executes it via `child_process.exec`. Tracks in-flight and recently
	 * formatted paths to prevent re-trigger loops caused by the formatter's
	 * own file write.
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

		const cmd = buildFormatCommand(command, args, filePath);

		this.formattingPaths.add(file.path);
		exec(cmd, { cwd: vaultPath }, (error, _stdout, stderr) => {
			this.formattingPaths.delete(file.path);
			// Briefly ignore modify events to prevent re-trigger from the formatter's write
			this.recentlyFormatted.add(file.path);
			const cooldown = setTimeout(() => {
				this.cooldownTimers.delete(cooldown);
				this.recentlyFormatted.delete(file.path);
			}, POST_FORMAT_COOLDOWN_MS);
			this.cooldownTimers.add(cooldown);
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
