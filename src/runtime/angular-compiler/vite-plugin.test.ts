import { describe, it, expect } from "vitest";
import * as path from "node:path";
import {
  angularPreviewPlugin,
  angularPreviewCacheDir,
  createSerialCompileRunner,
} from "./vite-plugin";
import {
  ANGULAR_PREVIEW_URL_PREFIX,
  ANGULAR_PREVIEW_VENDOR_SUBDIR,
} from "./constants";

describe("angularPreviewPlugin", () => {
  it("returns a Vite plugin with a name and a configureServer hook", () => {
    const p = angularPreviewPlugin();
    expect(p.name).toBe("fsds-angular-preview");
    expect(typeof p.configureServer).toBe("function");
  });

  it("URL prefix and cache dir are anchored where the shell expects", () => {
    // The shell builds importmap URLs as `${ANGULAR_PREVIEW_URL_PREFIX}<file>`.
    // The cache dir lives inside node_modules/ so it's gitignored and survives
    // dev-server restarts. Both must stay stable — changing them is a coupled
    // change with shells/angular.ts.
    expect(ANGULAR_PREVIEW_URL_PREFIX).toBe("/preview/angular/");
    expect(ANGULAR_PREVIEW_VENDOR_SUBDIR).toBe("vendor");
    expect(angularPreviewCacheDir()).toMatch(/node_modules\/\.fsds-angular-cache$/);
    expect(path.isAbsolute(angularPreviewCacheDir())).toBe(true);
  });

  it("plugin's inlined URL prefix matches the constants module", async () => {
    // The plugin inlines URL_PREFIX as a string literal so Vite's TS-aware
    // config loader can resolve it (cross-module .ts imports were stripped
    // without inlining and crashed the dev server). The constants module is
    // the source of truth for browser-graph consumers. They must stay in
    // sync — this test reads the plugin file from disk and checks.
    const fs = await import("node:fs/promises");
    const nodePath = await import("node:path");
    const pluginSrc = await fs.readFile(
      nodePath.resolve(process.cwd(), "src/runtime/angular-compiler/vite-plugin.ts"),
      "utf8",
    );
    expect(pluginSrc).toContain(`const URL_PREFIX = "${ANGULAR_PREVIEW_URL_PREFIX}"`);
    expect(pluginSrc).toContain(`const VENDOR_SUBDIR = "${ANGULAR_PREVIEW_VENDOR_SUBDIR}"`);
  });
});

describe("createSerialCompileRunner", () => {
  // Regression for FIX-ANGULAR-PREVIEW-COMPILE-RACE-01: overlapping compile
  // passes rm-rf'd .fsds-preview-hosts under each other (ENOENT on write,
  // ENOTEMPTY mid-removal) and killed the dev server; a failed pass with no
  // awaiter escaped as an unhandled rejection and killed it too.

  it("kicks serialize: the next runCompile starts only after the previous settles", async () => {
    const events: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => (releaseFirst = resolve));
    const runner = createSerialCompileRunner<string>({
      runCompile: async (reason) => {
        events.push(`start:${reason}`);
        if (reason === "first") await firstGate;
        events.push(`end:${reason}`);
        return reason;
      },
    });

    const first = runner.kick("first");
    const second = runner.kick("second");
    // Flush microtasks: an overlapping (buggy) queue would have started the
    // second pass immediately instead of waiting behind the in-flight first.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events).toEqual(["start:first"]);

    releaseFirst();
    await Promise.all([first, second]);
    expect(events).toEqual([
      "start:first",
      "end:first",
      "start:second",
      "end:second",
    ]);
  });

  it("a rejected kick reaches its awaiter, is contained, and does not wedge the queue", async () => {
    const failures: unknown[] = [];
    const runner = createSerialCompileRunner<string>({
      runCompile: async (reason) => {
        if (reason === "boom") throw new Error("boom");
        return reason;
      },
      onError: (e) => failures.push(e),
    });

    await expect(runner.kick("boom")).rejects.toThrow("boom");
    expect(failures).toHaveLength(1);
    // The queue must survive a failed pass; the next kick runs normally.
    await expect(runner.kick("after")).resolves.toBe("after");
  });

  it("a rejection with no awaiter never surfaces as an unhandled rejection", async () => {
    // Deliberately kick and drop the promise. If the queue's containment
    // (no-op catch on the queued promise) regresses, vitest fails this suite
    // on the process-level unhandled rejection — the exact failure mode that
    // took the dev server down.
    const runner = createSerialCompileRunner<string>({
      runCompile: async () => {
        throw new Error("unobserved boom");
      },
    });
    void runner.kick("dropped");
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
