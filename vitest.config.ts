import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import fsdsData from "./vite-plugin-fsds-data";
import analyticalCompositePreview from "./scripts/analytical-composite-preview";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    // The ds-figma-plugin suites import FigmaPluginApp.svelte, which pulls
    // ds-svelte components into the root run. Compile `.svelte` with the
    // svelte plugin, and scope plugin-react away from those workspaces (its
    // default include matches .svelte.ts rune files and SFC script
    // sub-requests — same hazard the dev-server config documents in
    // vite.config.ts).
    react({
      exclude: [
        /packages\/ds-vue\//,
        /packages\/ds-svelte\//,
        /packages\/ds-lit\//,
        /packages\/ds-angular\//,
        /packages\/ds-figma-plugin\//,
      ],
    }),
    svelte({ configFile: false }),
    // src/types/bundle.ts imports `virtual:fsds/data`; showcase smoke suites
    // pull it in. Same wiring as vite.config.ts / vitest.showcase.config.ts.
    fsdsData(),
    analyticalCompositePreview(),
  ],
  resolve: {
    // jsdom is a browser environment; without the browser condition svelte
    // resolves to its server build and mount() throws
    // lifecycle_function_unavailable.
    conditions: ["browser"],
    alias: {
      "@full-stack-ds/react": path.resolve(
        __dirname,
        "packages/ds-react/src/index.ts",
      ),
    },
  },
  // CODEGEN-EMIT-LINT-HYGIENE-01 (adjacent root-config fix): @testing-library
  // ships RUNE modules (`props.svelte.js` in svelte-core) that must be
  // compiled by the svelte plugin, not pre-bundled by esbuild (which leaves
  // `$state` uncompiled → rune_outside_svelte at render). A warm vite dep
  // cache can mask this; a cold cache (fresh worktree, clean CI runner)
  // exposes it. Forcing the dep through the plugin pipeline makes the root
  // suite deterministic — the figma-plugin package config already avoids
  // the interaction by not co-loading plugin-react.
  ssr: {
    noExternal: [
      "@testing-library/svelte",
      "@testing-library/svelte-core",
    ],
  },
  test: {
    // Corpus audits and CLI tests compete for CPU with jsdom workers. Bound
    // parallelism so their existing deadlines hold on shared development hosts.
    maxWorkers: 4,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    css: true,
    include: [
      "packages/**/*.{test,spec}.{ts,tsx}",
      "src/**/*.{test,spec}.{ts,tsx}",
    ],
    // Per-framework packages own their own test runners (each needs its
    // own Vite plugin). Skip them here so root vitest can stay React-only.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "packages/ds-vue/**",
      "packages/ds-angular/**",
      "packages/ds-lit/**",
      "packages/ds-react-native/**",
      "packages/ds-svelte/**",
    ],
  },
});
