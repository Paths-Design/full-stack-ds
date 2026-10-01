import { compositionCss } from "../composition-css";
// Vite plugin: Svelte preview pipeline.
//
// Same shape as fsds-react-preview / fsds-vue-preview. Serves an HTML shell
// at /preview/svelte/<Name> and exposes a per-component virtual entry .ts
// that imports the workspace .svelte file and mounts it via Svelte 5's
// mount() API.
//
// The .svelte transform is handled by @sveltejs/vite-plugin-svelte
// (registered in vite.config.ts).

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, ViteDevServer } from "vite";
import { buildBundle } from "../../../vite-plugin-fsds-data";
import { defaultPropsFromContract, childLabel, callbackPropNames } from "../demos";
import { buildConfigEntrySource } from "../config-entry";
import { buildSvelteConfigRendererSource } from "./config-renderer";

const URL_PREFIX = "/preview/svelte/";
const VIRTUAL_ID_PREFIX = "virtual:fsds-preview-svelte/";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

function parseShellRequest(url: string) {
  if (!url.startsWith(URL_PREFIX)) return null;
  const afterPrefix = url.slice(URL_PREFIX.length);
  const qIndex = afterPrefix.indexOf("?");
  const tail = qIndex === -1 ? afterPrefix : afterPrefix.slice(0, qIndex);
  if (!/^[A-Z][A-Za-z0-9]*\/?$/.test(tail)) return null;
  return { componentName: tail.replace(/\/$/, "") };
}

function parseVirtualEntryId(id: string) {
  const clean = id.startsWith("\0") ? id.slice(1) : id;
  const decoded = (() => {
    try { return decodeURIComponent(clean); } catch { return clean; }
  })();
  if (!decoded.startsWith(VIRTUAL_ID_PREFIX)) return null;
  const tail = decoded.slice(VIRTUAL_ID_PREFIX.length);
  const match = /^([A-Z][A-Za-z0-9]*)\/entry\.ts$/.exec(tail);
  if (!match) return null;
  return { componentName: match[1] };
}

function buildEntrySource(
  componentName: string,
  bundle: Awaited<ReturnType<typeof buildBundle>>,
): string {
  const component = bundle.components.find((c) => c.name === componentName);
  if (!component) {
    throw new Error(`fsds-svelte-preview: unknown component "${componentName}"`);
  }
  const child = childLabel(component);
  return buildConfigEntrySource({
    childLabel: child === "" ? null : child,
    defaultProps: defaultPropsFromContract(component),
    rendererSource: buildSvelteConfigRendererSource(
      componentName,
      child === "" ? null : child,
    ),
    callbackPropNames: callbackPropNames(component),
  });
}

export function sveltePreviewPlugin(): Plugin {
  let cachedBundle: Awaited<ReturnType<typeof buildBundle>> | null = null;

  async function getBundle() {
    if (cachedBundle) return cachedBundle;
    cachedBundle = await buildBundle(REPO_ROOT);
    return cachedBundle;
  }

  function invalidateBundle() { cachedBundle = null; }

  return {
    name: "fsds-svelte-preview",

    resolveId(id) {
      if (parseVirtualEntryId(id)) return id;
      return null;
    },

    async load(id) {
      const parsed = parseVirtualEntryId(id);
      if (!parsed) return null;
      const bundle = await getBundle();
      return buildEntrySource(parsed.componentName, bundle);
    },

    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const parsed = req.url ? parseShellRequest(req.url) : null;
        if (!parsed) return next();
        try {
          const bundle = await getBundle();
          const component = bundle.components.find((c) => c.name === parsed.componentName);
          if (!component) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/plain");
            res.end(`fsds-svelte-preview: unknown component "${parsed.componentName}"`);
            return;
          }
          const { buildCommonPreviewShellHtml } = await import("../preview-shell-common");
          const entryId = `${VIRTUAL_ID_PREFIX}${parsed.componentName}/entry.ts`;
          const html = buildCommonPreviewShellHtml({
            componentName: parsed.componentName,
            framework: "svelte",
            componentCss: compositionCss(bundle.components, parsed.componentName, "svelte"),
            tokensCss: bundle.tokensCss,
            entryId,
          });
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          res.end(html);
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/plain");
          res.end(`fsds-svelte-preview error: ${(e as Error).message}`);
        }
      });
    },

    handleHotUpdate(ctx) {
      if (/packages\/(ds-contracts|ds-svelte)\//.test(ctx.file)) {
        invalidateBundle();
      }
    },
  };
}

export function sveltePreviewUrlPrefix(): string { return URL_PREFIX; }
export function sveltePreviewVirtualIdPrefix(): string { return VIRTUAL_ID_PREFIX; }
