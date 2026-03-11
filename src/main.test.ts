import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { exec } from "child_process";
import type { TFile } from "obsidian";
import { Notice, FileSystemAdapter } from "obsidian";
import FmtOnSavePlugin from "./main";
import { DEFAULT_SETTINGS } from "./settings";

vi.mock("child_process", () => ({
	exec: vi.fn(),
}));

/**
 * Typed accessor for private members needed in tests.
 * Avoids `any` while allowing access to private plugin internals.
 */
interface PluginTestAccess {
	formatFile(file: TFile): void;
	formattingPaths: Set<string>;
	recentlyFormatted: Set<string>;
}

function asTestAccess(plugin: FmtOnSavePlugin): PluginTestAccess {
	return plugin as unknown as PluginTestAccess;
}

function createPlugin(overrides?: Partial<{ loadDataReturn: unknown }>): FmtOnSavePlugin {
	const plugin = new (FmtOnSavePlugin as unknown as new () => FmtOnSavePlugin)();
	const adapter = new FileSystemAdapter();
	plugin.app = {
		vault: { adapter, on: vi.fn() },
		workspace: {
			onLayoutReady: vi.fn(),
			getActiveFile: vi.fn(),
		},
	} as unknown as typeof plugin.app;
	plugin.loadData = vi.fn().mockResolvedValue(overrides?.loadDataReturn ?? null);
	plugin.saveData = vi.fn().mockResolvedValue(undefined);
	return plugin;
}

describe("DEFAULT_SETTINGS", () => {
	it("has expected structure and values", () => {
		expect(DEFAULT_SETTINGS).toEqual({
			enabled: true,
			command: "",
			args: "",
			debounceMs: 500,
		});
	});
});

describe("loadSettings", () => {
	it("uses DEFAULT_SETTINGS when loadData returns null", async () => {
		const plugin = createPlugin({ loadDataReturn: null });
		await plugin.loadSettings();
		expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
	});

	it("uses DEFAULT_SETTINGS when loadData returns undefined", async () => {
		const plugin = createPlugin({ loadDataReturn: undefined });
		await plugin.loadSettings();
		expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
	});

	it("merges partial data with DEFAULT_SETTINGS", async () => {
		const plugin = createPlugin({ loadDataReturn: { command: "prettier" } });
		await plugin.loadSettings();
		expect(plugin.settings).toEqual({
			...DEFAULT_SETTINGS,
			command: "prettier",
		});
	});

	it("uses all defaults when loadData returns empty object", async () => {
		const plugin = createPlugin({ loadDataReturn: {} });
		await plugin.loadSettings();
		expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
	});

	it("does not throw when loadData returns unknown fields", async () => {
		const plugin = createPlugin({ loadDataReturn: { unknownField: true, foo: 42 } });
		await expect(plugin.loadSettings()).resolves.not.toThrow();
		expect(plugin.settings.enabled).toBe(DEFAULT_SETTINGS.enabled);
	});
});

