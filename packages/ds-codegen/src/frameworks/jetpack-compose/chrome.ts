/** chrome.ts — extracted from component-source.ts under
 * CODEGEN-NATIVE-EMITTER-SPLIT-01 (verbatim move; generated output
 * byte-identical). See component-source.ts for the dispatch order. */
import { kotlinEnumName, kotlinParamName, pascalCase } from "./kotlin/naming.js";
import { matchesTokenRole } from "../token-role.js";
import type { ComponentIR } from "../../ir.js";

/** Find a slot by scope key and name suffix (corpus slot-name grammar —
 *  keyed by suffix, never by component name). */
export function findTokenSlot(
  ir: ComponentIR,
  scopeName: string,
  suffix: string,
) {
  return ir.tokenScopes
    .find((scope) => scope.scope === scopeName)
    ?.values.find((value) => matchesTokenRole(value.name, suffix));
}

export function tokenConstName(ir: ComponentIR): string {
  return `${ir.cssPrefix.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())}TokenScopes`;
}

/**
 * Layered suffix lookup (FEAT-COMPOSE-BUTTON-ADMISSION-01): find the slot
 * whose name ends with `suffix`, searching the scope layers last-first so
 * later layers (variant_<intent>, variant_<size>) override root — the same
 * precedence as RN's StyleSheet arrays and swift's resolveFsdsLayeredTokens.
 */
export function findLayeredSlot(ir: ComponentIR, layers: string[], suffix: string) {
  for (const layer of [...layers].reverse()) {
    const hit = ir.tokenScopes
      .find((scope) => scope.scope === layer)
      ?.values.find((value) => matchesTokenRole(value.name, suffix));
    if (hit) return { scopeKey: layer, name: hit.name };
  }
  return undefined;
}

/**
 * Chrome-role slot lookup with a corpus-derived suffix grammar. The corpus
 * names chrome slots with a per-component prefix plus a role suffix that
 * varies by family (passive roots use `.color.foreground.primary`, interactive
 * use `.color.foreground.default`; radius appears as `.size.radius`,
 * `.border.radius`, `.radius.default`, …). This mirrors the RN emitter's
 * suffix-list selection (`tokenStringByName`/`tokenNumberByName`) so both
 * families resolve the SAME slot for a role — the usage-parity ratchet in
 * scripts/compose-parity-diff.mjs asserts the consumed keys agree. Returns the
 * first role slot found; `undefined` when the component carries no slot for
 * the role, and the emitter then omits the resolution entirely (no dead
 * lookups).
 */
export function findLayeredSlotAny(
  ir: ComponentIR,
  layers: string[],
  suffixes: readonly string[],
) {
  for (const layer of [...layers].reverse()) {
    const scope = ir.tokenScopes.find((s) => s.scope === layer);
    if (!scope) continue;
    for (const suffix of suffixes) {
      const hit = scope.values.find((value) => matchesTokenRole(value.name, suffix));
      if (hit) return { scopeKey: layer, name: hit.name };
    }
  }
  return undefined;
}

/** The surface's *own* size constraint slot (`<prefix>.size.maxWidth`), not a
 *  per-variant size (`dialog.size.md.maxWidth`) — the variant-scoped slots
 *  select a named size, which a variant-less surface has no input for. */
export function findSurfaceOwnSizeSlot(
  ir: ComponentIR,
  key: "maxWidth" | "maxHeight",
) {
  const scope = ir.tokenScopes.find((s) => s.scope === "root");
  const hit = scope?.values.find((v) =>
    new RegExp(`^[A-Za-z0-9-]+[.]size[.]${key}$`).test(v.name)
  );
  return hit ? { scopeKey: "root", name: hit.name } : undefined;
}

/** Corpus chrome-role suffix grammar, mirroring the RN emitter's lists. */
export const CHROME_ROLE_SUFFIXES = {
  background: [".color.background.default", ".color.bg.default", ".color.bg"],
  foreground: [".color.foreground.default", ".color.foreground.primary"],
  radius: [".border.radius", ".size.radius", ".radius.default", ".radius"],
} as const;

