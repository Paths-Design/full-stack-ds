import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { inventoryContract, inventoryCorpus, summarize } from "./prop-surface-inventory.js";
import type { ComponentContract } from "./contract.js";

// CONTRACT-PROP-SURFACE-CORPUS-INVENTORY-01, contract `prop-surface-harness`.
// Advisory-first: this suite fails on INTERNAL INCONSISTENCY, never on "still
// on styled". The 46 legacy contracts must pass as legitimately-legacy; the hard
// corpus gate is the later CERTIFY spec.

const CONTRACTS_ROOT = resolve(__dirname, "../../ds-contracts");
const reports = inventoryCorpus(CONTRACTS_ROOT);
const sum = summarize(reports);

// Runtime artifact: print the scoreboard so a reader sees the real corpus state.
console.log("\n=== prop-surface corpus scoreboard ===\n" + JSON.stringify(sum, null, 2));
console.log(
  "\nmigrated: " + reports.filter((r) => r.migrated).map((r) => r.component).join(", "),
);
console.log(
  "legacy:   " + reports.filter((r) => !r.migrated).map((r) => r.component).join(", ") + "\n",
);

describe("prop-surface inventory — scanner (A1)", () => {
  it("reports the full corpus with internally consistent per-component facts", () => {
    expect(reports.length).toBeGreaterThanOrEqual(47);
    for (const r of reports) {
      expect(typeof r.component).toBe("string");
      // propType + legacy type coverage accounts for every consumer prop
      expect(r.propTypeCoverage + r.legacyTypeCoverage).toBe(r.propCount);
      expect(r.propNames.length).toBe(r.propCount);
    }
  });
});

describe("prop-surface harness — internal consistency (A2)", () => {
  // LEGACY-BUCKET-REFS-01 retired the old "legacy lane stays type-only"
  // prohibition: the schema now admits propType on styled/hook members so
  // object-literal alias references can migrate in place. Internal
  // consistency is now that the scanner SEES every styled-authored
  // propType — the set is pinned so each further in-place migration is a
  // deliberate, visible edit here.
  it("styled members authoring a propType are exactly the in-place migrations, and obey the shared rules", () => {
    const styledMigrated = reports.filter((r) => r.styledWithPropType.length > 0);
    expect(styledMigrated.map((r) => r.component).sort()).toEqual(["Details", "Postcard", "Toast", "Walkthrough"]);
    for (const r of styledMigrated) {
      expect(r.doubleAuthored).toEqual([]);
      expect(r.refs.every((x) => x.resolves)).toBe(true);
    }
  });

  it("no member authors BOTH type and propType (exactly one source)", () => {
    const offenders = reports
      .filter((r) => r.doubleAuthored.length > 0)
      .map((r) => `${r.component}: ${r.doubleAuthored.join()}`);
    expect(offenders).toEqual([]);
  });

  it("every propType.ref resolves to a contract.types alias", () => {
    const unresolved = reports.flatMap((r) =>
      r.refs.filter((x) => !x.resolves).map((x) => `${r.component}.${x.prop}->${x.to}`),
    );
    expect(unresolved).toEqual([]);
  });
});

describe("prop-surface harness — migrated components are A2UI structured-source (A3)", () => {
  it("every migrated component has zero A2UI legacy-fallback props", () => {
    const offenders = reports
      .filter((r) => r.migrated && (!r.a2uiStructuredSource || r.fallbackCount > 0))
      .map((r) => r.component);
    expect(offenders).toEqual([]);
  });

  it("legacy components legitimately retain fallback{raw} and are NOT failed (advisory posture)", () => {
    const legacyWithFallback = reports.filter((r) => !r.migrated && r.fallbackCount > 0);
    expect(legacyWithFallback.length).toBeGreaterThan(0);
  });
});

describe("Button is the reference migrated component (A4)", () => {
  it("Button: migrated, full propType coverage, zero legacy type, resolved refs, structured A2UI", () => {
    const b = reports.find((r) => r.component === "Button");
    expect(b).toBeDefined();
    if (!b) return;
    expect(b.migrated).toBe(true);
    expect(b.legacyTypeCoverage).toBe(0);
    expect(b.propTypeCoverage).toBe(b.propCount);
    expect(b.propCount).toBeGreaterThan(0);
    expect(b.refs.every((x) => x.resolves)).toBe(true);
    expect(b.a2uiStructuredSource).toBe(true);
  });
});

describe("advisory mode: an unmigrated corpus does not fail the suite (A5)", () => {
  it("most components are still legacy and that is reported, not failed", () => {
    expect(sum.migrated).toBeGreaterThanOrEqual(1); // Button
    expect(sum.legacy).toBeGreaterThan(0); // 46 today
  });
});

// CODEGEN-PROPTYPE-DEFAULTS-BUILTINREF-01 A2: a propType ref to an ambient
// builtin (Date, …) resolves — it must not falsely inflate unresolvedRefs the
// way an unknown contract alias would. Mirrors the IR's BUILTIN_TYPE_NAMES.
describe("inventory resolves builtin/ambient type refs (Batch C enabler)", () => {
  it("treats {kind:ref, to:'Date'} — top-level, in array, and in union — as resolved", () => {
    const contract = {
      name: "ProbeBuiltin",
      layer: "primitive",
      a2ui: { category: "display" },
      props: {
        designed: {
          members: [
            { name: "minDate", propType: { kind: "ref", to: "Date" }, description: "x" },
            {
              name: "value",
              propType: {
                kind: "union",
                of: [
                  { kind: "ref", to: "Date" },
                  { kind: "array", items: { kind: "ref", to: "Date" } },
                  { kind: "literal", value: null },
                ],
              },
              description: "x",
            },
          ],
        },
      },
    } as ComponentContract;
    const report = inventoryContract("ProbeBuiltin", contract);
    expect(report.refs.length).toBeGreaterThan(0);
    expect(report.refs.every((r) => r.resolves)).toBe(true);
    expect(report.refs.filter((r) => !r.resolves)).toEqual([]);
    // An unknown contract alias still reports unresolved (guard against an
    // over-broad "everything resolves" regression).
    const bad = inventoryContract("ProbeBad", {
      name: "ProbeBad",
      layer: "primitive",
      a2ui: { category: "display" },
      props: { designed: { members: [{ name: "x", propType: { kind: "ref", to: "NotARealAlias" }, description: "x" }] } },
    } as ComponentContract);
    expect(bad.refs.some((r) => !r.resolves)).toBe(true);
  });
});
