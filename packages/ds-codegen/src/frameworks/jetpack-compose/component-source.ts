import { composeTokenReads, consumedComposeTokenScopes } from "../native-token-consumption.js";
/**
 * Jetpack Compose composable emission.
 *
 * Implemented path: native-collapse (native-toggle-affordance) — the Compose
 * twin of the SwiftUI collapse class. A contract whose multi-part anatomy
 * collapses to a native on/off control (Switch, ToggleSwitch) emits a single
 * `@Composable fun` wrapping Material 3's `Switch` with the contract's
 * controlled/uncontrolled channel hoisting and the IR's normalized semantics
 * (role, toggleableState, stateDescription). Every other collapse class and
 * shape throws an explicit not-implemented error — corpus-wide generation
 * stays out of scope until their slices land.
 *
 * All facts derive from the ComponentIR: channel param names come from
 * `behavior.normalizedChannels[0]` (Switch's `onChange`, not a Material
 * idiom literal), the size axis from `styledProps` ∩ `definedTypes` with
 * enum values, boolean/string passthroughs from the remaining styled props.
 * The one framework-grammar table this slice owns: track dimensions per size
 * value (dp) — md is contract-token-shaped, sm/lg are annotated defaults
 * pending token-graph coverage (mirrored from the hand-authored golden
 * prototype, `__golden__/Switch/Switch.compose.kt`, with its line-67 `??`
 * defect corrected to the Kotlin elvis operator).
 */
import type { ComponentIR, DomNodeIR, NormalizedChannelIR } from "../../ir.js";
import { collectCollapseIntents, collectContentTransforms } from "../../ir.js";
import { emitComposeHighlightComponent } from "./highlight-source.js";
// Shared native emission-class substrate (FEAT-COMPOSE-ADMISSION-SUBSTRATE-01):
// the structural class facts this emitter dispatches on are target-neutral
// and live exactly once there — swift's emitter used to steward them.
import {
  domGlyph,
  isArrayIteratedList,
  isBareRuleLeaf,
  collectDomSlots,
  isCenteredSurface,
  isCoachmarkSurface,
  isDateGridSurface,
  surfaceStringChannel,
  isGlyphHost,
  isCountIteratedFieldGroup,
  isIconDecoratedContent,
  isInteractiveComposite,
  isLabeledTextControl,
  isCompoundPartComposer,
  isMediaLeaf,
  isReferencedContentComposite,
  isNamedSlotComposer,
  isPassiveTreeItem,
  isProjectedChildrenAction,
  isReferencedActionComposite,
  isSelectionControl,
  isStaticContent,
  isValueChannelControl,
  isViewportEdgeSurface,
  radioGroupFacts,
  soleValueChannel,
} from "../native-emission-class.js";
import type { RadioGroupFacts } from "../native-emission-class.js";

/** Kotlin hard keywords that cannot appear as package-name segments. */
const KOTLIN_HARD_KEYWORDS = new Set([
  "as", "break", "class", "continue", "do", "else", "false", "for", "fun",
  "if", "in", "interface", "is", "null", "object", "package", "return",
  "super", "this", "throw", "true", "try", "typealias", "typeof", "val",
  "var", "when", "while",
]);

function packageSegment(name: string): string {
  const segment = name.replace(/([a-z0-9])([A-Z])/g, "$1$2").toLowerCase();
  return KOTLIN_HARD_KEYWORDS.has(segment) ? `${segment}component` : segment;
}

/**
 * Kotlin parameter-name escape: hard keywords are backtick-quoted
 * (`` `as` ``), so a contract axis named `as`/`in`/`is` can still lower to
 * a composable parameter.
 */
function kotlinParamName(name: string): string {
  return KOTLIN_HARD_KEYWORDS.has(name) ? `\`${name}\`` : name;
}

