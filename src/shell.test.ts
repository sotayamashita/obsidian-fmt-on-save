import { describe, expect, it, afterEach, vi } from "vitest";
import {
	buildLoginShellCommand,
	buildFormatCommand,
	buildWhichCommand,
} from "./shell";

describe("buildLoginShellCommand", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("wraps command with user's SHELL as login shell", () => {
		vi.stubEnv("SHELL", "/bin/zsh");
		expect(buildLoginShellCommand("which prettier")).toBe(
			"/bin/zsh -lc 'which prettier'",
		);
	});

	it("falls back to /bin/sh when SHELL is not set", () => {
		vi.stubEnv("SHELL", "");
		expect(buildLoginShellCommand("which prettier")).toBe(
			"/bin/sh -lc 'which prettier'",
		);
	});

	it("uses login shell flag -l to source user profile", () => {
		vi.stubEnv("SHELL", "/opt/homebrew/bin/fish");
		const result = buildLoginShellCommand("echo hello");
		expect(result).toContain("-lc");
		expect(result).toMatch(/^\/opt\/homebrew\/bin\/fish/);
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
});

describe("buildWhichCommand", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("wraps which command in login shell", () => {
		vi.stubEnv("SHELL", "/bin/zsh");
		expect(buildWhichCommand("prettier")).toBe(
			"/bin/zsh -lc 'which prettier'",
		);
	});

	it("uses login shell so custom PATH entries are available", () => {
		vi.stubEnv("SHELL", "/bin/bash");
		const result = buildWhichCommand("mise");
		expect(result).toContain("-lc");
		expect(result).toContain("which mise");
		expect(result).toMatch(/^\/bin\/bash/);
	});
});
