import path from "node:path";
import { describe, it, expect } from "vitest";
import { listComponentContracts } from "../../contracts-fs.js";
import { loadContractWithSidecars } from "./boundary.js";
import { accountComponent, declaredLeaves, inventory } from "./capabilities.js";
const root = path.resolve(__dirname, "../../../../..");
const fixture = (name: string) => loadContractWithSidecars(root, name);
describe("Unity capability accounting", () => {
  it("accounts for the actual corpus and keeps unadmitted shapes distinct", () => {
    const rows = inventory(root);
    expect(rows.map(r => r.component)).toEqual(listComponentContracts(path.join(root, "packages/ds-contracts")).map(e => e.name));
    expect(rows.find(r => r.component === "Text")!.status).toBe("unsupported-shape");
    expect(rows.find(r => r.component === "Switch")!.status).toBe("pilot-partial");
    expect(rows.every(r => r.proof === "source-accounting-only")).toBe(true);
    // Every leaf of every component, sidecars included, carries a boundary rule.
    const all = rows.flatMap(r => [...r.obligations, ...r.sidecarObligations.tokens, ...r.sidecarObligations.styles]);
    expect(all.length).toBeGreaterThan(10_000);
    expect(all.filter(o => o.disposition === "unclassified")).toEqual([]);
    expect(all.every(o => typeof o.rule === "string")).toBe(true);
    // Every prop carries the rule that classifies its family.
    expect(rows.flatMap(r => r.props).filter(p => p.boundary.rule === null)).toEqual([]);
    // Sidecar hashes bind the accounting to its inputs.
    expect(rows.find(r => r.component === "Switch")!.sidecarSha256).toEqual({ tokens: expect.stringMatching(/^[0-9a-f]{64}$/), styles: expect.stringMatching(/^[0-9a-f]{64}$/) });
  });
  it("exposes an unknown prop as catch-all reliance instead of classifying it as supported", () => {
    const contract = fixture("Switch");
    const original = accountComponent(contract, true);
    const modified = structuredClone(contract);
    // Add a valid declared member so the IR must discover this new fact.
    const members = modified.props!.designed!.members!;
    const index = members.length;
    members.push({ name: "futureBehavior", propType: { kind: "boolean" }, default: false });
    const result = accountComponent(modified, true);
    const prop = result.props.find(p => p.name === "futureBehavior");
    expect(prop?.disposition).toBe("not-emitted");
    expect(prop?.boundary).toMatchObject({ rule: "props-unadjudicated", disposition: "pending", phase: "P4", catchAll: true });
    expect(result.props.length).toBe(original.props.length + 1);
    expect(result.obligations).toContainEqual({ pointer: `/props/designed/members/${index}/default`, keyed: "/props/designed/members/plain:futureBehavior/default", disposition: "pending", rule: "props-unadjudicated", catchAll: true });
  });
  it("distinguishes exported state API, adapted channel props and refused form fields", () => {
    const result = accountComponent(fixture("Switch"), true);
    const prop = (name: string) => result.props.find(p => p.name === name)!;
    expect(prop("checked")).toMatchObject({ disposition: "emitted-api", boundary: { rule: "prop-channel-value", disposition: "lowered" } });
    // Not emitted as a C# property, yet lowered by the runtime's change callback: the boundary says how.
    expect(prop("onChange")).toMatchObject({ disposition: "not-emitted", boundary: { rule: "prop-channel-change", disposition: "lowered", via: expect.stringContaining("RegisterValueChangedCallback") } });
    expect(prop("name")).toMatchObject({ disposition: "not-emitted", boundary: { rule: "prop-form-field", disposition: "refused" } });
    expect(prop("size")).toMatchObject({ disposition: "not-emitted", boundary: { rule: "prop-size", disposition: "pending", phase: "P3" } });
    expect(result.obligations.find(o => o.pointer === "/formControl/commit")).toMatchObject({ disposition: "lowered", rule: "form-control-commit-change" });
    expect(result.obligations.find(o => o.pointer === "/a11y/labeling/0")).toMatchObject({ disposition: "refused", rule: "a11y" });
    expect(result.obligations.find(o => o.pointer === "/a11y/keyboard/0/key")).toMatchObject({ disposition: "lowered", rule: "a11y-keyboard" });
    expect(result.sidecarObligations.tokens.find(o => o.pointer === "/switch.size.md.track.width/fallback")).toMatchObject({ disposition: "lowered", rule: "token-default-geometry" });
    expect(result.sidecarObligations.tokens.find(o => o.pointer === "/switch.size.lg.track.width/fallback")).toMatchObject({ disposition: "pending", rule: "tokens" });
  });
  it("retains empty declarations, arrays and escaped property paths", () => {
    expect(declaredLeaves({ "a/b": { "~": [] }, flags: [true, false], missing: null })).toEqual(["/a~1b/~0", "/flags/0", "/flags/1", "/missing"]);
  });
});
