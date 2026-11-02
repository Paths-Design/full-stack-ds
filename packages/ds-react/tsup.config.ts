import { build, defineConfig } from "tsup";
import { emitCommonjsFacades } from "../../scripts/emit-commonjs-facades.mjs";

const shared = {
  entry: ["src/index.ts", "src/primitives/index.ts"],
  splitting: true,
  external: ["react", "react-dom"],
  outDir: "dist",
};

export default defineConfig({
  ...shared,
  // Import and require share providers, contexts and primitive state.
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: true,
  async onSuccess() {
    // Await both declaration graphs, including type-only watch changes.
    await build({ ...shared, config: false, format: ["esm", "cjs"], dts: { only: true }, watch: false, clean: true });
    emitCommonjsFacades(process.cwd());
  },
});
