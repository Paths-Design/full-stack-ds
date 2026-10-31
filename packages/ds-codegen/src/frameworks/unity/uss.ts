/**
 * Unity USS projection (UNITY-STYLING-PROJECTION-01, brief rules S2–S6).
 *
 * Generates the package stylesheet `Runtime/Resources/FullStackDS/Controls.uss`
 * and its unsupported ledger `Controls.unsupported.json` from two sources only:
 *
 *   - the IR of every admitted component: `ir.nativeStyleRules` (per-part
 *     rules with structured variant/state/pseudo predicates and declarations),
 *     `ir.classRecipe` + `ir.variants` (modifier carriers), `ir.dom`/`ir.parts`
 *     (part classes and anatomy ancestry) and `unityLowering(ir)` (the
 *     behavior's state class and where it places it);
 *   - the built token graph: `packages/ds-tokens/generated/resolved.tokens.json`
 *     for every graph value (light, and dark where the token is theme-aware),
 *     and the `@layer brand` block of `packages/ds-tokens/generated/tokens.css`,
 *     which is the web token build's realisation of `src/brands/*.tokens.json`,
 *     for brand overrides. Reading the realised layer rather than re-running
 *     the brand processor keeps one implementation of brand composition.
 *
 * `ir.tokenScopes` is the CSS-selector view of the same token-defining facts
 * `nativeStyleRules` carries with structured predicates; the projection reads
 * the structured twin, so nothing is emitted twice.
 *
 * Token section (S2): `.fsds-theme` defines every graph token the admitted
 * components reference, `.fsds-theme.fsds-theme--dark` the theme-aware ones,
 * `.fsds-theme.fsds-brand-<id>` (and the dark variant) each brand's
 * overrides of those tokens. Equal specificity plus source order reproduces
 * the web cascade, where `@layer brand` outranks `@layer theme`. Names use
 * `tokenSlug`, the single kebab-case authority the web token build shares.
 *
 * Component section (S3–S5): one USS rule per native style rule. Token-defining
 * declarations (dotted property) become `--fsds-<slot>: var(--fsds-<graph>,
 * <fallback>)`; consuming declarations go through the CSS→USS property table
 * (`HANDLERS`), which alone decides realise / semantic no-op / ledger. The
 * `platforms` tag is informational: UI Toolkit is a flexbox engine, so
 * web-tagged layout facts lower like any other.
 *
 * Scope resolution. Two kinds of consuming declaration cannot carry a var():
 * a multi-component value (USS evaluates a var() inside one as the whole
 * value) and a keyword-valued USS property fed by a token (-unity-font-style
 * cannot map a numeric weight at runtime). Each var() is resolved instead:
 * when every theme and brand scope gives it one value the declaration takes
 * that literal (mapped to the keyword where it has one), and when a component
 * state or variant redefines the variable on the element or an ancestor, the
 * declaration is restated under that definition's selector with the value it
 * gives there. A value that varies by theme or brand, or that does not
 * resolve, is ledgered `uss-var-composite`; one that resolves to a value the
 * keyword map cannot carry is ledgered `uss-scalar`. Carrier axes and gap
 * classes are computed before that ledgering, so a rule whose only
 * declarations are ledgered still reports its carrier; the unity surface of
 * audit:variant-realization is what catches a carrier no emitted rule keys.
 *
 * A fact USS cannot realise becomes an entry in the unsupported ledger (S6),
 * never a hand-authored approximation. Nothing here branches on a component,
 * part, slot or token-path literal: only CSS property names, USS vocabulary,
 * value shapes and IR fact kinds.
 */
import fs from "node:fs";
import path from "node:path";
import type { ComponentIR } from "../../ir.js";
import type { NativeStyleDeclarationIR, NativeStylePredicateIR, NativeStyleRuleIR } from "../../native-style-rules.js";
import { tokenSlug } from "../../token-path.js";
import { disabledProp, hasChannel, unityLowering, type UnityLowering } from "./behaviors.js";

export type UssReason =
  | "uss-property"
  | "uss-scalar"
  | "uss-pseudo"
  | "uss-pseudo-element"
  | "uss-selector"
  | "uss-owner-mismatch"
  | "uss-floating-scope"
  | "uss-design-slot"
  | "uss-var-composite";

/** What each reason means; emitted beside the entries that use it. */
export const REASON_NOTES: Readonly<Record<UssReason, string>> = {
  "uss-property": "The CSS property has no USS counterpart (or only one this projection does not map); the declaration is not realised.",
  "uss-scalar": "The value is not a supported USS scalar (composite shadow, cubic-bezier easing, calc(), em or other relative units, rem outside the typography projection, a keyword USS lacks, or a weight USS cannot express); it is not emitted.",
  "uss-pseudo": "USS has no pseudo-class for this state (indeterminate).",
  "uss-pseudo-element": "USS has no ::before / ::after pseudo-elements.",
  "uss-selector": "The selector has no USS realisation: either the IR's native selector grammar refused the styles key (attribute selectors such as [aria-expanded] and web-template classes such as <part>--<state> are not contract state facts; promoting a11y-attribute selectors to IR state predicates is deferred to the IR-facts spec that follows P3), or the rule needs a negated state or a modifier class no Unity runtime sets.",
  "uss-owner-mismatch": "The state lives on a part that is neither the styled part nor its ancestor, and the attached behavior does not mirror that part's state onto the host.",
  "uss-floating-scope": "AnchoredSurface reparents its content to the panel root, so a definition or rule qualified by the host (variant modifier, state class or host pseudo-class) cannot reach the floating subtree.",
  "uss-design-slot": "A brand overrides a component design slot. Projecting it needs a nested var() fallback (design slot, then token slot), which this projection does not emit; follow-up in P4.",
  "uss-var-composite": "The declaration needs its var() resolved at generation time: in USS a var() inside a multi-component declaration (space- or comma-separated list, or a var() whose fallback is one) takes over the whole value and drops the other components without an importer warning (Unity 6000.5), and a keyword-valued USS property (-unity-font-style) cannot map a token's numeric value at runtime. The projection substitutes the value when every theme and brand scope gives it the same one, restating the declaration under each component state or variant that redefines the variable; this declaration's value varies by theme or brand, or does not resolve, so it is not emitted.",
};

export interface UnsupportedEntry {
  component: string;
  sourceKey: string;
  part: string;
  /** The CSS property (or token path) as the sidecar declares it. */
  property: string;
  value: string;
  reason: UssReason;
  /** The USS longhand the entry concerns, when the CSS property is a shorthand
   * the projection splits (transition → transition-timing-function). */
  longhand?: string;
}

export interface UssRule {
  selector: string;
  declarations: [string, string][];
}

export interface ComponentProjection {
  component: string;
  rules: UssRule[];
  unsupported: UnsupportedEntry[];
  /** Graph token paths the emitted rules reference (the token-section closure). */
  graphTokens: Set<string>;
  /** Variant axes for which a `.<prefix>--<value>` carrier is emitted. */
  carrierAxes: Set<string>;
  /** Design-slot custom property → the consuming declaration it would override. */
  designSlots: Map<string, { sourceKey: string; part: string; property: string }>;
  /** Class names (no dot) of the elements whose rules carry a gap fact; the
   * walker attaches the runtime Gap helper to exactly these. */
  gapClasses: Set<string>;
}

/**
 * A composed-content wrapper the walker inserts under an owner element (the
 * private insertion host that becomes contentContainer). Class names, no dot.
 * The walker owns this anatomy fact; the projection receives it.
 */
export interface ContentHost {
  owner: string;
  host: string;
}

/**
 * USS has no `gap`. A gap declaration lowers to this custom property on the
 * same selector, and the runtime Gap helper (Runtime/Gap.cs) reads it through
 * customStyle and spaces the element's children along its flex-direction.
 */
export const GAP_PROPERTY = "--fsds-gap";

/**
 * Container-level properties a composed-content wrapper restates from its
 * owner: on the web the composed items are the owner's own flex items, in
 * Unity they are the wrapper's children, so the owner's container facts must
 * reach the wrapper (`<owner selector> > .<host>`).
 */
const CONTAINER_PROPERTIES = new Set(["display", "flex-direction", "flex-wrap", "align-items", "align-content", "justify-content", GAP_PROPERTY]);

/** NativeStyleRuleIR's root-part sentinel (native-style-rules.ts `selectorPlan`). */
const NATIVE_ROOT_PART = "root";
/** Source: `ContractPartDetails.role` enum value naming the component root part. */
const ROOT_ROLE = "root";

// ---------------------------------------------------------------------------
// Value vocabulary (USS scalars)
// ---------------------------------------------------------------------------

/** Split on a separator at parenthesis depth zero. */
export function splitTop(value: string, separator: " " | ","): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of value.trim()) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    const splits = depth === 0 && (separator === " " ? /\s/.test(char) : char === ",");
    if (splits) {
      if (current.trim()) out.push(current.trim());
      current = "";
    } else current += char;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

