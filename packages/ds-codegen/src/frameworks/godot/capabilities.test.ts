import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { createGodotEmitter } from "./factory.js";
import {
  auditGodotTarget,
  compareInventory,
  inventory,
  inventoryPath,
  receiptAccount,
  writeInventory,
  type GodotCapabilityInventory,
  type GodotEmitter,
} from "./capabilities.js";
import { godotAllowlist, loadBoundary, validateBoundary, type GodotBoundaryRule } from "./boundary.js";

const root = path.resolve(__dirname, "../../../../..");
const readCommitted = (): GodotCapabilityInventory => JSON.parse(fs.readFileSync(inventoryPath(root), "utf8")) as GodotCapabilityInventory;
const tempFile = (label: string): string => path.join(os.tmpdir(), `godot-${label}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
const CORPUS_TIMEOUT_MS = 120_000;

/** A receipt fixture; nonClaims mirrors the emitted `omissions`/`fidelityGaps`. */
const receipt = (excluded: string[], nonClaims: string[] = [], operation = "boolean") => ({ operation, excluded, nonClaims, proof: null });

const receiptOverriding: GodotEmitter = (() => {
  const base = createGodotEmitter();
  const overrides = new Map<string, (parsed: Record<string, unknown>) => Record<string, unknown>>([
    ["Dialog", parsed => ({ ...parsed, excluded: ["ariaLabel"], omissions: ["ariaLabel: no executable native surface realization"] })],
    ["Toast", parsed => ({ ...parsed, excluded: ["ariaLabel"], omissions: [], fidelityGaps: [] })],
  ]);
  return {
    emitComponent(ir, options) {
      const files = base.emitComponent(ir, options);
      if (ir.name === "Switch") throw new Error("GODOT_UNSUPPORTED_SHAPE: injected refusal");
      const rewrite = overrides.get(ir.name);
      if (!rewrite) return files;
      return files.map(file =>
        file.relativePath.endsWith("/capabilities.json")
          ? { ...file, contents: JSON.stringify(rewrite(JSON.parse(file.contents) as Record<string, unknown>)) }
          : file,
      );
    },
  };
})();

describe("Godot capability inventory", () => {
  let fresh: GodotCapabilityInventory;
  let committed: GodotCapabilityInventory;
  beforeAll(() => {
    fresh = inventory(root);
    committed = readCommitted();
  }, CORPUS_TIMEOUT_MS);

  it("committed inventory matches a fresh regeneration", () => {
    expect(fresh.schema).toBe("godot-capability-inventory.v1");
    expect(committed.schema).toBe(fresh.schema);
    expect(compareInventory(fresh, committed)).toEqual([]);
  }, CORPUS_TIMEOUT_MS);

  it("records one compact entry per admitted component: hashes, receipt, variance and boundary account", () => {
    const allowlist = [...godotAllowlist(root)].sort();
    expect(fresh.components.map(record => record.component)).toEqual(allowlist);
    expect(fresh.boundary.corpusComponents).toBe(55);
    expect(fresh.boundary.rules).toBe(loadBoundary().rules.length);
    expect(fresh.boundary.deadRules).toEqual([]);
    expect(fresh.variances).toBe(fresh.components.reduce((total, record) => total + record.variance.length, 0));
    // Every admitted component plans and emits; a refusal is an audit violation.
    expect(fresh.components.filter(record => !record.emitted)).toEqual([]);
    // Carousel is a sequence component: its IR needs the corpus map to resolve
    // composed refs, so this also pins the allContracts plumbing in accountComponent.
    expect(fresh.components.find(record => record.component === "Carousel")).toMatchObject({ emitted: true });
    expect(fresh.components.find(record => record.component === "Input")?.variance).toEqual([]);
    expect(fresh.components.find(record => record.component === "Label")?.variance).toEqual([]);
    expect(fresh.variances).toBeGreaterThan(0);
    for (const record of fresh.components) {
      expect(record.admitted).toBe(true);
      expect(record.contractSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(record.boundary.digest).toMatch(/^[0-9a-f]{64}$/);
      const { lowered, pending, refused } = record.boundary.counts;
      expect(lowered + pending + refused).toBeGreaterThan(0);
      for (const entry of record.variance) {
        expect(typeof entry.prop).toBe("string");
        expect(typeof entry.rule).toBe("string");
      }
      expect(record.receipt).not.toBeNull();
      expect(typeof record.receipt!.operation).toBe("string");
      expect(Array.isArray(record.receipt!.excluded)).toBe(true);
      expect(typeof record.receipt!.nonClaimCount).toBe("number");
    }
  }, CORPUS_TIMEOUT_MS);

  it("reports an unclassified leaf when the ledger no longer covers a family", () => {
    const ledger = loadBoundary();
    // Drop every styles rule AND the terminal catch-all: styles leaves then match nothing.
    const boundary = validateBoundary({
      schema: ledger.schema,
      phases: ledger.phases,
      rules: ledger.rules.filter(entry => !entry.id.startsWith("styles-") && entry.catchAll !== true),
    });
    const audit = auditGodotTarget(root, { boundary, inventoryFile: inventoryPath(root) });
    expect(audit.unclassified.length).toBeGreaterThan(0);
    expect(audit.counts.unclassified).toBe(audit.unclassified.length);
    expect(audit.violations.some(violation => violation.startsWith("unclassified "))).toBe(true);
    expect(audit.unclassified.every(item => item.leaf.startsWith("styles:") || item.leaf.startsWith("tokens:"))).toBe(true);
  }, CORPUS_TIMEOUT_MS);

  it("reports an unemitted component, a silent drop, and a shape variance in one pass", () => {
    const audit = auditGodotTarget(root, { emitter: receiptOverriding, inventoryFile: inventoryPath(root) });
    // Ledger totality is unaffected by injected emission.
    expect(audit.unclassified).toEqual([]);
    expect(audit.catchAll).toEqual([]);
    // An emitter refusal is a violation, not a crash.
    expect(audit.unemitted.find(entry => entry.component === "Switch")?.message).toContain("GODOT_UNSUPPORTED_SHAPE");
    expect(audit.violations.some(violation => violation.startsWith("unemitted Switch"))).toBe(true);
    // A lowered prop dropped without a named non-claim is a silent drop.
    expect(audit.receiptViolations).toContain("receipt Toast: excluded prop ariaLabel is not named in the receipt's omissions/non-claims (silent drop)");
    // A lowered prop dropped WITH a named non-claim is only a recorded variance.
    expect(audit.variance).toEqual(expect.arrayContaining([{ component: "Dialog", prop: "ariaLabel", rule: "prop-aria-label" }]));
    expect(audit.receiptViolations.some(violation => violation.startsWith("receipt Dialog"))).toBe(false);
  }, CORPUS_TIMEOUT_MS);

  it("flags an excluded prop with no boundary rule and requires a named non-claim", () => {
    // An unknown prop family resolves only to the terminal catch-all: fatal.
    const unknown = receiptAccount("Widget", receipt(["notARealProp"]));
    expect(unknown.violations).toHaveLength(1);
    expect(unknown.violations[0]).toMatch(/not named by an adjudicated boundary rule/);
    expect(unknown.variance).toEqual([]);
    // Receipt totality: a pending/refused prop may be dropped, but only with a named non-claim.
    expect(receiptAccount("Widget", receipt(["required"])).violations[0]).toMatch(/not named in the receipt's omissions\/non-claims \(silent drop\)/);
    expect(receiptAccount("Widget", receipt(["required"], ["required: form validation is pending"])).violations).toEqual([]);
    expect(receiptAccount("Widget", receipt(["as"], ["as: DOM element polymorphism is refused"])).violations).toEqual([]);
    // The non-claim must name the prop as a word.
    expect(receiptAccount("Widget", receipt(["required"], ["requiredness is pending"])).violations).toHaveLength(1);
    // A named non-claim does not excuse an unadjudicated family.
    const terminal: GodotBoundaryRule = { id: "terminal", match: ["contract:/**"], disposition: "refused", reason: "unadjudicated", catchAll: true };
    const catchAllBoundary = validateBoundary({ schema: "godot-support-boundary.v1", rules: [terminal] });
    expect(receiptAccount("Widget", receipt(["anything"], ["anything: named"]), catchAllBoundary).violations[0]).toMatch(/not named by an adjudicated boundary rule/);
  });

  it("records a lowered-but-excluded prop as shape variance, not a violation", () => {
    const account = receiptAccount("Widget", receipt(["ariaLabel"], ["ariaLabel: no executable native surface realization"], "surface"));
    expect(account.violations).toEqual([]);
    expect(account.variance).toEqual([{ component: "Widget", prop: "ariaLabel", rule: "prop-aria-label" }]);
    // Without the named non-claim the same exclusion is a silent drop.
    expect(receiptAccount("Widget", receipt(["ariaLabel"])).violations).toHaveLength(1);
  });

  it("flags inventory drift with the offending component and field", () => {
    const mutated = structuredClone(committed);
    const target = mutated.components.find(record => record.receipt !== null)!;
    target.receipt!.excluded = [...target.receipt!.excluded, "size"];
    target.boundary.counts.lowered += 1;
    mutated.boundary.counts.pending += 1;
    const dropped = mutated.components.pop()!;
    const file = tempFile("inventory");
    fs.writeFileSync(file, JSON.stringify(mutated));
    try {
      const audit = auditGodotTarget(root, { inventoryFile: file });
      const joined = audit.drift.join("\n");
      expect(audit.drift.length).toBeGreaterThan(0);
      expect(joined).toContain(target.component);
      expect(joined).toContain("size");
      expect(joined).toContain("boundary.counts.pending");
      expect(joined).toContain(dropped.component);
      // Drift is fatal, not advisory.
      for (const entry of audit.drift) expect(audit.violations).toContain(entry);
    } finally {
      fs.unlinkSync(file);
    }
    // A missing committed inventory is itself a failure: the ratchet cannot be skipped.
    const missing = auditGodotTarget(root, { inventoryFile: path.join(os.tmpdir(), "godot-does-not-exist-inventory.json") });
    expect(missing.drift.some(entry => entry.includes("inventory missing"))).toBe(true);
  }, CORPUS_TIMEOUT_MS);

  it("regenerates the inventory deterministically with --write", () => {
    const file = tempFile("write");
    try {
      expect(writeInventory(root, loadBoundary(), file)).toBe(file);
      expect(fs.readFileSync(file, "utf8")).toBe(`${JSON.stringify(fresh, null, 2)}\n`);
    } finally {
      fs.unlinkSync(file);
    }
  }, CORPUS_TIMEOUT_MS);

  it("audits the committed state without unclassified, catch-all, dead-rule or drift findings", () => {
    const audit = auditGodotTarget(root);
    expect(audit.unclassified).toEqual([]);
    expect(audit.catchAll).toEqual([]);
    expect(audit.deadRules).toEqual([]);
    expect(audit.drift).toEqual([]);
    expect(audit.counts.lowered + audit.counts.pending + audit.counts.refused).toBeGreaterThan(10_000);
  }, CORPUS_TIMEOUT_MS);
});
