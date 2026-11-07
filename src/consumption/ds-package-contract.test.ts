/**
 * @full-stack-ds/react PUBLISHED consumption contract.
 *
 * Why this exists (SHOWCASE-CONSUMPTION-01):
 * The showcase app aliases `@full-stack-ds/react` -> `packages/ds-react/src/index.ts`
 * at dev time (see vite.config.ts / vitest.config.ts). That alias is a DX
 * convenience, but it means nothing in the app ever exercises the path a real
 * downstream consumer takes: the *built* package — its `exports` map, its
 * bundled `dist` entrypoints, and the aggregate `./styles.css` that a consumer
 * must import separately. A broken tsup build, a wrong `exports` entry, or a
 * failed CSS aggregation would ship undetected because the showcase reads source.
 *
 * This test closes that gap. It builds the package the way it is published, then
 * asserts the contract against the *dist* artifacts — deliberately importing by
 * resolved file path, NOT by package name, so the source alias cannot hijack it.
 *
 * Covers acceptance A1 (exports map resolves), A2 (built entrypoint exports the
 * component surface), A3 (styles.css carries component selectors).
 */
import { execFile, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { beforeAll, describe, expect, it, onTestFinished, vi } from "vitest";

const execFileAsync = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", ".."); // src/consumption -> repo root
const PKG_DIR = resolve(REPO_ROOT, "packages", "ds-react");
const PKG_JSON = resolve(PKG_DIR, "package.json");

/** The publication check runs on POSIX hosts and owns only its new process group. */
async function runOwnedCommand(
  command: string,
  args: string[],
  { cwd, timeoutMs = 115_000, closeTimeoutMs = 4_000 }: {
    cwd: string;
    timeoutMs?: number;
    closeTimeoutMs?: number;
  },
): Promise<{ stdout: string; stderr: string }> {
  if (process.platform === "win32") {
    throw new Error("The package-build command requires POSIX process-group containment");
  }

  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  let failure: Error | undefined;
  const cleanupErrors: unknown[] = [];
  let groupTerminationSettled = false;
  const terminateGroup = (phase: "command-error" | "watchdog" | "after-close") => {
    if (child.pid === undefined || groupTerminationSettled) return;
    try {
      process.kill(-child.pid, "SIGKILL");
      // An accepted SIGKILL is terminal; do not target the group again after reaping.
      groupTerminationSettled = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") {
        groupTerminationSettled = true;
      } else {
        cleanupErrors.push(Object.assign(error as Error, { cleanupPhase: phase, processGroupId: child.pid }));
      }
    }
  };
  child.stdout.setEncoding("utf8").on("data", (data: string) => { stdout += data; });
  child.stderr.setEncoding("utf8").on("data", (data: string) => { stderr += data; });
  type CloseResult = { code: number | null; signal: NodeJS.Signals | null } | { closeError: Error };
  let reportClosed!: (result: CloseResult) => void;
  let closeDeadline: ReturnType<typeof setTimeout> | undefined;
  const closed = new Promise<CloseResult>((resolve) => {
    reportClosed = resolve;
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  child.once("error", (error) => {
    failure ??= error;
    terminateGroup("command-error");
  });
  const watchdog = setTimeout(() => {
    failure ??= Object.assign(new Error(`${command} timed out after ${timeoutMs}ms`), {
      code: "COMMAND_TIMEOUT",
    });
    terminateGroup("watchdog");
    closeDeadline = setTimeout(() => {
      reportClosed({ closeError: Object.assign(new Error(
        `${command}: owned process group ${child.pid} did not close within ${closeTimeoutMs}ms after termination`,
      ), { code: "COMMAND_CLOSE_TIMEOUT", processGroupId: child.pid }) });
    }, closeTimeoutMs);
  }, timeoutMs);

  const result = await closed;
  clearTimeout(watchdog);
  clearTimeout(closeDeadline);
  if ("closeError" in result) {
    cleanupErrors.push(result.closeError);
  } else {
    const { code, signal } = result;
    if (!failure && code !== 0) {
      failure = Object.assign(new Error(`${command} exited with ${signal ?? code}`), { code, signal });
    }
    // A command can close its own streams while leaving a descendant alive.
    terminateGroup("after-close");
  }
  if (failure) Object.assign(failure, { stdout, stderr, processGroupId: child.pid });
  if (cleanupErrors.length) {
    throw new AggregateError(
      [...(failure ? [failure] : []), ...cleanupErrors],
      `${command}: owned command cleanup failed`,
    );
  }
  if (failure) throw failure;
  return { stdout, stderr };
}

/** Collect every "./…"-relative string leaf in a (possibly nested) exports map. */
function collectExportTargets(node: unknown, out: string[] = []): string[] {
  if (typeof node === "string") {
    if (node.startsWith("./")) out.push(node);
  } else if (node && typeof node === "object") {
    for (const v of Object.values(node as Record<string, unknown>)) {
      collectExportTargets(v, out);
    }
  }
  return out;
}

describe("@full-stack-ds/react published consumption contract", () => {
  beforeAll(async () => {
    // Build the package exactly as it is published. The test asserts against the
    // resulting dist, so the build is part of what is being proven. `dist/` is
    // gitignored and CI does not build ds-react before `pnpm test`, so this must
    // be self-contained. Await the build without blocking worker reporting.
    await runOwnedCommand("pnpm", ["-F", "@full-stack-ds/react", "build"], {
      cwd: REPO_ROOT,
    });
  }, 120_000);

  it("A1: every exports-map / main / module / types target resolves to a real file", () => {
    const pkg = JSON.parse(readFileSync(PKG_JSON, "utf8")) as Record<
      string,
      unknown
    >;

    const targets = new Set<string>(collectExportTargets(pkg.exports));
    for (const key of ["main", "module", "types"] as const) {
      const v = pkg[key];
      if (typeof v === "string") targets.add(v);
    }

    // Sanity: the package actually declares the dual-format + styles surface.
    expect(targets.has("./dist/index.js")).toBe(true);
    expect(targets.has("./dist/index.cjs")).toBe(true);
    expect(targets.has("./dist/index.css")).toBe(true); // the ./styles.css export

    const missing = [...targets].filter(
      (rel) => !existsSync(resolve(PKG_DIR, rel)),
    );
    expect(missing, `unresolved exports targets: ${missing.join(", ")}`).toEqual(
      [],
    );
  });

  it("A2: the built dist entrypoint exports the documented component surface", async () => {
    // Import by RESOLVED PATH, not the package name — the vitest alias points
    // `@full-stack-ds/react` at src/, which would defeat the purpose.
    const distEntry = resolve(PKG_DIR, "dist", "index.js");
    const mod = (await import(/* @vite-ignore */ distEntry)) as Record<
      string,
      unknown
    >;

    // Components the showcase actually consumes from the package today.
    // Mirrors the chrome-coverage ratchet (src/consumption/chrome-coverage.test.ts):
    // every family statically adopted as app chrome must survive the published
    // dist export surface. Keep both lists in sync when a tier lands.
    const REQUIRED = [
      "Accordion",
      "AccordionContent",
      "AccordionItem",
      "AccordionTrigger",
      "Alert",
      "AlertNotice",
      "Avatar",
      "Badge",
      "Blockquote",
      "Breadcrumbs",
      "Button",
      "Card",
      "Checkbox",
      "Chip",
      "CodeSnippet",
      "Details",
      "Divider",
      "Icon",
      "Input",
      "Label",
      "Links",
      "List",
      "NavList",
      "NavListItem",
      "NavTree",
      "Popover",
      "Progress",
      "Select",
      "ShowMore",
      "Skeleton",
      "Spinner",
      "Stack",
      "Stat",
      "Status",
      "Switch",
      "Table",
      "TableBody",
      "TableCell",
      "TableHead",
      "TableHeaderCell",
      "TableRow",
      "Tabs",
      "TabsList",
      "TabsPanel",
      "TabsTab",
      "Toast",
      "Tooltip",
      "Truncate",
      "Calendar",
    ];
    const absent = REQUIRED.filter((name) => mod[name] == null);
    expect(absent, `missing exports from dist: ${absent.join(", ")}`).toEqual(
      [],
    );

    // A few are plain function components — prove they are callable React
    // components, not just truthy values.
    for (const name of ["Button", "Card", "Input", "Badge", "Stat"]) {
      expect(typeof mod[name], `${name} should be a function component`).toBe(
        "function",
      );
    }
  });

  it("A3: the aggregate styles.css carries the component selectors a consumer relies on", () => {
    const cssPath = resolve(PKG_DIR, "dist", "index.css");
    const css = readFileSync(cssPath, "utf8");

    // A real aggregate, not an empty/placeholder file.
    expect(css.length).toBeGreaterThan(10_000);

    // The CSS for the components the showcase mounts must be present in the
    // single published stylesheet (proves per-component CSS was aggregated).
    for (const selector of [
      ".button",
      ".card",
      ".input",
      ".tabs",
      ".badge",
      ".chip",
    ]) {
      expect(css, `styles.css missing ${selector}`).toContain(selector);
    }
  });
});

describe("owned package-build command lifecycle", () => {
  // Controlled waits fit inside each case's explicit budget, independently of
  // the root runner's functional-test default. Readiness and PIDs remain real.
  const CASE_TIMEOUT_MS = 5_000;
  const COMMAND_TIMEOUT_MS = 2_000;
  const CLOSE_TIMEOUT_MS = 500;
  const PID_OBSERVATION_TIMEOUT_MS = 500;
  const controlledCommand = 'process.stdout.write("build output"); process.stderr.write("build diagnostic");';
  const descendant = 'require("node:fs").writeFileSync(process.argv[1], "ready"); setInterval(() => {}, 1000);';
  const runningCommand = `
    const { spawn } = require("node:child_process");
    const fs = require("node:fs");
    const descendant = spawn(process.execPath, ["-e", ${JSON.stringify(descendant)}, process.argv[2]], { stdio: "ignore" });
    const ready = setInterval(() => {
      if (fs.existsSync(process.argv[2])) {
        fs.writeFileSync(process.argv[1], JSON.stringify([process.pid, descendant.pid]));
        clearInterval(ready);
      }
    }, 10);
    setInterval(() => {}, 1000);
  `;
  const isRunning = async (pid: number) => {
    try {
      const { stdout } = await execFileAsync("ps", ["-o", "stat=", "-p", String(pid)], { encoding: "utf8" });
      // A killed orphan can remain a zombie until its system reaper runs.
      return stdout.trim().length > 0 && !stdout.trim().startsWith("Z");
    } catch (error) {
      if ((error as { code?: string | number }).code === 1) return false;
      throw error;
    }
  };

  it("captures successful command diagnostics before resolving", async () => {
    await expect(runOwnedCommand(process.execPath, ["-e", controlledCommand], {
      cwd: REPO_ROOT,
      timeoutMs: COMMAND_TIMEOUT_MS,
      closeTimeoutMs: CLOSE_TIMEOUT_MS,
    })).resolves.toEqual({ stdout: "build output", stderr: "build diagnostic" });
  }, CASE_TIMEOUT_MS);

  it("preserves a nonzero command failure and both diagnostic streams", async () => {
    await expect(runOwnedCommand(process.execPath, ["-e", controlledCommand + "process.exit(7);"], {
      cwd: REPO_ROOT,
      timeoutMs: COMMAND_TIMEOUT_MS,
      closeTimeoutMs: CLOSE_TIMEOUT_MS,
    })).rejects.toMatchObject({ code: 7, stdout: "build output", stderr: "build diagnostic" });
  }, CASE_TIMEOUT_MS);

  it("stops a timed-out command and its descendant while preserving an independent sibling", async () => {
    const directory = mkdtempSync(join(tmpdir(), "fsds-package-command-"));
    const pids = join(directory, "pids.json");
    const ready = join(directory, "descendant-ready");
    const originalKill = process.kill.bind(process);
    let signaledGroup: number | undefined;
    const repeatedSignal = Object.assign(new Error("controlled repeated terminal signal denial"), { code: "EPERM" });
    const kill = vi.spyOn(process, "kill").mockImplementation((pid, signal) => {
      if (pid < 0 && signal === "SIGKILL") {
        // The first request really kills the fixture; only a repeated request is denied.
        if (signaledGroup === pid) throw repeatedSignal;
        const result = originalKill(pid, signal);
        signaledGroup = pid;
        return result;
      }
      return originalKill(pid, signal);
    });
    const sibling = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000);"], { stdio: "ignore" });
    const siblingClosed = new Promise<void>((resolve, reject) => {
      sibling.once("close", () => resolve());
      sibling.once("error", reject);
    });
    let fixtureStopped = false;
    onTestFinished(async () => {
      kill.mockRestore();
      try {
        // This independent cleanup also runs if an assertion or the test times out.
        if (!fixtureStopped && existsSync(pids)) {
          const [pid] = JSON.parse(readFileSync(pids, "utf8")) as number[];
          try {
            process.kill(-pid, "SIGKILL");
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
          }
        }
      } finally {
        sibling.kill("SIGKILL");
        await siblingClosed;
        rmSync(directory, { recursive: true, force: true });
      }
    });
    await expect(runOwnedCommand(process.execPath, ["-e", runningCommand, pids, ready], {
      cwd: REPO_ROOT,
      timeoutMs: COMMAND_TIMEOUT_MS,
      closeTimeoutMs: CLOSE_TIMEOUT_MS,
    })).rejects.toMatchObject({ code: "COMMAND_TIMEOUT" });
    expect(existsSync(ready)).toBe(true);
    const ownedPids = JSON.parse(readFileSync(pids, "utf8")) as number[];
    expect(ownedPids).toHaveLength(2);
    expect(kill.mock.calls).toEqual([[-ownedPids[0], "SIGKILL"]]);
    for (const pid of ownedPids) {
      await expect.poll(() => isRunning(pid), { timeout: PID_OBSERVATION_TIMEOUT_MS }).toBe(false);
    }
    expect(sibling.pid).toBeDefined();
    expect(await isRunning(sibling.pid!)).toBe(true);
    fixtureStopped = true;
  }, CASE_TIMEOUT_MS);

  it("reports a denied group termination and bounded missing-close failure before independently reaping its fixture", async () => {
    const directory = mkdtempSync(join(tmpdir(), "fsds-package-denial-"));
    const pids = join(directory, "pids.json");
    const ready = join(directory, "descendant-ready");
    const originalKill = process.kill.bind(process);
    const denial = Object.assign(new Error("controlled transient group denial"), { code: "EPERM" });
    let deniedGroup: number | undefined;
    const kill = vi.spyOn(process, "kill").mockImplementation((pid, signal) => {
      if (pid < 0 && signal === "SIGKILL") {
        deniedGroup = pid;
        throw denial;
      }
      return originalKill(pid, signal);
    });
    let fixtureReaped = false;
    const reapFixture = async () => {
      if (fixtureReaped) return;
      kill.mockRestore();
      try {
        const ownedPids = existsSync(pids)
          ? JSON.parse(readFileSync(pids, "utf8")) as number[]
          : [];
        const group = deniedGroup ?? (ownedPids.length ? -ownedPids[0] : undefined);
        if (group !== undefined) {
          try {
            originalKill(group, "SIGKILL");
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
          }
        }
        for (const pid of ownedPids) {
          await expect.poll(() => isRunning(pid), { timeout: PID_OBSERVATION_TIMEOUT_MS }).toBe(false);
        }
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
      fixtureReaped = true;
    };
    onTestFinished(reapFixture);
    try {
      const error = await runOwnedCommand(process.execPath, ["-e", runningCommand, pids, ready], {
        cwd: REPO_ROOT,
        timeoutMs: COMMAND_TIMEOUT_MS,
        closeTimeoutMs: CLOSE_TIMEOUT_MS,
      }).catch((error: unknown) => error);
      expect(error).toBeInstanceOf(AggregateError);
      const failures = (error as AggregateError).errors;
      expect(failures[0]).toMatchObject({ code: "COMMAND_TIMEOUT" });
      expect(failures).toContain(denial);
      expect(failures).toContainEqual(expect.objectContaining({ code: "COMMAND_CLOSE_TIMEOUT" }));
      expect(existsSync(ready)).toBe(true);
      const ownedPids = JSON.parse(readFileSync(pids, "utf8")) as number[];
      expect(ownedPids).toHaveLength(2);
      expect(deniedGroup).toBe(-ownedPids[0]);
      expect(denial).toMatchObject({ cleanupPhase: "watchdog", processGroupId: ownedPids[0] });
      for (const pid of ownedPids) expect(await isRunning(pid)).toBe(true);
    } finally {
      await reapFixture();
    }
  }, CASE_TIMEOUT_MS);

  it("preserves the primary command failure when owned cleanup also reports an error", async () => {
    const originalKill = process.kill.bind(process);
    const cleanupFailure = new Error("controlled cleanup failure");
    const kill = vi.spyOn(process, "kill").mockImplementation((pid, signal) => {
      try {
        originalKill(pid, signal);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
      }
      throw cleanupFailure;
    });
    try {
      const error = await runOwnedCommand(process.execPath, ["-e", controlledCommand + "process.exit(7);"], {
        cwd: REPO_ROOT,
        timeoutMs: COMMAND_TIMEOUT_MS,
        closeTimeoutMs: CLOSE_TIMEOUT_MS,
      }).catch((error: unknown) => error);
      expect(error).toBeInstanceOf(AggregateError);
      const failures = (error as AggregateError).errors;
      expect(failures[0]).toMatchObject({ code: 7, stdout: "build output", stderr: "build diagnostic" });
      expect(failures).toContain(cleanupFailure);
      expect(cleanupFailure).toMatchObject({ cleanupPhase: "after-close", processGroupId: expect.any(Number) });
      expect(kill).toHaveBeenCalledWith(expect.any(Number), "SIGKILL");
      expect(kill.mock.calls.every(([pid]) => pid < 0)).toBe(true);
    } finally {
      kill.mockRestore();
    }
  }, CASE_TIMEOUT_MS);
});
