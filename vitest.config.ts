import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			obsidian: resolve(__dirname, "src/__mocks__/obsidian.ts"),
		},
	},
	test: {
		restoreMocks: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "json-summary", "json"],
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.test.ts", "src/__mocks__/**"],
		},
	},
});