describe("formatFile", () => {
	const mockedExec = vi.mocked(exec);
	const mockedNotice = vi.mocked(Notice);

	beforeEach(() => {
		vi.stubEnv("SHELL", "/bin/zsh");
		mockedExec.mockReset();
		mockedNotice.mockReset();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	function makeFile(path = "note.md") {
		// eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast -- test mock
		return { path, extension: "md" } as TFile;
	}

	it("shows notice and does not exec when command is empty", async () => {
		const plugin = createPlugin();
		await plugin.loadSettings();
		plugin.settings.command = "";

		asTestAccess(plugin).formatFile(makeFile());

		expect(mockedExec).not.toHaveBeenCalled();
		expect(mockedNotice).toHaveBeenCalledWith("Format on save: no command configured.");
	});

	it("shows notice when adapter is not FileSystemAdapter", async () => {
		const plugin = createPlugin();
		await plugin.loadSettings();
		plugin.settings.command = "prettier";
		(plugin.app.vault as unknown as Record<string, unknown>)["adapter"] = {};

		asTestAccess(plugin).formatFile(makeFile());

		expect(mockedExec).not.toHaveBeenCalled();
		expect(mockedNotice).toHaveBeenCalledWith("Format on save: cannot resolve vault path.");
	});

	it("shows notice when buildFormatCommand throws", async () => {
		const plugin = createPlugin();
		await plugin.loadSettings();
		plugin.settings.command = "prettier; rm -rf /";

		asTestAccess(plugin).formatFile(makeFile());

		expect(mockedExec).not.toHaveBeenCalled();
		expect(mockedNotice).toHaveBeenCalledWith(expect.stringContaining("Unsafe command"));
	});

	it("calls exec with correct command when valid", async () => {
		const plugin = createPlugin();
		await plugin.loadSettings();
		plugin.settings.command = "prettier";
		plugin.settings.args = "--write";

		asTestAccess(plugin).formatFile(makeFile());

		expect(mockedExec).toHaveBeenCalledTimes(1);
		const firstCall = mockedExec.mock.calls[0]!;
		expect(firstCall[0]).toContain("prettier --write");
	});

	it("shows notice on exec error", async () => {
		const plugin = createPlugin();
		await plugin.loadSettings();
		plugin.settings.command = "prettier";
		plugin.settings.args = "--write";

		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		mockedExec.mockImplementation((_cmd: unknown, _opts: unknown, callback: unknown) => {
			const cb = (typeof _opts === "function" ? _opts : callback) as (
				err: Error | null,
				stdout: string,
				stderr: string,
			) => void;
			cb(new Error("command not found"), "", "");
			return {} as ReturnType<typeof exec>;
		});

		asTestAccess(plugin).formatFile(makeFile());

		expect(mockedNotice).toHaveBeenCalledWith(expect.stringContaining("command not found"));
		expect(consoleSpy).toHaveBeenCalledWith("fmt-on-save error:", expect.any(Error));
		consoleSpy.mockRestore();
	});

	it("logs warning on exec stderr", async () => {
		const plugin = createPlugin();
		await plugin.loadSettings();
		plugin.settings.command = "prettier";
		plugin.settings.args = "--write";

		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		mockedExec.mockImplementation((_cmd: unknown, _opts: unknown, callback: unknown) => {
			const cb = (typeof _opts === "function" ? _opts : callback) as (
				err: Error | null,
				stdout: string,
				stderr: string,
			) => void;
			cb(null, "", "some warning");
			return {} as ReturnType<typeof exec>;
		});

		asTestAccess(plugin).formatFile(makeFile());

		expect(consoleSpy).toHaveBeenCalledWith("fmt-on-save stderr:", "some warning");
		consoleSpy.mockRestore();
	});

	it("tracks formattingPaths during exec", async () => {
		const plugin = createPlugin();
		await plugin.loadSettings();
		plugin.settings.command = "prettier";
		plugin.settings.args = "--write";

		let capturedCallback: ((err: Error | null, stdout: string, stderr: string) => void) | null =
			null;

		mockedExec.mockImplementation((_cmd: unknown, _opts: unknown, callback: unknown) => {
			capturedCallback = (
				typeof _opts === "function" ? _opts : callback
			) as typeof capturedCallback;
			return {} as ReturnType<typeof exec>;
		});

		asTestAccess(plugin).formatFile(makeFile("test.md"));

		expect(asTestAccess(plugin).formattingPaths.has("test.md")).toBe(true);

		capturedCallback!(null, "", "");
		expect(asTestAccess(plugin).formattingPaths.has("test.md")).toBe(false);
	});

	it("tracks recentlyFormatted after exec completes", async () => {
		vi.useFakeTimers();
		const plugin = createPlugin();
		await plugin.loadSettings();
		plugin.settings.command = "prettier";
		plugin.settings.args = "--write";

		mockedExec.mockImplementation((_cmd: unknown, _opts: unknown, callback: unknown) => {
			const cb = (typeof _opts === "function" ? _opts : callback) as (
				err: Error | null,
				stdout: string,
				stderr: string,
			) => void;
			cb(null, "", "");
			return {} as ReturnType<typeof exec>;
		});

		asTestAccess(plugin).formatFile(makeFile("test.md"));

		expect(asTestAccess(plugin).recentlyFormatted.has("test.md")).toBe(true);

		vi.advanceTimersByTime(1000);
		expect(asTestAccess(plugin).recentlyFormatted.has("test.md")).toBe(false);

		vi.useRealTimers();
	});
});
