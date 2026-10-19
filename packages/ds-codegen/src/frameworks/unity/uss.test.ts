import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { createUnityEmitter } from "./factory.js";
import { cssVar, projectComponent, projectStylesheet, type TokenSources } from "./uss.js";
import { walkComponent } from "./walker.js";

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

/** The knob with its own sidecars replacing the composite fixture's, then `edit`. */
function knobWith(styles: Record<string, unknown>, tokens: Record<string, unknown> = {}, edit?: (c: Record<string, any>) => void): Record<string, any> {
  const c = knob();
  c.styles = styles;
  c.tokens = tokens;
  edit?.(c);
  return c;
}
/** A `size` variant axis (sm / md) with its prop, so `--sm` carriers exist. */
const sized = (c: Record<string, any>) => {
  c.variants = { size: ["sm", "md"] };
  c.types = { KnobSize: { kind: "union", values: ["sm", "md"] } };
  c.props.designed.members.push({ name: "size", propType: { kind: "ref", to: "KnobSize" }, description: "Size.", default: "md" });
};
/** A disabled prop bound to the actuator, which is what makes `:disabled` a contract fact. */
const disableable = (c: Record<string, any>) => {
  c.props.designed.members.push({ name: "disabled", propType: { kind: "boolean" }, description: "Disables the knob." });
  c.anatomy.dom.children[0].bindings.disabled = "prop:disabled";
};
const contractsRoot = path.join(root, "packages/ds-contracts");
const irOf = (c: Record<string, any>) => buildComponentIR(c as unknown as ComponentContract);

describe("Unity USS projection: selectors", () => {
  it("lowers variant, state and pseudo predicates in variant, state, pseudo order", () => {
    const { uss } = sheetOf(knobWith({
      hover: { opacity: web("0.9") },
      "--sm": { opacity: web("0.8") },
      "--sm __tail": { opacity: web("0.7") },
      ".knob--sm:has(.knob__actuator:checked) .knob__tail": { opacity: web("0.6") },
      ".knob:has(.knob__actuator:disabled) .knob__tail": { opacity: web("0.5") },
      ".knob__tail:hover": { opacity: web("0.4") },
    }, {}, c => { sized(c); disableable(c); }));
    // The host pseudo-class stays on the root class.
    expect(rule(uss, ".knob:hover")).toEqual(["opacity: 0.9;"]);
    // A variant is the class-recipe modifier: on the root, or as the part's ancestor.
    expect(rule(uss, ".knob.knob--sm")).toEqual(["opacity: 0.8;"]);
    expect(rule(uss, ".knob--sm .knob__tail")).toEqual(["opacity: 0.7;"]);
    // Checked on the control is the BooleanControl host state class, after the variant.
    expect(rule(uss, ".knob--sm.is-on .knob__tail")).toEqual(["opacity: 0.6;"]);
    // Disabled on the sibling control lowers to the host: SetEnabled(false) on the root propagates :disabled.
    expect(rule(uss, ".knob:disabled .knob__tail")).toEqual(["opacity: 0.5;"]);
    // A part's own pseudo-class stays on the part.
    expect(rule(uss, ".knob__tail:hover")).toEqual(["opacity: 0.4;"]);
  });

  it("mirrors the hidden control's focus onto the host and ledgers what USS cannot select", () => {
    const contract = knobWith({
      ".knob:has(.knob__actuator:focus-visible) .knob__tail": { opacity: web("1") },
      ".knob:has(.knob__glow:focus-visible) .knob__tail": { opacity: web("0.1") },
      ".knob:has(.knob__actuator:indeterminate) .knob__tail": { opacity: web("0.3") },
      ".knob__tail::before": { opacity: web("0.2") },
      "--lg": { opacity: web("0.15") },
    });
    const { uss, ledger } = sheetOf(contract);
    // USS cannot select a sibling of the control, so BooleanControl's is-focus host class carries it.
    expect(rule(uss, ".knob.is-focus .knob__tail")).toEqual(["opacity: 1;"]);
    expect(ledger.entries).toEqual(expect.arrayContaining([
      // glow is neither the tail nor its ancestor, and no behavior mirrors it.
      { component: "Knob", sourceKey: ".knob:has(.knob__glow:focus-visible) .knob__tail", part: "tail", property: "opacity", value: "0.1", reason: "uss-owner-mismatch" },
      { component: "Knob", sourceKey: ".knob:has(.knob__actuator:indeterminate) .knob__tail", part: "tail", property: "opacity", value: "0.3", reason: "uss-pseudo" },
      { component: "Knob", sourceKey: ".knob__tail::before", part: "tail", property: "opacity", value: "0.2", reason: "uss-pseudo-element" },
      // An undeclared modifier is refused by the IR's native grammar and carried as a selector entry.
      { component: "Knob", sourceKey: "--lg", part: "", property: "", value: "selector outside normalized native grammar", reason: "uss-selector" },
    ]));
    for (const value of ["0.1;", "0.3;", "0.2;", "0.15;"]) expect(uss).not.toContain(`opacity: ${value}`);
  });
});

