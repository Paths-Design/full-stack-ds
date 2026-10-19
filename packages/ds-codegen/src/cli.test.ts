// In-process CLI main-path suites. cli.ts runs main() at module top level,
// so importing the module WITH a stubbed process.argv IS the invocation —
// process.exit is mocked to throw PROCESS_EXIT so error branches assert
// via the rejection instead of killing the test runner. The suite runs
// from the repo root (the codegen cwd contract), against the real
// contracts corpus; generation paths use --dry-run so nothing is written.
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mergeBoxModelDefaults } from "./box-model.js";
import type { ComponentContract, TokenResolution } from "./contract.js";
import type { FrameworkEmitter, TargetId } from "./emitter.js";
import type { RegistryOptions, TargetRegistry } from "./registry.js";

// Every case resets the module registry and re-imports cli.ts against the real
// contracts corpus, so the import graph is rebuilt per test rather than shared:
// ~2.6s for the file alone, ~12.5s under the root suite's 244-file parallel
// load. Individual cases overrun vitest's 5s default there, so the budget is
// raised for this file only — the re-import is what makes the module-level
// main() observable and cannot be amortised away.
vi.setConfig({ testTimeout: 20000 });

const PROCESS_EXIT = "PROCESS_EXIT";

function prepare(args: string[]) {
  vi.resetModules();
  vi.spyOn(process, "argv", "get").mockReturnValue(["node", "cli.js", ...args]);
  const exit = vi
    .spyOn(process, "exit")
    .mockImplementation((() => {
      throw new Error(PROCESS_EXIT);
    }) as never);
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  return { exit, log };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cli main — incompatible flag guards", () => {
  const cases: { args: string[]; message: string }[] = [
    { args: ["--watch", "--validate"], message: "--watch is incompatible with --validate." },
    { args: ["--watch", "--dry-run"], message: "--watch is incompatible with --dry-run." },
    { args: ["--watch", "--migrate"], message: "--watch is incompatible with --migrate." },
    { args: ["--prune", "--watch"], message: "--prune is incompatible with --watch." },
    { args: ["--prune", "--tests-only"], message: "--prune is incompatible with --tests-only." },
    {
      args: ["--prune", "Button"],
      message: "--prune refuses to run with a name filter",
    },
    {
      args: ["--prune", "--target=react"],
      message: "--prune refuses to run with --target=react",
    },
  ];

  for (const c of cases) {
    it(`exits 1 for ${c.args.join(" ")}`, async () => {
      const { exit } = prepare(c.args);
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      await expect(import("./cli.js")).rejects.toThrow(PROCESS_EXIT);
      expect(exit).toHaveBeenCalledWith(1);
      expect(
        errSpy.mock.calls.some((call) => String(call[0]).includes(c.message)),
      ).toBe(true);
    });
  }

  it("exits 1 for an unknown --prune value", async () => {
    const { exit } = prepare(["--prune=bogus"]);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(import("./cli.js")).rejects.toThrow(PROCESS_EXIT);
    expect(exit).toHaveBeenCalledWith(1);
    expect(
      errSpy.mock.calls.some((call) =>
        String(call[0]).includes('Unknown --prune value "bogus"'),
      ),
    ).toBe(true);
  });

  it("exits 1 for an unknown target id", async () => {
    const { exit } = prepare(["--dry-run", "--target=not-a-real-target", "Button"]);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(import("./cli.js")).rejects.toThrow(PROCESS_EXIT);
    expect(exit).toHaveBeenCalledWith(1);
    void errSpy;
  });
});

