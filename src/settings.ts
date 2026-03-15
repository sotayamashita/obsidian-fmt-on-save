import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { exec } from "child_process";
import type FmtOnSavePlugin from "./main";
import { buildWhichCommand, validateCommand } from "./shell";

/** Persisted configuration for the Format on Save plugin. */
export interface FmtOnSaveSettings {
	/** Whether format on explicit save (Ctrl+S / Cmd+S) is active. */
	enabled: boolean;
	/** Path or name of the formatter executable (e.g. `"prettier"`, `"deno"`). */
	command: string;
	/** Arguments inserted between the command and the file path (e.g. `"--write"`). */
	args: string;
}

/** Sensible defaults applied when no persisted settings exist. */
export const DEFAULT_SETTINGS: FmtOnSaveSettings = {
	enabled: true,
	command: "",
	args: "",
};

/** Settings tab rendered under **Settings → Community plugins → Format on Save**. */
export class FmtOnSaveSettingTab extends PluginSettingTab {
	plugin: FmtOnSavePlugin;

	constructor(app: App, plugin: FmtOnSavePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/** Builds the settings UI with toggle, text inputs. */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// ── Formatter ───────────────────────────────────────
		new Setting(containerEl).setName("Formatter").setHeading();

		let testButton: import("obsidian").ButtonComponent;

		new Setting(containerEl)
			.setName("Command")
			.setDesc("Path to the formatter executable (e.g. Prettier, deno, oxfmt).")
			.addText((text) =>
				text
					.setPlaceholder("Prettier")
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
					.setButtonText("Check path")
					.setDisabled(!this.plugin.settings.command)
					.onClick(() => {
						const cmd = this.plugin.settings.command;
						try {
							validateCommand(cmd);
						} catch (e) {
							new Notice((e as Error).message);
							return;
						}
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
		new Setting(containerEl).setName("Behavior").setHeading();

		new Setting(containerEl)
			.setName("Format on save")
			.setDesc(
				"Automatically format Markdown files on explicit save (Ctrl+S / Cmd+S). " +
					"Auto-save does not trigger formatting.",
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
					this.plugin.settings.enabled = value;
					await this.plugin.saveSettings();
				}),
			);
	}
}