/** Chrome-role slots a passive root can realize, resolved through the corpus
 *  suffix grammar. Shared by the static-content, prop-text, expandable, and
 *  progress/status paths — one grammar, one place. */
export interface StaticChromeSlots {
  bgSlot?: { name: string };
  fgSlot?: { name: string };
  radiusSlot?: { name: string };
  paddingInlineStartSlot?: { name: string };
  paddingInlineEndSlot?: { name: string };
  paddingBlockStartSlot?: { name: string };
  paddingBlockEndSlot?: { name: string };
  minHeightSlot?: { name: string };
  usesColors: boolean;
  anyPaddingSlot: boolean;
  usesDims: boolean;
  needsClip: boolean;
}

export function resolveStaticChrome(ir: ComponentIR): StaticChromeSlots {
  const bgSlot = findLayeredSlotAny(ir, ["root"], CHROME_ROLE_SUFFIXES.background);
  const fgSlot = findLayeredSlotAny(ir, ["root"], CHROME_ROLE_SUFFIXES.foreground);
  const radiusSlot = findLayeredSlotAny(ir, ["root"], CHROME_ROLE_SUFFIXES.radius);
  const paddingInlineStartSlot = findLayeredSlot(ir, ["root"], "box-model.padding-inline-start");
  const paddingInlineEndSlot = findLayeredSlot(ir, ["root"], "box-model.padding-inline-end");
  const paddingBlockStartSlot = findLayeredSlot(ir, ["root"], "box-model.padding-block-start");
  const paddingBlockEndSlot = findLayeredSlot(ir, ["root"], "box-model.padding-block-end");
  const minHeightSlot = findLayeredSlot(ir, ["root"], "box-model.min-height");
  const usesColors = Boolean(bgSlot || fgSlot);
  const anyPaddingSlot = Boolean(
    paddingInlineStartSlot || paddingInlineEndSlot || paddingBlockStartSlot || paddingBlockEndSlot,
  );
  const usesDims = Boolean(radiusSlot || anyPaddingSlot || minHeightSlot);
  const needsClip = Boolean(bgSlot || radiusSlot);
  return {
    bgSlot,
    fgSlot,
    radiusSlot,
    paddingInlineStartSlot,
    paddingInlineEndSlot,
    paddingBlockStartSlot,
    paddingBlockEndSlot,
    minHeightSlot,
    usesColors,
    anyPaddingSlot,
    usesDims,
    needsClip,
  };
}

/** Emits the theme read + layeredSlot resolver (variant scopes then root). */
export function emitThemeHeader(
  lines: string[],
  ir: ComponentIR,
  variantKeysKt: string,
): void {
  lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
  lines.push(`    fun layeredSlot(slotName: String): String? {`);
  lines.push(
    `        for (key in listOf(${[variantKeysKt, `"root"`].filter(Boolean).join(", ")})) {`,
  );
  lines.push(`            val def = ${tokenConstName(ir)}[key]?.get(slotName)`);
  lines.push(`            if (def != null) return fsdsTheme.resolve(def)`);
  lines.push(`        }`);
  lines.push(`        return null`);
  lines.push(`    }`);
}

/** Emits the chrome val resolutions (gated on slot existence) and returns the
 *  four padding side expressions (a slot val name, or "0.dp"). */
