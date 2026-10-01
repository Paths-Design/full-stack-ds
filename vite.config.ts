import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import fsdsData from "./vite-plugin-fsds-data";
import analyticalCompositePreview from "./scripts/analytical-composite-preview";
import { docsDataPlugin } from "./src/docs/vite-plugin";
import { angularPreviewPlugin } from "./src/runtime/angular-compiler/vite-plugin";
import { reactPreviewPlugin } from "./src/runtime/react-preview/vite-plugin";
import { vuePreviewPlugin } from "./src/runtime/vue-preview/vite-plugin";
import { sveltePreviewPlugin } from "./src/runtime/svelte-preview/vite-plugin";
import { litPreviewPlugin } from "./src/runtime/lit-preview/vite-plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Framework plugins are listed below the React showcase plugin. Their default
// include patterns are already extension-scoped (`*.vue`, `*.svelte`,
// `*.svelte.ts`) so they don't claim files outside their workspace; the
// preview pipeline's per-framework Vite plugin (see ADR-PREVIEW-PIPELINE-001
// step 2+) will additionally serve `/preview/<fw>/...` routes that compose
// these transforms.
export default defineConfig({
  plugins: [
    // plugin-react's default include is /\.(mdx|js|jsx|ts|tsx)$/ which
    // matches:
    //  - the .ts scripts inside .vue SFCs (plugin-vue emits sub-requests
    //    with `?vue&type=script&lang.ts` suffixes)
    //  - the .svelte.ts rune files in ds-svelte
    //  - plain .ts files inside ds-lit, ds-vue, ds-angular workspaces
    // Without an explicit exclude, plugin-react injects React Fast Refresh
    // hooks ($RefreshSig$, $RefreshReg$) into those modules, breaking them
    // at runtime. Scope plugin-react out of every non-React workspace.
    // The path matcher fires on substring match across the full module id
    // (including query strings), so a partial-path regex catches sub-
    // requests like Accordion.vue?vue&type=script&lang.ts too.
    react({
      exclude: [
        /packages\/ds-vue\//,
        /packages\/ds-svelte\//,
        /packages\/ds-lit\//,
        /packages\/ds-angular\//,
      ],
    }),
    vue(),
    svelte({ configFile: false }),
    fsdsData(),
    analyticalCompositePreview(),
    docsDataPlugin(),
    angularPreviewPlugin(),
    reactPreviewPlugin(),
    vuePreviewPlugin(),
    sveltePreviewPlugin(),
    litPreviewPlugin(),
  ],
  resolve: {
    alias: {
      "@full-stack-ds/react": path.resolve(
        __dirname,
        "packages/ds-react/src/index.ts",
      ),
    },
  },
});
