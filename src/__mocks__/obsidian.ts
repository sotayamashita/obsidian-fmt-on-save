import { vi } from "vitest";

export class Plugin {
	app: Record<string, unknown> = {};
	loadData = vi.fn();
	saveData = vi.fn();
	addCommand = vi.fn();
	addSettingTab = vi.fn();
	registerEvent = vi.fn();
}

export class TFile {
	path = "";
	extension = "md";
}

export class FileSystemAdapter {
	getBasePath = vi.fn().mockReturnValue("/vault");
	getFullPath = vi.fn((p: string) => `/vault/${p}`);
}

export const Notice = vi.fn();

export class PluginSettingTab {}

export class Setting {
	setName() {
		return this;
	}
	setDesc() {
		return this;
	}
	setHeading() {
		return this;
	}
	addText() {
		return this;
	}
	addToggle() {
		return this;
	}
	addButton() {
		return this;
	}
	settingEl =
		typeof document !== "undefined" ? document.createElement("div") : ({} as HTMLElement);
	descEl = { setText: vi.fn() };
}

export class App {}
