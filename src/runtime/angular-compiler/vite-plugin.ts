import { compositionCss } from "../composition-css";
// Vite plugin: Angular preview compiler.
//
// Responsibilities at a glance:
//   1. At dev-server start, synthesize one host component per ds-angular
//      component, then run compileAngularPackage once (~1.8s warm).
//   2. Watch packages/ds-angular/src/** and re-run the compile on change.
//   3. Serve compiled .js files from /preview/angular/<path>.
//   4. Return a 503 (with retry hint) while initial compile is in flight,
//      so dev-server startup is not blocked by Angular's compile time.
//
// Pairs with src/runtime/shells/angular.ts, which constructs an importmap
// pointing at /preview/angular/<ComponentName>.host.component.js and lets the
// browser bootstrapApplication the synthesized host.

import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { Plugin, ViteDevServer } from "vite";
import {
  compileAngularPackage,
  angularPackageRoot,
  type CompileResult,
} from "../../../packages/ds-angular/src/preview/index.ts";
// NOTE: the URL prefix is inlined here rather than imported from ./constants
// because Vite's config loader doesn't reliably follow .ts → .ts imports
// inside a vite.config.ts dep graph (the import is stripped but the value
// is not inlined, producing a ReferenceError at request time). The browser-
// graph shell (src/runtime/shells/angular.ts) imports from ./constants
// directly — that path goes through Vite's normal transform pipeline and
// works fine. Keep the two in sync by deriving both from the same literal.
const URL_PREFIX = "/preview/angular/";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const CACHE_DIR = path.join(REPO_ROOT, "node_modules", ".fsds-angular-cache");
const VENDOR_SUBDIR = "vendor";
const VENDOR_PREFIX = `${VENDOR_SUBDIR}/`;
const ANGULAR_VENDOR_ROOT = path.join(angularPackageRoot(), "node_modules");

interface PluginState {
  /** Resolves with the most recent compile result. Rejects on hard compile errors. */
  compilePromise: Promise<CompileResult> | null;
  /** Last successful compile, used to serve while a recompile is in flight. */
  lastResult: CompileResult | null;
  /** Coalesces rapid-fire watcher events into a single recompile. */
  rebuildTimer: NodeJS.Timeout | null;
}

/**
 * Synthesize hosts for every Angular-capable component in the data bundle and
 * then run a full compile into CACHE_DIR. Returns the compile result.
 *
 * The host file paths are passed via `extraFiles` so the Angular compiler picks
 * them up alongside the src/** tree. We import host.ts dynamically because it
 * reads the bundle via virtual:fsds/data, which only resolves inside the Vite
 * graph — importing statically at module top-level would break in non-Vite
 * contexts (e.g. tests).
 */
async function runCompile(): Promise<CompileResult> {
  // Defer-import to keep this module pure when imported outside Vite (e.g. for
  // testing the plugin shape) and to break a cycle: host.ts depends on the
  // bundle, which depends on the plugin chain.
  const { synthesizeAllHosts, clearHosts } =
    await import("./host");
  const { loadBundleFromDisk } = await import("./bundle-loader");

  await clearHosts();
  const bundle = await loadBundleFromDisk();
  const hostPaths = await synthesizeAllHosts(bundle);
  return compileAngularPackage({
    outDir: CACHE_DIR,
    extraFiles: [...hostPaths],
  });
}

/**
 * Serialize compile passes behind a single queue.
 *
 * runCompile() rm-rf's the preview-hosts dir before resynthesizing it, so two
 * overlapping passes destroy each other's inputs (ENOENT on write / ENOTEMPTY
 * mid-removal) — observed when a codegen regeneration rewrites ds-angular/src
 * while a compile from the previous wave is still in flight. Kicking chains
 * each pass after the previous one settles instead of overlapping them, and
 * the queued promise carries a no-op catch so a pass that fails with no
 * middleware awaiter can never surface as an unhandled rejection and kill the
 * dev server (awaiters still receive the rejection).
 */
export function createSerialCompileRunner<R>(opts: {
  runCompile: (reason: string) => Promise<R>;
  onResult?: (result: R) => void;
  onError?: (error: unknown) => void;
}): { kick: (reason: string) => Promise<R> } {
  let pending: Promise<R> = Promise.resolve() as Promise<R>;
  return {
    kick(reason: string): Promise<R> {
      const previous = pending;
      const run = (async () => {
        await previous.catch(() => {});
        try {
          const result = await opts.runCompile(reason);
          opts.onResult?.(result);
          return result;
        } catch (e) {
          opts.onError?.(e);
          throw e;
        }
      })();
      run.catch(() => {});
      pending = run;
      return run;
    },
  };
}