function pascalCase(value: string): string {
  return value
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Kotlin enum-entry identifier: pascalCase plus a digit-leading guard —
 * "2xl" must not emit as an enum member (identifier starting with a digit
 * is a syntax error). Prefixes "N" so TextSize.2xl -> TextSize.N2xl.
 */
function kotlinEnumName(value: string): string {
  const pascal = pascalCase(value);
  return /^[0-9]/.test(pascal) ? `N${pascal}` : pascal;
}

/**
 * Track dimensions per size value (width x height, dp). Framework grammar.
 * The corpus carries two size vocabularies (Switch: sm/md/lg;
 * ToggleSwitch: small/medium/large) — both map onto the same physical
 * ladder. md is contract-token-shaped; the rest are annotated defaults
 * pending token-graph coverage.
 */
const SIZE_TRACK_DP: Record<string, [number, number]> = {
  sm: [36, 18],
  md: [48, 24],
  lg: [60, 30],
  small: [36, 18],
  medium: [48, 24],
  large: [60, 30],
};

/** Checkbox visual-box side per size value (dp) — the boolean-control
 *  class's framework-grammar table, the twin of SIZE_TRACK_DP. The token
 *  graph carries no checkbox box-size slot yet; when it does, the default
 *  size resolves through the scopes exactly as the toggle's md does. */
const CHECKBOX_BOX_DP: Record<string, number> = {
  sm: 14,
  md: 18,
  lg: 22,
  small: 14,
  medium: 18,
  large: 22,
};

/** Find a slot by scope key and name suffix (corpus slot-name grammar —
 *  keyed by suffix, never by component name). */
function findTokenSlot(
  ir: ComponentIR,
  scopeName: string,
  suffix: string,
) {
  return ir.tokenScopes
    .find((scope) => scope.scope === scopeName)
    ?.values.find((value) => value.name.endsWith(suffix));
}

function tokenConstName(ir: ComponentIR): string {
  return `${ir.cssPrefix.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())}TokenScopes`;
}

/**
 * Layered suffix lookup (FEAT-COMPOSE-BUTTON-ADMISSION-01): find the slot
 * whose name ends with `suffix`, searching the scope layers last-first so
 * later layers (variant_<intent>, variant_<size>) override root — the same
 * precedence as RN's StyleSheet arrays and swift's resolveFsdsLayeredTokens.
 */
function findLayeredSlot(ir: ComponentIR, layers: string[], suffix: string) {
  for (const layer of [...layers].reverse()) {
    const hit = ir.tokenScopes
      .find((scope) => scope.scope === layer)
      ?.values.find((value) => value.name.endsWith(suffix));
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
function findLayeredSlotAny(
  ir: ComponentIR,
  layers: string[],
  suffixes: readonly string[],
) {
  for (const layer of [...layers].reverse()) {
    const scope = ir.tokenScopes.find((s) => s.scope === layer);
    if (!scope) continue;
    for (const suffix of suffixes) {
      const hit = scope.values.find((value) => value.name.endsWith(suffix));
      if (hit) return { scopeKey: layer, name: hit.name };
    }
  }
  return undefined;
}

/** The surface's *own* size constraint slot (`<prefix>.size.maxWidth`), not a
 *  per-variant size (`dialog.size.md.maxWidth`) — the variant-scoped slots
 *  select a named size, which a variant-less surface has no input for. */
function findSurfaceOwnSizeSlot(
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
const CHROME_ROLE_SUFFIXES = {
  background: [".color.background.default", ".color.bg.default", ".color.bg"],
  foreground: [".color.foreground.default", ".color.foreground.primary"],
  radius: [".border.radius", ".size.radius", ".radius.default", ".radius"],
} as const;

/**
 * The projected-children action class: a native button root whose entire
 * content is the consumer's projected children (Button is the corpus
 * consumer). Lowers onto the hand-authored foundation-only FsdsButton
 * substrate, with the style resolved from layered scopes through
 * LocalFsdsTheme — never Material, per the owned-substrate doctrine.
 */
function emitProjectedChildrenAction(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);

  // Variant axes: enum per axis from ir.variants, defaults from the
  // same-named designed prop's defaultExpr.
  const axisFor = (axis: string) => {
    const values = ir.variants[axis] ?? [];
    const prop = ir.styledProps.find((p) => p.safeName === axis);
    const defaultExpr = prop?.defaultExpr?.replace(/^["']|["']$/g, "") ?? values[0];
    return { enumName: `${name}${pascalCase(axis)}`, values, defaultExpr, propName: prop?.safeName ?? axis };
  };

  const intentAxis = Object.keys(ir.variants).find((axis) => axis !== "size");
  const sizeAxis = Object.keys(ir.variants).find((axis) => axis === "size");

  const prop = (propName: string) => ir.styledProps.find((p) => p.safeName === propName);
  const hasDisabled = prop("disabled") !== undefined;
  const hasLoading = prop("loading") !== undefined;
  const hasAriaLabel = prop("ariaLabel") !== undefined;
  const onClickProp = prop("onClick")?.safeName ?? "onClick";

  const size = sizeAxis ? axisFor(sizeAxis) : undefined;
  const intent = intentAxis ? axisFor(intentAxis) : undefined;

  const layerKeysKt = [
    ...(intent ? [`"variant_" + ${intent.propName}.name.lowercase()`] : []),
    ...(size ? [`"variant_" + ${size.propName}.name.lowercase()`] : []),
    `"root"`,
  ].join(", ");

  const containerSlot = findLayeredSlotAny(ir, ["root"], CHROME_ROLE_SUFFIXES.background);
  const hoverSlot = findLayeredSlot(ir, ["root"], "color.background.hover");
  const activeSlot = findLayeredSlot(ir, ["root"], "color.background.active");
  const disabledBgSlot = findLayeredSlot(ir, ["root"], "color.background.disabled");
  const fgSlot = findLayeredSlotAny(ir, ["root"], CHROME_ROLE_SUFFIXES.foreground);
  const fgDisabledSlot = findLayeredSlot(ir, ["root"], "color.foreground.disabled");
  const borderSlot = findLayeredSlot(ir, ["root"], "color.border.default");
  const focusSlot = findLayeredSlot(ir, ["root"], "color.border.focus");
  const radiusSlot = findLayeredSlotAny(ir, ["root"], CHROME_ROLE_SUFFIXES.radius);
  const borderWidthSlot = findLayeredSlot(ir, ["root"], "size.border");
  const durationSlot = findLayeredSlot(ir, ["root"], "motion.duration.fast");
  const minHeightSlot = findLayeredSlot(ir, ["root"], "box-model.min-height");
  const minWidthSlot = findLayeredSlot(ir, ["root"], "box-model.min-width");
  const paddingInlineStartSlot = findLayeredSlot(ir, ["root"], "box-model.padding-inline-start");
  const paddingInlineEndSlot = findLayeredSlot(ir, ["root"], "box-model.padding-inline-end");
  const paddingBlockStartSlot = findLayeredSlot(ir, ["root"], "box-model.padding-block-start");
  const paddingBlockEndSlot = findLayeredSlot(ir, ["root"], "box-model.padding-block-end");

  const lines: string[] = [];
  lines.push(
    `// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`,
  );
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import com.fullstackds.components.button.FsdsButton`);
  lines.push(`import com.fullstackds.components.button.FsdsButtonScope`);
  for (const line of referenceImports(ir)) lines.push(line);
  lines.push(`import com.fullstackds.components.button.FsdsButtonStyle`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
  lines.push(`import com.fullstackds.tokens.toFsdsColor`);
  lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  lines.push(`import com.fullstackds.tokens.toFsdsMs`);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  if (size) {
    lines.push(`/** Size axis lowered from the contract's ${size.propName} variant. */`);
    lines.push(`enum class ${size.enumName} { ${size.values.map(kotlinEnumName).join(", ")} }`);
    lines.push(``);
  }
  if (intent) {
    lines.push(`/** Intent axis lowered from the contract's ${intent.propName} variant. */`);
    lines.push(`enum class ${intent.enumName} { ${intent.values.map(kotlinEnumName).join(", ")} }`);
    lines.push(``);
  }
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  // AOSP Compose API guideline: `modifier` is the first optional parameter.
  lines.push(`    modifier: Modifier = Modifier,`);
  if (size) {
    lines.push(`    ${size.propName}: ${size.enumName} = ${size.enumName}.${kotlinEnumName(size.defaultExpr)},`);
  }
  if (intent) {
    lines.push(`    ${intent.propName}: ${intent.enumName} = ${intent.enumName}.${kotlinEnumName(intent.defaultExpr)},`);
  }
  if (hasDisabled) lines.push(`    disabled: Boolean = false,`);
  if (hasLoading) lines.push(`    loading: Boolean = false,`);
  if (hasAriaLabel) lines.push(`    accessibilityLabel: String? = null,`);
  lines.push(`    ${onClickProp}: (() -> Unit)? = null,`);
  lines.push(`    content: @Composable FsdsButtonScope.() -> Unit,`);
  lines.push(`) {`);
  lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
  // Layered resolution: later layers override earlier per slot.
  lines.push(`    fun layeredSlot(slotName: String): String? {`);
  lines.push(`        for (key in listOf(${layerKeysKt})) {`);
  lines.push(`            val def = ${tokenConstName(ir)}[key]?.get(slotName)`);
  lines.push(`            if (def != null) return fsdsTheme.resolve(def)`);
  lines.push(`        }`);
  lines.push(`        return null`);
  lines.push(`    }`);
  const colorVal = (valName: string, s: { name: string } | undefined) => {
    if (s) {
      lines.push(`    val ${valName} = layeredSlot(${JSON.stringify(s.name)})?.toFsdsColor()`);
    } else {
      lines.push(`    val ${valName}: Color? = null`);
    }
  };
  colorVal("containerColor", containerSlot);
  colorVal("containerHoverColor", hoverSlot);
  colorVal("containerActiveColor", activeSlot);
  colorVal("containerDisabledColor", disabledBgSlot);
  colorVal("contentColor", fgSlot);
  colorVal("contentDisabledColor", fgDisabledSlot);
  colorVal("borderColor", borderSlot);
  colorVal("focusRingColor", focusSlot);
  // Dimension slots resolve through the theme when the component carries
  // them; absent roles fall back to the ledgered constant with NO dead lookup.
  const dimVal = (valName: string, s: { name: string } | undefined, fallback: string) => {
    if (s) {
      lines.push(
        `    val ${valName} = layeredSlot(${JSON.stringify(s.name)})?.toFsdsDp() ?: ${fallback}`,
      );
    } else {
      lines.push(`    val ${valName} = ${fallback}`);
    }
  };
  dimVal("cornerRadius", radiusSlot, "4.dp");
  dimVal("borderWidth", borderWidthSlot, "1.dp");
  if (durationSlot) {
    lines.push(
      `    val pressDurationMs = layeredSlot(${JSON.stringify(durationSlot.name)})?.toFsdsMs() ?: 100`,
    );
  }
  dimVal("minHeight", minHeightSlot, "32.dp");
  dimVal("minWidth", minWidthSlot, "32.dp");
  dimVal("paddingInlineStart", paddingInlineStartSlot, "8.dp");
  dimVal("paddingInlineEnd", paddingInlineEndSlot, "8.dp");
  dimVal("paddingBlockStart", paddingBlockStartSlot, "4.dp");
  dimVal("paddingBlockEnd", paddingBlockEndSlot, "4.dp");
  lines.push(``);
  lines.push(`    val buttonStyle = FsdsButtonStyle(`);
  lines.push(`        containerColor = containerColor,`);
  lines.push(`        containerColorHover = containerHoverColor,`);
  lines.push(`        containerColorActive = containerActiveColor,`);
  lines.push(`        containerColorDisabled = containerDisabledColor,`);
  lines.push(`        contentColor = contentColor,`);
  lines.push(`        contentColorDisabled = contentDisabledColor,`);
  lines.push(`        borderColor = borderColor,`);
  lines.push(`        borderWidth = borderWidth,`);
  lines.push(`        cornerRadius = cornerRadius,`);
  lines.push(`        focusRingColor = focusRingColor,`);
  if (durationSlot) {
    lines.push(`        pressDurationMs = pressDurationMs,`);
  }
  lines.push(`        minHeight = minHeight,`);
  lines.push(`        minWidth = minWidth,`);
  lines.push(`        padding = PaddingValues(start = paddingInlineStart, top = paddingBlockStart, end = paddingInlineEnd, bottom = paddingBlockEnd),`);
  lines.push(`    )`);
  lines.push(``);
  lines.push(`    FsdsButton(`);
  lines.push(`        onClick = ${onClickProp},`);
  lines.push(`        style = buttonStyle,`);
  lines.push(`        modifier = modifier,`);
  lines.push(
    `        enabled = ${hasDisabled ? "!disabled" : "true"}${hasLoading ? " && !loading" : ""},`,
  );
  lines.push(
    `        contentDescription = ${hasAriaLabel ? "accessibilityLabel" : "null"},`,
  );
  const decorationRefs = referenceNodes(ir, "decoration");
  if (decorationRefs.length > 0) {
    lines.push(`        content = {`);
    for (const ref of decorationRefs) {
      lines.push(...emitComponentReference(ir, ref, "            "));
    }
    lines.push(`            content()`);
    lines.push(`        },`);
  } else {
    lines.push(`        content = content,`);
  }
  lines.push(`    )`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The per-component token-scope data file — the Kotlin mirror of the RN
 * `<Name>.tokens.ts` emission. Only scopes and slots read by the emitted component
 * ship as data (name/cssVar/ref/literal/fallback as raw strings;
 * the FsdsTheme runtime parses and resolves).
 */
export function generateJetpackComposeTokensFile(
  ir: ComponentIR,
  sourceOverride?: string,
): string {
  const used = composeTokenReads(sourceOverride ?? generateJetpackComposeComponentSource(ir));
  ir = { ...ir, tokenScopes: consumedComposeTokenScopes(ir, used) };
  const lines: string[] = [];
  lines.push(
    `// @generated by ds-codegen from components/${ir.name}/${ir.name}.contract.json — do not edit by hand.`,
  );
  lines.push(`package com.fullstackds.components.${packageSegment(ir.name)}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  lines.push(`import com.fullstackds.tokens.ComponentTokenDefinition`);
  lines.push(`import com.fullstackds.tokens.ComponentTokenScopes`);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`val ${tokenConstName(ir)}: ComponentTokenScopes = mapOf(`);
  for (const scope of ir.tokenScopes) {
    if (scope.values.length === 0) continue;
    lines.push(`    ${JSON.stringify(scope.scope)} to mapOf(`);
    for (const value of scope.values) {
      lines.push(`        ${JSON.stringify(value.name)} to ComponentTokenDefinition(`);
      lines.push(`            name = ${JSON.stringify(value.name)},`);
      lines.push(`            cssVar = ${JSON.stringify(value.cssVar)},`);
      if (value.resolvesTo) {
        lines.push(`            ref = ${JSON.stringify(value.resolvesTo)},`);
      }
      if (value.rawValue !== undefined) {
        lines.push(
          `            ${value.isLiteral ? "literal" : "fallback"} = ${JSON.stringify(value.rawValue)},`,
        );
      }
      lines.push(`        ),`);
    }
    lines.push(`    ),`);
  }
  lines.push(`)`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

// The static-content class predicate is shared substrate
// (native-emission-class.ts): passive root, at most one projected children
// leaf, no essential component instances. A contract-authored decoration
// may degrade on this target; the native lane proves compilation, not
// visual parity.

/** Chrome-role slots a passive root can realize, resolved through the corpus
 *  suffix grammar. Shared by the static-content, prop-text, expandable, and
 *  progress/status paths — one grammar, one place. */
interface StaticChromeSlots {
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

function resolveStaticChrome(ir: ComponentIR): StaticChromeSlots {
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
function emitThemeHeader(
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
function emitChromeVals(
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
function emitChromeModifier(
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

/**
 * Static-content composable: a passive root whose content is the consumer's
 * composable lambda, with chrome (padding/background/radius/foreground)
 * resolved from the component's token scopes through the theme. Variant
 * axes lower to enums; layered resolution prefers the active variant scope
 * over root — the same ordering the projected-children path uses.
 */
function emitStaticContent(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const axes = Object.keys(ir.variants ?? {}).map((axis) => {
    const values = ir.variants[axis] ?? [];
    const prop = ir.styledProps.find((p) => p.safeName === axis);
    const defaultExpr =
      prop?.defaultExpr?.replace(/^["']|["']$/g, "") ?? values[0];
    return {
      propName: prop?.safeName ?? axis,
      enumName: `${name}${pascalCase(axis)}`,
      values,
      defaultExpr,
    };
  });
  const variantKeysKt = axes
    .map((a) => `"variant_" + ${kotlinParamName(a.propName)}.name.lowercase()`)
    .join(", ");

  // Chrome roles resolve through the corpus suffix grammar; a role slot that
  // the component does not carry is OMITTED entirely — never a dead
  // `layeredSlot("")` lookup (A1).
  const slots = resolveStaticChrome(ir);
  const { fgSlot } = slots;
  const usesTheme = ir.tokenScopes.length > 0;

  // Typography-bearing content root: the scopes carry text-size slots
  // (`text.size.*`) — the same slot evidence the parity ratchet keys on, so
  // this generalizes to any content root without component-name lore.
  const isTypographyRoot = ir.tokenScopes.some((s) =>
    s.values.some((v) => v.name.includes("text.size.")),
  );
  // The typography weight axis: the variant axis whose values name the
  // corpus's `text.typography.fontWeight.<value>` slots.
  const weightAxis = axes.find((a) =>
    ir.tokenScopes.some((s) =>
      s.values.some((v) => v.name === `text.typography.fontWeight.${a.values[0]}`),
    ),
  );
  // A TextStyle is emitted only when both typography facts hold: text-size
  // slots exist AND a weight axis names the fontWeight slots.
  const emitsTextStyle = isTypographyRoot && weightAxis !== undefined;
  // Weight-value → slot-name vocabulary: normal lowers to the "regular" slot
  // and semibold to "medium" (the corpus slot vocabulary, mirrored from the
  // RN emitter's per-value entries).
  const WEIGHT_SLOT_SYNONYM: Record<string, string> = {
    normal: "regular",
    semibold: "medium",
  };
  // Element-tag union prop (`as`: p/span/div/h1-h6): a designed prop whose
  // defined-type union is entirely element tags. General over the union
  // values; heading semantics derive from h1-h6, never from names.
  const ELEMENT_TAGS = new Set(["p", "span", "div", "h1", "h2", "h3", "h4", "h5", "h6"]);
  const elementProp = ir.styledProps.find((p) =>
    p.typeRefs.some((ref) => {
      const def = ir.definedTypes[ref];
      return (
        def?.kind === "union" &&
        (def.values?.length ?? 0) > 0 &&
        def.values!.every((v) => ELEMENT_TAGS.has(v))
      );
    }),
  );
  const elementTypeRef = elementProp?.typeRefs.find(
    (r) => ir.definedTypes[r]?.kind === "union",
  );
  const elementType = elementTypeRef ? ir.definedTypes[elementTypeRef] : undefined;
  const elementAxis = elementProp && elementType
    ? {
        propName: elementProp.safeName,
        typeName: elementTypeRef!,
        values: elementType.values as string[],
        defaultExpr:
          elementProp.defaultExpr?.replace(/^["']|["']$/g, "") ?? elementType.values![0],
      }
    : undefined;

  const lines: string[] = [];
  lines.push(
    `// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`,
  );
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  if (slots.usesColors) lines.push(`import androidx.compose.foundation.background`);
  lines.push(`import androidx.compose.foundation.layout.Box`);
  if (slots.minHeightSlot) lines.push(`import androidx.compose.foundation.layout.height`);
  if (slots.anyPaddingSlot) {
    lines.push(`import androidx.compose.foundation.layout.padding`);
  }
  if (slots.needsClip) lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.runtime.Composable`);
  if (fgSlot) {
    lines.push(`import androidx.compose.runtime.CompositionLocalProvider`);
  }
  lines.push(`import androidx.compose.ui.Modifier`);
  if (slots.needsClip) lines.push(`import androidx.compose.ui.draw.clip`);
  if (slots.usesColors) lines.push(`import androidx.compose.ui.graphics.Color`);
  if (slots.usesDims) lines.push(`import androidx.compose.ui.unit.dp`);
  if (emitsTextStyle) {
    lines.push(`import androidx.compose.ui.text.TextStyle`);
    lines.push(`import androidx.compose.ui.text.font.FontWeight`);
    lines.push(`import androidx.compose.ui.unit.TextUnit`);
  }
  if (elementAxis) {
    lines.push(`import androidx.compose.ui.semantics.heading`);
    lines.push(`import androidx.compose.ui.semantics.semantics`);
  }
  if (usesTheme) {
    lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
    for (const line of referenceImports(ir)) lines.push(line);
    if (slots.usesColors) lines.push(`import com.fullstackds.tokens.toFsdsColor`);
    if (slots.usesDims) lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  }
  if (fgSlot) lines.push(`import com.fullstackds.tokens.LocalFsdsContentColor`);
  if (emitsTextStyle) {
    lines.push(`import com.fullstackds.tokens.ProvideFsdsTextStyle`);
    lines.push(`import com.fullstackds.tokens.toFsdsSp`);
    lines.push(`import com.fullstackds.tokens.toFsdsWeight`);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  for (const axis of axes) {
    lines.push(
      `/** ${axis.propName} axis lowered from the contract's ${axis.propName} variant. */`,
    );
    lines.push(
      `enum class ${axis.enumName} { ${axis.values.map(kotlinEnumName).join(", ")} }`,
    );
    lines.push(``);
  }
  if (elementAxis) {
    lines.push(
      `/** Element-tag prop lowered from the contract's ${elementAxis.propName} union type. */`,
    );
    lines.push(
      `enum class ${elementAxis.typeName} { ${elementAxis.values.map(kotlinEnumName).join(", ")} }`,
    );
    lines.push(``);
  }
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  // AOSP Compose API guideline: `modifier` is the first optional parameter.
  lines.push(`    modifier: Modifier = Modifier,`);
  for (const axis of axes) {
    lines.push(
      `    ${kotlinParamName(axis.propName)}: ${axis.enumName} = ${axis.enumName}.${kotlinEnumName(axis.defaultExpr)},`,
    );
  }
  if (elementAxis) {
    lines.push(
      `    ${kotlinParamName(elementAxis.propName)}: ${elementAxis.typeName} = ${elementAxis.typeName}.${kotlinEnumName(elementAxis.defaultExpr)},`,
    );
  }
  lines.push(`    content: @Composable () -> Unit,`);
  lines.push(`) {`);
  if (usesTheme) {
    emitThemeHeader(lines, ir, variantKeysKt);
    const sides = emitChromeVals(lines, slots);
    if (isTypographyRoot && weightAxis) {
      // Typography lowering (FEAT-COMPOSE-TYPOGRAPHY-CONTENT-01): the type
      // scale resolves from the layered scopes — fontSize from the `text.size.md`
      // slot (variant scope first), fontWeight from the `text.typography.
      // fontWeight.<weight>` slot with the corpus value→slot vocabulary.
      lines.push(
        `    val fsdsFontSize = layeredSlot("text.size.md")?.toFsdsSp()`,
      );
      lines.push(`    val fsdsFontWeight = layeredSlot(`);
      lines.push(`        when (${kotlinParamName(weightAxis.propName)}) {`);
      for (const value of weightAxis.values) {
        lines.push(
          `            ${weightAxis.enumName}.${kotlinEnumName(value)} -> "text.typography.fontWeight.${WEIGHT_SLOT_SYNONYM[value] ?? value}"`,
        );
      }
      lines.push(`        },`);
      lines.push(`    )?.toFsdsWeight()`);
      lines.push(
        `    val fsdsTextStyle = TextStyle(fontSize = fsdsFontSize ?: TextUnit.Unspecified, fontWeight = fsdsFontWeight ?: FontWeight.Normal)`,
      );
    }
    lines.push(``);
    emitChromeModifier(lines, slots, sides);
    if (elementAxis) {
      // Element semantics: h1-h6 lower to the heading semantics marker (the
      // union values are the fact — no component names); p/span/div carry no
      // heading. The CMP 1.8.0 desktop semantics artifact exposes only the
      // level-less `heading()` marker (Heading.Level is absent — verified by
      // jar scan), so the H1-H6 level distinction is a named non-claim.
      lines.push(`    val headingModifier = when (${kotlinParamName(elementAxis.propName)}) {`);
      for (const value of elementAxis.values) {
        if (/^h[1-6]$/.test(value)) {
          lines.push(
            `        ${elementAxis.typeName}.${kotlinEnumName(value)} -> Modifier.semantics { heading() }`,
          );
        }
      }
      lines.push(`        else -> Modifier`);
      lines.push(`    }`);
      lines.push(``);
    }
    const decorationRefs = referenceNodes(ir, "decoration");
    const decorationBody =
      decorationRefs.length > 0
        ? [
            "{",
            ...decorationRefs.flatMap((ref) => emitComponentReference(ir, ref, "    ")),
            "    content()",
            "}",
          ].join("\n")
        : "{ content() }";
    const box = elementAxis
      ? `Box(modifier.then(chromeModifier).then(headingModifier)) ${decorationBody}`
      : `Box(modifier.then(chromeModifier)) ${decorationBody}`;
    // Wrapping: text style outermost (M3 LocalTextStyle bridge), then the
    // content-color provider, then the box — each only when its fact exists.
    const contentLines: string[] = [];
    if (fgSlot) {
      contentLines.push(
        `CompositionLocalProvider(LocalFsdsContentColor provides (contentColor ?: Color.Unspecified)) {`,
      );
      contentLines.push(`    ${box}`);
      contentLines.push(`}`);
    } else {
      contentLines.push(box);
    }
    if (emitsTextStyle) {
      lines.push(`    ProvideFsdsTextStyle(fsdsTextStyle) {`);
      for (const l of contentLines) lines.push(`        ${l}`);
      lines.push(`    }`);
    } else {
      for (const l of contentLines) lines.push(`    ${l}`);
    }
  } else {
    lines.push(`    Box(modifier) { content() }`);
  }
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/** Variant axes for a component: enum per axis from ir.variants with the
 *  same-named designed prop's defaultExpr. Shared by the axis-bearing paths. */
function collectVariantAxes(ir: ComponentIR) {
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

/** Resolve the text source of a prop-text leaf: a prop binding on the root,
 *  on a single `code` part child, or the source prop of a content transform
 *  (highlight/markdown degrade to their source prop — the swift gate's facts).
 *  The IR owns the content binding shape; no per-component names. */
function propTextSource(ir: ComponentIR): { prop: string; optionalContent?: boolean } | undefined {
  const direct = ir.dom?.content;
  if (direct && "prop" in direct) return { prop: direct.prop };
  const codeChild = (ir.dom?.children ?? []).find((c) => c.part === "code");
  const nested = codeChild?.content;
  if (nested && "prop" in nested) return { prop: nested.prop };
  const nestedSrc = (nested as { source?: unknown } | undefined)?.source;
  if (nestedSrc && typeof nestedSrc === "object" && "prop" in nestedSrc) {
    return { prop: (nestedSrc as { prop: string }).prop };
  }
  const directSrc = (direct as { source?: unknown } | undefined)?.source;
  if (directSrc && typeof directSrc === "object" && "prop" in directSrc) {
    return { prop: (directSrc as { prop: string }).prop };
  }
  const fallback = (node: NonNullable<ComponentIR["dom"]>): { prop: string; optionalContent: boolean } | undefined => {
    const content = node.content;
    const source = content && "source" in content ? content.source : content;
    if (node.ifProp === "children" && node.ifNegated && source && "prop" in source) {
      return { prop: source.prop, optionalContent: true };
    }
    for (const child of node.children ?? []) {
      const found = fallback(child);
      if (found) return found;
    }
    return undefined;
  };
  return ir.dom ? fallback(ir.dom) : undefined;
}

/** Prop-text leaf: a passive root (no channels, no surface) whose text
 *  content binds to a prop — CodeBlock/CodeSnippet/Markdown. */
function isPropTextLeaf(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  if (ir.behavior.normalizedChannels.length > 0) return false;
  if (ir.dom.tag === "button" || ir.dom.tag === "input") return false;
  return propTextSource(ir) !== undefined;
}

/**
 * Prop-text leaf composable: foundation BasicText rendering the bound prop,
 * with chrome resolved from the token scopes and the font-size role slot
 * (`*.size.fontSize.default` / `*.typography.fontSize.default` — the corpus's
 * text-leaf size vocabulary, distinct from the content-role `text.size.*`).
 */
function emitPropTextLeaf(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const slots = resolveStaticChrome(ir);
  const textSource = propTextSource(ir)!;
  const textProp = ir.styledProps.find((p) => p.safeName === textSource.prop);
  const propHasDefault = textProp?.defaultExpr !== undefined;
  const fontSizeSlot = findLayeredSlotAny(ir, ["root"], [
    ".size.fontSize.default",
    ".typography.fontSize.default",
    "text.size.md",
  ]);
  const usesTheme = ir.tokenScopes.length > 0;
  const usesColors = slots.usesColors;
  const emitsTextStyle = Boolean(fontSizeSlot || slots.fgSlot);

  const lines: string[] = [];
  lines.push(
    `// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`,
  );
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  if (usesColors) lines.push(`import androidx.compose.foundation.background`);
  lines.push(`import androidx.compose.foundation.text.BasicText`);
  if (textSource.optionalContent) {
    lines.push(`import androidx.compose.foundation.layout.Box`);
    lines.push(`import androidx.compose.runtime.CompositionLocalProvider`);
    lines.push(`import com.fullstackds.tokens.LocalFsdsContentColor`);
  }
  if (slots.minHeightSlot) lines.push(`import androidx.compose.foundation.layout.height`);
  if (slots.anyPaddingSlot) lines.push(`import androidx.compose.foundation.layout.padding`);
  if (slots.needsClip) lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.ui.Modifier`);
  if (slots.needsClip) lines.push(`import androidx.compose.ui.draw.clip`);
  if (usesColors || emitsTextStyle) lines.push(`import androidx.compose.ui.graphics.Color`);
  if (slots.usesDims) lines.push(`import androidx.compose.ui.unit.dp`);
  if (emitsTextStyle) {
    lines.push(`import androidx.compose.ui.text.TextStyle`);
    lines.push(`import androidx.compose.ui.unit.TextUnit`);
  }
  if (usesTheme) {
    lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
    if (usesColors) lines.push(`import com.fullstackds.tokens.toFsdsColor`);
    if (slots.usesDims) lines.push(`import com.fullstackds.tokens.toFsdsDp`);
    if (fontSizeSlot) lines.push(`import com.fullstackds.tokens.toFsdsSp`);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  if (propHasDefault) {
    lines.push(`    modifier: Modifier = Modifier,`);
    lines.push(
      `    ${textSource.prop}: String = ${JSON.stringify(textProp!.defaultExpr!.replace(/^["']|["']$/g, ""))},`,
    );
  } else {
    lines.push(`    ${textSource.prop}: String,`);
    lines.push(`    modifier: Modifier = Modifier,`);
  }
  if (textSource.optionalContent) lines.push(`    content: (@Composable () -> Unit)? = null,`);
  lines.push(`) {`);
  if (usesTheme) {
    emitThemeHeader(lines, ir, "");
    const sides = emitChromeVals(lines, slots);
    if (fontSizeSlot) {
      lines.push(
        `    val fsdsFontSize = layeredSlot(${JSON.stringify(fontSizeSlot.name)})?.toFsdsSp()`,
      );
    }
    lines.push(``);
    emitChromeModifier(lines, slots, sides);
    lines.push(`    val fsdsTextStyle = TextStyle(`);
    lines.push(
      `        fontSize = ${fontSizeSlot ? "fsdsFontSize ?: TextUnit.Unspecified" : "TextUnit.Unspecified"},`,
    );
    lines.push(
      `        color = ${slots.fgSlot ? "contentColor ?: Color.Unspecified" : "Color.Unspecified"},`,
    );
    lines.push(`    )`);
    if (textSource.optionalContent) {
      lines.push(`    if (content != null) {`);
      lines.push(`        CompositionLocalProvider(LocalFsdsContentColor provides (${slots.fgSlot ? "contentColor ?: Color.Unspecified" : "Color.Unspecified"})) {`);
      lines.push(`            Box(modifier.then(chromeModifier)) { content() }`);
      lines.push(`        }`, `    } else {`);
    }
    lines.push(`    BasicText(`);
    lines.push(`        text = ${textSource.prop},`);
    lines.push(`        modifier = modifier.then(chromeModifier),`);
    lines.push(`        style = fsdsTextStyle,`);
    lines.push(`    )`);
    if (textSource.optionalContent) lines.push(`    }`);
  } else {
    if (textSource.optionalContent) lines.push(`    if (content != null) { Box(modifier) { content() } } else {`);
    lines.push(
      `    BasicText(text = ${textSource.prop}, modifier = modifier, style = TextStyle.Default)`,
    );
    if (textSource.optionalContent) lines.push(`    }`);
  }
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/** Expandable content: a children leaf paired with an `expand*` boolean
 *  channel — Truncate/ShowMore. The expanded channel drives the disclosure
 *  toggle; the toggle's label comes from the IR's conditional content (the
 *  whenTrue/whenFalse props the contract authors). */
function isExpandableContent(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  const expandChannel = ir.behavior.normalizedChannels.find(
    (c) => c.valueType === "boolean" && c.name.startsWith("expand"),
  );
  if (!expandChannel) return false;
  let childrenLeaves = 0;
  const walk = (node: NonNullable<ComponentIR["dom"]>): void => {
    if (node.tag === "children" && (node.children ?? []).length === 0) childrenLeaves += 1;
    (node.children ?? []).forEach(walk);
  };
  walk(ir.dom);
  return childrenLeaves >= 1;
}

/** Prop name of a BindingExpression when it is a `prop` binding. */
function propNameOf(expr: { kind?: string; prop?: string } | undefined): string | undefined {
  if (expr && "prop" in (expr as Record<string, unknown>)) return (expr as { prop: string }).prop;
  return undefined;
}

/** Find the disclosure-toggle dom node (part `toggle` or `trigger`). */
function findTogglePart(ir: ComponentIR) {
  const walk = (node: NonNullable<ComponentIR["dom"]>): typeof node | undefined => {
    if (node.part === "toggle" || node.part === "trigger") return node;
    for (const child of node.children ?? []) {
      const hit = walk(child);
      if (hit) return hit;
    }
    return undefined;
  };
  return ir.dom ? walk(ir.dom) : undefined;
}

function emitExpandableContent(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const slots = resolveStaticChrome(ir);
  const channel = ir.behavior.normalizedChannels.find(
    (c) => c.valueType === "boolean" && c.name.startsWith("expand"),
  )!;
  const valueProp = channel.valueProp;
  const defaultValueProp = channel.defaultValueProp ?? `${valueProp}Default`;
  const changeProp = channel.changeHandlerProp;
  const toggleNode = findTogglePart(ir);
  const conditional = toggleNode?.content;
  const collapseProp =
    conditional && "whenTrue" in conditional ? propNameOf(conditional.whenTrue) : undefined;
  const expandProp =
    conditional && "whenTrue" in conditional ? propNameOf(conditional.whenFalse) : undefined;
  const gateProp = toggleNode?.ifProp ?? undefined;
  const gapSlot = findLayeredSlot(ir, ["root"], "box-model.gap");
  const usesTheme = ir.tokenScopes.length > 0;
  const hasToggle = Boolean(collapseProp || expandProp || gateProp);

  const lines: string[] = [];
  lines.push(
    `// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`,
  );
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  if (slots.usesColors) lines.push(`import androidx.compose.foundation.background`);
  lines.push(`import androidx.compose.foundation.clickable`);
  if (slots.minHeightSlot) lines.push(`import androidx.compose.foundation.layout.height`);
  lines.push(`import androidx.compose.foundation.layout.Arrangement`);
  lines.push(`import androidx.compose.foundation.layout.Column`);
  lines.push(`import androidx.compose.foundation.text.BasicText`);
  if (slots.anyPaddingSlot) lines.push(`import androidx.compose.foundation.layout.padding`);
  if (slots.needsClip) lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.getValue`);
  lines.push(`import androidx.compose.runtime.mutableStateOf`);
  lines.push(`import androidx.compose.runtime.remember`);
  lines.push(`import androidx.compose.runtime.setValue`);
  if (slots.fgSlot) lines.push(`import androidx.compose.runtime.CompositionLocalProvider`);
  lines.push(`import androidx.compose.ui.Modifier`);
  if (slots.needsClip) lines.push(`import androidx.compose.ui.draw.clip`);
  if (slots.usesColors) lines.push(`import androidx.compose.ui.graphics.Color`);
  if (slots.usesDims) lines.push(`import androidx.compose.ui.unit.dp`);
  if (hasToggle) {
    lines.push(`import androidx.compose.ui.semantics.Role`);
    lines.push(`import androidx.compose.ui.semantics.semantics`);
    lines.push(`import androidx.compose.ui.semantics.stateDescription`);
  }
  if (usesTheme) {
    lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
    if (slots.usesColors) lines.push(`import com.fullstackds.tokens.toFsdsColor`);
    if (slots.usesDims) lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  }
  if (slots.fgSlot) lines.push(`import com.fullstackds.tokens.LocalFsdsContentColor`);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    ${valueProp}: Boolean? = null,`);
  lines.push(`    ${defaultValueProp}: Boolean = false,`);
  lines.push(`    ${changeProp}: ((Boolean) -> Unit)? = null,`);
  if (gateProp) {
    const gatePropDef = ir.styledProps.find((p) => p.safeName === gateProp);
    lines.push(`    ${gateProp}: Boolean = ${gatePropDef?.defaultExpr ?? "false"},`);
  }
  if (collapseProp) lines.push(`    ${collapseProp}: String? = null,`);
  if (expandProp) lines.push(`    ${expandProp}: String? = null,`);
  lines.push(`    content: @Composable () -> Unit,`);
  lines.push(`) {`);
  lines.push(
    `    var uncontrolled${pascalCase(valueProp)} by remember { mutableStateOf(${defaultValueProp}) }`,
  );
  lines.push(
    `    val resolved${pascalCase(valueProp)} = ${valueProp} ?: uncontrolled${pascalCase(valueProp)}`,
  );
  if (usesTheme) {
    emitThemeHeader(lines, ir, "");
    const sides = emitChromeVals(lines, slots);
    if (gapSlot) {
      lines.push(`    val gap = layeredSlot(${JSON.stringify(gapSlot.name)})?.toFsdsDp() ?: 0.dp`);
    }
    lines.push(``);
    emitChromeModifier(lines, slots, sides);
    lines.push(``);
    lines.push(`    Column(`);
    lines.push(`        modifier = modifier.then(chromeModifier),`);
    lines.push(
      `        verticalArrangement = ${gapSlot ? "Arrangement.spacedBy(gap)" : "Arrangement.Top"},`,
    );
    lines.push(`    ) {`);
    if (slots.fgSlot) {
      // Content-color propagation (same contract as the static-content path):
      // the resolved foreground reaches the consumer's content region.
      lines.push(
        `        CompositionLocalProvider(LocalFsdsContentColor provides (contentColor ?: Color.Unspecified)) {`,
      );
      lines.push(`            content()`);
      lines.push(`        }`);
    } else {
      lines.push(`        content()`);
    }
    if (hasToggle) {
      const toggleBody = () => {
        lines.push(`            BasicText(`);
        lines.push(
          `                text = (if (resolved${pascalCase(valueProp)}) ${collapseProp ?? "null"} else ${expandProp ?? "null"}) ?: "",`,
        );
        lines.push(`                modifier = Modifier.clickable(`);
        lines.push(`                    role = Role.Button,`);
        lines.push(`                ) {`);
        lines.push(
          `                    if (${valueProp} == null) { uncontrolled${pascalCase(valueProp)} = !resolved${pascalCase(valueProp)} }`,
        );
        lines.push(`                    ${changeProp}?.invoke(!resolved${pascalCase(valueProp)})`);
        lines.push(`                }.semantics {`);
        lines.push(
          `                    stateDescription = if (resolved${pascalCase(valueProp)}) "expanded" else "collapsed"`,
        );
        lines.push(`                },`);
        lines.push(`            )`);
      };
      if (gateProp) {
        lines.push(`        if (${gateProp}) {`);
        toggleBody();
        lines.push(`        }`);
      } else {
        toggleBody();
      }
    }
    lines.push(`    }`);
  } else {
    lines.push(`    Column(modifier = modifier) { content() }`);
  }
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/** Progress/status indicator: a progressbar-role root (determinate bar from
 *  the 0-100 value prop, or circular when the contract declares a circular
 *  variant) or a status-role visual leaf (indeterminate spinner). */
function isProgressIndicator(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  if (ir.behavior.normalizedChannels.length > 0) return false;
  const role = ir.root?.effectiveRole;
  if (role === "progressbar") return true;
  if (role === "status") {
    // A status-role indicator must BE a single animated mark: exactly one
    // child, that child a leaf, and its part declared `decoration` (Spinner's
    // aria-hidden `visual`). Skeleton is also role status but is a placeholder
    // — its single child is the `group`-role `stack` holding one row per
    // `lines`, so it stays on the static-content path.
    //
    // This used to test only `children.length === 0`, treating "has any dom
    // children" as the Spinner/Skeleton discriminator. That is a web-topology
    // proxy for a semantic distinction: realizing Skeleton's declared
    // stack/row/shape parts on the web silently reclassified it as a spinning
    // progress indicator here and dropped its `content` parameter.
    const kids = ir.dom.children ?? [];
    if (kids.length !== 1) return false;
    const only = kids[0]!;
    if ((only.children ?? []).length > 0) return false;
    const roleOfChild = ir.parts.find((part) => part.name === only.part)
      ?.details?.role;
    if (roleOfChild !== "decoration") return false;
    let childrenLeaves = 0;
    const walk = (node: NonNullable<ComponentIR["dom"]>): void => {
      if (node.tag === "children" && (node.children ?? []).length === 0) childrenLeaves += 1;
      (node.children ?? []).forEach(walk);
    };
    walk(ir.dom);
    return childrenLeaves === 0;
  }
  return false;
}

/** Per-axis slot lookup: resolves `<prefix>.<axis>.<value>` through the
 *  layered scopes — the Switch track-dims pattern, generalized. */
function emitAxisSlotLookup(
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

function emitProgressIndicator(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const slots = resolveStaticChrome(ir);
  const axes = collectVariantAxes(ir);
  const variantKeysKt = axes
    .map((a) => `"variant_" + ${kotlinParamName(a.propName)}.name.lowercase()`)
    .join(", ");
  const isBar = ir.root?.effectiveRole === "progressbar";
  const valueProp = ir.styledProps.find((p) => p.safeName === "value");
  const labelProp = ir.styledProps.find((p) => p.safeName === "label");
  const showValueProp = ir.styledProps.find((p) => p.safeName === "showValue");
  const textColorSlot = findLayeredSlot(ir, ["root"], ".color.text.default");
  const trackColorSlot = findLayeredSlot(ir, ["root"], ".color.track.background");
  const fillSlot = findLayeredSlotAny(ir, ["root"], [".color.fill.info", ".color.fill"]);
  const durationSlot = findLayeredSlot(ir, ["root"], ".motion.duration.indeterminate");
  const sizeAxis = axes.find((a) => a.propName === "size");
  const thicknessAxis = axes.find((a) => a.propName === "thickness");
  const variantAxis = axes.find((a) => a.propName === "variant");
  const intentAxis = axes.find((a) => a.propName === "intent");
  const usesTheme = ir.tokenScopes.length > 0;

  const lines: string[] = [];
  lines.push(
    `// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`,
  );
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  if (slots.usesColors) lines.push(`import androidx.compose.foundation.background`);
  if (slots.minHeightSlot) lines.push(`import androidx.compose.foundation.layout.height`);
  if (slots.anyPaddingSlot) lines.push(`import androidx.compose.foundation.layout.padding`);
  if (slots.needsClip) lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.runtime.Composable`);
  if (textColorSlot) lines.push(`import androidx.compose.runtime.CompositionLocalProvider`);
  lines.push(`import androidx.compose.ui.Modifier`);
  if (slots.needsClip) lines.push(`import androidx.compose.ui.draw.clip`);
  // Color is always referenced (the substrate call carries ledgered fallback
  // constants), and toFsdsColor whenever any color slot resolves.
  const usesProgressColors = Boolean(textColorSlot || trackColorSlot || fillSlot);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  if (slots.usesDims) lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import com.fullstackds.components.progress.FsdsProgressIndicator`);
  if (usesTheme) {
    lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
    if (slots.usesColors || usesProgressColors) lines.push(`import com.fullstackds.tokens.toFsdsColor`);
    if (slots.usesDims) lines.push(`import com.fullstackds.tokens.toFsdsDp`);
    if (durationSlot) lines.push(`import com.fullstackds.tokens.toFsdsMs`);
  }
  if (textColorSlot) lines.push(`import com.fullstackds.tokens.LocalFsdsContentColor`);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  for (const axis of axes) {
    lines.push(
      `/** ${axis.propName} axis lowered from the contract's ${axis.propName} variant. */`,
    );
    lines.push(
      `enum class ${axis.enumName} { ${axis.values.map(kotlinEnumName).join(", ")} }`,
    );
    lines.push(``);
  }
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  if (valueProp && isBar) lines.push(`    value: Float? = null,`);
  if (labelProp) lines.push(`    label: String? = null,`);
  if (showValueProp && isBar) lines.push(`    showValue: Boolean = false,`);
  for (const axis of axes) {
    lines.push(
      `    ${kotlinParamName(axis.propName)}: ${axis.enumName} = ${axis.enumName}.${kotlinEnumName(axis.defaultExpr)},`,
    );
  }
  if (isBar && showValueProp) lines.push(`    content: @Composable () -> Unit = {},`);
  lines.push(`) {`);
  if (usesTheme) {
    emitThemeHeader(lines, ir, variantKeysKt);
    const sides = emitChromeVals(lines, slots);
    if (textColorSlot) {
      lines.push(
        `    val textColor = layeredSlot(${JSON.stringify(textColorSlot.name)})?.toFsdsColor()`,
      );
    }
    if (trackColorSlot) {
      lines.push(
        `    val trackColor = layeredSlot(${JSON.stringify(trackColorSlot.name)})?.toFsdsColor()`,
      );
    }
    if (fillSlot && intentAxis) {
      emitAxisSlotLookup(lines, "fillColor", "progress.color.fill", intentAxis, "toFsdsColor");
    } else if (fillSlot) {
      lines.push(
        `    val fillColor = layeredSlot(${JSON.stringify(fillSlot.name)})?.toFsdsColor()`,
      );
    }
    if (durationSlot) {
      lines.push(
        `    val durationMs = layeredSlot(${JSON.stringify(durationSlot.name)})?.toFsdsMs() ?: 1200`,
      );
    }
    // The per-value dim lookups emit only when the component's scopes carry
    // the spinner size/thickness slots (Spinner does; Progress's size axis
    // has no dim slots — the substrate default applies instead).
    const hasSpinnerSizeSlots = ir.tokenScopes.some((s) =>
      s.values.some((v) => v.name.startsWith("spinner.size.")),
    );
    const hasSpinnerThicknessSlots = ir.tokenScopes.some((s) =>
      s.values.some((v) => v.name.startsWith("spinner.thickness.")),
    );
    if (sizeAxis && hasSpinnerSizeSlots) {
      emitAxisSlotLookup(lines, "spinnerSize", "spinner.size", sizeAxis, "toFsdsDp");
    }
    if (thicknessAxis && hasSpinnerThicknessSlots) {
      emitAxisSlotLookup(lines, "spinnerThickness", "spinner.thickness", thicknessAxis, "toFsdsDp");
    }
    lines.push(``);
    emitChromeModifier(lines, slots, sides);
    lines.push(``);
    lines.push(`    FsdsProgressIndicator(`);
    lines.push(
      `        progress = ${valueProp && isBar ? "value?.let { it / 100f }" : "null"},`,
    );
    lines.push(
      `        linear = ${isBar ? (variantAxis ? `${variantAxis.enumName}.Linear == ${kotlinParamName(variantAxis.propName)}` : "true") : "false"},`,
    );
    lines.push(
      `        size = ${hasSpinnerSizeSlots && sizeAxis ? "spinnerSize ?: 24.dp" : "24.dp"},`,
    );
    lines.push(
      `        strokeWidth = ${hasSpinnerThicknessSlots && thicknessAxis ? "spinnerThickness ?: 3.dp" : "4.dp"},`,
    );
    lines.push(
      `        trackColor = ${trackColorSlot ? "trackColor ?: Color(0xFFD0D0D0)" : "Color(0xFFD0D0D0)"},`,
    );
    lines.push(
      `        fillColor = ${fillSlot ? "fillColor ?: Color(0xFF0566FE)" : "Color(0xFF0566FE)"},`,
    );
    lines.push(`        durationMs = ${durationSlot ? "durationMs" : "1200"},`);
    lines.push(`        contentDescription = ${labelProp ? "label" : "null"},`);
    lines.push(`        modifier = modifier.then(chromeModifier),`);
    lines.push(`    )`);
    if (isBar && showValueProp) {
      lines.push(``);
      lines.push(`    if (showValue) {`);
      if (textColorSlot) {
        lines.push(
          `        CompositionLocalProvider(LocalFsdsContentColor provides (textColor ?: Color.Unspecified)) {`,
        );
        lines.push(`            content()`);
        lines.push(`        }`);
      } else {
        lines.push(`        content()`);
      }
      lines.push(`    }`);
    }
  } else {
    lines.push(`    FsdsProgressIndicator(`);
    lines.push(`        progress = null,`);
    lines.push(`        linear = false,`);
    lines.push(`        modifier = modifier,`);
    lines.push(`    )`);
  }
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The boolean-control class (FEAT-COMPOSE-ADMISSION-SUBSTRATE-01): a scalar
 * value-channel control whose sole channel is boolean (Checkbox) — the
 * control twin of the native-toggle collapse, realized on the
 * foundation-only FsdsCheckbox substrate. Channel param names, the size
 * axis, and passthrough props all derive from the IR, exactly as the
 * toggle path does.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - `indeterminate` is not lowered — the substrate is binary, mirroring
 *     the SwiftUI boolean-control twin;
 *   - `name`/`value`/`ariaLabelledby` form-wiring props are omitted v1;
 *     `ariaLabel` lowers to the semantics contentDescription;
 *   - checked-state colors fall back to ledgered constants until the token
 *     graph carries checked-scope slots (the sidecar declares default
 *     scope only), exactly as the toggle's dead-safe constants do.
 */
function emitBooleanControl(ir: ComponentIR, channel: NormalizedChannelIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const valueProp = channel.valueProp;
  const defaultValueProp = channel.defaultValueProp ?? `${valueProp}Default`;
  const changeProp = channel.changeHandlerProp;

  // Size axis: a styled prop referencing a contract-defined enum type.
  const sizeProp = ir.styledProps.find((p) =>
    p.typeRefs.some((ref) => (ir.definedTypes[ref]?.values?.length ?? 0) > 0),
  );
  let sizeEnumName: string | null = null;
  let sizeValues: string[] = [];
  let sizeDefault: string | null = null;
  if (sizeProp) {
    const ref = sizeProp.typeRefs.find(
      (r) => (ir.definedTypes[r]?.values?.length ?? 0) > 0,
    )!;
    const def = ir.definedTypes[ref]!;
    sizeEnumName = ref;
    sizeValues = def.values!;
    const rawDefault = sizeProp.defaultExpr?.replace(/^"|"$/g, "") ?? null;
    sizeDefault = rawDefault;
    for (const value of sizeValues) {
      if (!CHECKBOX_BOX_DP[value]) {
        throw new Error(
          `emitBooleanControl: no box dimensions for size value "${value}" on ${name} — extend the framework-grammar table or the token graph`,
        );
      }
    }
  }

  const hasDisabled = ir.styledProps.some(
    (p) => p.name === "disabled" && p.propType.kind === "boolean",
  );
  const handled = new Set<string>([
    valueProp,
    defaultValueProp,
    changeProp,
    "indeterminate",
    "name",
    "value",
    "ariaLabel",
    "ariaLabelledby",
    ...(sizeProp ? [sizeProp.safeName] : []),
    ...(hasDisabled ? ["disabled"] : []),
  ]);
  const stringProps = ir.styledProps.filter(
    (p) => p.propType.kind === "string" && !handled.has(p.name),
  );

  const bgSlot = findTokenSlot(ir, "root", ".color.background.default");
  const borderSlot = findTokenSlot(ir, "root", ".color.border.default");
  const borderWidthSlot = findTokenSlot(ir, "root", ".border.width");
  const radiusSlot = findTokenSlot(ir, "root", ".border.radius");
  const transitionSlot = findTokenSlot(ir, "root", ".transition.duration");
  const focusColorSlot = findTokenSlot(ir, "root", ".focus.ring.color");
  const focusWidthSlot = findTokenSlot(ir, "root", ".focus.ring.width");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens =
    Boolean(
      bgSlot || borderSlot || borderWidthSlot || radiusSlot ||
      transitionSlot || focusColorSlot || focusWidthSlot ||
      minWidthSlot || minHeightSlot || paddingInlineStartSlot ||
      paddingInlineEndSlot || paddingBlockStartSlot || paddingBlockEndSlot,
    ) || ir.tokenScopes.some((scope) => scope.values.length > 0);

  const lines: string[] = [];
  lines.push(
    `// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`,
  );
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.getValue`);
  lines.push(`import androidx.compose.runtime.mutableStateOf`);
  lines.push(`import androidx.compose.runtime.remember`);
  lines.push(`import androidx.compose.runtime.setValue`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import com.fullstackds.components.controls.FsdsCheckbox`);
  lines.push(`import com.fullstackds.components.controls.FsdsCheckboxStyle`);
  if (consumesTokens) {
    lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
    lines.push(`import com.fullstackds.tokens.toFsdsColor`);
    lines.push(`import com.fullstackds.tokens.toFsdsDp`);
    lines.push(`import com.fullstackds.tokens.toFsdsMs`);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  if (sizeEnumName && sizeValues.length > 0) {
    lines.push(
      `/** Size axis lowered from the contract's ${sizeEnumName} type. */`,
    );
    lines.push(
      `enum class ${sizeEnumName} { ${sizeValues.map(kotlinEnumName).join(", ")} }`,
    );
    lines.push(``);
  }
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  // AOSP Compose API guideline: `modifier` is the first optional parameter.
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    ${valueProp}: Boolean? = null,`);
  lines.push(`    ${defaultValueProp}: Boolean = false,`);
  lines.push(`    ${changeProp}: ((Boolean) -> Unit)? = null,`);
  if (sizeEnumName && sizeDefault) {
    lines.push(
      `    size: ${sizeEnumName} = ${sizeEnumName}.${kotlinEnumName(sizeDefault)},`,
    );
  }
  if (hasDisabled) {
    lines.push(`    enabled: Boolean = true,`);
  }
  for (const prop of stringProps) {
    lines.push(`    ${prop.safeName}: String? = null,`);
  }
  lines.push(`    contentDescription: String? = null,`);
  lines.push(`) {`);
  lines.push(
    `    var uncontrolled${pascalCase(valueProp)} by remember { mutableStateOf(${defaultValueProp}) }`,
  );
  lines.push(
    `    val resolved${pascalCase(valueProp)} = ${valueProp} ?: uncontrolled${pascalCase(valueProp)}`,
  );
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    const colorVal = (valName: string, slot: { name: string } | undefined) => {
      if (slot) {
        lines.push(
          `    val ${valName} = fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(slot.name)}))?.toFsdsColor()`,
        );
      } else {
        lines.push(`    val ${valName}: Color? = null`);
      }
    };
    colorVal("boxColorUnchecked", bgSlot);
    colorVal("boxBorderColor", borderSlot);
    colorVal("focusRingColor", focusColorSlot);
    if (borderWidthSlot) {
      lines.push(
        `    val boxBorderWidth = fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(borderWidthSlot.name)}))?.toFsdsDp() ?: 1.dp`,
      );
    }
    if (radiusSlot) {
      lines.push(
        `    val boxRadius = fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(radiusSlot.name)}))?.toFsdsDp() ?: 4.dp`,
      );
    }
    if (transitionSlot) {
      lines.push(
        `    val transitionDurationMs = fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(transitionSlot.name)}))?.toFsdsMs() ?: 150`,
      );
    }
    if (focusWidthSlot) {
      lines.push(
        `    val focusRingWidth = fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(focusWidthSlot.name)}))?.toFsdsDp() ?: 2.dp`,
      );
    }
    if (minWidthSlot) {
      lines.push(
        `    val minTouchWidth = fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(minWidthSlot.name)}))?.toFsdsDp() ?: 32.dp`,
      );
    }
    if (minHeightSlot) {
      lines.push(
        `    val minTouchHeight = fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(minHeightSlot.name)}))?.toFsdsDp() ?: 32.dp`,
      );
    }
    if (
      paddingInlineStartSlot || paddingInlineEndSlot ||
      paddingBlockStartSlot || paddingBlockEndSlot
    ) {
      const side = (slot: { name: string } | undefined) =>
        slot
          ? `fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(slot.name)}))?.toFsdsDp() ?: 0.dp`
          : `0.dp`;
      lines.push(
        `    val checkboxPadding = PaddingValues(start = ${side(paddingInlineStartSlot)}, end = ${side(paddingInlineEndSlot)}, top = ${side(paddingBlockStartSlot)}, bottom = ${side(paddingBlockEndSlot)})`,
      );
    }
    lines.push(``);
  }
  lines.push(`    val checkboxStyle = FsdsCheckboxStyle(`);
  if (sizeEnumName) {
    lines.push(`        boxSize = when (size) {`);
    for (const value of sizeValues) {
      lines.push(
        `            ${sizeEnumName}.${kotlinEnumName(value)} -> ${CHECKBOX_BOX_DP[value]}.dp`,
      );
    }
    lines.push(`        },`);
  } else {
    lines.push(`        boxSize = ${CHECKBOX_BOX_DP.md}.dp,`);
  }
  lines.push(
    `        boxColorChecked = Color(0xFF0566FE), // ledgered constant — no checked-scope slot in the token graph yet`,
  );
  lines.push(
    `        boxColorUnchecked = boxColorUnchecked ?: Color(0xFFFFFFFF),`,
  );
  lines.push(
    `        boxColorDisabled = boxColorUnchecked ?: Color(0xFFE4E4E5),`,
  );
  lines.push(`        checkColorChecked = Color(0xFFFFFFFF),`);
  lines.push(`        checkColorDisabled = Color(0xFF9A9A9C),`);
  lines.push(`        borderColor = boxBorderColor,`);
  if (borderWidthSlot) {
    lines.push(`        borderWidth = boxBorderWidth,`);
  }
  if (radiusSlot) {
    lines.push(`        boxRadius = boxRadius,`);
  }
  if (focusColorSlot) {
    lines.push(`        focusRingColor = focusRingColor,`);
  }
  if (focusWidthSlot) {
    lines.push(`        focusRingWidth = focusRingWidth,`);
  }
  if (transitionSlot) {
    lines.push(`        transitionDurationMs = transitionDurationMs,`);
  }
  if (minWidthSlot) {
    lines.push(`        minTouchWidth = minTouchWidth,`);
  }
  if (minHeightSlot) {
    lines.push(`        minTouchHeight = minTouchHeight,`);
  }
  if (
    paddingInlineStartSlot || paddingInlineEndSlot ||
    paddingBlockStartSlot || paddingBlockEndSlot
  ) {
    lines.push(`        padding = checkboxPadding,`);
  }
  lines.push(`    )`);
  lines.push(``);
  lines.push(`    FsdsCheckbox(`);
  lines.push(`        checked = resolved${pascalCase(valueProp)},`);
  lines.push(`        onCheckedChange = { next ->`);
  lines.push(`            if (${valueProp} == null) {`);
  lines.push(`                uncontrolled${pascalCase(valueProp)} = next`);
  lines.push(`            }`);
  lines.push(`            ${changeProp}?.invoke(next)`);
  lines.push(`        },`);
  lines.push(`        style = checkboxStyle,`);
  if (hasDisabled) {
    lines.push(`        enabled = enabled,`);
  }
  lines.push(`        contentDescription = contentDescription,`);
  lines.push(`        modifier = modifier,`);
  lines.push(`    )`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The bare-rule-leaf class (FEAT-COMPOSE-ADMISSION-SUBSTRATE-01): an hr
 * root with no children and no channels (Divider) — a separator whose
 * paint (color/thickness) and surface geometry resolve from the token
 * scopes, orientation from the contract's enum axis. Realized on the
 * foundation-only FsdsRule substrate.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - the `thickness`/`title` string props are omitted v1 (token slot
 *     drives thickness; the web's title attribute has no Compose analog
 *     short of a semantics description, which a bare rule does not carry);
 *   - `divider.spacing.margin` is unread — this class realizes the rule,
 *     not the surrounding layout rhythm (RN leaves it unread in styles too).
 */
function emitBareRuleLeaf(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const orientationProp = ir.styledProps.find(
    (p) =>
      p.name === "orientation" &&
      typeof p.propType === "object" &&
      "kind" in p.propType &&
      p.propType.kind === "enum",
  );
  const orientationValues =
    orientationProp && typeof orientationProp.propType === "object" &&
    "kind" in orientationProp.propType &&
    orientationProp.propType.kind === "enum"
      ? (orientationProp.propType as { values: string[] }).values
      : null;
  const hasDecorative = ir.styledProps.some(
    (p) => p.name === "decorative" && p.propType.kind === "boolean",
  );
  const handled = new Set<string>(["orientation", "decorative", "thickness", "title"]);
  const stringProps = ir.styledProps.filter(
    (p) => p.propType.kind === "string" && !handled.has(p.name),
  );

  const colorSlot = findTokenSlot(ir, "root", ".color.default");
  const thicknessSlot = findTokenSlot(ir, "root", ".size.thickness");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const anyColorSlot = Boolean(colorSlot);
  const anyDimSlot = Boolean(
    thicknessSlot || minWidthSlot || minHeightSlot || paddingInlineStartSlot ||
    paddingInlineEndSlot || paddingBlockStartSlot || paddingBlockEndSlot,
  );
  const consumesTokens = anyColorSlot || anyDimSlot;

  const lines: string[] = [];
  lines.push(
    `// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`,
  );
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  if (
    paddingInlineStartSlot || paddingInlineEndSlot ||
    paddingBlockStartSlot || paddingBlockEndSlot
  ) {
    lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  }
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import com.fullstackds.components.rule.FsdsRule`);
  lines.push(`import com.fullstackds.components.rule.FsdsRuleOrientation`);
  lines.push(`import com.fullstackds.components.rule.FsdsRuleStyle`);
  if (consumesTokens) {
    lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
    if (anyColorSlot) lines.push(`import com.fullstackds.tokens.toFsdsColor`);
    if (anyDimSlot) lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  if (orientationValues) {
    lines.push(
      `/** Orientation axis lowered from the contract's inline enum. */`,
    );
    lines.push(
      `enum class ${name}Orientation { ${orientationValues.map(kotlinEnumName).join(", ")} }`,
    );
    lines.push(``);
  }
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  if (orientationValues) {
    lines.push(
      `    orientation: ${name}Orientation = ${name}Orientation.${kotlinEnumName(orientationValues[0]!)},`,
    );
  }
  if (hasDecorative) {
    lines.push(`    decorative: Boolean = false,`);
  }
  for (const prop of stringProps) {
    lines.push(`    ${prop.safeName}: String? = null,`);
  }
  lines.push(`) {`);
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
  }
  if (colorSlot) {
    lines.push(
      `    val ruleColor = fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(colorSlot.name)}))?.toFsdsColor() ?: Color(0xFFB8B8B8)`,
    );
  } else {
    lines.push(`    val ruleColor = Color(0xFFB8B8B8)`);
  }
  if (thicknessSlot) {
    lines.push(
      `    val ruleThickness = fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(thicknessSlot.name)}))?.toFsdsDp() ?: 1.dp`,
    );
  } else {
    lines.push(`    val ruleThickness = 1.dp`);
  }
  if (minWidthSlot || minHeightSlot) {
    lines.push(
      `    val ruleMinWidth = ${minWidthSlot ? `fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(minWidthSlot.name)}))?.toFsdsDp() ?: 0.dp` : "0.dp"}`,
    );
    lines.push(
      `    val ruleMinHeight = ${minHeightSlot ? `fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(minHeightSlot.name)}))?.toFsdsDp() ?: 0.dp` : "0.dp"}`,
    );
  }
  if (
    paddingInlineStartSlot || paddingInlineEndSlot ||
    paddingBlockStartSlot || paddingBlockEndSlot
  ) {
    const side = (slot: { name: string } | undefined) =>
      slot
        ? `fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(slot.name)}))?.toFsdsDp() ?: 0.dp`
        : `0.dp`;
    lines.push(
      `    val rulePadding = PaddingValues(start = ${side(paddingInlineStartSlot)}, end = ${side(paddingInlineEndSlot)}, top = ${side(paddingBlockStartSlot)}, bottom = ${side(paddingBlockEndSlot)})`,
    );
  }
  lines.push(`    FsdsRule(`);
  if (orientationValues) {
    lines.push(`        orientation = when (orientation) {`);
    for (const value of orientationValues) {
      const target = value === "vertical" ? "Vertical" : "Horizontal";
      lines.push(
        `            ${name}Orientation.${kotlinEnumName(value)} -> FsdsRuleOrientation.${target}`,
      );
    }
    lines.push(`        },`);
  } else {
    lines.push(`        orientation = FsdsRuleOrientation.Horizontal,`);
  }
  lines.push(`        style = FsdsRuleStyle(`);
  lines.push(`            color = ruleColor,`);
  lines.push(`            thickness = ruleThickness,`);
  if (minWidthSlot || minHeightSlot) {
    lines.push(`            minWidth = ruleMinWidth,`);
    lines.push(`            minHeight = ruleMinHeight,`);
  }
  if (
    paddingInlineStartSlot || paddingInlineEndSlot ||
    paddingBlockStartSlot || paddingBlockEndSlot
  ) {
    lines.push(`            padding = rulePadding,`);
  }
  lines.push(`        ),`);
  lines.push(`        modifier = modifier,`);
  if (hasDecorative) {
    lines.push(`        decorative = decorative,`);
  }
  lines.push(`    )`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The glyph-host class (FEAT-COMPOSE-GLYPH-ADMISSION-01): the dom carries
 * the iconGlyph fact, so the component is a registry lookup over the
 * shared glyph substrate. Size hints from the IR map the size prop to the
 * rendered frame with token-scope dims preferred (`icon.size.*` slots)
 * and the hint table as fallback; decorative-by-default comes from the
 * catalog semantics (clearAndSetSemantics — the accessibilityHidden
 * analog). Swift's twin emits the same facts.
 */
function emitGlyphHost(ir: ComponentIR): string {
  const glyph = domGlyph(ir)!;
  const nameProp = glyph.namePropName;
  const sizeProp = glyph.sizePropName;
  const hints = glyph.sizeHints ?? {};
  const hintMembers = Object.keys(hints);
  const sizeType = ir.styledProps.find((p) => p.safeName === sizeProp)
    ?.typeRefs.find((ref) => ir.definedTypes[ref]);
  // Inline size unions (Icon has no named type) synthesize a local enum
  // from the hint keys — the Divider inline-enum precedent.
  const synthesizedSizeType = !sizeType && hintMembers.length > 0
    ? `${ir.name}Size`
    : null;
  const sizeTypeName = sizeType ?? synthesizedSizeType;
  const defaultSize = sizeProp
    ? ir.styledProps.find((p) => p.safeName === sizeProp)?.defaultExpr?.replace(/^["']|["']$/g, "") ?? hintMembers[0]
    : null;

  // Touch-surface box-model slots (RN consumes the same family).
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");

  const lines: string[] = [];
  lines.push(
    `// @generated by ds-codegen from components/${ir.name}/${ir.name}.contract.json — do not edit by hand.`,
  );
  lines.push(`package com.fullstackds.components.${packageSegment(ir.name)}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  if (
    paddingInlineStartSlot || paddingInlineEndSlot ||
    paddingBlockStartSlot || paddingBlockEndSlot
  ) {
    lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  }
  if (
    paddingInlineStartSlot || paddingInlineEndSlot ||
    paddingBlockStartSlot || paddingBlockEndSlot
  ) {
    lines.push(`import androidx.compose.foundation.layout.padding`);
  }
  if (minWidthSlot || minHeightSlot) {
    lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  }
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.semantics.clearAndSetSemantics`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import com.fullstackds.glyph.FsdsGlyphCatalog`);
  lines.push(`import com.fullstackds.glyph.FsdsGlyphIcon`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsContentColor`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
  lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  if (synthesizedSizeType) {
    lines.push(`/** Size axis synthesized from the iconGlyph size hints. */`);
    lines.push(
      `enum class ${synthesizedSizeType} { ${hintMembers.map(kotlinEnumName).join(", ")} }`,
    );
    lines.push(``);
  }
  lines.push(`@Composable`);
  lines.push(`fun ${ir.name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    ${nameProp}: String,`);
  if (sizeProp && sizeTypeName && defaultSize) {
    lines.push(
      `    ${sizeProp}: ${sizeTypeName} = ${sizeTypeName}.${kotlinEnumName(defaultSize)},`,
    );
  }
  lines.push(`) {`);
  lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
  // Frame dims per size member: the token scope when authored, the hint
  // table otherwise (the IR fact, never a hardcoded member).
  if (sizeProp && sizeTypeName && defaultSize) {
    lines.push(`    val glyphSize = when (${sizeProp}) {`);
    for (const member of hintMembers) {
      const slot = findTokenSlot(ir, "root", `icon.size.${member}`);
      lines.push(
        `        ${sizeTypeName}.${kotlinEnumName(member)} -> ${
          slot
            ? `fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(slot.name)}))?.toFsdsDp() ?: ${hints[member]}.dp`
            : `${hints[member]}.dp`
        }`,
      );
    }
    lines.push(`    }`);
  } else {
    lines.push(`    val glyphSize = 24.dp`);
  }
  lines.push(`    val glyphModifier = modifier`);
  if (minWidthSlot || minHeightSlot) {
    lines.push(
      `        .requiredSizeIn(` +
        `minWidth = ${minWidthSlot ? `fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(minWidthSlot.name)}))?.toFsdsDp() ?: 0.dp` : "0.dp"}, ` +
        `minHeight = ${minHeightSlot ? `fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(minHeightSlot.name)}))?.toFsdsDp() ?: 0.dp` : "0.dp"})`,
    );
  }
  if (
    paddingInlineStartSlot || paddingInlineEndSlot ||
    paddingBlockStartSlot || paddingBlockEndSlot
  ) {
    const side = (slot: { name: string } | undefined) =>
      slot
        ? `fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(slot.name)}))?.toFsdsDp() ?: 0.dp`
        : `0.dp`;
    lines.push(
      `        .padding(PaddingValues(start = ${side(paddingInlineStartSlot)}, end = ${side(paddingInlineEndSlot)}, top = ${side(paddingBlockStartSlot)}, bottom = ${side(paddingBlockEndSlot)}))`,
    );
  }
  lines.push(`    FsdsGlyphIcon(`);
  lines.push(`        named = ${nameProp},`);
  lines.push(`        size = glyphSize,`);
  lines.push(`        tint = LocalFsdsContentColor.current,`);
  lines.push(`        modifier = glyphModifier.then(`);
  lines.push(`            // Decorative-by-default per catalog semantics: the glyph`);
  lines.push(`            // carries no semantics node unless the surface gives it one.`);
  lines.push(`            if (FsdsGlyphCatalog.decorativeDefaults.contains(${nameProp})) {`);
  lines.push(`                Modifier.clearAndSetSemantics { }`);
  lines.push(`            } else {`);
  lines.push(`                Modifier`);
  lines.push(`            },`);
  lines.push(`        ),`);
  lines.push(`    )`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The icon-decorated-content class (FEAT-COMPOSE-GLYPH-ADMISSION-01): one
 * consumer content region beside an author-addressable icon — a ReactNode
 * icon prop lowers to a consumer composable region; a string icon prop
 * lowers to the glyph registry. Variant axes (Alert's intent/level,
 * AlertNotice's intent) layer the chrome: `variant_<axis>` scopes override
 * root, exactly as the static-content path layers.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - part-scoped text typography (`alert.text.size`/`weight`) is NOT
 *     claimed — the content region is a consumer composable, not styled
 *     text (RN styles it; this path does not);
 *   - border width has no slot in these contracts — 1.dp when a border
 *     color slot exists.
 */
function emitIconDecoratedContent(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const axes = Object.keys(ir.variants ?? {}).map((axis) => {
    const values = ir.variants[axis] ?? [];
    const prop = ir.styledProps.find((p) => p.safeName === axis);
    const defaultMember = prop?.defaultExpr?.replace(/^["']|["']$/g, "") ?? null;
    return {
      propName: prop?.safeName ?? axis,
      enumName: `${name}${pascalCase(axis)}`,
      values,
      defaultMember,
    };
  });
  // Nullable axes contribute a layer only when set — swift's
  // `intent: AlertIntent? = nil` twin. If-expressions, not `?.let {}`:
  // a mid-argument-list lambda does not parse inside listOfNotNull(...).
  const variantLayerExprs = axes.map(
    (a) =>
      `if (${kotlinParamName(a.propName)} != null) "variant_" + ${kotlinParamName(a.propName)}.name.lowercase() else null`,
  );

  const bgSlot = findLayeredSlotAny(ir, ["root"], [
    ".color.background.primary",
    ".color.background.default",
  ]);
  const fgSlot = findLayeredSlotAny(ir, ["root"], [
    ".color.foreground.primary",
    ".color.foreground.default",
  ]);
  const borderSlot = findLayeredSlotAny(ir, ["root"], [
    ".color.border.primary",
    ".color.border.default",
  ]);
  // Member-named role slots (AlertNotice carries
  // `alert-notice.color.background.info|success|warning|danger` — the
  // intent axis embedded in the slot NAME, root-scoped, not layered).
  // Those lower to a when(axis) over the name grammar — the progress
  // path's per-intent fill precedent; the member→slot mapping is derived
  // from the IR's scope facts, never hardcoded.
  const memberRoleEntries = (rolePrefix: string) => {
    const rootScope = ir.tokenScopes.find((s) => s.scope === "root");
    if (!rootScope) return [] as {
      axisProp: string;
      enumName: string;
      member: string;
      scopeKey: string;
      name: string;
    }[];
    const entries: {
      axisProp: string;
      enumName: string;
      member: string;
      scopeKey: string;
      name: string;
    }[] = [];
    const bound = new Set<string>();
    for (const axis of axes) {
      const unmatched: string[] = [];
      for (const member of axis.values) {
        const hit = rootScope.values.find(
          (v) => v.name.endsWith(`${rolePrefix}${member}`) && !bound.has(v.name),
        );
        if (hit) {
          entries.push({
            axisProp: axis.propName,
            enumName: axis.enumName,
            member,
            scopeKey: "root",
            name: hit.name,
          });
          bound.add(hit.name);
        } else {
          unmatched.push(member);
        }
      }
      // Member-name fallback: when a family slot's semantic name differs
      // from the axis member (error↔danger), the sole unassigned family
      // slot binds to the sole unmatched member — a deterministic family
      // closure, never a name table. Role-default names (`.primary`/
      // `.default`) are the family's base slot, not member slots.
      if (unmatched.length === 1) {
        const familySlots = rootScope.values.filter(
          (v) =>
            v.name.includes(rolePrefix) &&
            !v.name.endsWith(".primary") &&
            !v.name.endsWith(".default") &&
            !bound.has(v.name),
        );
        if (familySlots.length === 1) {
          entries.push({
            axisProp: axis.propName,
            enumName: axis.enumName,
            member: unmatched[0]!,
            scopeKey: "root",
            name: familySlots[0]!.name,
          });
          bound.add(familySlots[0]!.name);
        }
      }
    }
    return entries;
  };
  const bgVariantEntries = memberRoleEntries(".color.background.");
  const fgVariantEntries = memberRoleEntries(".color.foreground.");
  const borderVariantEntries = memberRoleEntries(".color.border.");
  /** A role val emitter: member-when when member-named slots exist, plain
   *  layered resolution otherwise. */
  const emitRoleVal = (
    valName: string,
    entries: ReturnType<typeof memberRoleEntries>,
    rootSlot: { name: string } | undefined,
  ) => {
    if (entries.length > 0) {
      const axisProp = entries[0]!.axisProp;
      lines.push(`    val ${valName} = when (${kotlinParamName(axisProp)}) {`);
      for (const entry of entries) {
        lines.push(
          `        ${entry.enumName}.${kotlinEnumName(entry.member)} -> fsdsTheme.resolve(${tokenConstName(ir)}[${JSON.stringify(entry.scopeKey)}]?.get(${JSON.stringify(entry.name)}))?.toFsdsColor()`,
        );
      }
      lines.push(
        `        else -> ${rootSlot ? `layeredSlot(${JSON.stringify(rootSlot.name)})?.toFsdsColor()` : "null"}`,
      );
      lines.push(`    }`);
    } else if (rootSlot) {
      lines.push(
        `    val ${valName} = layeredSlot(${JSON.stringify(rootSlot.name)})?.toFsdsColor()`,
      );
    }
  };
  const radiusSlot = findLayeredSlotAny(ir, ["root"], [
    ".size.radius",
    ".border.radius",
  ]);
  const gapSlot = findLayeredSlotAny(ir, ["root"], [".spacing.gap"]);
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const usesTheme = ir.tokenScopes.length > 0;

  const lines: string[] = [];
  lines.push(
    `// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`,
  );
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  if (borderSlot || bgSlot) lines.push(`import androidx.compose.foundation.background`);
  if (borderSlot) lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.layout.Arrangement`);
  if (
    paddingInlineStartSlot || paddingInlineEndSlot ||
    paddingBlockStartSlot || paddingBlockEndSlot
  ) {
    lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  }
  lines.push(`import androidx.compose.foundation.layout.Row`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.CompositionLocalProvider`);
  lines.push(`import androidx.compose.ui.Modifier`);
  if (bgSlot || radiusSlot) lines.push(`import androidx.compose.ui.draw.clip`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsContentColor`);
  if (usesTheme) {
    lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
    if (bgSlot || fgSlot || borderSlot) lines.push(`import com.fullstackds.tokens.toFsdsColor`);
    lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  }
  for (const line of referenceImports(ir)) lines.push(line);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  for (const axis of axes) {
    lines.push(`/** Variant axis lowered from the contract's ${axis.enumName} type. */`);
    lines.push(
      `enum class ${axis.enumName} { ${axis.values.map(kotlinEnumName).join(", ")} }`,
    );
    lines.push(``);
  }
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  for (const axis of axes) {
    lines.push(
      axis.defaultMember !== null
        ? `    ${kotlinParamName(axis.propName)}: ${axis.enumName} = ${axis.enumName}.${kotlinEnumName(axis.defaultMember)},`
        : `    ${kotlinParamName(axis.propName)}: ${axis.enumName}? = null,`,
    );
  }
  lines.push(`    icon: (@Composable () -> Unit)? = null,`);
  for (const ref of referenceNodes(ir, "trigger")) lines.push(...referenceParameterLines(ir, ref));
  lines.push(`    content: @Composable () -> Unit,`);
  lines.push(`) {`);
  if (usesTheme) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(
      `        for (key in listOfNotNull(${[...variantLayerExprs, `"root"`].join(", ")})) {`,
    );
    lines.push(`            val def = ${tokenConstName(ir)}[key]?.get(slotName)`);
    lines.push(`            if (def != null) return fsdsTheme.resolve(def)`);
    lines.push(`        }`);
    lines.push(`        return null`);
    lines.push(`    }`);
    emitRoleVal("containerColor", bgVariantEntries, bgSlot);
    emitRoleVal("borderColor", borderVariantEntries, borderSlot);
    emitRoleVal("contentColor", fgVariantEntries, fgSlot);
    if (radiusSlot) {
      lines.push(
        `    val cornerRadius = layeredSlot(${JSON.stringify(radiusSlot.name)})?.toFsdsDp() ?: 0.dp`,
      );
    }
    if (gapSlot) {
      lines.push(
        `    val gap = layeredSlot(${JSON.stringify(gapSlot.name)})?.toFsdsDp() ?: 0.dp`,
      );
    }
    if (minWidthSlot || minHeightSlot) {
      lines.push(
        `    val minInlineWidth = ${minWidthSlot ? `layeredSlot(${JSON.stringify(minWidthSlot.name)})?.toFsdsDp() ?: 0.dp` : "0.dp"}`,
      );
      lines.push(
        `    val minBlockHeight = ${minHeightSlot ? `layeredSlot(${JSON.stringify(minHeightSlot.name)})?.toFsdsDp() ?: 0.dp` : "0.dp"}`,
      );
    }
    if (
      paddingInlineStartSlot || paddingInlineEndSlot ||
      paddingBlockStartSlot || paddingBlockEndSlot
    ) {
      const side = (slot: { name: string } | undefined) =>
        slot
          ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp`
          : `0.dp`;
      lines.push(
        `    val chromePadding = PaddingValues(start = ${side(paddingInlineStartSlot)}, end = ${side(paddingInlineEndSlot)}, top = ${side(paddingBlockStartSlot)}, bottom = ${side(paddingBlockEndSlot)})`,
      );
    }
    lines.push(``);
  }
  lines.push(`    val shape = RoundedCornerShape(${radiusSlot ? "cornerRadius" : "0.dp"})`);
  lines.push(`    val chromeModifier = Modifier`);
  if (bgSlot || radiusSlot) {
    lines.push(`        .clip(shape)`);
  }
  if (bgSlot) {
    lines.push(
      `        .then(if (containerColor != null) Modifier.background(containerColor, shape) else Modifier)`,
    );
  }
  if (borderSlot) {
    lines.push(
      `        .then(if (borderColor != null) Modifier.border(1.dp, borderColor, shape) else Modifier)`,
    );
  }
  if (
    paddingInlineStartSlot || paddingInlineEndSlot ||
    paddingBlockStartSlot || paddingBlockEndSlot
  ) {
    lines.push(`        .padding(chromePadding)`);
  }
  lines.push(`    CompositionLocalProvider(`);
  lines.push(
    `        LocalFsdsContentColor provides (${fgSlot ? "contentColor ?: Color.Unspecified" : "Color.Unspecified"}),`,
  );
  lines.push(`    ) {`);
  lines.push(`        Row(`);
  lines.push(`            modifier.then(chromeModifier),`);
  lines.push(`            horizontalArrangement = Arrangement.spacedBy(${gapSlot ? "gap" : "0.dp"}),`);
  lines.push(`        ) {`);
  lines.push(`            icon?.invoke()`);
  lines.push(`            content()`);
  for (const ref of referenceNodes(ir, "trigger")) lines.push(...emitComponentReference(ir, ref, "            "));
  lines.push(`        }`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The string value-channel control class (FEAT-COMPOSE-TEXT-CONTROL-01):
 * the text twin of the boolean control — the sole string channel projects
 * through the controlled/uncontrolled pattern onto a foundation
 * BasicTextField with input-part chrome (bg/border/text colors incl.
 * disabled variants, border width, radius, typography size) resolved from
 * the token scopes. Input is the corpus consumer.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - `input.opacity.disabled` is unclaimed — a unitless numeric with no
 *     toFsds converter; disabled styling rides the color slots instead;
 *   - form-wiring props (name/id/ariaLabelledby) are omitted v1;
 *     `ariaLabel` lowers to the semantics contentDescription.
 */
function emitTextControl(ir: ComponentIR, channel: NormalizedChannelIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const valueProp = channel.valueProp;
  const defaultValueProp = channel.defaultValueProp ?? `${valueProp}Default`;
  const changeProp = channel.changeHandlerProp;

  const hasDisabled = ir.styledProps.some(
    (p) => p.name === "disabled" && p.propType.kind === "boolean",
  );
  const handled = new Set<string>([
    valueProp,
    defaultValueProp,
    changeProp,
    "name",
    "id",
    "ariaLabel",
    "ariaLabelledby",
    ...(hasDisabled ? ["disabled"] : []),
  ]);
  const stringProps = ir.styledProps.filter(
    (p) => p.propType.kind === "string" && !handled.has(p.name),
  );

  const bgSlot = findTokenSlot(ir, "root", ".color.bg.default");
  const bgDisabledSlot = findTokenSlot(ir, "root", ".color.bg.disabled");
  const borderSlot = findTokenSlot(ir, "root", ".color.border.default");
  const borderDisabledSlot = findTokenSlot(ir, "root", ".color.border.disabled");
  const textSlot = findTokenSlot(ir, "root", ".color.text.default");
  const borderWidthSlot = findTokenSlot(ir, "root", ".size.border.default");
  const radiusSlot = findTokenSlot(ir, "root", ".size.radius.default");
  const fontSizeSlot = findTokenSlot(ir, "root", ".typography.size.default");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const lines: string[] = [];
  lines.push(
    `// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`,
  );
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  if (bgSlot || bgDisabledSlot) lines.push(`import androidx.compose.foundation.background`);
  if (borderSlot || borderDisabledSlot) lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.layout.Box`);
  if (
    paddingInlineStartSlot || paddingInlineEndSlot ||
    paddingBlockStartSlot || paddingBlockEndSlot
  ) {
    lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  }
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.foundation.text.BasicText`);
  lines.push(`import androidx.compose.foundation.text.BasicTextField`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.getValue`);
  lines.push(`import androidx.compose.runtime.mutableStateOf`);
  lines.push(`import androidx.compose.runtime.remember`);
  lines.push(`import androidx.compose.runtime.setValue`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.draw.clip`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.semantics.contentDescription`);
  lines.push(`import androidx.compose.ui.semantics.semantics`);
  lines.push(`import androidx.compose.ui.text.TextStyle`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  if (fontSizeSlot) lines.push(`import androidx.compose.ui.unit.sp`);
  if (consumesTokens) {
    lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
    lines.push(`import com.fullstackds.tokens.toFsdsColor`);
    lines.push(`import com.fullstackds.tokens.toFsdsDp`);
    if (fontSizeSlot) lines.push(`import com.fullstackds.tokens.toFsdsSp`);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    ${valueProp}: String? = null,`);
  lines.push(`    ${defaultValueProp}: String = "",`);
  lines.push(`    ${changeProp}: ((String) -> Unit)? = null,`);
  for (const prop of stringProps) {
    lines.push(`    ${prop.safeName}: String? = null,`);
  }
  if (hasDisabled) {
    lines.push(`    enabled: Boolean = true,`);
  }
  lines.push(`    contentDescription: String? = null,`);
  lines.push(`) {`);
  lines.push(
    `    var uncontrolled${pascalCase(valueProp)} by remember { mutableStateOf(${defaultValueProp}) }`,
  );
  lines.push(
    `    val resolved${pascalCase(valueProp)} = ${valueProp} ?: uncontrolled${pascalCase(valueProp)}`,
  );
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    const colorVal = (valName: string, slot: { name: string } | undefined) => {
      if (slot) {
        lines.push(
          `    val ${valName} = fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(slot.name)}))?.toFsdsColor()`,
        );
      } else {
        lines.push(`    val ${valName}: Color? = null`);
      }
    };
    colorVal("fieldBg", bgSlot);
    colorVal("fieldBgDisabled", bgDisabledSlot);
    colorVal("fieldBorder", borderSlot);
    colorVal("fieldBorderDisabled", borderDisabledSlot);
    colorVal("fieldText", textSlot);
    if (borderWidthSlot) {
      lines.push(
        `    val fieldBorderWidth = fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(borderWidthSlot.name)}))?.toFsdsDp() ?: 1.dp`,
      );
    }
    if (radiusSlot) {
      lines.push(
        `    val fieldRadius = fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(radiusSlot.name)}))?.toFsdsDp() ?: 4.dp`,
      );
    }
    if (fontSizeSlot) {
      lines.push(
        `    val fieldFontSize = fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(fontSizeSlot.name)}))?.toFsdsSp()`,
      );
    }
    const side = (slot: { name: string } | undefined) =>
      slot
        ? `fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(slot.name)}))?.toFsdsDp() ?: 0.dp`
        : `0.dp`;
    lines.push(
      `    val fieldPadding = PaddingValues(start = ${side(paddingInlineStartSlot)}, end = ${side(paddingInlineEndSlot)}, top = ${side(paddingBlockStartSlot)}, bottom = ${side(paddingBlockEndSlot)})`,
    );
    if (minWidthSlot || minHeightSlot) {
      lines.push(
        `    val fieldMinWidth = ${minWidthSlot ? side(minWidthSlot) : "0.dp"}`,
      );
      lines.push(
        `    val fieldMinHeight = ${minHeightSlot ? side(minHeightSlot) : "0.dp"}`,
      );
    }
    lines.push(``);
  }
  lines.push(`    val fieldShape = RoundedCornerShape(${radiusSlot ? "fieldRadius" : "4.dp"})`);
  lines.push(`    val activeBg = if (enabled) fieldBg else fieldBgDisabled ?: fieldBg`);
  lines.push(`    val activeBorder = if (enabled) fieldBorder else fieldBorderDisabled ?: fieldBorder`);
  lines.push(`    val fieldModifier = modifier`);
  if (minWidthSlot || minHeightSlot) {
    lines.push(`        .requiredSizeIn(minWidth = fieldMinWidth, minHeight = fieldMinHeight)`);
  }
  lines.push(`        .clip(fieldShape)`);
  lines.push(
    `        .then(if (activeBg != null) Modifier.background(activeBg, fieldShape) else Modifier)`,
  );
  if (borderSlot || borderDisabledSlot) {
    lines.push(
      `        .then(if (activeBorder != null) Modifier.border(${borderWidthSlot ? "fieldBorderWidth" : "1.dp"}, activeBorder, fieldShape) else Modifier)`,
    );
  }
  lines.push(`        .padding(fieldPadding)`);
  if (hasDisabled) {
    lines.push(`    val descriptionModifier = if (contentDescription != null) {`);
    lines.push(`        Modifier.semantics { this.contentDescription = contentDescription }`);
    lines.push(`    } else {`);
    lines.push(`        Modifier`);
    lines.push(`    }`);
  }
  lines.push(`    BasicTextField(`);
  lines.push(`        value = resolved${pascalCase(valueProp)},`);
  lines.push(`        onValueChange = { next ->`);
  lines.push(`            if (${valueProp} == null) {`);
  lines.push(`                uncontrolled${pascalCase(valueProp)} = next`);
  lines.push(`            }`);
  lines.push(`            ${changeProp}?.invoke(next)`);
  lines.push(`        },`);
  lines.push(`        modifier = fieldModifier${hasDisabled ? ".then(descriptionModifier)" : ""},`);
  lines.push(`        ${hasDisabled ? "enabled = enabled," : ""}`);
  lines.push(`        textStyle = TextStyle(`);
  lines.push(`            fontSize = ${fontSizeSlot ? "fieldFontSize ?: 16.sp" : "16.sp"},`);
  lines.push(`            color = ${textSlot ? "fieldText ?: Color.Unspecified" : "Color.Unspecified"},`);
  lines.push(`        ),`);
  lines.push(`        decorationBox = { innerField ->`);
  lines.push(`            Box {`);
  lines.push(`                innerField()`);
  for (const prop of stringProps) {
    if (prop.safeName === "placeholder") {
      lines.push(`                if (resolved${pascalCase(valueProp)}.isEmpty() && !placeholder.isNullOrEmpty()) {`);
      lines.push(`                    BasicText(`);
      lines.push(`                        text = placeholder,`);
      lines.push(
        `                        style = TextStyle(fontSize = ${fontSizeSlot ? "fieldFontSize ?: 16.sp" : "16.sp"}, color = ${textSlot ? "(fieldText ?: Color.Unspecified).copy(alpha = 0.5f)" : "Color.Unspecified.copy(alpha = 0.5f)"}),`,
      );
      lines.push(`                    )`);
      lines.push(`                }`);
    }
  }
  lines.push(`            }`);
  lines.push(`        },`);
  lines.push(`    )`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The native-disclosure collapse class (FEAT-COMPOSE-DISCLOSURE-01): a
 * contract declaring `native-disclosure` with a boolean open channel and
 * exactly one content compound part lowers to a toggleable header (the
 * summary text beside a painted rotating chevron) plus an animated content
 * region — the Compose analog of SwiftUI's DisclosureGroup, on
 * foundation-only primitives (toggleable + AnimatedVisibility). Details is
 * the corpus consumer.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - hover-scoped slots (`hover` scope) and focus-ring slots are unclaimed
 *     — the header keeps no hover interaction state v1;
 *   - `details.typography.*` and `details.spacing.*` are unclaimed — the
 *     summary renders default typography, content is a consumer composable.
 */
function emitDisclosureComponent(ir: ComponentIR): string {
  const openChannel = ir.behavior.normalizedChannels.find(
    (c) => c.valueType === "boolean",
  );
  if (!openChannel) {
    throw new Error(
      `emitDisclosureComponent: ${ir.name} declares native-disclosure but has no boolean open channel.`,
    );
  }
  const contentParts = ir.compoundParts.filter((p) => p.name === "content");
  if (contentParts.length !== 1) {
    throw new Error(
      `emitDisclosureComponent: ${ir.name} needs exactly one content compound part (found: ${ir.compoundParts.map((p) => p.name).join("/") || "none"}).`,
    );
  }
  const name = ir.name;
  const segment = packageSegment(name);
  const valueProp = openChannel.valueProp;
  const defaultValueProp = openChannel.defaultValueProp ?? `${valueProp}Default`;
  const changeProp = openChannel.changeHandlerProp;
  const hasSummary = ir.styledProps.some((p) => p.safeName === "summary");
  const hasDisabled = ir.styledProps.some(
    (p) => p.name === "disabled" && p.propType.kind === "boolean",
  );

  const bgSlot = findLayeredSlotAny(ir, ["root"], [".color.background.default"]);
  const fgSlot = findLayeredSlotAny(ir, ["root"], [".color.foreground.primary"]);
  const borderSlot = findLayeredSlotAny(ir, ["root"], [".color.border.default"]);
  const radiusSlot = findLayeredSlotAny(ir, ["root"], [".size.radius.default"]);
  const iconSizeSlot = findLayeredSlotAny(ir, ["root"], [".size.icon"]);
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const lines: string[] = [];
  lines.push(
    `// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`,
  );
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  lines.push(`import androidx.compose.animation.AnimatedVisibility`);
  lines.push(`import androidx.compose.animation.core.animateFloatAsState`);
  lines.push(`import androidx.compose.foundation.background`);
  lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.layout.Box`);
  lines.push(`import androidx.compose.foundation.layout.Column`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.foundation.layout.Row`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.layout.size`);
  lines.push(`import androidx.compose.foundation.selection.toggleable`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.foundation.text.BasicText`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.CompositionLocalProvider`);
  lines.push(`import androidx.compose.runtime.getValue`);
  lines.push(`import androidx.compose.runtime.mutableStateOf`);
  lines.push(`import androidx.compose.runtime.remember`);
  lines.push(`import androidx.compose.runtime.setValue`);
  lines.push(`import androidx.compose.ui.Alignment`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.draw.clip`);
  lines.push(`import androidx.compose.ui.draw.drawBehind`);
  lines.push(`import androidx.compose.ui.draw.rotate`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.semantics.Role`);
  lines.push(`import androidx.compose.ui.semantics.semantics`);
  lines.push(`import androidx.compose.ui.semantics.stateDescription`);
  lines.push(`import androidx.compose.ui.text.TextStyle`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  if (consumesTokens) {
    lines.push(`import com.fullstackds.tokens.LocalFsdsContentColor`);
    lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
    if (bgSlot || fgSlot || borderSlot) lines.push(`import com.fullstackds.tokens.toFsdsColor`);
    lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  }
  for (const line of referenceImports(ir)) lines.push(line);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    ${valueProp}: Boolean? = null,`);
  lines.push(`    ${defaultValueProp}: Boolean = false,`);
  lines.push(`    ${changeProp}: ((Boolean) -> Unit)? = null,`);
  if (hasSummary) lines.push(`    summary: String? = null,`);
  if (hasDisabled) lines.push(`    enabled: Boolean = true,`);
  lines.push(`    content: @Composable () -> Unit,`);
  lines.push(`) {`);
  lines.push(
    `    var uncontrolled${pascalCase(valueProp)} by remember { mutableStateOf(${defaultValueProp}) }`,
  );
  lines.push(
    `    val resolved${pascalCase(valueProp)} = ${valueProp} ?: uncontrolled${pascalCase(valueProp)}`,
  );
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(`        val def = ${tokenConstName(ir)}["root"]?.get(slotName)`);
    lines.push(`        return def?.let { fsdsTheme.resolve(it) }`);
    lines.push(`    }`);
    if (bgSlot) {
      lines.push(
        `    val containerColor = layeredSlot(${JSON.stringify(bgSlot.name)})?.toFsdsColor()`,
      );
    }
    if (fgSlot) {
      lines.push(
        `    val contentColor = layeredSlot(${JSON.stringify(fgSlot.name)})?.toFsdsColor()`,
      );
    }
    if (borderSlot) {
      lines.push(
        `    val borderColor = layeredSlot(${JSON.stringify(borderSlot.name)})?.toFsdsColor()`,
      );
    }
    if (radiusSlot) {
      lines.push(
        `    val cornerRadius = layeredSlot(${JSON.stringify(radiusSlot.name)})?.toFsdsDp() ?: 4.dp`,
      );
    }
    if (iconSizeSlot) {
      lines.push(
        `    val chevronSize = layeredSlot(${JSON.stringify(iconSizeSlot.name)})?.toFsdsDp() ?: 16.dp`,
      );
    }
    const side = (slot: { name: string } | undefined) =>
      slot
        ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp`
        : `0.dp`;
    lines.push(
      `    val chromePadding = PaddingValues(start = ${side(paddingInlineStartSlot)}, end = ${side(paddingInlineEndSlot)}, top = ${side(paddingBlockStartSlot)}, bottom = ${side(paddingBlockEndSlot)})`,
    );
    if (minWidthSlot || minHeightSlot) {
      lines.push(`    val minWidth = ${side(minWidthSlot)}`);
      lines.push(`    val minHeight = ${side(minHeightSlot)}`);
    }
    lines.push(``);
  }
  lines.push(`    val shape = RoundedCornerShape(${radiusSlot ? "cornerRadius" : "4.dp"})`);
  lines.push(`    val chevronProgress by animateFloatAsState(`);
  lines.push(`        targetValue = if (resolved${pascalCase(valueProp)}) 90f else 0f,`);
  lines.push(`        label = "fsds-${segment}-chevron",`);
  lines.push(`    )`);
  lines.push(`    Column(`);
  lines.push(`        modifier`);
  if (minWidthSlot || minHeightSlot) {
    lines.push(`            .requiredSizeIn(minWidth = minWidth, minHeight = minHeight)`);
  }
  lines.push(`            .clip(shape)`);
  if (bgSlot) {
    lines.push(
      `            .then(if (containerColor != null) Modifier.background(containerColor, shape) else Modifier)`,
    );
  }
  if (borderSlot) {
    lines.push(
      `            .then(if (borderColor != null) Modifier.border(1.dp, borderColor, shape) else Modifier)`,
    );
  }
  lines.push(`            .padding(chromePadding)`);
  lines.push(`    ) {`);
  lines.push(`        Row(`);
  lines.push(`            Modifier`);
  lines.push(`                .toggleable(`);
  lines.push(`                    value = resolved${pascalCase(valueProp)},`);
  if (hasDisabled) lines.push(`                    enabled = enabled,`);
  lines.push(`                    role = Role.Button,`);
  lines.push(`                    onValueChange = { next ->`);
  lines.push(`                        if (${valueProp} == null) {`);
  lines.push(`                            uncontrolled${pascalCase(valueProp)} = next`);
  lines.push(`                        }`);
  lines.push(`                        ${changeProp}?.invoke(next)`);
  lines.push(`                    },`);
  lines.push(`                )`);
  lines.push(`                .semantics { stateDescription = if (resolved${pascalCase(valueProp)}) "expanded" else "collapsed" },`);
  lines.push(`            verticalAlignment = Alignment.CenterVertically,`);
  lines.push(`        ) {`);
  if (hasSummary) {
    lines.push(`            if (summary != null) {`);
    lines.push(`                BasicText(`);
    lines.push(`                    text = summary,`);
    lines.push(
      `                    style = TextStyle(color = ${fgSlot ? "contentColor ?: Color.Unspecified" : "Color.Unspecified"}),`,
    );
    lines.push(`                )`);
    lines.push(`            }`);
  }
  for (const ref of referenceNodes(ir, "decoration")) {
    lines.push(...emitComponentReference(ir, ref, "            ", [
      `Modifier.size(chevronSize)`,
      `Modifier.rotate(chevronProgress)`,
    ]));
  }
  lines.push(`        }`);
  lines.push(`        AnimatedVisibility(visible = resolved${pascalCase(valueProp)}) {`);
  if (fgSlot) {
    lines.push(`            CompositionLocalProvider(`);
    lines.push(`                LocalFsdsContentColor provides (contentColor ?: Color.Unspecified),`);
    lines.push(`            ) {`);
    lines.push(`                content()`);
    lines.push(`            }`);
  } else {
    lines.push(`            content()`);
  }
  lines.push(`        }`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The radio-collection class (FEAT-COMPOSE-RADIO-ADMISSION-01): the
 * shared `radioGroupFacts` extraction drives a foundation-only
 * single-choice group — an option data class lowered from the contract
 * alias, one `selectable` row per option (painted radio indicator +
 * label), orientation-aware layout, and the controlled/uncontrolled
 * string channel. RadioGroup is the corpus consumer.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - the option alias's `title`/help member is carried on the data class
 *     but not rendered v1 (the swift twin lowers it to `.help`);
 *   - option-level disabled is honored through `selectable(enabled = ...)`;
 *     group-level disabled has no corpus fact today.
 */
function emitRadioGroup(ir: ComponentIR, facts: RadioGroupFacts): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const { channel } = facts;
  const valueProp = channel.valueProp;
  const defaultValueProp = channel.defaultValueProp ?? `${valueProp}Default`;
  const changeProp = channel.changeHandlerProp;
  const orientation = facts.orientation;
  const orientationEnum = orientation ? orientation.typeName : null;
  const kotlinTypeOf = (t: "String" | "Bool") => (t === "String" ? "String" : "Boolean");

  const gapSlot = findTokenSlot(ir, "root", "box-model.gap");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const lines: string[] = [];
  lines.push(
    `// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`,
  );
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  lines.push(`import androidx.compose.foundation.background`);
  lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.layout.Arrangement`);
  lines.push(`import androidx.compose.foundation.layout.Box`);
  lines.push(`import androidx.compose.foundation.layout.Column`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.foundation.layout.Row`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.layout.size`);
  lines.push(`import androidx.compose.foundation.selection.selectable`);
  lines.push(`import androidx.compose.foundation.shape.CircleShape`);
  lines.push(`import androidx.compose.foundation.text.BasicText`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.CompositionLocalProvider`);
  lines.push(`import androidx.compose.runtime.getValue`);
  lines.push(`import androidx.compose.runtime.mutableStateOf`);
  lines.push(`import androidx.compose.runtime.remember`);
  lines.push(`import androidx.compose.runtime.setValue`);
  lines.push(`import androidx.compose.ui.Alignment`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.semantics.Role`);
  lines.push(`import androidx.compose.ui.text.TextStyle`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsContentColor`);
  if (consumesTokens) {
    lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
    lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`/** Option type lowered from the contract's ${facts.itemType} alias. */`);
  lines.push(`data class ${facts.itemType}(`);
  for (const member of facts.members) {
    lines.push(
      `    val ${member.name}: ${kotlinTypeOf(member.type)}${member.optional ? "? = null" : ""},`,
    );
  }
  lines.push(`)`);
  lines.push(``);
  if (orientationEnum) {
    lines.push(`/** Orientation axis lowered from the contract's ${orientationEnum} type. */`);
    lines.push(
      `enum class ${orientationEnum} { ${orientation!.values.map(kotlinEnumName).join(", ")} }`,
    );
    lines.push(``);
  }
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    ${facts.optionsProp}: List<${facts.itemType}> = emptyList(),`);
  lines.push(`    ${valueProp}: String? = null,`);
  lines.push(`    ${defaultValueProp}: String = "",`);
  lines.push(`    ${changeProp}: ((String) -> Unit)? = null,`);
  if (facts.labelProp) lines.push(`    ${facts.labelProp}: String? = null,`);
  if (orientationEnum) {
    lines.push(
      `    ${orientation!.propName}: ${orientationEnum} = ${orientationEnum}.${kotlinEnumName(orientation!.defaultMember)},`,
    );
  }
  lines.push(`) {`);
  lines.push(
    `    var uncontrolled${pascalCase(valueProp)} by remember { mutableStateOf(${defaultValueProp}) }`,
  );
  lines.push(
    `    val resolved${pascalCase(valueProp)} = ${valueProp} ?: uncontrolled${pascalCase(valueProp)}`,
  );
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(`        val def = ${tokenConstName(ir)}["root"]?.get(slotName)`);
    lines.push(`        return def?.let { fsdsTheme.resolve(it) }`);
    lines.push(`    }`);
    if (gapSlot) {
      lines.push(
        `    val groupGap = layeredSlot(${JSON.stringify(gapSlot.name)})?.toFsdsDp() ?: 0.dp`,
      );
    } else {
      lines.push(`    val groupGap = 0.dp`);
    }
    const side = (slot: { name: string } | undefined) =>
      slot
        ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp`
        : `0.dp`;
    lines.push(
      `    val groupPadding = PaddingValues(start = ${side(paddingInlineStartSlot)}, end = ${side(paddingInlineEndSlot)}, top = ${side(paddingBlockStartSlot)}, bottom = ${side(paddingBlockEndSlot)})`,
    );
    if (minWidthSlot || minHeightSlot) {
      lines.push(`    val groupMinWidth = ${side(minWidthSlot)}`);
      lines.push(`    val groupMinHeight = ${side(minHeightSlot)}`);
    }
    lines.push(``);
  } else {
    lines.push(`    val groupGap = 0.dp`);
    lines.push(`    val groupPadding = PaddingValues(0.dp)`);
    if (minWidthSlot || minHeightSlot) {
      lines.push(`    val groupMinWidth = 0.dp`);
      lines.push(`    val groupMinHeight = 0.dp`);
    }
  }
  lines.push(`    Column(`);
  lines.push(`        modifier`);
  if (minWidthSlot || minHeightSlot) {
    lines.push(`            .requiredSizeIn(minWidth = groupMinWidth, minHeight = groupMinHeight)`);
  }
  lines.push(`            .padding(groupPadding)`);
  lines.push(`    ) {`);
  if (facts.labelProp) {
    lines.push(`        if (${facts.labelProp} != null) {`);
    lines.push(`            BasicText(text = ${facts.labelProp})`);
    lines.push(`        }`);
  }
  lines.push(`        val optionContent: @Composable () -> Unit = {`);
  lines.push(`            ${facts.optionsProp}.forEach { item ->`);
  lines.push(`                val selected = resolved${pascalCase(valueProp)} == item.${facts.valueMember}`);
  lines.push(`                Row(`);
  lines.push(`                    Modifier`);
  lines.push(`                        .selectable(`);
  lines.push(`                            selected = selected,`);
  if (facts.disabledMember) {
    lines.push(
      `                            enabled = item.${facts.disabledMember} != true,`,
    );
  }
  lines.push(`                            role = Role.RadioButton,`);
  lines.push(`                            onClick = {`);
  lines.push(`                                if (${valueProp} == null) {`);
  lines.push(
    `                                    uncontrolled${pascalCase(valueProp)} = item.${facts.valueMember}`,
  );
  lines.push(`                                }`);
  lines.push(
    `                                ${changeProp}?.invoke(item.${facts.valueMember})`,
  );
  lines.push(`                            },`);
  lines.push(`                        )`);
  lines.push(`                        .padding(end = 8.dp),`);
  lines.push(`                    verticalAlignment = Alignment.CenterVertically,`);
  lines.push(`                ) {`);
  lines.push(`                    Box(`);
  lines.push(`                        Modifier`);
  lines.push(`                            .size(18.dp)`);
  lines.push(`                            .border(1.dp, LocalFsdsContentColor.current, CircleShape),`);
  lines.push(`                        contentAlignment = Alignment.Center,`);
  lines.push(`                    ) {`);
  lines.push(`                        if (selected) {`);
  lines.push(`                            Box(Modifier.size(8.dp).background(LocalFsdsContentColor.current, CircleShape))`);
  lines.push(`                        }`);
  lines.push(`                    }`);
  lines.push(
    `                    BasicText(text = item.${facts.labelMember}, style = TextStyle(color = LocalFsdsContentColor.current))`,
  );
  lines.push(`                }`);
  lines.push(`            }`);
  lines.push(`        }`);
  lines.push(`        CompositionLocalProvider(LocalFsdsContentColor provides Color.Unspecified) {`);
  if (orientationEnum) {
    lines.push(`            if (${orientation!.propName} == ${orientationEnum}.${kotlinEnumName("horizontal")}) {`);
    lines.push(
      `                Row(horizontalArrangement = Arrangement.spacedBy(${gapSlot ? "groupGap" : "0.dp"}, Alignment.CenterHorizontally)) { optionContent() }`,
    );
    lines.push(`            } else {`);
    lines.push(
      `                Column(verticalArrangement = Arrangement.spacedBy(${gapSlot ? "groupGap" : "0.dp"})) { optionContent() }`,
    );
    lines.push(`            }`);
  } else {
    lines.push(
      `            Column(verticalArrangement = Arrangement.spacedBy(${gapSlot ? "groupGap" : "0.dp"})) { optionContent() }`,
    );
  }
  lines.push(`        }`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The array-iterated list class (FEAT-COMPOSE-SHUTTLE-ADMISSION-01): the
 * sole array channel rides the controlled/uncontrolled pattern; each item
 * renders as a removable row (the contract's iteration-local removal
 * write), with chrome (background/border/radius/padding/gap) resolved
 * from the token scopes. Shuttle is the corpus consumer.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - the item removal is the swift twin's write (filter the item out);
 *     other iteration-local channel writes are not consulted;
 *   - hover/active-scoped slots are unclaimed (no interaction state v1).
 */
function emitArrayIteratedList(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const channel = ir.behavior.normalizedChannels[0]!;
  const valueProp = channel.valueProp;
  const defaultValueProp = channel.defaultValueProp ?? `${valueProp}Default`;
  const changeProp = channel.changeHandlerProp;
  const hasAria = ir.styledProps.some((p) => p.safeName === "ariaLabel");

  const bgSlot = findLayeredSlotAny(ir, ["root"], [".color.background.default"]);
  const fgSlot = findLayeredSlotAny(ir, ["root"], [".color.foreground.primary", ".color.text.default"]);
  const borderSlot = findLayeredSlotAny(ir, ["root"], [".color.border.default"]);
  const radiusSlot = findLayeredSlotAny(ir, ["root"], [".size.radius.default"]);
  const gapSlot = findTokenSlot(ir, "root", "box-model.gap");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const lines: string[] = [];
  lines.push(
    `// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`,
  );
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  if (bgSlot) lines.push(`import androidx.compose.foundation.background`);
  if (borderSlot) lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.clickable`);
  lines.push(`import androidx.compose.foundation.layout.Arrangement`);
  lines.push(`import androidx.compose.foundation.layout.Column`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.foundation.text.BasicText`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.CompositionLocalProvider`);
  lines.push(`import androidx.compose.runtime.getValue`);
  lines.push(`import androidx.compose.runtime.mutableStateOf`);
  lines.push(`import androidx.compose.runtime.remember`);
  lines.push(`import androidx.compose.runtime.setValue`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.draw.clip`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.semantics.contentDescription`);
  lines.push(`import androidx.compose.ui.semantics.semantics`);
  lines.push(`import androidx.compose.ui.text.TextStyle`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsContentColor`);
  if (consumesTokens) {
    lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
    if (bgSlot || fgSlot || borderSlot) lines.push(`import com.fullstackds.tokens.toFsdsColor`);
    lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    ${valueProp}: List<String>? = null,`);
  lines.push(`    ${defaultValueProp}: List<String> = emptyList(),`);
  lines.push(`    ${changeProp}: ((List<String>) -> Unit)? = null,`);
  if (hasAria) lines.push(`    contentDescription: String? = null,`);
  lines.push(`) {`);
  lines.push(
    `    var uncontrolled${pascalCase(valueProp)} by remember { mutableStateOf(${defaultValueProp}) }`,
  );
  lines.push(
    `    val resolved${pascalCase(valueProp)} = ${valueProp} ?: uncontrolled${pascalCase(valueProp)}`,
  );
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(`        val def = ${tokenConstName(ir)}["root"]?.get(slotName)`);
    lines.push(`        return def?.let { fsdsTheme.resolve(it) }`);
    lines.push(`    }`);
    if (bgSlot) {
      lines.push(`    val containerColor = layeredSlot(${JSON.stringify(bgSlot.name)})?.toFsdsColor()`);
    }
    if (fgSlot) {
      lines.push(`    val contentColor = layeredSlot(${JSON.stringify(fgSlot.name)})?.toFsdsColor()`);
    }
    if (borderSlot) {
      lines.push(`    val borderColor = layeredSlot(${JSON.stringify(borderSlot.name)})?.toFsdsColor()`);
    }
    if (radiusSlot) {
      lines.push(`    val cornerRadius = layeredSlot(${JSON.stringify(radiusSlot.name)})?.toFsdsDp() ?: 0.dp`);
    }
    if (gapSlot) {
      lines.push(`    val listGap = layeredSlot(${JSON.stringify(gapSlot.name)})?.toFsdsDp() ?: 0.dp`);
    } else {
      lines.push(`    val listGap = 0.dp`);
    }
    const side = (slot: { name: string } | undefined) =>
      slot
        ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp`
        : `0.dp`;
    lines.push(
      `    val listPadding = PaddingValues(start = ${side(paddingInlineStartSlot)}, end = ${side(paddingInlineEndSlot)}, top = ${side(paddingBlockStartSlot)}, bottom = ${side(paddingBlockEndSlot)})`,
    );
    if (minWidthSlot || minHeightSlot) {
      lines.push(`    val listMinWidth = ${side(minWidthSlot)}`);
      lines.push(`    val listMinHeight = ${side(minHeightSlot)}`);
    }
    lines.push(``);
  } else {
    lines.push(`    val listGap = 0.dp`);
    lines.push(`    val listPadding = PaddingValues(0.dp)`);
    if (minWidthSlot || minHeightSlot) {
      lines.push(`    val listMinWidth = 0.dp`);
      lines.push(`    val listMinHeight = 0.dp`);
    }
  }
  lines.push(`    val shape = RoundedCornerShape(${radiusSlot ? "cornerRadius" : "0.dp"})`);
  lines.push(`    val listModifier = modifier`);
  if (minWidthSlot || minHeightSlot) {
    lines.push(`        .requiredSizeIn(minWidth = listMinWidth, minHeight = listMinHeight)`);
  }
  lines.push(`        .clip(shape)`);
  if (bgSlot) {
    lines.push(
      `        .then(if (containerColor != null) Modifier.background(containerColor, shape) else Modifier)`,
    );
  }
  if (borderSlot) {
    lines.push(
      `        .then(if (borderColor != null) Modifier.border(1.dp, borderColor, shape) else Modifier)`,
    );
  }
  lines.push(`        .padding(listPadding)`);
  if (hasAria) {
    lines.push(`        .then(if (contentDescription != null) Modifier.semantics { this.contentDescription = contentDescription } else Modifier)`);
  }
  lines.push(`    CompositionLocalProvider(`);
  lines.push(
    `        LocalFsdsContentColor provides (${fgSlot ? "contentColor ?: Color.Unspecified" : "Color.Unspecified"}),`,
  );
  lines.push(`    ) {`);
  lines.push(`        Column(`);
  lines.push(`            listModifier,`);
  lines.push(`            verticalArrangement = Arrangement.spacedBy(listGap),`);
  lines.push(`        ) {`);
  lines.push(`            resolved${pascalCase(valueProp)}.forEach { item ->`);
  lines.push(`                BasicText(`);
  lines.push(`                    text = item,`);
  lines.push(`                    modifier = Modifier.clickable {`);
  lines.push(`                        val next = resolved${pascalCase(valueProp)}.filter { it != item }`);
  lines.push(
    `                        if (${valueProp} == null) { uncontrolled${pascalCase(valueProp)} = next }`,
  );
  lines.push(`                        ${changeProp}?.invoke(next)`);
  lines.push(`                    },`);
  lines.push(`                    style = TextStyle(color = LocalFsdsContentColor.current),`);
  lines.push(`                )`);
  lines.push(`            }`);
  lines.push(`        }`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The interactive-composite class (FEAT-COMPOSE-INTERACTIVE-COMPOSITE-01):
 * the shared predicate's compound-context realization. The root owns the
 * controlled/uncontrolled channel state and provides it through a
 * component-scoped CompositionLocal; each trigger part lowers to a
 * subcomponent that selects (scalar) or toggles membership (union) on
 * press, and each content part renders only while selected/contained.
 * Accordion (union) and Tabs (scalar) are the corpus consumers.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - part-scoped typography (`accordion.text.sizeContent`) is unclaimed —
 *     trigger/content are consumer composables;
 *   - group-level `disabled` is not lowered v1 (no corpus fact today);
 *   - a subcomponent used outside its root throws at CompositionLocal
 *     access, mirroring the swift @EnvironmentObject trap and the RN
 *     compound-context throw.
 */
function emitInteractiveComposite(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const channel = ir.behavior.normalizedChannels[0]!;
  const isUnion = (channel.valueType ?? "").includes("|");
  const valueProp = channel.valueProp;
  const defaultValueProp = channel.defaultValueProp ?? `${valueProp}Default`;
  const changeProp = channel.changeHandlerProp;
  const stateType = isUnion ? "List<String>" : "String";
  const defaultExpr = isUnion ? "emptyList()" : '""';
  const hasAria = ir.styledProps.some((p) => p.safeName === "ariaLabel");

  const partNames = new Set<string>();
  const walk = (node: NonNullable<ComponentIR["dom"]>): void => {
    if (node.part) partNames.add(node.part);
    (node.children ?? []).forEach(walk);
  };
  walk(ir.dom!);
  const triggerPart = partNames.has("tab") ? "tab" : "trigger";
  const contentPart = partNames.has("panel") ? "panel" : "content";
  const triggerName = `${name}${pascalCase(triggerPart)}`;
  const contentName = `${name}${pascalCase(contentPart)}`;
  const stateName = `${name}State`;
  const localName = `Local${name}State`;

  const bgSlot = findLayeredSlotAny(ir, ["root"], [".color.background.default", ".color.background.primary"]);
  const borderSlot = findLayeredSlotAny(ir, ["root"], [".color.border.default", ".border.color"]);
  const radiusSlot = findLayeredSlotAny(ir, ["root"], [".border.radius", ".shape.radius", ".size.radius.default"]);
  const borderWidthSlot = findLayeredSlotAny(ir, ["root"], [".border.width"]);
  const gapSlot = findTokenSlot(ir, "root", "box-model.gap");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const lines: string[] = [];
  lines.push(
    `// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`,
  );
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  if (bgSlot) lines.push(`import androidx.compose.foundation.background`);
  if (borderSlot) lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.clickable`);
  lines.push(`import androidx.compose.foundation.layout.Arrangement`);
  lines.push(`import androidx.compose.foundation.layout.Column`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.CompositionLocalProvider`);
  lines.push(`import androidx.compose.runtime.compositionLocalOf`);
  lines.push(`import androidx.compose.runtime.getValue`);
  lines.push(`import androidx.compose.runtime.mutableStateOf`);
  lines.push(`import androidx.compose.runtime.remember`);
  lines.push(`import androidx.compose.runtime.setValue`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.draw.clip`);
  lines.push(`import androidx.compose.ui.semantics.contentDescription`);
  lines.push(`import androidx.compose.ui.semantics.semantics`);
  lines.push(`import androidx.compose.ui.semantics.stateDescription`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  if (consumesTokens) lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
  if (bgSlot || borderSlot) lines.push(`import com.fullstackds.tokens.toFsdsColor`);
  if (consumesTokens) lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  if (referenceNodes(ir, "decoration").length > 0) lines.push(`import androidx.compose.ui.draw.rotate`);
  for (const line of referenceImports(ir)) lines.push(line);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`/** Channel state shared with the ${name} subcomponents (compound context). */`);
  lines.push(`class ${stateName}(`);
  lines.push(`    val value: ${stateType},`);
  if (isUnion) {
    lines.push(`    val onToggle: (String) -> Unit,`);
  } else {
    lines.push(`    val onSelect: (String) -> Unit,`);
  }
  lines.push(`)`);
  lines.push(``);
  lines.push(`val ${localName} = compositionLocalOf<${stateName}?> { null }`);
  lines.push(``);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    ${valueProp}: ${stateType}? = null,`);
  lines.push(`    ${defaultValueProp}: ${stateType} = ${defaultExpr},`);
  lines.push(`    ${changeProp}: ((${stateType}) -> Unit)? = null,`);
  if (hasAria) lines.push(`    contentDescription: String? = null,`);
  lines.push(`    content: @Composable () -> Unit,`);
  lines.push(`) {`);
  lines.push(`    var uncontrolled${pascalCase(valueProp)} by remember { mutableStateOf(${defaultValueProp}) }`);
  lines.push(`    val resolved${pascalCase(valueProp)} = ${valueProp} ?: uncontrolled${pascalCase(valueProp)}`);
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(`        val def = ${tokenConstName(ir)}["root"]?.get(slotName)`);
    lines.push(`        return def?.let { fsdsTheme.resolve(it) }`);
    lines.push(`    }`);
    if (bgSlot) lines.push(`    val containerColor = layeredSlot(${JSON.stringify(bgSlot.name)})?.toFsdsColor()`);
    if (borderSlot) lines.push(`    val borderColor = layeredSlot(${JSON.stringify(borderSlot.name)})?.toFsdsColor()`);
    if (radiusSlot) lines.push(`    val cornerRadius = layeredSlot(${JSON.stringify(radiusSlot.name)})?.toFsdsDp() ?: 0.dp`);
    if (gapSlot) lines.push(`    val gap = layeredSlot(${JSON.stringify(gapSlot.name)})?.toFsdsDp() ?: 0.dp`);
    else lines.push(`    val gap = 0.dp`);
    const side = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp` : `0.dp`;
    lines.push(
      `    val chromePadding = PaddingValues(start = ${side(paddingInlineStartSlot)}, end = ${side(paddingInlineEndSlot)}, top = ${side(paddingBlockStartSlot)}, bottom = ${side(paddingBlockEndSlot)})`,
    );
    if (minWidthSlot || minHeightSlot) {
      lines.push(`    val minWidth = ${side(minWidthSlot)}`);
      lines.push(`    val minHeight = ${side(minHeightSlot)}`);
    }
  } else {
    lines.push(`    val gap = 0.dp`);
    lines.push(`    val chromePadding = PaddingValues(0.dp)`);
    if (minWidthSlot || minHeightSlot) {
      lines.push(`    val minWidth = 0.dp`);
      lines.push(`    val minHeight = 0.dp`);
    }
  }
  lines.push(`    val shape = RoundedCornerShape(${radiusSlot ? "cornerRadius" : "0.dp"})`);
  lines.push(`    val state = remember(resolved${pascalCase(valueProp)}) {`);
  lines.push(`        ${stateName}(resolved${pascalCase(valueProp)}) { next ->`);
  if (isUnion) {
    lines.push(`            val updated = if (resolved${pascalCase(valueProp)}.contains(next)) {`);
    lines.push(`                resolved${pascalCase(valueProp)}.filter { it != next }`);
    lines.push(`            } else {`);
    lines.push(`                resolved${pascalCase(valueProp)} + next`);
    lines.push(`            }`);
  } else {
    lines.push(`            val updated = next`);
  }
  lines.push(`            if (${valueProp} == null) { uncontrolled${pascalCase(valueProp)} = updated }`);
  lines.push(`            ${changeProp}?.invoke(updated)`);
  lines.push(`        }`);
  lines.push(`    }`);
  lines.push(`    Column(`);
  lines.push(`        modifier`);
  if (minWidthSlot || minHeightSlot) {
    lines.push(`            .requiredSizeIn(minWidth = minWidth, minHeight = minHeight)`);
  }
  lines.push(`            .clip(shape)`);
  if (bgSlot) {
    lines.push(`            .then(if (containerColor != null) Modifier.background(containerColor, shape) else Modifier)`);
  }
  if (borderSlot) {
    lines.push(
      `            .then(if (borderColor != null) Modifier.border(${borderWidthSlot ? `layeredSlot(${JSON.stringify(borderWidthSlot.name)})?.toFsdsDp() ?: 1.dp` : "1.dp"}, borderColor, shape) else Modifier)`,
    );
  }
  lines.push(`            .padding(chromePadding)`);
  if (hasAria) {
    lines.push(`            .then(if (contentDescription != null) Modifier.semantics { this.contentDescription = contentDescription } else Modifier)`);
  }
  lines.push(`,`);
  lines.push(`        verticalArrangement = Arrangement.spacedBy(gap),`);
  lines.push(`    ) {`);
  lines.push(`        CompositionLocalProvider(${localName} provides state) {`);
  lines.push(`            content()`);
  lines.push(`        }`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`/** ${pascalCase(triggerPart)} subcomponent: renders the trigger and ${isUnion ? "toggles" : "selects"} its key. */`);
  lines.push(`@Composable`);
  lines.push(`fun ${triggerName}(`);
  lines.push(`    key: String,`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    content: @Composable () -> Unit,`);
  lines.push(`) {`);
  lines.push(
    `    val state = ${localName}.current ?: error("${triggerName} must be used inside ${name}")`,
  );
  lines.push(`    val selected = ${isUnion ? "state.value.contains(key)" : "state.value == key"}`);
  lines.push(`    Column(modifier.clickable { ${isUnion ? "state.onToggle(key)" : "state.onSelect(key)"} }.semantics { stateDescription = if (selected) "selected" else "not selected" }) {`);
  for (const ref of referenceNodes(ir, "decoration")) {
    lines.push(...emitComponentReference(ir, ref, "        ", [
      `Modifier.rotate(if (selected) 180f else 0f)`,
    ]));
  }
  lines.push(`        content()`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`/** ${pascalCase(contentPart)} subcomponent: renders while its key is active. */`);
  lines.push(`@Composable`);
  lines.push(`fun ${contentName}(`);
  lines.push(`    key: String,`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    content: @Composable () -> Unit,`);
  lines.push(`) {`);
  lines.push(
    `    val state = ${localName}.current ?: error("${contentName} must be used inside ${name}")`,
  );
  lines.push(`    val active = ${isUnion ? "state.value.contains(key)" : "state.value == key"}`);
  lines.push(`    if (active) {`);
  lines.push(`        Column(modifier) { content() }`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The count-iterated field-group class (FEAT-COMPOSE-OTP-ADMISSION-01):
 * the sole string channel distributes over `length` per-slot
 * BasicTextFields, each writing one character back through the channel
 * (the controlled/uncontrolled pattern); slot chrome (background/border/
 * radius/padding/minimums) and the row gap resolve from the token scopes.
 * OTP is the corpus consumer.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - the `onComplete` callback, `mode` axis (numeric/alphanumeric), and
 *     `readOnly` are not lowered v1 (the channel carries value changes;
 *     completion is derivable by the consumer);
 *   - `label`/`fieldLabel`/`ariaDescribedby` lower to a single
 *     contentDescription on the group.
 */
function emitCountFieldGroup(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const channel = ir.behavior.normalizedChannels[0]!;
  const valueProp = channel.valueProp;
  const defaultValueProp = channel.defaultValueProp ?? `${valueProp}Default`;
  const changeProp = channel.changeHandlerProp;
  const lengthProp = ir.styledProps.find((p) => p.safeName === "length");
  const defaultLength = lengthProp?.defaultExpr?.replace(/^["']|["']$/g, "") ?? "6";
  const hasDisabled = ir.styledProps.some(
    (p) => p.name === "disabled" && p.propType.kind === "boolean",
  );
  const hasAria = ir.styledProps.some((p) => p.safeName === "ariaLabel");

  const bgSlot = findLayeredSlotAny(ir, ["root"], [".color.background.default"]);
  const fgSlot = findLayeredSlotAny(ir, ["root"], [".color.foreground.primary", ".color.text.default"]);
  const borderSlot = findLayeredSlotAny(ir, ["root"], [".color.border.default"]);
  const radiusSlot = findLayeredSlotAny(ir, ["root"], [".size.radius.default"]);
  const gapSlot = findTokenSlot(ir, "root", "box-model.gap");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const lines: string[] = [];
  lines.push(
    `// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`,
  );
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  if (bgSlot) lines.push(`import androidx.compose.foundation.background`);
  if (borderSlot) lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.layout.Arrangement`);
  lines.push(`import androidx.compose.foundation.layout.Box`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.foundation.layout.Row`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.foundation.text.BasicTextField`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.getValue`);
  lines.push(`import androidx.compose.runtime.mutableStateOf`);
  lines.push(`import androidx.compose.runtime.remember`);
  lines.push(`import androidx.compose.runtime.setValue`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.semantics.contentDescription`);
  lines.push(`import androidx.compose.ui.semantics.semantics`);
  lines.push(`import androidx.compose.ui.text.TextStyle`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  if (consumesTokens) {
    lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
    if (bgSlot || fgSlot || borderSlot) lines.push(`import com.fullstackds.tokens.toFsdsColor`);
    lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    ${valueProp}: String? = null,`);
  lines.push(`    ${defaultValueProp}: String = "",`);
  lines.push(`    ${changeProp}: ((String) -> Unit)? = null,`);
  lines.push(`    length: Int = ${defaultLength},`);
  if (hasDisabled) lines.push(`    enabled: Boolean = true,`);
  if (hasAria) lines.push(`    contentDescription: String? = null,`);
  lines.push(`) {`);
  lines.push(`    var uncontrolled${pascalCase(valueProp)} by remember { mutableStateOf(${defaultValueProp}) }`);
  lines.push(`    val resolved${pascalCase(valueProp)} = ${valueProp} ?: uncontrolled${pascalCase(valueProp)}`);
  const writeValueChange = () => {
    lines.push(`                val updated = run {`);
    lines.push(`                    val chars = resolved${pascalCase(valueProp)}.padEnd(length, ' ').toCharArray()`);
    lines.push(`                    chars[index] = next.lastOrNull() ?: ' '`);
    lines.push(`                    String(chars).trimEnd()`);
    lines.push(`                }`);
    lines.push(`                if (${valueProp} == null) { uncontrolled${pascalCase(valueProp)} = updated }`);
    lines.push(`                ${changeProp}?.invoke(updated)`);
  };
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(`        val def = ${tokenConstName(ir)}["root"]?.get(slotName)`);
    lines.push(`        return def?.let { fsdsTheme.resolve(it) }`);
    lines.push(`    }`);
    if (bgSlot) lines.push(`    val fieldBg = layeredSlot(${JSON.stringify(bgSlot.name)})?.toFsdsColor()`);
    if (fgSlot) lines.push(`    val fieldText = layeredSlot(${JSON.stringify(fgSlot.name)})?.toFsdsColor()`);
    if (borderSlot) lines.push(`    val fieldBorder = layeredSlot(${JSON.stringify(borderSlot.name)})?.toFsdsColor()`);
    if (radiusSlot) lines.push(`    val fieldRadius = layeredSlot(${JSON.stringify(radiusSlot.name)})?.toFsdsDp() ?: 4.dp`);
    if (gapSlot) lines.push(`    val fieldGap = layeredSlot(${JSON.stringify(gapSlot.name)})?.toFsdsDp() ?: 0.dp`);
    else lines.push(`    val fieldGap = 0.dp`);
    const side = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp` : `0.dp`;
    lines.push(
      `    val fieldPadding = PaddingValues(start = ${side(paddingInlineStartSlot)}, end = ${side(paddingInlineEndSlot)}, top = ${side(paddingBlockStartSlot)}, bottom = ${side(paddingBlockEndSlot)})`,
    );
    if (minWidthSlot) lines.push(`    val fieldMinWidth = layeredSlot(${JSON.stringify(minWidthSlot.name)})?.toFsdsDp() ?: 0.dp`);
    if (minHeightSlot) lines.push(`    val fieldMinHeight = layeredSlot(${JSON.stringify(minHeightSlot.name)})?.toFsdsDp() ?: 0.dp`);
    lines.push(``);
  } else {
    lines.push(`    val fieldGap = 0.dp`);
    lines.push(`    val fieldPadding = PaddingValues(0.dp)`);
  }
  lines.push(`    val slotShape = RoundedCornerShape(${radiusSlot ? "fieldRadius" : "4.dp"})`);
  lines.push(`    val fieldModifier = Modifier`);
  if (minWidthSlot || minHeightSlot) {
    lines.push(`        .requiredSizeIn(minWidth = ${minWidthSlot ? "fieldMinWidth" : "0.dp"}, minHeight = ${minHeightSlot ? "fieldMinHeight" : "0.dp"})`);
  }
  lines.push(`        .padding(fieldPadding)`);
  if (bgSlot) {
    lines.push(`        .then(if (fieldBg != null) Modifier.background(fieldBg, slotShape) else Modifier)`);
  }
  if (borderSlot) {
    lines.push(`        .then(if (fieldBorder != null) Modifier.border(1.dp, fieldBorder, slotShape) else Modifier)`);
  }
  lines.push(`    Row(`);
  lines.push(`        modifier`);
  if (hasAria) {
    lines.push(`            .then(if (contentDescription != null) Modifier.semantics { this.contentDescription = contentDescription } else Modifier)`);
  }
  lines.push(`,`);
  lines.push(`        horizontalArrangement = Arrangement.spacedBy(fieldGap),`);
  lines.push(`    ) {`);
  lines.push(`        repeat(length) { index ->`);
  lines.push(`            BasicTextField(`);
  lines.push(`                value = resolved${pascalCase(valueProp)}.getOrNull(index)?.toString() ?: "",`);
  lines.push(`                onValueChange = { next ->`);
  writeValueChange();
  lines.push(`                },`);
  lines.push(`                modifier = fieldModifier,`);
  if (hasDisabled) lines.push(`                enabled = enabled,`);
  lines.push(`                singleLine = true,`);
  lines.push(`                textStyle = TextStyle(color = ${fgSlot ? "fieldText ?: Color.Unspecified" : "Color.Unspecified"}),`);
  lines.push(`            )`);
  lines.push(`        }`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The labeled text-control class (FEAT-COMPOSE-TEXTFIELD-ADMISSION-01): a
 * div-rooted control whose one string channel rides the text-control
 * pattern, wrapped in the contract's label/description/error regions. The
 * slot regions lower to optional composable parameters derived from the
 * DOM parts (structural — no component-name lore); chrome
 * (`text-field.border.*`, box-model minimums/padding/gap) resolves from
 * the token scopes. TextField is the corpus consumer.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - `type`, `name`, `required` and `ariaDescribedby` form-wiring props are
 *     not lowered v1; `invalid` gates the error region;
 *   - the error region renders only when the consumer supplies it (the
 *     contract carries a slot, not message text).
 */
function emitLabeledTextControl(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const channel = ir.behavior.normalizedChannels[0]!;
  const valueProp = channel.valueProp;
  const defaultValueProp = channel.defaultValueProp ?? `${valueProp}Default`;
  const changeProp = channel.changeHandlerProp;
  const hasInvalid = ir.styledProps.some((p) => p.name === "invalid" && p.propType.kind === "boolean");
  const hasDisabled = ir.styledProps.some((p) => p.name === "disabled" && p.propType.kind === "boolean");

  // Slot regions derive from the DOM parts that own a slot child.
  const slotParts: string[] = [];
  const walk = (node: NonNullable<ComponentIR["dom"]>): void => {
    if ((node.children ?? []).some((c) => c.tag === "slot") && node.part && node.tag !== "root") {
      if (!slotParts.includes(node.part)) slotParts.push(node.part);
    }
    (node.children ?? []).forEach(walk);
  };
  walk(ir.dom!);

  const bgSlot = findLayeredSlotAny(ir, ["root"], [".color.background.default"]);
  const fgSlot = findLayeredSlotAny(ir, ["root"], [".color.foreground.primary", ".color.text.default"]);
  const borderSlot = findLayeredSlotAny(ir, ["root"], [".color.border.default"]);
  const radiusSlot = findLayeredSlotAny(ir, ["root"], [".border.radius"]);
  const borderWidthSlot = findLayeredSlotAny(ir, ["root"], [".border.width"]);
  const gapSlot = findTokenSlot(ir, "root", "box-model.gap");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const lines: string[] = [];
  lines.push(`// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`);
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  if (bgSlot) lines.push(`import androidx.compose.foundation.background`);
  if (borderSlot) lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.layout.Arrangement`);
  lines.push(`import androidx.compose.foundation.layout.Column`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.foundation.text.BasicTextField`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.getValue`);
  lines.push(`import androidx.compose.runtime.mutableStateOf`);
  lines.push(`import androidx.compose.runtime.remember`);
  lines.push(`import androidx.compose.runtime.setValue`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.text.TextStyle`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  if (consumesTokens) {
    lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
    if (bgSlot || fgSlot || borderSlot) lines.push(`import com.fullstackds.tokens.toFsdsColor`);
    lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    ${valueProp}: String? = null,`);
  lines.push(`    ${defaultValueProp}: String = "",`);
  lines.push(`    ${changeProp}: ((String) -> Unit)? = null,`);
  for (const part of slotParts) {
    lines.push(`    ${kotlinParamName(pascalCase(part).replace(/^./, (c) => c.toLowerCase()))}: (@Composable () -> Unit)? = null,`);
  }
  if (hasInvalid) lines.push(`    invalid: Boolean = false,`);
  if (hasDisabled) lines.push(`    enabled: Boolean = true,`);
  lines.push(`) {`);
  lines.push(`    var uncontrolled${pascalCase(valueProp)} by remember { mutableStateOf(${defaultValueProp}) }`);
  lines.push(`    val resolved${pascalCase(valueProp)} = ${valueProp} ?: uncontrolled${pascalCase(valueProp)}`);
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(`        val def = ${tokenConstName(ir)}["root"]?.get(slotName)`);
    lines.push(`        return def?.let { fsdsTheme.resolve(it) }`);
    lines.push(`    }`);
    if (bgSlot) lines.push(`    val fieldBg = layeredSlot(${JSON.stringify(bgSlot.name)})?.toFsdsColor()`);
    if (fgSlot) lines.push(`    val fieldText = layeredSlot(${JSON.stringify(fgSlot.name)})?.toFsdsColor()`);
    if (borderSlot) lines.push(`    val fieldBorder = layeredSlot(${JSON.stringify(borderSlot.name)})?.toFsdsColor()`);
    if (radiusSlot) lines.push(`    val fieldRadius = layeredSlot(${JSON.stringify(radiusSlot.name)})?.toFsdsDp() ?: 4.dp`);
    if (gapSlot) lines.push(`    val fieldGap = layeredSlot(${JSON.stringify(gapSlot.name)})?.toFsdsDp() ?: 0.dp`);
    else lines.push(`    val fieldGap = 0.dp`);
    const side = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp` : `0.dp`;
    lines.push(
      `    val fieldPadding = PaddingValues(start = ${side(paddingInlineStartSlot)}, end = ${side(paddingInlineEndSlot)}, top = ${side(paddingBlockStartSlot)}, bottom = ${side(paddingBlockEndSlot)})`,
    );
    if (minWidthSlot) lines.push(`    val fieldMinWidth = layeredSlot(${JSON.stringify(minWidthSlot.name)})?.toFsdsDp() ?: 0.dp`);
    if (minHeightSlot) lines.push(`    val fieldMinHeight = layeredSlot(${JSON.stringify(minHeightSlot.name)})?.toFsdsDp() ?: 0.dp`);
    lines.push(``);
  } else {
    lines.push(`    val fieldGap = 0.dp`);
    lines.push(`    val fieldPadding = PaddingValues(0.dp)`);
  }
  lines.push(`    val slotShape = RoundedCornerShape(${radiusSlot ? "fieldRadius" : "4.dp"})`);
  lines.push(`    val inputModifier = Modifier`);
  if (minWidthSlot || minHeightSlot) {
    lines.push(`        .requiredSizeIn(minWidth = ${minWidthSlot ? "fieldMinWidth" : "0.dp"}, minHeight = ${minHeightSlot ? "fieldMinHeight" : "0.dp"})`);
  }
  lines.push(`        .padding(fieldPadding)`);
  if (bgSlot) lines.push(`        .then(if (fieldBg != null) Modifier.background(fieldBg, slotShape) else Modifier)`);
  if (borderSlot) {
    lines.push(`        .then(if (fieldBorder != null) Modifier.border(${borderWidthSlot ? `layeredSlot(${JSON.stringify(borderWidthSlot.name)})?.toFsdsDp() ?: 1.dp` : "1.dp"}, fieldBorder, slotShape) else Modifier)`);
  }
  lines.push(`    Column(`);
  lines.push(`        modifier,`);
  lines.push(`        verticalArrangement = Arrangement.spacedBy(fieldGap),`);
  lines.push(`    ) {`);
  for (const part of slotParts) {
    const param = pascalCase(part).replace(/^./, (c) => c.toLowerCase());
    const gate = part === "error" && hasInvalid ? ` if (invalid)` : "";
    lines.push(`        ${param}?.let { region ->${gate} region() }`);
  }
  lines.push(`        BasicTextField(`);
  lines.push(`            value = resolved${pascalCase(valueProp)},`);
  lines.push(`            onValueChange = { next ->`);
  lines.push(`                if (${valueProp} == null) { uncontrolled${pascalCase(valueProp)} = next }`);
  lines.push(`                ${changeProp}?.invoke(next)`);
  lines.push(`            },`);
  lines.push(`            modifier = inputModifier,`);
  if (hasDisabled) lines.push(`            enabled = enabled,`);
  lines.push(`            textStyle = TextStyle(color = ${fgSlot ? "fieldText ?: Color.Unspecified" : "Color.Unspecified"}),`);
  lines.push(`        )`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The selection-control class (FEAT-COMPOSE-SELECT-ADMISSION-01): the
 * union selection channel projects to single (`value`) and multi
 * (`values`, gated by the contract's `multiple` flag) bindings over a
 * trigger + option list; the boolean open channel drives a foundation
 * `Popup`. The option type is lowered from the contract alias, and the
 * trigger label resolves through the option list. Chrome
 * (`select.color.*`, `select.size.border.*`, `select.size.radius.*`) and
 * the box-model family resolve from the token scopes.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - `searchable`, `filterFn`, `triggerLabel`, `size` and `empty` are not
 *     lowered v1 (no search surface, fixed size treatment);
 *   - the trigger shows the selected option's label, falling back to
 *     `placeholder`;
 *   - single-select closes the popup after choosing; multi-select keeps it
 *     open (the contract's `open` channel still wins when controlled).
 */
function emitSelectionControl(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const unionChannel = ir.behavior.normalizedChannels.find((c) =>
    (c.valueType ?? "").includes("|"),
  )!;
  const openChannel = ir.behavior.normalizedChannels.find(
    (c) => c.valueType === "boolean",
  );
  const valueProp = unionChannel.valueProp;
  const defaultValueProp = unionChannel.defaultValueProp ?? `${valueProp}Default`;
  const changeProp = unionChannel.changeHandlerProp;
  const hasMultiple = ir.styledProps.some((p) => p.safeName === "multiple");
  const hasDisabled = ir.styledProps.some(
    (p) => p.name === "disabled" && p.propType.kind === "boolean",
  );
  const hasPlaceholder = ir.styledProps.some((p) => p.safeName === "placeholder");
  const hasAria = ir.styledProps.some((p) => p.safeName === "ariaLabel");

  const optionsProp = ir.styledProps.find((p) => p.safeName === "options");
  const optionsPropType = optionsProp?.propType as
    | { kind?: string; items?: { kind?: string; to?: string } }
    | undefined;
  const itemType = optionsPropType?.items?.to ?? "SelectOption";
  const alias = ir.definedTypes[itemType]?.alias ?? "";
  const members = [...alias.matchAll(/(\w+)(\?)?:\s*(string|boolean)(?=\s*[;}])/g)].map(
    (m) => ({
      name: m[1]!,
      optional: !!m[2],
      kotlin: m[3] === "string" ? "String" : "Boolean",
    }),
  );
  const valueMember = members.find((m) => !m.optional)?.name ?? "value";
  const labelMember = members.filter((m) => !m.optional)[1]?.name ?? "label";
  const disabledMember = members.find((m) => m.optional && m.kotlin === "Boolean")?.name;
  const optionsName = optionsProp?.safeName ?? "options";

  const bgSlot = findLayeredSlotAny(ir, ["root"], [".color.background.default"]);
  const fgSlot = findLayeredSlotAny(ir, ["root"], [".color.foreground.primary", ".color.text.default"]);
  const borderSlot = findLayeredSlotAny(ir, ["root"], [".color.border.default"]);
  const radiusSlot = findLayeredSlotAny(ir, ["root"], [".size.radius.default"]);
  const borderWidthSlot = findLayeredSlotAny(ir, ["root"], [".size.border.default"]);
  const gapSlot = findTokenSlot(ir, "root", "box-model.gap");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const lines: string[] = [];
  lines.push(`// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`);
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  if (bgSlot) lines.push(`import androidx.compose.foundation.background`);
  if (borderSlot) lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.clickable`);
  lines.push(`import androidx.compose.foundation.layout.Arrangement`);
  lines.push(`import androidx.compose.foundation.layout.Box`);
  lines.push(`import androidx.compose.foundation.layout.Column`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.foundation.layout.Row`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.selection.selectable`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.foundation.text.BasicText`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.getValue`);
  lines.push(`import androidx.compose.runtime.mutableStateOf`);
  lines.push(`import androidx.compose.runtime.remember`);
  lines.push(`import androidx.compose.runtime.setValue`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.draw.clip`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.semantics.Role`);
  lines.push(`import androidx.compose.ui.semantics.contentDescription`);
  lines.push(`import androidx.compose.ui.semantics.semantics`);
  lines.push(`import androidx.compose.ui.text.TextStyle`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import androidx.compose.ui.window.Popup`);
  if (consumesTokens) {
    lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
    if (bgSlot || fgSlot || borderSlot) lines.push(`import com.fullstackds.tokens.toFsdsColor`);
    lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`/** Option type lowered from the contract's ${itemType} alias. */`);
  lines.push(`data class ${itemType}(`);
  for (const m of members) {
    lines.push(`    val ${m.name}: ${m.kotlin}${m.optional ? "? = null" : ""},`);
  }
  lines.push(`)`);
  lines.push(``);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    ${optionsName}: List<${itemType}> = emptyList(),`);
  lines.push(`    ${valueProp}: String? = null,`);
  lines.push(`    ${defaultValueProp}: String = "",`);
  lines.push(`    ${changeProp}: ((String) -> Unit)? = null,`);
  if (hasMultiple) {
    lines.push(`    values: List<String>? = null,`);
    lines.push(`    defaultValues: List<String> = emptyList(),`);
    lines.push(`    onValuesChange: ((List<String>) -> Unit)? = null,`);
    lines.push(`    multiple: Boolean = false,`);
  }
  if (openChannel) {
    lines.push(`    open: Boolean? = null,`);
    lines.push(`    defaultOpen: Boolean = false,`);
    lines.push(`    onOpenChange: ((Boolean) -> Unit)? = null,`);
  }
  if (hasDisabled) lines.push(`    enabled: Boolean = true,`);
  if (hasPlaceholder) lines.push(`    placeholder: String? = null,`);
  if (hasAria) lines.push(`    contentDescription: String? = null,`);
  lines.push(`) {`);
  lines.push(`    var uncontrolled${pascalCase(valueProp)} by remember { mutableStateOf(${defaultValueProp}) }`);
  lines.push(`    val resolved${pascalCase(valueProp)} = ${valueProp} ?: uncontrolled${pascalCase(valueProp)}`);
  if (hasMultiple) {
    lines.push(`    var uncontrolledValues by remember { mutableStateOf(defaultValues) }`);
    lines.push(`    val resolvedValues = values ?: uncontrolledValues`);
  }
  if (openChannel) {
    lines.push(`    var uncontrolledOpen by remember { mutableStateOf(defaultOpen) }`);
    lines.push(`    val resolvedOpen = open ?: uncontrolledOpen`);
  }
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(`        val def = ${tokenConstName(ir)}["root"]?.get(slotName)`);
    lines.push(`        return def?.let { fsdsTheme.resolve(it) }`);
    lines.push(`    }`);
    if (bgSlot) lines.push(`    val selectBg = layeredSlot(${JSON.stringify(bgSlot.name)})?.toFsdsColor()`);
    if (fgSlot) lines.push(`    val selectText = layeredSlot(${JSON.stringify(fgSlot.name)})?.toFsdsColor()`);
    if (borderSlot) lines.push(`    val selectBorder = layeredSlot(${JSON.stringify(borderSlot.name)})?.toFsdsColor()`);
    if (radiusSlot) lines.push(`    val selectRadius = layeredSlot(${JSON.stringify(radiusSlot.name)})?.toFsdsDp() ?: 4.dp`);
    if (gapSlot) lines.push(`    val selectGap = layeredSlot(${JSON.stringify(gapSlot.name)})?.toFsdsDp() ?: 0.dp`);
    else lines.push(`    val selectGap = 0.dp`);
    const side = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp` : `0.dp`;
    lines.push(
      `    val selectPadding = PaddingValues(start = ${side(paddingInlineStartSlot)}, end = ${side(paddingInlineEndSlot)}, top = ${side(paddingBlockStartSlot)}, bottom = ${side(paddingBlockEndSlot)})`,
    );
    if (minWidthSlot) lines.push(`    val selectMinWidth = layeredSlot(${JSON.stringify(minWidthSlot.name)})?.toFsdsDp() ?: 0.dp`);
    if (minHeightSlot) lines.push(`    val selectMinHeight = layeredSlot(${JSON.stringify(minHeightSlot.name)})?.toFsdsDp() ?: 0.dp`);
    lines.push(``);
  } else {
    lines.push(`    val selectGap = 0.dp`);
    lines.push(`    val selectPadding = PaddingValues(0.dp)`);
  }
  lines.push(`    val selectShape = RoundedCornerShape(${radiusSlot ? "selectRadius" : "4.dp"})`);
  lines.push(`    val selectedLabel = selectedOptionLabel(${optionsName}${hasMultiple ? ", resolvedValues" : ""}, resolved${pascalCase(valueProp)}${hasPlaceholder ? ", placeholder" : ""})`);
  lines.push(`    val chromeModifier = Modifier`);
  if (minWidthSlot || minHeightSlot) {
    lines.push(`        .requiredSizeIn(minWidth = ${minWidthSlot ? "selectMinWidth" : "0.dp"}, minHeight = ${minHeightSlot ? "selectMinHeight" : "0.dp"})`);
  }
  lines.push(`        .clip(selectShape)`);
  if (bgSlot) lines.push(`        .then(if (selectBg != null) Modifier.background(selectBg, selectShape) else Modifier)`);
  if (borderSlot) {
    lines.push(`        .then(if (selectBorder != null) Modifier.border(${borderWidthSlot ? `layeredSlot(${JSON.stringify(borderWidthSlot.name)})?.toFsdsDp() ?: 1.dp` : "1.dp"}, selectBorder, selectShape) else Modifier)`);
  }
  lines.push(`        .padding(selectPadding)`);
  lines.push(`    Box {`);
  lines.push(`        Row(`);
  lines.push(`            modifier`);
  lines.push(`                .then(chromeModifier)`);
  if (hasDisabled) {
    lines.push(`                .clickable(enabled = enabled) {`);
  } else {
    lines.push(`                .clickable {`);
  }
  if (openChannel) {
    lines.push(`                    val next = !resolvedOpen`);
    lines.push(`                    if (open == null) { uncontrolledOpen = next }`);
    lines.push(`                    onOpenChange?.invoke(next)`);
  }
  lines.push(`                }`);
  if (hasAria) {
    lines.push(`                .semantics { if (contentDescription != null) this.contentDescription = contentDescription }`);
  }
  lines.push(`,`);
  lines.push(`        ) {`);
  lines.push(`            BasicText(text = selectedLabel, style = TextStyle(color = ${fgSlot ? "selectText ?: Color.Unspecified" : "Color.Unspecified"}))`);
  lines.push(`        }`);
  if (openChannel) {
    lines.push(`        if (resolvedOpen) {`);
    lines.push(`            Popup(onDismissRequest = {`);
    lines.push(`                if (open == null) { uncontrolledOpen = false }`);
    lines.push(`                onOpenChange?.invoke(false)`);
    lines.push(`            }) {`);
    lines.push(`                Column(verticalArrangement = Arrangement.spacedBy(selectGap)) {`);
    lines.push(`                    ${optionsName}.forEach { option ->`);
    const selectedExpr = hasMultiple
      ? `(if (multiple) resolvedValues.contains(option.` + valueMember + `) else resolved` + pascalCase(valueProp) + ` == option.` + valueMember + `)`
      : `resolved` + pascalCase(valueProp) + ` == option.` + valueMember;
    lines.push(`                        val selected = ` + selectedExpr);
    lines.push(`                        Row(`);
    lines.push(`                            Modifier.selectable(`);
    lines.push(`                                selected = selected,`);
    if (disabledMember) lines.push(`                                enabled = option.${disabledMember} != true,`);
    lines.push(`                                role = Role.RadioButton,`);
    lines.push(`                                onClick = {`);
    if (hasMultiple) {
      lines.push(`                                    if (multiple) {`);
      lines.push(`                                        val next = if (selected) resolvedValues.filter { it != option.${valueMember} } else resolvedValues + option.${valueMember}`);
      lines.push(`                                        if (values == null) { uncontrolledValues = next }`);
      lines.push(`                                        onValuesChange?.invoke(next)`);
      lines.push(`                                    } else {`);
      lines.push(`                                        if (${valueProp} == null) { uncontrolled${pascalCase(valueProp)} = option.${valueMember} }`);
      lines.push(`                                        ${changeProp}?.invoke(option.${valueMember})`);
      lines.push(`                                        if (open == null) { uncontrolledOpen = false }`);
      lines.push(`                                        onOpenChange?.invoke(false)`);
      lines.push(`                                    }`);
    } else {
      lines.push(`                                    if (${valueProp} == null) { uncontrolled${pascalCase(valueProp)} = option.${valueMember} }`);
      lines.push(`                                    ${changeProp}?.invoke(option.${valueMember})`);
      lines.push(`                                    if (open == null) { uncontrolledOpen = false }`);
      lines.push(`                                    onOpenChange?.invoke(false)`);
    }
    lines.push(`                                },`);
    lines.push(`                            ),`);
    lines.push(`                        ) {`);
    lines.push(`                            BasicText(text = option.${labelMember})`);
    lines.push(`                        }`);
    lines.push(`                    }`);
    lines.push(`                }`);
    lines.push(`            }`);
    lines.push(`        }`);
  }
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`/** Trigger label: the selected option's label, or the placeholder. */`);
  lines.push(`private fun selectedOptionLabel(`);
  lines.push(`    ${optionsName}: List<${itemType}>,`);
  if (hasMultiple) lines.push(`    values: List<String>,`);
  lines.push(`    value: String,`);
  if (hasPlaceholder) lines.push(`    placeholder: String?,`);
  lines.push(`): String {`);
  if (hasMultiple) {
    lines.push(`    val labels = values.mapNotNull { v -> ${optionsName}.firstOrNull { it.${valueMember} == v }?.${labelMember} }`);
    lines.push(`    return if (labels.isNotEmpty()) labels.joinToString(", ") else ${hasPlaceholder ? "placeholder ?: \"\"" : "\"\""}`);
  } else {
    lines.push(`    return ${optionsName}.firstOrNull { it.${valueMember} == value }?.${labelMember} ?: ${hasPlaceholder ? "placeholder ?: \"\"" : "\"\""}`);
  }
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The coachmark surface class (FEAT-COMPOSE-WALKTHROUGH-ADMISSION-01): a
 * declared surface whose anchor is selector-sourced. The decision recorded in
 * the admission criteria: a non-DOM target has no document to query, so the
 * anchor *source* degrades to a viewport-placed overlay while the contract's
 * declared `placement` prop still drives the panel's alignment — the same call
 * the SwiftUI `emitCoachmarkSurface` path already makes.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - the previous / complete / skip controls are lowered as callbacks but no
 *     control is emitted for them: the contract declares no label for those
 *     controls and this emitter does not invent control text (the same rule the
 *     calendar's nav affordances follow). The next control is the one the
 *     contract labels (`nextLabel`);
 *   - the dots strip is unclaimed: the step count comes from `steps`, a
 *     declared alias this class does not materialise, so progress is the
 *     declared `progressLabel`;
 *   - `walkthrough.surface.shadow` is a shadow string with no converter,
 *     `storageKey` / `autoStart` / `closeOnOutsideClick` are host concerns, and
 *     presence is the consumer's: the contract declares no boolean open channel,
 *     so the panel renders whenever it is composed.
 */
function emitCoachmarkSurface(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const stepChannel = ir.behavior.normalizedChannels.find((c) => c.valueType === "number")!;
  const valueProp = stepChannel.valueProp;
  const defaultValueProp = stepChannel.defaultValueProp ?? `${valueProp}Default`;
  const changeProp = stepChannel.changeHandlerProp;
  const placementProp = ir.styledProps.find(
    (p) => p.typeRefs?.some((ref) => (ir.definedTypes[ref]?.values?.length ?? 0) > 0),
  );
  const placementRef = placementProp?.typeRefs?.find(
    (ref) => (ir.definedTypes[ref]?.values?.length ?? 0) > 0,
  );
  const placementValues = placementRef ? ir.definedTypes[placementRef]!.values! : [];
  const placementEnum = placementRef ?? `${name}Placement`;
  const placementDefault =
    placementProp?.defaultExpr?.replace(/^["']|["']$/g, "") ?? placementValues[0] ?? "";
  const slots = collectDomSlots(ir.dom!);

  const surfaceBgSlot = findLayeredSlotAny(ir, ["root"], [".surface.bg", ".color.background.default"]);
  const surfaceBorderSlot = findLayeredSlotAny(ir, ["root"], [".surface.border", ".color.border.default"]);
  const surfaceRadiusSlot = findLayeredSlotAny(ir, ["root"], [".surface.radius", ".size.radius.default"]);
  const surfacePaddingSlot = findLayeredSlotAny(ir, ["root"], [".surface.padding"]);
  const titleColorSlot = findLayeredSlotAny(ir, ["root"], [".title.color"]);
  const titleSizeSlot = findLayeredSlotAny(ir, ["root"], [".title.fontSize"]);
  const titleWeightSlot = findLayeredSlotAny(ir, ["root"], [".title.fontWeight"]);
  const descriptionColorSlot = findLayeredSlotAny(ir, ["root"], [".description.color"]);
  const descriptionSizeSlot = findLayeredSlotAny(ir, ["root"], [".description.fontSize"]);
  const descriptionMarginSlot = findLayeredSlotAny(ir, ["root"], [".description.marginTop"]);
  const controlsGapSlot = findLayeredSlotAny(ir, ["root"], [".controls.gap"]);
  const controlsMarginSlot = findLayeredSlotAny(ir, ["root"], [".controls.marginTop"]);
  const primaryBgSlot = findLayeredSlotAny(ir, ["root"], [".button.primary.bg"]);
  const primaryColorSlot = findLayeredSlotAny(ir, ["root"], [".button.primary.color"]);
  const primaryRadiusSlot = findLayeredSlotAny(ir, ["root"], [".button.primary.radius"]);
  const secondaryBgSlot = findLayeredSlotAny(ir, ["root"], [".button.secondary.bg"]);
  const secondaryBorderSlot = findLayeredSlotAny(ir, ["root"], [".button.secondary.border"]);
  const secondaryRadiusSlot = findLayeredSlotAny(ir, ["root"], [".button.secondary.radius"]);
  const gapSlot = findTokenSlot(ir, "root", "box-model.gap");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const alignments = placementValues
    .map((value) => {
      const lower = value.toLowerCase();
      const alignment = lower.includes("top")
        ? "Alignment.TopCenter"
        : lower.includes("bottom")
          ? "Alignment.BottomCenter"
          : lower.includes("left") || lower.includes("start")
            ? "Alignment.CenterStart"
            : lower.includes("right") || lower.includes("end")
              ? "Alignment.CenterEnd"
              : "Alignment.Center";
      return `${placementEnum}.${kotlinEnumName(value)} -> ${alignment}`;
    })
    .join("; ");

  const lines: string[] = [];
  lines.push(`// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`);
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  lines.push(`import androidx.compose.foundation.background`);
  lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.clickable`);
  lines.push(`import androidx.compose.foundation.layout.Arrangement`);
  lines.push(`import androidx.compose.foundation.layout.Box`);
  lines.push(`import androidx.compose.foundation.layout.Column`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.foundation.layout.Row`);
  lines.push(`import androidx.compose.foundation.layout.fillMaxSize`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.foundation.text.BasicText`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.CompositionLocalProvider`);
  lines.push(`import androidx.compose.runtime.getValue`);
  lines.push(`import androidx.compose.runtime.mutableStateOf`);
  lines.push(`import androidx.compose.runtime.remember`);
  lines.push(`import androidx.compose.runtime.setValue`);
  lines.push(`import androidx.compose.ui.Alignment`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.draw.clip`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.text.TextStyle`);
  lines.push(`import androidx.compose.ui.unit.TextUnit`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsContentColor`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
  lines.push(`import com.fullstackds.tokens.toFsdsColor`);
  lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  lines.push(`import com.fullstackds.tokens.toFsdsSp`);
  lines.push(`import com.fullstackds.tokens.toFsdsWeight`);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start types`);
  if (placementRef) {
    lines.push(`/** ${placementProp!.safeName} axis lowered from the contract's ${placementRef} type. */`);
    lines.push(`enum class ${placementEnum} { ${placementValues.map(kotlinEnumName).join(", ")} }`);
    lines.push(``);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    ${valueProp}: Int? = null,`);
  lines.push(`    ${defaultValueProp}: Int = 0,`);
  lines.push(`    ${changeProp}: ((Int) -> Unit)? = null,`);
  if (placementRef) lines.push(`    ${placementProp!.safeName}: ${placementEnum} = ${placementEnum}.${kotlinEnumName(placementDefault)},`);
  for (const prop of ir.styledProps) {
    if (prop.type === "string") lines.push(`    ${prop.safeName}: String? = null,`);
  }
  if (ir.styledProps.some((p) => p.safeName === "previousDisabled")) {
    lines.push(`    previousDisabled: Boolean = false,`);
  }
  for (const callback of ir.styledProps.filter((p) => p.type === "() => void")) {
    if (callback.safeName === changeProp) continue;
    lines.push(`    ${callback.safeName}: (() -> Unit)? = null,`);
  }
  for (const slot of slots) {
    lines.push(`    ${kotlinParamName(slot)}: (@Composable () -> Unit)? = null,`);
  }
  lines.push(`) {`);
  lines.push(`    var uncontrolled${pascalCase(valueProp)} by remember { mutableStateOf(${defaultValueProp}) }`);
  lines.push(`    val resolved${pascalCase(valueProp)} = ${valueProp} ?: uncontrolled${pascalCase(valueProp)}`);
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(`        val def = ${tokenConstName(ir)}["root"]?.get(slotName)`);
    lines.push(`        return def?.let { fsdsTheme.resolve(it) }`);
    lines.push(`    }`);
    const color = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsColor()` : undefined;
    const dp = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp` : "0.dp";
    const declare = (local: string, expression: string | undefined) => {
      if (expression) lines.push(`    val ${local} = ${expression}`);
    };
    declare("coachmarkBackground", color(surfaceBgSlot));
    declare("coachmarkBorder", color(surfaceBorderSlot));
    declare("coachmarkTitleColor", color(titleColorSlot));
    declare("coachmarkDescriptionColor", color(descriptionColorSlot));
    declare("coachmarkPrimaryBackground", color(primaryBgSlot));
    declare("coachmarkPrimaryColor", color(primaryColorSlot));
    declare("coachmarkSecondaryBackground", color(secondaryBgSlot));
    declare("coachmarkSecondaryBorder", color(secondaryBorderSlot));
    lines.push(`    val coachmarkRadius = ${dp(surfaceRadiusSlot)}`);
    lines.push(`    val coachmarkGap = ${dp(gapSlot)}`);
    lines.push(`    val coachmarkMinWidth = ${dp(minWidthSlot)}`);
    lines.push(`    val coachmarkMinHeight = ${dp(minHeightSlot)}`);
    lines.push(`    val coachmarkInset = ${dp(surfacePaddingSlot)}`);
    lines.push(`    val coachmarkDescriptionTop = ${dp(descriptionMarginSlot)}`);
    lines.push(`    val coachmarkControlsGap = ${controlsGapSlot ? `layeredSlot(${JSON.stringify(controlsGapSlot.name)})?.toFsdsDp() ?: coachmarkGap` : "coachmarkGap"}`);
    lines.push(`    val coachmarkControlsTop = ${dp(controlsMarginSlot)}`);
    lines.push(`    val coachmarkPrimaryRadius = ${dp(primaryRadiusSlot)}`);
    lines.push(`    val coachmarkSecondaryRadius = ${dp(secondaryRadiusSlot)}`);
    lines.push(
      `    val coachmarkPadding = PaddingValues(start = ${dp(paddingInlineStartSlot)}, end = ${dp(paddingInlineEndSlot)}, top = ${dp(paddingBlockStartSlot)}, bottom = ${dp(paddingBlockEndSlot)})`,
    );
    const sp = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsSp() ?: TextUnit.Unspecified` : "TextUnit.Unspecified";
    declare("coachmarkTitleSize", titleSizeSlot ? sp(titleSizeSlot) : undefined);
    declare("coachmarkTitleWeight", titleWeightSlot ? `layeredSlot(${JSON.stringify(titleWeightSlot.name)})?.toFsdsWeight()` : undefined);
    declare("coachmarkDescriptionSize", descriptionSizeSlot ? sp(descriptionSizeSlot) : undefined);
  } else {
    lines.push(`    val coachmarkRadius = 0.dp`);
    lines.push(`    val coachmarkGap = 0.dp`);
    lines.push(`    val coachmarkMinWidth = 0.dp`);
    lines.push(`    val coachmarkMinHeight = 0.dp`);
    lines.push(`    val coachmarkInset = 0.dp`);
    lines.push(`    val coachmarkDescriptionTop = 0.dp`);
    lines.push(`    val coachmarkControlsGap = 0.dp`);
    lines.push(`    val coachmarkControlsTop = 0.dp`);
    lines.push(`    val coachmarkPrimaryRadius = 0.dp`);
    lines.push(`    val coachmarkSecondaryRadius = 0.dp`);
    lines.push(`    val coachmarkPadding = PaddingValues(0.dp)`);
    lines.push(`    val coachmarkTitleSize = TextUnit.Unspecified`);
    lines.push(`    val coachmarkDescriptionSize = TextUnit.Unspecified`);
  }
  lines.push(`    val coachmarkShape = RoundedCornerShape(coachmarkRadius)`);
  lines.push(`    Box(`);
  lines.push(`        modifier.fillMaxSize(),`);
  if (placementRef) {
    lines.push(`        contentAlignment = when (${placementProp!.safeName}) { ${alignments} },`);
  } else {
    lines.push(`        contentAlignment = Alignment.Center,`);
  }
  lines.push(`    ) {`);
  lines.push(`        Column(`);
  lines.push(`            Modifier`);
  lines.push(`                .requiredSizeIn(minWidth = coachmarkMinWidth, minHeight = coachmarkMinHeight)`);
  lines.push(`                .clip(coachmarkShape)`);
  lines.push(`                .then(if (coachmarkBackground != null) Modifier.background(coachmarkBackground, coachmarkShape) else Modifier)`);
  lines.push(`                .then(if (coachmarkBorder != null) Modifier.border(1.dp, coachmarkBorder, coachmarkShape) else Modifier)`);
  lines.push(`                .padding(coachmarkPadding)`);
  lines.push(`                .padding(coachmarkInset),`);
  lines.push(`            verticalArrangement = Arrangement.spacedBy(coachmarkGap),`);
  lines.push(`        ) {`);
  if (slots.includes("title")) {
    lines.push(`            CompositionLocalProvider(`);
    lines.push(`                LocalFsdsContentColor provides (${titleColorSlot ? "coachmarkTitleColor" : "null"} ?: Color.Unspecified),`);
    lines.push(`            ) { title?.invoke() }`);
  }
  if (slots.includes("description")) {
    lines.push(`            CompositionLocalProvider(`);
    lines.push(`                LocalFsdsContentColor provides (${descriptionColorSlot ? "coachmarkDescriptionColor" : "null"} ?: Color.Unspecified),`);
    lines.push(`            ) { description?.invoke() }`);
  }
  lines.push(`            if (progressLabel != null) {`);
  lines.push(`                BasicText(text = progressLabel!!, modifier = Modifier.padding(top = coachmarkDescriptionTop))`);
  lines.push(`            }`);
  lines.push(`            Row(`);
  lines.push(`                Modifier.padding(top = coachmarkControlsTop),`);
  lines.push(`                horizontalArrangement = Arrangement.spacedBy(coachmarkControlsGap),`);
  lines.push(`            ) {`);
  lines.push(`                Box(`);
  lines.push(`                    Modifier`);
  lines.push(`                        .clip(RoundedCornerShape(coachmarkSecondaryRadius))`);
  lines.push(`                        .then(if (coachmarkSecondaryBackground != null) Modifier.background(coachmarkSecondaryBackground, RoundedCornerShape(coachmarkSecondaryRadius)) else Modifier)`);
  lines.push(`                        .then(if (coachmarkSecondaryBorder != null) Modifier.border(1.dp, coachmarkSecondaryBorder, RoundedCornerShape(coachmarkSecondaryRadius)) else Modifier)`);
  lines.push(`                        .padding(coachmarkInset)`);
  lines.push(`                        .clickable(enabled = !previousDisabled) { onPrevious?.invoke() },`);
  lines.push(`                ) { }`);
  lines.push(`                Box(`);
  lines.push(`                    Modifier`);
  lines.push(`                        .clip(RoundedCornerShape(coachmarkPrimaryRadius))`);
  lines.push(`                        .then(if (coachmarkPrimaryBackground != null) Modifier.background(coachmarkPrimaryBackground, RoundedCornerShape(coachmarkPrimaryRadius)) else Modifier)`);
  lines.push(`                        .padding(coachmarkInset)`);
  lines.push(`                        .clickable { onNext?.invoke() },`);
  lines.push(`                ) {`);
  lines.push(`                    if (nextLabel != null) {`);
  lines.push(`                        BasicText(`);
  lines.push(`                            text = nextLabel!!,`);
  lines.push(`                            style = TextStyle(color = ${primaryColorSlot ? "coachmarkPrimaryColor ?: Color.Unspecified" : "Color.Unspecified"}),`);
  lines.push(`                        )`);
  lines.push(`                    }`);
  lines.push(`                }`);
  lines.push(`            }`);
  lines.push(`        }`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The centered-surface class (FEAT-COMPOSE-DIALOG-ADMISSION-01): a
 * `centered` surface lowers to the foundation `Dialog` host. The
 * contract's boolean openness channel rides the controlled/uncontrolled
 * pattern; dismissal is wired through `onDismissRequest` honouring the
 * declared dismissal affordances; the panel renders the consumer's
 * `content` with chrome (`dialog.color.*`, `dialog.size.radius`) and the
 * box-model family resolved from the token scopes. Dialog is the corpus
 * consumer.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - `size`, `initialFocus` and `returnFocus` are not lowered v1
 *     (platform-default width and focus behaviour);
 *   - `closeOnEscape`/`closeOnBackdropClick` map onto the foundation
 *     host's back-press/outside-click dismissal flags;
 *   - the panel region renders only while open (the host is not composed
 *     otherwise), matching the contract's persistent presence.
 */
/** Find every dom node carrying the given part name. */
function domNodesForPart(ir: ComponentIR, part: string) {
  const out: NonNullable<ComponentIR["dom"]>[] = [];
  const walk = (node: NonNullable<ComponentIR["dom"]>): void => {
    if (node.part === part) out.push(node);
    (node.children ?? []).forEach(walk);
  };
  if (ir.dom) walk(ir.dom);
  return out;
}

/**
 * The date-grid surface class (FEAT-COMPOSE-CALENDAR-ADMISSION-01): a
 * Date-valued channel over a header/grid anatomy whose cells project the
 * closed `dateDayOfMonth` projection. Compose realizes the declared grid
 * itself — one row per calendar week of the contract's own `days` prop, each
 * day a selectable cell — rather than delegating to a platform picker, so the
 * declared calendar chrome is actually consumed. Day-granular comparison and
 * labelling come from the committed `FsdsDate` substrate; the activation,
 * its event and its written channel come from the IR's `compositeControl`
 * fact, and the nav/grid accessible labels are the contract's own dom attrs.
 *
 * The contract declares the union's arms (`Date | Date[] | null`) and the
 * `mode` axis's members (`single | range`) as two ordered lists with no
 * explicit correspondence, so the collection arm pairs positionally with the
 * axis member at the same index. That pairing is derived at emit time and is
 * never named here: a contract that reorders the axis moves the pairing with
 * it (the emitter test flips the order and pins the member).
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - `calendar.elevation.default` is a multi-layer shadow string with no
 *     elevation converter on this target;
 *   - `calendar.focus.ring.offset` has no outward box in a fixed-size grid, so
 *     the ring is drawn inside the cell bounds;
 *   - the today ring reuses the declared focus-ring width — the contract
 *     declares no separate today-ring geometry;
 *   - the declared nav triggers render as labelled, sized affordances with no
 *     month arithmetic: the contract supplies the visible `days`, so there is
 *     no month to step;
 *   - `locale` and `shouldCloseOnSelect` are not lowered (the closed
 *     day-of-month projection is locale-independent, and the grid owns no
 *     close semantics);
 *   - `focus.strategy = "roving"` is not lowered: every day cell is a tab stop.
 */
function emitDateGridSurface(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const activation = ir.compositeControl;
  if (activation?.commit !== "activation") {
    throw new Error(
      `emitDateGridSurface: ${name} declares no activation-committed composite control`,
    );
  }
  const channel = ir.behavior.normalizedChannels.find((c) =>
    (c.valueType ?? "").includes("Date"),
  )!;
  const valueProp = channel.valueProp;
  const defaultValueProp = channel.defaultValueProp ?? `${valueProp}Default`;
  const changeProp = channel.changeHandlerProp;
  // The union's second arm is a collection, so the realized API is the
  // scalar/many pair the selection-control class established; the mode axis
  // selects which arm an activation writes.
  const manyValueProp = `${valueProp}s`;
  const manyDefaultValueProp = `${defaultValueProp}s`;
  const manyChangeProp = `on${pascalCase(manyValueProp)}Change`;

  const armKinds = (channel.valueType ?? "")
    .split("|")
    .map((arm) => arm.trim())
    .filter((arm) => arm.length > 0 && arm !== "null");
  const collectionArm = armKinds.findIndex((arm) => arm.endsWith("[]"));
  const axisProp = ir.styledProps.find((p) =>
    p.typeRefs?.some((ref) => (ir.definedTypes[ref]?.values?.length ?? 0) > 1),
  );
  const axisRef = axisProp?.typeRefs?.find(
    (ref) => (ir.definedTypes[ref]?.values?.length ?? 0) > 1,
  );
  const axisValues = axisRef ? ir.definedTypes[axisRef]!.values! : [];
  const axisEnumName = axisRef ?? `${name}Mode`;
  const manyMember =
    collectionArm >= 0 && collectionArm < axisValues.length
      ? kotlinEnumName(axisValues[collectionArm]!)
      : undefined;
  const axisDefaultValue = (
    axisProp?.defaultExpr?.replace(/^["']|["']$/g, "") ?? axisValues[0] ?? ""
  );
  const axisParam = axisProp?.safeName ?? "mode";

  const daysProp = ir.styledProps.find((p) => p.type === "Date[]");
  const captionProp = ir.styledProps.find((p) => p.safeName === "caption");
  const hasDisabled = ir.styledProps.some(
    (p) => p.name === "disabled" && p.propType.kind === "boolean",
  );
  const minDateProp = ir.styledProps.find((p) => p.safeName === "minDate");
  const maxDateProp = ir.styledProps.find((p) => p.safeName === "maxDate");

  // The header renders in the dom's own child order, so a contract that moves
  // the caption between the nav controls keeps it there. Nav labels and the
  // grid label are contract-authored accessible labels, never emitter text.
  const headerChildren = domNodesForPart(ir, "header")[0]?.children ?? [];
  const headerItems: Array<{ kind: "nav" | "caption"; label?: string }> = [];
  for (const child of headerChildren) {
    const label = child.attrs?.["aria-label"];
    if (child.part === "nav" && typeof label === "string" && label.length > 0) {
      headerItems.push({ kind: "nav", label });
    } else if (captionProp && propNameOf(child.content as { kind?: string; prop?: string } | undefined) === captionProp.safeName) {
      headerItems.push({ kind: "caption" });
    }
  }
  if (headerItems.length === 0) {
    for (const label of domNodesForPart(ir, "nav")
      .map((node) => node.attrs?.["aria-label"])
      .filter((value): value is string => typeof value === "string" && value.length > 0)) {
      headerItems.push({ kind: "nav", label });
    }
    if (captionProp) headerItems.push({ kind: "caption" });
  }
  const gridLabel = domNodesForPart(ir, "grid")[0]?.attrs?.["aria-label"];

  const bgSlot = findLayeredSlotAny(ir, ["root"], [".color.background.default"]);
  const fgSlot = findLayeredSlotAny(ir, ["root"], [".color.foreground.primary"]);
  const mutedSlot = findLayeredSlotAny(ir, ["root"], [".color.foreground.muted"]);
  const borderSlot = findLayeredSlotAny(ir, ["root"], [".color.border.default"]);
  const hoverSlot = findLayeredSlotAny(ir, ["root"], [".color.day.hover"]);
  const selectedBgSlot = findLayeredSlotAny(ir, ["root"], [".color.day.selected.background"]);
  const selectedFgSlot = findLayeredSlotAny(ir, ["root"], [".color.day.selected.foreground"]);
  const todayRingSlot = findLayeredSlotAny(ir, ["root"], [".color.today.ring"]);
  const focusRingSlot = findLayeredSlotAny(ir, ["root"], [".color.focus.ring"]);
  const ringWidthSlot = findLayeredSlotAny(ir, ["root"], [".focus.ring.width"]);
  const insetSlot = findLayeredSlotAny(ir, ["root"], [".size.padding.default"]);
  const cellSlot = findLayeredSlotAny(ir, ["root"], [".size.cell"]);
  const navSizeSlot = findLayeredSlotAny(ir, ["root"], [".size.nav"]);
  const radiusSlot = findLayeredSlotAny(ir, ["root"], [".size.radius.default"]);
  const dayRadiusSlot = findLayeredSlotAny(ir, ["root"], [".size.radius.day"]);
  const captionSizeSlot = findLayeredSlotAny(ir, ["root"], [".typography.caption.size"]);
  const daySizeSlot = findLayeredSlotAny(ir, ["root"], [".typography.day.size"]);
  const gapSlot = findTokenSlot(ir, "root", "box-model.gap");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const lines: string[] = [];
  lines.push(`// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`);
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  lines.push(`import androidx.compose.foundation.background`);
  if (borderSlot) lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.hoverable`);
  lines.push(`import androidx.compose.foundation.interaction.MutableInteractionSource`);
  lines.push(`import androidx.compose.foundation.interaction.collectIsHoveredAsState`);
  lines.push(`import androidx.compose.foundation.layout.Arrangement`);
  lines.push(`import androidx.compose.foundation.layout.Box`);
  lines.push(`import androidx.compose.foundation.layout.Column`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.foundation.layout.Row`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.layout.size`);
  lines.push(`import androidx.compose.foundation.selection.selectable`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.foundation.text.BasicText`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.getValue`);
  lines.push(`import androidx.compose.runtime.mutableStateOf`);
  lines.push(`import androidx.compose.runtime.remember`);
  lines.push(`import androidx.compose.runtime.setValue`);
  lines.push(`import androidx.compose.ui.Alignment`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.draw.clip`);
  lines.push(`import androidx.compose.ui.focus.onFocusChanged`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.semantics.Role`);
  if (gridLabel) lines.push(`import androidx.compose.ui.semantics.contentDescription`);
  if (gridLabel) lines.push(`import androidx.compose.ui.semantics.semantics`);
  lines.push(`import androidx.compose.ui.text.TextStyle`);
  lines.push(`import androidx.compose.ui.unit.TextUnit`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import com.fullstackds.date.FsdsDate`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
  if (bgSlot || fgSlot || mutedSlot || borderSlot || hoverSlot || selectedBgSlot || selectedFgSlot || todayRingSlot || focusRingSlot) {
    lines.push(`import com.fullstackds.tokens.toFsdsColor`);
  }
  lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  if (captionSizeSlot || daySizeSlot) lines.push(`import com.fullstackds.tokens.toFsdsSp`);
  lines.push(`import java.util.Date`);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start types`);
  if (axisRef) {
    lines.push(`/** ${axisParam} axis lowered from the contract's ${axisRef} type. */`);
    lines.push(`enum class ${axisEnumName} { ${axisValues.map(kotlinEnumName).join(", ")} }`);
    lines.push(``);
  }
  lines.push(`/** Days per grid row. The contract declares no week-length axis, so the`);
  lines.push(` *  conventional calendar week is the emitter's framework-grammar constant. */`);
  lines.push(`private const val fsdsWeekLength = 7`);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    ${valueProp}: Date? = null,`);
  lines.push(`    ${defaultValueProp}: Date? = null,`);
  lines.push(`    ${changeProp}: ((Date?) -> Unit)? = null,`);
  lines.push(`    ${manyValueProp}: List<Date>? = null,`);
  lines.push(`    ${manyDefaultValueProp}: List<Date> = emptyList(),`);
  lines.push(`    ${manyChangeProp}: ((List<Date>) -> Unit)? = null,`);
  if (axisRef) lines.push(`    ${axisParam}: ${axisEnumName} = ${axisEnumName}.${kotlinEnumName(axisDefaultValue)},`);
  if (daysProp) lines.push(`    ${daysProp.safeName}: List<Date> = emptyList(),`);
  if (captionProp) {
    const captionDefault = captionProp.defaultExpr?.replace(/^["']|["']$/g, "") ?? "";
    lines.push(`    ${captionProp.safeName}: String = ${JSON.stringify(captionDefault)},`);
  }
  if (hasDisabled) lines.push(`    disabled: Boolean = false,`);
  if (minDateProp) lines.push(`    ${minDateProp.safeName}: Date? = null,`);
  if (maxDateProp) lines.push(`    ${maxDateProp.safeName}: Date? = null,`);
  lines.push(`) {`);
  lines.push(`    var uncontrolled${pascalCase(valueProp)} by remember { mutableStateOf(${defaultValueProp}) }`);
  lines.push(`    val resolved${pascalCase(valueProp)} = ${valueProp} ?: uncontrolled${pascalCase(valueProp)}`);
  lines.push(`    var uncontrolled${pascalCase(manyValueProp)} by remember { mutableStateOf(${manyDefaultValueProp}) }`);
  lines.push(`    val resolved${pascalCase(manyValueProp)} = ${manyValueProp} ?: uncontrolled${pascalCase(manyValueProp)}`);
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(`        val def = ${tokenConstName(ir)}["root"]?.get(slotName)`);
    lines.push(`        return def?.let { fsdsTheme.resolve(it) }`);
    lines.push(`    }`);
    const color = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsColor()` : undefined;
    const dp = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp` : "0.dp";
    const sp = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsSp() ?: TextUnit.Unspecified` : "TextUnit.Unspecified";
    const declare = (local: string, expression: string | undefined) => {
      if (expression) lines.push(`    val ${local} = ${expression}`);
    };
    declare("gridBackground", color(bgSlot));
    declare("gridForeground", color(fgSlot));
    declare("gridMuted", color(mutedSlot));
    declare("gridBorder", color(borderSlot));
    declare("dayHover", color(hoverSlot));
    declare("daySelectedBackground", color(selectedBgSlot));
    declare("daySelectedForeground", color(selectedFgSlot));
    declare("todayRing", color(todayRingSlot));
    declare("focusRing", color(focusRingSlot));
    lines.push(`    val gridRadius = ${radiusSlot ? `layeredSlot(${JSON.stringify(radiusSlot.name)})?.toFsdsDp() ?: 0.dp` : "0.dp"}`);
    lines.push(`    val dayRadius = ${dayRadiusSlot ? `layeredSlot(${JSON.stringify(dayRadiusSlot.name)})?.toFsdsDp() ?: 0.dp` : "0.dp"}`);
    lines.push(`    val cellSize = ${dp(cellSlot)}`);
    lines.push(`    val navSize = ${dp(navSizeSlot)}`);
    lines.push(`    val ringWidth = ${dp(ringWidthSlot)}`);
    lines.push(`    val gridGap = ${dp(gapSlot)}`);
    lines.push(`    val gridInset = ${dp(insetSlot)}`);
    lines.push(`    val gridMinWidth = ${dp(minWidthSlot)}`);
    lines.push(`    val gridMinHeight = ${dp(minHeightSlot)}`);
    const side = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp` : `0.dp`;
    lines.push(
      `    val gridPadding = PaddingValues(start = ${side(paddingInlineStartSlot)}, end = ${side(paddingInlineEndSlot)}, top = ${side(paddingBlockStartSlot)}, bottom = ${side(paddingBlockEndSlot)})`,
    );
    declare("captionSize", sp(captionSizeSlot));
    declare("daySize", sp(daySizeSlot));
  } else {
    lines.push(`    val gridRadius = 0.dp`);
    lines.push(`    val dayRadius = 0.dp`);
    lines.push(`    val cellSize = 0.dp`);
    lines.push(`    val navSize = 0.dp`);
    lines.push(`    val ringWidth = 0.dp`);
    lines.push(`    val gridGap = 0.dp`);
    lines.push(`    val gridInset = 0.dp`);
    lines.push(`    val gridMinWidth = 0.dp`);
    lines.push(`    val gridMinHeight = 0.dp`);
    lines.push(`    val gridPadding = PaddingValues(0.dp)`);
    lines.push(`    val captionSize = TextUnit.Unspecified`);
    lines.push(`    val daySize = TextUnit.Unspecified`);
  }
  lines.push(`    val gridShape = RoundedCornerShape(gridRadius)`);
  lines.push(`    val dayShape = RoundedCornerShape(dayRadius)`);
  lines.push(``);
  lines.push(`    Column(`);
  lines.push(`        modifier`);
  lines.push(`            .requiredSizeIn(minWidth = gridMinWidth, minHeight = gridMinHeight)`);
  lines.push(`            .clip(gridShape)`);
  if (bgSlot) lines.push(`            .then(if (gridBackground != null) Modifier.background(gridBackground, gridShape) else Modifier)`);
  if (borderSlot) lines.push(`            .then(if (gridBorder != null) Modifier.border(1.dp, gridBorder, gridShape) else Modifier)`);
  lines.push(`            .padding(PaddingValues(gridInset))`);
  lines.push(`,`);
  lines.push(`        verticalArrangement = Arrangement.spacedBy(gridGap),`);
  lines.push(`    ) {`);
  lines.push(`        Row(`);
  lines.push(`            horizontalArrangement = Arrangement.spacedBy(gridGap),`);
  lines.push(`            verticalAlignment = Alignment.CenterVertically,`);
  lines.push(`        ) {`);
  for (const item of headerItems) {
    if (item.kind === "nav") {
      lines.push(`            Box(`);
      lines.push(`                Modifier`);
      lines.push(`                    .size(navSize)`);
      lines.push(`                    .semantics { contentDescription = ${JSON.stringify(item.label)} },`);
      lines.push(`                contentAlignment = Alignment.Center,`);
      lines.push(`            ) { }`);
    } else {
      lines.push(`            BasicText(`);
      lines.push(`                text = ${captionProp!.safeName},`);
      lines.push(`                style = TextStyle(color = ${fgSlot ? "gridForeground ?: Color.Unspecified" : "Color.Unspecified"}, fontSize = captionSize),`);
      lines.push(`            )`);
    }
  }
  lines.push(`        }`);
  lines.push(`        Column(`);
  lines.push(`            Modifier${gridLabel ? `.semantics { contentDescription = ${JSON.stringify(gridLabel)} }` : ""}.padding(gridPadding),`);
  lines.push(`        ) {`);
  lines.push(`            ${daysProp ? daysProp.safeName : "days"}.chunked(fsdsWeekLength).forEach { week ->`);
  lines.push(`                Row(horizontalArrangement = Arrangement.spacedBy(gridGap)) {`);
  lines.push(`                    week.forEach { item ->`);
  lines.push(`                        val selected = ${manyMember ? `if (${axisParam} == ${axisEnumName}.${manyMember}) FsdsDate.isSameDayAsAny(item, resolved${pascalCase(manyValueProp)}) else FsdsDate.isSameDay(item, resolved${pascalCase(valueProp)})` : `FsdsDate.isSameDay(item, resolved${pascalCase(valueProp)})`}`);
  lines.push(`                        val dayEnabled = ${hasDisabled ? "!disabled" : "true"} && !FsdsDate.isBefore(item, ${minDateProp ? minDateProp.safeName : "null"}) && !FsdsDate.isAfter(item, ${maxDateProp ? maxDateProp.safeName : "null"})`);
  lines.push(`                        val interactionSource = remember { MutableInteractionSource() }`);
  lines.push(`                        val hovered by interactionSource.collectIsHoveredAsState()`);
  lines.push(`                        var focused by remember { mutableStateOf(false) }`);
  lines.push(`                        val dayBackground = when {`);
  lines.push(`                            selected -> ${selectedBgSlot ? "daySelectedBackground" : "null"}`);
  lines.push(`                            hovered && dayEnabled -> ${hoverSlot ? "dayHover" : "null"}`);
  lines.push(`                            else -> null`);
  lines.push(`                        }`);
  lines.push(`                        val dayRing = when {`);
  lines.push(`                            focused -> ${focusRingSlot ? "focusRing" : "null"}`);
  lines.push(`                            FsdsDate.isToday(item) && !selected -> ${todayRingSlot ? "todayRing" : "null"}`);
  lines.push(`                            else -> null`);
  lines.push(`                        }`);
  lines.push(`                        Box(`);
  lines.push(`                            Modifier`);
  lines.push(`                                .size(cellSize)`);
  lines.push(`                                .clip(dayShape)`);
  lines.push(`                                .then(if (dayBackground != null) Modifier.background(dayBackground, dayShape) else Modifier)`);
  lines.push(`                                .hoverable(interactionSource, enabled = dayEnabled)`);
  lines.push(`                                .selectable(`);
  lines.push(`                                    selected = selected,`);
  lines.push(`                                    enabled = dayEnabled,`);
  lines.push(`                                    role = Role.Button,`);
  lines.push(`                                    onClick = {`);
  if (manyMember) {
    lines.push(`                                        if (${axisParam} == ${axisEnumName}.${manyMember}) {`);
    lines.push(`                                            val next = FsdsDate.toggle(resolved${pascalCase(manyValueProp)}, item)`);
    lines.push(`                                            if (${manyValueProp} == null) { uncontrolled${pascalCase(manyValueProp)} = next }`);
    lines.push(`                                            ${manyChangeProp}?.invoke(next)`);
    lines.push(`                                        } else {`);
    lines.push(`                                            if (${valueProp} == null) { uncontrolled${pascalCase(valueProp)} = item }`);
    lines.push(`                                            ${changeProp}?.invoke(item)`);
    lines.push(`                                        }`);
  } else {
    lines.push(`                                        if (${valueProp} == null) { uncontrolled${pascalCase(valueProp)} = item }`);
    lines.push(`                                        ${changeProp}?.invoke(item)`);
  }
  lines.push(`                                    },`);
  lines.push(`                                )`);
  lines.push(`                                .onFocusChanged { focused = it.isFocused }`);
  lines.push(`                                .then(if (dayRing != null && ringWidth > 0.dp) Modifier.border(ringWidth, dayRing, dayShape) else Modifier),`);
  lines.push(`                            contentAlignment = Alignment.Center,`);
  lines.push(`                        ) {`);
  lines.push(`                            BasicText(`);
  lines.push(`                                text = FsdsDate.dayOfMonth(item).toString(),`);
  lines.push(`                                style = TextStyle(color = ${selectedFgSlot ? `(if (selected) daySelectedForeground ?: gridForeground else gridForeground) ?: Color.Unspecified` : `${fgSlot ? "gridForeground" : "null"} ?: Color.Unspecified`}, fontSize = daySize),`);
  lines.push(`                            )`);
  lines.push(`                        }`);
  lines.push(`                    }`);
  lines.push(`                }`);
  lines.push(`            }`);
  lines.push(`        }`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * Component-reference lowering (FEAT-COMPOSE-REFERENCE-REALIZATION-01): lower
 * a dom node that declares `componentRef` to a call on the referenced
 * generated composable. The call is assembled from the node's own IR facts
 * through one declared fact vocabulary; a fact outside that vocabulary fails
 * loudly at emit time, so a declared reference is never silently dropped and
 * never silently mis-argued.
 *
 * The vocabulary (every entry is a decision, not a default):
 *   attrs.name / bindings.name   -> `name` (a `valueMap` binding lowers to an
 *                                   exhaustive `when` over the source prop, and
 *                                   an incomplete map is an emit-time error)
 *   attrs.size                   -> `size = <Ref>Size.<Member>`
 *   attrs.variant                -> `variant = <Ref>Variant.<Member>`
 *   attrs["aria-label"]          -> `accessibilityLabel`
 *   attrs.disabled               -> `disabled`
 *   bindings.ariaLabel           -> `accessibilityLabel`
 *   bindings.disabled            -> `disabled`
 *   events.click                 -> `onClick = { <prop>?.invoke() }`
 *   children (role `trigger`)    -> `content = { ... }` (empty when the node
 *                                   projects nothing, because a composite
 *                                   control's content parameter is required)
 *   bindings.ariaHidden          -> `Modifier.clearAndSetSemantics { }`
 *   bindings.inline              -> structural: composing inline is the default
 *   attrs.type                   -> structural: HTML form authoring only
 *   bindings.ariaExpanded / ariaPressed
 *                                -> structural: the referenced control exposes
 *                                   no state-semantics parameter. Named here so
 *                                   the drop is a decision; ledgered in
 *                                   docs/architecture/native-target-admission.md.
 *   ifProp                       -> the call is wrapped in that guard
 */
interface ReferenceArgumentOverride {
  /** The callee's parameter name. */
  parameter: string;
  /** The Kotlin expression the caller supplies. */
  expression: string;
}

interface ReferenceCallFacts {
  reference: string;
  arguments: string[];
  modifiers: string[];
  body: string[];
  /** A composite control's content parameter is required, so a trigger
   *  reference always passes a body — empty when it projects nothing. */
  bodyRequired: boolean;
  guard?: { prop: string; negated: boolean; boolean: boolean };
}

function referenceBindingExpr(expression: unknown): string {
  if (!expression || typeof expression !== "object") {
    throw new Error("component reference binding is not an expression");
  }
  const binding = expression as { kind?: string; prop?: string; path?: string[] };
  if (binding.kind === "literal") {
    const literal = expression as { value?: string };
    if (typeof literal.value !== "string") {
      throw new Error("component reference literal binding has no string value");
    }
    return JSON.stringify(literal.value);
  }
  if (binding.kind !== "prop" || !binding.prop) {
    throw new Error(
      `component reference binding kind "${binding.kind ?? "(none)"}" has no parameter mapping`,
    );
  }
  const base = kotlinParamName(binding.prop);
  return (binding.path ?? []).reduce((acc, segment) => `${acc}.${segment}`, base);
}

/** Render a referenced node's projected children, or its required empty body. */
function referenceBodyLines(ir: ComponentIR, node: DomNodeIR, indent: string): string[] {
  const lines: string[] = [];
  const emitContent = (child: DomNodeIR): void => {
    if (child.tag === "children") {
      lines.push(`${indent}content()`);
      return;
    }
    if (child.content && typeof child.content === "object") {
      const content = child.content as { kind?: string; prop?: string };
      if (content.kind === "prop" && content.prop) {
        const prop = ir.styledProps.find((p) => p.safeName === content.prop);
        if (prop?.type === "ReactNode") {
          lines.push(`${indent}${kotlinParamName(content.prop)}?.invoke()`);
          return;
        }
        if (prop?.type === "string") {
          lines.push(
            `${indent}BasicText(text = ${kotlinParamName(content.prop)}, style = TextStyle(color = LocalFsdsContentColor.current))`,
          );
          return;
        }
      }
    }
    const nested = child.children ?? [];
    if (nested.some((c) => c.tag === "children")) {
      nested.forEach(emitContent);
      return;
    }
    throw new Error(
      `component reference content node <${child.tag || "ref"}> has no mapped lowering`,
    );
  };
  (node.children ?? []).forEach(emitContent);
  return lines;
}

function referenceCallFacts(
  ir: ComponentIR,
  node: DomNodeIR,
  indent: string,
  argumentOverrides: Record<string, ReferenceArgumentOverride> = {},
): ReferenceCallFacts {
  const reference = node.componentRef;
  if (!reference) throw new Error("referenceCallFacts requires a componentRef node");
  const facts: ReferenceCallFacts = {
    reference,
    arguments: [],
    modifiers: [],
    body: [],
    bodyRequired: false,
  };

  const enumArgument = (parameter: string, suffix: string, member: string): string =>
    `${parameter} = ${reference}${suffix}.${kotlinEnumName(member)}`;

  for (const [attr, value] of Object.entries(node.attrs ?? {})) {
    if (attr === "name") facts.arguments.push(`name = ${JSON.stringify(value)}`);
    else if (attr === "size") facts.arguments.push(enumArgument("size", "Size", value));
    else if (attr === "variant") facts.arguments.push(enumArgument("variant", "Variant", value));
    else if (attr === "aria-label") facts.arguments.push(`accessibilityLabel = ${JSON.stringify(value)}`);
    else if (attr === "disabled") facts.arguments.push(`disabled = ${value === "true"}`);
    // HTML form authoring: `type` selects submit/reset browser behavior, which
    // no native target has. Structural, never an argument.
    else if (attr === "type") continue;
    else throw new Error(`component reference attr "${attr}" has no parameter mapping`);
  }

  for (const [binding, expression] of Object.entries(node.bindings ?? {})) {
    const override = argumentOverrides[binding];
    if (override) {
      // The contract's prop exists; the callee cannot take it. The caller
      // supplies the substitute, so the declared prop is realised as the
      // expression rather than dropped.
      facts.arguments.push(`${override.parameter} = ${override.expression}`);
      continue;
    }
    if (binding === "name") {
      const map = expression as {
        kind?: string;
        source?: { kind?: string; prop?: string };
        values?: Record<string, string>;
      };
      if (map.kind !== "valueMap" || !map.source?.prop || !map.values) {
        throw new Error('component reference `name` binding is not a prop valueMap');
      }
      const axisProp = ir.styledProps.find((p) => p.safeName === map.source!.prop);
      const declaredType = axisProp?.typeRefs?.find(
        (ref) => (ir.definedTypes[ref]?.values?.length ?? 0) > 0,
      );
      // The emitter names a variant axis enum `<Component><Axis>`, which the
      // contract's declared type name need not match.
      const axisType = axisProp ? `${ir.name}${pascalCase(axisProp.safeName)}` : declaredType;
      const axisValues = declaredType ? ir.definedTypes[declaredType]!.values! : [];
      const missing = axisValues.filter((value) => !(value in map.values!));
      if (missing.length > 0) {
        throw new Error(
          `component reference \`name\` map omits axis value(s) ${missing.join(", ")}`,
        );
      }
      const pad = `${indent}    `;
      const arms = axisValues.map(
        (value) => `${pad}${axisType}.${kotlinEnumName(value)} -> ${JSON.stringify(map.values![value])}`,
      );
      facts.arguments.push(
        `name = when (${kotlinParamName(map.source.prop)}) {\n${arms.join("\n")}\n${indent}}`,
      );
    } else if (binding === "ariaLabel") {
      facts.arguments.push(`accessibilityLabel = ${referenceBindingExpr(expression)}`);
    } else if (binding === "disabled") {
      facts.arguments.push(`disabled = ${referenceBindingExpr(expression)}`);
    } else if (binding === "ariaHidden") {
      facts.modifiers.push("Modifier.clearAndSetSemantics { }");
    } else if (binding === "ariaExpanded" || binding === "ariaPressed") {
      // Named, not silent: the referenced control exposes no state-semantics
      // parameter. Ledgered in the admission criteria.
      continue;
    } else if (binding === "inline") {
      continue;
    } else if (binding === "type") {
      // HTML form authoring (`button`/`submit`/`reset`), as in attrs.
      continue;
    } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(binding)) {
      // The default rule: a binding maps to the same-named callee parameter.
      // The cases above are the exceptions (ariaLabel -> accessibilityLabel,
      // HTML-only facts, state bindings the callee cannot take).
      facts.arguments.push(`${binding} = ${referenceBindingExpr(expression)}`);
    } else {
      throw new Error(`component reference binding "${binding}" has no parameter mapping`);
    }
  }

  const click = node.events?.click;
  if (click) facts.arguments.push(`onClick = { ${referenceBindingExpr(click)}?.invoke() }`);

  // A composite control's content parameter is required, so a trigger
  // reference always receives a body — empty when it projects nothing.
  const isTrigger = (ir.parts.find((p) => p.name === node.part)?.details?.role) === "trigger";
  facts.bodyRequired = isTrigger;
  if (isTrigger) facts.body = referenceBodyLines(ir, node, `${indent}    `);

  if (node.ifProp) {
    // A boolean prop is the guard; anything else can only be checked for
    // existence, which is how a nullable string gate reads.
    const guardProp = ir.styledProps.find((p) => p.safeName === node.ifProp);
    const boolean = guardProp?.type === "boolean";
    facts.guard = {
      prop: kotlinParamName(node.ifProp),
      negated: node.ifNegated,
      boolean,
    };
  }
  return facts;
}

/** Render one reference call at `indent`, wrapped in its declared guard. */
function emitComponentReference(ir: ComponentIR, node: DomNodeIR, indent: string,
  extraModifiers: string[] = [],
  argumentOverrides: Record<string, ReferenceArgumentOverride> = {},
): string[] {
  const facts = referenceCallFacts(ir, node, indent, argumentOverrides);
  const lines: string[] = [];
  const inner = facts.guard ? `${indent}    ` : indent;
  if (facts.guard) {
    const check = facts.guard.boolean
      ? `${facts.guard.negated ? "!" : ""}${facts.guard.prop}`
      : `${facts.guard.prop} ${facts.guard.negated ? "==" : "!="} null`;
    lines.push(`${indent}if (${check}) {`);
  }
  const args = [...facts.arguments];
  facts.modifiers.push(...extraModifiers);
  if (facts.modifiers.length > 0) {
    const chain = facts.modifiers.map((m) => m.replace(/^Modifier\./, "")).join(".");
    args.push(`modifier = Modifier.${chain}`);
  }
  lines.push(`${inner}${facts.reference}(`);
  for (const argument of args) lines.push(`${inner}    ${argument},`);
  if (facts.bodyRequired) {
    lines.push(`${inner}) {`);
    lines.push(...facts.body);
    lines.push(`${inner}}`);
  } else {
    lines.push(`${inner})`);
  }
  if (facts.guard) lines.push(`${indent}}`);
  return lines;
}


/** Props a reference binds or handles, declared as parameters from the
 *  contract's own defaults; a binding with no declaration fails loudly. */
function referenceParameterLines(ir: ComponentIR, node: DomNodeIR): string[] {
  const names = new Set<string>();
  // The render guard is a parameter too: the call is wrapped in it.
  if (node.ifProp) names.add(node.ifProp);
  for (const expression of [...Object.values(node.bindings ?? {}), ...Object.values(node.events ?? {})]) {
    const binding = expression as { kind?: string; prop?: string };
    if (binding.kind === "prop" && binding.prop) names.add(binding.prop);
  }
  const lines: string[] = [];
  for (const name of names) {
    const prop = ir.styledProps.find((p) => p.safeName === name);
    if (!prop) throw new Error(`reference bound prop "${name}" is not declared on ${ir.name}`);
    if (prop.type.startsWith("(")) lines.push(`    ${kotlinParamName(name)}: (() -> Unit)? = null,`);
    else if (prop.type === "boolean") lines.push(`    ${kotlinParamName(name)}: Boolean = ${prop.defaultExpr ?? "false"},`);
    else if (prop.defaultExpr) lines.push(`    ${kotlinParamName(name)}: String = ${JSON.stringify(prop.defaultExpr.replace(/^["']|["']$/g, ""))},`);
    else lines.push(`    ${kotlinParamName(name)}: String? = null,`);
  }
  return lines;
}

/** Referenced parts of a kind, in dom order. */
function referenceNodes(ir: ComponentIR, role: string) {
  const out: DomNodeIR[] = [];
  const walk = (node: DomNodeIR): void => {
    const part = ir.parts.find((p) => p.name === node.part);
    if (node.componentRef && part?.details?.role === role) out.push(node);
    (node.children ?? []).forEach(walk);
  };
  if (ir.dom) walk(ir.dom);
  return out;
}

/** Import lines for every referenced component: its generated package, plus
 *  the axis enums the call names. The enum type for an axis is the emitter's
 *  own convention (`<Ref>Variant`, `<Ref>Size`), which is what makes a
 *  cross-component call expressible without the callee's signature. */
function referenceImports(ir: ComponentIR): string[] {
  const refs = new Map<string, Set<string>>();
  const walk = (node: DomNodeIR): void => {
    if (node.componentRef) {
      const types = refs.get(node.componentRef) ?? new Set<string>();
      if (node.attrs?.variant) types.add(`${node.componentRef}Variant`);
      if (node.attrs?.size) types.add(`${node.componentRef}Size`);
      refs.set(node.componentRef, types);
    }
    (node.children ?? []).forEach(walk);
  };
  if (ir.dom) walk(ir.dom);
  const lines: string[] = [];
  // JSON.stringify puts no space before a key, so the boundary must not be
  // anchored on whitespace.
  if (ir.dom && JSON.stringify(ir.dom).includes('"ariaHidden"')) {
    lines.push(`import androidx.compose.ui.semantics.clearAndSetSemantics`);
  }
  for (const ref of [...refs.keys()].sort()) {
    lines.push(`import com.fullstackds.components.${packageSegment(ref)}.${ref}`);
    for (const type of [...refs.get(ref)!].sort()) {
      lines.push(`import com.fullstackds.components.${packageSegment(ref)}.${type}`);
    }
  }
  return lines;
}

/**
 * The compound-part composer class (FEAT-COMPOSE-CARD-ADMISSION-01): a root
 * that declares no dom of its own and a set of compound parts, so the part
 * vocabulary *is* the structure. Card is the corpus consumer. Compose lowers
 * the root chrome and emits one scope composable per declared part, so a
 * consumer composes the declared regions instead of arbitrary markup. No part
 * name is written here — the signatures come from the anatomy.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - the parts carry only their own modifier: with no dom and no part-scoped
 *     slots beyond description/link/note, there is no declared geometry to
 *     apply inside a part, and the part-scoped scopes are unread;
 *   - `card.elevation.resting` / `card.elevation.raised` are shadow strings
 *     with no elevation converter; `card.color.focus.ring`,
 *     `card.focus.ring.width` / `.offset` need focus interaction state the
 *     root does not keep; `card.color.background.hover` needs hover state;
 *     `card.size.gap.default` / `card.size.padding.default` / `.inset` and
 *     `card.typography.lineHeight.*` lose to the merged box-model padding pool
 *     and the content text style, as in every other class.
 */
function emitCompoundPartComposer(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const parts = ir.compoundParts.map((part) => part.name);
  const axisProp = ir.styledProps.find((p) =>
    p.typeRefs?.some((ref) => (ir.definedTypes[ref]?.values?.length ?? 0) > 0),
  );
  const axisRef = axisProp?.typeRefs?.find(
    (ref) => (ir.definedTypes[ref]?.values?.length ?? 0) > 0,
  );
  const axisValues = axisRef ? ir.definedTypes[axisRef]!.values! : [];
  const axisEnum = axisRef ?? `${name}Density`;
  const axisDefault = axisProp?.defaultExpr?.replace(/^["']|["']$/g, "") ?? axisValues[0] ?? "";

  const bgSlot = findLayeredSlotAny(ir, ["root"], [".color.background.default"]);
  const fgSlot = findLayeredSlotAny(ir, ["root"], [".color.foreground.primary"]);
  const borderSlot = findLayeredSlotAny(ir, ["root"], [".color.border.default"]);
  const radiusSlot = findLayeredSlotAny(ir, ["root"], [".size.radius.default"]);
  const gapSlot = findTokenSlot(ir, "root", "box-model.gap");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const lines: string[] = [];
  lines.push(`// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`);
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  lines.push(`import androidx.compose.foundation.background`);
  lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.layout.Arrangement`);
  lines.push(`import androidx.compose.foundation.layout.Column`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.CompositionLocalProvider`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.draw.clip`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsContentColor`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
  lines.push(`import com.fullstackds.tokens.toFsdsColor`);
  lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start types`);
  if (axisRef) {
    lines.push(`/** ${axisProp!.safeName} axis lowered from the contract's ${axisRef} type. */`);
    lines.push(`enum class ${axisEnum} { ${axisValues.map(kotlinEnumName).join(", ")} }`);
    lines.push(``);
  }
  lines.push(`/** The declared part vocabulary, in anatomy order. */`);
  lines.push(`interface ${name}Scope`);
  lines.push(``);
  lines.push(`private object ${name}ScopeImpl : ${name}Scope`);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  if (axisRef) {
    lines.push(`    ${axisProp!.safeName}: ${axisEnum} = ${axisEnum}.${kotlinEnumName(axisDefault)},`);
  }
  lines.push(`    content: @Composable ${name}Scope.() -> Unit,`);
  lines.push(`) {`);
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(
      `        for (key in listOf(${[...(axisRef ? [`"variant_" + ${axisProp!.safeName}.name.lowercase()`] : []), '"root"'].join(", ")})) {`,
    );
    lines.push(`            val def = ${tokenConstName(ir)}[key]?.get(slotName)`);
    lines.push(`            if (def != null) return fsdsTheme.resolve(def)`);
    lines.push(`        }`);
    lines.push(`        return null`);
    lines.push(`    }`);
    const color = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsColor()` : undefined;
    const dp = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp` : "0.dp";
    const declare = (local: string, expression: string | undefined) => {
      if (expression) lines.push(`    val ${local} = ${expression}`);
    };
    declare("cardBackground", color(bgSlot));
    declare("cardForeground", color(fgSlot));
    declare("cardBorder", color(borderSlot));
    lines.push(`    val cardRadius = ${dp(radiusSlot)}`);
    lines.push(`    val cardGap = ${dp(gapSlot)}`);
    lines.push(`    val cardMinWidth = ${dp(minWidthSlot)}`);
    lines.push(`    val cardMinHeight = ${dp(minHeightSlot)}`);
    lines.push(
      `    val cardPadding = PaddingValues(start = ${dp(paddingInlineStartSlot)}, end = ${dp(paddingInlineEndSlot)}, top = ${dp(paddingBlockStartSlot)}, bottom = ${dp(paddingBlockEndSlot)})`,
    );
  } else {
    lines.push(`    val cardRadius = 0.dp`);
    lines.push(`    val cardGap = 0.dp`);
    lines.push(`    val cardMinWidth = 0.dp`);
    lines.push(`    val cardMinHeight = 0.dp`);
    lines.push(`    val cardPadding = PaddingValues(0.dp)`);
  }
  lines.push(`    val cardShape = RoundedCornerShape(cardRadius)`);
  lines.push(`    Column(`);
  lines.push(`        modifier`);
  lines.push(`            .requiredSizeIn(minWidth = cardMinWidth, minHeight = cardMinHeight)`);
  lines.push(`            .clip(cardShape)`);
  lines.push(`            .then(if (cardBackground != null) Modifier.background(cardBackground, cardShape) else Modifier)`);
  lines.push(`            .then(if (cardBorder != null) Modifier.border(1.dp, cardBorder, cardShape) else Modifier)`);
  lines.push(`            .padding(cardPadding),`);
  lines.push(`        verticalArrangement = Arrangement.spacedBy(cardGap),`);
  lines.push(`    ) {`);
  lines.push(`        CompositionLocalProvider(LocalFsdsContentColor provides (${fgSlot ? "cardForeground ?: Color.Unspecified" : "Color.Unspecified"})) {`);
  lines.push(`            ${name}ScopeImpl.content()`);
  lines.push(`        }`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(``);
  for (const part of parts) {
    lines.push(`/** ${part} region declared by the contract anatomy. */`);
    lines.push(`@Composable`);
    lines.push(`fun ${name}Scope.${pascalCase(part)}(`);
    lines.push(`    modifier: Modifier = Modifier,`);
    lines.push(`    content: @Composable () -> Unit,`);
    lines.push(`) {`);
    lines.push(`    Column(modifier) { content() }`);
    lines.push(`}`);
    lines.push(``);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The media leaf class (FEAT-COMPOSE-IMAGE-ADMISSION-01): a childless `img`
 * root with no channel. The loader decision, recorded in the criteria: a
 * foundation-only target fetches and decodes nothing, so the image itself is
 * the consumer's `Painter` and the declared chrome plus the accessible name are
 * what this class realizes. When no painter is supplied the class renders the
 * alt text as the placeholder, which is also what keeps `box-model.gap` a real
 * read rather than a claim.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - `image.size.*` is React Native-consumed but the contract declares the
 *     size axis as a variant, not as slots, so no Compose read can resolve it
 *     and the path role claims colour and radius only;
 *   - `src`, `width`, `height`, `aspectRatio`, `objectFit`, `objectPosition`,
 *     `loading`, `sizes`, `fallbackSrc` and the `placeholder` / `errorState`
 *     parts are not lowered: fetching, decoding and intrinsic sizing are the
 *     consumer's with a painter, and there is no error channel to render;
 *   - `showPlaceholder` is the consumer's choice; the class renders the
 *     placeholder only when no painter is supplied.
 */
function emitMediaLeaf(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const radii = Object.keys(ir.variants ?? {}).find((axis) => axis === "radius");
  const radiusValues = (radii ? ir.variants![radii] : []) ?? [];
  const radiusProp = radii ? ir.styledProps.find((p) => p.safeName === radii) : undefined;
  const radiusEnum = `${name}Radius`;
  const altProp = ir.styledProps.find((p) => p.safeName === "alt");
  const showPlaceholderProp = ir.styledProps.find((p) => p.safeName === "showPlaceholder");

  const bgSlot = findLayeredSlotAny(ir, ["root"], [".color.background.default"]);
  const fgSlot = findLayeredSlotAny(ir, ["root"], [".color.foreground.primary"]);
  const radiusSlots = radiusValues
    .map((value) => findLayeredSlotAny(ir, ["root"], [`.radius.${value}`]))
    .filter((slot): slot is { scopeKey: string; name: string } => slot !== undefined);
  const gapSlot = findTokenSlot(ir, "root", "box-model.gap");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const lines: string[] = [];
  lines.push(`// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`);
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  lines.push(`import androidx.compose.foundation.Image as FoundationImage`);
  lines.push(`import androidx.compose.foundation.background`);
  lines.push(`import androidx.compose.foundation.layout.Box`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.foundation.layout.fillMaxSize`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.foundation.text.BasicText`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.ui.Alignment`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.draw.clip`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.graphics.painter.Painter`);
  lines.push(`import androidx.compose.ui.layout.ContentScale`);
  lines.push(`import androidx.compose.ui.text.TextStyle`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
  lines.push(`import com.fullstackds.tokens.toFsdsColor`);
  lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start types`);
  if (radiusValues.length > 0) {
    lines.push(`/** ${radiusProp?.safeName ?? "radius"} axis lowered from the contract's ${radiusEnum} type. */`);
    lines.push(`enum class ${radiusEnum} { ${radiusValues.map(kotlinEnumName).join(", ")} }`);
    lines.push(``);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    painter: Painter? = null,`);
  if (altProp) lines.push(`    ${altProp.safeName}: String? = null,`);
  if (radiusProp) {
    lines.push(`    ${radiusProp.safeName}: ${radiusEnum}? = null,`);
  }
  if (showPlaceholderProp) lines.push(`    ${showPlaceholderProp.safeName}: Boolean = false,`);
  lines.push(`) {`);
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(`        val def = ${tokenConstName(ir)}["root"]?.get(slotName)`);
    lines.push(`        return def?.let { fsdsTheme.resolve(it) }`);
    lines.push(`    }`);
    const color = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsColor()` : undefined;
    const dp = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp` : "0.dp";
    const declare = (local: string, expression: string | undefined) => {
      if (expression) lines.push(`    val ${local} = ${expression}`);
    };
    declare("mediaBackground", color(bgSlot));
    declare("mediaForeground", color(fgSlot));
    if (radiusProp && radiusSlots.length > 0) {
      const arms = radiusSlots
        .map((slot, index) => {
          const value = radiusValues.find((v) => slot.name.endsWith(`.radius.${v}`)) ?? radiusValues[index]!;
          return `${radiusEnum}.${kotlinEnumName(value)} -> layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp()`;
        })
        .join("; ");
      lines.push(
        `    val mediaRadius = when (${radiusProp.safeName}) { ${arms}; else -> null } ?: 0.dp`,
      );
    } else {
      lines.push(`    val mediaRadius = 0.dp`);
    }
    lines.push(`    val mediaGap = ${dp(gapSlot)}`);
    lines.push(`    val mediaMinWidth = ${dp(minWidthSlot)}`);
    lines.push(`    val mediaMinHeight = ${dp(minHeightSlot)}`);
    lines.push(
      `    val mediaPadding = PaddingValues(start = ${dp(paddingInlineStartSlot)}, end = ${dp(paddingInlineEndSlot)}, top = ${dp(paddingBlockStartSlot)}, bottom = ${dp(paddingBlockEndSlot)})`,
    );
  } else {
    lines.push(`    val mediaRadius = 0.dp`);
    lines.push(`    val mediaGap = 0.dp`);
    lines.push(`    val mediaMinWidth = 0.dp`);
    lines.push(`    val mediaMinHeight = 0.dp`);
    lines.push(`    val mediaPadding = PaddingValues(0.dp)`);
  }
  lines.push(`    val mediaShape = RoundedCornerShape(mediaRadius)`);
  lines.push(`    Box(`);
  lines.push(`        modifier`);
  lines.push(`            .requiredSizeIn(minWidth = mediaMinWidth, minHeight = mediaMinHeight)`);
  lines.push(`            .clip(mediaShape)`);
  lines.push(`            .then(if (mediaBackground != null) Modifier.background(mediaBackground, mediaShape) else Modifier)`);
  lines.push(`            .padding(mediaPadding),`);
  lines.push(`        contentAlignment = Alignment.Center,`);
  lines.push(`    ) {`);
  lines.push(`        if (painter != null) {`);
  lines.push(`            FoundationImage(`);
  lines.push(`                painter = painter,`);
  if (altProp) lines.push(`                contentDescription = ${altProp.safeName},`);
  lines.push(`                contentScale = ContentScale.Fit,`);
  lines.push(`                modifier = Modifier.fillMaxSize(),`);
  lines.push(`            )`);
  lines.push(`        } else {`);
  if (altProp) {
    lines.push(`            BasicText(`);
    lines.push(`                text = ${altProp.safeName} ?: "",`);
    lines.push(
      `                style = TextStyle(color = ${fgSlot ? "mediaForeground ?: Color.Unspecified" : "Color.Unspecified"}),`,
    );
    lines.push(`                modifier = Modifier.padding(mediaGap),`);
    lines.push(`            )`);
  } else {
    lines.push(`            BasicText(text = "", modifier = Modifier.padding(mediaGap))`);
  }
  lines.push(`        }`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The referenced content composite class (FEAT-COMPOSE-AVATAR-ADMISSION-01): a
 * passive root with no channel whose only component reference is a *content-role*
 * part. Avatar is the corpus consumer — an image part referencing Image beside a
 * gated initials leaf.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - the declared Image reference is NOT composed in v1, and that is the one
 *     entry in the C8 ledger: Avatar declares its image through a `src` string
 *     while the Image class takes a consumer painter (the loader decision), so
 *     composing it needs the reference vocabulary to accept a class-supplied
 *     argument override. v1 therefore renders the initials fallback and the
 *     declared chrome, and takes no painter;
 *   - `src`, `priority`, the `status` part and `avatar.typography.fontFamily`
 *     are unlowered; the initials leaf carries the declared weight through the
 *     content text-style path, and `avatar.size.*` is React Native-consumed
 *     while the contract declares the size axis as a variant.
 */
function emitReferencedContentComposite(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const sizeAxis = Object.keys(ir.variants ?? {})[0];
  const sizeValues = (sizeAxis ? ir.variants![sizeAxis] : []) ?? [];
  const sizeProp = sizeAxis ? ir.styledProps.find((p) => p.safeName === sizeAxis) : undefined;
  const sizeEnum = `${name}${pascalCase(sizeAxis ?? "size")}`;
  const initialsProp = ir.styledProps.find((p) => p.safeName === "initials");
  const nameProp = ir.styledProps.find((p) => p.safeName === "name");

  const bgSlot = findLayeredSlotAny(ir, ["root"], [".color.background.default"]);
  const fgSlot = findLayeredSlotAny(ir, ["root"], [".color.foreground.primary"]);
  const borderSlot = findLayeredSlotAny(ir, ["root"], [".color.border.default"]);
  const borderWidthSlot = findLayeredSlotAny(ir, ["root"], [".size.border.default", ".size.border"]);
  const radiusSlot = findLayeredSlotAny(ir, ["root"], [".size.radius.default"]);
  const weightSlot = findLayeredSlotAny(ir, ["root"], [".typography.fontWeight.medium"]);
  const gapSlot = findTokenSlot(ir, "root", "box-model.gap");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const lines: string[] = [];
  lines.push(`// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`);
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  lines.push(`import androidx.compose.foundation.background`);
  lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.layout.Box`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.foundation.text.BasicText`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.ui.Alignment`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.draw.clip`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.semantics.contentDescription`);
  lines.push(`import androidx.compose.ui.semantics.semantics`);
  lines.push(`import androidx.compose.ui.text.TextStyle`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
  lines.push(`import com.fullstackds.tokens.toFsdsColor`);
  lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  lines.push(`import com.fullstackds.tokens.toFsdsWeight`);
  lines.push(`import androidx.compose.ui.graphics.painter.Painter`);
  for (const line of referenceImports(ir)) lines.push(line);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start types`);
  if (sizeValues.length > 0) {
    lines.push(`/** ${sizeProp?.safeName ?? "size"} axis lowered from the contract's ${sizeEnum} type. */`);
    lines.push(`enum class ${sizeEnum} { ${sizeValues.map(kotlinEnumName).join(", ")} }`);
    lines.push(``);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    painter: Painter? = null,`);
  if (sizeProp && sizeValues.length > 0) {
    lines.push(
      `    ${sizeProp.safeName}: ${sizeEnum} = ${sizeEnum}.${kotlinEnumName(sizeValues[0]!)},`,
    );
  }
  // Every declared string prop is a parameter: the reference guard reads one of
  // them, so declaring only the ones the body happens to use would drop it.
  for (const prop of ir.styledProps) {
    if (prop.type === "string" && prop.safeName !== sizeProp?.safeName) {
      lines.push(`    ${prop.safeName}: String? = null,`);
    }
  }
  lines.push(`) {`);
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(
      `        for (key in listOf(${[...(sizeProp ? [`"variant_" + ${sizeProp.safeName}.name.lowercase()`] : []), '"root"'].join(", ")})) {`,
    );
    lines.push(`            val def = ${tokenConstName(ir)}[key]?.get(slotName)`);
    lines.push(`            if (def != null) return fsdsTheme.resolve(def)`);
    lines.push(`        }`);
    lines.push(`        return null`);
    lines.push(`    }`);
    const color = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsColor()` : undefined;
    const dp = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp` : "0.dp";
    const declare = (local: string, expression: string | undefined) => {
      if (expression) lines.push(`    val ${local} = ${expression}`);
    };
    declare("avatarBackground", color(bgSlot));
    declare("avatarForeground", color(fgSlot));
    declare("avatarBorder", color(borderSlot));
    declare("avatarWeight", weightSlot ? `layeredSlot(${JSON.stringify(weightSlot.name)})?.toFsdsWeight()` : undefined);
    lines.push(`    val avatarRadius = ${dp(radiusSlot)}`);
    lines.push(`    val avatarBorderWidth = ${dp(borderWidthSlot)}`);
    lines.push(`    val avatarGap = ${dp(gapSlot)}`);
    lines.push(`    val avatarMinWidth = ${dp(minWidthSlot)}`);
    lines.push(`    val avatarMinHeight = ${dp(minHeightSlot)}`);
    lines.push(
      `    val avatarPadding = PaddingValues(start = ${dp(paddingInlineStartSlot)}, end = ${dp(paddingInlineEndSlot)}, top = ${dp(paddingBlockStartSlot)}, bottom = ${dp(paddingBlockEndSlot)})`,
    );
  } else {
    lines.push(`    val avatarRadius = 0.dp`);
    lines.push(`    val avatarBorderWidth = 0.dp`);
    lines.push(`    val avatarGap = 0.dp`);
    lines.push(`    val avatarMinWidth = 0.dp`);
    lines.push(`    val avatarMinHeight = 0.dp`);
    lines.push(`    val avatarPadding = PaddingValues(0.dp)`);
  }
  lines.push(`    val avatarShape = RoundedCornerShape(avatarRadius)`);
  lines.push(`    Box(`);
  lines.push(`        modifier`);
  lines.push(`            .requiredSizeIn(minWidth = avatarMinWidth, minHeight = avatarMinHeight)`);
  lines.push(`            .clip(avatarShape)`);
  lines.push(`            .then(if (avatarBackground != null) Modifier.background(avatarBackground, avatarShape) else Modifier)`);
  if (borderSlot) {
    lines.push(`            .then(if (avatarBorder != null) Modifier.border(avatarBorderWidth, avatarBorder, avatarShape) else Modifier)`);
  }
  lines.push(`            .padding(avatarPadding)`);
  if (nameProp) {
    lines.push(`            .semantics { if (${nameProp.safeName} != null) contentDescription = ${nameProp.safeName}!! },`);
  } else {
    lines.push(`,`);
  }
  lines.push(`        contentAlignment = Alignment.Center,`);
  lines.push(`    ) {`);
  for (const ref of referenceNodes(ir, "content")) {
    lines.push(...emitComponentReference(ir, ref, "        ", [], {
      src: { parameter: "painter", expression: "painter" },
    }));
  }
  if (initialsProp) {
    lines.push(`        if (${initialsProp.safeName} != null) {`);
    lines.push(`            BasicText(`);
    lines.push(`                text = ${initialsProp.safeName}!!,`);
    lines.push(`                style = TextStyle(color = ${fgSlot ? "avatarForeground ?: Color.Unspecified" : "Color.Unspecified"}${weightSlot ? ", fontWeight = avatarWeight" : ""}),`);
    lines.push(`                modifier = Modifier.padding(avatarGap),`);
    lines.push(`            )`);
    lines.push(`        }`);
  }
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The passive tree item class (FEAT-COMPOSE-NAVTREE-ADMISSION-01): a passive
 * list-item root whose heading carries a catalog glyph, a link and a label,
 * and whose list holds the consumer's projected children. NavTree is the
 * corpus consumer. The heading's content props are read from the dom, so the
 * emitter names neither a prop nor an icon.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - `nav-tree.color.connector`, `color.foreground.current` / `.hover` /
 *     `.headingHover`, `color.outline.focus`, `size.fontSize.item`,
 *     `size.gap.item`, `size.margin.group` and `stateLayer.hover` /
 *     `stateLayer.selected` are unclaimed: the tree renders one heading and
 *     projects its items, so item-level and interaction-state slots have no
 *     node of their own here;
 *   - the glyph's point size is the emitter's framework-grammar table keyed by
 *     the `iconSize` axis, matching the glyph-host class.
 */
function emitPassiveTreeItem(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const heading = ir.dom?.children?.find((c) => c.part === "heading");
  const headingChildren = heading?.children ?? [];
  const textProps = headingChildren
    .map((child) => propNameOf(child.content as { kind?: string; prop?: string } | undefined))
    .filter((prop): prop is string => typeof prop === "string");
  const iconProp = ir.styledProps.find((p) => p.safeName === "icon");
  const axisProp = ir.styledProps.find((p) =>
    p.typeRefs?.some((ref) => (ir.definedTypes[ref]?.values?.length ?? 0) > 0),
  );
  const axisRef = axisProp?.typeRefs?.find(
    (ref) => (ir.definedTypes[ref]?.values?.length ?? 0) > 0,
  );
  const axisValues = axisRef ? ir.definedTypes[axisRef]!.values! : [];
  const axisEnum = axisRef ?? `${name}IconSize`;
  const axisDefault = axisProp?.defaultExpr?.replace(/^["']|["']$/g, "") ?? axisValues[0] ?? "";

  const fgSlot = findLayeredSlotAny(ir, ["root"], [".color.foreground.default"]);
  const headingFgSlot = findLayeredSlotAny(ir, ["root"], [".color.foreground.heading"]);
  const radiusSlot = findLayeredSlotAny(ir, ["root"], [".size.radius.default"]);
  const headingSizeSlot = findLayeredSlotAny(ir, ["root"], [".size.fontSize.heading"]);
  const headingGapSlot = findLayeredSlotAny(ir, ["root"], [".size.gap.heading"]);
  const indentSlot = findLayeredSlotAny(ir, ["root"], [".size.indent"]);
  const paddingInlineSlot = findLayeredSlotAny(ir, ["root"], [".size.padding.inline"]);
  const paddingBlockSlot = findLayeredSlotAny(ir, ["root"], [".size.padding.block"]);
  const gapSlot = findTokenSlot(ir, "root", "box-model.gap");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const lines: string[] = [];
  lines.push(`// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`);
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  lines.push(`import androidx.compose.foundation.background`);
  lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.layout.Arrangement`);
  lines.push(`import androidx.compose.foundation.layout.Column`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.foundation.layout.Row`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.foundation.text.BasicText`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.CompositionLocalProvider`);
  lines.push(`import androidx.compose.ui.Alignment`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.draw.clip`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.text.TextStyle`);
  lines.push(`import androidx.compose.ui.unit.TextUnit`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import com.fullstackds.glyph.FsdsGlyphIcon`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsContentColor`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
  lines.push(`import com.fullstackds.tokens.toFsdsColor`);
  lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  lines.push(`import com.fullstackds.tokens.toFsdsSp`);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start types`);
  if (axisRef) {
    lines.push(`/** ${axisProp!.safeName} axis lowered from the contract's ${axisRef} type. */`);
    lines.push(`enum class ${axisEnum} { ${axisValues.map(kotlinEnumName).join(", ")} }`);
    lines.push(``);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  for (const prop of ir.styledProps) {
    if (prop.safeName === axisProp?.safeName) continue;
    if (prop.type === "string") lines.push(`    ${kotlinParamName(prop.safeName)}: String? = null,`);
  }
  if (axisRef) {
    lines.push(`    ${axisProp!.safeName}: ${axisEnum} = ${axisEnum}.${kotlinEnumName(axisDefault)},`);
  }
  lines.push(`    content: @Composable () -> Unit,`);
  lines.push(`) {`);
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(
      `        for (key in listOf(${[...(axisRef ? [`"variant_" + ${axisProp!.safeName}.name.lowercase()`] : []), '"root"'].join(", ")})) {`,
    );
    lines.push(`            val def = ${tokenConstName(ir)}[key]?.get(slotName)`);
    lines.push(`            if (def != null) return fsdsTheme.resolve(def)`);
    lines.push(`        }`);
    lines.push(`        return null`);
    lines.push(`    }`);
    const color = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsColor()` : undefined;
    const dp = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp` : "0.dp";
    const declare = (local: string, expression: string | undefined) => {
      if (expression) lines.push(`    val ${local} = ${expression}`);
    };
    declare("treeForeground", color(fgSlot));
    declare("treeHeadingColor", color(headingFgSlot) ?? color(fgSlot));
    lines.push(`    val treeRadius = ${dp(radiusSlot)}`);
    lines.push(
      `    val treeGap = ${dp(gapSlot)}`,
    );
    lines.push(
      `    val headingGap = ${headingGapSlot ? `layeredSlot(${JSON.stringify(headingGapSlot.name)})?.toFsdsDp() ?: treeGap` : "treeGap"}`,
    );
    lines.push(`    val treeIndent = ${dp(indentSlot)}`);
    lines.push(
      `    val headingPadding = PaddingValues(horizontal = ${dp(paddingInlineSlot)}, vertical = ${dp(paddingBlockSlot)})`,
    );
    lines.push(`    val treeMinWidth = ${dp(minWidthSlot)}`);
    lines.push(`    val treeMinHeight = ${dp(minHeightSlot)}`);
    lines.push(
      `    val treePadding = PaddingValues(start = ${dp(paddingInlineStartSlot)}, end = ${dp(paddingInlineEndSlot)}, top = ${dp(paddingBlockStartSlot)}, bottom = ${dp(paddingBlockEndSlot)})`,
    );
    if (headingSizeSlot) {
      lines.push(
        `    val headingSize = layeredSlot(${JSON.stringify(headingSizeSlot.name)})?.toFsdsSp() ?: TextUnit.Unspecified`,
      );
    }
  } else {
    lines.push(`    val treeRadius = 0.dp`);
    lines.push(`    val treeGap = 0.dp`);
    lines.push(`    val headingGap = 0.dp`);
    lines.push(`    val treeIndent = 0.dp`);
    lines.push(`    val headingPadding = PaddingValues(0.dp)`);
    lines.push(`    val treeMinWidth = 0.dp`);
    lines.push(`    val treeMinHeight = 0.dp`);
    lines.push(`    val treePadding = PaddingValues(0.dp)`);
    lines.push(`    val headingSize = TextUnit.Unspecified`);
  }
  lines.push(`    val treeShape = RoundedCornerShape(treeRadius)`);
  const glyphSize = axisRef
    ? `when (${axisProp!.safeName}) { ${axisValues
        .map((value) => `${axisEnum}.${kotlinEnumName(value)} -> ${value === axisValues[axisValues.length - 1] && axisValues.length > 1 ? "24.dp" : "16.dp"}`)
        .join("; ")} }`
    : "16.dp";
  lines.push(`    val headingTextStyle = TextStyle(color = ${headingFgSlot ? "treeHeadingColor ?: Color.Unspecified" : `${fgSlot ? "treeForeground" : "null"} ?: Color.Unspecified`}, fontSize = headingSize)`);
  lines.push(`    Column(`);
  lines.push(`        modifier`);
  lines.push(`            .requiredSizeIn(minWidth = treeMinWidth, minHeight = treeMinHeight)`);
  lines.push(`            .clip(treeShape)`);
  lines.push(`            .then(if (treeForeground != null) Modifier.background(treeForeground, treeShape) else Modifier)`);
  lines.push(`            .padding(treePadding),`);
  lines.push(`        verticalArrangement = Arrangement.spacedBy(treeGap),`);
  lines.push(`    ) {`);
  lines.push(`        Row(`);
  lines.push(`            Modifier.padding(headingPadding),`);
  lines.push(`            horizontalArrangement = Arrangement.spacedBy(headingGap),`);
  lines.push(`            verticalAlignment = Alignment.CenterVertically,`);
  lines.push(`        ) {`);
  if (iconProp) {
    lines.push(`            if (${kotlinParamName(iconProp.safeName)} != null) {`);
    lines.push(`                FsdsGlyphIcon(`);
    lines.push(`                    named = ${kotlinParamName(iconProp.safeName)}!!,`);
    lines.push(`                    size = ${glyphSize},`);
    lines.push(`                    tint = ${headingFgSlot ? "treeHeadingColor ?: Color.Unspecified" : `${fgSlot ? "treeForeground" : "null"} ?: Color.Unspecified`},`);
    lines.push(`                    modifier = Modifier,`);
    lines.push(`                )`);
    lines.push(`            }`);
  }
  for (const prop of textProps) {
    lines.push(`            if (${kotlinParamName(prop)} != null) {`);
    lines.push(`                BasicText(text = ${kotlinParamName(prop)}!!, style = headingTextStyle)`);
    lines.push(`            }`);
  }
  lines.push(`        }`);
  lines.push(`        CompositionLocalProvider(LocalFsdsContentColor provides (${fgSlot ? "treeForeground ?: Color.Unspecified" : "Color.Unspecified"})) {`);
  lines.push(`            Column(Modifier.padding(start = treeIndent)) { content() }`);
  lines.push(`        }`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The named-slot composer class
 * (FEAT-COMPOSE-FIELD-ADMISSION-01): a passive container whose every dom leaf
 * is a named slot. Compose realizes each declared slot as a nullable content
 * region in document order, so the consumer supplies exactly the regions that
 * apply; the chrome and the status axis come from the layered lookup the other
 * classes use.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - the declared string channel is not threaded: the `control` slot owns the
 *     value, so a wrapper-level channel would be a second source of truth;
 *   - `field.color.invalid-border` / `valid-border` / `focus-border`,
 *     `field.focus.ring.*` and `field.pad.x` are unclaimed — the status
 *     variants already override `field.color.border` in the layer the lookup
 *     reads, no focus interaction state is kept v1, and the merged box-model
 *     padding pool is the inset authority;
 *   - `name` / `id` / `required` / `disabled` / `readOnly` / `validate` /
 *     `validating` are not lowered (form wiring and validation are the
 *     consumer's, the region slots carry the outcome).
 */
function emitNamedSlotComposer(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const slots = collectDomSlots(ir.dom!);
  const statusProp = ir.styledProps.find((p) =>
    p.typeRefs?.some((ref) => (ir.definedTypes[ref]?.values?.length ?? 0) > 0),
  );
  const statusRef = statusProp?.typeRefs?.find(
    (ref) => (ir.definedTypes[ref]?.values?.length ?? 0) > 0,
  );
  const statusValues = statusRef ? ir.definedTypes[statusRef]!.values! : [];
  const statusEnum = statusRef ?? `${name}Status`;
  const statusDefault =
    statusProp?.defaultExpr?.replace(/^["']|["']$/g, "") ?? statusValues[0] ?? "";

  const bgSlot = findLayeredSlotAny(ir, ["root"], [".color.bg", ".color.background.default"]);
  const fgSlot = findLayeredSlotAny(ir, ["root"], [".color.fg", ".color.foreground.default", ".color.foreground.primary"]);
  const borderSlot = findLayeredSlotAny(ir, ["root"], [".color.border.default", ".color.border"]);
  const invalidTextSlot = findLayeredSlotAny(ir, ["root"], [".color.invalid-text", ".color.invalid.text"]);
  const labelColorSlot = findLayeredSlotAny(ir, ["root"], [".label.color"]);
  const labelSizeSlot = findLayeredSlotAny(ir, ["root"], [".label.fontSize"]);
  const radiusSlot = findLayeredSlotAny(ir, ["root"], [".radius", ".size.radius.default"]);
  const gapYSlot = findLayeredSlotAny(ir, ["root"], [".gap.y"]);
  const metaGapSlot = findLayeredSlotAny(ir, ["root"], [".gap.meta"]);
  const boxGapSlot = findTokenSlot(ir, "root", "box-model.gap");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const lines: string[] = [];
  lines.push(`// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`);
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  lines.push(`import androidx.compose.foundation.background`);
  lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.layout.Arrangement`);
  lines.push(`import androidx.compose.foundation.layout.Column`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.CompositionLocalProvider`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.draw.clip`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.text.TextStyle`);
  lines.push(`import androidx.compose.ui.unit.TextUnit`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsContentColor`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsTextStyle`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
  lines.push(`import com.fullstackds.tokens.toFsdsColor`);
  lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  lines.push(`import com.fullstackds.tokens.toFsdsSp`);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start types`);
  if (statusRef) {
    lines.push(`/** status axis lowered from the contract's ${statusRef} type. */`);
    lines.push(`enum class ${statusEnum} { ${statusValues.map(kotlinEnumName).join(", ")} }`);
    lines.push(``);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  if (statusRef) {
    lines.push(
      `    ${statusProp!.safeName}: ${statusEnum} = ${statusEnum}.${kotlinEnumName(statusDefault)},`,
    );
  }
  for (const slot of slots) {
    lines.push(`    ${kotlinParamName(slot)}: (@Composable () -> Unit)? = null,`);
  }
  lines.push(`) {`);
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(
      `        for (key in listOf(${[
        ...(statusRef ? [`"variant_" + ${statusProp!.safeName}.name.lowercase()`] : []),
        '"root"',
      ].join(", ")})) {`,
    );
    lines.push(`            val def = ${tokenConstName(ir)}[key]?.get(slotName)`);
    lines.push(`            if (def != null) return fsdsTheme.resolve(def)`);
    lines.push(`        }`);
    lines.push(`        return null`);
    lines.push(`    }`);
    const color = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsColor()` : undefined;
    const dp = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp` : "0.dp";
    const declare = (local: string, expression: string | undefined) => {
      if (expression) lines.push(`    val ${local} = ${expression}`);
    };
    declare("fieldBackground", color(bgSlot));
    declare("fieldForeground", color(fgSlot));
    declare("fieldBorder", color(borderSlot));
    declare("fieldInvalidText", color(invalidTextSlot));
    declare("fieldLabelColor", color(labelColorSlot));
    lines.push(`    val fieldRadius = ${dp(radiusSlot)}`);
    lines.push(
      `    val fieldGap = ${gapYSlot ? `layeredSlot(${JSON.stringify(gapYSlot.name)})?.toFsdsDp() ?: ` : ""}layeredSlot(${JSON.stringify(boxGapSlot?.name ?? "box-model.gap")})?.toFsdsDp() ?: 0.dp`,
    );
    lines.push(`    val fieldMetaGap = ${dp(metaGapSlot)}`);
    lines.push(`    val fieldMinWidth = ${dp(minWidthSlot)}`);
    lines.push(`    val fieldMinHeight = ${dp(minHeightSlot)}`);
    lines.push(
      `    val fieldPadding = PaddingValues(start = ${dp(paddingInlineStartSlot)}, end = ${dp(paddingInlineEndSlot)}, top = ${dp(paddingBlockStartSlot)}, bottom = ${dp(paddingBlockEndSlot)})`,
    );
    declare("fieldLabelSize", labelSizeSlot ? `layeredSlot(${JSON.stringify(labelSizeSlot.name)})?.toFsdsSp() ?: TextUnit.Unspecified` : undefined);
  } else {
    lines.push(`    val fieldRadius = 0.dp`);
    lines.push(`    val fieldGap = 0.dp`);
    lines.push(`    val fieldMetaGap = 0.dp`);
    lines.push(`    val fieldMinWidth = 0.dp`);
    lines.push(`    val fieldMinHeight = 0.dp`);
    lines.push(`    val fieldPadding = PaddingValues(0.dp)`);
  }
  lines.push(`    val fieldShape = RoundedCornerShape(fieldRadius)`);
  lines.push(`    Column(`);
  lines.push(`        modifier`);
  lines.push(`            .requiredSizeIn(minWidth = fieldMinWidth, minHeight = fieldMinHeight)`);
  lines.push(`            .clip(fieldShape)`);
  lines.push(`            .then(if (fieldBackground != null) Modifier.background(fieldBackground, fieldShape) else Modifier)`);
  lines.push(`            .then(if (fieldBorder != null) Modifier.border(1.dp, fieldBorder, fieldShape) else Modifier)`);
  lines.push(`            .padding(fieldPadding)`);
  lines.push(`,`);
  lines.push(`        verticalArrangement = Arrangement.spacedBy(fieldGap),`);
  lines.push(`    ) {`);
  for (const slot of slots) {
    const param = kotlinParamName(slot);
    if (slot === "control") {
      lines.push(`        ${param}?.invoke()`);
    } else if (slot === "label") {
      lines.push(`        CompositionLocalProvider(`);
      lines.push(`            LocalFsdsTextStyle provides TextStyle(fontSize = ${labelSizeSlot ? "fieldLabelSize" : "TextUnit.Unspecified"}, color = ${labelColorSlot ? "fieldLabelColor ?: Color.Unspecified" : "Color.Unspecified"}),`);
      lines.push(`        ) { ${param}?.invoke() }`);
    } else if (slot === "error") {
      lines.push(`        CompositionLocalProvider(`);
      lines.push(`            LocalFsdsTextStyle provides TextStyle(color = ${invalidTextSlot ? "fieldInvalidText ?: Color.Unspecified" : "Color.Unspecified"}),`);
      lines.push(`        ) { ${param}?.invoke() }`);
    } else {
      lines.push(`        ${param}?.invoke()`);
    }
  }
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The referenced-action composite class
 * (FEAT-COMPOSE-REFERENCE-REALIZATION-01): a passive root that declares no
 * value channel of its own and whose interactivity is supplied entirely by two
 * or more referenced interactive components. Chip is the corpus consumer — a
 * chip's action and optional dismiss controls are both contract references to
 * Button, so the emitter composes them rather than re-implementing them.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - `chip.color.background.selected` / `chip.color.foreground.selected` /
 *     `chip.color.border.selected` and `chip.size.padding.horizontal` /
 *     `.vertical` are unclaimed: the variant layers override the same default
 *     slot names the layered lookup reads, and the merged box-model padding pool
 *     is the inset authority;
 *   - `chip.dismiss.gap` is unclaimed: the row uses the shared `chip.size.gap`,
 *     which is what the web realization consumes;
 *   - `chip.motion.duration.fast` is a CSS transition input and no native
 *     transition is lowered;
 *   - `chip.text.weight` rides the content text-style local, so it styles the
 *     content the consumer composes rather than an emitter-owned label node;
 *   - the referenced controls' declared `aria-expanded` / `aria-pressed` state
 *     bindings are not lowered (the referenced component exposes no
 *     state-semantics parameter) — named by the reference vocabulary, not
 *     dropped by omission.
 */
function emitReferencedActionComposite(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const axes = Object.keys(ir.variants ?? {}).map((axis) => {
    const values = ir.variants[axis] ?? [];
    const prop = ir.styledProps.find((p) => p.safeName === axis);
    return {
      propName: prop?.safeName ?? axis,
      enumName: `${name}${pascalCase(axis)}`,
      values,
      defaultMember: prop?.defaultExpr?.replace(/^["']|["']$/g, "") ?? values[0] ?? "",
    };
  });
  // A declared enum prop that is not a variant axis (an HTML-authoring axis
  // such as Chip's `type`) still needs its Kotlin enum and parameter.
  const extraEnumProps = ir.styledProps
    .filter(
      (p) =>
        !axes.some((a) => a.propName === p.safeName) &&
        p.typeRefs?.some((ref) => (ir.definedTypes[ref]?.values?.length ?? 0) > 0),
    )
    .map((p) => {
      const typeRef = p.typeRefs!.find((ref) => (ir.definedTypes[ref]?.values?.length ?? 0) > 0)!;
      const values = ir.definedTypes[typeRef]!.values!;
      return {
        propName: p.safeName,
        enumName: typeRef,
        values,
        defaultMember: p.defaultExpr?.replace(/^["']|["']$/g, "") ?? values[0] ?? "",
      };
    });
  const styles = [...axes, ...extraEnumProps];

  const triggers = referenceNodes(ir, "trigger");

  const bgSlot = findLayeredSlotAny(ir, ["root"], [".color.background.default", ".color.bg.default"]);
  const fgSlot = findLayeredSlotAny(ir, ["root"], [".color.foreground.default", ".color.foreground.primary"]);
  const borderSlot = findLayeredSlotAny(ir, ["root"], [".color.border.default"]);
  const hoverSlot = findLayeredSlotAny(ir, ["root"], [".color.background.hover"]);
  const borderWidthSlot = findLayeredSlotAny(ir, ["root"], [".size.border"]);
  const radiusSlot = findLayeredSlotAny(ir, ["root"], [".size.radius"]);
  const textSizeSlot = findLayeredSlotAny(ir, ["root"], [".text.size"]);
  const textWeightSlot = findLayeredSlotAny(ir, ["root"], [".text.weight"]);
  const minHeightSlot = findLayeredSlotAny(ir, ["root"], [".size.minHeight"]);
  const gapSlot = findLayeredSlotAny(ir, ["root"], [".size.gap"]);
  const boxGapSlot = findTokenSlot(ir, "root", "box-model.gap");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightBoxSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const optionalBoolean = (safeName: string) =>
    ir.styledProps.find((p) => p.safeName === safeName && p.type === "boolean");
  const optionalString = (safeName: string) => ir.styledProps.find((p) => p.safeName === safeName);
  const disabledProp = optionalBoolean("disabled");
  const contentProp = ir.styledProps.find((p) => p.safeName === "content" || p.type === "ReactNode");

  const lines: string[] = [];
  lines.push(`// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`);
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  lines.push(`import androidx.compose.foundation.background`);
  lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.hoverable`);
  lines.push(`import androidx.compose.foundation.interaction.MutableInteractionSource`);
  lines.push(`import androidx.compose.foundation.interaction.collectIsHoveredAsState`);
  lines.push(`import androidx.compose.foundation.layout.Arrangement`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.foundation.layout.Row`);
  lines.push(`import androidx.compose.foundation.layout.heightIn`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.CompositionLocalProvider`);
  lines.push(`import androidx.compose.runtime.getValue`);
  lines.push(`import androidx.compose.runtime.remember`);
  lines.push(`import androidx.compose.ui.Alignment`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.draw.clip`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.text.TextStyle`);
  lines.push(`import androidx.compose.ui.unit.TextUnit`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  for (const refImport of referenceImports(ir)) lines.push(refImport);
  lines.push(`import com.fullstackds.tokens.LocalFsdsContentColor`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsTextStyle`);
  lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
  lines.push(`import com.fullstackds.tokens.toFsdsColor`);
  lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  lines.push(`import com.fullstackds.tokens.toFsdsSp`);
  lines.push(`import com.fullstackds.tokens.toFsdsWeight`);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start types`);
  for (const axis of styles) {
    lines.push(`/** ${axis.propName} axis lowered from the contract's ${axis.enumName} type. */`);
    lines.push(`enum class ${axis.enumName} { ${axis.values.map(kotlinEnumName).join(", ")} }`);
    lines.push(``);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  for (const axis of styles) {
    lines.push(
      `    ${kotlinParamName(axis.propName)}: ${axis.enumName} = ${axis.enumName}.${kotlinEnumName(axis.defaultMember)},`,
    );
  }
  if (disabledProp) lines.push(`    disabled: Boolean = false,`);
  for (const trigger of triggers) {
    if (trigger.ifProp) {
      const gate = optionalBoolean(trigger.ifProp);
      if (gate) lines.push(`    ${kotlinParamName(trigger.ifProp)}: Boolean = false,`);
    }
  }
  const dismissLabel = optionalString("dismissLabel");
  if (dismissLabel?.defaultExpr) {
    lines.push(
      `    dismissLabel: String = ${JSON.stringify(dismissLabel.defaultExpr.replace(/^["']|["']$/g, ""))},`,
    );
  } else if (dismissLabel) {
    lines.push(`    dismissLabel: String = "",`);
  }
  if (optionalString("ariaLabel")) lines.push(`    ariaLabel: String? = null,`);
  if (contentProp) {
    lines.push(`    ${kotlinParamName(contentProp.safeName)}: (@Composable () -> Unit)? = null,`);
  }
  for (const callback of ir.styledProps.filter((p) => p.type.startsWith("("))) {
    lines.push(`    ${kotlinParamName(callback.safeName)}: (() -> Unit)? = null,`);
  }
  lines.push(`    content: @Composable () -> Unit,`);
  lines.push(`) {`);
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(
      `        for (key in listOf(${axes
        .map((a) => `"variant_" + ${kotlinParamName(a.propName)}.name.lowercase()`)
        .concat(['"root"'])
        .join(", ")})) {`,
    );
    lines.push(`            val def = ${tokenConstName(ir)}[key]?.get(slotName)`);
    lines.push(`            if (def != null) return fsdsTheme.resolve(def)`);
    lines.push(`        }`);
    lines.push(`        return null`);
    lines.push(`    }`);
    const color = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsColor()` : undefined;
    const dp = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp` : "0.dp";
    const declare = (local: string, expression: string | undefined) => {
      if (expression) lines.push(`    val ${local} = ${expression}`);
    };
    declare("chipBackground", color(bgSlot));
    declare("chipForeground", color(fgSlot));
    declare("chipBorder", color(borderSlot));
    declare("chipHover", color(hoverSlot));
    lines.push(`    val chipRadius = ${dp(radiusSlot)}`);
    lines.push(`    val chipBorderWidth = ${dp(borderWidthSlot)}`);
    // The component's own gap wins; the shared box-model pool is the fallback.
    // Both are declared facts and both are read, so neither is a silent skip.
    lines.push(
      `    val chipGap = layeredSlot(${JSON.stringify(gapSlot?.name ?? "chip.size.gap")})?.toFsdsDp() ?: layeredSlot(${JSON.stringify(boxGapSlot?.name ?? "box-model.gap")})?.toFsdsDp() ?: 0.dp`,
    );
    lines.push(`    val chipMinHeight = ${dp(minHeightSlot)}`);
    lines.push(`    val chipMinWidth = ${dp(minWidthSlot)}`);
    lines.push(`    val chipBoxMinHeight = ${dp(minHeightBoxSlot)}`);
    lines.push(
      `    val chipPadding = PaddingValues(start = ${dp(paddingInlineStartSlot)}, end = ${dp(paddingInlineEndSlot)}, top = ${dp(paddingBlockStartSlot)}, bottom = ${dp(paddingBlockEndSlot)})`,
    );
    if (textSizeSlot) {
      lines.push(
        `    val chipTextSize = layeredSlot(${JSON.stringify(textSizeSlot.name)})?.toFsdsSp() ?: TextUnit.Unspecified`,
      );
    }
    if (textWeightSlot) {
      lines.push(`    val chipTextWeight = layeredSlot(${JSON.stringify(textWeightSlot.name)})?.toFsdsWeight()`);
    }
  } else {
    lines.push(`    val chipRadius = 0.dp`);
    lines.push(`    val chipBorderWidth = 0.dp`);
    lines.push(`    val chipGap = 0.dp`);
    lines.push(`    val chipMinHeight = 0.dp`);
    lines.push(`    val chipMinWidth = 0.dp`);
    lines.push(`    val chipBoxMinHeight = 0.dp`);
    lines.push(`    val chipPadding = PaddingValues(0.dp)`);
  }
  lines.push(`    val chipShape = RoundedCornerShape(chipRadius)`);
  lines.push(`    val interactionSource = remember { MutableInteractionSource() }`);
  lines.push(`    val hovered by interactionSource.collectIsHoveredAsState()`);
  const contentStyle = [
    textSizeSlot ? "fontSize = chipTextSize" : null,
    textWeightSlot ? "fontWeight = chipTextWeight" : null,
  ].filter((part): part is string => part !== null);
  lines.push(`    Row(`);
  lines.push(`        modifier`);
  lines.push(`            .requiredSizeIn(minWidth = chipMinWidth, minHeight = chipBoxMinHeight)`);
  lines.push(`            .heightIn(min = chipMinHeight)`);
  lines.push(`            .clip(chipShape)`);
  if (bgSlot) {
    lines.push(
      `            .then(if (hovered && chipHover != null) Modifier.background(chipHover, chipShape) else if (chipBackground != null) Modifier.background(chipBackground, chipShape) else Modifier)`,
    );
  } else if (hoverSlot) {
    lines.push(
      `            .then(if (hovered && chipHover != null) Modifier.background(chipHover, chipShape) else Modifier)`,
    );
  }
  if (borderSlot) {
    lines.push(
      `            .then(if (chipBorder != null) Modifier.border(chipBorderWidth, chipBorder, chipShape) else Modifier)`,
    );
  }
  lines.push(`            .hoverable(interactionSource)`);
  lines.push(`            .padding(chipPadding)`);
  lines.push(`,`);
  lines.push(`        horizontalArrangement = Arrangement.spacedBy(chipGap),`);
  lines.push(`        verticalAlignment = Alignment.CenterVertically,`);
  lines.push(`    ) {`);
  lines.push(
    `        CompositionLocalProvider(`,
  );
  lines.push(`            LocalFsdsContentColor provides (${fgSlot ? "chipForeground ?: Color.Unspecified" : "Color.Unspecified"}),`);
  if (contentStyle.length > 0) {
    lines.push(`            LocalFsdsTextStyle provides TextStyle(${contentStyle.join(", ")}),`);
  }
  lines.push(`        ) {`);
  for (const trigger of triggers) {
    lines.push(...emitComponentReference(ir, trigger, "            "));
  }
  lines.push(`        }`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

function emitCenteredSurface(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const openChannel = ir.behavior.normalizedChannels.find(
    (c) => c.valueType === "boolean",
  )!;
  const valueProp = openChannel.valueProp;
  const defaultValueProp = openChannel.defaultValueProp ?? `${valueProp}Default`;
  const changeProp = openChannel.changeHandlerProp;
  // A centered surface may carry a second, string-typed channel — Command's
  // `search` query. It lowers to a search field above the consumer content
  // rather than to a second modal behaviour; the fact is framework-neutral
  // and lives in the shared native substrate (`surfaceStringChannel`).
  const stringChannel = surfaceStringChannel(ir);
  const placeholderProp = stringChannel
    ? ir.styledProps.find((p) => p.safeName === "placeholder")
    : undefined;
  const hasEscape = ir.styledProps.some((p) => p.safeName === "closeOnEscape");
  const hasBackdrop = ir.styledProps.some((p) => p.safeName === "closeOnBackdropClick");
  const hasAriaLabel = ir.styledProps.some((p) => p.safeName === "ariaLabel");

  // Chrome grammar: default-scope suffixes first (Dialog), then the
  // part-scoped grammar later surface contracts use (`command.color.background`).
  const bgSlot = findLayeredSlotAny(ir, ["root"], [".color.background.default", ".color.background"]);
  const fgSlot = findLayeredSlotAny(ir, ["root"], [".color.foreground.primary", ".color.text.default", ".color.text"]);
  const borderSlot = findLayeredSlotAny(ir, ["root"], [".color.border.default", ".color.border"]);
  const borderWidthSlot = findLayeredSlotAny(ir, ["root"], [".border.width"]);
  const radiusSlot = findLayeredSlotAny(ir, ["root"], [".size.radius.default", ".border.radius", ".surface.radius"]);
  const mutedSlot = stringChannel && placeholderProp
    ? findLayeredSlotAny(ir, ["root"], [".color.textMuted", ".color.foreground.muted"])
    : undefined;
  const dividerSlot = stringChannel
    ? findLayeredSlotAny(ir, ["root"], [".color.borderLight", ".color.border.subtle"])
    : undefined;
  const textSizeSlot = stringChannel
    ? findLayeredSlotAny(ir, ["root"], [".text.size"])
    : undefined;
  const gapSlot = findTokenSlot(ir, "root", "box-model.gap");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const maxWidthSlot = findSurfaceOwnSizeSlot(ir, "maxWidth");
  const maxHeightSlot = findSurfaceOwnSizeSlot(ir, "maxHeight");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const lines: string[] = [];
  lines.push(`// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`);
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  if (bgSlot || dividerSlot) lines.push(`import androidx.compose.foundation.background`);
  if (borderSlot) lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.layout.Arrangement`);
  if (dividerSlot) lines.push(`import androidx.compose.foundation.layout.Box`);
  lines.push(`import androidx.compose.foundation.layout.Column`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  if (dividerSlot) lines.push(`import androidx.compose.foundation.layout.fillMaxWidth`);
  if (dividerSlot) lines.push(`import androidx.compose.foundation.layout.height`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  if (stringChannel) lines.push(`import androidx.compose.foundation.text.BasicText`);
  if (stringChannel) lines.push(`import androidx.compose.foundation.text.BasicTextField`);
  lines.push(`import androidx.compose.runtime.Composable`);
  if (fgSlot) lines.push(`import androidx.compose.runtime.CompositionLocalProvider`);
  lines.push(`import androidx.compose.runtime.getValue`);
  lines.push(`import androidx.compose.runtime.mutableStateOf`);
  lines.push(`import androidx.compose.runtime.remember`);
  lines.push(`import androidx.compose.runtime.setValue`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.draw.clip`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  if (stringChannel) lines.push(`import androidx.compose.ui.text.TextStyle`);
  if (maxWidthSlot || maxHeightSlot) lines.push(`import androidx.compose.ui.unit.Dp`);
  if (textSizeSlot) lines.push(`import androidx.compose.ui.unit.TextUnit`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import androidx.compose.ui.window.Dialog as ComposeDialog`);
  lines.push(`import androidx.compose.ui.window.DialogProperties`);
  if (consumesTokens) {
    if (fgSlot) lines.push(`import com.fullstackds.tokens.LocalFsdsContentColor`);
    lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
    if (bgSlot || fgSlot || borderSlot || mutedSlot || dividerSlot) lines.push(`import com.fullstackds.tokens.toFsdsColor`);
    lines.push(`import com.fullstackds.tokens.toFsdsDp`);
    if (textSizeSlot) lines.push(`import com.fullstackds.tokens.toFsdsSp`);
  }
  for (const line of referenceImports(ir)) lines.push(line);
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    ${valueProp}: Boolean? = null,`);
  lines.push(`    ${defaultValueProp}: Boolean = false,`);
  lines.push(`    ${changeProp}: ((Boolean) -> Unit)? = null,`);
  if (stringChannel) {
    const stringDefault = stringChannel.defaultValueProp ?? `${stringChannel.valueProp}Default`;
    lines.push(`    ${stringChannel.valueProp}: String? = null,`);
    lines.push(`    ${stringDefault}: String = "",`);
    lines.push(`    ${stringChannel.changeHandlerProp}: ((String) -> Unit)? = null,`);
    if (placeholderProp?.defaultExpr) {
      lines.push(`    placeholder: String = ${JSON.stringify(placeholderProp.defaultExpr.replace(/^["']|["']$/g, ""))},`);
    } else if (placeholderProp) {
      lines.push(`    placeholder: String = "",`);
    }
  }
  if (hasEscape) lines.push(`    closeOnEscape: Boolean = true,`);
  if (hasBackdrop) lines.push(`    closeOnBackdropClick: Boolean = true,`);
  if (hasAriaLabel) lines.push(`    ariaLabel: String? = null,`);
  lines.push(`    content: @Composable () -> Unit,`);
  lines.push(`) {`);
  lines.push(`    var uncontrolled${pascalCase(valueProp)} by remember { mutableStateOf(${defaultValueProp}) }`);
  lines.push(`    val resolved${pascalCase(valueProp)} = ${valueProp} ?: uncontrolled${pascalCase(valueProp)}`);
  if (stringChannel) {
    const stringDefault = stringChannel.defaultValueProp ?? `${stringChannel.valueProp}Default`;
    lines.push(`    var uncontrolled${pascalCase(stringChannel.valueProp)} by remember { mutableStateOf(${stringDefault}) }`);
    lines.push(`    val resolved${pascalCase(stringChannel.valueProp)} = ${stringChannel.valueProp} ?: uncontrolled${pascalCase(stringChannel.valueProp)}`);
  }
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(`        val def = ${tokenConstName(ir)}["root"]?.get(slotName)`);
    lines.push(`        return def?.let { fsdsTheme.resolve(it) }`);
    lines.push(`    }`);
    if (bgSlot) lines.push(`    val panelBg = layeredSlot(${JSON.stringify(bgSlot.name)})?.toFsdsColor()`);
    if (fgSlot) lines.push(`    val panelText = layeredSlot(${JSON.stringify(fgSlot.name)})?.toFsdsColor()`);
    if (mutedSlot) lines.push(`    val panelMuted = layeredSlot(${JSON.stringify(mutedSlot.name)})?.toFsdsColor()`);
    if (dividerSlot) lines.push(`    val panelDivider = layeredSlot(${JSON.stringify(dividerSlot.name)})?.toFsdsColor()`);
    if (borderSlot) lines.push(`    val panelBorder = layeredSlot(${JSON.stringify(borderSlot.name)})?.toFsdsColor()`);
    if (radiusSlot) lines.push(`    val panelRadius = layeredSlot(${JSON.stringify(radiusSlot.name)})?.toFsdsDp() ?: 0.dp`);
    if (textSizeSlot) lines.push(`    val panelSearchSize = layeredSlot(${JSON.stringify(textSizeSlot.name)})?.toFsdsSp() ?: TextUnit.Unspecified`);
    if (gapSlot) lines.push(`    val panelGap = layeredSlot(${JSON.stringify(gapSlot.name)})?.toFsdsDp() ?: 0.dp`);
    else lines.push(`    val panelGap = 0.dp`);
    const side = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp` : `0.dp`;
    lines.push(
      `    val panelPadding = PaddingValues(start = ${side(paddingInlineStartSlot)}, end = ${side(paddingInlineEndSlot)}, top = ${side(paddingBlockStartSlot)}, bottom = ${side(paddingBlockEndSlot)})`,
    );
    if (minWidthSlot) lines.push(`    val panelMinWidth = layeredSlot(${JSON.stringify(minWidthSlot.name)})?.toFsdsDp() ?: 0.dp`);
    if (minHeightSlot) lines.push(`    val panelMinHeight = layeredSlot(${JSON.stringify(minHeightSlot.name)})?.toFsdsDp() ?: 0.dp`);
    if (maxWidthSlot) lines.push(`    val panelMaxWidth = layeredSlot(${JSON.stringify(maxWidthSlot.name)})?.toFsdsDp() ?: Dp.Unspecified`);
    if (maxHeightSlot) lines.push(`    val panelMaxHeight = layeredSlot(${JSON.stringify(maxHeightSlot.name)})?.toFsdsDp() ?: Dp.Unspecified`);
    lines.push(``);
  } else {
    lines.push(`    val panelGap = 0.dp`);
    lines.push(`    val panelPadding = PaddingValues(0.dp)`);
  }
  lines.push(`    val panelShape = RoundedCornerShape(${radiusSlot ? "panelRadius" : "0.dp"})`);
  lines.push(`    if (!resolved${pascalCase(valueProp)}) return`);
  lines.push(`    fun dismiss() {`);
  lines.push(`        if (${valueProp} == null) { uncontrolled${pascalCase(valueProp)} = false }`);
  lines.push(`        ${changeProp}?.invoke(false)`);
  lines.push(`    }`);
  lines.push(`    ComposeDialog(`);
  lines.push(`        onDismissRequest = { dismiss() },`);
  lines.push(`        properties = DialogProperties(`);
  lines.push(`            dismissOnBackPress = ${hasEscape ? "closeOnEscape" : "true"},`);
  lines.push(`            dismissOnClickOutside = ${hasBackdrop ? "closeOnBackdropClick" : "true"},`);
  lines.push(`            usePlatformDefaultWidth = false,`);
  lines.push(`        ),`);
  lines.push(`    ) {`);
  if (fgSlot) {
    lines.push(`        CompositionLocalProvider(LocalFsdsContentColor provides (panelText ?: Color.Unspecified)) {`);
  }
  const pad = fgSlot ? "            " : "        ";
  lines.push(`${pad}Column(`);
  lines.push(`${pad}    modifier`);
  if (minWidthSlot || minHeightSlot || maxWidthSlot || maxHeightSlot) {
    const sizeArgs = [
      `minWidth = ${minWidthSlot ? "panelMinWidth" : "0.dp"}`,
      `minHeight = ${minHeightSlot ? "panelMinHeight" : "0.dp"}`,
    ];
    if (maxWidthSlot) sizeArgs.push(`maxWidth = panelMaxWidth`);
    if (maxHeightSlot) sizeArgs.push(`maxHeight = panelMaxHeight`);
    lines.push(`${pad}        .requiredSizeIn(${sizeArgs.join(", ")})`);
  }
  lines.push(`${pad}        .clip(panelShape)`);
  if (bgSlot) lines.push(`${pad}        .then(if (panelBg != null) Modifier.background(panelBg, panelShape) else Modifier)`);
  if (borderSlot) {
    const width = borderWidthSlot
      ? `layeredSlot(${JSON.stringify(borderWidthSlot.name)})?.toFsdsDp() ?: 1.dp`
      : "1.dp";
    lines.push(`${pad}        .then(if (panelBorder != null) Modifier.border(${width}, panelBorder, panelShape) else Modifier)`);
  }
  lines.push(`${pad}        .padding(panelPadding)`);
  lines.push(`,`);
  lines.push(`${pad}    verticalArrangement = Arrangement.spacedBy(panelGap),`);
  lines.push(`${pad}) {`);
  if (stringChannel) {
    const inner = `${pad}    `;
    lines.push(`${inner}BasicTextField(`);
    lines.push(`${inner}    value = resolved${pascalCase(stringChannel.valueProp)},`);
    lines.push(`${inner}    onValueChange = { next ->`);
    lines.push(`${inner}        if (${stringChannel.valueProp} == null) { uncontrolled${pascalCase(stringChannel.valueProp)} = next }`);
    lines.push(`${inner}        ${stringChannel.changeHandlerProp}?.invoke(next)`);
    lines.push(`${inner}    },`);
    lines.push(`${inner}    singleLine = true,`);
    const styleArgs = [`color = panelText ?: Color.Unspecified`];
    if (textSizeSlot) styleArgs.push(`fontSize = panelSearchSize`);
    lines.push(`${inner}    textStyle = TextStyle(${styleArgs.join(", ")}),`);
    const decorationRefs = referenceNodes(ir, "decoration");
    if (placeholderProp || decorationRefs.length > 0) {
      lines.push(`${inner}    decorationBox = { inner ->`);
      for (const ref of decorationRefs) {
        lines.push(...emitComponentReference(ir, ref, `${inner}        `));
      }
      if (placeholderProp) {
      lines.push(`${inner}        if (resolved${pascalCase(stringChannel.valueProp)}.isEmpty() && placeholder.isNotEmpty()) {`);
      lines.push(`${inner}            BasicText(text = placeholder, style = TextStyle(color = ${mutedSlot ? "panelMuted ?: Color.Unspecified" : "Color.Unspecified"}))`);
      lines.push(`${inner}        }`);
      }
      lines.push(`${inner}        inner()`);
      lines.push(`${inner}    },`);
    }
    lines.push(`${inner})`);
    if (dividerSlot) {
      lines.push(`${inner}if (panelDivider != null) {`);
      lines.push(`${inner}    Box(Modifier.fillMaxWidth().height(1.dp).background(panelDivider))`);
      lines.push(`${inner}}`);
    }
  }
  lines.push(`${pad}    content()`);
  lines.push(`${pad}}`);
  if (fgSlot) lines.push(`        }`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

/**
 * The viewport-edge surface class (FEAT-COMPOSE-EDGE-SURFACES-01): a
 * `viewport-edge` surface lowers to the foundation Dialog host with
 * `usePlatformDefaultWidth = false` and an edge alignment. Sheet supplies
 * a `side` enum that maps to the alignment; Toast supplies a `duration`
 * prop that drives a real auto-dismiss timer once open. Chrome
 * (`<name>.color.*`, `<name>.size.radius`) and the box-model family
 * resolve from the token scopes.
 *
 * Named divergences (ledgered in docs/architecture/native-target-admission.md):
 *   - Toast's `title`/`variant`/`politeness`/`action` are not lowered v1 —
 *     the consumer's content region carries the message;
 *   - Toast without a `duration` stays open until the channel closes;
 *   - Sheet's `modal` axis is not lowered v1 (the host is always modal);
 *   - anchored surfaces remain routed to their scaffold and unadmitted.
 */
function emitViewportEdgeSurface(ir: ComponentIR): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const openChannel = ir.behavior.normalizedChannels.find(
    (c) => c.valueType === "boolean",
  )!;
  const valueProp = openChannel.valueProp;
  const defaultValueProp = openChannel.defaultValueProp ?? `${valueProp}Default`;
  const changeProp = openChannel.changeHandlerProp;
  const placementProp = (ir.surface?.positioning as { placementProp?: string } | undefined)
    ?.placementProp;
  const autoDismissProp = (ir.surface?.timing as { autoDismissProp?: string } | undefined)
    ?.autoDismissProp;
  const hasEscape = ir.styledProps.some((p) => p.safeName === "closeOnEscape");
  const hasAriaLabel = ir.styledProps.some((p) => p.safeName === "ariaLabel");

  let sideEnumName: string | null = null;
  let sideValues: string[] = [];
  let sideDefault: string | null = null;
  if (placementProp) {
    const sideProp = ir.styledProps.find((p) => p.safeName === placementProp);
    const ref = sideProp?.typeRefs?.find((r) => (ir.definedTypes[r]?.values?.length ?? 0) > 0);
    if (ref) {
      sideEnumName = ref;
      sideValues = ir.definedTypes[ref]!.values!;
      sideDefault = sideProp?.defaultExpr?.replace(/^["']|["']$/g, "") ?? sideValues[0]!;
    }
  }

  const bgSlot = findLayeredSlotAny(ir, ["root"], [".color.background.default"]);
  const fgSlot = findLayeredSlotAny(ir, ["root"], [".color.foreground.primary", ".color.text.default"]);
  // Edge contracts name their chrome with part-scoped suffixes (`sheet.color.border`,
  // `sheet.border.radius`, `toast.surface.radius`) rather than the default-scope grammar.
  const borderSlot = findLayeredSlotAny(ir, ["root"], [".color.border.default", ".color.border"]);
  const radiusSlot = findLayeredSlotAny(ir, ["root"], [".size.radius.default", ".border.radius", ".surface.radius"]);
  const borderWidthSlot = findLayeredSlotAny(ir, ["root"], [".border.width"]);
  const gapSlot = findTokenSlot(ir, "root", "box-model.gap");
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(ir, "root", "box-model.padding-inline-start");
  const paddingInlineEndSlot = findTokenSlot(ir, "root", "box-model.padding-inline-end");
  const paddingBlockStartSlot = findTokenSlot(ir, "root", "box-model.padding-block-start");
  const paddingBlockEndSlot = findTokenSlot(ir, "root", "box-model.padding-block-end");
  const consumesTokens = ir.tokenScopes.some((s) => s.values.length > 0);

  const lines: string[] = [];
  lines.push(`// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`);
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  if (bgSlot) lines.push(`import androidx.compose.foundation.background`);
  if (borderSlot) lines.push(`import androidx.compose.foundation.border`);
  lines.push(`import androidx.compose.foundation.layout.Arrangement`);
  lines.push(`import androidx.compose.foundation.layout.Box`);
  lines.push(`import androidx.compose.foundation.layout.Column`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.foundation.layout.fillMaxSize`);
  lines.push(`import androidx.compose.foundation.layout.padding`);
  lines.push(`import androidx.compose.foundation.layout.requiredSizeIn`);
  lines.push(`import androidx.compose.foundation.shape.RoundedCornerShape`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.LaunchedEffect`);
  lines.push(`import androidx.compose.runtime.getValue`);
  lines.push(`import androidx.compose.runtime.mutableStateOf`);
  lines.push(`import androidx.compose.runtime.remember`);
  lines.push(`import androidx.compose.runtime.setValue`);
  lines.push(`import androidx.compose.ui.Alignment`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.draw.clip`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import androidx.compose.ui.window.Dialog as ComposeDialog`);
  lines.push(`import androidx.compose.ui.window.DialogProperties`);
  if (consumesTokens) {
    lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
    if (bgSlot || fgSlot || borderSlot) lines.push(`import com.fullstackds.tokens.toFsdsColor`);
    lines.push(`import com.fullstackds.tokens.toFsdsDp`);
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  if (sideEnumName) {
    lines.push(`/** Edge placement axis lowered from the contract's ${sideEnumName} type. */`);
    lines.push(`enum class ${sideEnumName} { ${sideValues.map(kotlinEnumName).join(", ")} }`);
    lines.push(``);
  }
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    ${valueProp}: Boolean? = null,`);
  lines.push(`    ${defaultValueProp}: Boolean = false,`);
  lines.push(`    ${changeProp}: ((Boolean) -> Unit)? = null,`);
  if (sideEnumName && sideDefault) {
    lines.push(`    ${placementProp}: ${sideEnumName} = ${sideEnumName}.${kotlinEnumName(sideDefault)},`);
  }
  if (autoDismissProp) {
    lines.push(`    ${autoDismissProp}: Int? = null,`);
  }
  if (hasEscape) lines.push(`    closeOnEscape: Boolean = true,`);
  if (hasAriaLabel) lines.push(`    ariaLabel: String? = null,`);
  lines.push(`    content: @Composable () -> Unit,`);
  lines.push(`) {`);
  lines.push(`    var uncontrolled${pascalCase(valueProp)} by remember { mutableStateOf(${defaultValueProp}) }`);
  lines.push(`    val resolved${pascalCase(valueProp)} = ${valueProp} ?: uncontrolled${pascalCase(valueProp)}`);
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    lines.push(`    fun layeredSlot(slotName: String): String? {`);
    lines.push(`        val def = ${tokenConstName(ir)}["root"]?.get(slotName)`);
    lines.push(`        return def?.let { fsdsTheme.resolve(it) }`);
    lines.push(`    }`);
    if (bgSlot) lines.push(`    val panelBg = layeredSlot(${JSON.stringify(bgSlot.name)})?.toFsdsColor()`);
    if (fgSlot) lines.push(`    val panelText = layeredSlot(${JSON.stringify(fgSlot.name)})?.toFsdsColor()`);
    if (borderSlot) lines.push(`    val panelBorder = layeredSlot(${JSON.stringify(borderSlot.name)})?.toFsdsColor()`);
    if (radiusSlot) lines.push(`    val panelRadius = layeredSlot(${JSON.stringify(radiusSlot.name)})?.toFsdsDp() ?: 0.dp`);
    if (gapSlot) lines.push(`    val panelGap = layeredSlot(${JSON.stringify(gapSlot.name)})?.toFsdsDp() ?: 0.dp`);
    else lines.push(`    val panelGap = 0.dp`);
    const side = (slot: { name: string } | undefined) =>
      slot ? `layeredSlot(${JSON.stringify(slot.name)})?.toFsdsDp() ?: 0.dp` : `0.dp`;
    lines.push(
      `    val panelPadding = PaddingValues(start = ${side(paddingInlineStartSlot)}, end = ${side(paddingInlineEndSlot)}, top = ${side(paddingBlockStartSlot)}, bottom = ${side(paddingBlockEndSlot)})`,
    );
    if (minWidthSlot) lines.push(`    val panelMinWidth = layeredSlot(${JSON.stringify(minWidthSlot.name)})?.toFsdsDp() ?: 0.dp`);
    if (minHeightSlot) lines.push(`    val panelMinHeight = layeredSlot(${JSON.stringify(minHeightSlot.name)})?.toFsdsDp() ?: 0.dp`);
    lines.push(``);
  } else {
    lines.push(`    val panelGap = 0.dp`);
    lines.push(`    val panelPadding = PaddingValues(0.dp)`);
  }
  lines.push(`    val panelShape = RoundedCornerShape(${radiusSlot ? "panelRadius" : "0.dp"})`);
  lines.push(`    fun dismiss() {`);
  lines.push(`        if (${valueProp} == null) { uncontrolled${pascalCase(valueProp)} = false }`);
  lines.push(`        ${changeProp}?.invoke(false)`);
  lines.push(`    }`);
  if (autoDismissProp) {
    lines.push(`    LaunchedEffect(resolved${pascalCase(valueProp)}, ${autoDismissProp}) {`);
    lines.push(`        if (resolved${pascalCase(valueProp)} && ${autoDismissProp} != null && ${autoDismissProp} > 0) {`);
    lines.push(`            kotlinx.coroutines.delay(${autoDismissProp}.toLong())`);
    lines.push(`            dismiss()`);
    lines.push(`        }`);
    lines.push(`    }`);
  }
  lines.push(`    if (!resolved${pascalCase(valueProp)}) return`);
  lines.push(`    ComposeDialog(`);
  lines.push(`        onDismissRequest = { dismiss() },`);
  lines.push(`        properties = DialogProperties(`);
  lines.push(`            dismissOnBackPress = ${hasEscape ? "closeOnEscape" : "true"},`);
  lines.push(`            dismissOnClickOutside = true,`);
  lines.push(`            usePlatformDefaultWidth = false,`);
  lines.push(`        ),`);
  lines.push(`    ) {`);
  lines.push(`        Box(Modifier.fillMaxSize(), contentAlignment = ` + (sideEnumName
    ? `when (${placementProp}) {\n` +
      sideValues
        .map((v) => {
          const align = v === "top" ? "TopCenter" : v === "bottom" ? "BottomCenter" : v === "left" ? "CenterStart" : v === "right" ? "CenterEnd" : "Center";
          return `            ${sideEnumName}.${kotlinEnumName(v)} -> Alignment.${align}`;
        })
        .join("\n") +
      `\n        }`
    : "Alignment.Center") + `) {`);
  lines.push(`            Column(`);
  lines.push(`                modifier`);
  if (minWidthSlot || minHeightSlot) {
    lines.push(`                    .requiredSizeIn(minWidth = ${minWidthSlot ? "panelMinWidth" : "0.dp"}, minHeight = ${minHeightSlot ? "panelMinHeight" : "0.dp"})`);
  }
  lines.push(`                    .clip(panelShape)`);
  if (bgSlot) lines.push(`                    .then(if (panelBg != null) Modifier.background(panelBg, panelShape) else Modifier)`);
  if (borderSlot) {
    lines.push(`                    .then(if (panelBorder != null) Modifier.border(` + (borderWidthSlot ? `layeredSlot(${JSON.stringify(borderWidthSlot.name)})?.toFsdsDp() ?: 1.dp` : "1.dp") + `, panelBorder, panelShape) else Modifier)`);
  }
  lines.push(`                    .padding(panelPadding)`);
  lines.push(`,`);
  lines.push(`                verticalArrangement = Arrangement.spacedBy(panelGap),`);
  lines.push(`            ) {`);
  lines.push(`                content()`);
  lines.push(`            }`);
  lines.push(`        }`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}

export function generateJetpackComposeComponentSource(
  ir: ComponentIR,
): string {
  const highlight = collectContentTransforms(ir.dom).find((content) => content.transform === "highlight");
  if (highlight?.linePart && highlight.gutterPart) return emitComposeHighlightComponent(ir, highlight);
  // Collapse intents dispatch FIRST, mirroring the swift dispatcher's
  // precedence: a contract that declares a native collapse owns its
  // realization even if its dom shape would also match a control class.
  if (collectCollapseIntents(ir).has("native-toggle-affordance")) {
    const collapseChannel = ir.behavior.normalizedChannels[0];
    if (!collapseChannel || collapseChannel.valueType !== "boolean") {
      throw new Error(
        `generateJetpackComposeComponentSource: ${ir.name} declares native-toggle-affordance without a boolean value channel`,
      );
    }
    return emitNativeToggleCollapse(ir, collapseChannel);
  }
  if (collectCollapseIntents(ir).has("native-disclosure")) {
    return emitDisclosureComponent(ir);
  }
  if (isReferencedContentComposite(ir)) {
    return emitReferencedContentComposite(ir);
  }
  if (isMediaLeaf(ir)) {
    return emitMediaLeaf(ir);
  }
  if (isCompoundPartComposer(ir)) {
    return emitCompoundPartComposer(ir);
  }
  if (isPassiveTreeItem(ir)) {
    return emitPassiveTreeItem(ir);
  }
  if (isNamedSlotComposer(ir)) {
    return emitNamedSlotComposer(ir);
  }
  if (isReferencedActionComposite(ir)) {
    return emitReferencedActionComposite(ir);
  }
  if (isDateGridSurface(ir)) {
    return emitDateGridSurface(ir);
  }
  if (radioGroupFacts(ir)) {
    return emitRadioGroup(ir, radioGroupFacts(ir)!);
  }
  if (isArrayIteratedList(ir)) {
    return emitArrayIteratedList(ir);
  }
  if (isInteractiveComposite(ir)) {
    return emitInteractiveComposite(ir);
  }
  if (isCountIteratedFieldGroup(ir)) {
    return emitCountFieldGroup(ir);
  }
  if (isLabeledTextControl(ir)) {
    return emitLabeledTextControl(ir);
  }
  if (isSelectionControl(ir)) {
    return emitSelectionControl(ir);
  }
  if (isCoachmarkSurface(ir)) {
    return emitCoachmarkSurface(ir);
  }
  if (isCenteredSurface(ir)) {
    return emitCenteredSurface(ir);
  }
  if (isViewportEdgeSurface(ir)) {
    return emitViewportEdgeSurface(ir);
  }
  if (isProjectedChildrenAction(ir)) {
    return emitProjectedChildrenAction(ir);
  }
  if (isValueChannelControl(ir)) {
    const channel = soleValueChannel(ir)!;
    if (channel.valueType === "boolean") {
      return emitBooleanControl(ir, channel);
    }
    return emitTextControl(ir, channel);
  }
  if (isGlyphHost(ir)) {
    return emitGlyphHost(ir);
  }
  if (isIconDecoratedContent(ir)) {
    return emitIconDecoratedContent(ir);
  }
  if (isPropTextLeaf(ir)) {
    return emitPropTextLeaf(ir);
  }
  if (isExpandableContent(ir)) {
    return emitExpandableContent(ir);
  }
  if (isProgressIndicator(ir)) {
    return emitProgressIndicator(ir);
  }
  if (isBareRuleLeaf(ir)) {
    return emitBareRuleLeaf(ir);
  }
  if (isStaticContent(ir)) {
    return emitStaticContent(ir);
  }
  throw new Error(
    `generateJetpackComposeComponentSource: no emission class matches component "${ir.name}" on jetpack-compose — ` +
      `multi-part anatomy, surfaces, and other collapse classes throw by design until their slices land.`,
  );
}

/**
 * The native-toggle collapse path (Switch/ToggleSwitch via
 * `native-toggle-affordance`), extracted verbatim from the dispatcher —
 * dispatch precedence moved it ahead of the structural classes to mirror
 * the swift dispatcher (a declared collapse owns its realization even when
 * the dom shape would also match a control class).
 */
function emitNativeToggleCollapse(
  ir: ComponentIR,
  channel: NormalizedChannelIR,
): string {
  const name = ir.name;
  const segment = packageSegment(name);
  const valueProp = channel.valueProp;
  const defaultValueProp = channel.defaultValueProp ?? `${valueProp}Default`;
  const changeProp = channel.changeHandlerProp;

  // Size axis: a styled prop referencing a contract-defined enum type.
  const sizeProp = ir.styledProps.find((p) =>
    p.typeRefs.some((ref) => (ir.definedTypes[ref]?.values?.length ?? 0) > 0),
  );
  let sizeEnumName: string | null = null;
  let sizeValues: string[] = [];
  let sizeDefault: string | null = null;
  if (sizeProp) {
    const ref = sizeProp.typeRefs.find(
      (r) => (ir.definedTypes[r]?.values?.length ?? 0) > 0,
    )!;
    const def = ir.definedTypes[ref]!;
    sizeEnumName = ref;
    sizeValues = def.values!;
    const rawDefault = sizeProp.defaultExpr?.replace(/^"|"$/g, "") ?? null;
    sizeDefault = rawDefault;
    for (const value of sizeValues) {
      if (!SIZE_TRACK_DP[value]) {
        throw new Error(
          `generateJetpackComposeComponentSource: no track dimensions for size value "${value}" on ${name} — extend the framework-grammar table or the token graph`,
        );
      }
    }
  }

  const hasDisabled = ir.styledProps.some(
    (p) => p.name === "disabled" && p.propType.kind === "boolean",
  );
  const handled = new Set<string>([
    valueProp,
    defaultValueProp,
    changeProp,
    ...(sizeProp ? [sizeProp.safeName] : []),
    ...(hasDisabled ? ["disabled"] : []),
  ]);
  const stringProps = ir.styledProps.filter(
    (p) => p.propType.kind === "string" && !handled.has(p.name),
  );

  const lines: string[] = [];
  lines.push(
    `// @generated by ds-codegen from components/${name}/${name}.contract.json — do not edit by hand.`,
  );
  lines.push(`package com.fullstackds.components.${segment}`);
  lines.push(``);
  lines.push(`// @generated:start imports`);
  lines.push(`import androidx.compose.foundation.layout.PaddingValues`);
  lines.push(`import androidx.compose.runtime.Composable`);
  lines.push(`import androidx.compose.runtime.getValue`);
  lines.push(`import androidx.compose.runtime.mutableStateOf`);
  lines.push(`import androidx.compose.runtime.remember`);
  lines.push(`import androidx.compose.runtime.setValue`);
  lines.push(`import androidx.compose.ui.Modifier`);
  lines.push(`import androidx.compose.ui.graphics.Color`);
  lines.push(`import androidx.compose.ui.unit.dp`);
  lines.push(`import com.fullstackds.components.toggle.FsdsToggle`);
  lines.push(`import com.fullstackds.components.toggle.FsdsToggleStyle`);
  // Theme-runtime imports land only when the component consumes token slots.
  const checkedTrackSlot = findTokenSlot(
    ir,
    "checked",
    ".color.track.background.default",
  );
  const checkedThumbSlot = findTokenSlot(
    ir,
    "checked",
    ".color.thumb.background.default",
  );
  const rootTrackSlot = findTokenSlot(
    ir,
    "root",
    ".color.track.background.default",
  );
  const rootThumbSlot = findTokenSlot(
    ir,
    "root",
    ".color.thumb.background.default",
  );
  const disabledTrackSlot = findTokenSlot(
    ir,
    "disabled",
    ".color.track.background.default",
  );
  const disabledThumbSlot = findTokenSlot(
    ir,
    "disabled",
    ".color.thumb.background.default",
  );
  const trackBorderSlot = findTokenSlot(
    ir,
    "root",
    ".color.track.border.default",
  );
  const focusSlot = findTokenSlot(ir, "root", ".color.input-outline-focus");
  const pressDurationSlot = findTokenSlot(
    ir,
    "root",
    ".motion.interaction.press.duration",
  );
  const minWidthSlot = findTokenSlot(ir, "root", "box-model.min-width");
  const minHeightSlot = findTokenSlot(ir, "root", "box-model.min-height");
  const paddingInlineStartSlot = findTokenSlot(
    ir,
    "root",
    "box-model.padding-inline-start",
  );
  const paddingInlineEndSlot = findTokenSlot(
    ir,
    "root",
    "box-model.padding-inline-end",
  );
  const paddingBlockStartSlot = findTokenSlot(
    ir,
    "root",
    "box-model.padding-block-start",
  );
  const paddingBlockEndSlot = findTokenSlot(
    ir,
    "root",
    "box-model.padding-block-end",
  );
  const mdWidthSlot = findTokenSlot(ir, "root", ".size.md.track.width");
  const mdHeightSlot = findTokenSlot(ir, "root", ".size.md.track.height");
  const mdSizeValue = sizeDefault?.replace(/^"|"$/g, "") ?? null;
  const anyColorSlot =
    checkedTrackSlot || checkedThumbSlot || rootTrackSlot || rootThumbSlot ||
    disabledTrackSlot || disabledThumbSlot || trackBorderSlot || focusSlot;
  const anyDimSlot =
    mdWidthSlot || mdHeightSlot || minWidthSlot || minHeightSlot ||
    paddingInlineStartSlot || paddingInlineEndSlot || paddingBlockStartSlot ||
    paddingBlockEndSlot;
  const consumesTokens =
    Boolean(anyColorSlot) ||
    Boolean(anyDimSlot) ||
    Boolean(pressDurationSlot) ||
    ir.tokenScopes.some((scope) => scope.values.length > 0);
  if (consumesTokens) {
    lines.push(`import com.fullstackds.tokens.LocalFsdsTheme`);
    if (anyColorSlot) {
      lines.push(`import com.fullstackds.tokens.toFsdsColor`);
    }
    if (anyDimSlot) {
      lines.push(`import com.fullstackds.tokens.toFsdsDp`);
    }
    if (pressDurationSlot) {
      lines.push(`import com.fullstackds.tokens.toFsdsMs`);
    }
  }
  lines.push(`// @generated:end`);
  lines.push(``);
  lines.push(`// @generated:start component`);
  if (sizeEnumName && sizeValues.length > 0) {
    lines.push(
      `/** Size axis lowered from the contract's ${sizeEnumName} type. */`,
    );
    lines.push(
      `enum class ${sizeEnumName} { ${sizeValues.map(kotlinEnumName).join(", ")} }`,
    );
    lines.push(``);
  }
  lines.push(`@Composable`);
  lines.push(`fun ${name}(`);
  // AOSP Compose API guideline: `modifier` is the first optional parameter.
  lines.push(`    modifier: Modifier = Modifier,`);
  lines.push(`    ${valueProp}: Boolean? = null,`);
  lines.push(`    ${defaultValueProp}: Boolean = false,`);
  lines.push(`    ${changeProp}: ((Boolean) -> Unit)? = null,`);
  if (sizeEnumName && sizeDefault) {
    lines.push(
      `    size: ${sizeEnumName} = ${sizeEnumName}.${kotlinEnumName(sizeDefault)},`,
    );
  }
  if (hasDisabled) {
    lines.push(`    enabled: Boolean = true,`);
  }
  for (const prop of stringProps) {
    lines.push(`    ${prop.safeName}: String? = null,`);
  }
  lines.push(`    contentDescription: String? = null,`);
  lines.push(`) {`);
  lines.push(
    `    var uncontrolled${pascalCase(valueProp)} by remember { mutableStateOf(${defaultValueProp}) }`,
  );
  lines.push(
    `    val resolved${pascalCase(valueProp)} = ${valueProp} ?: uncontrolled${pascalCase(valueProp)}`,
  );
  if (consumesTokens) {
    lines.push(`    val fsdsTheme = LocalFsdsTheme.current`);
    // Color vals always exist (nullable) so the style constructor stays
    // uniform; absent slots resolve to null and ledgered constants apply.
    const colorVal = (
      valName: string,
      slot: { name: string } | undefined,
      scopeKey: string,
    ) => {
      if (slot) {
        lines.push(
          `    val ${valName} = fsdsTheme.resolve(${tokenConstName(ir)}[${JSON.stringify(scopeKey)}]?.get(${JSON.stringify(slot.name)}))?.toFsdsColor()`,
        );
      } else {
        lines.push(`    val ${valName}: Color? = null`);
      }
    };
    colorVal("checkedTrackColor", checkedTrackSlot, "checked");
    colorVal("checkedThumbColor", checkedThumbSlot, "checked");
    colorVal("uncheckedTrackColor", rootTrackSlot, "root");
    colorVal("uncheckedThumbColor", rootThumbSlot, "root");
    colorVal("disabledTrackColor", disabledTrackSlot, "disabled");
    colorVal("disabledThumbColor", disabledThumbSlot, "disabled");
    colorVal("trackBorderColor", trackBorderSlot, "root");
    colorVal("focusRingColor", focusSlot, "root");
    if (pressDurationSlot) {
      lines.push(
        `    val pressDurationMs = fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(pressDurationSlot.name)}))?.toFsdsMs() ?: 100`,
      );
    }
    if (minWidthSlot) {
      lines.push(
        `    val minTouchWidth = fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(minWidthSlot.name)}))?.toFsdsDp() ?: 32.dp`,
      );
    }
    if (minHeightSlot) {
      lines.push(
        `    val minTouchHeight = fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(minHeightSlot.name)}))?.toFsdsDp() ?: 32.dp`,
      );
    }
    if (
      paddingInlineStartSlot ||
      paddingInlineEndSlot ||
      paddingBlockStartSlot ||
      paddingBlockEndSlot
    ) {
      const side = (slot: { name: string } | undefined) =>
        slot
          ? `fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(slot.name)}))?.toFsdsDp() ?: 0.dp`
          : `0.dp`;
      lines.push(
        `    val togglePadding = PaddingValues(start = ${side(paddingInlineStartSlot)}, end = ${side(paddingInlineEndSlot)}, top = ${side(paddingBlockStartSlot)}, bottom = ${side(paddingBlockEndSlot)})`,
      );
    }
    lines.push(``);
  }
  if (sizeEnumName) {
    lines.push(``);
    lines.push(`    val (trackWidth, trackHeight) = when (size) {`);
    for (const value of sizeValues) {
      const [w, h] = SIZE_TRACK_DP[value]!;
      // The default size resolves its dims through the token scopes when the
      // graph carries them; non-default sizes keep the framework-grammar
      // table (ledgered gap pending token-graph coverage).
      if (
        value === mdSizeValue &&
        mdWidthSlot &&
        mdHeightSlot
      ) {
        lines.push(
          `        ${sizeEnumName}.${kotlinEnumName(value)} -> (fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(mdWidthSlot.name)}))?.toFsdsDp() ?: ${w}.dp) to (fsdsTheme.resolve(${tokenConstName(ir)}["root"]?.get(${JSON.stringify(mdHeightSlot.name)}))?.toFsdsDp() ?: ${h}.dp)`,
        );
        continue;
      }
      lines.push(
        `        ${sizeEnumName}.${kotlinEnumName(value)} -> ${w}.dp to ${h}.dp`,
      );
    }
    lines.push(`    }`);
  }
  lines.push(``);
  // Custom-painted lowering (FEAT-COMPOSE-CUSTOM-PAINTED-001): the style is
  // resolved from scope data through the theme and handed to the foundation-
  // only substrate; dead-safe color constants mirror the slot fallbacks and
  // fire only when a slot is absent from the graph.
  lines.push(`    val toggleStyle = FsdsToggleStyle(`);
  if (sizeEnumName) {
    lines.push(`        trackWidth = trackWidth,`);
    lines.push(`        trackHeight = trackHeight,`);
  } else {
    const [w, h] = SIZE_TRACK_DP.md ?? [48, 24];
    lines.push(`        trackWidth = ${w}.dp,`);
    lines.push(`        trackHeight = ${h}.dp,`);
  }
  lines.push(
    `        trackColorChecked = checkedTrackColor ?: Color(0xFFD92D2E),`,
  );
  lines.push(
    `        trackColorUnchecked = uncheckedTrackColor ?: Color(0xFFB8B8B8),`,
  );
  lines.push(
    `        trackColorDisabled = disabledTrackColor ?: uncheckedTrackColor ?: Color(0xFFB8B8B8),`,
  );
  lines.push(
    `        thumbColorChecked = checkedThumbColor ?: Color(0xFFFFFFFF),`,
  );
  lines.push(
    `        thumbColorUnchecked = uncheckedThumbColor ?: Color(0xFFFFFFFF),`,
  );
  lines.push(
    `        thumbColorDisabled = disabledThumbColor ?: uncheckedThumbColor ?: Color(0xFFFFFFFF),`,
  );
  lines.push(`        trackBorderColor = trackBorderColor,`);
  lines.push(`        focusRingColor = focusRingColor,`);
  if (pressDurationSlot) {
    lines.push(`        pressDurationMs = pressDurationMs,`);
  }
  if (minWidthSlot) {
    lines.push(`        minTouchWidth = minTouchWidth,`);
  }
  if (minHeightSlot) {
    lines.push(`        minTouchHeight = minTouchHeight,`);
  }
  if (
    paddingInlineStartSlot ||
    paddingInlineEndSlot ||
    paddingBlockStartSlot ||
    paddingBlockEndSlot
  ) {
    lines.push(`        padding = togglePadding,`);
  }
  lines.push(`    )`);
  lines.push(``);
  lines.push(`    FsdsToggle(`);
  lines.push(`        checked = resolved${pascalCase(valueProp)},`);
  lines.push(`        onCheckedChange = { next ->`);
  lines.push(`            if (${valueProp} == null) {`);
  lines.push(
    `                uncontrolled${pascalCase(valueProp)} = next`,
  );
  lines.push(`            }`);
  lines.push(`            ${changeProp}?.invoke(next)`);
  lines.push(`        },`);
  lines.push(`        style = toggleStyle,`);
  if (hasDisabled) {
    lines.push(`        enabled = enabled,`);
  }
  lines.push(`        contentDescription = contentDescription,`);
  lines.push(`        modifier = modifier,`);
  lines.push(`    )`);
  lines.push(`}`);
  lines.push(`// @generated:end`);
  lines.push(``);
  return lines.join("\n");
}
