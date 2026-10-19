import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { cssVar, projectComponent, projectStylesheet, type TokenSources } from "./uss.js";

const root = path.resolve(__dirname, "../../../../..");
const committedSheet = path.join(root, "packages/ds-unity/Runtime/Resources/FullStackDS/Controls.uss");
const web = (literal: string) => ({ literal, platforms: ["web"] });

/**
 * Synthetic boolean control outside the corpus: a root shell, a hidden
 * actuator owning the checked state, a thumb-like `tail` whose base transform
 * centres it vertically, and a `glow` decoration. Token and style sidecars are
 * inlined (the loader merges them the same way).
 */
function knob(): Record<string, any> {
  return {
    name: "Knob", cssPrefix: "knob", layer: "primitive", category: "action", description: "Synthetic boolean control for the USS projection.",
    anatomy: {
      parts: ["shell", "actuator", "tail", "glow"],
      details: {
        shell: { tag: "div", role: "root" },
        actuator: { tag: "button", role: "trigger", interactive: true, focusable: true },
        tail: { tag: "span", role: "decoration" },
        glow: { tag: "span", role: "decoration" },
      },
      dom: {
        tag: "div", part: "shell", children: [
          { tag: "button", part: "actuator", bindings: { "aria-pressed": "channel:on.value" } },
          { tag: "span", part: "tail" },
          { tag: "span", part: "glow" },
        ],
      },
    },
    channels: { on: { value: "on", defaultValue: "defaultOn", onChange: "onToggle", valueType: "boolean", description: "Whether the knob is on." } },
    formControl: { part: "actuator", channel: "on", valueModel: "boolean", commit: "change" },
    focus: { strategy: "auto" },
    props: {
      designed: {
        members: [
          { name: "on", propType: { kind: "boolean" }, description: "On." },
          { name: "defaultOn", propType: { kind: "boolean" }, description: "Initial." },
          { name: "onToggle", propType: { kind: "callback", params: [{ name: "on", type: { kind: "boolean" } }], returns: { kind: "void" } }, description: "Change." },
        ],
      },
    },
    states: { dimensions: { power: { category: "visibility", effect: "channel", values: ["off", "on"], initial: "off" } } },
    tokens: {
      "knob.shift.off": { literal: "0" },
      "knob.shift.on": { literal: "12px" },
      "knob.lift": { literal: "2px" },
    },
    styles: {
      shell: {
        // Theme- and brand-invariant graph token inside a two-component value.
        padding: web("var(--fsds-core-space-a, 8px) 2px"),
        // Theme-varying graph token inside a two-component value.
        margin: web("var(--fsds-semantic-ink, 4px) 0"),
        // Brand-varying graph token inside a four-component value.
        "border-width": web("var(--fsds-core-space-b, 1px) 0 0 0"),
        // A component slot redefined under a state, inside a two-component value.
        "border-radius": web("var(--fsds-knob-lift, 2px) 0"),
      },
      tail: {
        translate: { resolvesTo: "knob.shift.off", fallback: "0" },
        transform: web("translateY(-50%)"),
      },
      glow: {
        // A graph token read only through a composite, and a one-value translate.
        translate: { resolvesTo: "core.space.c", fallback: "3px" },
      },
      ".knob:has(.knob__actuator:checked) .knob__tail": {
        translate: { resolvesTo: "knob.shift.on", fallback: "12px" },
      },
      ".knob:has(.knob__actuator:checked)": {
        "knob.lift": web("5px"),
      },
    },
  };
}

/** A token graph with one invariant, one theme-varying and one brand-varying length. */
const sources = (): TokenSources => ({
  graph: {
    core: { space: { a: { $value: "8px" }, b: { $value: "1px" }, c: { $value: "3px" } } },
    semantic: { ink: { $value: { light: "4px", dark: "6px" } } },
  },
  brands: [{ id: "bold", light: new Map([[cssVar("core.space.b"), "3px"]]), dark: new Map() }],
});

const sheetOf = (contract: Record<string, any>) => projectStylesheet([buildComponentIR(contract as unknown as ComponentContract)], sources());
/** The declarations of every rule with exactly this selector, in sheet order. */
function rule(uss: string, selector: string): string[] {
  const out: string[] = [];
  for (let at = uss.indexOf(`\n${selector} {\n`); at > -1; at = uss.indexOf(`\n${selector} {\n`, at + 1)) {
    const body = uss.slice(at + selector.length + 4);
    out.push(...body.slice(0, body.indexOf("\n}")).split("\n").map(l => l.trim()));
  }
  expect(out.length, selector).toBeGreaterThan(0);
  return out;
}
/** Every consuming declaration (custom-property definitions excluded) as [property, value]. */
const consumers = (uss: string): [string, string][] =>
  [...uss.matchAll(/^ {4}([a-z-][a-z0-9-]*): ([^;]*);$/gm)].map(m => [m[1]!, m[2]!]);

