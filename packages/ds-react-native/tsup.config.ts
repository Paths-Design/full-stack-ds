import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/primitives/index.ts", "src/tokens/index.tsx"],
  format: ["esm"],
  platform: "neutral",
  target: "es2022",
  // Root components and the public token provider share the same contexts.
  splitting: true,
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-native", "react-native-svg"],
  tsconfig: "tsconfig.build.json",
  outDir: "dist",
});
