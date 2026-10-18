import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      "@motion": fileURLToPath(new URL("../src/motion", import.meta.url)),
    },
  },
});