describe("Unity USS projection: property table", () => {
  it("lowers web-tagged display to the flex engine with CSS's initial axis unless the rule declares one", () => {
    const { uss } = sheetOf(knobWith({
      shell: { display: web("inline-flex") },
      tail: { display: web("block") },
      glow: { display: web("inline-flex"), "flex-direction": web("column") },
    }));
    expect(rule(uss, ".knob")).toEqual(expect.arrayContaining(["display: flex;", "flex-direction: row;"]));
    expect(rule(uss, ".knob__tail")).toEqual(["display: flex;", "flex-direction: column;"]);
    expect(rule(uss, ".knob__glow")).toEqual(["display: flex;", "flex-direction: column;"]);
    expect(uss).not.toMatch(/display: (inline-flex|block|inline-block);/);
  });

  it("paints a focus outline as a border, ledgers it outside focus, and maps or refuses each value", () => {
    const { uss, ledger } = sheetOf(knobWith({
      ".knob:has(.knob__actuator:focus-visible) .knob__tail": { "outline-width": web("2px"), "outline-color": web("#ff0000"), "outline-offset": web("2px") },
      tail: { "outline-width": web("1px"), "box-shadow": web("0 1px 2px #000000"), "font-weight": web("500"), width: web("calc(100% - 2px)") },
      glow: {
        "font-weight": web("700"), "padding-inline-start": web("3px"), "border-inline-end-width": web("1px"), "box-sizing": web("border-box"),
        transition: web("opacity 120ms cubic-bezier(0.4, 0, 0.2, 1)"), color: web("#11223344"),
      },
    }));
    expect(rule(uss, ".knob.is-focus .knob__tail")).toEqual(["border-width: 2px;", "border-color: #ff0000;"]);
    // Logical sides as LTR physical sides; border-box is UI Toolkit's only box; a
    // non-keyword easing degrades to ease and is ledgered; alpha hex becomes rgba().
    expect(rule(uss, ".knob__glow")).toEqual([
      "-unity-font-style: bold;", "padding-left: 3px;", "border-right-width: 1px;",
      "transition-property: opacity;", "transition-duration: 120ms;", "transition-timing-function: ease;",
      "color: rgba(17, 34, 51, 0.267);",
    ]);
    expect(uss).not.toContain("\n.knob__tail {");
    expect(ledger.entries.map(e => [e.sourceKey, e.property, e.value, e.reason])).toEqual(expect.arrayContaining([
      // An offset ring cannot be drawn by the element's own border.
      [".knob:has(.knob__actuator:focus-visible) .knob__tail", "outline-offset", "2px", "uss-property"],
      // Outside a focus rule an outline has no USS realisation at all.
      ["tail", "outline-width", "1px", "uss-property"],
      ["tail", "box-shadow", "0 1px 2px #000000", "uss-property"],
      ["tail", "font-weight", "500", "uss-scalar"],
      ["tail", "width", "calc(100% - 2px)", "uss-scalar"],
      ["glow", "transition-timing-function", "cubic-bezier(0.4, 0, 0.2, 1)", "uss-scalar"],
    ]));
  });
});

