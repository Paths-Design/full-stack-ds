// In-process CLI main-path suites. cli.ts runs main() at module top level,
// so importing the module WITH a stubbed process.argv IS the invocation —
// process.exit is mocked to throw PROCESS_EXIT so error branches assert
// via the rejection instead of killing the test runner. The eight argument-only
// guards replace post-guard pipeline boundaries with hostile spies. Other cases
// use the real contracts corpus from the repo root (the codegen cwd contract);
// generation uses --dry-run or isolated temporary package roots.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
// Acquire the real generator dependency graph during fixture collection. These
// libraries declare emitters/validators; they do not invoke the CLI entrypoint.
// Every case still resets and imports cli.ts with its own arguments and bindings.
import "./registry.js";
import "./validation/component-token-consumption.js";
import { mergeBoxModelDefaults } from "./box-model.js";
import type { ComponentContract, TokenResolution } from "./contract.js";
import type { FrameworkEmitter, TargetId } from "./emitter.js";
import type { RegistryOptions, TargetBinding, TargetRegistry } from "./registry.js";
import { ADMITTED_FRAMEWORKS } from "./validation/admission-descriptor.js";

// Every invocation resets the module registry and re-imports the real cli.ts,
// making its module-level main() observable with fresh arguments and bindings.
// Guard-only cases exclude the unused emitter/validation graph; corpus and
// generation cases retain it. The import and invocation share this finite budget.
vi.setConfig({ testTimeout: 20000 });

const PROCESS_EXIT = "PROCESS_EXIT";
const EXPIRED_INVOCATION = "CLI import completed after teardown began; refusing to resume the expired invocation.";
const pendingCliInvocations = new Map<Promise<unknown>, { expired: boolean }>();

function invokeCli() {
  const lifecycle = { expired: false };
  const assertLive = () => {
    if (lifecycle.expired) throw new Error(EXPIRED_INVOCATION);
  };
  const invocation = import("./cli.js").then(
    (module) => { assertLive(); return module; },
    (error: unknown) => { assertLive(); throw error; },
  );
  pendingCliInvocations.set(invocation, lifecycle);
  void invocation.then(
    () => pendingCliInvocations.delete(invocation),
    () => pendingCliInvocations.delete(invocation),
  );
  return invocation;
}

async function settleCliInvocations(expire = false) {
  if (expire) for (const lifecycle of pendingCliInvocations.values()) lifecycle.expired = true;
  while (pendingCliInvocations.size > 0) {
    await Promise.allSettled([...pendingCliInvocations.keys()]);
  }
}

