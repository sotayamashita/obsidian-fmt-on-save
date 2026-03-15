import { vi } from "vitest";

export class Plugin {
	app: Record<string, unknown> = {};
	loadData = vi.fn();
	saveData = vi.fn();
	addCommand = vi.fn();
	addSettingTab = vi.fn();
	registerEvent = vi.fn();
	registerDomEvent = vi.fn();
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

export class PluginSettingTab {
	app: unknown;
	containerEl = {
		empty: vi.fn(),
	};
	constructor(app: unknown, _plugin: unknown) {
		this.app = app;
	}
}

type TextOnChange = (value: string) => void | Promise<void>;
type ToggleOnChange = (value: boolean) => void | Promise<void>;

class MockTextComponent {
	setPlaceholder() {
		return this;
	}
	setValue() {
		return this;
	}
	onChange(cb: TextOnChange) {
		MockTextComponent.allOnChange.push(cb);
		return this;
	}
	static allOnChange: TextOnChange[] = [];
	static reset() {
		MockTextComponent.allOnChange = [];
	}
}

class MockToggleComponent {
	setValue() {
		return this;
	}
	onChange(cb: ToggleOnChange) {
		MockToggleComponent.lastOnChange = cb;
		return this;
	}
	static lastOnChange: ToggleOnChange | null = null;
	static reset() {
		MockToggleComponent.lastOnChange = null;
	}
}

class MockButtonComponent {
	setButtonText() {
		return this;
	}
	setDisabled(_disabled: boolean) {
		MockButtonComponent.lastSetDisabled = _disabled;
		return this;
	}
	onClick(cb: () => void) {
		MockButtonComponent.lastOnClick = cb;
		return this;
	}
	static lastOnClick: (() => void) | null = null;
	static lastSetDisabled: boolean | null = null;
	static reset() {
		MockButtonComponent.lastOnClick = null;
		MockButtonComponent.lastSetDisabled = null;
	}
}

export { MockTextComponent, MockToggleComponent, MockButtonComponent };

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
	addText(cb: (text: MockTextComponent) => MockTextComponent) {
		cb(new MockTextComponent());
		return this;
	}
	addToggle(cb: (toggle: MockToggleComponent) => MockToggleComponent) {
		cb(new MockToggleComponent());
		return this;
	}
	addButton(cb: (button: MockButtonComponent) => void) {
		cb(new MockButtonComponent());
		return this;
	}
	settingEl = { toggleClass: vi.fn(), style: {} } as unknown as HTMLElement;
	descEl = { setText: vi.fn() };
}

export class App {}
