import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const floors = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../coverage-floors.json"), "utf8"),
).packages["react-native"];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react-native-svg": new URL("./src/test-react-native-svg.tsx", import.meta.url).pathname,
      "react-native": new URL("./src/test-react-native.tsx", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["src/components/**/*.test.tsx", "src/tokens/**/*.test.ts"],
    exclude: ["node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      reporter: ["text", "json-summary"],
      reportsDirectory: "tmp/coverage-react-native",
      thresholds: {
        statements: floors.statements,
        branches: floors.branches,
        functions: floors.functions,
        lines: floors.lines,
      },
    },
  },
});