export function emitChromeVals(
  lines: string[],
  slots: StaticChromeSlots,
): [string, string, string, string] {
  if (slots.bgSlot) {
    lines.push(
      `    val containerColor = layeredSlot(${JSON.stringify(slots.bgSlot.name)})?.toFsdsColor()`,
    );
  }
  if (slots.fgSlot) {
    lines.push(
      `    val contentColor = layeredSlot(${JSON.stringify(slots.fgSlot.name)})?.toFsdsColor()`,
    );
  }
  if (slots.radiusSlot) {
    lines.push(
      `    val cornerRadius = layeredSlot(${JSON.stringify(slots.radiusSlot.name)})?.toFsdsDp() ?: 0.dp`,
    );
  }
  const sideVal = (valName: string, slot: { name: string } | undefined): string => {
    if (slot) {
      lines.push(
        `    val ${valName} = layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp`,
      );
      return valName;
    }
    return "0.dp";
  };
  const paddingInlineStart = sideVal("paddingInlineStart", slots.paddingInlineStartSlot);
  const paddingInlineEnd = sideVal("paddingInlineEnd", slots.paddingInlineEndSlot);
  const paddingBlockStart = sideVal("paddingBlockStart", slots.paddingBlockStartSlot);
  const paddingBlockEnd = sideVal("paddingBlockEnd", slots.paddingBlockEndSlot);
  if (slots.minHeightSlot) {
    lines.push(
      `    val minHeight = layeredSlot(${JSON.stringify(slots.minHeightSlot.name)})?.toFsdsDp()`,
    );
  }
  return [paddingInlineStart, paddingInlineEnd, paddingBlockStart, paddingBlockEnd];
}

/** Emits the chrome modifier chain (clip/background/padding/min-height).
 *  `sides` are the four padding side expressions from emitChromeVals. */
export function emitChromeModifier(
  lines: string[],
  slots: StaticChromeSlots,
  sides: [string, string, string, string],
): void {
  const [paddingInlineStart, paddingInlineEnd, paddingBlockStart, paddingBlockEnd] = sides;
  const chromeLines: string[] = [`    val chromeModifier = Modifier`];
  if (slots.needsClip) {
    lines.push(`    val shape = RoundedCornerShape(cornerRadius)`);
    chromeLines.push(`        .clip(shape)`);
  }
  if (slots.bgSlot) {
    chromeLines.push(
      `        .then(if (containerColor != null) Modifier.background(containerColor, shape) else Modifier)`,
    );
  }
  if (slots.anyPaddingSlot) {
    chromeLines.push(
      `        .padding(start = ${paddingInlineStart}, end = ${paddingInlineEnd}, top = ${paddingBlockStart}, bottom = ${paddingBlockEnd})`,
    );
  }
  if (slots.minHeightSlot) {
    chromeLines.push(
      `        .then(if (minHeight != null) Modifier.height(minHeight) else Modifier)`,
    );
  }
  lines.push(...chromeLines);
}

/** Variant axes for a component: enum per axis from ir.variants with the
 *  same-named designed prop's defaultExpr. Shared by the axis-bearing paths. */
export function collectVariantAxes(ir: ComponentIR) {
  return Object.keys(ir.variants ?? {}).map((axis) => {
    const values = ir.variants[axis] ?? [];
    const prop = ir.styledProps.find((p) => p.safeName === axis);
    const defaultExpr = prop?.defaultExpr?.replace(/^["']|["']$/g, "") ?? values[0];
    return {
      propName: prop?.safeName ?? axis,
      enumName: `${ir.name}${pascalCase(axis)}`,
      values,
      defaultExpr,
    };
  });
}

/** Per-axis slot lookup: resolves `<prefix>.<axis>.<value>` through the
 *  layered scopes — the Switch track-dims pattern, generalized. */
export function emitAxisSlotLookup(
  lines: string[],
  valName: string,
  prefix: string,
  axis: { propName: string; enumName: string; values: string[] },
  accessor: "toFsdsDp" | "toFsdsColor" | "toFsdsMs",
): void {
  lines.push(`    val ${valName} = layeredSlot(`);
  lines.push(`        when (${kotlinParamName(axis.propName)}) {`);
  for (const value of axis.values) {
    lines.push(
      `            ${axis.enumName}.${kotlinEnumName(value)} -> ${JSON.stringify(`${prefix}.${value}`)}`,
    );
  }
  lines.push(`        },`);
  lines.push(`    )?.${accessor}()`);
}
