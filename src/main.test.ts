/* eslint-disable @typescript-eslint/unbound-method -- vi.fn() mocks don't need `this` binding */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { exec } from "child_process";
import { Notice, FileSystemAdapter, TFile } from "obsidian";
import FmtOnSavePlugin from "./main";
import { DEFAULT_SETTINGS } from "./settings";

vi.mock("child_process", () => ({
	exec: vi.fn(),
}));

vi.stubGlobal("document", {});

/**
 * Typed accessor for private members needed in tests.
 * Avoids `any` while allowing access to private plugin internals.
 */
interface PluginTestAccess {
	formatFile(file: TFile): void;
	formattingPaths: Set<string>;
	saveRequested: Set<string>;
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

function makeFile(path = "note.md") {
	const file = new TFile();
	file.path = path;
	file.extension = "md";
	return file;
}

type ExecCallback = (err: Error | null, stdout: string, stderr: string) => void;

function mockExecWith(err: Error | null, stdout: string, stderr: string) {
	vi.mocked(exec).mockImplementation((_cmd: unknown, _opts: unknown, callback: unknown) => {
		const cb = (typeof _opts === "function" ? _opts : callback) as ExecCallback;
		cb(err, stdout, stderr);
		return {} as ReturnType<typeof exec>;
	});
}

function getModifyHandler(plugin: FmtOnSavePlugin): (file: unknown) => void {
	const workspace = plugin.app.workspace as unknown as Record<string, ReturnType<typeof vi.fn>>;
	const layoutReadyCb = workspace["onLayoutReady"]!.mock.calls[0]![0] as () => void;
	layoutReadyCb();

	const vaultOn = (plugin.app.vault as unknown as Record<string, ReturnType<typeof vi.fn>>)[
		"on"
	]!;
	return vaultOn.mock.calls[0]![1] as (file: unknown) => void;
}

function getKeydownHandler(plugin: FmtOnSavePlugin): (evt: Partial<KeyboardEvent>) => void {
	const registerDomEvent = vi.mocked(plugin.registerDomEvent) as unknown as ReturnType<
		typeof vi.fn
	>;
	return registerDomEvent.mock.calls[0]![2] as (evt: Partial<KeyboardEvent>) => void;
}

function getCheckCallback(plugin: FmtOnSavePlugin): (checking: boolean) => boolean {
	const commandArg = vi.mocked(plugin.addCommand).mock.calls[0]![0] as {
		checkCallback: (checking: boolean) => boolean;
	};
	return commandArg.checkCallback;
}

describe("DEFAULT_SETTINGS", () => {
	it("has expected structure and values", () => {
		expect(DEFAULT_SETTINGS).toEqual({
			enabled: true,
			command: "",
			args: "",
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

	it("shows notice and does not exec when command is empty", async () => {
		const plugin = createPlugin();
		await plugin.loadSettings();

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
		mockExecWith(new Error("command not found"), "", "");

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
		mockExecWith(null, "", "some warning");

		asTestAccess(plugin).formatFile(makeFile());

		expect(consoleSpy).toHaveBeenCalledWith("fmt-on-save stderr:", "some warning");
		consoleSpy.mockRestore();
	});

	it("tracks formattingPaths during exec", async () => {
		const plugin = createPlugin();
		await plugin.loadSettings();
		plugin.settings.command = "prettier";
		plugin.settings.args = "--write";

		let capturedCallback: ExecCallback | null = null;

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
});

describe("onload", () => {
	const mockedExec = vi.mocked(exec);

	beforeEach(() => {
		vi.stubEnv("SHELL", "/bin/zsh");
		mockedExec.mockReset();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("registers registerDomEvent, onLayoutReady, addCommand, and addSettingTab", async () => {
		const plugin = createPlugin();
		await plugin.onload();

		const workspace = plugin.app.workspace as unknown as Record<string, unknown>;
		expect(plugin.registerDomEvent).toHaveBeenCalledTimes(1);
		expect(workspace["onLayoutReady"]).toHaveBeenCalledTimes(1);
		expect(plugin.addCommand).toHaveBeenCalledTimes(1);
		expect(plugin.addSettingTab).toHaveBeenCalledTimes(1);
	});

	it("registers command with id 'format-current-file'", async () => {
		const plugin = createPlugin();
		await plugin.onload();

		const commandArg = vi.mocked(plugin.addCommand).mock.calls[0]![0] as {
			id: string;
			name: string;
		};
		expect(commandArg.id).toBe("format-current-file");
		expect(commandArg.name).toBe("Format current file");
	});

	it("checkCallback returns false when no active file", async () => {
		const plugin = createPlugin();
		const workspace = plugin.app.workspace as unknown as Record<
			string,
			ReturnType<typeof vi.fn>
		>;
		workspace["getActiveFile"]!.mockReturnValue(null);
		await plugin.onload();

		expect(getCheckCallback(plugin)(true)).toBe(false);
	});

	it("checkCallback returns false for non-md file", async () => {
		const plugin = createPlugin();
		const workspace = plugin.app.workspace as unknown as Record<
			string,
			ReturnType<typeof vi.fn>
		>;
		workspace["getActiveFile"]!.mockReturnValue({ path: "image.png", extension: "png" });
		await plugin.onload();

		expect(getCheckCallback(plugin)(true)).toBe(false);
	});

	it("checkCallback returns true for md file when checking", async () => {
		const plugin = createPlugin();
		const workspace = plugin.app.workspace as unknown as Record<
			string,
			ReturnType<typeof vi.fn>
		>;
		workspace["getActiveFile"]!.mockReturnValue({ path: "note.md", extension: "md" });
		await plugin.onload();

		expect(getCheckCallback(plugin)(true)).toBe(true);
		expect(mockedExec).not.toHaveBeenCalled();
	});

	it("checkCallback calls formatFile when not checking", async () => {
		const plugin = createPlugin({ loadDataReturn: { command: "prettier", args: "--write" } });
		const workspace = plugin.app.workspace as unknown as Record<
			string,
			ReturnType<typeof vi.fn>
		>;
		workspace["getActiveFile"]!.mockReturnValue({ path: "note.md", extension: "md" });
		await plugin.onload();

		const result = getCheckCallback(plugin)(false);
		expect(result).toBe(true);
		expect(mockedExec).toHaveBeenCalledTimes(1);
	});

	it("keydown handler adds file to saveRequested on Ctrl+S", async () => {
		const plugin = createPlugin();
		const workspace = plugin.app.workspace as unknown as Record<
			string,
			ReturnType<typeof vi.fn>
		>;
		workspace["getActiveFile"]!.mockReturnValue({ path: "note.md", extension: "md" });
		await plugin.onload();

		const keydownHandler = getKeydownHandler(plugin);
		keydownHandler({ ctrlKey: true, metaKey: false, key: "s" });

		expect(asTestAccess(plugin).saveRequested.has("note.md")).toBe(true);
	});

	it("keydown handler adds file to saveRequested on Cmd+S", async () => {
		const plugin = createPlugin();
		const workspace = plugin.app.workspace as unknown as Record<
			string,
			ReturnType<typeof vi.fn>
		>;
		workspace["getActiveFile"]!.mockReturnValue({ path: "note.md", extension: "md" });
		await plugin.onload();

		const keydownHandler = getKeydownHandler(plugin);
		keydownHandler({ ctrlKey: false, metaKey: true, key: "s" });

		expect(asTestAccess(plugin).saveRequested.has("note.md")).toBe(true);
	});

	it("keydown handler ignores non-save keys", async () => {
		const plugin = createPlugin();
		const workspace = plugin.app.workspace as unknown as Record<
			string,
			ReturnType<typeof vi.fn>
		>;
		workspace["getActiveFile"]!.mockReturnValue({ path: "note.md", extension: "md" });
		await plugin.onload();

		const keydownHandler = getKeydownHandler(plugin);
		keydownHandler({ ctrlKey: true, metaKey: false, key: "a" });

		expect(asTestAccess(plugin).saveRequested.has("note.md")).toBe(false);
	});

	it("keydown handler ignores when no modifier key", async () => {
		const plugin = createPlugin();
		const workspace = plugin.app.workspace as unknown as Record<
			string,
			ReturnType<typeof vi.fn>
		>;
		workspace["getActiveFile"]!.mockReturnValue({ path: "note.md", extension: "md" });
		await plugin.onload();

		const keydownHandler = getKeydownHandler(plugin);
		keydownHandler({ ctrlKey: false, metaKey: false, key: "s" });

		expect(asTestAccess(plugin).saveRequested.has("note.md")).toBe(false);
	});

	it("keydown handler ignores non-md files", async () => {
		const plugin = createPlugin();
		const workspace = plugin.app.workspace as unknown as Record<
			string,
			ReturnType<typeof vi.fn>
		>;
		workspace["getActiveFile"]!.mockReturnValue({ path: "image.png", extension: "png" });
		await plugin.onload();

		const keydownHandler = getKeydownHandler(plugin);
		keydownHandler({ ctrlKey: true, metaKey: false, key: "s" });

		expect(asTestAccess(plugin).saveRequested.has("image.png")).toBe(false);
	});

	it("modify handler skips when enabled is false but still cleans saveRequested", async () => {
		const plugin = createPlugin();
		await plugin.onload();
		plugin.settings.enabled = false;

		asTestAccess(plugin).saveRequested.add("test.md");
		const modifyHandler = getModifyHandler(plugin);

		const file = new TFile();
		file.path = "test.md";
		file.extension = "md";
		modifyHandler(file);

		expect(mockedExec).not.toHaveBeenCalled();
		expect(asTestAccess(plugin).saveRequested.has("test.md")).toBe(false);
	});

	it("modify handler skips non-TFile instances", async () => {
		const plugin = createPlugin();
		await plugin.onload();
		plugin.settings.enabled = true;

		const modifyHandler = getModifyHandler(plugin);
		modifyHandler({ path: "test.md", extension: "md" });

		expect(mockedExec).not.toHaveBeenCalled();
	});

	it("modify handler skips non-md files", async () => {
		const plugin = createPlugin();
		await plugin.onload();
		plugin.settings.enabled = true;

		const modifyHandler = getModifyHandler(plugin);

		const file = new TFile();
		file.path = "image.png";
		file.extension = "png";
		modifyHandler(file);

		expect(mockedExec).not.toHaveBeenCalled();
	});

	it("modify handler skips when saveRequested does not contain file", async () => {
		const plugin = createPlugin({ loadDataReturn: { command: "prettier", args: "--write" } });
		await plugin.onload();
		plugin.settings.enabled = true;

		const modifyHandler = getModifyHandler(plugin);

		const file = new TFile();
		file.path = "test.md";
		file.extension = "md";
		modifyHandler(file);

		expect(mockedExec).not.toHaveBeenCalled();
	});

	it("modify handler formats when saveRequested contains file", async () => {
		const plugin = createPlugin({ loadDataReturn: { command: "prettier", args: "--write" } });
		await plugin.onload();
		plugin.settings.enabled = true;

		asTestAccess(plugin).saveRequested.add("test.md");
		const modifyHandler = getModifyHandler(plugin);

		const file = new TFile();
		file.path = "test.md";
		file.extension = "md";
		modifyHandler(file);

		expect(mockedExec).toHaveBeenCalledTimes(1);
		expect(asTestAccess(plugin).saveRequested.has("test.md")).toBe(false);
	});

	it("modify handler skips files in formattingPaths", async () => {
		const plugin = createPlugin({ loadDataReturn: { command: "prettier", args: "--write" } });
		await plugin.onload();
		plugin.settings.enabled = true;
		asTestAccess(plugin).formattingPaths.add("test.md");
		asTestAccess(plugin).saveRequested.add("test.md");

		const modifyHandler = getModifyHandler(plugin);

		const file = new TFile();
		file.path = "test.md";
		file.extension = "md";
		modifyHandler(file);

		expect(mockedExec).not.toHaveBeenCalled();
	});
});

describe("onunload", () => {
	it("clears all tracking sets", async () => {
		const plugin = createPlugin();
		await plugin.loadSettings();

		asTestAccess(plugin).formattingPaths.add("a.md");
		asTestAccess(plugin).saveRequested.add("b.md");

		plugin.onunload();

		expect(asTestAccess(plugin).formattingPaths.size).toBe(0);
		expect(asTestAccess(plugin).saveRequested.size).toBe(0);
	});
});

describe("saveSettings", () => {
	it("calls saveData with current settings", async () => {
		const plugin = createPlugin();
		await plugin.loadSettings();
		plugin.settings.command = "deno";

		await plugin.saveSettings();

		expect(plugin.saveData).toHaveBeenCalledWith(plugin.settings);
	});
});
/* eslint-enable @typescript-eslint/unbound-method */
