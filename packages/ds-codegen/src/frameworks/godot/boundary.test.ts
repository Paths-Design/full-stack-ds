import path from "node:path";
import { describe, expect, it } from "vitest";
import { listComponentContracts } from "../../contracts-fs.js";
import {
  classifyContract,
  classifyLeaf,
  classifyLeaves,
  classifyProp,
  contractLeaves,
  godotAllowlist,
  keyedLeaves,
  loadBoundary,
  loadContractWithSidecars,
  patternMatches,
  propRoles,
  validateBoundary,
  type GodotBoundary,
  type GodotBoundaryRule,
} from "./boundary.js";

const root = path.resolve(__dirname, "../../../../..");
const load = (name: string) => loadContractWithSidecars(root, name);
const rule = (overrides: Partial<GodotBoundaryRule>): GodotBoundaryRule => ({
  id: "r",
  match: ["contract:/x"],
  disposition: "refused",
  reason: "why",
  ...overrides,
});
const boundaryOf = (rules: GodotBoundaryRule[]): GodotBoundary =>
  validateBoundary({ schema: "godot-support-boundary.v1", rules });
const catchAll = rule({
  id: "catchall",
  match: ["contract:/**", "tokens:/**", "styles:/**"],
  disposition: "refused",
  reason: "unadjudicated",
  catchAll: true,
});

// Corpus-wide cases load every contract and its sidecars and classify all
// leaves (about 17k); under the root suite's parallel load that overran
// vitest's 5s default. The budget relaxes no assertion.
const CORPUS_TIMEOUT_MS = 120_000;