export function angularPreviewPlugin(): Plugin {
  const state: PluginState = {
    compilePromise: null,
    lastResult: null,
    rebuildTimer: null,
  };

  const runner = createSerialCompileRunner<CompileResult>({
    runCompile: (reason) => {
      const t0 = Date.now();
      console.log(`[fsds-angular] compiling (${reason})…`);
      return runCompile().then(
        (result) => {
          const errs = result.diagnostics.filter((d) => d.category === "error");
          const warns = result.diagnostics.filter((d) => d.category === "warning");
          console.log(
            `[fsds-angular] done in ${Date.now() - t0}ms — ${result.emitted.length} files, ${errs.length} error(s), ${warns.length} warning(s)`,
          );
          for (const d of errs.slice(0, 5)) {
            console.error(`[fsds-angular:error] ${d.messageText}`);
          }
          return result;
        },
        (e) => {
          console.error(`[fsds-angular] compile failed:`, e);
          throw e;
        },
      );
    },
    onResult: (result) => {
      state.lastResult = result;
    },
    onError: () => {
      // Logged by the runCompile wrapper; the queue only needs containment.
    },
  });

  function kickCompile(reason: string) {
    state.compilePromise = runner.kick(reason);
    return state.compilePromise;
  }

  function scheduleRebuild(filePath: string) {
    if (state.rebuildTimer) clearTimeout(state.rebuildTimer);
    state.rebuildTimer = setTimeout(() => {
      state.rebuildTimer = null;
      kickCompile(`change: ${path.relative(REPO_ROOT, filePath)}`);
    }, 100);
  }

  function resolveTslibEsm(): string | null {
    const direct = path.join(REPO_ROOT, "node_modules", "tslib", "tslib.es6.mjs");
    if (fs.existsSync(direct)) return direct;

    const pnpmRoot = path.join(REPO_ROOT, "node_modules", ".pnpm");
    try {
      const entry = fs
        .readdirSync(pnpmRoot)
        .filter((name) => name.startsWith("tslib@"))
        .sort()[0];
      if (!entry) return null;
      const candidate = path.join(
        pnpmRoot,
        entry,
        "node_modules",
        "tslib",
        "tslib.es6.mjs",
      );
      return fs.existsSync(candidate) ? candidate : null;
    } catch {
      return null;
    }
  }

  function resolveVendorFile(vendorRelPath: string): string | null {
    const normalized = path.normalize(vendorRelPath);
    if (
      normalized === "." ||
      normalized.startsWith("..") ||
      path.isAbsolute(normalized)
    ) {
      return null;
    }

    if (normalized === "tslib/tslib.es6.mjs") {
      return resolveTslibEsm();
    }

    const absPath = path.join(ANGULAR_VENDOR_ROOT, normalized);
    if (!absPath.startsWith(ANGULAR_VENDOR_ROOT + path.sep)) return null;

    const candidates = [absPath];
    if (path.extname(absPath) === "") {
      candidates.push(`${absPath}.js`, `${absPath}.mjs`);
    }

    for (const candidate of candidates) {
      try {
        if (fs.statSync(candidate).isFile()) return candidate;
      } catch {
        // Try the next extension fallback.
      }
    }
    return absPath;
  }

  return {
    name: "fsds-angular-preview",

    configureServer(server: ViteDevServer) {
      // Kick off the initial compile asynchronously so dev-server startup is
      // not blocked. Requests that arrive before the compile finishes will get
      // a 503 with Retry-After (handled below).
      kickCompile("dev-server start");

      // Watch the ds-angular source tree.
      const watchRoot = path.join(angularPackageRoot(), "src");
      const watcher = fs.watch(watchRoot, { recursive: true }, (_event, filename) => {
        if (!filename) return;
        // Ignore noise from synthesized hosts (lives outside src/) and tests.
        if (filename.includes("__tests__/") || filename.endsWith(".test.ts")) return;
        scheduleRebuild(path.join(watchRoot, filename));
      });
      server.httpServer?.on("close", () => watcher.close());

      // Middleware: serve compiled output under URL_PREFIX.
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(URL_PREFIX)) return next();

        // Strip prefix and query string, guard against traversal.
        const relPath = decodeURIComponent(req.url.slice(URL_PREFIX.length).split("?")[0]);

        // Local Angular/RxJS vendor proxy for the srcdoc shell importmap.
        // The shell cannot rely on Vite's normal bare-specifier rewriting, and
        // using esm.sh made dev previews depend on network/CDN availability.
        if (relPath.startsWith(VENDOR_PREFIX)) {
          const vendorRelPath = relPath.slice(VENDOR_PREFIX.length);
          const absPath = resolveVendorFile(vendorRelPath);
          if (!absPath) {
            res.statusCode = 403;
            res.end("forbidden");
            return;
          }
          let isFile = false;
          try {
            isFile = fs.statSync(absPath).isFile();
          } catch {
            isFile = false;
          }
          if (!isFile) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/plain");
            res.end(`not found in Angular preview vendor tree: ${vendorRelPath}`);
            return;
          }
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("Access-Control-Allow-Origin", "*");
          fs.createReadStream(absPath).pipe(res);
          return;
        }

        // Navigable preview-page branch. A bare PascalCase segment (optionally
        // trailing-slashed) is a per-component preview HTML PAGE — the
        // Playwright runtime rail navigates to /preview/angular/<Name> like it
        // does for the R/V/S/L routes. The matcher is deliberately STRICT so it
        // never captures the compiled cache assets this same middleware serves
        // (e.g. ".fsds-preview-hosts/Progress.host.component.js"): those contain
        // a "/" and/or a "." and fall through to the asset branch below.
        const pageMatch = /^([A-Z][A-Za-z0-9]*)\/?$/.exec(relPath);
        if (pageMatch) {
          const componentName = pageMatch[1];
          // Honor the compile-in-flight contract: a navigable page must not
          // bootstrap against a cache that has no compiled host yet. Await the
          // initial compile so the rail's page.goto resolves to a mounted
          // component rather than racing a 404/empty host import.
          if (state.compilePromise && !state.lastResult) {
            try {
              await state.compilePromise;
            } catch {
              res.statusCode = 500;
              res.setHeader("Content-Type", "text/plain");
              res.end("Angular preview compile failed — see dev-server logs.");
              return;
            }
          }
          // The compiled default host must exist for this component, else the
          // page would import a missing module and never emit fsds:ready.
          const hostJs = path.join(
            CACHE_DIR,
            ".fsds-preview-hosts",
            `${componentName}.host.component.js`,
          );
          if (!fs.existsSync(hostJs)) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/plain");
            res.end(`no compiled Angular host for "${componentName}"`);
            return;
          }
          const { buildAngularShell } = await import("../shells/angular");
          // css is optional fidelity; the rail asserts inline --fsds-* vars and
          // DOM shape (author-written, present regardless of stylesheet). Load
          // both global tokens and component CSS for the styled brand preview.
          let css: string | undefined;
          let tokensCss: string | undefined;
          try {
            const { loadBundleFromDisk } = await import("./bundle-loader");
            const bundle = await loadBundleFromDisk();
            tokensCss = bundle.tokensCss;
            css = compositionCss(bundle.components, componentName, "angular");
          } catch { /* css is optional — proceed without it */ }
          // componentSource + demo are accepted by buildAngularShell for API
          // symmetry but unused (the compiled host on disk is the source of
          // truth); pass empty strings.
          const html = buildAngularShell({
            componentName,
            componentSource: "",
            css,
            tokensCss,
            demo: "",
          });
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          res.end(html);
          return;
        }

        const absPath = path.join(CACHE_DIR, relPath);
        if (!absPath.startsWith(CACHE_DIR + path.sep)) {
          res.statusCode = 403; res.end("forbidden"); return;
        }

        // If a compile is in flight and we don't have a previous result yet,
        // return 503 + Retry-After: 1 so the shell can retry once the cache
        // is warm. This is cheaper than blocking the response on the promise.
        if (state.compilePromise && !state.lastResult) {
          try {
            await state.compilePromise;
          } catch {
            res.statusCode = 500;
            res.setHeader("Content-Type", "text/plain");
            res.end("Angular preview compile failed — see dev-server logs.");
            return;
          }
        }

        if (!fs.existsSync(absPath)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "text/plain");
          res.end(`not found in Angular preview cache: ${relPath}`);
          return;
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        // The Angular preview is loaded into a srcdoc iframe (origin: null),
        // so module fetches are cross-origin and require an explicit CORS
        // allow. We're on a dev-only loopback endpoint so wildcard is fine.
        res.setHeader("Access-Control-Allow-Origin", "*");
        fs.createReadStream(absPath).pipe(res);
      });
    },
  };
}

/**
 * Internal helper exposed for tests. Returns the resolved cache dir without
 * starting the plugin — useful for asserting that artifacts land where the
 * shell expects them.
 */
export function angularPreviewCacheDir(): string {
  return CACHE_DIR;
}

// URL prefix lives in ./constants — both the plugin (Node-side) and the
// browser-side shell import from there to avoid pulling Node-only deps into
// the browser bundle.
