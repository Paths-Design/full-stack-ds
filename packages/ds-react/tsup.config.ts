import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/primitives/index.ts"],
  format: ["esm", "cjs"],
  // Providers imported from /primitives must share contexts with root components.
  splitting: true,
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  outDir: "dist",
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
});