const NUMBER = /^-?(?:\d+|\d*\.\d+)$/;
const PX = /^-?(?:\d+|\d*\.\d+)px$/;
const REM = /^-?(?:\d+|\d*\.\d+)rem$/;
const PERCENT = /^-?(?:\d+|\d*\.\d+)%$/;
const TIME = /^(?:\d+|\d*\.\d+)(?:ms|s)$/;
const ANGLE = /^-?(?:\d+|\d*\.\d+)(?:deg|rad|grad|turn)$/;
const VAR = /^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*([\s\S]*))?\)$/;

type Scalar = (value: string) => string | undefined;

/**
 * Unity has no CSS root font-size. This projection fixes 1rem at 16 USS px;
 * it does not follow a consumer's browser root size or the element's font.
 * Source fact: CSS rem length; applies by: value unit / typography property;
 * removable when: the target carries a configurable root-length context.
 */
export const REM_BASELINE_PX = 16;
const remPixels: Scalar = value => {
  if (!REM.test(value)) return undefined;
  const pixels = Number(value.slice(0, -3)) * REM_BASELINE_PX;
  return Number.isFinite(pixels) ? `${pixels}px` : undefined;
};

/** `var(--x[, fallback])` with the fallback validated by `inner`. */
function varOf(value: string, inner: Scalar): string | undefined {
  const match = VAR.exec(value.trim());
  if (!match) return undefined;
  if (match[2] === undefined) return `var(${match[1]})`;
  const fallback = inner(match[2].trim());
  return fallback === undefined ? undefined : `var(${match[1]}, ${fallback})`;
}

const hexPair = (hex: string, i: number): number => parseInt(hex.slice(i, i + 2), 16);
const alpha = (byte: number): string => String(Math.round((byte / 255) * 1000) / 1000);

/** USS colours: #rgb / #rrggbb as authored; alpha hex expands to rgba();
 * rgb()/rgba() with comma syntax; `transparent` → rgba(0, 0, 0, 0). */
export const color: Scalar = value => {
  const v = value.trim();
  if (v.startsWith("var(")) return varOf(v, color);
  const hex = /^#([0-9a-fA-F]{3,8})$/.exec(v)?.[1];
  if (hex) {
    if (hex.length === 3 || hex.length === 6) return `#${hex.toLowerCase()}`;
    const full = hex.length === 4 ? hex.split("").map(c => c + c).join("") : hex.length === 8 ? hex : undefined;
    if (!full) return undefined;
    return `rgba(${hexPair(full, 0)}, ${hexPair(full, 2)}, ${hexPair(full, 4)}, ${alpha(hexPair(full, 6))})`;
  }
  const fn = /^(rgba?)\(([^()]*)\)$/i.exec(v);
  if (fn) {
    const args = fn[2]!.split(",").map(a => a.trim());
    if (!args.every(a => NUMBER.test(a))) return undefined;
    if (args.length === 3) return `rgb(${args.join(", ")})`;
    if (args.length === 4) return `rgba(${args.join(", ")})`;
    return undefined;
  }
  if (v === "transparent") return "rgba(0, 0, 0, 0)";
  return undefined;
};

interface LengthOptions { percent?: boolean; rem?: boolean; keywords?: readonly string[] }
const length = (options: LengthOptions = {}): Scalar => {
  const self: Scalar = value => {
    const v = value.trim();
    if (v.startsWith("var(")) return varOf(v, self);
    if (v === "0" || PX.test(v)) return v;
    if (options.rem && REM.test(v)) return remPixels(v);
    if (options.percent && PERCENT.test(v)) return v;
    if (options.keywords?.includes(v)) return v;
    return undefined;
  };
  return self;
};
const number: Scalar = value => { const v = value.trim(); return v.startsWith("var(") ? varOf(v, number) : NUMBER.test(v) ? v : undefined; };
const time: Scalar = value => { const v = value.trim(); return v.startsWith("var(") ? varOf(v, time) : TIME.test(v) || v === "0" ? v : undefined; };
const keyword = (allowed: readonly string[]): Scalar => {
  const self: Scalar = value => { const v = value.trim(); return v.startsWith("var(") ? varOf(v, self) : allowed.includes(v) ? v : undefined; };
  return self;
};

/** The -unity-font-style keyword for a CSS weight; undefined for intermediate
 * weights, which USS can only reach through a separate font asset. */
export const fontStyle = (value: string): string | undefined => {
  const v = value.trim();
  if (v === "bold" || v === "bolder" || (NUMBER.test(v) && Number(v) >= 600)) return "bold";
  if (v === "normal" || v === "400") return "normal";
  return undefined;
};

/** Up to `max` space-separated values of one kind (padding, margin, radius). */
const many = (kind: Scalar, max: number): Scalar => value => {
  const parts = splitTop(value, " ");
  if (!parts.length || parts.length > max) return undefined;
  const lowered = parts.map(kind);
  return lowered.every((p): p is string => p !== undefined) ? lowered.join(" ") : undefined;
};

/**
 * A token value as a USS scalar, independent of the consuming property: a
 * colour, length, percentage, time, angle, unitless number or bare keyword.
 * Composite values (JSON-serialised shadows, multi-part shadows, functions
 * other than rgb/rgba, quoted font stacks, em) are not scalars. Rem tokens
 * use the same fixed baseline as typography consumers, including scope values.
 */
