/**
 * Pattern matching safe executable names/paths.
 * Allows alphanumeric, hyphens, underscores, dots, and forward slashes.
 */
const SAFE_COMMAND_RE = /^[a-zA-Z0-9_.\-/]+$/;

/**
 * Pattern matching safe CLI arguments.
 * Allows alphanumeric, hyphens, underscores, dots, forward slashes,
 * equals signs, and spaces (for multiple args).
 */
const SAFE_ARGS_RE = /^[a-zA-Z0-9_.\-/= ]+$/;

/**
 * Escapes a string for safe inclusion inside single quotes in a shell command.
 *
 * Replaces each `'` with `'\''` (end quote, escaped quote, start quote).
 */
function escapeForSingleQuote(s: string): string {
	return s.replace(/'/g, "'\\''");
}

/**
 * Validates that a command name contains only safe characters.
 *
 * @throws {Error} if the command contains unsafe characters.
 */
export function validateCommand(command: string): void {
	if (!SAFE_COMMAND_RE.test(command)) {
		throw new Error(
			`Unsafe command name: "${command}". ` +
				"Only alphanumeric characters, hyphens, underscores, dots, and slashes are allowed.",
		);
	}
}

/**
 * Validates that CLI arguments contain only safe characters.
 *
 * @throws {Error} if the arguments contain unsafe characters.
 */
export function validateArgs(args: string): void {
	if (!SAFE_ARGS_RE.test(args)) {
		throw new Error(
			`Unsafe arguments: "${args}". ` +
				"Only alphanumeric characters, hyphens, underscores, dots, slashes, equals signs, and spaces are allowed.",
		);
	}
}

/**
 * Wraps a command string so it runs inside the user's login shell.
 *
 * Electron apps launched from Finder/Spotlight inherit a minimal environment
 * that lacks custom PATH entries (e.g. ~/.local/bin). Running through a login
 * shell (`-l`) sources the user's profile and restores the full PATH.
 *
 * Single quotes in the inner command are escaped to prevent shell injection.
 */
export function buildLoginShellCommand(innerCmd: string): string {
	const shell = process.env["SHELL"] || "/bin/sh";
	return `${shell} -lc '${escapeForSingleQuote(innerCmd)}'`;
}

/**
 * Builds the full shell command used to format a file.
 *
 * The command name is validated against a safe character set.
 * The file path is properly escaped for shell interpolation.
 *
 * @returns A login-shell-wrapped command string ready for `child_process.exec`.
 * @throws {Error} if the command name contains unsafe characters.
 */
export function buildFormatCommand(command: string, args: string, filePath: string): string {
	validateCommand(command);
	const trimmedArgs = args.trim();
	if (trimmedArgs) {
		validateArgs(trimmedArgs);
	}
	const parts = [command];
	if (trimmedArgs) {
		parts.push(trimmedArgs);
	}
	parts.push(`"${filePath}"`);
	return buildLoginShellCommand(parts.join(" "));
}

/**
 * Builds a login-shell-wrapped `which` command to check if an executable exists.
 *
 * @throws {Error} if the command name contains unsafe characters.
 */
export function buildWhichCommand(command: string): string {
	validateCommand(command);
	return buildLoginShellCommand(`which ${command}`);
}