describe("Unity USS projection: token section", () => {
  it("names tokens with the kebab-case slug and projects light, dark and brand scopes from the graph and brand layer", () => {
    const contract = knobWith(
      { glow: { color: { resolvesTo: "semantic.inkWell", fallback: "#222222" }, "border-width": { resolvesTo: "knob.glowSize", fallback: "1px" } } },
      { "knob.glowSize": { resolvesTo: "semantic.line", fallback: "1px" } },
    );
    const tokens: TokenSources = {
      graph: {
        semantic: { inkWell: { $value: { light: "#222222", dark: "#dddddd" } }, line: { $value: "1px" }, accent: { $value: { light: "#aa0000", dark: "#ff5555" } } },
        core: { hue: { $value: "#0000ff" } },
      },
      brands: [{
        id: "bold",
        light: new Map([["--fsds-semantic-ink-well", "var(--fsds-semantic-accent)"], ["--fsds-semantic-line", "2px"], ["--fsds-core-hue", "#00ff00"]]),
        dark: new Map(),
      }],
    };
    const { uss } = projectStylesheet([irOf(contract)], tokens);
    // camelCase path segments are hyphenated, on the consumer and the definition alike.
    expect(rule(uss, ".knob")).toContain("--fsds-knob-glow-size: var(--fsds-semantic-line, 1px);");
    expect(rule(uss, ".knob__glow")).toEqual(["color: var(--fsds-semantic-ink-well, #222222);", "border-width: var(--fsds-knob-glow-size, 1px);"]);
    // Only the closure (tokens a rule reads) is defined; core.hue and accent are not.
    expect(rule(uss, ".fsds-theme")).toEqual(["--fsds-semantic-ink-well: #222222;", "--fsds-semantic-line: 1px;"]);
    expect(rule(uss, ".fsds-theme.fsds-theme--dark")).toEqual(["--fsds-semantic-ink-well: #dddddd;"]);
    // A brand alias resolves through the graph; the light brand block also governs
    // dark mode, so a theme-aware alias restates its dark value in the brand dark block.
    expect(rule(uss, ".fsds-theme.fsds-brand-bold")).toEqual(["--fsds-semantic-ink-well: #aa0000;", "--fsds-semantic-line: 2px;"]);
    expect(rule(uss, ".fsds-theme.fsds-brand-bold.fsds-theme--dark")).toEqual(["--fsds-semantic-ink-well: #ff5555;"]);
    expect(uss).toContain("/* Brands: bold */");
    expect(uss).not.toContain("--fsds-core-hue");
    // Equal specificity, source order: the brand blocks follow the theme blocks.
    expect(uss.indexOf(".fsds-theme.fsds-brand-bold {")).toBeGreaterThan(uss.indexOf(".fsds-theme.fsds-theme--dark {"));
  });
});

/** Popover's surface facts with every part renamed (no corpus name survives). */
function flyout(): Record<string, any> {
  const c = JSON.parse(fs.readFileSync(path.join(contractsRoot, "components/Popover/Popover.contract.json"), "utf8")) as Record<string, any>;
  const renamed: Record<string, string> = { trigger: "opener", content: "sheet" };
  c.name = "Flyout"; c.cssPrefix = "flyout";
  c.anatomy.parts = ["root", "opener", "sheet"];
  c.anatomy.details = { root: c.anatomy.details.root, opener: { ...c.anatomy.details.trigger, subcomponent: true }, sheet: { ...c.anatomy.details.content, subcomponent: true } };
  c.surface.anchor.part = "opener"; c.surface.content.part = "sheet";
  c.interaction.content = "sheet";
  c.interaction.triggers = c.interaction.triggers.map((t: { part: string }) => ({ ...t, part: renamed[t.part] ?? t.part }));
  c.relationships = c.relationships.map((r: { from: string; to: string }) => ({ ...r, from: renamed[r.from] ?? r.from, to: renamed[r.to] ?? r.to }));
  for (const k of c.a11y?.keyboard ?? []) if (k.when && renamed[k.when]) k.when = renamed[k.when];
  c.slots = { root: c.slots.root, opener: c.slots.trigger, sheet: c.slots.content };
  return c;
}

