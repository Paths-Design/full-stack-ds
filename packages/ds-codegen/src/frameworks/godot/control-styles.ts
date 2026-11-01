/**
 * Style projection for the bounded control shape.
 *
 * The control runtime owns one trigger plus item hosts, so it can carry a
 * smaller native style vocabulary than the composite/anatomy shapes: painted
 * typography, a focus ring, opacity, cursor and hit-testing. Everything else the
 * contract declares stays out of the projection and is named in the receipt.
 *
 * Source fact: `ir.nativeStyleRules` (normalized declarations, already resolved
 * from tokens by the IR). Applies by: control and surface shapes. No component
 * identity is inspected; selectors map by part and pseudo only.
 */
import type { ComponentIR } from "../../ir.js";
import type { GodotStyleDeclaration, GodotStyleRule } from "./plan-types.js";

/** Declarations this shape can apply to the shared control runtime. */
const APPLIERS: Record<string, (value: string) => GodotStyleDeclaration["value"] | undefined> = {
  "font-size": value => px(value),
  "line-height": value => px(value) ?? (Number.isFinite(Number(value)) ? `${Math.round(Number(value) * 16)}px` : undefined),
  "text-align": value => (["left", "center", "right", "justify"].includes(value) ? value : undefined),
  color: value => (looksLikeColor(value) ? value : undefined),
  "outline-width": value => px(value),
  "outline-color": value => (looksLikeColor(value) ? value : undefined),
  "outline-offset": value => px(value),
  "outline-style": value => value,
  opacity: value => (Number.isFinite(Number(value)) ? value : undefined),
  cursor: value => value,
  "pointer-events": value => value,
};

function px(value: string): string | undefined {
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(value.trim());
  return match ? `${Math.round(Number(match[1]))}px` : undefined;
}

function looksLikeColor(value: string): boolean {
  return /^#[0-9a-f]{3,8}$/i.test(value.trim()) || /^rgb/.test(value.trim());
}

/**
 * Parts the control runtime actually hosts. A rule addressing any other part is
 * not projected: claiming it would be a silent drop, because the runtime has no
 * node to apply it to.
 */
const HOSTED_PARTS = new Set(["root", "trigger", "content", "contentInner", "item"]);

export interface ControlStyleProjection {
  styles: GodotStyleRule[];
  /** Outline declarations from a focus-predicate rule, applied as the focus ring. */
  focusRing?: { width?: string; color?: string; offset?: string };
  /** Named gaps: declarations the control shape does not lower. */
  omissions: string[];
}

/**
 * Project the normalized style rules the control shape can apply. Rules whose
 * predicates are state/variant-conditioned are not applied — the runtime has no
 * state machine to select them — and are named instead of silently dropped.
 */
export function godotControlStyles(ir: ComponentIR): ControlStyleProjection {
  const native = ir.nativeStyleRules;
  if (!native) return { styles: [], omissions: [] };
  const styles: GodotStyleRule[] = [];
  const omissions: string[] = native.unsupported.map(rule => `${rule.sourceKey}: ${rule.reason}`);
  let focusRing: ControlStyleProjection["focusRing"];
  for (const rule of native.rules) {
    if (rule.sourceKey === "tokens" || rule.sourceKey === "structure") continue;
    if (!HOSTED_PARTS.has(rule.part)) {
      omissions.push(`${rule.sourceKey}: part ${rule.part} is not hosted by the control runtime`);
      continue;
    }
    // A focus-predicate rule is the focus ring, not a conditional state: the
    // native focus StyleBox is exactly the carrier for it.
    if (rule.predicates.length && rule.predicates.every(predicate => predicate.kind === "focus")) {
      for (const declaration of rule.declarations) {
        if (declaration.property === "outline-width") focusRing = { ...focusRing, width: px(declaration.value) };
        else if (declaration.property === "outline-color" && looksLikeColor(declaration.value)) focusRing = { ...focusRing, color: declaration.value };
        else if (declaration.property === "outline-offset") focusRing = { ...focusRing, offset: px(declaration.value) ?? declaration.value };
        else if (!declaration.property.startsWith("outline")) omissions.push(`${rule.sourceKey}.${declaration.property}: no Godot focus-ring mapping`);
      }
      continue;
    }
    if (rule.predicates.length) {
      omissions.push(`${rule.sourceKey}: state/variant-conditioned styling has no native selector in the control shape`);
      continue;
    }
    const declarations: GodotStyleDeclaration[] = [];
    for (const declaration of rule.declarations) {
      if (declaration.property.includes(".")) continue;
      if (declaration.platforms && !declaration.platforms.includes("godot")) {
        omissions.push(`${rule.sourceKey}.${declaration.property}: platform ${declaration.platforms.join(",")} only`);
        continue;
      }
      const applier = APPLIERS[declaration.property];
      const value = applier?.(declaration.value);
      if (value === undefined) {
        omissions.push(`${rule.sourceKey}.${declaration.property}: no Godot control style mapping`);
        continue;
      }
      declarations.push({ property: declaration.property, value, ...(declaration.designSlot ? { designSlot: declaration.designSlot } : {}) });
    }
    if (declarations.length) styles.push({ source: rule.sourceKey, part: rule.part, predicates: [], declarations });
  }
  return { styles, ...(focusRing ? { focusRing } : {}), omissions };
}