export const tokenScalar: Scalar = value => {
  const v = value.trim();
  if (v.startsWith("var(")) return varOf(v, tokenScalar);
  if (REM.test(v)) return remPixels(v);
  if (v.startsWith("#") || /^rgba?\(/i.test(v) || v === "transparent") return color(v);
  if (v === "0" || PX.test(v) || PERCENT.test(v) || TIME.test(v) || ANGLE.test(v) || NUMBER.test(v)) return v;
  if (/^[a-z][a-z-]*$/.test(v)) return v;
  return undefined;
};

// ---------------------------------------------------------------------------
// Property table (S5)
// ---------------------------------------------------------------------------

interface DeclarationContext {
  /** Raw CSS value. */
  value: string;
  /** Wraps a lowered fallback in the declaration's token reference, if any. */
  wrap: (fallback: string) => string;
  /** The token the declaration reads (a component slot or graph path), if any. */
  token?: string;
  /** The rule's predicates include focus (the focus-indicator idiom applies). */
  focus: boolean;
  /** Other CSS properties the same rule declares. */
  siblings: ReadonlyMap<string, string>;
  /** Vertical translate a base `transform` on this part contributes. */
  baseTranslateY?: string;
}

type Outcome =
  /** `resolve`: every declaration in `set` is a single token reference whose
   * keyword is decided by the token's resolved value (scope resolution), not by
   * the sidecar fallback. */
  | { set: [string, string][]; ledger?: { property: string; value: string; reason: UssReason }[]; resolve?: (value: string) => string | undefined }
  | { noop: true }
  | { reason: UssReason };

type Handler = (d: DeclarationContext) => Outcome;

const realise = (uss: string, kind: Scalar): Handler => d => {
  const v = kind(d.value);
  return v === undefined ? { reason: "uss-scalar" } : { set: [[uss, d.wrap(v)]] };
};
/** Same property name in USS. */
const same = (kind: Scalar): ((property: string) => Handler) => property => realise(property, kind);

const PX_ONLY = length();
const TYPOGRAPHY_LENGTH = length({ rem: true });
const PX_AUTO = length({ keywords: ["auto"] });
const PX_PERCENT_AUTO = length({ percent: true, keywords: ["auto"] });
const PX_NONE = length({ keywords: ["none"] });
const PX_PERCENT = length({ percent: true });

const FLEX_ALIGN = ["auto", "flex-start", "flex-end", "center", "stretch"] as const;
const BORDER_SIDES = ["top", "right", "bottom", "left"] as const;
const LOGICAL_SIDES: Readonly<Record<string, string>> = { "block-start": "top", "block-end": "bottom", "inline-start": "left", "inline-end": "right" };
/** USS easing keywords (transition-timing-function). */
const USS_EASINGS = new Set([
  "ease", "ease-in", "ease-out", "ease-in-out", "linear",
  ...["sine", "cubic", "circ", "elastic", "back", "bounce"].flatMap(curve => [`ease-in-${curve}`, `ease-out-${curve}`, `ease-in-out-${curve}`]),
]);
/** CSS border/outline styles; USS borders are always solid. */
const LINE_STYLES = new Set(["none", "hidden", "dotted", "dashed", "solid", "double", "groove", "ridge", "inset", "outset"]);

function borderStyle(value: string, widthProperty: string): Outcome {
  const v = value.trim();
  if (v === "solid") return { noop: true };
  if (v === "none" || v === "hidden") return { set: [[widthProperty, "0"]] };
  return { reason: "uss-scalar" };
}

/** `border[-side]: <width> <style> <color>` in any order. */
function borderShorthand(d: DeclarationContext, side?: string): Outcome {
  const prefix = side ? `border-${side}` : "border";
  const parts = splitTop(d.value, " ");
  if (parts.length === 1 && (parts[0] === "0" || parts[0] === "none")) return { set: [[`${prefix}-width`, "0"]] };
  const set: [string, string][] = [];
  for (const part of parts) {
    if (LINE_STYLES.has(part)) {
      const style = borderStyle(part, `${prefix}-width`);
      if ("reason" in style) return style;
      if ("set" in style) set.push(...style.set);
      continue;
    }
    const width = PX_ONLY(part);
    if (width !== undefined) { set.push([`${prefix}-width`, width]); continue; }
    const paint = color(part);
    if (paint !== undefined) { set.push([`${prefix}-color`, paint]); continue; }
    return { reason: "uss-scalar" };
  }
  return { set };
}

/** Parsed `transform` translate/rotate/scale functions; undefined for anything else. */
function parseTransform(value: string): { x?: string; y?: string; rotate?: string; scale?: string } | undefined {
  if (value.trim() === "none") return {};
  const out: { x?: string; y?: string; rotate?: string; scale?: string } = {};
  for (const fn of splitTop(value, " ")) {
    const match = /^(translateX|translateY|translate|rotate|scale)\(([^()]*)\)$/.exec(fn);
    if (!match) return undefined;
    const args = match[2]!.split(",").map(a => a.trim());
    const offset = (v: string | undefined) => (v === undefined ? undefined : PX_PERCENT(v));
    if (match[1] === "translateX") out.x = offset(args[0]) ?? "!";
    else if (match[1] === "translateY") out.y = offset(args[0]) ?? "!";
    else if (match[1] === "translate") { out.x = offset(args[0]) ?? "!"; out.y = args[1] === undefined ? "0" : offset(args[1]) ?? "!"; }
    else if (match[1] === "rotate") out.rotate = ANGLE.test(args[0]!) || args[0] === "0" ? args[0] : "!";
    else out.scale = args.every(a => NUMBER.test(a)) ? (args.length === 1 ? `${args[0]} ${args[0]}` : args.join(" ")) : "!";
  }
  return Object.values(out).includes("!") ? undefined : out;
}

/** `transition: <property> <duration> [<easing>] [<delay>], …` → USS longhands. */
const transition: Handler = d => {
  const properties: string[] = [], durations: string[] = [], easings: string[] = [], delays: string[] = [];
  const ledger: { property: string; value: string; reason: UssReason }[] = [];
  for (const item of splitTop(d.value, ",")) {
    const tokens = splitTop(item, " ");
    const timeLike = (t: string) => TIME.test(t) || t.startsWith("var(");
    const property = tokens[0] && !timeLike(tokens[0]) && !USS_EASINGS.has(tokens[0]) && !/^(cubic-bezier|steps)\(/.test(tokens[0]) ? tokens.shift()! : "all";
    let duration: string | undefined, easing: string | undefined, delay: string | undefined;
    for (const token of tokens) {
      if (TIME.test(token) || (token.startsWith("var(") && duration === undefined)) {
        if (duration === undefined) duration = token; else delay = token;
      } else if (easing === undefined) easing = token;
      else delay = token;
    }
    const uss = property === "all" ? "all" : TRANSITIONABLE.has(property) ? property : undefined;
    if (!uss) { ledger.push({ property: "transition-property", value: item, reason: "uss-property" }); continue; }
    const loweredDuration = duration === undefined ? "0s" : time(duration);
    if (loweredDuration === undefined) { ledger.push({ property: "transition-duration", value: item, reason: "uss-scalar" }); continue; }
    if (easing !== undefined && !USS_EASINGS.has(easing)) {
      ledger.push({ property: "transition-timing-function", value: easing, reason: "uss-scalar" });
      easing = undefined;
    }
    properties.push(uss);
    durations.push(loweredDuration);
    easings.push(easing ?? "ease");
    delays.push(delay === undefined ? "0s" : time(delay) ?? "0s");
  }
  if (!properties.length) return ledger.length ? { set: [], ledger } : { reason: "uss-scalar" };
  const set: [string, string][] = [
    ["transition-property", properties.join(", ")],
    ["transition-duration", durations.join(", ")],
    ["transition-timing-function", easings.join(", ")],
  ];
  if (delays.some(x => x !== "0s")) set.push(["transition-delay", delays.join(", ")]);
  return { set, ledger };
};

/** USS property names a transition may name (CSS spellings realised as-is). */
const TRANSITIONABLE = new Set([
  "color", "background-color", "border-color", ...BORDER_SIDES.map(s => `border-${s}-color`),
  "border-width", ...BORDER_SIDES.map(s => `border-${s}-width`), "border-radius",
  "width", "height", "min-width", "min-height", "max-width", "max-height",
  "top", "right", "bottom", "left", "opacity", "translate", "rotate", "scale", "transform-origin",
  "margin", "padding", ...BORDER_SIDES.flatMap(s => [`margin-${s}`, `padding-${s}`]),
  "flex-grow", "flex-shrink", "flex-basis", "font-size", "letter-spacing",
]);

/**
 * CSS property → USS lowering, keyed by CSS property only. A property absent
 * from this table is ledgered `uss-property`. Percentages are admitted for
 * width/height/top/left/translate and (pending the import oracle)
 * border-radius only.
 */
export const HANDLERS: Readonly<Record<string, Handler>> = (() => {
  const table: Record<string, Handler> = {};
  // Box model: physical sides as-is, logical sides as LTR physical sides.
  for (const box of ["padding", "margin"] as const) {
    const kind = box === "margin" ? PX_AUTO : PX_ONLY;
    table[box] = realise(box, many(kind, 4));
    for (const side of BORDER_SIDES) table[`${box}-${side}`] = same(kind)(`${box}-${side}`);
    for (const [logical, physical] of Object.entries(LOGICAL_SIDES)) table[`${box}-${logical}`] = realise(`${box}-${physical}`, kind);
    for (const axis of ["block", "inline"] as const) {
      const [start, end] = axis === "block" ? ["top", "bottom"] : ["left", "right"];
      table[`${box}-${axis}`] = d => {
        const parts = splitTop(d.value, " ").map(kind);
        if (!parts.length || parts.length > 2 || parts.some(p => p === undefined)) return { reason: "uss-scalar" };
        return { set: [[`${box}-${start}`, d.wrap(parts[0]!)], [`${box}-${end}`, d.wrap(parts[1] ?? parts[0]!)]] };
      };
    }
  }
  for (const side of ["top", "left"] as const) table[side] = same(PX_PERCENT_AUTO)(side);
  for (const side of ["right", "bottom"] as const) table[side] = same(PX_AUTO)(side);
  for (const [logical, physical] of Object.entries(LOGICAL_SIDES)) table[`inset-${logical}`] = realise(physical, physical === "top" || physical === "left" ? PX_PERCENT_AUTO : PX_AUTO);
  for (const size of ["width", "height"] as const) {
    table[size] = same(PX_PERCENT_AUTO)(size);
    table[`min-${size}`] = same(PX_AUTO)(`min-${size}`);
    table[`max-${size}`] = same(PX_NONE)(`max-${size}`);
  }
  // Flexbox. UI Toolkit lays every element out as a flex container whose
  // initial flex-direction is column, while CSS flex's initial axis is row
  // and block layout stacks children: the display lowering carries CSS's
  // initial main axis unless the rule declares flex-direction itself.
  table["display"] = d => {
    const v = d.value.trim();
    const axis = (initial: string): [string, string][] => (d.siblings.has("flex-direction") ? [] : [["flex-direction", initial]]);
    if (v === "flex" || v === "inline-flex") return { set: [["display", "flex"], ...axis("row")] };
    if (v === "block" || v === "inline-block") return { set: [["display", "flex"], ...axis("column")] };
    if (v === "none") return { set: [["display", "none"]] };
    return { reason: "uss-scalar" };
  };
  table["flex-direction"] = same(keyword(["row", "row-reverse", "column", "column-reverse"]))("flex-direction");
  table["flex-wrap"] = same(keyword(["nowrap", "wrap", "wrap-reverse"]))("flex-wrap");
  table["flex-grow"] = same(number)("flex-grow");
  table["flex-shrink"] = same(number)("flex-shrink");
  table["flex-basis"] = same(PX_PERCENT_AUTO)("flex-basis");
  table["flex"] = realise("flex", many(v => number(v) ?? PX_PERCENT_AUTO(v) ?? (v === "none" ? v : undefined), 3));
  for (const align of ["align-items", "align-self", "align-content"] as const) table[align] = same(keyword(FLEX_ALIGN))(align);
  table["justify-content"] = same(keyword(["flex-start", "flex-end", "center", "space-between", "space-around"]))("justify-content");
  // USS rejects `gap` (Unity 6000.5 importer: "Unknown property"): it lowers
  // to GAP_PROPERTY, realised at runtime by Gap.Attach (walker.ts). Row and
  // column gaps are not mapped.
  table["gap"] = realise(GAP_PROPERTY, PX_ONLY);
  table["position"] = same(keyword(["relative", "absolute"]))("position");
  table["overflow"] = same(keyword(["hidden", "visible"]))("overflow");
  table["white-space"] = same(keyword(["normal", "nowrap"]))("white-space");
  table["text-overflow"] = same(keyword(["clip", "ellipsis"]))("text-overflow");
  table["visibility"] = same(keyword(["visible", "hidden"]))("visibility");
  table["opacity"] = same(number)("opacity");
  // UI Toolkit boxes are always border-box: border-box is a no-op.
  table["box-sizing"] = d => (d.value.trim() === "border-box" ? { noop: true } : { reason: "uss-scalar" });
  // USS cursors are texture resources, not CSS keywords.
  table["cursor"] = () => ({ reason: "uss-scalar" });
  // Paint and borders.
  table["color"] = same(color)("color");
  table["background-color"] = same(color)("background-color");
  table["background"] = d => {
    const paint = color(d.value);
    return paint === undefined ? { reason: "uss-scalar" } : { set: [["background-color", d.wrap(paint)]] };
  };
  table["border-color"] = same(color)("border-color");
  table["border-width"] = realise("border-width", many(PX_ONLY, 4));
  table["border-radius"] = realise("border-radius", many(PX_PERCENT, 4));
  table["border-style"] = d => borderStyle(d.value, "border-width");
  table["border"] = d => borderShorthand(d);
  for (const side of BORDER_SIDES) {
    table[`border-${side}-color`] = same(color)(`border-${side}-color`);
    table[`border-${side}-width`] = same(PX_ONLY)(`border-${side}-width`);
    table[`border-${side}-style`] = d => borderStyle(d.value, `border-${side}-width`);
    table[`border-${side}`] = d => borderShorthand(d, side);
  }
  // Logical border sides as LTR physical sides, like the box model above.
  for (const [logical, physical] of Object.entries(LOGICAL_SIDES)) {
    for (const facet of ["color", "width", "style"] as const) table[`border-${logical}-${facet}`] = table[`border-${physical}-${facet}`]!;
    table[`border-${logical}`] = table[`border-${physical}`]!;
  }
  for (const corner of ["top-left", "top-right", "bottom-right", "bottom-left"] as const) {
    table[`border-${corner}-radius`] = same(PX_PERCENT)(`border-${corner}-radius`);
  }
  // Focus indicator idiom: UI Toolkit has no outline, so inside a rule whose
  // predicates include focus the outline paints the element's border.
  // Outside a focus rule an outline has no USS realisation; an offset ring
  // cannot be drawn by a border at all.
  table["outline-width"] = d => (d.focus ? realise("border-width", PX_ONLY)(d) : { reason: "uss-property" });
  table["outline-color"] = d => (d.focus ? realise("border-color", color)(d) : { reason: "uss-property" });
  table["outline-style"] = d => (d.focus ? borderStyle(d.value, "border-width") : { reason: "uss-property" });
  table["outline"] = d => (d.focus ? borderShorthand(d) : { reason: "uss-property" });
  table["outline-offset"] = d => (d.focus && d.value.trim() === "0" ? { noop: true } : { reason: "uss-property" });
  // Typography.
  table["font-size"] = same(TYPOGRAPHY_LENGTH)("font-size");
  table["letter-spacing"] = same(TYPOGRAPHY_LENGTH)("letter-spacing");
  // -unity-font-style takes keywords, so a token-backed weight cannot stay a
  // var(): it is resolved across scopes and the resolved value is mapped.
  table["font-weight"] = d => {
    if (d.token) return { set: [["-unity-font-style", d.wrap(d.value.trim())]], resolve: fontStyle };
    const keyword = fontStyle(d.value);
    return keyword === undefined ? { reason: "uss-scalar" } : { set: [["-unity-font-style", keyword]] };
  };
  // Transforms. CSS composes `translate` with `transform`; USS has a single
  // translate, so a part's translate carries the vertical offset of the
  // transform its base rule declares.
  table["translate"] = d => {
    const parts = splitTop(d.value, " ");
    const x = PX_PERCENT(parts[0] ?? "");
    const own = d.siblings.has("transform") ? parseTransform(d.siblings.get("transform")!) : undefined;
    const y = parts[1] !== undefined ? PX_PERCENT(parts[1]) : own?.y ?? d.baseTranslateY ?? "0";
    if (x === undefined || y === undefined || parts.length > 2) return { reason: "uss-scalar" };
    return { set: [["translate", `${d.wrap(x)} ${y}`]] };
  };
  table["transform"] = d => {
    const parsed = parseTransform(d.value);
    if (!parsed) return { reason: "uss-scalar" };
    const set: [string, string][] = [];
    // A translate in the same rule already composed this offset.
    if ((parsed.x !== undefined || parsed.y !== undefined) && !d.siblings.has("translate")) set.push(["translate", `${parsed.x ?? "0"} ${parsed.y ?? "0"}`]);
    if (parsed.x !== undefined && parsed.x !== "0" && d.siblings.has("translate")) return { reason: "uss-property" };
    if (parsed.rotate !== undefined) set.push(["rotate", parsed.rotate]);
    if (parsed.scale !== undefined) set.push(["scale", parsed.scale]);
    return set.length ? { set } : { noop: true };
  };
  table["rotate"] = same(v => (ANGLE.test(v.trim()) || v.trim() === "0" ? v.trim() : undefined))("rotate");
  table["scale"] = d => {
    const parts = splitTop(d.value, " ");
    if (!parts.length || parts.length > 2 || !parts.every(p => NUMBER.test(p))) return { reason: "uss-scalar" };
    return { set: [["scale", parts.length === 1 ? `${parts[0]} ${parts[0]}` : parts.join(" ")]] };
  };
  table["transform-origin"] = same(many(v => PX_PERCENT(v) ?? keyword(["left", "right", "top", "bottom", "center"])(v), 2))("transform-origin");
  table["transition"] = transition;
  return table;
})();

// ---------------------------------------------------------------------------
// Composite declarations
// ---------------------------------------------------------------------------

/** Components of a value: space- and comma-separated at depth zero, a lone
 * var() counting as many as its fallback has. */
function width(value: string): number {
  const components = splitTop(value, ",").flatMap(item => splitTop(item, " "));
  if (components.length !== 1) return components.length;
  const fallback = VAR.exec(components[0]!)?.[2];
  return fallback === undefined ? 1 : width(fallback);
}

/** A USS declaration value USS cannot evaluate as written: a var() inside a
 * multi-component value. Custom-property definitions are single scalars. */
export const isComposite = (value: string): boolean => value.includes("var(") && width(value) > 1;

/**
 * A graph custom property's value in every scope the token section emits
 * (light, dark, each brand in both themes), undefined in a scope the sheet
 * leaves it undefined; undefined as a whole when the name is not a graph
 * token. Without it (the walker's projection) a graph reference does not
 * resolve and is ledgered.
 */
export type ScopeValues = (name: string) => (string | undefined)[] | undefined;

const VAR_READ = /var\(\s*(--[A-Za-z0-9_-]+)/g;
const GRAPH_VAR_NO_FALLBACK = /var\(\s*(--[A-Za-z0-9_-]+)\s*\)/g;

// ---------------------------------------------------------------------------
// Component section (S3, S4)
// ---------------------------------------------------------------------------

interface Context {
  ir: ComponentIR;
  lowering: UnityLowering;
  prefix: string;
  rootSelector: string;
  /** Part (or the IR root sentinel) → its class selector. */
  selectorOf: Map<string, string>;
  /** Part → its nearest ancestor part (the root part at the top). */
  parentOf: Map<string, string>;
  /** Parts AnchoredSurface reparents out of the host (content and descendants). */
  floating: Set<string>;
  disabledProp?: string;
  /** Component slot names: every token-defining declaration's property. */
  slots: Set<string>;
  /** Part → vertical translate its unpredicated rule's transform declares. */
  baseTranslateY: Map<string, string>;
}

function buildContext(ir: ComponentIR, lowering: UnityLowering): Context {
  const prefix = ir.cssPrefix;
  const rootSelector = `.${prefix}`;
  // Mirrors the walker: the dom root part (or the root-role part of a
  // parts-only contract) carries the bare prefix class, every other part
  // `<prefix>__<part>`.
  const rootPart = ir.dom?.part ?? (ir.parts.find(p => p.details?.role === ROOT_ROLE) ?? ir.parts.find(p => p.isRootOnly))?.name;
  const selectorOf = new Map<string, string>(ir.parts.map(p => [p.name, `.${prefix}__${p.name}`]));
  selectorOf.set(NATIVE_ROOT_PART, rootSelector);
  if (rootPart) selectorOf.set(rootPart, rootSelector);
  const parentOf = new Map<string, string>();
  const visit = (node: ComponentIR["dom"], parent: string | undefined): void => {
    if (!node) return;
    const here = node.part ?? parent;
    if (node.part && parent !== undefined && node.part !== parent) parentOf.set(node.part, parent);
    for (const child of node.children) visit(child, here);
  };
  visit(ir.dom, undefined);
  for (const part of ir.parts) {
    if (selectorOf.get(part.name) !== rootSelector && !parentOf.has(part.name)) parentOf.set(part.name, rootPart ?? NATIVE_ROOT_PART);
  }
  const floating = new Set<string>();
  if (lowering.behavior === "AnchoredSurface") {
    for (const part of selectorOf.keys()) {
      for (let cursor: string | undefined = part; cursor !== undefined; cursor = parentOf.get(cursor)) {
        if (cursor === lowering.content.name) { floating.add(part); break; }
      }
    }
  }
  const rules = ir.nativeStyleRules?.rules ?? [];
  const slots = new Set(rules.flatMap(r => r.declarations.filter(d => d.property.includes(".")).map(d => d.property)));
  const baseTranslateY = new Map<string, string>();
  for (const rule of rules) {
    if (rule.predicates.length || rule.pseudo) continue;
    const transform = rule.declarations.find(d => d.property === "transform");
    const y = transform ? parseTransform(transform.value)?.y : undefined;
    if (y !== undefined) baseTranslateY.set(rule.part, y);
  }
  return { ir, lowering, prefix, rootSelector, selectorOf, parentOf, floating, disabledProp: disabledProp(ir), slots, baseTranslateY };
}

/** True when `ancestor` is a strict anatomical ancestor of `part`. */
function isAncestor(ctx: Context, ancestor: string, part: string): boolean {
  for (let cursor = ctx.parentOf.get(part); cursor !== undefined; cursor = ctx.parentOf.get(cursor)) {
    if (cursor === ancestor || ctx.selectorOf.get(cursor) === ctx.selectorOf.get(ancestor)) return true;
  }
  return false;
}

interface Lowered { selector: string; carriers: string[]; hostQualified: boolean }

const PREDICATE_ORDER: Readonly<Record<NativeStylePredicateIR["kind"], number>> = {
  variant: 0, checked: 1, present: 1, indeterminate: 1, disabled: 2, hover: 2, active: 2, focus: 2,
};

/**
 * S4 selector lowering. Host-level qualifiers (variant modifier, the
 * behavior's host state class, host pseudo-classes, BooleanControl's
 * mirrored pointer/focus classes) build the host compound; part-level ones
 * (native pseudo-classes, ItemGroup's part state class) attach to the part
 * or to the ancestor part that owns the state. Order: variant, state, pseudo.
 */
export function lowerSelector(ctx: Context, rule: NativeStyleRuleIR): Lowered | { reason: UssReason } {
  const target = ctx.selectorOf.get(rule.part);
  if (!target) return { reason: "uss-selector" };
  if (rule.pseudo) return { reason: "uss-pseudo-element" };
  const isRoot = target === ctx.rootSelector;
  const hostVariant: string[] = [], hostState: string[] = [], hostPseudo: string[] = [];
  const own: string[] = [];
  const owners = new Map<string, string[]>();
  const carriers: string[] = [];
  const { lowering } = ctx;
  const channel = hasChannel(lowering) ? lowering.channel : undefined;
  const atOwner = (owner: string | undefined, qualifier: string, host: string[]): UssReason | undefined => {
    const ownerSelector = owner === undefined ? ctx.rootSelector : ctx.selectorOf.get(owner);
    if (ownerSelector === undefined) return "uss-owner-mismatch";
    if (ownerSelector === target) { own.push(qualifier); return undefined; }
    if (ownerSelector === ctx.rootSelector) { host.push(qualifier); return undefined; }
    if (owner !== undefined && isAncestor(ctx, owner, rule.part)) { owners.set(owner, [...(owners.get(owner) ?? []), qualifier]); return undefined; }
    return "uss-owner-mismatch";
  };
  // The behavior's state class, at the placement unityLowering's behavior
  // defines: BooleanControl and AnchoredSurface toggle it on the host,
  // ItemGroup on its paired trigger/content parts.
  const placeState = (owner: string | undefined): UssReason | undefined => {
    // Passive content and the native action control project no channel-driven
    // state class; only the three channel behaviors own one.
    if (lowering.behavior === "Passive" || lowering.behavior === "Action" || lowering.behavior === "Progress" || lowering.behavior === "ComposedAction" || lowering.behavior === "TextInput" || lowering.behavior === "Toast" || lowering.behavior === "Slots" || lowering.behavior === "Coachmark" || lowering.behavior === "Anchor" || lowering.behavior === "Media") return "uss-selector";
    // A hover-open surface projects no single open-state class.
    if (lowering.stateClass === undefined) return "uss-selector";
    const stateClass = `.${lowering.stateClass}`;
    if (lowering.behavior === "ItemGroup") {
      const paired = owner !== undefined && (owner === lowering.trigger.name || owner === lowering.content.name);
      return paired ? atOwner(owner, stateClass, hostState) : "uss-owner-mismatch";
    }
    const control = lowering.behavior === "BooleanControl" ? lowering.control.name : lowering.trigger.name;
    const onHost = owner === undefined || owner === control || ctx.selectorOf.get(owner) === ctx.rootSelector;
    if (!onHost) return "uss-owner-mismatch";
    hostState.push(stateClass);
    return undefined;
  };
  const predicates = [...rule.predicates].sort((a, b) => PREDICATE_ORDER[a.kind] - PREDICATE_ORDER[b.kind]);
  for (const predicate of predicates) {
    let failure: UssReason | undefined;
    switch (predicate.kind) {
      case "variant": {
        if (channel !== undefined && predicate.value === "true" && predicate.axis === channel.valueProp) { failure = placeState(undefined); break; }
        if (predicate.value === "true" && predicate.axis === ctx.disabledProp) { failure = atOwner(undefined, ":disabled", hostPseudo); break; }
        const modifier = ctx.ir.classRecipe.valueModifiers.find(m => m.propName === predicate.axis);
        if (!modifier || !ctx.ir.variants[predicate.axis]?.includes(predicate.value)) { failure = "uss-selector"; break; }
        hostVariant.push(`.${ctx.prefix}--${modifier.valuePrefix ?? ""}${predicate.value}`);
        carriers.push(predicate.axis);
        break;
      }
      case "checked":
        failure = predicate.value ? placeState(predicate.ownerPart) : "uss-selector";
        break;
      case "present":
        failure = lowering.behavior === "ItemGroup" && predicate.ownerPart === lowering.content.name
          ? placeState(predicate.ownerPart) : "uss-selector";
        break;
      case "indeterminate":
        failure = "uss-pseudo";
        break;
      case "disabled": {
        if (!predicate.value) { failure = "uss-selector"; break; }
        // UI Toolkit propagates :disabled from the element SetEnabled(false)
        // was called on to its descendants; the generated Disabled prop calls
        // it on the root. A sibling owner therefore lowers to the host.
        const owner = predicate.ownerPart;
        const ownerSelector = owner === undefined ? ctx.rootSelector : ctx.selectorOf.get(owner);
        const local = ownerSelector === target || (owner !== undefined && isAncestor(ctx, owner, rule.part));
        failure = atOwner(local ? owner : undefined, ":disabled", hostPseudo);
        break;
      }
      case "hover":
      case "active":
      case "focus": {
        const pseudo = `:${predicate.kind}`;
        failure = atOwner(predicate.ownerPart, pseudo, hostPseudo);
        // BooleanControl mirrors its control's pointer/focus state onto the
        // host (`is-hover`, `is-active`, `is-focus`) because USS cannot
        // select a sibling of the hidden control.
        if (failure === "uss-owner-mismatch" && lowering.behavior === "BooleanControl" && predicate.ownerPart === lowering.control.name) {
          hostState.push(`.is-${predicate.kind}`);
          failure = undefined;
        }
        break;
      }
    }
    if (failure) return { reason: failure };
  }
  const hostQualified = hostVariant.length + hostState.length + hostPseudo.length > 0;
  if (isRoot) {
    return { selector: `${ctx.rootSelector}${hostVariant.join("")}${hostState.join("")}${own.join("")}${hostPseudo.join("")}`, carriers, hostQualified };
  }
  const segments: string[] = [];
  if (hostQualified) segments.push(`${hostVariant.length ? hostVariant.join("") : ctx.rootSelector}${hostState.join("")}${hostPseudo.join("")}`);
  const ordered = [...owners.keys()].sort((a, b) => (isAncestor(ctx, a, b) ? -1 : isAncestor(ctx, b, a) ? 1 : 0));
  for (const owner of ordered) segments.push(`${ctx.selectorOf.get(owner)}${owners.get(owner)!.join("")}`);
  segments.push(`${target}${own.join("")}`);
  return { selector: segments.join(" "), carriers, hostQualified: hostQualified || ordered.some(o => !ctx.floating.has(o)) };
}

const isDefinition = (declaration: NativeStyleDeclarationIR): boolean => declaration.property.includes(".");

/** The custom property a slot or graph token lowers to. */
export const cssVar = (tokenPath: string): string => `--${tokenSlug(tokenPath)}`;

/** Project one admitted component's native style rules into USS rules and ledger entries. */
export function projectComponent(ir: ComponentIR, lowering: UnityLowering = unityLowering(ir), hosts: readonly ContentHost[] = [], scopeValues?: ScopeValues): ComponentProjection {
  const ctx = buildContext(ir, lowering);
  const out: ComponentProjection = { component: ir.name, rules: [], unsupported: [], graphTokens: new Set(), carrierAxes: new Set(), designSlots: new Map(), gapClasses: new Set() };
  const baseGap = new Set<string>();
  const ledger = (rule: { sourceKey: string; part: string }, property: string, value: string, reason: UssReason, longhand?: string) =>
    out.unsupported.push({ component: ir.name, sourceKey: rule.sourceKey, part: rule.part, property, value, reason, ...(longhand ? { longhand } : {}) });
  /** A reference to the declaration's token: a component slot, else a graph
   * token, which joins the token-section closure once a lowering uses it. */
  const reference = (token: string | undefined): ((fallback: string) => string) => {
    if (!token) return fallback => fallback;
    return fallback => {
      if (!ctx.slots.has(token)) out.graphTokens.add(token);
      return `var(${cssVar(token)}, ${fallback})`;
    };
  };
  // AnchoredSurface reparents its content out of the host (A2): definitions
  // the host scope makes are restated on the content selector; host-qualified
  // ones cannot follow it and are ledgered against the content part.
  const floatingRoot = lowering.behavior === "AnchoredSurface" ? lowering.content.name : undefined;
  const floatingDefinitions: [string, string][] = [];
  /** Component custom property → each emitted definition: its value, the part
   * it sits on, its lowered selector, and whether a state or variant scopes it. */
  const definitions = new Map<string, { value: string; part: string; selector: string; conditional: boolean }[]>();
  /** Declarations whose var() must be resolved once every definition is known. */
  const deferred = new Map<[string, string], { rule: NativeStyleRuleIR; property: string; value: string; map?: (value: string) => string | undefined }>();
  const rules = ir.nativeStyleRules?.rules ?? [];
  for (const rule of rules) {
    const lowered = lowerSelector(ctx, rule);
    if ("reason" in lowered) {
      for (const d of rule.declarations) ledger(rule, d.property, d.value, lowered.reason);
      continue;
    }
    const floatingTarget = ctx.floating.has(rule.part);
    if (floatingTarget && lowered.hostQualified) {
      for (const d of rule.declarations) ledger(rule, d.property, d.value, "uss-floating-scope");
      continue;
    }
    const scopesFloating = floatingRoot !== undefined && !floatingTarget &&
      (ctx.selectorOf.get(rule.part) === ctx.rootSelector || [...ctx.floating].some(f => isAncestor(ctx, rule.part, f)));
    const declarations: [string, string][] = [];
    const siblings = new Map(rule.declarations.filter(d => !isDefinition(d)).map(d => [d.property, d.value]));
    const focus = rule.predicates.some(p => p.kind === "focus");
    for (const d of rule.declarations) {
      if (isDefinition(d)) {
        const fallback = tokenScalar(d.value);
        if (fallback === undefined) { ledger(rule, d.property, d.value, "uss-scalar"); continue; }
        const definition: [string, string] = [cssVar(d.property), reference(d.token)(fallback)];
        declarations.push(definition);
        definitions.set(definition[0], [...(definitions.get(definition[0]) ?? []), { value: definition[1], part: rule.part, selector: lowered.selector, conditional: rule.predicates.length > 0 }]);
        if (scopesFloating && rule.predicates.length) ledger({ sourceKey: rule.sourceKey, part: floatingRoot }, d.property, d.value, "uss-floating-scope");
        else if (scopesFloating) floatingDefinitions.push(definition);
        continue;
      }
      if (d.designSlot) out.designSlots.set(cssVar(d.designSlot), { sourceKey: rule.sourceKey, part: rule.part, property: d.property });
      const handler = Object.prototype.hasOwnProperty.call(HANDLERS, d.property) ? HANDLERS[d.property] : undefined;
      if (!handler) { ledger(rule, d.property, d.value, "uss-property"); continue; }
      const outcome = handler({ value: d.value, wrap: reference(d.token), token: d.token, focus, siblings, baseTranslateY: ctx.baseTranslateY.get(rule.part) });
      if ("noop" in outcome) continue;
      if ("reason" in outcome) { ledger(rule, d.property, d.value, outcome.reason); continue; }
      declarations.push(...outcome.set);
      for (const set of outcome.set) {
        if (set[0].startsWith("--")) continue;
        if (outcome.resolve) deferred.set(set, { rule, property: d.property, value: d.value, map: outcome.resolve });
        else if (isComposite(set[1])) deferred.set(set, { rule, property: d.property, value: d.value });
      }
      for (const entry of outcome.ledger ?? []) ledger(rule, d.property, entry.value, entry.reason, entry.property === d.property ? undefined : entry.property);
    }
    if (!declarations.length) continue;
    out.rules.push({ selector: lowered.selector, declarations });
    const className = ctx.selectorOf.get(rule.part)!.slice(1);
    if (declarations.some(([property]) => property === GAP_PROPERTY)) {
      out.gapClasses.add(className);
      if (!rule.predicates.length) baseGap.add(className);
    }
    // A4: the owner's container facts restated on its composed-content wrapper.
    for (const host of hosts.filter(h => h.owner === className)) {
      const container = declarations.filter(([property]) => CONTAINER_PROPERTIES.has(property));
      if (container.length) out.rules.push({ selector: `${lowered.selector} > .${host.host}`, declarations: container });
    }
    for (const axis of lowered.carriers) out.carrierAxes.add(axis);
  }
  // CSS gap does not inherit but a custom property does: an element whose gap
  // is only state- or variant-scoped restates the initial (zero) gap on its
  // base selector so it never spaces children with an ancestor's value.
  for (const className of out.gapClasses) if (!baseGap.has(className)) out.rules.push({ selector: `.${className}`, declarations: [[GAP_PROPERTY, "0"]] });
  const floatingSelector = floatingRoot === undefined ? undefined : ctx.selectorOf.get(floatingRoot);
  if (floatingDefinitions.length && floatingSelector) out.rules.push({ selector: floatingSelector, declarations: floatingDefinitions });
  // Scope resolution of deferred declarations (see the header). Nested
  // references take the union of every definition (conservative); the
  // top-level reference distinguishes the definitions that reach the element.
  const selectorOfPart = (part: string): string => ctx.selectorOf.get(part)!;
  /** Definitions of `name` that reach an element of `part`: on it or on an
   * ancestor; a host-qualified one never reaches the reparented floating
   * content, and an unconditional one on the element shadows every inherited one. */
  const reaching = (name: string, part: string) => {
    const element = selectorOfPart(part);
    const defs = (definitions.get(name) ?? []).filter(def =>
      (selectorOfPart(def.part) === element || isAncestor(ctx, def.part, part)) &&
      !(def.conditional && ctx.floating.has(part) && !ctx.floating.has(def.part)));
    const own = defs.filter(def => selectorOfPart(def.part) === element);
    return own.some(def => !def.conditional) ? own : defs;
  };
  type Definition = { value: string; part: string; selector: string; conditional: boolean };
  const nested = (text: string, seen: ReadonlySet<string>): (string | undefined)[] => {
    const match = VAR.exec(text.trim());
    if (!match) return [text.trim()];
    const [, name, fallback] = match as unknown as [string, string, string | undefined];
    if (seen.has(name)) return [undefined];
    return valuesFor(name, fallback, definitions.get(name) ?? [], new Set([...seen, name]));
  };
  const slotVars = new Set([...ctx.slots].map(cssVar));
  /** The values a reference renders given the definitions that reach it: theirs
   * (plus the fallback unless one is unconditional); for a component slot none
   * reaches, the fallback; else the graph's in every scope. A graph name the
   * sheet leaves undefined in some scope is unresolved (undefined): the web
   * defines it, so its fallback is not the value to substitute. */
  const valuesFor = (name: string, fallback: string | undefined, defs: readonly Definition[], seen: ReadonlySet<string>): (string | undefined)[] => {
    const fallbackValues = (): (string | undefined)[] => (fallback === undefined ? [undefined] : nested(fallback, seen));
    if (defs.length) {
      const values = defs.flatMap(def => nested(def.value, seen));
      return defs.some(def => !def.conditional) ? values : [...values, ...fallbackValues()];
    }
    if (slotVars.has(name)) return fallbackValues();
    return scopeValues?.(name) ?? [undefined];
  };
  type Resolution = { value: string } | { reason: UssReason };
  /** The literal a deferred value takes when `override` (if given) is the one
   * definition of its variable and every other reference takes its unconditional value. */
  const resolveValue = (item: { rule: NativeStyleRuleIR; map?: (value: string) => string | undefined }, value: string, override?: { name: string; def: Definition }): Resolution => {
    const items: string[] = [];
    for (const entry of splitTop(value, ",")) {
      const parts: string[] = [];
      for (const part of splitTop(entry, " ")) {
        const match = VAR.exec(part);
        if (!match) { parts.push(part); continue; }
        const [, name, fallback] = match as unknown as [string, string, string | undefined];
        const defs = override && override.name === name
          ? [{ ...override.def, conditional: false }]
          : reaching(name, item.rule.part).filter(def => !def.conditional);
        const values = new Set(valuesFor(name, fallback, defs, new Set([name])));
        const [only] = values;
        if (values.size !== 1 || only === undefined) return { reason: "uss-var-composite" };
        parts.push(only);
      }
      items.push(parts.join(" "));
    }
    const literal = items.join(", ");
    if (literal.includes("var(")) return { reason: "uss-var-composite" };
    if (!item.map) return { value: literal };
    const mapped = item.map(literal);
    return mapped === undefined ? { reason: "uss-scalar" } : { value: mapped };
  };
  /** The base value plus one restatement per state- or variant-scoped
   * definition that reaches the element and changes the value. */
  const project = (item: { rule: NativeStyleRuleIR; property: string; map?: (value: string) => string | undefined }, value: string): { base: string; extras: { def: Definition; value: string }[] } | { reason: UssReason } => {
    const base = resolveValue(item, value);
    if ("reason" in base) return base;
    const names = [...new Set(splitTop(value, ",").flatMap(entry => splitTop(entry, " ")).map(part => VAR.exec(part)?.[1]).filter((n): n is string => !!n))];
    const extras: { def: Definition; value: string }[] = [];
    const varying = new Set<string>();
    for (const name of names) {
      const defs = reaching(name, item.rule.part);
      for (const def of defs.filter(d => d.conditional)) {
        const restated = resolveValue(item, value, { name, def });
        if ("reason" in restated) return restated;
        if (restated.value === base.value) continue;
        extras.push({ def, value: restated.value });
        varying.add(name);
      }
    }
    if (!extras.length) return { base: base.value, extras };
    // A restatement is the definition's selector applied to this declaration,
    // which reproduces the custom property's cascade only when one variable
    // varies (two would need every combination), it is defined on one element
    // (USS would rank an ancestor's restatement above the element's own), the
    // consumer is unqualified (its selector would need merging with the
    // definition's), and no other rule on the element sets the property (the
    // restatement's specificity would outrank it).
    const [name] = varying;
    const element = selectorOfPart(item.rule.part);
    const competes = rules.some(other => other !== item.rule && ctx.selectorOf.get(other.part) === element && other.declarations.some(d => d.property === item.property));
    if (varying.size > 1 || new Set(reaching(name!, item.rule.part).map(def => selectorOfPart(def.part))).size > 1 ||
      item.rule.predicates.length > 0 || item.rule.pseudo || competes) return { reason: "uss-var-composite" };
    return { base: base.value, extras };
  };
  if (deferred.size) {
    const rebuilt: UssRule[] = [];
    for (const rule of out.rules) {
      const extras = new Map<string, [string, string][]>();
      rule.declarations = rule.declarations.flatMap((declaration): [string, string][] => {
        const item = deferred.get(declaration);
        if (!item) return [declaration];
        const projected = project(item, declaration[1]);
        if ("reason" in projected) { ledger(item.rule, item.property, item.value, projected.reason); return []; }
        // The consumer rule is unqualified, so its selector starts with the
        // element's: a definition on the element replaces that compound, one on
        // an ancestor descends to it.
        const element = selectorOfPart(item.rule.part);
        for (const extra of projected.extras) {
          const selector = selectorOfPart(extra.def.part) === element ? `${extra.def.selector}${rule.selector.slice(element.length)}` : `${extra.def.selector} ${rule.selector}`;
          extras.set(selector, [...(extras.get(selector) ?? []), [declaration[0], extra.value]]);
        }
        return [[declaration[0], projected.base]];
      });
      if (rule.declarations.length) rebuilt.push(rule);
      for (const [selector, declarations] of extras) rebuilt.push({ selector, declarations });
    }
    out.rules = rebuilt;
    // The token-section closure keeps only graph tokens a remaining declaration reads.
    const read = new Set(out.rules.flatMap(rule => rule.declarations.flatMap(([, value]) => [...value.matchAll(VAR_READ)].map(m => m[1]!))));
    for (const token of [...out.graphTokens]) if (!read.has(cssVar(token))) out.graphTokens.delete(token);
  }
  for (const refused of ir.nativeStyleRules?.unsupported ?? []) {
    out.unsupported.push({ component: ir.name, sourceKey: refused.sourceKey, part: "", property: "", value: refused.reason, reason: "uss-selector" });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Token section (S2)
// ---------------------------------------------------------------------------

type GraphNode = { $value?: unknown } & Record<string, unknown>;

export interface TokenSources {
  /** Parsed resolved.tokens.json. */
  graph: Record<string, unknown>;
  /** Brand overrides from the token build's `@layer brand`. */
  brands: BrandLayer[];
}

export interface BrandLayer {
  id: string;
  light: Map<string, string>;
  dark: Map<string, string>;
}

/** Workspace-relative sources the projection reads (for docs and the docstring above). */
export const TOKEN_SOURCES = {
  graph: "packages/ds-tokens/generated/resolved.tokens.json",
  brandLayer: "packages/ds-tokens/generated/tokens.css",
} as const;

/** Read the token graph and brand layer relative to the contracts root (`<repo>/packages/ds-contracts`). */
export function loadTokenSources(contractsRoot: string): TokenSources {
  const repo = path.resolve(contractsRoot, "..", "..");
  const read = (rel: string): string => {
    const abs = path.join(repo, rel);
    if (!fs.existsSync(abs)) throw new Error(`UNITY_USS_TOKEN_GRAPH_MISSING: ${rel} is not built; run pnpm run tokens:build first`);
    return fs.readFileSync(abs, "utf8");
  };
  return { graph: JSON.parse(read(TOKEN_SOURCES.graph)) as Record<string, unknown>, brands: parseBrandLayer(read(TOKEN_SOURCES.brandLayer)) };
}

/** The `{ … }` body starting at `open` (the index of `{`), brace-matched. */
function blockAt(css: string, open: number): { body: string; end: number } {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return { body: css.slice(open + 1, i), end: i };
  }
  throw new Error("UNITY_USS_BRAND_LAYER_UNBALANCED");
}

function declarationsOf(body: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of body.matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);/g)) out.set(m[1]!, m[2]!.trim());
  return out;
}

/**
 * Brand overrides from the token build's `@layer brand`. Per brand, the
 * `[data-brand="<id>"]` block carries the light overrides (component-scoped
 * overrides are already published there too) and the class-toggled
 * `.dark[data-brand="<id>"], …` block the dark ones; the media-query and
 * `:where(:root)` duplicates of the same values are not read.
 */
export function parseBrandLayer(css: string): BrandLayer[] {
  const start = css.indexOf("@layer brand {");
  if (start < 0) return [];
  const layer = blockAt(css, css.indexOf("{", start)).body;
  const brands = new Map<string, BrandLayer>();
  const brand = (id: string): BrandLayer => {
    if (!brands.has(id)) brands.set(id, { id, light: new Map(), dark: new Map() });
    return brands.get(id)!;
  };
  let cursor = 0;
  while (cursor < layer.length) {
    const open = layer.indexOf("{", cursor);
    if (open < 0) break;
    const selector = layer.slice(cursor, open).trim();
    const { body, end } = blockAt(layer, open);
    cursor = end + 1;
    if (selector.startsWith("@")) continue;
    const first = selector.split(",")[0]!.trim();
    const light = /^\[data-brand="([^"]+)"\]$/.exec(first);
    const dark = /^\.dark\[data-brand="([^"]+)"\]$/.exec(first);
    if (light) for (const [k, v] of declarationsOf(body)) brand(light[1]!).light.set(k, v);
    else if (dark) for (const [k, v] of declarationsOf(body)) brand(dark[1]!).dark.set(k, v);
  }
  return [...brands.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function nodeAt(graph: Record<string, unknown>, tokenPath: string): GraphNode | undefined {
  let node: unknown = graph;
  for (const segment of tokenPath.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return node && typeof node === "object" && "$value" in node ? (node as GraphNode) : undefined;
}

/** Every leaf token's custom property → its dotted path. */
function varIndex(graph: Record<string, unknown>): Map<string, string> {
  const index = new Map<string, string>();
  const walk = (node: unknown, trail: string[]): void => {
    if (!node || typeof node !== "object") return;
    if ("$value" in node) { index.set(cssVar(trail.join(".")), trail.join(".")); return; }
    for (const [key, child] of Object.entries(node)) if (!key.startsWith("$")) walk(child, [...trail, key]);
  };
  walk(graph, []);
  return index;
}

type Theme = "light" | "dark";

/** A graph token's value in one theme, following `{path}` aliases. */
function graphValue(graph: Record<string, unknown>, tokenPath: string, theme: Theme, seen = new Set<string>()): string | undefined {
  if (seen.has(tokenPath)) return undefined;
  seen.add(tokenPath);
  const raw = nodeAt(graph, tokenPath)?.$value;
  const value = raw && typeof raw === "object" && !Array.isArray(raw) && "light" in raw
    ? (raw as Record<Theme, unknown>)[theme] ?? (raw as Record<Theme, unknown>).light
    : raw;
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return undefined;
  const alias = /^\{([^{}]+)\}$/.exec(value);
  return alias ? graphValue(graph, alias[1]!, theme, seen) : value;
}

const isThemeAware = (graph: Record<string, unknown>, tokenPath: string): boolean => {
  const raw = nodeAt(graph, tokenPath)?.$value;
  return !!raw && typeof raw === "object" && !Array.isArray(raw) && "dark" in raw;
};

/** A brand value (`var(--fsds-…)` or a literal) resolved to a USS scalar in one theme. */
function brandValue(graph: Record<string, unknown>, index: Map<string, string>, value: string, theme: Theme): string | undefined {
  const match = VAR.exec(value.trim());
  if (!match) return tokenScalar(value);
  const target = index.get(match[1]!);
  const resolved = target ? graphValue(graph, target, theme) : undefined;
  if (resolved !== undefined) return tokenScalar(resolved);
  return match[2] !== undefined ? brandValue(graph, index, match[2], theme) : undefined;
}

function block(selector: string, declarations: [string, string][], comment?: string): string {
  const lines = declarations.map(([property, value]) => `    ${property}: ${value};`);
  return `${comment ? `/* ${comment} */\n` : ""}${selector} {\n${lines.join("\n")}\n}`;
}

/** One scope the token section emits: a theme, optionally under a brand. */
interface TokenScope { theme: Theme; brand?: BrandLayer }

/** A graph token's value in one scope under the emitted cascade: brand dark,
 * then brand light (a brand alias resolving in the scope's theme), then the
 * graph's theme value. */
function scopeValue(sources: TokenSources, index: Map<string, string>, tokenPath: string, scope: TokenScope): string | undefined {
  const name = cssVar(tokenPath);
  const { brand, theme } = scope;
  const themed = (t: Theme): string | undefined => {
    const raw = graphValue(sources.graph, tokenPath, t);
    return raw === undefined ? undefined : tokenScalar(raw);
  };
  // The token section defines a token only when its light value is a scalar;
  // otherwise every scope leaves it undefined.
  const light = themed("light");
  if (light === undefined) return undefined;
  if (brand && theme === "dark" && brand.dark.has(name)) {
    const value = brandValue(sources.graph, index, brand.dark.get(name)!, "dark");
    if (value !== undefined) return value;
  }
  if (brand?.light.has(name)) {
    const value = brandValue(sources.graph, index, brand.light.get(name)!, theme);
    if (value !== undefined) return value;
  }
  return theme === "dark" ? themed("dark") ?? light : light;
}

/** The theme-level ledger rows use this component key. */
export const THEME_COMPONENT = "(theme)";

export interface StylesheetProjection {
  uss: string;
  ledger: { schema: "unity-uss-unsupported.v1"; reasons: Partial<Record<UssReason, string>>; entries: UnsupportedEntry[] };
  components: ComponentProjection[];
}

/** S2–S6 over every admitted component, in the order given (the allowlist order). */
export function projectStylesheet(irs: ComponentIR[], sources: TokenSources, hostsOf: (ir: ComponentIR) => readonly ContentHost[] = () => []): StylesheetProjection {
  const index = varIndex(sources.graph);
  const scopes: TokenScope[] = [{ theme: "light" }, { theme: "dark" }, ...sources.brands.flatMap(brand => (["light", "dark"] as const).map(theme => ({ theme, brand })))];
  const scopeValues: ScopeValues = name => {
    const tokenPath = index.get(name);
    return tokenPath === undefined ? undefined : scopes.map(scope => scopeValue(sources, index, tokenPath, scope));
  };
  const components = irs.map(ir => projectComponent(ir, unityLowering(ir), hostsOf(ir), scopeValues));
  // Theme.Attach is optional. A literal graph var() in an emitted declaration
  // therefore needs the graph's light value as its standalone fallback, just
  // as a resolvesTo declaration carries its authored fallback.
  for (const component of components) for (const rule of component.rules) {
    rule.declarations = rule.declarations.map(([property, value]): [string, string] => [property, value.replace(GRAPH_VAR_NO_FALLBACK, (original, name: string) => {
      const tokenPath = index.get(name);
      const light = tokenPath && graphValue(sources.graph, tokenPath, "light");
      const fallback = light && tokenScalar(light);
      return fallback === undefined ? original : `var(${name}, ${fallback})`;
    })]);
  }
  const entries: UnsupportedEntry[] = components.flatMap(c => c.unsupported);
  // A sidecar may contain a literal var() in a USS declaration without a
  // resolvesTo fact (for example a transition duration). Include graph reads
  // from the emitted rules as well as the IR-backed references. Refused and
  // substituted declarations are absent from those rules and add no closure.
  const literalReads = components.flatMap(component => component.rules.flatMap(rule =>
    rule.declarations.flatMap(([, value]) => [...value.matchAll(VAR_READ)].map(match => index.get(match[1]!)).filter((token): token is string => token !== undefined))));
  const closure = [...new Set([...components.flatMap(c => [...c.graphTokens]), ...literalReads])].sort((a, b) => cssVar(a).localeCompare(cssVar(b)));
  const light: [string, string][] = [], dark: [string, string][] = [];
  const emitted = new Set<string>();
  for (const tokenPath of closure) {
    const name = cssVar(tokenPath);
    const raw = graphValue(sources.graph, tokenPath, "light");
    if (raw === undefined) continue; // not in the graph: the reference stays unresolved and token-resolvability reports it
    const value = tokenScalar(raw);
    if (value === undefined) {
      entries.push({ component: THEME_COMPONENT, sourceKey: TOKEN_SOURCES.graph, part: "", property: name, value: raw, reason: "uss-scalar" });
      continue;
    }
    emitted.add(name);
    light.push([name, value]);
    if (isThemeAware(sources.graph, tokenPath)) {
      const darkValue = tokenScalar(graphValue(sources.graph, tokenPath, "dark") ?? "");
      if (darkValue !== undefined) dark.push([name, darkValue]);
    }
  }
  const sections: string[] = [
    "/* @generated:start unity-uss — generated by packages/ds-codegen (frameworks/unity/uss.ts); do not edit. Regenerate with pnpm run generate:unity. */",
    `/* Sources: ${TOKEN_SOURCES.graph}, ${TOKEN_SOURCES.brandLayer} (@layer brand), and each admitted component's contract and sidecars. Declarations USS cannot realise are listed in Controls.unsupported.json. */`,
    `/* Brands: ${sources.brands.map(b => b.id).join(", ")} */`,
    `/* Rem projection: 1rem = ${REM_BASELINE_PX}px; fixed CSS root baseline, independent of consumer font size. */`,
    block(".fsds-theme", light, "Token graph, light (resolved.tokens.json)"),
  ];
  if (dark.length) sections.push(block(".fsds-theme.fsds-theme--dark", dark, "Token graph, dark"));
  const designSlots = new Map(components.flatMap(c => [...c.designSlots].map(([name, use]) => [name, { component: c.component, ...use }] as const)));
  for (const brand of sources.brands) {
    const brandLight: [string, string][] = [], brandDark: [string, string][] = [];
    for (const [theme, overrides, target] of [["light", brand.light, brandLight], ["dark", brand.dark, brandDark]] as const) {
      for (const [name, value] of overrides) {
        const slot = designSlots.get(name);
        if (slot) {
          entries.push({ component: slot.component, sourceKey: `brand:${brand.id}${theme === "dark" ? ":dark" : ""}`, part: slot.part, property: slot.property, value, reason: "uss-design-slot" });
          continue;
        }
        if (!emitted.has(name)) continue;
        const resolved = brandValue(sources.graph, index, value, theme);
        if (resolved === undefined) {
          entries.push({ component: THEME_COMPONENT, sourceKey: `brand:${brand.id}${theme === "dark" ? ":dark" : ""}`, part: "", property: name, value, reason: "uss-scalar" });
          continue;
        }
        target.push([name, resolved]);
      }
    }
    // The web's light brand block also applies in dark mode for names the
    // brand does not restate there; a theme-aware alias then resolves to its
    // dark value at cascade time, so the dark scope carries that value.
    for (const [name, value] of brand.light) {
      if (!emitted.has(name) || brand.dark.has(name) || designSlots.has(name)) continue;
      const aliased = VAR.exec(value.trim())?.[1];
      const target = aliased ? index.get(aliased) : undefined;
      if (!target || !isThemeAware(sources.graph, target)) continue;
      const resolved = brandValue(sources.graph, index, value, "dark");
      if (resolved !== undefined) brandDark.push([name, resolved]);
    }
    const byName = (a: [string, string], b: [string, string]) => a[0].localeCompare(b[0]);
    if (brandLight.length) sections.push(block(`.fsds-theme.fsds-brand-${brand.id}`, brandLight.sort(byName), `Brand ${brand.id}`));
    if (brandDark.length) sections.push(block(`.fsds-theme.fsds-brand-${brand.id}.fsds-theme--dark`, brandDark.sort(byName)));
  }
  for (const [i, component] of components.entries()) {
    const prefix = irs[i]!.cssPrefix;
    component.rules.forEach((rule, n) => sections.push(block(rule.selector, rule.declarations, n === 0 ? `${component.component} (.${prefix})` : undefined)));
  }
  const key = (e: UnsupportedEntry) => [e.component, e.sourceKey, e.part, e.property, e.value, e.reason, e.longhand ?? ""];
  const sorted = [...new Map(entries.map(e => [JSON.stringify(key(e)), e])).values()].sort((a, b) => {
    const [x, y] = [key(a), key(b)];
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i]! < y[i]! ? -1 : 1;
    return 0;
  });
  const reasons: Partial<Record<UssReason, string>> = {};
  for (const reason of [...new Set(sorted.map(e => e.reason))].sort()) reasons[reason] = REASON_NOTES[reason];
  return { uss: `${sections.join("\n\n")}\n`, ledger: { schema: "unity-uss-unsupported.v1", reasons, entries: sorted }, components };
}
