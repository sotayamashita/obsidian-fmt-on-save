import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { exec } from "child_process";
import type FmtOnSavePlugin from "./main";
import { buildWhichCommand } from "./shell";

/** Persisted configuration for the Format on Save plugin. */
export interface FmtOnSaveSettings {
	/** Whether auto-format on modify is active. */
	enabled: boolean;
	/** Path or name of the formatter executable (e.g. `"prettier"`, `"deno"`). */
	command: string;
	/** Arguments inserted between the command and the file path (e.g. `"--write"`). */
	args: string;
	/** Milliseconds to wait after the last modify event before formatting. */
	debounceMs: number;
}

/** Sensible defaults applied when no persisted settings exist. */
export const DEFAULT_SETTINGS: FmtOnSaveSettings = {
	enabled: true,
	command: "",
	args: "",
	debounceMs: 500,
};

/** Settings tab rendered under **Settings → Community plugins → Format on Save**. */
export class FmtOnSaveSettingTab extends PluginSettingTab {
	plugin: FmtOnSavePlugin;

	constructor(app: App, plugin: FmtOnSavePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/** Builds the settings UI with toggle, text inputs, and debounce control. */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const dependentEls: HTMLElement[] = [];

		const setDependentsDisabled = (disabled: boolean) => {
			for (const el of dependentEls) {
				el.toggleClass("is-disabled", disabled);
				el.style.opacity = disabled ? "0.5" : "";
				el.style.pointerEvents = disabled ? "none" : "";
			}
		};

		// ── Formatter ───────────────────────────────────────
		containerEl.createEl("h3", { text: "Formatter" });

		let testButton: import("obsidian").ButtonComponent;

		new Setting(containerEl)
			.setName("Command")
			.setDesc("Path to the formatter executable (e.g. prettier, deno, oxfmt).")
			.addText((text) =>
				text
					.setPlaceholder("prettier")
					.setValue(this.plugin.settings.command)
					.onChange(async (value) => {
						this.plugin.settings.command = value;
						await this.plugin.saveSettings();
						testButton?.setDisabled(!value);
					}),
			)
			.addButton((button) => {
				testButton = button;
				button
					.setButtonText("Check PATH")
					.setDisabled(!this.plugin.settings.command)
					.onClick(() => {
						const cmd = this.plugin.settings.command;
						exec(buildWhichCommand(cmd), (error, stdout) => {
							if (error) {
								new Notice(`"${cmd}" was not found on your PATH.`);
							} else {
								new Notice(`Found: ${stdout.trim()}`);
							}
						});
					});
			});

		new Setting(containerEl)
			.setName("Arguments")
			.setDesc(
				"Arguments passed before the file path (e.g. --write, fmt). " +
					"The file's absolute path is appended automatically.",
			)
			.addText((text) =>
				text
					.setPlaceholder("--write")
					.setValue(this.plugin.settings.args)
					.onChange(async (value) => {
						this.plugin.settings.args = value;
						await this.plugin.saveSettings();
					}),
			);

		// ── Behavior ────────────────────────────────────────
		containerEl.createEl("h3", { text: "Behavior" });

		new Setting(containerEl)
			.setName("Format on save")
			.setDesc("Automatically format Markdown files when they are modified.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
					this.plugin.settings.enabled = value;
					await this.plugin.saveSettings();
					setDependentsDisabled(!value);
				}),
			);

		const debounceSetting = new Setting(containerEl)
			.setName("Debounce delay (ms)")
			.setDesc(
				"Wait this many milliseconds after the last modification before formatting. " +
					"Prevents running the formatter on every keystroke.",
			)
			.addText((text) =>
				text
					.setPlaceholder("500")
					.setValue(String(this.plugin.settings.debounceMs))
					.onChange(async (value) => {
						const parsed = parseInt(value, 10);
						if (!isNaN(parsed) && parsed >= 0) {
							this.plugin.settings.debounceMs = parsed;
							await this.plugin.saveSettings();
							debounceSetting.descEl.setText(
								"Wait this many milliseconds after the last modification before formatting. " +
									"Prevents running the formatter on every keystroke.",
							);
						} else {
							debounceSetting.descEl.setText(
								"Invalid value. Enter a non-negative integer (e.g. 500).",
							);
						}
					}),
			);
		dependentEls.push(debounceSetting.settingEl);

		setDependentsDisabled(!this.plugin.settings.enabled);
	}
}