describe("Unity USS projection: AnchoredSurface floating scope (A2)", () => {
  it("restates host definitions on the reparented content and ledgers host-qualified ones", () => {
    const c = flyout();
    c.tokens = { "flyout.inset": { literal: "6px" } };
    c.styles = {
      sheet: { padding: { resolvesTo: "flyout.inset", fallback: "6px" } },
      "--top": { "flyout.inset": web("9px") },
      "--top __sheet": { opacity: web("0.5") },
    };
    const { uss, ledger } = sheetOf(c);
    const sheet = rule(uss, ".flyout__sheet");
    // The content leaves the host's subtree, so the host's unconditional definition is restated on it.
    expect(sheet).toContain("padding: var(--fsds-flyout-inset, 6px);");
    expect(sheet).toContain("--fsds-flyout-inset: 6px;");
    // The variant-scoped definition stays on the host and cannot follow the content.
    expect(rule(uss, ".flyout.flyout--top")).toEqual(["--fsds-flyout-inset: 9px;"]);
    expect(uss).not.toContain(".flyout--top .flyout__sheet");
    expect(ledger.entries.filter(e => e.reason === "uss-floating-scope")).toEqual([
      { component: "Flyout", sourceKey: "--top", part: "sheet", property: "flyout.inset", value: "9px", reason: "uss-floating-scope" },
      { component: "Flyout", sourceKey: "--top __sheet", part: "sheet", property: "opacity", value: "0.5", reason: "uss-floating-scope" },
    ]);
  });
});

describe("Unity USS projection: gap and composed-content hosts (A4)", () => {
  const withHole = (c: Record<string, any>) => { sized(c); c.anatomy.dom.children.push({ tag: "children" }); };
  const gapped = () => knobWith({
    shell: { display: web("flex"), "flex-wrap": web("wrap"), gap: web("4px") },
    "--sm": { gap: web("2px") },
    "--sm __tail": { gap: web("1px") },
  }, {}, withHole);

  it("lowers gap to --fsds-gap and restates the owner's container facts on its composed-content host", () => {
    const contract = gapped();
    const { uss } = projectStylesheet([irOf(contract)], sources(), ir => walkComponent(ir).hosts);
    // USS rejects `gap`; the runtime Gap helper reads --fsds-gap.
    expect(uss).not.toMatch(/^ {4}gap:/m);
    expect(rule(uss, ".knob")).toEqual(expect.arrayContaining(["display: flex;", "flex-direction: row;", "flex-wrap: wrap;", "--fsds-gap: 4px;"]));
    // On the web the composed items are the shell's own flex items; in Unity they are the host's children.
    expect(rule(uss, ".knob > .knob__children")).toEqual(["display: flex;", "flex-direction: row;", "flex-wrap: wrap;", "--fsds-gap: 4px;"]);
    expect(rule(uss, ".knob.knob--sm > .knob__children")).toEqual(["--fsds-gap: 2px;"]);
    expect(rule(uss, ".knob--sm .knob__tail")).toEqual(["--fsds-gap: 1px;"]);
    // A custom property inherits where CSS gap does not: a part gapped only under a
    // variant resets to zero on its base selector.
    expect(rule(uss, ".knob__tail")).toEqual(["--fsds-gap: 0;"]);
    // Without hosts there is nothing to restate.
    expect(projectStylesheet([irOf(contract)], sources()).uss).not.toContain("> .knob__children");
  });

  it("attaches the runtime Gap helper to exactly the gapped elements", () => {
    const source = createUnityEmitter().emitComponent(irOf(gapped()), { componentsRoot: "", contractsRoot })[0]!.contents;
    // The shell (class root), the composed-content host of a gapped owner, and the tail.
    expect(source.split("\n").filter(l => l.includes("Gap.Attach")).map(l => l.trim())).toEqual(["Gap.Attach(this);", "Gap.Attach(Tail);", "Gap.Attach(children);"]);
    const ungapped = createUnityEmitter().emitComponent(irOf(knobWith({}, {}, withHole)), { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(ungapped).not.toContain("Gap.Attach");
  });
});
