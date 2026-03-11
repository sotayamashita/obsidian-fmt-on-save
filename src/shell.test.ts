import { describe, expect, it, afterEach, vi } from "vitest";
import {
	buildLoginShellCommand,
	buildFormatCommand,
	buildWhichCommand,
	validateCommand,
	validateArgs,
} from "./shell";

describe("validateCommand", () => {
	it("accepts simple command names", () => {
		expect(() => validateCommand("prettier")).not.toThrow();
		expect(() => validateCommand("deno")).not.toThrow();
		expect(() => validateCommand("oxfmt")).not.toThrow();
	});

	it("accepts paths with slashes", () => {
		expect(() => validateCommand("/usr/local/bin/prettier")).not.toThrow();
		expect(() => validateCommand("./node_modules/.bin/prettier")).not.toThrow();
	});

	it("accepts names with hyphens, underscores, and dots", () => {
		expect(() => validateCommand("my-formatter")).not.toThrow();
		expect(() => validateCommand("my_formatter")).not.toThrow();
		expect(() => validateCommand("fmt.exe")).not.toThrow();
	});

	it("rejects commands with shell metacharacters", () => {
		expect(() => validateCommand("prettier; rm -rf /")).toThrow(/Unsafe command/);
		expect(() => validateCommand("cmd && evil")).toThrow(/Unsafe command/);
		expect(() => validateCommand("cmd | cat")).toThrow(/Unsafe command/);
		expect(() => validateCommand("$(whoami)")).toThrow(/Unsafe command/);
		expect(() => validateCommand("`whoami`")).toThrow(/Unsafe command/);
	});

	it("rejects commands with spaces", () => {
		expect(() => validateCommand("my command")).toThrow(/Unsafe command/);
	});

	it("rejects commands with quotes", () => {
		expect(() => validateCommand("cmd'inject")).toThrow(/Unsafe command/);
		expect(() => validateCommand('cmd"inject')).toThrow(/Unsafe command/);
	});

	it("rejects empty string", () => {
		expect(() => validateCommand("")).toThrow(/Unsafe command/);
	});
});

describe("validateArgs", () => {
	it("accepts typical CLI arguments", () => {
		expect(() => validateArgs("--write")).not.toThrow();
		expect(() => validateArgs("fmt")).not.toThrow();
		expect(() => validateArgs("--config=.prettierrc")).not.toThrow();
	});

	it("accepts multiple space-separated arguments", () => {
		expect(() => validateArgs("--write --config=test")).not.toThrow();
	});

	it("rejects arguments with shell metacharacters", () => {
		expect(() => validateArgs("--write; rm -rf /")).toThrow(/Unsafe arguments/);
		expect(() => validateArgs("fmt && evil")).toThrow(/Unsafe arguments/);
		expect(() => validateArgs("$(whoami)")).toThrow(/Unsafe arguments/);
	});

	it("rejects arguments with quotes", () => {
		expect(() => validateArgs("--config='bad'")).toThrow(/Unsafe arguments/);
		expect(() => validateArgs('--config="bad"')).toThrow(/Unsafe arguments/);
	});
});

describe("buildLoginShellCommand", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("wraps command with user's SHELL as login shell", () => {
		vi.stubEnv("SHELL", "/bin/zsh");
		expect(buildLoginShellCommand("which prettier")).toBe("/bin/zsh -lc 'which prettier'");
	});

	it("falls back to /bin/sh when SHELL is not set", () => {
		vi.stubEnv("SHELL", "");
		expect(buildLoginShellCommand("which prettier")).toBe("/bin/sh -lc 'which prettier'");
	});

	it("uses login shell flag -l to source user profile", () => {
		vi.stubEnv("SHELL", "/opt/homebrew/bin/fish");
		const result = buildLoginShellCommand("echo hello");
		expect(result).toContain("-lc");
		expect(result).toMatch(/^\/opt\/homebrew\/bin\/fish/);
	});

	it("escapes single quotes in the inner command", () => {
		vi.stubEnv("SHELL", "/bin/zsh");
		const result = buildLoginShellCommand("echo 'hello'");
		expect(result).toBe("/bin/zsh -lc 'echo '\\''hello'\\'''");
	});

	it("escapes file paths containing single quotes", () => {
		vi.stubEnv("SHELL", "/bin/zsh");
		const result = buildLoginShellCommand('prettier --write "/vault/it\'s a note.md"');
		expect(result).toBe("/bin/zsh -lc 'prettier --write \"/vault/it'\\''s a note.md\"'");
	});
});

describe("buildFormatCommand", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("builds command with args and file path wrapped in login shell", () => {
		vi.stubEnv("SHELL", "/bin/zsh");
		const result = buildFormatCommand("prettier", "--write", "/path/to/file.md");
		expect(result).toBe(`/bin/zsh -lc 'prettier --write "/path/to/file.md"'`);
	});

	it("omits args when empty", () => {
		vi.stubEnv("SHELL", "/bin/zsh");
		const result = buildFormatCommand("oxfmt", "", "/path/to/file.md");
		expect(result).toBe(`/bin/zsh -lc 'oxfmt "/path/to/file.md"'`);
	});

	it("omits args when whitespace only", () => {
		vi.stubEnv("SHELL", "/bin/zsh");
		const result = buildFormatCommand("oxfmt", "   ", "/path/to/file.md");
		expect(result).toBe(`/bin/zsh -lc 'oxfmt "/path/to/file.md"'`);
	});

	it("handles multi-word args like 'fmt'", () => {
		vi.stubEnv("SHELL", "/bin/zsh");
		const result = buildFormatCommand("deno", "fmt", "/vault/note.md");
		expect(result).toBe(`/bin/zsh -lc 'deno fmt "/vault/note.md"'`);
	});

	it("escapes file paths containing single quotes", () => {
		vi.stubEnv("SHELL", "/bin/zsh");
		const result = buildFormatCommand("prettier", "--write", "/vault/it's a note.md");
		expect(result).toBe("/bin/zsh -lc 'prettier --write \"/vault/it'\\''s a note.md\"'");
	});

	it("throws on unsafe command names", () => {
		vi.stubEnv("SHELL", "/bin/zsh");
		expect(() => buildFormatCommand("prettier; rm -rf /", "--write", "/file.md")).toThrow(
			/Unsafe command/,
		);
	});

	it("throws on unsafe arguments", () => {
		vi.stubEnv("SHELL", "/bin/zsh");
		expect(() => buildFormatCommand("prettier", "--write; rm -rf /", "/file.md")).toThrow(
			/Unsafe arguments/,
		);
	});
});

describe("buildWhichCommand", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("wraps which command in login shell", () => {
		vi.stubEnv("SHELL", "/bin/zsh");
		expect(buildWhichCommand("prettier")).toBe("/bin/zsh -lc 'which prettier'");
	});

	it("uses login shell so custom PATH entries are available", () => {
		vi.stubEnv("SHELL", "/bin/bash");
		const result = buildWhichCommand("mise");
		expect(result).toContain("-lc");
		expect(result).toContain("which mise");
		expect(result).toMatch(/^\/bin\/bash/);
	});

	it("throws on unsafe command names", () => {
		vi.stubEnv("SHELL", "/bin/zsh");
		expect(() => buildWhichCommand("prettier; rm -rf /")).toThrow(/Unsafe command/);
	});
});
