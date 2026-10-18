import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  admitContract,
  auditBoundary,
  classifyContract,
  classifyLeaf,
  keyedLeaves,
  loadBoundary,
  loadContractWithSidecars,
  patternMatches,
  propRoles,
  unityAllowlist,
  validateBoundary,
  type Boundary,
  type ContractWithSidecars,
} from "./boundary.js";

const root = path.resolve(__dirname, "../../../../..");
const load = (name: string): ContractWithSidecars => loadContractWithSidecars(root, name);
const rule = (overrides: Record<string, unknown>) => ({ id: "r", match: ["contract:/x"], disposition: "refused", reason: "why", ...overrides });
const boundaryOf = (rules: Record<string, unknown>[]): Boundary => validateBoundary({ schema: "unity-support-boundary.v1", rules });

describe("Unity support boundary", () => {
  it("classifies every leaf of the live corpus and its sidecars with no dead rules", () => {
    const audit = auditBoundary(root);
    // The audit is the P1 exit condition: zero unclassified, no allowlisted
    // component resting on a catch-all, and every rule still matching a live leaf.
    expect(audit.violations).toEqual([]);
    expect(audit.counts.unclassified).toBe(0);
    expect(audit.unadjudicated).toEqual([]);
    expect(audit.deadRules).toEqual([]);
    for (const disposition of ["lowered", "pending", "refused"] as const) expect(audit.counts[disposition]).toBeGreaterThan(0);
    // Pending debt is attributed to a phase, never floating.
    expect(Object.values(audit.perPhase).reduce((a, b) => a + b, 0)).toBe(audit.counts.pending);
  });

  it("admits every allowlisted component and refuses nothing it carries today", () => {
    for (const name of unityAllowlist(root)) {
      const classified = admitContract(load(name), { admitted: true });
      expect(classified.some(l => l.disposition === "unclassified" || l.catchAll)).toBe(false);
    }
  });

  it("derives prop roles from the contract's own channels and form blocks, not from prop names", () => {
    const sw = propRoles(load("Switch"));
    expect(sw.get("checked")).toBe("channel-value");
    expect(sw.get("defaultChecked")).toBe("channel-default");
    expect(sw.get("onChange")).toBe("channel-change");
    // Switch participates in forms, so its bare name/value props are form fields.
    expect(sw.get("name")).toBe("form-field");
    expect(sw.get("value")).toBe("form-field");
    expect(sw.has("disabled")).toBe(false);
    // Tabs' `value` is its selection channel, not a form field.
    expect(propRoles(load("Tabs")).get("value")).toBe("channel-value");
    // Avatar's `name` is a plain prop: no form block, no channel.
    expect(propRoles(load("Avatar")).has("name")).toBe(false);
    const avatarName = classifyContract(load("Avatar")).find(l => l.keyed === "/props/designed/members/plain:name/name");
    expect(avatarName?.rule).toBe("props-unadjudicated");
    const switchName = classifyContract(load("Switch")).find(l => l.keyed === "/props/designed/members/form-field:name/name");
    expect(switchName).toMatchObject({ rule: "prop-form-field", disposition: "refused" });
  });

  it("keys array elements by identity while keeping RFC 6901 pointers", () => {
    const leaves = keyedLeaves({ parts: [{ name: "a/b", x: 1 }], dom: [{ part: "root", tag: "div" }], flags: [true], empty: {}, none: null }, "contract");
    expect(leaves.map(l => [l.pointer, l.keyed, l.value])).toEqual([
      ["/parts/0/name", "/parts/a~1b/name", "a/b"],
      ["/parts/0/x", "/parts/a~1b/x", 1],
      ["/dom/0/part", "/dom/root/part", "root"],
      ["/dom/0/tag", "/dom/root/tag", "div"],
      ["/flags/0", "/flags/0", true],
      ["/empty", "/empty", {}],
      ["/none", "/none", null],
    ]);
    // Prop members take the derived role prefix; other named arrays do not.
    const roles = new Map([["checked", "channel-value"]]);
    expect(keyedLeaves({ props: { designed: { members: [{ name: "checked", type: "boolean" }, { name: "other", type: "string" }] } } }, "contract", roles).map(l => l.keyed))
      .toEqual(["/props/designed/members/channel-value:checked/name", "/props/designed/members/channel-value:checked/type", "/props/designed/members/plain:other/name", "/props/designed/members/plain:other/type"]);
  });

  it.each([
    ["contract:/a11y/**", "/a11y/keyboard/0/key", true],
    ["contract:/a11y/**", "/a11y", true],
    ["contract:/a11y/**", "/a11yx", false],
    ["contract:/props/*/members/channel-value:*/**", "/props/designed/members/channel-value:checked/default", true],
    ["contract:/props/*/members/channel-value:*/**", "/props/designed/members/plain:checked/default", false],
    ["tokens:/*.size.md.track.width/fallback", "/switch.size.md.track.width/fallback", true],
    ["tokens:/*.size.md.track.width/fallback", "/switch.size.md.track.width/layer", false],
    ["styles:/**", "/root/color/design", true],
  ])("pattern %s against %s → %s", (pattern, keyed, expected) => {
    const source = pattern.split(":")[0] as "contract" | "tokens" | "styles";
    expect(patternMatches(pattern, { source, keyed })).toBe(expected);
  });

  it("does not let a pattern cross sources", () => {
    expect(patternMatches("contract:/root/**", { source: "styles", keyed: "/root/color" })).toBe(false);
  });

  it("first matching rule wins and valueIn filters by scalar value", () => {
    const boundary = boundaryOf([
      rule({ id: "bool", match: ["contract:/formControl/valueModel"], valueIn: ["boolean"], disposition: "lowered", via: "BooleanControl", reason: undefined }),
      rule({ id: "rest", match: ["contract:/formControl/**"], disposition: "pending", phase: "P4", catchAll: true }),
    ]);
    const leaf = { source: "contract" as const, pointer: "/formControl/valueModel", keyed: "/formControl/valueModel", value: "boolean" };
    expect(classifyLeaf(leaf, boundary)).toMatchObject({ rule: "bool", disposition: "lowered", catchAll: false });
    expect(classifyLeaf({ ...leaf, value: "string" }, boundary)).toMatchObject({ rule: "rest", disposition: "pending", catchAll: true });
    // Live boundary: a non-boolean value model on an allowlisted component is unadjudicated, not silently pending.
    const contract = load("Switch");
    contract.formControl!.valueModel = "string" as never;
    expect(() => admitContract(contract, { admitted: true })).toThrow(/UNITY_BOUNDARY_UNADJUDICATED: Switch .*contract:\/formControl\/valueModel \(rule form-control\)/);
  });

  it("an unclassified leaf fails generation for any component, allowlisted or not", () => {
    const contract = load("Switch") as ContractWithSidecars & { futureBlock?: unknown };
    contract.futureBlock = { enabled: true };
    expect(() => admitContract(contract, { admitted: false })).toThrow(/^UNITY_BOUNDARY_UNCLASSIFIED: Switch: contract:\/futureBlock\/enabled$/);
    expect(() => admitContract(contract, { admitted: true })).toThrow("UNITY_BOUNDARY_UNCLASSIFIED");
  });

  it("an allowlisted component may not rely on a catch-all; an explicit request may", () => {
    const contract = load("Switch");
    contract.props!.designed!.members!.push({ name: "futureBehavior", propType: { kind: "boolean" }, default: false });
    expect(() => admitContract(contract, { admitted: true })).toThrow(/UNITY_BOUNDARY_UNADJUDICATED: Switch .*plain:futureBehavior\/name \(rule props-unadjudicated\)/);
    const classified = admitContract(contract, { admitted: false });
    expect(classified.filter(l => l.keyed.includes("plain:futureBehavior")).every(l => l.rule === "props-unadjudicated" && l.catchAll)).toBe(true);
  });

  it("the committed boundary validates and loads once", () => {
    expect(loadBoundary()).toBe(loadBoundary());
    expect(loadBoundary().rules.length).toBeGreaterThan(10);
  });

  it.each([
    ["lowered rule without via", rule({ disposition: "lowered", reason: undefined }), /lowered rules name their mechanism/],
    ["lowered catch-all", rule({ disposition: "lowered", via: "x", catchAll: true }), /cannot be a catch-all/],
    ["pending without phase", rule({ disposition: "pending" }), /pending rules name a phase/],
    ["pending with unknown phase", rule({ disposition: "pending", phase: "P9" }), /pending rules name a phase/],
    ["refused without reason", rule({ reason: "" }), /refused rules carry a reason/],
    ["refused catch-all", rule({ catchAll: true }), /cannot be a catch-all/],
    ["bad disposition", rule({ disposition: "maybe" }), /disposition must be/],
    ["bad id", rule({ id: "Bad_Id" }), /kebab-case/],
    ["missing source prefix", rule({ match: ["/a11y/**"] }), /needs a contract:\/tokens:\/styles: prefix/],
    ["empty match", rule({ match: [] }), /non-empty string array/],
    ["empty valueIn", rule({ valueIn: [] }), /valueIn must be a non-empty array/],
  ])("rejects a malformed boundary: %s", (_label, bad, message) => {
    expect(() => boundaryOf([bad])).toThrow(message);
  });

  it("rejects duplicate rule ids and unknown schema ids", () => {
    expect(() => boundaryOf([rule({ id: "dup" }), rule({ id: "dup" })])).toThrow(/duplicate id/);
    expect(() => validateBoundary({ schema: "something-else", rules: [] })).toThrow(/UNITY_BOUNDARY_INVALID/);
  });
});
