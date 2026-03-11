import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import oxlint from "eslint-plugin-oxlint";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.js',
						'manifest.json'
					]
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json']
			},
		},
	},
	...obsidianmd.configs.recommended,
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"commitlint.config.js",
		"nano-staged.mjs",
		"version-bump.mjs",
		"versions.json",
		"main.js",
	]),
	...oxlint.configs["flat/recommended"],
);
