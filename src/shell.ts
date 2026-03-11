/**
 * Wraps a command string so it runs inside the user's login shell.
 *
 * Electron apps launched from Finder/Spotlight inherit a minimal environment
 * that lacks custom PATH entries (e.g. ~/.local/bin). Running through a login
 * shell (`-l`) sources the user's profile and restores the full PATH.
 */
export function buildLoginShellCommand(innerCmd: string): string {
	const shell = process.env["SHELL"] || "/bin/sh";
	return `${shell} -lc '${innerCmd}'`;
}

/**
 * Builds the full shell command used to format a file.
 *
 * @returns A login-shell-wrapped command string ready for `child_process.exec`.
 */
export function buildFormatCommand(
	command: string,
	args: string,
	filePath: string,
): string {
	const parts = [command];
	const trimmedArgs = args.trim();
	if (trimmedArgs) {
		parts.push(trimmedArgs);
	}
	parts.push(`"${filePath}"`);
	return buildLoginShellCommand(parts.join(" "));
}

/**
 * Builds a login-shell-wrapped `which` command to check if an executable exists.
 */
export function buildWhichCommand(command: string): string {
	return buildLoginShellCommand(`which ${command}`);
}
