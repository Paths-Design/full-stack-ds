import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

/**
 * Library-mode build for @full-stack-ds/vue.
 *
 * vite + @vitejs/plugin-vue compile the SFCs into a single ESM bundle
 * (with a CJS facade for Node 22.19+ consumers). vue is kept external so
 * peer-dep semantics work — consumers bring their own Vue runtime.
 *
 * Type declarations are emitted separately by `vue-tsc --declaration`
 * (see the build:types script in package.json).
 */
export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "FullStackDsVue",
      formats: ["es"],
      fileName: (format) => `index.${format === "cjs" ? "cjs" : "js"}`,
    },
    rollupOptions: {
      external: ["vue"],
      output: {
        globals: { vue: "Vue" },
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