function prepare(args: string[]) {
  if (pendingCliInvocations.size > 0) {
    throw new Error("A previous CLI import is still pending; refusing to replace its arguments or bindings.");
  }
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

afterEach(async () => {
  // A timed-out test does not cancel import(). Retain its argv/exit mocks until
  // top-level main() finishes, and refuse a later prepare() while it is pending.
  await settleCliInvocations(true);
  vi.restoreAllMocks();
});

function prepareGuard(args: string[]) {
  const handles = prepare(args);
  const pipeline = vi.fn(() => {
    throw new Error("An argument-only guard reached the generation pipeline.");
  });
  vi.doMock("./registry.js", () => ({ createDefaultRegistry: pipeline }));
  vi.doMock("./validate.js", () => ({ createContractValidator: pipeline, formatIssues: pipeline }));
  vi.doMock("./contracts-fs.js", () => ({
    findComponentStyles: pipeline,
    findComponentTokens: pipeline,
    findComponentUsage: pipeline,
    listComponentContracts: pipeline,
  }));
  vi.doMock("./validation/component-token-consumption.js", () => ({ validateComponentTokenConsumption: pipeline }));
  return { ...handles, pipeline };
}

describe("cli invocation fixture", () => {
  it("retains an unfinished import's arguments until it settles and refuses the next invocation", async () => {
    prepare(["--watch", "--validate"]);
    let finishImport!: (module: Record<string, never>) => void;
    const moduleReady = new Promise<Record<string, never>>((resolve) => { finishImport = resolve; });
    vi.doMock("./cli.js", () => moduleReady);
    const invocation = invokeCli();
    let settled = false;
    const teardown = settleCliInvocations().then(() => { settled = true; });
    try {
      expect(() => prepare(["--dry-run", "Button"])).toThrow("A previous CLI import is still pending");
      expect(process.argv).toEqual(["node", "cli.js", "--watch", "--validate"]);
      await Promise.resolve();
      expect(settled).toBe(false);
      finishImport({});
      await invocation;
      await teardown;
      expect(settled).toBe(true);
      expect(() => prepare(["--dry-run", "Button"])).not.toThrow();
      expect(process.argv).toEqual(["node", "cli.js", "--dry-run", "Button"]);
    } finally {
      finishImport({});
      await Promise.allSettled([invocation, teardown]);
      vi.doUnmock("./cli.js");
    }
  });

  it.each(["fulfilled", "rejected"] as const)("waits for an expired %s import without resuming its test's later CLI work", async (outcome) => {
    prepare(["--watch", "--validate"]);
    let finishImport!: (module: Record<string, never>) => void;
    let failImport!: (error: Error) => void;
    const moduleReady = new Promise<Record<string, never>>((resolve, reject) => {
      finishImport = resolve;
      failImport = reject;
    });
    const underlyingOutcome = outcome === "rejected"
      ? expect(moduleReady).rejects.toThrow(PROCESS_EXIT)
      : expect(moduleReady).resolves.toEqual({});
    vi.doMock("./cli.js", () => moduleReady);
    const invocation = invokeCli();
    let continued = false;
    const continuation = invocation.then(() => { continued = true; }, () => undefined);
    let settled = false;
    const teardown = settleCliInvocations(true).then(() => { settled = true; });
    try {
      expect(() => prepare(["--dry-run", "Button"])).toThrow("A previous CLI import is still pending");
      expect(process.argv).toEqual(["node", "cli.js", "--watch", "--validate"]);
      await Promise.resolve();
      expect(settled).toBe(false);
      if (outcome === "rejected") failImport(new Error(PROCESS_EXIT));
      else finishImport({});
      await expect(invocation).rejects.toThrow(EXPIRED_INVOCATION);
      await underlyingOutcome;
      await teardown;
      await continuation;
      expect(settled).toBe(true);
      expect(continued).toBe(false);
    } finally {
      finishImport({});
      await Promise.allSettled([invocation, teardown, continuation, underlyingOutcome]);
      vi.doUnmock("./cli.js");
    }
  });
});

describe("cli main — incompatible flag guards", () => {
  afterEach(async () => {
    await settleCliInvocations(true);
    vi.doUnmock("./registry.js");
    vi.doUnmock("./validate.js");
    vi.doUnmock("./contracts-fs.js");
    vi.doUnmock("./validation/component-token-consumption.js");
  });
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
      const { exit, log, pipeline } = prepareGuard(c.args);
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      await expect(invokeCli()).rejects.toThrow(PROCESS_EXIT);
      expect(exit).toHaveBeenCalledWith(1);
      expect(
        errSpy.mock.calls.some((call) => String(call[0]).includes(c.message)),
      ).toBe(true);
      expect(pipeline).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    });
  }

  it("exits 1 for an unknown --prune value", async () => {
    const { exit, log, pipeline } = prepareGuard(["--prune=bogus"]);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(invokeCli()).rejects.toThrow(PROCESS_EXIT);
    expect(exit).toHaveBeenCalledWith(1);
    expect(
      errSpy.mock.calls.some((call) =>
        String(call[0]).includes('Unknown --prune value "bogus"'),
      ),
    ).toBe(true);
    expect(pipeline).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it("exits 1 for an unknown target id", async () => {
    const { exit } = prepare(["--dry-run", "--target=not-a-real-target", "Button"]);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(invokeCli()).rejects.toThrow(PROCESS_EXIT);
    expect(exit).toHaveBeenCalledWith(1);
    void errSpy;
  });
});