describe("cli main — happy paths", () => {
  it("runs shape validation for a single component and exits 0", async () => {
    const { exit, log } = prepare(["--validate", "Button"]);
    await expect(import("./cli.js")).rejects.toThrow(PROCESS_EXIT);
    expect(exit).toHaveBeenCalledWith(0);
    expect(
      log.mock.calls.some((call) => String(call[0]).includes("Found 1 component contract")),
    ).toBe(true);
    expect(
      log.mock.calls.some((call) => String(call[0]).includes("VALID")),
    ).toBe(true);
  });

  it("runs semantic checks with shape validation and exits 0", async () => {
    const { exit, log } = prepare([
      "--validate",
      "--check-semantics",
      "Button",
    ]);
    await expect(import("./cli.js")).rejects.toThrow(PROCESS_EXIT);
    expect(exit).toHaveBeenCalledWith(0);
    expect(
      log.mock.calls.some((call) => String(call[0]).includes("Found 1 component contract")),
    ).toBe(true);
  });

  it("runs usage validation over the full corpus and exits 0", async () => {
    const { exit, log } = prepare(["--validate", "--check-usage"]);
    await expect(import("./cli.js")).rejects.toThrow(PROCESS_EXIT);
    expect(exit).toHaveBeenCalledWith(0);
    expect(
      log.mock.calls.some((call) => String(call[0]).includes("Usage validation")),
    ).toBe(true);
  });

  it("name-filtered usage validation over-reports cross-component refs (registry-blind)", async () => {
    // runUsageValidation builds its contract registry from the FILTERED
    // valid set, so a filtered run cannot resolve fsds.Icon from Button's
    // usage sidecar. This pins the honest current semantics: filtered
    // --check-usage exits 1 and names the unresolvable ref.
    const { exit } = prepare(["--validate", "--check-usage", "Button"]);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(import("./cli.js")).rejects.toThrow(PROCESS_EXIT);
    expect(exit).toHaveBeenCalledWith(1);
    expect(
      errSpy.mock.calls.some((call) => String(call[0]).includes("INVALID")),
    ).toBe(true);
  });

  it("dry-runs react generation for a single component without writing", async () => {
    const { exit, log } = prepare(["--dry-run", "--target=react", "Button"]);
    await import("./cli.js");
    expect(exit).not.toHaveBeenCalled();
    expect(
      log.mock.calls.some((call) => String(call[0]).includes("Found 1 component contract")),
    ).toBe(true);
  });

  it("dry-runs react generation with --force", async () => {
    const { exit } = prepare(["--dry-run", "--force", "--target=react", "Button"]);
    await import("./cli.js");
    expect(exit).not.toHaveBeenCalled();
  });

  it("filters multiple names down to the matching contracts", async () => {
    const { exit, log } = prepare(["--dry-run", "--target=react", "Button", "Dialog"]);
    await import("./cli.js");
    expect(exit).not.toHaveBeenCalled();
    expect(
      log.mock.calls.some((call) => String(call[0]).includes("Found 2 component contract")),
    ).toBe(true);
  });

  it("dry-runs the migrate path for a single component", async () => {
    const { exit } = prepare(["--dry-run", "--migrate", "--target=react", "Button"]);
    await import("./cli.js");
    expect(exit).not.toHaveBeenCalled();
  });
});

type EmitterEvent = {
  kind: "admit" | "emit";
  target: TargetId;
  component: string;
  admitted?: boolean;
};

/**
 * prepare() plus a registry whose every emitter is replaced by a child
 * object that records admitContract and emitComponent calls in order. The
 * recording admitContract stands in for any real target hook, so these
 * cases pin the CLI seam (what is passed, when, and how a throw surfaces),
 * not any target's support boundary. `refuse` names a component whose
 * admission throws.
 */
function prepareWithAdmissionRecorder(args: string[], refuse?: string) {
  const handles = prepare(args);
  const events: EmitterEvent[] = [];
  const contracts = new Map<string, ComponentContract>();
  vi.doMock("./registry.js", async (importOriginal) => {
    const actual = await importOriginal<{
      createDefaultRegistry: (opts: RegistryOptions) => TargetRegistry;
    }>();
    return {
      ...actual,
      createDefaultRegistry: (opts: RegistryOptions): TargetRegistry => {
        const registry = actual.createDefaultRegistry(opts);
        return {
          ...registry,
          get: (id: TargetId) => {
            const binding = registry.get(id);
            const base = binding.emitter;
            const emitter: FrameworkEmitter = Object.create(base);
            emitter.admitContract = (contract, context) => {
              events.push({
                kind: "admit",
                target: id,
                component: contract.name,
                admitted: context.admitted,
              });
              contracts.set(`${id}:${contract.name}`, contract);
              if (contract.name === refuse) {
                throw new Error(`ADMISSION_REFUSED: ${id} refuses ${contract.name}`);
              }
            };
            emitter.emitComponent = (ir, emitOpts) => {
              events.push({ kind: "emit", target: id, component: ir.name });
              return base.emitComponent(ir, emitOpts);
            };
            return { ...binding, emitter };
          },
        };
      },
    };
  });
  return { ...handles, events, contracts };
}

