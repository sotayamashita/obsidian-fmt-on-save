/* eslint-disable @typescript-eslint/unbound-method -- vi.fn() mocks don't need `this` binding */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { exec } from "child_process";
import { App, Notice } from "obsidian";
import { MockTextComponent, MockToggleComponent, MockButtonComponent } from "./__mocks__/obsidian";
import { FmtOnSaveSettingTab, DEFAULT_SETTINGS } from "./settings";
import type { FmtOnSaveSettings } from "./settings";
import type FmtOnSavePlugin from "./main";

vi.mock("child_process", () => ({
	exec: vi.fn(),
}));

function createMockPlugin(settings?: Partial<FmtOnSaveSettings>) {
	return {
		settings: { ...DEFAULT_SETTINGS, ...settings },
		saveSettings: vi.fn().mockResolvedValue(undefined),
	} as unknown as FmtOnSavePlugin;
}

describe("FmtOnSaveSettingTab", () => {
	const mockedExec = vi.mocked(exec);
	const mockedNotice = vi.mocked(Notice);

	beforeEach(() => {
		vi.stubEnv("SHELL", "/bin/zsh");
		mockedExec.mockReset();
		mockedNotice.mockReset();
		MockTextComponent.reset();
		MockToggleComponent.lastOnChange = null;
		MockButtonComponent.lastOnClick = null;
		MockButtonComponent.lastSetDisabled = null;
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	function createTab(settings?: Partial<FmtOnSaveSettings>) {
		const plugin = createMockPlugin(settings);
		const app = new App();
		const tab = new FmtOnSaveSettingTab(app, plugin);
		return { tab, plugin };
	}

	it("creates settings UI without throwing", () => {
		const { tab } = createTab();
		expect(() => tab.display()).not.toThrow();
	});

	it("stores plugin reference", () => {
		const { tab, plugin } = createTab();
		expect(tab.plugin).toBe(plugin);
	});

	describe("command onChange", () => {
		it("updates command and calls saveSettings", async () => {
			const { tab, plugin } = createTab();
			tab.display();

			// allOnChange[0] = command, allOnChange[1] = args, allOnChange[2] = debounce
			const commandOnChange = MockTextComponent.allOnChange[0]!;
			expect(commandOnChange).toBeDefined();

			await commandOnChange("deno");
			expect(plugin.settings.command).toBe("deno");
			expect(plugin.saveSettings).toHaveBeenCalled();
		});
	});

	describe("args onChange", () => {
		it("updates args and calls saveSettings", async () => {
			const { tab, plugin } = createTab();
			tab.display();

			// allOnChange[1] = args
			const argsOnChange = MockTextComponent.allOnChange[1]!;
			expect(argsOnChange).toBeDefined();

			await argsOnChange("fmt");
			expect(plugin.settings.args).toBe("fmt");
			expect(plugin.saveSettings).toHaveBeenCalled();
		});
	});

	describe("debounce onChange", () => {
		it("updates debounceMs with valid integer", async () => {
			const { tab, plugin } = createTab();
			tab.display();

			// allOnChange[2] = debounce
			const onChange = MockTextComponent.allOnChange[2]!;
			expect(onChange).toBeDefined();

			await onChange("750");
			expect(plugin.settings.debounceMs).toBe(750);
			expect(plugin.saveSettings).toHaveBeenCalled();
		});

		it("does not update debounceMs with invalid value", async () => {
			const { tab, plugin } = createTab();
			tab.display();

			const onChange = MockTextComponent.allOnChange[2]!;
			await onChange("abc");
			expect(plugin.settings.debounceMs).toBe(DEFAULT_SETTINGS.debounceMs);
			expect(plugin.saveSettings).not.toHaveBeenCalled();
		});

		it("does not update debounceMs with negative value", async () => {
			const { tab, plugin } = createTab();
			tab.display();

			const onChange = MockTextComponent.allOnChange[2]!;
			await onChange("-100");
			expect(plugin.settings.debounceMs).toBe(DEFAULT_SETTINGS.debounceMs);
			expect(plugin.saveSettings).not.toHaveBeenCalled();
		});

		it("accepts zero as valid debounce value", async () => {
			const { tab, plugin } = createTab();
			tab.display();

			const onChange = MockTextComponent.allOnChange[2]!;
			await onChange("0");
			expect(plugin.settings.debounceMs).toBe(0);
			expect(plugin.saveSettings).toHaveBeenCalled();
		});
	});

	describe("enabled toggle", () => {
		it("updates enabled setting and calls saveSettings", async () => {
			const { tab, plugin } = createTab({ enabled: true });
			tab.display();

			const onChange = MockToggleComponent.lastOnChange!;
			expect(onChange).not.toBeNull();

			await onChange(false);
			expect(plugin.settings.enabled).toBe(false);
			expect(plugin.saveSettings).toHaveBeenCalled();
		});
	});

	describe("Check path button", () => {
		it("shows notice for unsafe command", () => {
			const { tab } = createTab({ command: "prettier; rm -rf /" });
			tab.display();

			const onClick = MockButtonComponent.lastOnClick!;
			expect(onClick).not.toBeNull();

			onClick();

			expect(mockedNotice).toHaveBeenCalledWith(expect.stringContaining("Unsafe command"));
			expect(mockedExec).not.toHaveBeenCalled();
		});

		it("shows 'not found' notice on exec error", () => {
			const { tab } = createTab({ command: "nonexistent" });
			tab.display();

			mockedExec.mockImplementation((_cmd: unknown, callback: unknown) => {
				const cb = callback as (err: Error | null, stdout: string) => void;
				cb(new Error("not found"), "");
				return {} as ReturnType<typeof exec>;
			});

			MockButtonComponent.lastOnClick!();

			expect(mockedNotice).toHaveBeenCalledWith('"nonexistent" was not found on your PATH.');
		});

		it("shows 'Found' notice on exec success", () => {
			const { tab } = createTab({ command: "prettier" });
			tab.display();

			mockedExec.mockImplementation((_cmd: unknown, callback: unknown) => {
				const cb = callback as (err: Error | null, stdout: string) => void;
				cb(null, "/usr/local/bin/prettier\n");
				return {} as ReturnType<typeof exec>;
			});

			MockButtonComponent.lastOnClick!();

			expect(mockedNotice).toHaveBeenCalledWith("Found: /usr/local/bin/prettier");
		});
	});
});
