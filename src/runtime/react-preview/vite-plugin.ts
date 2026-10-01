import { compositionCss } from "../composition-css";
// Vite plugin: React preview pipeline.
//
// Responsibilities at a glance:
//   1. Serve an HTML shell at /preview/react/<Name> per component.
//   2. Expose a per-component virtual entry module at
//      virtual:fsds-preview-react/<Name>/entry. The shell loads it via
//      Vite's `/@id/` URL, which routes through resolveId/load.
//   3. The virtual entry imports the real workspace component (absolute
//      path under /packages/ds-react/src/components/) and mounts it via
//      createRoot — Vite's React plugin transforms the JSX along the way.
//
// Unlike the Angular plugin, no AOT compile and no cache directory: Vite's
// existing transform pipeline (`@vitejs/plugin-react`) handles JSX, TSX,
// and transitive sibling imports natively. That's the whole point of the
// pipeline migration described in ADR-PREVIEW-PIPELINE-001.

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, ViteDevServer } from "vite";
import { buildBundle } from "../../../vite-plugin-fsds-data";
import { childLabel, defaultPropsFromContract, callbackPropNames } from "../demos";
import { buildConfigEntrySource } from "../config-entry";
import { buildReactConfigRendererSource } from "./config-renderer";

// NOTE: the URL prefix is inlined here as a string literal — Vite's config
// loader doesn't reliably follow .ts → .ts imports inside the
// vite.config.ts dep graph. Browser-graph consumers (and the regression
// test) read REACT_PREVIEW_URL_PREFIX from ./constants. Keep them in sync.
// (See src/runtime/angular-compiler/vite-plugin.ts for the same pitfall.)
const URL_PREFIX = "/preview/react/";

// Same inlining concern: the virtual-id prefix is also a literal here, mirror
// of ./constants. Changing one is a coupled change with the other.
const VIRTUAL_ID_PREFIX = "virtual:fsds-preview-react/";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

interface ParsedShellRequest {
  componentName: string;
}

interface ParsedVirtualEntryId {
  componentName: string;
}

function parseShellRequest(url: string): ParsedShellRequest | null {
  if (!url.startsWith(URL_PREFIX)) return null;
  const afterPrefix = url.slice(URL_PREFIX.length);
  const qIndex = afterPrefix.indexOf("?");
  const tail = qIndex === -1 ? afterPrefix : afterPrefix.slice(0, qIndex);
  // Only the bare component segment matches. We never serve sub-paths from
  // the shell middleware; the entry virtual module is reached via /@id/.
  if (!/^[A-Z][A-Za-z0-9]*\/?$/.test(tail)) return null;
  return { componentName: tail.replace(/\/$/, "") };
}

function parseVirtualEntryId(id: string): ParsedVirtualEntryId | null {
  // Vite passes ids with optional `\0` prefix when resolved through resolveId
  // hooks. We also need to handle the case where the id arrives URL-encoded
  // via /@id/ (Vite percent-encodes the colon).
  const clean = id.startsWith("\0") ? id.slice(1) : id;
  const decoded = (() => {
    try { return decodeURIComponent(clean); } catch { return clean; }
  })();
  if (!decoded.startsWith(VIRTUAL_ID_PREFIX)) return null;
  const tail = decoded.slice(VIRTUAL_ID_PREFIX.length);
  // .tsx extension is required: Vite's import-analyzer dispatches transforms
  // by file extension and refuses to parse JSX from extensionless modules.
  // The shell builder uses the same suffix when generating the entry URL.
  const match = /^([A-Z][A-Za-z0-9]*)\/entry\.tsx$/.exec(tail);
  if (!match) return null;
  return { componentName: match[1] };
}

/**
 * Builds the JS source for a per-component entry module. The single import
 * for the component root is rewritten from the relative `./<Name>` form
 * produced by buildReactDemo() to an absolute Vite-served path under
 * /packages/ds-react/..., so Vite's React plugin picks it up like any
 * other workspace module.
 */
