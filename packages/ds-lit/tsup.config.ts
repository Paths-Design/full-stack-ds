import { defineConfig } from "tsup";

/**
 * tsup config for @full-stack-ds/lit. Mirrors ds-react: ESM + CJS + DTS,
 * sourcemaps, lit kept external as a peer dependency.
 *
 * Lit components are pure TypeScript classes (no SFC compilation needed),
 * so tsup handles them directly.
 */
export default defineConfig({
  entry: ["src/index.ts", "src/primitives/index.ts"],
  format: ["esm", "cjs"],
  // Both public entries must share custom-element constructors and controllers.
  splitting: true,
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["lit"],
  outDir: "dist",
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
});