/**
 * USS evaluates a var() inside a multi-component value as the whole value
 * (Unity 6000.5: `translate: var(--x, 24px) -50%` resolves to (24, 24)).
 * Written independently of uss.ts's own detector: a var() followed or
 * preceded by another component, in a space or comma list, or a var() whose
 * fallback is itself a list.
 */
function compositeVars(uss: string): [string, string][] {
  return consumers(uss).filter(([, value]) =>
    /var\([^;]*\)\s*[\s,]\s*\S/.test(value) || /\S\s*[\s,]\s*var\(/.test(value) || /var\(--[\w-]+,\s*[^()\s,]+[\s,]+[^()\s,]/.test(value));
}

describe("Unity USS projection: var() inside multi-component declarations", () => {
  it("never emits a var() inside a multi-component value, in the synthetic sheet or the committed Controls.uss", () => {
    const { uss } = sheetOf(knob());
    expect(compositeVars(uss)).toEqual([]);
    const committed = fs.readFileSync(committedSheet, "utf8");
    expect(consumers(committed).length).toBeGreaterThan(100);
    expect(compositeVars(committed)).toEqual([]);
  });

  it("substitutes a token that resolves to one value in every scope with that literal", () => {
    const { uss, ledger, components } = sheetOf(knob());
    // core.space.a is 8px in light, dark and under the bold brand; the fallback agrees.
    expect(rule(uss, ".knob")).toContain("padding: 8px 2px;");
    // Component slots with a single definition substitute too, on both translate axes.
    expect(rule(uss, ".knob__tail")).toContain("translate: 0 -50%;");
    expect(rule(uss, ".knob.is-on .knob__tail")).toEqual(["translate: 12px -50%;"]);
    // A graph token read only through a substituted composite leaves the token section.
    expect(rule(uss, ".knob__glow")).toEqual(["translate: 3px 0;"]);
    expect(components[0]!.graphTokens.has("core.space.c")).toBe(false);
    expect(uss).not.toContain(`${cssVar("core.space.c")}:`);
    expect(ledger.entries.filter(e => e.reason === "uss-var-composite").map(e => e.property).sort()).toEqual(["border-radius", "border-width", "margin"]);
  });

  it("ledgers a composite whose token varies by theme, brand or component definition instead of emitting it", () => {
    const { uss, ledger } = sheetOf(knob());
    const composite = ledger.entries.filter(e => e.reason === "uss-var-composite");
    expect(composite).toEqual([
      // knob.lift is 2px on the host and 5px under is-on.
      { component: "Knob", sourceKey: "shell", part: "shell", property: "border-radius", value: "var(--fsds-knob-lift, 2px) 0", reason: "uss-var-composite" },
      // core.space.b is 1px, 3px under the bold brand.
      { component: "Knob", sourceKey: "shell", part: "shell", property: "border-width", value: "var(--fsds-core-space-b, 1px) 0 0 0", reason: "uss-var-composite" },
      // semantic.ink is 4px light, 6px dark.
      { component: "Knob", sourceKey: "shell", part: "shell", property: "margin", value: "var(--fsds-semantic-ink, 4px) 0", reason: "uss-var-composite" },
    ]);
    expect(ledger.reasons["uss-var-composite"]).toMatch(/takes over the whole value/);
    const shell = rule(uss, ".knob");
    for (const property of ["margin", "border-width", "border-radius"]) expect(shell.some(d => d.startsWith(`${property}:`)), property).toBe(false);
  });

  it("does not substitute a graph token it cannot see: without scope values a graph composite is ledgered", () => {
    const projection = projectComponent(buildComponentIR(knob() as unknown as ComponentContract));
    expect(projection.unsupported.filter(e => e.reason === "uss-var-composite").map(e => e.property).sort()).toEqual(["border-radius", "border-width", "margin", "padding", "translate"]);
    // Literal component slots still substitute: their definitions are in the component.
    expect(projection.rules.find(r => r.selector === ".knob.is-on .knob__tail")!.declarations).toEqual([["translate", "12px -50%"]]);
  });

  it("emits both translate axes for every translate, a one-value CSS translate included", () => {
    const { uss } = sheetOf(knob());
    const translates = consumers(uss).filter(([property]) => property === "translate").map(([, value]) => value);
    expect(translates.sort()).toEqual(["0 -50%", "12px -50%", "3px 0"]);
    const committed = consumers(fs.readFileSync(committedSheet, "utf8")).filter(([property]) => property === "translate");
    expect(committed.length).toBeGreaterThan(0);
    for (const [, value] of committed) expect(value.split(" "), value).toHaveLength(2);
  });
});