function buildEntrySource(
  componentName: string,
  bundle: Awaited<ReturnType<typeof buildBundle>>,
): string {
  const component = bundle.components.find((c) => c.name === componentName);
  if (!component) {
    throw new Error(`fsds-react-preview: unknown component "${componentName}"`);
  }
  const child = childLabel(component);
  return buildConfigEntrySource({
    childLabel: child === "" ? null : child,
    defaultProps: defaultPropsFromContract(component),
    rendererSource: buildReactConfigRendererSource(componentName),
    callbackPropNames: callbackPropNames(component),
  });
}

export function reactPreviewPlugin(): Plugin {
  let cachedBundle: Awaited<ReturnType<typeof buildBundle>> | null = null;

  async function getBundle() {
    if (cachedBundle) return cachedBundle;
    cachedBundle = await buildBundle(REPO_ROOT);
    return cachedBundle;
  }

  function invalidateBundle() {
    cachedBundle = null;
  }

  return {
    name: "fsds-react-preview",

    // Resolve virtual entry IDs. Vite calls resolveId for any module ID it
    // doesn't recognize as a file path; we claim our virtual: prefix and
    // return it verbatim so load() fires next.
    resolveId(id) {
      if (parseVirtualEntryId(id)) {
        // Return the id without modification (no \0 prefix) — Vite's React
        // plugin needs to see this as a normal module so its JSX transform
        // applies. Marking it with \0 would opt it out of subsequent
        // transforms, which is what we want to AVOID here.
        return id;
      }
      return null;
    },

    async load(id) {
      const parsed = parseVirtualEntryId(id);
      if (!parsed) return null;
      const bundle = await getBundle();
      // Code is emitted as TSX so Vite's React plugin transforms it. The id
      // doesn't carry an extension — the plugin uses moduleType detection,
      // which falls back to JSX-aware parsing for virtual modules. If that
      // ever changes upstream, we'd add an extension hint here.
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
            res.end(`fsds-react-preview: unknown component "${parsed.componentName}"`);
            return;
          }
          // Lazy import the shell builder so this plugin module stays lean for
          // tests that only inspect its shape.
          const { buildReactPreviewShellHtml } = await import("./shell");
          // The shell builder inlines the React Fast Refresh preamble itself
          // (see REACT_REFRESH_PREAMBLE in ./shell.ts) so we deliberately
          // skip server.transformIndexHtml — that pass triggers Vite's
          // import-analysis on inline <script type="module"> blocks, which
          // can't normalize /@id/<virtual:...> URLs with literal colons.
          const entryId = `${VIRTUAL_ID_PREFIX}${parsed.componentName}/entry.tsx`;
          const html = buildReactPreviewShellHtml({
            componentName: parsed.componentName,
            componentCss: compositionCss(bundle.components, parsed.componentName, "react"),
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
          res.end(`fsds-react-preview error: ${(e as Error).message}`);
        }
      });
    },

    handleHotUpdate(ctx) {
      // Source edits in ds-react or ds-contracts can change demo source or
      // component CSS — invalidate the bundle cache so the next request
      // rebuilds it. The full-reload broadcast lives in vite-plugin-fsds-data
      // already, so we just clear our cache here.
      if (/packages\/(ds-contracts|ds-react)\//.test(ctx.file)) {
        invalidateBundle();
      }
    },
  };
}

/**
 * Test helper: exposes the URL prefix at runtime so the regression test for
 * the inlining pitfall can compare against the literal in the file.
 */
export function reactPreviewUrlPrefix(): string {
  return URL_PREFIX;
}

/**
 * Test helper: same shape as the angular plugin's exposed cache-dir helper.
 * Returns the virtual ID prefix used by the load() hook so tests can build
 * canonical entry IDs without re-deriving them.
 */
export function reactPreviewVirtualIdPrefix(): string {
  return VIRTUAL_ID_PREFIX;
}