describe("cli main — happy paths", () => {
  it("runs shape validation for a single component and exits 0", async () => {
    const { exit, log } = prepare(["--validate", "Button"]);
    await expect(invokeCli()).rejects.toThrow(PROCESS_EXIT);
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
    await expect(invokeCli()).rejects.toThrow(PROCESS_EXIT);
    expect(exit).toHaveBeenCalledWith(0);
    expect(
      log.mock.calls.some((call) => String(call[0]).includes("Found 1 component contract")),
    ).toBe(true);
  });

  it("runs usage validation over the full corpus and exits 0", async () => {
    const { exit, log } = prepare(["--validate", "--check-usage"]);
    await expect(invokeCli()).rejects.toThrow(PROCESS_EXIT);
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
    await expect(invokeCli()).rejects.toThrow(PROCESS_EXIT);
    expect(exit).toHaveBeenCalledWith(1);
    expect(
      errSpy.mock.calls.some((call) => String(call[0]).includes("INVALID")),
    ).toBe(true);
  });

  it("dry-runs react generation for a single component without writing", async () => {
    const { exit, log } = prepare(["--dry-run", "--target=react", "Button"]);
    await invokeCli();
    expect(exit).not.toHaveBeenCalled();
    expect(
      log.mock.calls.some((call) => String(call[0]).includes("Found 1 component contract")),
    ).toBe(true);
  });

  it("dry-runs react generation with --force", async () => {
    const { exit } = prepare(["--dry-run", "--force", "--target=react", "Button"]);
    await invokeCli();
    expect(exit).not.toHaveBeenCalled();
  });

  it("filters multiple names down to the matching contracts", async () => {
    const { exit, log } = prepare(["--dry-run", "--target=react", "Button", "Dialog"]);
    await invokeCli();
    expect(exit).not.toHaveBeenCalled();
    expect(
      log.mock.calls.some((call) => String(call[0]).includes("Found 2 component contract")),
    ).toBe(true);
  });

  it("dry-runs the migrate path for a single component", async () => {
    const { exit } = prepare(["--dry-run", "--migrate", "--target=react", "Button"]);
    await invokeCli();
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
  afterEach(async () => {
    await settleCliInvocations(true);
    vi.doUnmock("./registry.js");
  });

  it("passes the sidecar-merged contract with admitted=true on an allowlist-free target, before emit", async () => {
    const { exit, events, contracts } = prepareWithAdmissionRecorder([
      "--dry-run",
      "--target=react",
      "Button",
    ]);
    await invokeCli();
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
    // Choose a registered target whose current allowlist excludes Pagination;
    // the engine targets admit the whole corpus.
    const { events } = prepareWithAdmissionRecorder([
      "--dry-run",
      "--target=jetpack-compose",
      "Pagination",
    ]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    // The emitter may reject Pagination; this case pins only the admission context,
    // which is recorded before any emit.
    await invokeCli().catch(() => undefined);
    expect(events[0]).toEqual({
      kind: "admit",
      target: "jetpack-compose",
      component: "Pagination",
      admitted: false,
    });
  });

  it("passes admitted=true for an explicit request inside the target's allowlist", async () => {
    const { exit, events } = prepareWithAdmissionRecorder([
      "--dry-run",
      "--target=unity",
      "Switch",
    ]);
    await invokeCli();
    expect(exit).not.toHaveBeenCalled();
    expect(events).toEqual([
      { kind: "admit", target: "unity", component: "Switch", admitted: true },
      { kind: "emit", target: "unity", component: "Switch" },
    ]);
  });

  it("admits exactly the allowlisted components, each admitted=true, on a full-corpus run", async () => {
    const { exit, events } = prepareWithAdmissionRecorder(["--dry-run", "--target=unity"]);
    await invokeCli();
    expect(exit).not.toHaveBeenCalled();
    const admits = events.filter((e) => e.kind === "admit");
    expect(admits.map((e) => e.component).sort()).toEqual([
      "Accordion",
      "Alert",
      "AlertNotice",
      "Avatar",
      "Badge",
      "Blockquote",
      "Breadcrumbs",
      "Button",
      "Calendar",
      "Card",
      "Carousel",
      "Checkbox",
      "Chip",
      "CodeBlock",
      "CodeSnippet",
      "Command",
      "Details",
      "Dialog",
      "Divider",
      "Field",
      "Icon",
      "Image",
      "Input",
      "Label",
      "Links",
      "List",
      "Markdown",
      "NavList",
      "NavTree",
      "OTP",
      "PageNavigator",
      "Pagination",
      "Popover",
      "Postcard",
      "ProfileFlag",
      "Progress",
      "RadioGroup",
      "Select",
      "Sheet",
      "ShowMore",
      "Shuttle",
      "Skeleton",
      "Spinner",
      "Stat",
      "Status",
      "Switch",
      "Table",
      "Tabs",
      "Text",
      "TextField",
      "Toast",
      "ToggleSwitch",
      "Tooltip",
      "Truncate",
      "Walkthrough",
    ]);
    expect(admits.every((e) => e.admitted === true)).toBe(true);
  });

  it("a dry-run refusal propagates its error and stops generation before the refused component emits", async () => {
    const { exit, log, events } = prepareWithAdmissionRecorder(
      ["--dry-run", "--target=react", "Badge", "Button", "Calendar", "Card"],
      "Button",
    );
    await expect(invokeCli()).rejects.toThrow(
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

type AssetCall = { target: TargetId; components: string[]; afterEmits: number };

/**
 * prepare() plus a registry whose emitters count emitComponent calls and
 * replace emitTargetAssets with a recorder returning `assets()` (re-read per
 * call, so a second run can emit a different set). `binding` rewrites the
 * binding (a temp package root, a rail framework id), `available` narrows the
 * executable set so `--target=all` stays one target, and `manifestPath`
 * redirects the emission manifest. The recorder stands in for any target's
 * assets: these cases pin the CLI seam (when it runs, over what, where files
 * land, what the manifest and prune pass record), not Unity's stylesheet.
 */
function prepareWithAssetRecorder(
  args: string[],
  options: {
    assets: () => { relativePath: string; contents: string }[];
    binding?: (binding: TargetBinding) => TargetBinding;
    available?: TargetId[];
    manifestPath?: string;
  },
) {
  const handles = prepare(args);
  const calls: AssetCall[] = [];
  let emits = 0;
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
          available: () => options.available ?? registry.available(),
          get: (id: TargetId) => {
            const binding = registry.get(id);
            const base = binding.emitter;
            const emitter: FrameworkEmitter = Object.create(base);
            emitter.emitComponent = (ir, emitOpts) => {
              emits += 1;
              return base.emitComponent(ir, emitOpts);
            };
            emitter.emitTargetAssets = (irs) => {
              calls.push({ target: id, components: irs.map((ir) => ir.name), afterEmits: emits });
              return options.assets();
            };
            const rebound = { ...binding, emitter };
            return options.binding ? options.binding(rebound) : rebound;
          },
        };
      },
    };
  });
  if (options.manifestPath) {
    const manifestPath = options.manifestPath;
    vi.doMock("./validation/emission-manifest-path.js", () => ({
      EMISSION_MANIFEST_RELATIVE_PATH: path.relative(process.cwd(), manifestPath),
      emissionManifestAbsolutePath: () => manifestPath,
    }));
  }
  return { ...handles, calls };
}

const sha256 = (bytes: string | Buffer) => crypto.createHash("sha256").update(bytes).digest("hex");

describe("cli main — emitter emitTargetAssets seam", () => {
  const scratch: string[] = [];
  /** A temp package root inside the gitignored repo tmp/, so manifest paths stay workspace-relative. */
  const tempPackage = () => {
    fs.mkdirSync(path.join(process.cwd(), "tmp"), { recursive: true });
    const dir = fs.mkdtempSync(path.join(process.cwd(), "tmp", "cli-asset-seam-"));
    scratch.push(dir);
    return dir;
  };
  const unmock = () => {
    vi.doUnmock("./registry.js");
    vi.doUnmock("./validation/emission-manifest-path.js");
  };
  afterEach(async () => {
    await settleCliInvocations(true);
    unmock();
    for (const dir of scratch.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
  });

  it("runs once per target after every admitted component, in allowlist order, and only previews under --dry-run", async () => {
    const sentinel = "Runtime/Resources/cli-seam-sentinel.txt";
    const { exit, log, calls } = prepareWithAssetRecorder(["--dry-run", "--target=unity"], {
      assets: () => [{ relativePath: sentinel, contents: "sentinel\n" }],
    });
    await invokeCli();
    expect(exit).not.toHaveBeenCalled();
    // fsds.targets.json lists the unity allowlist in this order; the corpus loads alphabetically.
    expect(calls).toEqual([{ target: "unity", components: ["Switch", "Accordion", "Popover", "Tabs", "Text", "Divider", "Icon", "Button", "Checkbox", "ToggleSwitch", "Blockquote", "Stat", "ProfileFlag", "Badge", "List", "Alert", "AlertNotice", "Label", "Breadcrumbs", "Tooltip", "Status", "Card", "NavList", "Skeleton", "Table", "CodeBlock", "Details", "Progress", "Chip", "CodeSnippet", "Dialog", "Sheet", "Input", "TextField", "Toast", "Field", "Walkthrough", "Links", "Image", "Avatar", "NavTree", "Postcard", "Pagination", "OTP", "RadioGroup", "Select", "Shuttle", "ShowMore", "Truncate", "PageNavigator", "Carousel", "Calendar", "Command", "Spinner", "Markdown"], afterEmits: 55 }]);
    const lines = log.mock.calls.map((call) => String(call[0]));
    // Resolved against the package root: the components root minus the pack's Runtime/Components.
    expect(lines).toContain("  DRY RUN  target assets (unity)");
    expect(lines).toContain(`    → packages/ds-unity/${sentinel}`);
    expect(fs.existsSync(path.join(process.cwd(), "packages/ds-unity", sentinel))).toBe(false);
  }, 120_000);

  it("skips it on a name-filtered run, which would replace the full asset with one built from the subset", async () => {
    const { exit, log, calls } = prepareWithAssetRecorder(["--dry-run", "--target=unity", "Switch"], {
      assets: () => [{ relativePath: "never.txt", contents: "" }],
    });
    await invokeCli();
    expect(exit).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
    expect(log.mock.calls.some((call) => String(call[0]).startsWith("  TARGET ASSETS skipped for unity"))).toBe(true);
  }, 180_000);

  it("refuses an asset path that escapes the package root", async () => {
    prepareWithAssetRecorder(["--dry-run", "--target=unity"], {
      assets: () => [{ relativePath: "../outside.txt", contents: "" }],
    });
    await expect(invokeCli()).rejects.toThrow('Target unity: target asset path "../outside.txt" escapes the package root packages/ds-unity.');
  }, 180_000);

  it("refuses to guess a package root the binding's components root does not end in", async () => {
    const root = tempPackage();
    prepareWithAssetRecorder(["--dry-run", "--target=unity"], {
      assets: () => [{ relativePath: "a.txt", contents: "" }],
      binding: (binding) => ({ ...binding, componentsRoot: path.join(root, "Elsewhere") }),
    });
    await expect(invokeCli()).rejects.toThrow('does not end with the target pack\'s outputs.componentsRoot "Runtime/Components"');
  }, 180_000);

  it("writes the assets under the package root and records them for a rail target, bound to the target registry", async () => {
    const root = tempPackage();
    const manifestPath = path.join(root, "manifest.json");
    const { exit } = prepareWithAssetRecorder(["--target=unity"], {
      assets: () => [
        { relativePath: "Runtime/Resources/Sheet.txt", contents: "sheet\n" },
        { relativePath: "Runtime/Resources/Sheet.ledger.json", contents: "{}\n" },
      ],
      // A rail framework id puts the target's groups in the manifest; the real
      // unity binding has none, so this drives the rail branch of the seam.
      binding: (binding) => ({ ...binding, componentsRoot: path.join(root, "Runtime", "Components"), railFrameworkId: "react" }),
      manifestPath,
    });
    await invokeCli();
    expect(exit).not.toHaveBeenCalled();
    expect(fs.readFileSync(path.join(root, "Runtime/Resources/Sheet.txt"), "utf8")).toBe("sheet\n");
    expect(fs.readFileSync(path.join(root, "Runtime/Resources/Sheet.ledger.json"), "utf8")).toBe("{}\n");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      groups: { framework: string; component: string; contract: { path: string; sha256: string }; files: { path: string; sha256: string }[] }[];
      emitterSourceSets: Record<string, { sources: { path: string; sha256: string }[] }>;
    };
    const helperPath = "packages/ds-codegen/src/dismissal-gates.ts";
    expect(Object.keys(manifest.emitterSourceSets).sort()).toEqual([...ADMITTED_FRAMEWORKS].sort());
    for (const framework of ADMITTED_FRAMEWORKS) {
      expect(manifest.emitterSourceSets[framework].sources.find(source => source.path === helperPath)).toEqual({
        path: helperPath,
        sha256: sha256(fs.readFileSync(path.join(process.cwd(), helperPath))),
      });
    }
    const rel = path.relative(process.cwd(), root).split(path.sep).join("/");
    expect(manifest.groups.filter((g) => g.component === "(target-assets)")).toEqual([
      {
        framework: "react",
        component: "(target-assets)",
        contract: { path: "fsds.targets.json", sha256: sha256(fs.readFileSync(path.join(process.cwd(), "fsds.targets.json"))) },
        files: [
          { path: `${rel}/Runtime/Resources/Sheet.txt`, sha256: sha256("sheet\n") },
          { path: `${rel}/Runtime/Resources/Sheet.ledger.json`, sha256: sha256("{}\n") },
        ],
      },
    ]);
    // Component groups keep their own contract provenance beside the asset group.
    const components = manifest.groups.filter((g) => g.component !== "(target-assets)");
    expect(components.map((g) => g.component).sort()).toEqual(["Accordion", "Alert", "AlertNotice", "Avatar", "Badge", "Blockquote", "Breadcrumbs", "Button", "Calendar", "Card", "Carousel", "Checkbox", "Chip", "CodeBlock", "CodeSnippet", "Command", "Details", "Dialog", "Divider", "Field", "Icon", "Image", "Input", "Label", "Links", "List", "Markdown", "NavList", "NavTree", "OTP", "PageNavigator", "Pagination", "Popover", "Postcard", "ProfileFlag", "Progress", "RadioGroup", "Select", "Sheet", "ShowMore", "Shuttle", "Skeleton", "Spinner", "Stat", "Status", "Switch", "Table", "Tabs", "Text", "TextField", "Toast", "ToggleSwitch", "Tooltip", "Truncate", "Walkthrough"]);
    expect(components.every((g) => g.contract.path.startsWith("packages/ds-contracts/components/"))).toBe(true);
  }, 180_000);

  it("prunes an asset the previous run recorded and this full run no longer emits, under the hand-edit policy", async () => {
    const root = tempPackage();
    const manifestPath = path.join(root, "manifest.json");
    const binding = (b: TargetBinding): TargetBinding => ({ ...b, componentsRoot: path.join(root, "Runtime", "Components"), railFrameworkId: "react" });
    const kept = { relativePath: "Kept.txt", contents: "/* @generated:start kept */\n" };
    const dropped = { relativePath: "Dropped.txt", contents: "/* @generated:start dropped */\n" };
    const handEdited = { relativePath: "HandEdited.txt", contents: "no marker\n" };
    let emitted = [kept, dropped, handEdited];
    prepareWithAssetRecorder(["--target=unity"], { assets: () => emitted, binding, manifestPath });
    await invokeCli();
    for (const file of emitted) expect(fs.existsSync(path.join(root, file.relativePath)), file.relativePath).toBe(true);
    vi.restoreAllMocks();
    unmock();

    emitted = [kept];
    const { exit, log } = prepareWithAssetRecorder(["--target=all", "--prune"], { assets: () => emitted, binding, manifestPath, available: ["unity"] });
    await invokeCli();
    expect(exit).not.toHaveBeenCalled();
    // The still-emitted asset survives; the dropped generated one is removed;
    // the dropped hand-edited one stays under the default (skip) policy.
    expect(fs.existsSync(path.join(root, "Kept.txt"))).toBe(true);
    expect(fs.existsSync(path.join(root, "Dropped.txt"))).toBe(false);
    expect(fs.existsSync(path.join(root, "HandEdited.txt"))).toBe(true);
    const lines = log.mock.calls.map((call) => String(call[0]));
    expect(lines).toContain("\n  PRUNE  1 orphan group(s) across 1 component(s):");
    expect(lines).toContain("    deleted:     1 file(s)");
    // The new manifest records only what this run wrote.
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { groups: { component: string; files: { path: string }[] }[] };
    const rel = path.relative(process.cwd(), root).split(path.sep).join("/");
    expect(manifest.groups.find((g) => g.component === "(target-assets)")!.files.map((f) => f.path)).toEqual([`${rel}/Kept.txt`]);
  }, 180_000);
});
