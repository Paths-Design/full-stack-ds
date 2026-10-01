import { compositionCss } from "../composition-css";
// Vite plugin: Lit preview pipeline.
//
// Lit components self-register as custom elements (via @customElement /
// customElements.define). So the entry just needs to import the component
// module — that triggers registration — and then inject the element tag
// into #root. No SFC plugin needed; the TS + decorators are handled by
// Vite's built-in TS pipeline.

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, ViteDevServer } from "vite";
import { buildBundle } from "../../../vite-plugin-fsds-data";
import { defaultPropsFromContract, childLabel, elementTag, callbackPropNames } from "../demos";
import { buildConfigEntrySource } from "../config-entry";
import { buildLitConfigRendererSource } from "./config-renderer";

const URL_PREFIX = "/preview/lit/";
const VIRTUAL_ID_PREFIX = "virtual:fsds-preview-lit/";

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
    throw new Error(`fsds-lit-preview: unknown component "${componentName}"`);
  }
  const tag = elementTag(component, "lit");
  const child = childLabel(component);
  return buildConfigEntrySource({
    childLabel: child === "" ? null : child,
    defaultProps: defaultPropsFromContract(component),
    rendererSource: buildLitConfigRendererSource(componentName, tag),
    callbackPropNames: callbackPropNames(component),
  });
}

export function litPreviewPlugin(): Plugin {
  let cachedBundle: Awaited<ReturnType<typeof buildBundle>> | null = null;

  async function getBundle() {
    if (cachedBundle) return cachedBundle;
    cachedBundle = await buildBundle(REPO_ROOT);
    return cachedBundle;
  }

  function invalidateBundle() { cachedBundle = null; }

  return {
    name: "fsds-lit-preview",

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
            res.end(`fsds-lit-preview: unknown component "${parsed.componentName}"`);
            return;
          }
          const { buildCommonPreviewShellHtml } = await import("../preview-shell-common");
          const entryId = `${VIRTUAL_ID_PREFIX}${parsed.componentName}/entry.ts`;
          const html = buildCommonPreviewShellHtml({
            componentName: parsed.componentName,
            framework: "lit",
            componentCss: compositionCss(bundle.components, parsed.componentName, "lit"),
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
          res.end(`fsds-lit-preview error: ${(e as Error).message}`);
        }
      });
    },

    handleHotUpdate(ctx) {
      if (/packages\/(ds-contracts|ds-lit)\//.test(ctx.file)) {
        invalidateBundle();
      }
    },
  };
}

export function litPreviewUrlPrefix(): string { return URL_PREFIX; }
export function litPreviewVirtualIdPrefix(): string { return VIRTUAL_ID_PREFIX; }
