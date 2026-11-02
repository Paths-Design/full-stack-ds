import { build, defineConfig } from "tsup";
import { emitCommonjsFacades } from "../../scripts/emit-commonjs-facades.mjs";

/**
 * tsup config for @full-stack-ds/lit. Mirrors ds-react: shared ESM + CJS facades + DTS,
 * sourcemaps, lit kept external as a peer dependency.
 *
 * Lit components are pure TypeScript classes (no SFC compilation needed),
 * so tsup handles them directly.
 */
const shared = {
  entry: ["src/index.ts", "src/primitives/index.ts"],
  splitting: true,
  external: ["lit"],
  outDir: "dist",
};

export default defineConfig({
  ...shared,
  // Register each custom element once across import and require consumers.
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: true,
  async onSuccess() {
    await build({ ...shared, config: false, format: ["esm", "cjs"], dts: { only: true }, watch: false, clean: true });
    emitCommonjsFacades(process.cwd());
  },
});
