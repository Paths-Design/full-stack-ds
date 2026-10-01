// Pure contract → control-descriptor derivation for the scratch Properties panel.
//
// This module turns a component contract into the three control groups the
// Figma-style panel renders — variant axes, designed props, and component
// tokens — plus the `tokenOverridesToCss` helper that lowers an override map
// into a CSS custom-property block the preview iframe applies live.
//
// It is deliberately DOM-free and side-effect-free so it can be unit-tested in
// isolation (no React, no jsdom). The panel component consumes these
// descriptors; the scratch view sends the resulting override maps over the
// `fsds:config` wire to the preview.
//
// Accessors are the ones the rest of the app already uses:
//   - variant axes:   contract.variants            (Record<string,string[]>)
//   - props:          contract.props.designed.members
//   - prop enums:     contract.types[ref].values   (union → select options)
//   - component tokens: contract.tokens             (FLAT Record<slot, TokenDefinition>;
//                       the showcase bundle attaches the raw <Name>.tokens.json
//                       sidecar verbatim — see vite-plugin-fsds-data.ts)

import type {
  BoxModelSurfaceSlot,
  ComponentContract,
  TokenDefinition,
} from "../../types/data";
// The panel writes the same custom properties the generated CSS reads, so it
// must lower token paths through the same authority codegen and the token build
// use — see packages/ds-codegen/src/token-path.ts.
import { tokenSlug } from "../../../packages/ds-codegen/src/token-path";

/** A single editable control rendered as a row in the panel. */
export type ControlDescriptor =
  | {
      kind: "select";
      /** Prop / variant-axis name, also the key in the props override map. */
      name: string;
      label: string;
      description?: string;
      options: string[];
      /** Default from the contract, used as the control's initial value. */
      defaultValue?: string;
      /** True when this select is also a declared variant axis. */
      isVariantAxis: boolean;
    }
  | {
      kind: "boolean";
      name: string;
      label: string;
      description?: string;
      defaultValue?: boolean;
    }
  | {
      kind: "number";
      name: string;
      label: string;
      description?: string;
      defaultValue?: number;
    }
  | {
      kind: "text";
      name: string;
      label: string;
      description?: string;
      defaultValue?: string;
    };

/** A component-scoped token row (one entry of the flat tokens sidecar). */
/**
 * Which merge layer supplied a token row's value (see BoxModelSurfaceSlot).
 * `authored` = the component's sidecar; the other two are inherited and mean
 * "real, overridable slot — but not component-authored design intent".
 */
export type TokenProvenance =
  | "authored"
  | "morphology-profile"
  | "primitive-default";

export interface TokenRowDescriptor {
  /** Dotted slot name, e.g. "button.color.background.default". */
  slot: string;
  /** The semantic/core token this slot resolves to, if any (the binding). */
  resolvesTo?: string;
  /** The literal fallback value (what we show + seed the editor with). */
  fallback?: string;
  /** Which token layer the binding targets (semantic/core), if declared. */
  layer?: string;
  /** Whether the literal looks like a color (drives swatch rendering). */
  isColor: boolean;
  /**
   * The CSS custom property this slot drives, derived from the slot name.
   * e.g. "button.color.background.default" → "--fsds-button-color-background-default".
   * This is the variable the preview override block sets.
   */
  cssVar: string;
  /** Merge-layer provenance. Rows derived from the raw sidecar are authored. */
  source?: TokenProvenance;
  /**
   * False when no committed generated CSS rule reads this slot's var — the
   * override interface is declared but unwired, so an edit cannot move the
   * rendered component (FIX-EDITOR-CONTROL-BINDING-PROOF-01). Undefined means
   * no read-proof source was supplied (legacy callers) and the row is treated
   * as readable, preserving pre-proof behavior.
   */
  isRead?: boolean;
}

/** The full derived control surface for one component. */
export interface DerivedControls {
  variantAxes: ControlDescriptor[];
  props: ControlDescriptor[];
  tokens: TokenRowDescriptor[];
}

