import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@motion": fileURLToPath(new URL("../src/motion", import.meta.url)),
    },
  },
});