describe("Godot support boundary", () => {
  it("loads and structurally validates the committed ledger", () => {
    const boundary = loadBoundary();
    expect(boundary.schema).toBe("godot-support-boundary.v1");
    expect(boundary.rules.length).toBeGreaterThan(50);
    // The ledger is a total classification: it ends with the explicit catch-all.
    expect(boundary.rules.at(-1)?.catchAll).toBe(true);
    expect(boundary.rules.at(-1)?.disposition).toBe("refused");
    // Re-validation of the same document is idempotent.
    expect(validateBoundary(structuredClone(boundary))).toEqual(boundary);
    // Every lowered rule names a mechanism; every pending/refused rule says why.
    for (const entry of boundary.rules) {
      if (entry.disposition === "lowered") expect(entry.via?.trim()).toBeTruthy();
      else expect(entry.reason?.trim()).toBeTruthy();
    }
  });

  it("rejects a malformed document", () => {
    expect(() => validateBoundary(null)).toThrow(/GODOT_BOUNDARY_INVALID/);
    expect(() => validateBoundary({ schema: "unity-support-boundary.v1", rules: [rule({})] })).toThrow(/GODOT_BOUNDARY_INVALID/);
    expect(() => validateBoundary({ schema: "godot-support-boundary.v1", rules: [] })).toThrow(/GODOT_BOUNDARY_INVALID/);
    // Duplicate ids.
    expect(() => boundaryOf([rule({}), rule({})])).toThrow(/duplicate id/);
    // A lowered rule must name its mechanism.
    expect(() => boundaryOf([rule({ disposition: "lowered", reason: undefined, via: undefined })])).toThrow(/via/);
    // Pending/refused rules must explain themselves.
    expect(() => boundaryOf([rule({ disposition: "pending", reason: undefined })])).toThrow(/reason/);
    expect(() => boundaryOf([rule({ disposition: "refused", reason: undefined })])).toThrow(/reason/);
    // Match patterns need a source prefix and an absolute pointer.
    expect(() => boundaryOf([rule({ match: ["props/x"] })])).toThrow(/prefix/);
    expect(() => boundaryOf([rule({ match: ["contract:x"] })])).toThrow(/pointer/);
    // The catch-all may only be a terminal refused rule.
    expect(() => boundaryOf([rule({ catchAll: true, disposition: "lowered", via: "v" })])).toThrow(/catch-all/);
    expect(() => boundaryOf([catchAll, rule({ id: "after" })])).toThrow(/terminal/);
    // Unknown rule members are rejected so a typo cannot silently change meaning.
    expect(() => boundaryOf([rule({} as GodotBoundaryRule)])).not.toThrow();
    expect(() => validateBoundary({ schema: "godot-support-boundary.v1", rules: [{ ...rule({}), propMatch: ["x"] }] })).toThrow(/unknown member/);
    // The catch-all must be refused: an unadjudicated family is never supported.
    expect(() => boundaryOf([rule({ catchAll: true, disposition: "pending", reason: "later" })])).toThrow(/catch-all/);
  });

  it("classifies by first match in ledger order, not by specificity", () => {
    const boundary = boundaryOf([
      rule({ id: "first", match: ["contract:/props/size"], disposition: "refused", reason: "first wins" }),
      rule({ id: "second", match: ["contract:/props/size"], disposition: "lowered", via: "never reached" }),
      catchAll,
    ]);
    expect(classifyProp(boundary, "size")).toMatchObject({ rule: "first", disposition: "refused" });
    expect(classifyLeaf({ source: "contract", pointer: "/props/size", keyed: "/props/size", value: "enum" }, boundary))
      .toMatchObject({ rule: "first", disposition: "refused", catchAll: false });
    // A narrow rule placed after a broad one loses to the broad one.
    const ordered = boundaryOf([
      rule({ id: "broad", match: ["contract:/**"], disposition: "pending", reason: "broad wins by order" }),
      rule({ id: "narrow", match: ["contract:/props/size"], disposition: "lowered", via: "narrow later" }),
      catchAll,
    ]);
    expect(classifyProp(ordered, "size")).toMatchObject({ rule: "broad", disposition: "pending" });
  });

  it("marks a leaf no adjudicated family names as unadjudicated via the catch-all", () => {
    const boundary = boundaryOf([
      rule({ id: "known", match: ["contract:/known/**"], disposition: "lowered", via: "realised" }),
      catchAll,
    ]);
    const unknown = classifyLeaf({ source: "contract", pointer: "/mystery/family", keyed: "/mystery/family", value: 1 }, boundary);
    expect(unknown).toMatchObject({ rule: "catchall", disposition: "refused", catchAll: true });
    expect(classifyProp(boundary, "someUnadjudicatedProp")).toMatchObject({ rule: "catchall", catchAll: true });
    // A leaf inside an adjudicated family is not the catch-all's business.
    expect(classifyLeaf({ source: "contract", pointer: "/known/x", keyed: "/known/x", value: 1 }, boundary).catchAll).toBe(false);
    // An incomplete boundary (no catch-all) leaves the leaf unclassified.
    expect(classifyLeaf({ source: "contract", pointer: "/mystery", keyed: "/mystery", value: 1 }, boundaryOf([rule({ id: "known", match: ["contract:/known/**"], disposition: "lowered", via: "v" })])).disposition).toBe("unclassified");
  });

  it("classifies prop families as lowered, pending and refused (bare name and role-qualified)", () => {
    const boundary = loadBoundary();
    // Lowered: state/booleans, variant axes and content strings project into the generated control configuration.
    expect(classifyProp(boundary, "disabled")).toMatchObject({ disposition: "lowered", catchAll: false });
    expect(classifyProp(boundary, "variant")).toMatchObject({ disposition: "lowered" });
    expect(classifyProp(boundary, "label")).toMatchObject({ disposition: "lowered" });
    expect(classifyProp(boundary, "onChange")).toMatchObject({ disposition: "lowered" });
    expect(classifyProp(boundary, "defaultValue")).toMatchObject({ disposition: "lowered" });
    // Pending: semantics the shared runtime does not realise yet.
    // Validation state is projected structurally (required/invalid); validation
    // execution and read-only mode remain refused.
    expect(classifyProp(boundary, "required")).toMatchObject({ disposition: "lowered" });
    expect(classifyProp(boundary, "formatValue")).toMatchObject({ disposition: "pending" });
    // Data-driven children props are refused: the runtime does not iterate or
    // persist consumer data.
    expect(classifyProp(boundary, "options")).toMatchObject({ disposition: "refused" });
    // Activation mode is realised by the control runtime; initial focus is
    // refused because mount-time focus is the embedding scene's decision.
    expect(classifyProp(boundary, "activationMode")).toMatchObject({ disposition: "lowered" });
    expect(classifyProp(boundary, "initialFocus")).toMatchObject({ disposition: "refused" });
    // Refused: DOM/authoring facts with no native meaning.
    expect(classifyProp(boundary, "as")).toMatchObject({ disposition: "refused" });
    expect(classifyProp(boundary, "type")).toMatchObject({ disposition: "refused" });
    expect(classifyProp(boundary, "idBase")).toMatchObject({ disposition: "refused" });
    // Role-qualified classification resolves the same bare name differently.
    expect(classifyProp(boundary, "name", "glyph-name")).toMatchObject({ disposition: "lowered" });
    expect(classifyProp(boundary, "name", "form-field")).toMatchObject({ disposition: "refused" });
    expect(classifyProp(boundary, "value", "form-field")).toMatchObject({ disposition: "refused" });
    // An undeclared name is not silently supported: it resolves only to the
    // terminal catch-all, which the audit treats as unadjudicated.
    expect(classifyProp(boundary, "notARealProp")).toMatchObject({ catchAll: true, disposition: "refused" });
    // An incomplete boundary (no catch-all) refuses to answer rather than guessing.
    const noCatchAll = boundaryOf(loadBoundary().rules.filter(entry => entry.catchAll !== true));
    expect(() => classifyProp(noCatchAll, "notARealProp")).toThrow(/GODOT_BOUNDARY_UNCLASSIFIED_PROP/);
    expect(() => classifyProp(boundary, "")).toThrow(/GODOT_BOUNDARY_PROP/);
    // The family default and the role-qualified leaf agree on disposition for unambiguous names.
    const roleSpecific = classifyProp(loadBoundary(), "disabled", "plain");
    expect(roleSpecific.disposition).toBe("lowered");
    expect(roleSpecific.via).toBeTruthy();
  });

  it("resolves a named, non-catch-all rule for every prop name the corpus declares", () => {
    const boundary = loadBoundary();
    const names = new Set<string>();
    for (const entry of listComponentContracts(path.join(root, "packages/ds-contracts"))) {
      const contract = load(entry.name) as unknown as { props?: Record<string, { members?: { name?: string }[] }> };
      for (const bucket of Object.values(contract.props ?? {})) {
        for (const member of bucket.members ?? []) if (typeof member.name === "string") names.add(member.name);
      }
    }
    expect(names.size).toBeGreaterThan(150);
    const unadjudicated = [...names].filter(name => classifyProp(boundary, name).catchAll);
    expect(unadjudicated).toEqual([]);
    // Role-qualified queries the contracts actually use also resolve.
    for (const role of ["channel-value", "channel-default", "channel-change", "form-field", "glyph-name"]) {
      for (const name of names) {
        expect(() => classifyProp(boundary, name, role)).not.toThrow();
      }
    }
  });

  it("classifies every leaf of the live corpus and its sidecars with no dead rules", () => {
    const boundary = loadBoundary();
    const counts = { lowered: 0, pending: 0, refused: 0, unclassified: 0 };
    const unadjudicated: string[] = [];
    const used = new Set<string>();
    let total = 0;
    for (const entry of listComponentContracts(path.join(root, "packages/ds-contracts"))) {
      for (const leaf of classifyLeaves(load(entry.name), boundary)) {
        total++;
        counts[leaf.disposition]++;
        if (leaf.rule) used.add(leaf.rule);
        if (leaf.catchAll) unadjudicated.push(`${entry.name} ${leaf.source}:${leaf.keyed}`);
      }
    }
    expect(total).toBeGreaterThan(10_000);
    expect(counts.unclassified).toBe(0);
    expect(unadjudicated).toEqual([]);
    for (const disposition of ["lowered", "pending", "refused"] as const) expect(counts[disposition]).toBeGreaterThan(0);
    const dead = boundary.rules.filter(entry => !used.has(entry.id) && entry.catchAll !== true).map(entry => entry.id);
    expect(dead).toEqual([]);
    // The terminal catch-all is exercised only by direct classification of an
    // unknown family (unit-tested above), never by the live corpus.
    expect(boundary.rules.filter(entry => entry.catchAll)).toHaveLength(1);
  }, CORPUS_TIMEOUT_MS);

  it("classifies the contract and both sidecar sources of one component", () => {
    const boundary = loadBoundary();
    const classified = classifyContract(load("Button"), boundary);
    const sources = new Set(classified.map(leaf => leaf.source));
    expect(sources).toEqual(new Set(["contract", "tokens", "styles"]));
    // Every reported leaf carries a rule that exists, and no reported leaf is
    // catch-all-only (the audit treats that as unadjudicated).
    const ids = new Set(boundary.rules.map(entry => entry.id));
    for (const leaf of classified) {
      expect(ids.has(leaf.rule)).toBe(true);
      expect(leaf.catchAll).toBe(false);
      expect(leaf.pointer.startsWith("/")).toBe(true);
    }
    // A non-lowered leaf is still named by a rule (never silently dropped).
    const pendingLeaf = classified.find(leaf => leaf.disposition === "pending");
    expect(pendingLeaf?.rule).toBeTruthy();
    // contractLeaves merges the identity-keyed sidecar leaves.
    expect(contractLeaves(load("Button")).some(leaf => leaf.source === "styles")).toBe(true);
  });

  it("throws instead of reporting when the boundary misses a leaf family", () => {
    const incomplete = validateBoundary({
      schema: "godot-support-boundary.v1",
      rules: loadBoundary().rules.filter(entry => entry.id !== "tokens" && entry.catchAll !== true),
    });
    expect(() => classifyContract(load("Button"), incomplete)).toThrow(/GODOT_BOUNDARY_UNCLASSIFIED/);
  });

  it("keys identity-bearing array elements while keeping RFC 6901 pointers", () => {
    const leaves = keyedLeaves(
      { parts: [{ name: "a/b", x: 1 }], dom: [{ part: "root", tag: "div" }], flags: [true], empty: {}, none: null },
      "contract",
    );
    expect(leaves.map(leaf => [leaf.pointer, leaf.keyed, leaf.value])).toEqual([
      ["/parts/0/name", "/parts/a~1b/name", "a/b"],
      ["/parts/0/x", "/parts/a~1b/x", 1],
      ["/dom/0/part", "/dom/root/part", "root"],
      ["/dom/0/tag", "/dom/root/tag", "div"],
      ["/flags/0", "/flags/0", true],
      ["/empty", "/empty", {}],
      ["/none", "/none", null],
    ]);
  });

  it("derives prop roles from the contract's own channels, form and glyph anatomy", () => {
    const roles = propRoles(load("Switch"));
    expect(roles.get("checked")).toBe("channel-value");
    expect(roles.get("defaultChecked")).toBe("channel-default");
    expect(roles.get("onChange")).toBe("channel-change");
    // Switch participates in forms, so its bare name/value props are form fields.
    expect(roles.get("name")).toBe("form-field");
    expect(roles.get("value")).toBe("form-field");
    expect(roles.has("disabled")).toBe(false);
    // Tabs' `value` is its selection channel, not a form field.
    expect(propRoles(load("Tabs")).get("value")).toBe("channel-value");
    // Icon's name is a glyph lookup, derived from authored anatomy, not spelling alone.
    expect([...propRoles(load("Icon")).values()]).toContain("glyph-name");
    // Avatar's plain `name` acquires no role.
    expect(propRoles(load("Avatar")).has("name")).toBe(false);
  });

  it("matches pointer globs the way the ledger relies on", () => {
    const of = (pattern: string, keyed: string, source: "contract" | "tokens" | "styles" = "contract") =>
      patternMatches(pattern, { source, keyed });
    expect(of("contract:/props/disabled", "/props/disabled")).toBe(true);
    expect(of("contract:/props/*", "/props/disabled")).toBe(true);
    expect(of("contract:/props/*", "/props/disabled/x")).toBe(false);
    // `**` matches any depth, including zero segments.
    expect(of("contract:/anatomy/dom/**/part", "/anatomy/dom/part")).toBe(true);
    expect(of("contract:/anatomy/dom/**/part", "/anatomy/dom/children/a/part")).toBe(true);
    expect(of("styles:/**/background-color/**", "/root/background-color/literal", "styles")).toBe(true);
    expect(of("styles:/*::*/**", "/.field__input::placeholder/color/literal", "styles")).toBe(true);
    // The source prefix is part of the match.
    expect(of("styles:/root", "/root", "contract")).toBe(false);
  });

  it("reads the Godot allowlist from the target registry", () => {
    const allowlist = godotAllowlist(root);
    expect(allowlist.length).toBeGreaterThanOrEqual(10);
    expect(allowlist).toContain("Switch");
    expect(allowlist).toContain("Text");
    // The allowlist is a subset of the corpus.
    const corpus = new Set(listComponentContracts(path.join(root, "packages/ds-contracts")).map(entry => entry.name));
    for (const name of allowlist) expect(corpus.has(name)).toBe(true);
  });
});