function readComponentJson(name: string, file: string): unknown {
  return JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "packages", "ds-contracts", "components", name, file),
      "utf-8",
    ),
  );
}

describe("cli main — emitter admitContract seam", () => {
  afterEach(() => {
    vi.doUnmock("./registry.js");
  });

  it("passes the sidecar-merged contract with admitted=true on an allowlist-free target, before emit", async () => {
    const { exit, events, contracts } = prepareWithAdmissionRecorder([
      "--dry-run",
      "--target=react",
      "Button",
    ]);
    await import("./cli.js");
    expect(exit).not.toHaveBeenCalled();
    expect(events).toEqual([
      { kind: "admit", target: "react", component: "Button", admitted: true },
      { kind: "emit", target: "react", component: "Button" },
    ]);

    // The on-disk Button contract carries no tokens/styles of its own, so
    // both fields reaching the hook prove the CLI merged the sidecars.
    const raw = readComponentJson("Button", "Button.contract.json") as ComponentContract;
    expect(raw.tokens).toBeUndefined();
    expect(raw.styles).toBeUndefined();

    const admittedContract = contracts.get("react:Button")!;
    expect(admittedContract.styles).toEqual(
      readComponentJson("Button", "Button.styles.json"),
    );
    // tokens are the box-model-default merge the generate path lowers from,
    // with the authored sidecar winning on every slot it sets.
    expect(admittedContract.tokens).toEqual(
      mergeBoxModelDefaults(
        readComponentJson("Button", "Button.tokens.json") as Record<string, TokenResolution>,
        undefined,
        raw.morphology,
      ),
    );
  });

  it("passes admitted=false for an explicit request outside the target's allowlist", async () => {
    const { events } = prepareWithAdmissionRecorder([
      "--dry-run",
      "--target=unity",
      "Button",
    ]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Unity's own emitter may reject Button after admission; this case pins
    // only the admission context, which is recorded before any emit.
    await import("./cli.js").catch(() => undefined);
    expect(events[0]).toEqual({
      kind: "admit",
      target: "unity",
      component: "Button",
      admitted: false,
    });
  });

  it("passes admitted=true for an explicit request inside the target's allowlist", async () => {
    const { exit, events } = prepareWithAdmissionRecorder([
      "--dry-run",
      "--target=unity",
      "Switch",
    ]);
    await import("./cli.js");
    expect(exit).not.toHaveBeenCalled();
    expect(events).toEqual([
      { kind: "admit", target: "unity", component: "Switch", admitted: true },
      { kind: "emit", target: "unity", component: "Switch" },
    ]);
  });

  it("admits exactly the allowlisted components, each admitted=true, on a full-corpus run", async () => {
    const { exit, events } = prepareWithAdmissionRecorder(["--dry-run", "--target=unity"]);
    await import("./cli.js");
    expect(exit).not.toHaveBeenCalled();
    const admits = events.filter((e) => e.kind === "admit");
    expect(admits.map((e) => e.component).sort()).toEqual([
      "Accordion",
      "Popover",
      "Switch",
      "Tabs",
    ]);
    expect(admits.every((e) => e.admitted === true)).toBe(true);
  });

  it("a dry-run refusal propagates its error and stops generation before the refused component emits", async () => {
    const { exit, log, events } = prepareWithAdmissionRecorder(
      ["--dry-run", "--target=react", "Badge", "Button", "Card"],
      "Button",
    );
    await expect(import("./cli.js")).rejects.toThrow(
      "ADMISSION_REFUSED: react refuses Button",
    );
    // A refusal is a thrown generation failure, not a handled exit.
    expect(exit).not.toHaveBeenCalled();
    // Badge is admitted and emitted; Button is admitted then refused before
    // emit; Card is never reached.
    expect(events.map((e) => `${e.kind}:${e.component}`)).toEqual([
      "admit:Badge",
      "emit:Badge",
      "admit:Button",
    ]);
    const lines = log.mock.calls.map((call) => String(call[0]));
    expect(lines.some((l) => l.includes("DRY RUN  Badge"))).toBe(true);
    expect(lines.some((l) => l.includes("DRY RUN  Button"))).toBe(false);
    expect(lines.some((l) => l.startsWith("\nDone."))).toBe(false);
  });
});