const COLOR_RE = /^(#|rgb|hsl|oklch|color\()/i;

/**
 * Map a dotted token slot to its CSS custom-property name, so an override here
 * patches the same variable the generated component CSS reads.
 */
export function slotToCssVar(slot: string): string {
  return "--" + tokenSlug(slot);
}

/**
 * Map a token's `resolvesTo` path (e.g. "semantic.color.action.background.
 * primary.default") to the CSS custom property the generated component CSS
 * ultimately READS. This matters because variant rules re-derive a component's
 * slot var FROM its semantic token at closer cascade proximity than a :root
 * slot override — e.g. `.button--primary { --fsds-button-color-background-default:
 * var(--fsds-semantic-color-action-background-primary-default); }`. Overriding
 * the semantic var is what actually re-skins a variant-styled component live.
 * Same lowering as slotToCssVar; the path already carries its semantic/core
 * layer prefix.
 */
export function resolvesToCssVar(resolvesTo: string): string {
  return "--" + tokenSlug(resolvesTo);
}

/** A literal value that reads as a CSS color (drives swatch vs. text input). */
function looksLikeColor(value: string | undefined): boolean {
  if (!value) return false;
  return COLOR_RE.test(value.trim());
}

/**
 * Resolve a prop's `ref` propType to its union option list, if the referenced
 * type is a union. Returns null for refs to non-union types (e.g. builtin
 * refs) so the caller can fall back to a text control rather than inventing
 * options.
 */
function refUnionOptions(
  contract: ComponentContract,
  refName: string,
): string[] | null {
  const types = (contract.types ?? {}) as Record<string, unknown>;
  const t = types[refName];
  if (
    t &&
    typeof t === "object" &&
    (t as { kind?: string }).kind === "union" &&
    Array.isArray((t as { values?: unknown }).values)
  ) {
    return ((t as { values: unknown[] }).values).map(String);
  }
  return null;
}

interface PropMemberLike {
  name: string;
  propType?: { kind?: string; to?: string; values?: unknown[] };
  default?: unknown;
  description?: string;
}

/**
 * Derive a single control descriptor for one designed-prop member. Returns
 * null for prop kinds that have no meaningful inline editor on this panel
 * (callbacks, arrays, etc.) — those are not part of the visual configuration
 * surface, so we omit them rather than render a dead control.
 */
function derivePropControl(
  contract: ComponentContract,
  member: PropMemberLike,
  variantAxisNames: Set<string>,
): ControlDescriptor | null {
  const kind = member.propType?.kind;
  const base = {
    name: member.name,
    label: member.name,
    description: member.description,
  };

  switch (kind) {
    case "enum": {
      const options = Array.isArray(member.propType?.values)
        ? member.propType.values.map(String)
        : [];
      if (options.length === 0) return null;
      return {
        kind: "select",
        ...base,
        options,
        defaultValue:
          typeof member.default === "string" ? member.default : undefined,
        isVariantAxis: variantAxisNames.has(member.name),
      };
    }
    case "boolean":
      return {
        kind: "boolean",
        ...base,
        defaultValue:
          typeof member.default === "boolean" ? member.default : undefined,
      };
    case "number":
      return {
        kind: "number",
        ...base,
        defaultValue:
          typeof member.default === "number" ? member.default : undefined,
      };
    case "string":
      return {
        kind: "text",
        ...base,
        defaultValue:
          typeof member.default === "string" ? member.default : undefined,
      };
    case "ref": {
      const refName = member.propType?.to;
      const options = refName ? refUnionOptions(contract, refName) : null;
      if (options && options.length > 0) {
        return {
          kind: "select",
          ...base,
          options,
          defaultValue:
            typeof member.default === "string" ? member.default : undefined,
          // A prop that shares a name with a declared variant axis IS that
          // axis — flag it so the panel can render it once, in the Variants
          // section, instead of duplicating it under Properties.
          isVariantAxis: variantAxisNames.has(member.name),
        };
      }
      // ref to a non-union type (builtin etc.): no enumerable options, fall
      // back to a free-text control rather than guessing.
      return { kind: "text", ...base };
    }
    default:
      // callback / array / union-literal / void / promise: not an inline
      // visual control on this panel.
      return null;
  }
}

/**
 * Derive the full control surface for a component contract: variant axes
 * (rendered as selects), designed props (typed controls, with the variant-axis
 * duplicates removed), and component-token rows.
 *
 * Variant axes come from `contract.variants`. When a variant axis also appears
 * as a designed prop (the common case — `size`/`variant` are both), the prop's
 * options/default/description enrich the axis; the prop is NOT repeated under
 * Properties.
 */
export function deriveControls(contract: ComponentContract): DerivedControls {
  const variants = contract.variants ?? {};
  const variantAxisNames = new Set(Object.keys(variants));

  const members =
    (contract.props?.designed?.members as PropMemberLike[] | undefined) ?? [];
  const memberByName = new Map(members.map((m) => [m.name, m]));

  // Variant axes first, enriched by the matching designed prop when present.
  const variantAxes: ControlDescriptor[] = Object.entries(variants).map(
    ([axis, values]) => {
      const member = memberByName.get(axis);
      return {
        kind: "select",
        name: axis,
        label: axis,
        description: member?.description,
        options: values,
        defaultValue:
          typeof member?.default === "string" ? member.default : values[0],
        isVariantAxis: true,
      };
    },
  );

  // Designed props, excluding any that are themselves variant axes (rendered
  // above) and any kind with no inline editor.
  const props: ControlDescriptor[] = [];
  for (const member of members) {
    if (variantAxisNames.has(member.name)) continue;
    const control = derivePropControl(contract, member, variantAxisNames);
    if (control) props.push(control);
  }

  // Component tokens: the flat sidecar map attached as contract.tokens.
  const tokenMap =
    (contract.tokens as Record<string, TokenDefinition> | undefined) ?? {};
  const tokens: TokenRowDescriptor[] = Object.entries(tokenMap).map(
    ([slot, def]) => ({
      slot,
      resolvesTo: def.resolvesTo,
      fallback: def.fallback,
      layer: def.layer,
      isColor: looksLikeColor(def.fallback),
      cssVar: slotToCssVar(slot),
      source: "authored" as const,
    }),
  );

  return { variantAxes, props, tokens };
}

/**
 * Stamp read-proof onto token rows: `isRead` true/false when a proof source
 * (`--fsds-*` vars the generated CSS actually reads — see css-read-proof.ts)
 * is supplied, left undefined when it is not. Pure; returns new row objects
 * only when marking applies.
 */
export function markRowsRead(
  rows: TokenRowDescriptor[],
  readCssVars?: Iterable<string> | null,
): TokenRowDescriptor[] {
  if (!readCssVars) return rows;
  const reads = readCssVars instanceof Set ? readCssVars : new Set(readCssVars);
  return rows.map((r) => ({ ...r, isRead: reads.has(r.cssVar) }));
}

/**
 * The token rows the box-model editor inspects: the component's authored
 * sidecar rows PLUS the inherited box-model slots from the normalized material
 * surface (primitive < morphology profile < sidecar, computed by the data
 * plugin). Authored rows keep their original order and win on slot collisions;
 * inherited slots append after, mapped to display rows (a `literal` becomes
 * the shown fallback). This is what makes the editor read the same surface
 * codegen realizes, instead of inferring "no sidecar key = no box model".
 *
 * When `readCssVars` is supplied, rows carry `isRead` so downstream resolvers
 * bind only slots the generated CSS provably reads.
 */
export function materialTokenRows(component: {
  contract: ComponentContract;
  boxModelSurface?: BoxModelSurfaceSlot[];
  readCssVars?: Iterable<string> | null;
}): TokenRowDescriptor[] {
  const authored = deriveControls(component.contract).tokens;
  const authoredSlots = new Set(authored.map((r) => r.slot));
  const inherited: TokenRowDescriptor[] = (component.boxModelSurface ?? [])
    .filter((s) => !authoredSlots.has(s.slot))
    .map((s) => ({
      slot: s.slot,
      resolvesTo: s.resolvesTo,
      fallback: s.fallback ?? s.literal,
      layer: s.layer,
      isColor: false,
      cssVar: slotToCssVar(s.slot),
      source: s.source,
    }));
  return markRowsRead([...authored, ...inherited], component.readCssVars);
}

/**
 * Full prop map for a config-mode preview = derived defaults (variant axes +
 * props) overlaid with the user's overrides. Config-mode previews REPLACE
 * props wholesale on each message, so callers must always send the complete
 * map; an explicit `undefined` override clears the prop.
 */
export function buildPropMap(
  contract: ComponentContract,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const { variantAxes, props } = deriveControls(contract);
  const out: Record<string, unknown> = {};
  for (const c of [...variantAxes, ...props]) {
    if (c.defaultValue !== undefined) out[c.name] = c.defaultValue;
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete out[k];
    else out[k] = v;
  }
  return out;
}

/**
 * Lower a token-override map (slot → literal value) into a CSS custom-property
 * block scoped to `:root`. The preview iframe writes this into a
 * `<style data-fsds="overrides">` element; because the generated component CSS
 * reads the same `--fsds-<slot>` variables, setting them here re-skins the
 * component live with no rebuild.
 *
 * Keys are slot names (NOT already-prefixed css vars) so callers pass the
 * TokenRowDescriptor.slot directly. Empty / blank values are dropped so a
 * cleared field reverts to the component default rather than emitting an empty
 * declaration. Output is deterministic (insertion order preserved by the
 * caller's map) and ends each declaration with a newline for readability in
 * devtools.
 *
 * When `rows` is supplied, each overridden slot that has a `resolvesTo` ALSO
 * emits a declaration for its semantic/core var. This is what makes the live
 * override win for variant-styled components: a variant rule re-derives the
 * component slot var from the semantic token at closer cascade proximity, so a
 * :root override of the SLOT var alone is masked — but overriding the SEMANTIC
 * var (the leaf the variant rule itself reads) re-skins it. Dimensional tokens
 * with no variant re-derivation still apply via the slot var, so emitting both
 * is safe and strictly more effective. Without `rows`, behavior is unchanged
 * (slot var only) — preserved for callers/tests that pass a bare map.
 */
export function tokenOverridesToCss(
  overrides: Record<string, string>,
  rows?: TokenRowDescriptor[],
  componentName?: string,
): string {
  const resolvesBySlot = new Map(
    (rows ?? []).map((r) => [r.slot, r.resolvesTo]),
  );
  // Use a Map so a slot var and its semantic var don't duplicate, and so the
  // last write wins deterministically.
  const decls = new Map<string, string>();
  const boxDecls = new Map<string, string>();
  for (const [slot, value] of Object.entries(overrides)) {
    if (value == null || String(value).trim() === "") continue;
    if (componentName && slot.startsWith("box-model.")) {
      boxDecls.set(slotToCssVar(slot), value);
      continue;
    }
    decls.set(slotToCssVar(slot), value);
    const resolvesTo = resolvesBySlot.get(slot);
    if (resolvesTo) decls.set(resolvesToCssVar(resolvesTo), value);
  }
  if (decls.size === 0 && boxDecls.size === 0) return "";
  const body = [...decls.entries()]
    .map(([cssVar, value]) => `  ${cssVar}: ${value};`)
    .join("\n");
  const prefix = componentName?.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").toLowerCase();
  const boxBody = [...boxDecls].map(([cssVar, value]) => `  ${cssVar}: ${value};`).join("\n");
  return `${decls.size ? `:root {\n${body}\n}\n` : ""}${boxDecls.size ? `:where([data-fsds-component="${prefix}"]) {\n${boxBody}\n}\n` : ""}`;
}

/**
 * Inline-style sibling of `tokenOverridesToCss` for previews that render in
 * the HOST document rather than an iframe (the Design tab's usage examples).
 * There is no :root to write to without leaking into the whole app, so the
 * overrides become scoped custom properties spread onto a wrapper element.
 * Same semantics: blanks dropped, and each slot with a `resolvesTo` also sets
 * its semantic var so variant rules pick the override up.
 */
export function tokenOverridesToStyle(
  overrides: Record<string, string>,
  rows?: TokenRowDescriptor[],
): Record<string, string> {
  const resolvesBySlot = new Map(
    (rows ?? []).map((r) => [r.slot, r.resolvesTo]),
  );
  const out: Record<string, string> = {};
  for (const [slot, value] of Object.entries(overrides)) {
    if (value == null || String(value).trim() === "") continue;
    out[slotToCssVar(slot)] = value;
    const resolvesTo = resolvesBySlot.get(slot);
    if (resolvesTo) out[resolvesToCssVar(resolvesTo)] = value;
  }
  return out;
}

// ---- Box-model role resolution -------------------------------------------
//
// The BoxModelEditor edits semantic roles (padding sides, gap, min/max width,
// radius, border) but token SLOT NAMES vary per component: padding/gap/min-width
// are conventionally `box-model.*`, while radius/border/width live under a
// component-prefixed slot (`button.size.radius`, `dialog.size.radius`,
// `button.size.border`, `dialog.size.md.width`). Rather than special-case
// component names (which the repo's core invariant forbids), we DISCOVER the
// slot for each role from the component's token map by matching slot-name
// patterns. A role with no matching slot is simply absent (e.g. margins never
// map — components don't own outer margin).

export type BoxModelRole =
  | "padding-top"
  | "padding-right"
  | "padding-bottom"
  | "padding-left"
  | "gap"
  | "min-width"
  | "max-width"
  | "width"
  | "min-height"
  | "max-height"
  | "height"
  | "radius"
  | "border";

/** A box-model role resolved to a concrete token row, or absent. */
export interface BoxModelBinding {
  role: BoxModelRole;
  row: TokenRowDescriptor;
}

// Ordered matchers per role. The first slot whose name matches wins, so more
// specific patterns are listed first. Patterns are tested against the lowercased
// slot name. `box-model.*` is preferred; component-prefixed fallbacks follow.
const ROLE_MATCHERS: Record<BoxModelRole, RegExp[]> = {
  "padding-top": [/(^|\.)padding-block-start$/, /(^|\.)padding-top$/],
  "padding-bottom": [/(^|\.)padding-block-end$/, /(^|\.)padding-bottom$/],
  "padding-left": [/(^|\.)padding-inline-start$/, /(^|\.)padding-left$/],
  "padding-right": [/(^|\.)padding-inline-end$/, /(^|\.)padding-right$/],
  gap: [/(^|\.)gap$/, /(^|\.)gap\./],
  "min-width": [/(^|\.)min-width$/, /(^|\.)minwidth/],
  "max-width": [/(^|\.)max-width$/, /(^|\.)maxwidth/, /\.size\..*\.width$/],
  // Explicit width/height come AFTER min/max in iteration order so those
  // claim their slots first (the used-set prevents double-binding). They exist
  // for surfaces where the profile fixes the extent (fixed-square glyphs,
  // linear meters) rather than flooring it.
  width: [/(^|\.)width$/],
  "min-height": [/(^|\.)min-height$/, /(^|\.)minheight/],
  "max-height": [/(^|\.)max-height$/, /(^|\.)maxheight/, /\.size\..*\.height$/],
  height: [/(^|\.)height$/],
  radius: [/(^|\.)radius$/, /(^|\.)radius\b/, /\.radius\./],
  border: [/(^|\.)border$/, /\.size\.border$/, /\.border\.width$/],
};

/**
 * Pick the row a role binds under matcher priority, preferring rows whose slot
 * the generated CSS provably reads. Candidates are collected per matcher in
 * row order; rows marked `isRead: false` are excluded from binding UNLESS no
 * readable candidate exists for the role — in which case the role is UNWIRED
 * and returns undefined (no control: an edit on an unread slot cannot move
 * the rendered component, so offering one lies to the designer). Rows without
 * an `isRead` mark (no proof source) keep legacy first-match behavior.
 */
function bindRoleRow(
  tokens: TokenRowDescriptor[],
  used: Set<string>,
  matchers: RegExp[],
): TokenRowDescriptor | undefined {
  const readable = (t: TokenRowDescriptor) => t.isRead !== false;
  let found: TokenRowDescriptor | undefined;
  for (const re of matchers) {
    found = tokens.find((t) => !used.has(t.slot) && readable(t) && re.test(t.slot.toLowerCase()));
    if (found) break;
  }
  return found;
}

/**
 * Resolve box-model roles to the component's token rows. Returns one binding
 * per role that has a matching slot — roles without a slot are omitted, and
 * (with read-proof marked rows) roles whose every candidate slot is unread
 * are omitted too, because no edit on them can move the rendered component.
 * Used by the BoxModelEditor to know which positions are editable and which
 * token each drives. Pure projection over deriveControls(contract).tokens.
 */
export function resolveBoxModel(tokens: TokenRowDescriptor[]): BoxModelBinding[] {
  const out: BoxModelBinding[] = [];
  const used = new Set<string>();
  for (const role of Object.keys(ROLE_MATCHERS) as BoxModelRole[]) {
    const found = bindRoleRow(tokens, used, ROLE_MATCHERS[role]);
    if (found) {
      used.add(found.slot);
      out.push({ role, row: found });
    }
  }
  return out;
}

// Token-PATH family per box-model role. When rebinding a role to a token, the
// picker should offer only that role's semantically correct family — a radius
// rebind shows `*.shape.radius.*`, NOT density/color/effect; padding shows the
// `*.spacing.*` scale; border-width shows `*.border.width*`; min/max-width show
// the sizing scale. Tested against the path of bundle.foundationTokens (which
// carries the `core.`/`semantic.` layer prefix, e.g. "core.shape.radius.04").
const ROLE_PATH_PATTERNS: Record<BoxModelRole, RegExp> = {
  "padding-top": /\bspacing\b/i,
  "padding-bottom": /\bspacing\b/i,
  "padding-left": /\bspacing\b/i,
  "padding-right": /\bspacing\b/i,
  gap: /\bspacing\b/i,
  // sizing scale for widths/heights — spacing.size or a size.* family, not
  // radius/color
  "min-width": /\b(spacing|size|dimension)\b/i,
  "max-width": /\b(spacing|size|dimension|maxwidth|measure)\b/i,
  width: /\b(spacing|size|dimension|glyph)\b/i,
  "min-height": /\b(spacing|size|dimension)\b/i,
  "max-height": /\b(spacing|size|dimension)\b/i,
  height: /\b(spacing|size|dimension|glyph)\b/i,
  radius: /shape\.radius\b/i,
  border: /border\.width\b/i,
};

/**
 * The token-path family pattern a given box-model role should rebind within.
 * Passed to the picker as `pathPattern` so a radius control only lists radius
 * tokens, a padding control only spacing tokens, etc.
 */
export function boxModelRolePathPattern(role: BoxModelRole): RegExp {
  return ROLE_PATH_PATTERNS[role];
}

// ---- Dimensional constraints ----------------------------------------------
//
// A padding edit can look inert: when the content plus padding is still under
// the component's min-height/min-width floor, the floor absorbs the change
// (Button: 8px padding-block inside a 36px min-height leaves ~20px of slack).
// Rather than dimming the padding controls (the edit DOES apply — it only
// grows the box past the floor), the editor surfaces a caption per axis
// explaining what the dimension is constrained by. Derived purely from the
// component's resolved box-model bindings — no per-component knowledge.

export type BoxAxis = "block" | "inline";

const AXIS_SPEC: Record<
  BoxAxis,
  { padding: BoxModelRole[]; floor: BoxModelRole; cap: BoxModelRole; label: string }
> = {
  block: {
    padding: ["padding-top", "padding-bottom"],
    floor: "min-height",
    cap: "max-height",
    label: "Height",
  },
  inline: {
    padding: ["padding-left", "padding-right"],
    floor: "min-width",
    cap: "max-width",
    label: "Width",
  },
};

/** One axis worth of constraint facts for the BoxModelEditor's captions. */
export interface BoxConstraint {
  axis: BoxAxis;
  label: string;
  /** The padding roles whose edits the floor/cap can absorb. */
  paddingRoles: BoxModelRole[];
  floor?: TokenRowDescriptor;
  cap?: TokenRowDescriptor;
}

/**
 * Project box-model bindings into per-axis constraints worth explaining. An
 * axis is reported only when it has BOTH a padding binding (an edit that could
 * surprise) and a floor or cap (something doing the absorbing) — otherwise
 * there is nothing to caption.
 */
export function deriveBoxConstraints(bindings: BoxModelBinding[]): BoxConstraint[] {
  const byRole = new Map(bindings.map((b) => [b.role, b.row]));
  // A primitive-default floor/cap ("0"/"none") constrains nothing — with the
  // material surface every component carries those rows, so only authored or
  // profile-sourced bounds are worth captioning. Rows without a source tag
  // (bare sidecar derivations) keep the legacy behavior: counted.
  const meaningful = (row?: TokenRowDescriptor): TokenRowDescriptor | undefined =>
    row && row.source !== "primitive-default" ? row : undefined;
  const out: BoxConstraint[] = [];
  for (const axis of Object.keys(AXIS_SPEC) as BoxAxis[]) {
    const spec = AXIS_SPEC[axis];
    const paddingRoles = spec.padding.filter((r) => byRole.has(r));
    const floor = meaningful(byRole.get(spec.floor));
    const cap = meaningful(byRole.get(spec.cap));
    if (paddingRoles.length === 0) continue;
    if (!floor && !cap) continue;
    out.push({ axis, label: spec.label, paddingRoles, floor, cap });
  }
  return out;
}

// ---- Fill / color role resolution -----------------------------------------
//
// The Fill section edits the component's primary surface color. As with the
// box-model roles, the slot name varies per component (`button.color.background
// .default`, `dialog.color.background`, …) so we DISCOVER the default
// background color token by pattern rather than hardcoding. Preference order:
// an explicit "background.default" slot, then any "background" color slot, then
// the first color-valued token. Returns null when the component has no color
// token (e.g. a pure layout primitive).

/** The token-path family the Fill picker rebinds within (color tokens). */
export const FILL_PATH_PATTERN = /\bcolor\b/i;

const FILL_MATCHERS: RegExp[] = [
  /(^|\.)background\.default$/,
  /(^|\.)color\.background\.default$/,
  /(^|\.)background\b/,
  /(^|\.)fill\b/,
];

/**
 * Resolve the component's primary fill (background) color token row. Only rows
 * whose value reads as a color qualify, and — when rows carry read-proof —
 * only rows the generated CSS provably reads: a fill control on an unread
 * slot cannot move the rendered component. Null when no readable color row
 * exists. Used by the Fill section. Pure projection over
 * deriveControls(contract).tokens.
 */
export function resolveFillColor(
  tokens: TokenRowDescriptor[],
): TokenRowDescriptor | null {
  const colorRows = tokens.filter((t) => t.isColor && t.isRead !== false);
  for (const re of FILL_MATCHERS) {
    const hit = colorRows.find((t) => re.test(t.slot.toLowerCase()));
    if (hit) return hit;
  }
  return colorRows[0] ?? null;
}

// ---- Typography role resolution -------------------------------------------
//
// The Typography section edits the component's text facts. As with box-model
// and fill, slot names vary per component (`button.size.fontSize.medium`,
// `button.text.weight`, …), so each role is DISCOVERED by pattern. Components
// commonly own font-size and font-weight; font-family is rarer. Roles with no
// matching slot are omitted (the section only shows what the contract carries).

export type TypographyRole = "font-size" | "font-weight" | "font-family";

const TYPOGRAPHY_MATCHERS: Record<TypographyRole, RegExp[]> = {
  "font-size": [/(^|\.)fontsize/i, /(^|\.)font-size/i, /\.size\.fontsize/i],
  "font-weight": [/(^|\.)font\.weight/i, /(^|\.)text\.weight$/i, /(^|\.)fontweight/i, /(^|\.)weight$/i],
  "font-family": [/(^|\.)font\.family/i, /(^|\.)fontfamily/i, /(^|\.)family$/i],
};

// Token-path family per typography role for the rebind picker.
const TYPOGRAPHY_PATH_PATTERNS: Record<TypographyRole, RegExp> = {
  "font-size": /(typography\.ramp|fontsize|font-size)/i,
  "font-weight": /(font\.weight|fontweight)/i,
  "font-family": /(font\.family|fontfamily)/i,
};

export interface TypographyBinding {
  role: TypographyRole;
  row: TokenRowDescriptor;
}

/**
 * Resolve typography roles to the component's token rows (font-size,
 * font-weight, font-family). One binding per role that has a matching slot;
 * with read-proof marked rows, roles whose every candidate is unread are
 * omitted (same wire-only rule as the box-model roles). Pure projection over
 * deriveControls(contract).tokens.
 */
export function resolveTypography(
  tokens: TokenRowDescriptor[],
): TypographyBinding[] {
  const out: TypographyBinding[] = [];
  const used = new Set<string>();
  for (const role of Object.keys(TYPOGRAPHY_MATCHERS) as TypographyRole[]) {
    const found = bindRoleRow(tokens, used, TYPOGRAPHY_MATCHERS[role]);
    if (found) {
      used.add(found.slot);
      out.push({ role, row: found });
    }
  }
  return out;
}

/** The token-path family pattern a typography role rebinds within. */
export function typographyRolePathPattern(role: TypographyRole): RegExp {
  return TYPOGRAPHY_PATH_PATTERNS[role];
}
