import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import fsdsData from "./vite-plugin-fsds-data";
import analyticalCompositePreview from "./scripts/analytical-composite-preview";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const floors = JSON.parse(
  readFileSync(path.resolve(__dirname, "coverage-floors.json"), "utf8"),
).packages.showcase;

// Scoped runner for the showcase app (src/). Its tests also run under the
// root vitest config; this config gives the coverage-scoped command its own
// thresholds (`pnpm exec vitest run -c vitest.showcase.config.ts --coverage`).
// The fsds-data plugin provides `virtual:fsds/data`, which src/types/bundle
// imports — the same wiring as vite.config.ts.
export default defineConfig({
  plugins: [react(), fsdsData(), analyticalCompositePreview()],
  resolve: {
    alias: {
      "@full-stack-ds/react": path.resolve(
        __dirname,
        "packages/ds-react/src/index.ts",
      ),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    css: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      reporter: ["text", "json-summary"],
      reportsDirectory: "tmp/coverage-showcase",
      thresholds: {
        statements: floors.statements,
        branches: floors.branches,
        functions: floors.functions,
        lines: floors.lines,
      },
    },
  },
});
