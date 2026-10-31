import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { listComponentContracts } from "../../contracts-fs.js";
import { loadBoundary, loadContractWithSidecars, type Boundary, type BoundaryRule } from "./boundary.js";
import { accountComponent, auditUnityTarget, declaredLeaves, inventory, ledgerViolations, unsupportedLedgerPath } from "./capabilities.js";
const root = path.resolve(__dirname, "../../../../..");
const fixture = (name: string) => loadContractWithSidecars(root, name);
// The corpus case builds and classifies every contract twice (inventory, then
// auditUnityTarget): about 2s alone, and it overran vitest's 5s default under
// the root suite's parallel load. The budget covers that work; it relaxes no
// assertion.
const CORPUS_TIMEOUT_MS = 20_000;
describe("Unity capability accounting", () => {
  it("accounts for the actual corpus and keeps unadmitted shapes distinct", () => {
    const rows = inventory(root);
    expect(rows.map(r => r.component)).toEqual(listComponentContracts(path.join(root, "packages/ds-contracts")).map(e => e.name));
    expect(rows.find(r => r.component === "Text")!.status).toBe("pilot-partial");
    expect(rows.find(r => r.component === "Divider")!.status).toBe("pilot-partial");
    expect(rows.find(r => r.component === "Dialog")!.status).toBe("unsupported-shape");
    expect(rows.find(r => r.component === "Switch")!.status).toBe("pilot-partial");
    expect(rows.every(r => r.proof === "source-accounting-only")).toBe(true);
    // Every leaf of every component, sidecars included, carries a boundary rule.
    const all = rows.flatMap(r => [...r.obligations, ...r.sidecarObligations.tokens, ...r.sidecarObligations.styles]);
    expect(all.length).toBeGreaterThan(10_000);
    expect(all.filter(o => o.disposition === "unclassified")).toEqual([]);
    expect(all.every(o => typeof o.rule === "string")).toBe(true);
    // Every prop carries the rule that classifies its family.
    expect(rows.flatMap(r => r.props).filter(p => p.boundary.rule === null)).toEqual([]);
    // Every allowlisted component realises every lowered claim its leaves carry.
    expect(rows.filter(r => r.admitted).map(r => [r.component, r.unrealized])).toEqual([["Accordion", null], ["Alert", null], ["AlertNotice", null], ["Badge", null], ["Blockquote", null], ["Breadcrumbs", null], ["Button", null], ["Card", null], ["Checkbox", null], ["CodeBlock", null], ["Details", null], ["Divider", null], ["Icon", null], ["Label", null], ["List", null], ["NavList", null], ["Popover", null], ["ProfileFlag", null], ["Progress", null], ["Skeleton", null], ["Stat", null], ["Status", null], ["Switch", null], ["Table", null], ["Tabs", null], ["Text", null], ["ToggleSwitch", null], ["Tooltip", null]]);
    const audit = auditUnityTarget(root);
    expect(audit.violations).toEqual([]);
    expect(audit.unrealized).toEqual([]);
    // Sidecar hashes bind the accounting to its inputs.
    expect(rows.find(r => r.component === "Switch")!.sidecarSha256).toEqual({ tokens: expect.stringMatching(/^[0-9a-f]{64}$/), styles: expect.stringMatching(/^[0-9a-f]{64}$/) });
  }, CORPUS_TIMEOUT_MS);
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
    // The size axis is emitted because the USS projection carries its modifier (S6).
    expect(prop("size")).toMatchObject({ disposition: "emitted-api", boundary: { rule: "prop-size", disposition: "lowered", via: expect.stringContaining("uss.ts") } });
    expect(result.obligations.find(o => o.pointer === "/formControl/commit")).toMatchObject({ disposition: "lowered", rule: "form-control-commit-change" });
    expect(result.obligations.find(o => o.pointer === "/a11y/labeling/0")).toMatchObject({ disposition: "refused", rule: "a11y" });
    expect(result.obligations.find(o => o.pointer === "/a11y/keyboard/0/key")).toMatchObject({ disposition: "lowered", rule: "a11y-keyboard" });
    // Anatomy obligations carry walker rules, keyed by part, at their RFC 6901 pointers.
    expect(result.obligations.find(o => o.pointer === "/anatomy/dom/children/0/bindings/checked")).toMatchObject({ keyed: "/anatomy/dom/children/input/bindings/checked", disposition: "lowered", rule: "anatomy-channel-binding" });
    expect(result.obligations.find(o => o.pointer === "/anatomy/dom/children/0/attrs/role")).toMatchObject({ disposition: "refused", rule: "anatomy-static-attrs-refused" });
    expect(result.obligations.filter(o => o.pointer.startsWith("/anatomy/") || o.pointer.startsWith("/slots/")).every(o => o.rule?.startsWith("anatomy-") || o.rule === "slots")).toBe(true);
    // Every size's geometry now lowers through the USS projection, not only the default's.
    for (const pointer of ["/switch.size.md.thumb.height/fallback", "/switch.size.md.track.width/fallback", "/switch.size.lg.track.width/fallback"]) {
      expect(result.sidecarObligations.tokens.find(o => o.pointer === pointer), pointer).toMatchObject({ disposition: "lowered", rule: "tokens" });
    }
    // A sidecar declaration lowers through the projection unless its family is
    // one the sheet does not realise: exactly the Switch rows of Controls.unsupported.json.
    const notLowered = (kind: "tokens" | "styles", depth: number) => [...new Set(result.sidecarObligations[kind]
      .filter(o => o.disposition !== "lowered").map(o => `${o.pointer.split("/").slice(1, 1 + depth).join("/")} ${o.disposition}:${o.rule}`))].sort();
    expect(notLowered("styles", 2)).toEqual([
      ".switch:dir(rtl) .switch__track/scale pending:styles-outside-native-grammar",
      ".switch:has(.switch__input:focus-visible) .switch__track/outline-offset refused:styles-outline-offset",
      "input/clip refused:styles-uss-absent-property",
      "root/cursor refused:styles-cursor",
      "thumb/box-shadow refused:styles-uss-absent-property",
      "thumb/transition refused:styles-transition-unrealised",
      "track/transition refused:styles-transition-unrealised",
    ]);
    expect(notLowered("tokens", 1)).toEqual(["switch.color.thumb.shadow refused:tokens-non-scalar", "switch.motion.easing refused:tokens-non-scalar"]);
    expect(result.sidecarObligations.styles.filter(o => o.disposition === "lowered").every(o => o.rule === "styles")).toBe(true);
  });
  it("keeps passive style carriers separate from omitted semantic and behavior props", () => {
    const text = accountComponent(fixture("Text"), true);
    const divider = accountComponent(fixture("Divider"), true);
    const prop = (row: typeof text, name: string) => row.props.find(p => p.name === name)!;
    expect(prop(text, "size")).toMatchObject({ disposition: "emitted-api", boundary: { disposition: "lowered", rule: "prop-size" } });
    expect(prop(text, "variant")).toMatchObject({ disposition: "emitted-api", boundary: { disposition: "lowered", rule: "prop-passive-style-axis" } });
    expect(prop(text, "as")).toMatchObject({ disposition: "not-emitted", boundary: { disposition: "refused", rule: "prop-polymorphic-tag" } });
    expect(prop(text, "truncate")).toMatchObject({ disposition: "not-emitted", boundary: { disposition: "pending", rule: "prop-passive-text-layout" } });
    expect(prop(divider, "orientation")).toMatchObject({ disposition: "emitted-api", boundary: { disposition: "lowered", rule: "prop-item-group-options" } });
    expect(prop(divider, "decorative")).toMatchObject({ disposition: "not-emitted", boundary: { disposition: "refused", rule: "prop-passive-semantic-options" } });
    expect(prop(divider, "thickness")).toMatchObject({ disposition: "not-emitted", boundary: { disposition: "pending", rule: "prop-passive-rule-override" } });
  });
  it("finds no ledgered declaration behind a lowered leaf, and names the entry when a rule claims one", () => {
    const ledger = JSON.parse(fs.readFileSync(unsupportedLedgerPath(root), "utf8")) as { entries: { reason: string }[] };
    expect(ledger.entries.filter(e => e.reason !== "uss-design-slot").length).toBeGreaterThan(20);
    expect(ledgerViolations(root)).toEqual([]);
    const committed = loadBoundary();
    const entriesOf = (boundary: Boundary) => [...new Set(ledgerViolations(root, boundary).map(v => v.slice(0, v.indexOf("):") + 1)))].sort();
    // A box-shadow lowering placed ahead of its refusal contradicts both shadow rows.
    const shadow: BoundaryRule = { id: "box-shadow-lowered", match: ["styles:/*/box-shadow/**"], disposition: "lowered", via: "test" };
    const lowered = { ...committed, rules: [shadow, ...committed.rules] };
    expect(entriesOf(lowered)).toEqual([
      "ledger Card .card--interactive:active box-shadow (uss-selector)",
      "ledger Card .card--interactive:active transform (uss-selector)",
      "ledger Card .card--interactive:hover background-color (uss-selector)",
      "ledger Card .card--interactive:hover box-shadow (uss-selector)",
      "ledger Card .card--interactive:hover transform (uss-selector)",
      "ledger Card root box-shadow (uss-property)",
      "ledger Popover content box-shadow (uss-property)",
      "ledger Switch thumb box-shadow (uss-property)",
    ]);
    expect(ledgerViolations(root, lowered)).toContain("ledger Popover content box-shadow (uss-property): styles:/content/box-shadow/fallback is classified lowered by rule box-shadow-lowered");
    // The join's findings fail the corpus audit (audit:unity-boundary --check).
    expect(auditUnityTarget(root, lowered).violations).toEqual(expect.arrayContaining(ledgerViolations(root, lowered)));
    // Without the token and selector refusals, token rows and refused-selector rows fall to the blanket lowered rules.
    const without = (id: string) => ({ ...committed, rules: committed.rules.filter(r => r.id !== id) });
    expect(entriesOf(without("tokens-non-scalar"))).toEqual([
      "ledger Button tokens button.motion.easing.standard (uss-scalar)",
      "ledger Card tokens card.elevation.raised (uss-scalar)",
      "ledger Card tokens card.elevation.resting (uss-scalar)",
      "ledger Popover tokens popover.elevation (uss-scalar)", "ledger Skeleton tokens skeleton.anim.easing (uss-scalar)",
      "ledger Switch tokens switch.color.thumb.shadow (uss-scalar)",
      "ledger Switch tokens switch.motion.easing (uss-scalar)", "ledger Tabs tokens tabs.spacing.pillPadding (uss-scalar)",
    ]);
    expect(entriesOf(without("styles-outside-native-grammar"))).toEqual([
      'ledger Accordion .accordion__trigger[aria-expanded="true"] .accordion__chevron (uss-selector)',
      "ledger Accordion @starting-style (uss-selector)",
      'ledger Button .button[aria-busy="true"] .button__loadingText (uss-selector)',
      'ledger CodeBlock .code-block[data-line-numbers="true"] .code-block__gutter (uss-selector)',
      'ledger CodeBlock .code-block__token[data-token="comment"] (uss-selector)',
      'ledger CodeBlock .code-block__token[data-token="definition"] (uss-selector)',
      'ledger CodeBlock .code-block__token[data-token="keyword"] (uss-selector)',
      'ledger CodeBlock .code-block__token[data-token="plain"] (uss-selector)',
      'ledger CodeBlock .code-block__token[data-token="property"] (uss-selector)',
      'ledger CodeBlock .code-block__token[data-token="punctuation"] (uss-selector)',
      'ledger CodeBlock .code-block__token[data-token="static"] (uss-selector)',
      'ledger CodeBlock .code-block__token[data-token="string"] (uss-selector)',
      'ledger CodeBlock .code-block__token[data-token="tag"] (uss-selector)',
      "ledger Details .details[open] .details__icon (uss-selector)",
      "ledger List .list--spacing-lg > * + * (uss-selector)",
      "ledger List .list--spacing-md > * + * (uss-selector)",
      "ledger List .list--spacing-none > * + * (uss-selector)",
      "ledger List .list--spacing-sm > * + * (uss-selector)",
      "ledger List .list--variant-divided > * + * (uss-selector)",
      "ledger List .list--variant-spaced > * (uss-selector)",
      'ledger NavList .nav-list__item[aria-current="page"] (uss-selector)',
      "ledger Skeleton .skeleton:has(.skeleton__stack) (uss-selector)",
      "ledger Skeleton .skeleton:has(.skeleton__stack) .skeleton__shape (uss-selector)",
      "ledger Switch .switch:dir(rtl) .switch__track (uss-selector)",
      "ledger Table selected (uss-selector)",
      "ledger Tabs --pills __tab--active (uss-selector)", "ledger Tabs tab--active (uss-selector)",
      'ledger Text .text[data-truncate="true"] (uss-selector)',
    ]);
  }, CORPUS_TIMEOUT_MS);
  it("counts a ledger entry no sidecar leaf backs as a violation, and skips brand design-slot and token-section rows", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "unity-ledger-"));
    try {
      const file = path.join(dir, "Controls.unsupported.json");
      fs.writeFileSync(file, JSON.stringify({ entries: [
        { component: "Switch", sourceKey: "nowhere", part: "root", property: "color", value: "#fff", reason: "uss-scalar" },
        // A property name that only prefixes a declared one (thumb transition) is not that declaration.
        { component: "Switch", sourceKey: "thumb", part: "thumb", property: "trans", value: "x", reason: "uss-scalar" },
        { component: "Switch", sourceKey: "brand:bold", part: "track", property: "background-color", value: "#000", reason: "uss-design-slot" },
        { component: "(theme)", sourceKey: "resolved.tokens.json", part: "", property: "--fsds-x", value: "1px 2px", reason: "uss-scalar" },
      ] }));
      expect(ledgerViolations(root, loadBoundary(), file)).toEqual([
        "ledger Switch nowhere color (uss-scalar): no styles leaf under /nowhere/color",
        "ledger Switch thumb trans (uss-scalar): no styles leaf under /thumb/trans",
      ]);
      expect(ledgerViolations(root, loadBoundary(), path.join(dir, "absent.json"))).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
  it("retains empty declarations, arrays and escaped property paths", () => {
    expect(declaredLeaves({ "a/b": { "~": [] }, flags: [true, false], missing: null })).toEqual(["/a~1b/~0", "/flags/0", "/flags/1", "/missing"]);
  });
});
