import { nativeSlotArguments, nativeTokenScopes } from "../../native-token-consumption.js";
/**
 * SwiftUI View struct emission.
 *
 * Two IR-described emission classes:
 *
 * 1. Native-collapse (round 2, CODEGEN-NON-WEB-ROUND2-SWITCH-01): contracts
 *    whose anatomy declares `native-toggle-affordance` (Switch,
 *    ToggleSwitch) collapse to SwiftUI `Toggle(.switch)` — the multi-part
 *    anatomy describes a single native affordance on this target.
 *
 * 2. Projected-children action (FEAT-SWIFTUI-MULTIPART-BUTTON-01): the
 *    first multi-part path. Admits contracts whose root is a native action
 *    affordance (`ir.root.element === "button"`) and whose dom children are
 *    exactly one projected `{tag:"children"}` region — Button is the
 *    corpus consumer. Realized as a SwiftUI `Button` whose label is the
 *    consumer's content, styled from `ir.tokenScopes` through the
 *    hand-authored `Tokens/FsdsTheme.swift` runtime (RN's normal form:
 *    components ship scope data, resolution is theme-driven at render).
 *
 * The emitter consumes only framework-neutral IR facts (channels, props,
 * defined types, collapse intents, root element, dom tree, token scopes) —
 * never component identity. Component names that collide with SwiftUI's own
 * types are exported under an `Fsds` prefix via the reserved-type table
 * below (grammar-level, the SwiftUI analog of Lit's `StackElement` rename).
 *
 * Out of scope: surfaces (Tooltip/Popover), compound parts, slot-projected
 * composers (Card/Field), hand-edit preservation via @custom sections.
 */
import type {
  BindingExpression,
  ComponentIR,
  DomNodeIR,
  NormalizedChannelIR,
  TokenFactIR,
} from "../../../ir.js";
import { collectCollapseIntents, collectContentTransforms, isContentTransform, nativeRootClipping } from "../../../ir.js";
import { emitSwiftHighlightComponent } from "./highlight-source.js";
// Shared native emission-class substrate: the structural class facts this
// emitter dispatches on are target-neutral and live exactly once there
// (FEAT-COMPOSE-ADMISSION-SUBSTRATE-01). This file used to steward them.
import {
  collectDomSlots,
  countChildrenLeaves,
  domGlyph,
  isCountIteratedFieldGroup,
  isArrayIteratedList,
  isDateGridSurface,
  isBareRuleLeaf,
  isGlyphHost,
  isIconDecoratedContent,
  isInteractiveComposite,
  isLabeledTextControl,
  isNamedSlotComposer,
  isProjectedChildrenAction,
  isSelectionControl,
  isStaticContent,
  isValueChannelControl,
  isVisualOnlyLeaf,
  soleValueChannel,
} from "../../native-emission-class.js";
import { swiftLiteral } from "./icon-glyph.js";
import nodeFs from "node:fs";
import nodePath from "node:path";
import { emitNativeRadioGroup } from "./radio-group.js";

const INDENT = "    ";

/**
 * Component type names reserved by SwiftUI itself. A generated type with
 * one of these names would be ambiguous for any consumer importing both
 * modules, so the target exports them with an `Fsds` prefix.
 */
const SWIFTUI_RESERVED_TYPES: ReadonlySet<string> = new Set([
  "Button",
  "Toggle",
  "Slider",
  "Picker",
  "Label",
  "Link",
  "Menu",
  "Table",
  "List",
  "Form",
  "Section",
  "Field",
  "Divider",
]);

export function swiftExportName(componentName: string): string {
  return SWIFTUI_RESERVED_TYPES.has(componentName)
    ? `Fsds${componentName}`
    : componentName;
}

export function generateSwiftUIComponentSource(ir: ComponentIR): string {
  const source = emitSwiftUIComponentSource(ir);
  const used = nativeSlotArguments(source, ["colorSlot", "pxSlot"]);
  return emitSwiftUIComponentSource({ ...ir, tokenScopes: nativeTokenScopes(ir, used, true) });
}

function emitSwiftUIComponentSource(ir: ComponentIR): string {
  const radioGroup = emitNativeRadioGroup(ir, swiftExportName(ir.name));
  if (radioGroup) return [emitImports(), emitTypes(ir), radioGroup].join("\n\n") + "\n";
  const highlight = collectContentTransforms(ir.dom).find((content) => content.transform === "highlight");
  if (highlight?.linePart && highlight.gutterPart) {
    return [emitImports(), emitTypes(ir), emitSwiftHighlightComponent(ir, highlight, emitTokenScopesSection(ir).join("\n"))].join("\n\n") + "\n";
  }
  const collapseIntents = collectCollapseIntents(ir);
  const isNativeToggle = collapseIntents.has("native-toggle-affordance");

  if (isNativeToggle) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitToggleComponent(ir));
    return sections.join("\n\n") + "\n";
  }

  if (isProjectedChildrenAction(ir)) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitActionComponent(ir));
    return sections.join("\n\n") + "\n";
  }

  if (collapseIntents.has("native-disclosure")) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitDisclosureComponent(ir));
    return sections.join("\n\n") + "\n";
  }

  if (isValueChannelControl(ir) && soleValueChannel(ir)!.valueType === "boolean") {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitBooleanControlComponent(ir));
    return sections.join("\n\n") + "\n";
  }

  if (isValueChannelControl(ir)) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitTextControlComponent(ir));
    return sections.join("\n\n") + "\n";
  }

  if (isGlyphHost(ir)) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitGlyphHostComponent(ir));
    return sections.join("\n\n") + "\n";
  }

  if (isDateGridSurface(ir)) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitDateGridSurface(ir));
    return sections.join("\n\n") + "\n";
  }

  if (isArrayIteratedList(ir)) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitArrayIteratedList(ir));
    return sections.join("\n\n") + "\n";
  }

  if (isInteractiveComposite(ir)) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitInteractiveComposite(ir));
    return sections.join("\n\n") + "\n";
  }

  if (isSelectionControl(ir)) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitSelectionControl(ir));
    return sections.join("\n\n") + "\n";
  }

  if (isIconDecoratedContent(ir)) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitIconDecoratedContent(ir));
    return sections.join("\n\n") + "\n";
  }

  if (isCountIteratedFieldGroup(ir)) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitCountFieldGroup(ir));
    return sections.join("\n\n") + "\n";
  }

  if (isLabeledTextControl(ir)) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitLabeledTextControl(ir));
    return sections.join("\n\n") + "\n";
  }

  const dualActionRefs = resolveDualActionRefs(ir);
  if (dualActionRefs) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitDualActionComposite(ir, dualActionRefs));
    return sections.join("\n\n") + "\n";
  }
  if (isPropTextLeaf(ir)) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitPropTextLeaf(ir));
    return sections.join("\n\n") + "\n";
  }

  if (isMediaLeaf(ir)) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitMediaLeaf(ir));
    return sections.join("\n\n") + "\n";
  }

  const srcFallbackRef = resolveSrcFallbackRef(ir);
  if (srcFallbackRef) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitSrcOrFallback(ir, srcFallbackRef));
    return sections.join("\n\n") + "\n";
  }

  if (isExpandableContent(ir)) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitExpandableContent(ir));
    return sections.join("\n\n") + "\n";
  }

  if (ir.root.effectiveRole === "progressbar") {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitProgressComponent(ir));
    return sections.join("\n\n") + "\n";
  }

  if (isBareRuleLeaf(ir) || isVisualOnlyLeaf(ir)) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitLeafComponent(ir));
    return sections.join("\n\n") + "\n";
  }

  if (isStaticContent(ir)) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitStaticContentComponent(ir));
    return sections.join("\n\n") + "\n";
  }

  if (isCompoundPartComposer(ir)) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(
      emitComposerComponent(ir, ir.compoundParts.map((part) => part.name)),
    );
    return sections.join("\n\n") + "\n";
  }

  if (isNamedSlotComposer(ir)) {
    const sections: string[] = [];
    sections.push(emitImports());
    sections.push(emitTypes(ir));
    sections.push(emitComposerComponent(ir, collectDomSlots(ir.dom!)));
    return sections.join("\n\n") + "\n";
  }

  throw new Error(
    `generateSwiftUIComponentSource: no emission class matches ` +
      `component "${ir.name}". Implemented classes: native-toggle-affordance ` +
      `collapse, the projected-children action root (root element button ` +
      `with a single projected children region), and the compound-part ` +
      `composer (root-dom-less passive container), the named-slot ` +
      `composer (dom tree whose leaves are all named slots), and the ` +
      `value-channel text control (input root, one string channel). ` +
      `Component-` +
      `instance leaves (e.g. TextField) and surfaces are not yet ` +
      `implemented.`,
  );
}

/** The single string channel of a text control (gate guarantees it). */
function soleStringChannel(ir: ComponentIR): NormalizedChannelIR {
  return ir.behavior.normalizedChannels.find(
    (c) => c.valueType === "string",
  )!;
}

function emitTextControlComponent(ir: ComponentIR): string {
  const exportName = swiftExportName(ir.name);
  // The class gate guarantees exactly one string channel; the projection
  // below is its realization (value/defaultValue/onChange trio).
  soleStringChannel(ir);
  const chrome = resolveChrome(ir);
  const has = (concern: SlotConcern) => chrome[concern] !== undefined;
  const hasProp = (name: string) => hasConventionalProp(ir, name);

  const lines: string[] = [];
  lines.push("// @generated:start component");
  lines.push(
    `/// Token scope data for ${exportName} (ir.tokenScopes → RN normal ` +
      `form: data consumed through FsdsTheme at render, never resolved ` +
      `constants). A caseless enum namespace because generic types cannot ` +
      `hold static stored properties.`,
  );
  lines.push(`enum ${ir.name}Tokens {`);
  lines.push(`${INDENT}public static let scopes: FsdsComponentTokenScopes = [${ir.tokenScopes.length === 0 ? ":" : ""}`);
  for (const scope of ir.tokenScopes) {
    lines.push(`${INDENT}${INDENT}"${scope.scope}": [`);
    for (const value of scope.values) {
      let literalArg = "";
      const refArg = value.resolvesTo ? `ref: "${value.resolvesTo}"` : "";
      if (value.rawValue) {
        const kind = value.isLiteral ? "literal" : "fallback";
        const dark = graphDarkFor(value);
        literalArg = dark
          ? `${kind}: .adaptive(light: ${swiftLiteral(value.rawValue)}, dark: ${swiftLiteral(dark)})`
          : `${kind}: .string(${swiftLiteral(value.rawValue)})`;
      }
      lines.push(
        `${INDENT}${INDENT}${INDENT}"${value.name}": FsdsComponentTokenDefinition(` +
          `cssVar: "${value.cssVar}", name: "${value.name}"${refArg ? ", " + refArg : ""}${literalArg ? ", " + literalArg : ""}),`,
      );
    }
    lines.push(`${INDENT}${INDENT}],`);
  }
  lines.push(`${INDENT}]`);
  lines.push(`}`);
  lines.push("");
  lines.push(
    `/// Emitted through the value-channel text-control path: input root ` +
      `whose string channel projects through the controllable-state ` +
      `pattern (controlled Binding takes precedence over @State).`,
  );
  if (exportName !== ir.name) {
    lines.push(
      `/// SwiftUI reserves the \`${ir.name}\` type name; this target ` +
        `exports it as \`${exportName}\`.`,
    );
  }
  lines.push(`public struct ${exportName}: View {`);
  lines.push(`${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`);
  lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
  lines.push(`${INDENT}}`);
  lines.push(`${INDENT}@StateObject private var text: ControllableValue<String>`);
  if (hasProp("placeholder")) {
    lines.push(`${INDENT}private let placeholder: String?`);
  }
  if (hasProp("disabled")) {
    lines.push(`${INDENT}private let disabled: Bool`);
  }
  lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params: string[] = [`value: Binding<String>? = nil,`];
  if (hasProp("defaultValue")) {
    params.push(`defaultValue: String = "",`);
  }
  params.push(`onChange: ((String) -> Void)? = nil,`);
  if (hasProp("placeholder")) {
    params.push(`placeholder: String? = nil,`);
  }
  if (hasProp("disabled")) {
    params.push(`disabled: Bool = false,`);
  }
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self._text = StateObject(wrappedValue: ControllableValue(controlled: value, defaultValue: defaultValue, onChange: onChange))`);
  if (hasProp("placeholder")) {
    lines.push(`${INDENT}${INDENT}self.placeholder = placeholder`);
  }
  if (hasProp("disabled")) {
    lines.push(`${INDENT}${INDENT}self.disabled = disabled`);
  }
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push("");
  lines.push(`${INDENT}private var layered: [String: FsdsTokenValue?] {`);
  lines.push(`${INDENT}${INDENT}resolveFsdsLayeredTokens(`);
  lines.push(`${INDENT}${INDENT}${INDENT}fsdsScopes,`);
  lines.push(`${INDENT}${INDENT}${INDENT}fsdsTheme,`);
  lines.push(`${INDENT}${INDENT}${INDENT}layers: ["root"]`);
  lines.push(`${INDENT}${INDENT})`);
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}private func colorSlot(_ suffix: String) -> Color? {`);
  lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.color`);
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}private func pxSlot(_ suffix: String) -> CGFloat? {`);
  lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.px`);
  lines.push(`${INDENT}}`);
  lines.push("");
  const accessors: string[] = [];
  if (has("background")) accessors.push(`${INDENT}private var background: Color { colorSlot("${chrome.background}") ?? .accentColor }`);
  if (has("foreground")) accessors.push(`${INDENT}private var foreground: Color { colorSlot("${chrome.foreground}") ?? .primary }`);
  if (has("blockPadding")) accessors.push(`${INDENT}private var blockPadding: CGFloat { pxSlot("${chrome.blockPadding}") ?? 0 }`);
  if (has("inlinePadding")) accessors.push(`${INDENT}private var inlinePadding: CGFloat { pxSlot("${chrome.inlinePadding}") ?? 0 }`);
  if (has("minHeight")) accessors.push(`${INDENT}private var minHeight: CGFloat { pxSlot("${chrome.minHeight}") ?? 0 }`);
  lines.push(...accessors);
  lines.push("");
  lines.push(`${INDENT}public var body: some View {`);
  const textFieldArgs = [`""`, `text: Binding(`, `${INDENT}${INDENT}get: { text.value },`, `${INDENT}${INDENT}set: { text.set($0) }`, `${INDENT})`];
  lines.push(`${INDENT}${INDENT}SwiftUI.TextField(`);
  lines.push(`${INDENT}${INDENT}${INDENT}"",`);
  lines.push(`${INDENT}${INDENT}${INDENT}text: Binding(`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}get: { text.value },`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}set: { text.set($0) }`);
  if (hasProp("placeholder")) {
    lines.push(`${INDENT}${INDENT}${INDENT}),`);
    lines.push(`${INDENT}${INDENT}${INDENT}prompt: placeholder.map(SwiftUI.Text.init)`);
  } else {
    lines.push(`${INDENT}${INDENT}${INDENT})`);
  }
  lines.push(`${INDENT}${INDENT})`);
  if (has("blockPadding")) lines.push(`${INDENT}${INDENT}${INDENT}.padding(.vertical, blockPadding)`);
  if (has("inlinePadding")) lines.push(`${INDENT}${INDENT}${INDENT}.padding(.horizontal, inlinePadding)`);
  if (has("minHeight")) lines.push(`${INDENT}${INDENT}${INDENT}.frame(minHeight: minHeight)`);
  if (has("background")) lines.push(`${INDENT}${INDENT}${INDENT}.background(background)`);
  if (has("foreground")) lines.push(`${INDENT}${INDENT}${INDENT}.foregroundStyle(foreground)`);
  if (hasProp("disabled")) lines.push(`${INDENT}${INDENT}${INDENT}.disabled(disabled)`);
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  void textFieldArgs;
  return lines.join("\n");
}

/**
 * The boolean-channel input control: input root whose scalar channel is a
 * boolean (Checkbox) lowering to Toggle(.checkbox) with the controllable
 * state projection. `indeterminate` has no SwiftUI Toggle equivalent and
 * is omitted-and-documented.
 */
function emitBooleanControlComponent(ir: ComponentIR): string {
  const exportName = swiftExportName(ir.name);
  const hasDisabled = hasConventionalProp(ir, "disabled");
  const lines: string[] = [];
  lines.push("// @generated:start component");
  lines.push(
    `/// Emitted through the boolean-channel control path: the checked ` +
      `channel projects through the controllable-state pattern onto a ` +
      `native checkbox Toggle.`,
  );
  if (exportName !== ir.name) {
    lines.push(
      `/// SwiftUI reserves the \`${ir.name}\` type name; this target ` +
        `exports it as \`${exportName}\`.`,
    );
  }
  lines.push(`public struct ${exportName}: View {`);
  lines.push(`${INDENT}@StateObject private var checked: ControllableValue<Bool>`);
  if (hasDisabled) lines.push(`${INDENT}private let disabled: Bool`);
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params = ["checked: Binding<Bool>? = nil,", "defaultChecked: Bool = false,", "onChange: ((Bool) -> Void)? = nil,"];
  if (hasDisabled) params.push("disabled: Bool = false");
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self._checked = StateObject(wrappedValue: ControllableValue(controlled: checked, defaultValue: defaultChecked, onChange: onChange))`);
  if (hasDisabled) lines.push(`${INDENT}${INDENT}self.disabled = disabled`);
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push("");
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}Toggle(isOn: Binding(`);
  lines.push(`${INDENT}${INDENT}${INDENT}get: { checked.value },`);
  lines.push(`${INDENT}${INDENT}${INDENT}set: { checked.set($0) }`);
  lines.push(`${INDENT}${INDENT})) {`);
  lines.push(`${INDENT}${INDENT}${INDENT}EmptyView()`);
  lines.push(`${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}.toggleStyle(.checkbox)`);
  if (hasDisabled) lines.push(`${INDENT}${INDENT}.disabled(disabled)`);
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n");
}

/**
 * The progressbar class: root semantics carry role=progressbar (Progress).
 * The contract documents value as 0-100 with omission meaning
 * indeterminate — the emission honors that range, never guessing a scale.
 */
function emitProgressComponent(ir: ComponentIR): string {
  const exportName = swiftExportName(ir.name);
  const hasLabel = hasConventionalProp(ir, "label");
  const lines: string[] = [];
  lines.push("// @generated:start component");
  lines.push(
    `/// Emitted through the progressbar path: the contract's 0-100 value ` +
      `prop drives a native progress indicator; nil renders indeterminate.`,
  );
  lines.push(`public struct ${exportName}: View {`);
  lines.push(`${INDENT}private let value: Double?`);
  if (hasLabel) lines.push(`${INDENT}private let label: String?`);
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params = ["value: Double? = nil,"];
  if (hasLabel) params.push("label: String? = nil");
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self.value = value`);
  if (hasLabel) lines.push(`${INDENT}${INDENT}self.label = label`);
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}Group {`);
  lines.push(`${INDENT}${INDENT}${INDENT}if let value {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}ProgressView(value: value / 100)`);
  lines.push(`${INDENT}${INDENT}${INDENT}} else {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}ProgressView()`);
  lines.push(`${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}}`);
  if (hasLabel) {
    lines.push(`${INDENT}${INDENT}${INDENT}.fsdsAccessibilityLabel(label)`);
  }
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n");
}

/** A bare rule leaf and a visual-only leaf are shared substrate classes
 *  (native-emission-class.ts); this emitter realizes both through the
 *  leaf path below. */
function emitLeafComponent(ir: ComponentIR): string {
  const exportName = swiftExportName(ir.name);
  const isRule = isBareRuleLeaf(ir);
  const hasOrientation = hasConventionalProp(ir, "orientation");
  const hasLabel = hasConventionalProp(ir, "label");
  const lines: string[] = [];
  lines.push("// @generated:start component");
  lines.push(
    isRule
      ? `/// Emitted through the bare-rule leaf path (hr root).`
      : `/// Emitted through the visual-only leaf path: a decorative ` +
        `affordance realized natively.`,
  );
  // Inline enum props (DividerOrientation) lower to local Swift enums —
  // the contract declares them inline rather than as named types.
  const orientationProp = ir.styledProps.find(
    (p) => p.safeName === "orientation",
  );
  const orientationEnumValues =
    orientationProp &&
    typeof orientationProp.propType === "object" &&
    "kind" in orientationProp.propType &&
    orientationProp.propType.kind === "enum"
      ? (orientationProp.propType as { values: string[] }).values
      : null;
  if (orientationEnumValues) {
    lines.push(`public enum ${ir.name}Orientation: String, CaseIterable {`);
    for (const value of orientationEnumValues) {
      lines.push(`${INDENT}case ${swiftCaseDecl(value)}`);
    }
    lines.push(`}`);
    lines.push("");
  }
  if (exportName !== ir.name) {
    lines.push(
      `/// SwiftUI reserves the \`${ir.name}\` type name; this target ` +
        `exports it as \`${exportName}\`.`,
    );
  }
  lines.push(`public struct ${exportName}: View {`);
  if (hasOrientation) lines.push(`${INDENT}private let orientation: ${ir.name}Orientation?`);
  if (hasLabel) lines.push(`${INDENT}private let label: String?`);
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params = [];
  if (hasOrientation) params.push("orientation: " + ir.name + "Orientation? = nil");
  if (hasLabel) params.push("label: String? = nil");
  if (params.length === 0) {
    lines.push(`${INDENT}) {`);
  } else {
    params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
    for (const param of params) lines.push(`${INDENT}${INDENT}${param},`);
    lines[lines.length - 1] = lines[lines.length - 1]!.replace(/,$/, "");
    lines.push(`${INDENT}) {`);
  }
  if (hasOrientation) lines.push(`${INDENT}${INDENT}self.orientation = orientation`);
  if (hasLabel) lines.push(`${INDENT}${INDENT}self.label = label`);
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}public var body: some View {`);
  if (isRule) {
    lines.push(`${INDENT}${INDENT}if orientation == .vertical {`);
    lines.push(`${INDENT}${INDENT}${INDENT}Rectangle()`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}.fill(.separator)`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}.frame(width: 1)`);
    lines.push(`${INDENT}${INDENT}} else {`);
    lines.push(`${INDENT}${INDENT}${INDENT}Divider()`);
    lines.push(`${INDENT}${INDENT}}`);
  } else {
    lines.push(`${INDENT}${INDENT}ProgressView()`);
    if (hasLabel) {
      lines.push(`${INDENT}${INDENT}${INDENT}.fsdsAccessibilityLabel(label)`);
    }
  }
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n");
}

/** A glyph host: some dom node carries the iconGlyph fact (Icon). */
// The glyph-host predicate and its dom-walk helper are shared substrate
// (native-emission-class.ts); this emitter lowers the fact below.

/**
 * The glyph-host class: a component whose dom carries iconGlyph lowers to
 * a registry lookup — the compositional glyph substrate. Size hints from
 * the IR map the size prop to the rendered frame; decorative-by-default
 * comes from the catalog semantics (accessibilityHidden), per the
 * compositional-behavior direction this class exists to serve.
 */
function emitGlyphHostComponent(ir: ComponentIR): string {
  const glyph = domGlyph(ir)!;
  const nameProp = glyph.namePropName;
  const sizeProp = glyph.sizePropName;
  const hints = glyph.sizeHints;
  const sizeType = ir.styledProps.find((p) => p.safeName === sizeProp)
    ?.typeRefs.find((ref) => ir.definedTypes[ref]);
  const defaultSize = sizeProp
    ? findPropDefaultOrNull(ir, sizeProp) ?? Object.keys(hints ?? {})[0]
    : null;

  // Inline size unions (Icon has no named type) synthesize a local enum
  // from the hint keys — the Divider inline-enum precedent.
  const hintMembers = Object.keys(hints ?? {});
  const synthesizedSizeType = !sizeType && hintMembers.length > 0
    ? `${ir.name}Size`
    : null;
  const sizeTypeName = sizeType ?? synthesizedSizeType;
  const hintsUsable = sizeTypeName !== null && defaultSize !== null;

  const lines: string[] = [];
  lines.push("// @generated:start component");
  lines.push(
    `/// Emitted through the glyph-host path: the dom carries iconGlyph, ` +
      `so this component is a registry lookup over the shared glyph ` +
      `substrate — decorative-by-default per catalog semantics.`,
  );
  if (synthesizedSizeType) {
    lines.push(`public enum ${synthesizedSizeType}: String, CaseIterable {`);
    for (const member of hintMembers) {
      lines.push(`${INDENT}case ${swiftCaseDecl(member)}`);
    }
    lines.push(`}`);
    lines.push("");
  }
  const exportName = swiftExportName(ir.name);
  if (exportName !== ir.name) {
    lines.push(
      `/// SwiftUI reserves the \`${ir.name}\` type name; this target ` +
        `exports it as \`${exportName}\`.`,
    );
  }
  lines.push(`public struct ${exportName}: View {`);
  lines.push(`${INDENT}private let ${nameProp}: String`);
  if (sizeProp && hintsUsable) {
    lines.push(`${INDENT}private let ${sizeProp}: ${sizeTypeName}`);
  }
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params = [`${nameProp}: String,`];
  if (sizeProp && hintsUsable) {
    params.push(`${sizeProp}: ${sizeTypeName} = .${swiftCaseRef(defaultSize!)}`);
  }
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self.${nameProp} = ${nameProp}`);
  if (sizeProp && hintsUsable) {
    lines.push(`${INDENT}${INDENT}self.${sizeProp} = ${sizeProp}`);
  }
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}private var glyphSize: CGFloat {`);
  if (sizeProp && sizeTypeName && hints) {
    lines.push(`${INDENT}${INDENT}switch ${sizeProp} {`);
    for (const [member, px] of Object.entries(hints)) {
      lines.push(`${INDENT}${INDENT}case .${swiftCaseRef(member)}: return ${px}`);
    }
    lines.push(`${INDENT}${INDENT}}`);
  } else {
    lines.push(`${INDENT}${INDENT}24`);
  }
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}GlyphCatalog.glyph(named: ${nameProp}, size: glyphSize)`);
  lines.push(`${INDENT}${INDENT}${INDENT}.accessibilityHidden(`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}GlyphCatalog.decorativeDefaults.contains(${nameProp})`);
  lines.push(`${INDENT}${INDENT}${INDENT})`);
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n");
}

// The selection-control predicate is shared substrate
// (native-emission-class.ts). This emitter lowers the selection realization.


function emitSelectionControl(ir: ComponentIR): string {
  const exportName = swiftExportName(ir.name);
  const optionType = "SelectOption";
  const hasMultiple = hasConventionalProp(ir, "multiple");
  const hasDisabled = hasConventionalProp(ir, "disabled");
  const hasSize = ir.definedTypes.SelectSize !== undefined;
  const sizeType = "SelectSize";

  // The options type is a contract alias ({ value: string; label: string;
  // disabled?: boolean }) — lower it to an Identifiable Swift struct so
  // ForEach can iterate it. Member names/types come from the alias.
  const optionAlias = ir.definedTypes[optionType]?.alias ?? "";
  const memberRe = /(\w+)\??:\s*([^;}]+)/g;
  const members: { name: string; type: string; optional: boolean }[] = [];
  let m: RegExpExecArray | null;
  while ((m = memberRe.exec(optionAlias)) !== null) {
    members.push({
      name: m[1]!,
      type: m[2]!.trim(),
      optional: m[0].includes("?:"),
    });
  }
  const swiftTypeFor = (t: string): string =>
    t === "string" ? "String" : t === "boolean" ? "Bool" : t;

  const lines: string[] = [];
  lines.push("// @generated:start component");
  if (members.length > 0) {
    lines.push(`public struct ${optionType}: Identifiable {`);
    lines.push(`${INDENT}public var id: String { value }`);
    for (const member of members) {
      lines.push(
        `${INDENT}public let ${member.name}: ${swiftTypeFor(member.type)}${member.optional ? "?" : ""}`,
      );
    }
    lines.push(`${INDENT}public init(`);
    const initParams = members.map(
      (member) =>
        `${member.name}: ${swiftTypeFor(member.type)}${member.optional ? "? = nil" : ""}`,
    );
    initParams[initParams.length - 1] = initParams[initParams.length - 1]!;
    lines.push(initParams.map((p2) => `${INDENT}${INDENT}${p2}`).join(","));
    lines.push(`${INDENT}) {`);
    for (const member of members) {
      lines.push(`${INDENT}${INDENT}self.${member.name} = ${member.name}`);
    }
    lines.push(`${INDENT}}`);
    lines.push(`}`);
    lines.push("");
  }
  lines.push(
    `/// Emitted through the selection-control path: the union channel ` +
      `lowers to SelectionState (mode-gated replace/toggle — the ` +
      `channelUpdate grammar); Menu realizes the combobox substrate; ` +
      `the channelCall binding is a Menu item action.`,
  );
  if (exportName !== ir.name) {
    lines.push(
      `/// SwiftUI reserves the \`${ir.name}\` type name; this target ` +
        `exports it as \`${exportName}\`.`,
    );
  }
  lines.push(`public struct ${exportName}: View {`);
  lines.push(`${INDENT}private let options: [${optionType}]`);
  lines.push(`${INDENT}@StateObject private var selection: SelectionState`);
  lines.push(`${INDENT}@StateObject private var open: ControllableValue<Bool>`);
  if (hasSize) lines.push(`${INDENT}private let size: ${sizeType}`);
  if (hasDisabled) lines.push(`${INDENT}private let disabled: Bool`);
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params = [
    "options: [" + optionType + "] = [],",
    "selection: Binding<String>? = nil,",
    'defaultSelection: String = "",',
    "multipleSelection: Binding<[String]>? = nil,",
    "defaultMultipleSelection: [String] = [],",
  ];
  if (hasMultiple) params.push("multiple: Bool = false,");
  params.push("onSelectionChange: ((Any) -> Void)? = nil,");
  params.push("open: Binding<Bool>? = nil,");
  params.push("defaultOpen: Bool = false,");
  params.push("onOpenChange: ((Bool) -> Void)? = nil,");
  if (hasSize) params.push("size: " + sizeType + " = .md,");
  if (hasDisabled) params.push("disabled: Bool = false");
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self.options = options`);
  lines.push(`${INDENT}${INDENT}self._selection = StateObject(wrappedValue: SelectionState(`);
  lines.push(`${INDENT}${INDENT}${INDENT}selection: selection,`);
  lines.push(`${INDENT}${INDENT}${INDENT}defaultSelection: defaultSelection,`);
  lines.push(`${INDENT}${INDENT}${INDENT}multipleSelection: multipleSelection,`);
  lines.push(`${INDENT}${INDENT}${INDENT}defaultMultipleSelection: defaultMultipleSelection,`);
  lines.push(`${INDENT}${INDENT}${INDENT}multiple: ${hasMultiple ? "multiple" : "false"},`);
  lines.push(`${INDENT}${INDENT}${INDENT}onSelectionChange: onSelectionChange`);
  lines.push(`${INDENT}${INDENT}))`);
  lines.push(`${INDENT}${INDENT}self._open = StateObject(wrappedValue: ControllableValue(controlled: open, defaultValue: defaultOpen, onChange: onOpenChange))`);
  if (hasSize) lines.push(`${INDENT}${INDENT}self.size = size`);
  if (hasDisabled) lines.push(`${INDENT}${INDENT}self.disabled = disabled`);
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}private var triggerLabel: String {`);
  lines.push(`${INDENT}${INDENT}selection.multiple`);
  lines.push(`${INDENT}${INDENT}${INDENT}? options.filter { selection.isSelected($0.value) }.map(\\.label).joined(separator: ", ")`);
  lines.push(`${INDENT}${INDENT}${INDENT}: (options.first { selection.isSelected($0.value) }?.label ?? selection.single)`);
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}Menu {`);
  lines.push(`${INDENT}${INDENT}${INDENT}ForEach(options) { option in`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}Button {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}selection.apply(option.value)`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}} label: {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}if selection.isSelected(option.value) {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}SwiftUI.Image(systemName: "checkmark")`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}SwiftUI.Text(option.label)`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}.disabled(option.disabled ?? false)`);
  lines.push(`${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}} label: {`);
  lines.push(`${INDENT}${INDENT}${INDENT}HStack {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}SwiftUI.Text(triggerLabel)`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}SwiftUI.Image(systemName: "chevron.up.and.down")`);
  lines.push(`${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}}`);
  if (hasDisabled) lines.push(`${INDENT}${INDENT}.disabled(disabled)`);
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n");
}

/**
 * The icon-decorated content class: a passive root whose anatomy pairs
 * an icon part (fed by an `icon` string prop) with exactly one children
 * region — Alert, Status, Badge. Glyph rendering composes the shared
 * GlyphCatalog registry; Chip is excluded by the component-instance leaf
 * rule (the TextField precedent).
 */
// The icon-decorated-content predicate is shared substrate
// (native-emission-class.ts): one consumer region beside an author-
// addressable icon (string registry lookup or ReactNode region).

function emitIconDecoratedContent(ir: ComponentIR): string {
  const exportName = swiftExportName(ir.name);
  const chrome = resolveChrome(ir);
  const axes = collectVariantAxes(ir);
  const layerInfo = emitLayerExpressions(axes);
  const layerArray = ['"root"', ...layerInfo.expressions];
  const layersExpr = layerInfo.needsCompactMap
    ? `[${layerArray.join(", ")}].compactMap { $0 }`
    : `[${layerArray.join(", ")}]`;

  // A string icon prop feeds the registry; a ReactNode icon prop is a
  // consumer region (corpus fact, not component identity).
  const iconIsRegistry = ir.styledProps.some(
    (p) => p.safeName === "icon" && p.type === "string",
  );

  const lines: string[] = [];
  lines.push("// @generated:start component");
  if (ir.tokenScopes.length > 0) lines.push(...emitTokenScopesSection(ir));
  lines.push("");
  lines.push(
    `/// Emitted through the icon-decorated content path: the icon prop ` +
      `feeds the shared GlyphCatalog registry; content is the consumer's ` +
      `single region.`,
  );
  if (exportName !== ir.name) {
    lines.push(
      `/// SwiftUI reserves the \`${ir.name}\` type name; this target ` +
        `exports it as \`${exportName}\`.`,
    );
  }
  lines.push(
    `public struct ${exportName}${iconIsRegistry ? "<Content: View>" : "<IconRegion: View, Content: View>"}: View {`,
  );
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`);
    lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
    lines.push(`${INDENT}}`);
  }
  if (iconIsRegistry) {
    lines.push(`${INDENT}private let icon: String?`);
  } else {
    lines.push(`${INDENT}private let iconRegion: IconRegion`);
  }
  for (const axis of axes) {
    lines.push(
      `${INDENT}private let ${escapeSwiftKeyword(axis.prop)}: ${axis.typeName}${axis.defaultMember === null ? "?" : ""}`,
    );
  }
  lines.push(`${INDENT}private let content: Content`);
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
  }
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params: string[] = iconIsRegistry
    ? ["icon: String? = nil,"]
    : ["@ViewBuilder icon: () -> IconRegion = { EmptyView() },"];
  for (const axis of axes) {
    params.push(
      axis.defaultMember !== null
        ? `${escapeSwiftKeyword(axis.prop)}: ${axis.typeName} = .${swiftCaseRef(axis.defaultMember)},`
        : `${escapeSwiftKeyword(axis.prop)}: ${axis.typeName}? = nil,`,
    );
  }
  params.push("@ViewBuilder content: () -> Content");
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  if (iconIsRegistry) {
    lines.push(`${INDENT}${INDENT}self.icon = icon`);
  } else {
    lines.push(`${INDENT}${INDENT}self.iconRegion = icon()`);
  }
  for (const axis of axes) {
    lines.push(
      `${INDENT}${INDENT}self.${escapeSwiftKeyword(axis.prop)} = ${escapeSwiftKeyword(axis.prop)}`,
    );
  }
  lines.push(`${INDENT}${INDENT}self.content = content()`);
  lines.push(`${INDENT}}`);
  if (ir.tokenScopes.length > 0) {
    lines.push("");
    lines.push(`${INDENT}private var layered: [String: FsdsTokenValue?] {`);
    lines.push(`${INDENT}${INDENT}resolveFsdsLayeredTokens(`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsScopes,`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsTheme,`);
    lines.push(`${INDENT}${INDENT}${INDENT}layers: ${layersExpr}`);
    lines.push(`${INDENT}${INDENT})`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func colorSlot(_ suffix: String) -> Color? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.color`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func pxSlot(_ suffix: String) -> CGFloat? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.px`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(
      ...emitChromeAccessorLines(chrome, [
        "background", "foreground", "borderColor", "borderWidth",
        "radius", "blockPadding", "inlinePadding", "gap", "minHeight",
      ]),
    );
  }
  lines.push("");
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}HStack(spacing: ${chrome.gap ? "gap" : "nil"}) {`);
  if (iconIsRegistry) {
    lines.push(`${INDENT}${INDENT}${INDENT}if let icon {`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}GlyphCatalog.glyph(named: icon, size: 16)`);
    lines.push(`${INDENT}${INDENT}${INDENT}}`);
  } else {
    lines.push(`${INDENT}${INDENT}${INDENT}iconRegion`);
  }
  lines.push(`${INDENT}${INDENT}${INDENT}content`);
  lines.push(`${INDENT}${INDENT}}`);
  if (chrome.blockPadding) lines.push(`${INDENT}${INDENT}${INDENT}.padding(.vertical, blockPadding)`);
  if (chrome.inlinePadding) lines.push(`${INDENT}${INDENT}${INDENT}.padding(.horizontal, inlinePadding)`);
  if (chrome.background) lines.push(`${INDENT}${INDENT}${INDENT}.background(background)`);
  if (chrome.radius) lines.push(`${INDENT}${INDENT}${INDENT}.clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))`);
  if (chrome.borderColor && chrome.borderWidth) {
    const radiusExpr = chrome.radius ? "radius" : "0";
    lines.push(`${INDENT}${INDENT}${INDENT}.overlay(RoundedRectangle(cornerRadius: ${radiusExpr}, style: .continuous).stroke(borderColor, lineWidth: borderWidth))`);
  }
  if (chrome.foreground) lines.push(`${INDENT}${INDENT}${INDENT}.foregroundStyle(foreground)`);
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n");
}

// The array-iterated list predicate is shared substrate
// (native-emission-class.ts): one array channel over an array-iteration
// node. The channel rides ControllableValue<[String]>; ForEach realizes
// the iteration.

function emitArrayIteratedList(ir: ComponentIR): string {
  const exportName = swiftExportName(ir.name);
  const chrome = resolveChrome(ir);
  const channel = ir.behavior.normalizedChannels[0]!;
  const hasAria = hasConventionalProp(ir, "ariaLabel");
  const lines: string[] = [];
  lines.push("// @generated:start component");
  if (ir.tokenScopes.length > 0) lines.push(...emitTokenScopesSection(ir));
  lines.push("");
  lines.push(
    `/// Emitted through the array-iterated list path: the ` +
      `${channel.name} channel rides ControllableValue<[String]>; ForEach ` +
      `renders each item.`,
  );
  if (exportName !== ir.name) {
    lines.push(`/// SwiftUI reserves \`${ir.name}\`; exported as \`${exportName}\`.`);
  }
  lines.push(`public struct ${exportName}: View {`);
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`);
    lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
    lines.push(`${INDENT}}`);
  }
  lines.push(`${INDENT}@StateObject private var ${channel.name}: ControllableValue<[String]>`);
  if (hasAria) lines.push(`${INDENT}private let accessibilityLabel: String?`);
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
  }
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params = [`${channel.name}: Binding<[String]>? = nil,`, `default${swiftCase(capitalize(channel.name))}: [String] = [],`, `on${swiftCase(capitalize(channel.name))}Change: (([String]) -> Void)? = nil,`];
  if (hasAria) params.push("accessibilityLabel: String? = nil");
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self._${channel.name} = StateObject(wrappedValue: ControllableValue(controlled: ${channel.name}, defaultValue: default${swiftCase(capitalize(channel.name))}, onChange: on${swiftCase(capitalize(channel.name))}Change))`);
  if (hasAria) lines.push(`${INDENT}${INDENT}self.accessibilityLabel = accessibilityLabel`);
  lines.push(`${INDENT}}`);
  if (ir.tokenScopes.length > 0) {
    lines.push("");
    lines.push(`${INDENT}private var layered: [String: FsdsTokenValue?] {`);
    lines.push(`${INDENT}${INDENT}resolveFsdsLayeredTokens(`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsScopes,`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsTheme,`);
    lines.push(`${INDENT}${INDENT}${INDENT}layers: ["root"]`);
    lines.push(`${INDENT}${INDENT})`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func colorSlot(_ suffix: String) -> Color? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.color`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func pxSlot(_ suffix: String) -> CGFloat? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.px`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(...emitChromeAccessorLines(chrome, ["background","foreground","borderColor","radius","blockPadding","inlinePadding","gap"]));
    lines.push("");
  }
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}VStack(spacing: ${chrome.gap ? "gap" : "4"}) {`);
  lines.push(`${INDENT}${INDENT}${INDENT}ForEach(${channel.name}.value, id: \\.self) { item in`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}Button {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}${channel.name}.set(${channel.name}.value.filter { $0 != item })`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}} label: {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}SwiftUI.Text(item)`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}.buttonStyle(.plain)`);
  lines.push(`${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}}`);
  if (hasAria) lines.push(`${INDENT}${INDENT}${INDENT}.fsdsAccessibilityLabel(accessibilityLabel)`);
  if (chrome.foreground) lines.push(`${INDENT}${INDENT}${INDENT}.foregroundStyle(foreground)`);
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n");
}

// The interactive-composite predicate is shared substrate
// (native-emission-class.ts): one scalar channel over a trigger+content
// anatomy. This emitter lowers the compound-context realization.


function emitInteractiveComposite(ir: ComponentIR): string {
  const exportName = swiftExportName(ir.name);
  const chrome = resolveChrome(ir);
  const channel = ir.behavior.normalizedChannels[0]!;
  const isUnion = (channel.valueType ?? "").includes("|");
  // v1: union openness lowers to its multi member (string[] panel keys)
  const chanType = isUnion ? "[String]" : "String";
  const fieldDefault = isUnion ? "[]" : '""';
  const hasDisabled = hasConventionalProp(ir, "disabled");
  const hasAria = hasConventionalProp(ir, "ariaLabel");
  const lines: string[] = [];
  lines.push("// @generated:start component");
  if (ir.tokenScopes.length > 0) lines.push(...emitTokenScopesSection(ir));
  lines.push("");
  lines.push(
    `/// Emitted through the interactive-composite path: the ` +
      `${channel.name} channel gates content visibility (union channel ` +
      `lowers to its multi member v1).`,
  );
  if (exportName !== ir.name) {
    lines.push(`/// SwiftUI reserves \`${ir.name}\`; exported as \`${exportName}\`.`);
  }
  lines.push(`public struct ${exportName}<Content: View>: View {`);
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`);
    lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
    lines.push(`${INDENT}}`);
  }
  lines.push(`${INDENT}@StateObject private var ${channel.name}: ControllableValue<${chanType}>`);
  if (hasDisabled) lines.push(`${INDENT}private let disabled: Bool`);
  if (hasAria) lines.push(`${INDENT}private let accessibilityLabel: String?`);
  lines.push(`${INDENT}private let content: Content`);
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
  }
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params = [`${channel.name}: Binding<${chanType}>? = nil,`, `default${swiftCase(capitalize(channel.name))}: ${chanType} = ${fieldDefault},`, `on${swiftCase(capitalize(channel.name))}Change: ((${chanType}) -> Void)? = nil,`];
  if (hasDisabled) params.push("disabled: Bool = false,");
  if (hasAria) params.push("accessibilityLabel: String? = nil,");
  params.push("@ViewBuilder content: () -> Content");
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self._${channel.name} = StateObject(wrappedValue: ControllableValue(controlled: ${channel.name}, defaultValue: default${swiftCase(capitalize(channel.name))}, onChange: on${swiftCase(capitalize(channel.name))}Change))`);
  if (hasDisabled) lines.push(`${INDENT}${INDENT}self.disabled = disabled`);
  if (hasAria) lines.push(`${INDENT}${INDENT}self.accessibilityLabel = accessibilityLabel`);
  lines.push(`${INDENT}${INDENT}self.content = content()`);
  lines.push(`${INDENT}}`);
  if (ir.tokenScopes.length > 0) {
    lines.push("");
    lines.push(`${INDENT}private var layered: [String: FsdsTokenValue?] {`);
    lines.push(`${INDENT}${INDENT}resolveFsdsLayeredTokens(`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsScopes,`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsTheme,`);
    lines.push(`${INDENT}${INDENT}${INDENT}layers: ["root"]`);
    lines.push(`${INDENT}${INDENT})`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func colorSlot(_ suffix: String) -> Color? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.color`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func pxSlot(_ suffix: String) -> CGFloat? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.px`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(...emitChromeAccessorLines(chrome, ["background","foreground","borderColor","radius","blockPadding","inlinePadding","gap"]));
    lines.push("");
  }
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}VStack(spacing: ${chrome.gap ? "gap" : "4"}) {`);
  lines.push(`${INDENT}${INDENT}${INDENT}content`);
  lines.push(`${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}${INDENT}.environmentObject(${channel.name})`);
  if (hasAria) lines.push(`${INDENT}${INDENT}${INDENT}.fsdsAccessibilityLabel(accessibilityLabel)`);
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("");
  // Press-wired subcomponents, keyed off the channel's IR type — the swift
  // lowering of the web/RN compound-context pattern: the root injects the
  // channel (environmentObject above); the subcomponents consume it and
  // mutate it through ControllableValue.set, never local divergent state.
  // A subcomponent used outside its root traps at @EnvironmentObject access,
  // mirroring the RN compound-context throw.
  if (isUnion) {
    lines.push(
      `/// Disclosure item: press toggles \`${channel.name}\` membership for \`key\`; content visible while contained.`,
    );
    lines.push(`public struct ${exportName}Item<Trigger: View, Content: View>: View {`);
    lines.push(`${INDENT}@EnvironmentObject var ${channel.name}: ControllableValue<[String]>`);
    lines.push(`${INDENT}private let key: String`);
    lines.push(`${INDENT}private let trigger: Trigger`);
    lines.push(`${INDENT}private let content: Content`);
    lines.push(`${INDENT}public init(key: String, @ViewBuilder trigger: () -> Trigger, @ViewBuilder content: () -> Content) {`);
    lines.push(`${INDENT}${INDENT}self.key = key`);
    lines.push(`${INDENT}${INDENT}self.trigger = trigger()`);
    lines.push(`${INDENT}${INDENT}self.content = content()`);
    lines.push(`${INDENT}}`);
    lines.push(`${INDENT}public var body: some View {`);
    lines.push(`${INDENT}${INDENT}VStack(spacing: 4) {`);
    lines.push(`${INDENT}${INDENT}${INDENT}Button {`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}let next = ${channel.name}.value.contains(key)`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}? ${channel.name}.value.filter { $0 != key }`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}: ${channel.name}.value + [key]`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${channel.name}.set(next)`);
    lines.push(`${INDENT}${INDENT}${INDENT}} label: {`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}trigger`);
    lines.push(`${INDENT}${INDENT}${INDENT}}`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}.buttonStyle(.plain)`);
    lines.push(`${INDENT}${INDENT}${INDENT}if ${channel.name}.value.contains(key) {`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}content`);
    lines.push(`${INDENT}${INDENT}${INDENT}} else {`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}EmptyView()`);
    lines.push(`${INDENT}${INDENT}${INDENT}}`);
    lines.push(`${INDENT}${INDENT}}`);
    lines.push(`${INDENT}}`);
    lines.push(`}`);
  } else {
    lines.push(`/// Press-wired tab: sets the \`${channel.name}\` channel to \`value\`.`);
    lines.push(`public struct ${exportName}Tab: View {`);
    lines.push(`${INDENT}@EnvironmentObject var ${channel.name}: ControllableValue<String>`);
    lines.push(`${INDENT}private let value: String`);
    lines.push(`${INDENT}private let label: String`);
    lines.push(`${INDENT}public init(value: String, label: String) {`);
    lines.push(`${INDENT}${INDENT}self.value = value`);
    lines.push(`${INDENT}${INDENT}self.label = label`);
    lines.push(`${INDENT}}`);
    lines.push(`${INDENT}public var body: some View {`);
    lines.push(`${INDENT}${INDENT}Button(label) { ${channel.name}.set(value) }`);
    lines.push(`${INDENT}${INDENT}${INDENT}.buttonStyle(.plain)`);
    lines.push(`${INDENT}}`);
    lines.push(`}`);
    lines.push("");
    lines.push(`/// Panel region: content visible only while the \`${channel.name}\` channel equals \`value\`.`);
    lines.push(`public struct ${exportName}Panel<Content: View>: View {`);
    lines.push(`${INDENT}@EnvironmentObject var ${channel.name}: ControllableValue<String>`);
    lines.push(`${INDENT}private let value: String`);
    lines.push(`${INDENT}private let content: Content`);
    lines.push(`${INDENT}public init(value: String, @ViewBuilder content: () -> Content) {`);
    lines.push(`${INDENT}${INDENT}self.value = value`);
    lines.push(`${INDENT}${INDENT}self.content = content()`);
    lines.push(`${INDENT}}`);
    lines.push(`${INDENT}public var body: some View {`);
    lines.push(`${INDENT}${INDENT}if ${channel.name}.value == value {`);
    lines.push(`${INDENT}${INDENT}${INDENT}content`);
    lines.push(`${INDENT}${INDENT}} else {`);
    lines.push(`${INDENT}${INDENT}${INDENT}EmptyView()`);
    lines.push(`${INDENT}${INDENT}}`);
    lines.push(`${INDENT}}`);
    lines.push(`}`);
  }
  lines.push("// @generated:end");
  void hasDisabled;
  return lines.join("\n");
}

function emitDateGridSurface(ir: ComponentIR): string {
  const exportName = swiftExportName(ir.name);
  const chrome = resolveChrome(ir);
  const hasDisabled = hasConventionalProp(ir, "disabled");
  const lines: string[] = [];
  lines.push("// @generated:start component");
  if (ir.tokenScopes.length > 0) lines.push(...emitTokenScopesSection(ir));
  lines.push("");
  lines.push(
    `/// Emitted through the date-grid surface path: chrome shell over the ` +
      `value channel; grid realization is a recorded follow-up.`,
  );
  lines.push(`public struct ${exportName}: View {`);
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`);
    lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
    lines.push(`${INDENT}}`);
  }
  lines.push(`${INDENT}@StateObject private var value: ControllableValue<Date?>`);
  if (hasDisabled) lines.push(`${INDENT}private let disabled: Bool`);
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
  }
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params = ["value: Binding<Date?>? = nil,", "defaultValue: Date? = nil,", "onChange: ((Date?) -> Void)? = nil,"];
  if (hasDisabled) params.push("disabled: Bool = false");
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self._value = StateObject(wrappedValue: ControllableValue(controlled: value, defaultValue: defaultValue, onChange: onChange))`);
  if (hasDisabled) lines.push(`${INDENT}${INDENT}self.disabled = disabled`);
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}VStack(spacing: 8) {`);
  lines.push(`${INDENT}${INDENT}${INDENT}SwiftUI.DatePicker(`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}"",`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}selection: Binding(`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}get: { value.value ?? Date() },`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}set: { value.set($0) }`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT})`);
  lines.push(`${INDENT}${INDENT}${INDENT})`);
  if (hasDisabled) lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}.disabled(disabled)`);
  lines.push(`${INDENT}${INDENT}}`);
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  void chrome;
  return lines.join("\n");
}

// The labeled text-control predicate is shared substrate
// (native-emission-class.ts): one string channel over an input under a div root.


/** Named-slot region closures present in the dom (label/description/error). */
function domSlotNames(ir: ComponentIR): string[] {
  const out: string[] = [];
  const walk = (node: NonNullable<ComponentIR["dom"]>): void => {
    const slotName = (node as { slotName?: string }).slotName;
    if (node.tag === "slot" && slotName) out.push(slotName);
    (node.children ?? []).forEach(walk);
  };
  if (ir.dom) walk(ir.dom);
  return out;
}

function emitLabeledTextControl(ir: ComponentIR): string {
  const exportName = swiftExportName(ir.name);
  const chrome = resolveChrome(ir);
  const slots = domSlotNames(ir);
  const hasDisabled = hasConventionalProp(ir, "disabled");

  const lines: string[] = [];
  lines.push("// @generated:start component");
  if (ir.tokenScopes.length > 0) lines.push(...emitTokenScopesSection(ir));
  lines.push("");
  lines.push(
    `/// Emitted through the labeled text-control path: the string channel ` +
      `rides ControllableValue<String>; slot regions are consumer closures.`,
  );
  const generics = slots.map((slot) => `${swiftCase(capitalize(slot))}Region: View`);
  lines.push(
    `public struct ${exportName}${generics.length ? "<" + generics.join(", ") + ">" : ""}: View {`,
  );
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`);
    lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
    lines.push(`${INDENT}}`);
  }
  lines.push(`${INDENT}@StateObject private var value: ControllableValue<String>`);
  for (const slot of slots) {
    lines.push(`${INDENT}private let ${slot}: ${swiftCase(capitalize(slot))}Region`);
  }
  if (hasDisabled) lines.push(`${INDENT}private let disabled: Bool`);
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
  }
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params = [
    "value: Binding<String>? = nil,",
    'defaultValue: String = "",',
    "onChange: ((String) -> Void)? = nil,",
  ];
  slots.forEach((slot) => {
    params.push(
      `@ViewBuilder ${slot}: () -> ${swiftCase(capitalize(slot))}Region = { EmptyView() },`,
    );
  });
  if (hasDisabled) params.push("disabled: Bool = false");
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self._value = StateObject(wrappedValue: ControllableValue(controlled: value, defaultValue: defaultValue, onChange: onChange))`);
  for (const slot of slots) {
    lines.push(`${INDENT}${INDENT}self.${slot} = ${slot}()`);
  }
  if (hasDisabled) lines.push(`${INDENT}${INDENT}self.disabled = disabled`);
  lines.push(`${INDENT}}`);
  if (ir.tokenScopes.length > 0) {
    lines.push("");
    lines.push(`${INDENT}private var layered: [String: FsdsTokenValue?] {`);
    lines.push(`${INDENT}${INDENT}resolveFsdsLayeredTokens(`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsScopes,`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsTheme,`);
    lines.push(`${INDENT}${INDENT}${INDENT}layers: ["root"]`);
    lines.push(`${INDENT}${INDENT})`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func colorSlot(_ suffix: String) -> Color? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.color`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func pxSlot(_ suffix: String) -> CGFloat? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.px`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(
      ...emitChromeAccessorLines(chrome, [
        "background", "foreground", "borderColor", "radius",
        "blockPadding", "inlinePadding", "gap",
      ]),
    );
    lines.push("");
  }
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}VStack(spacing: ${chrome.gap ? "gap" : "4"}) {`);
  if (slots.includes("label")) lines.push(`${INDENT}${INDENT}${INDENT}label`);
  lines.push(`${INDENT}${INDENT}${INDENT}SwiftUI.TextField("", text: value.binding())`);
  if (hasDisabled) lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}.disabled(disabled)`);
  if (slots.includes("description")) lines.push(`${INDENT}${INDENT}${INDENT}description`);
  if (slots.includes("error")) lines.push(`${INDENT}${INDENT}${INDENT}error`);
  lines.push(`${INDENT}${INDENT}}`);
  if (chrome.foreground) lines.push(`${INDENT}${INDENT}${INDENT}.foregroundStyle(foreground)`);
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n");
}

interface DualActionRefs {
  action: string;
  dismiss: string;
}

/**
 * A passive root holding exactly two referenced action parts: `action` and
 * `dismiss`. The composition class is selected from anatomy and prop shape;
 * the referenced component identities are output data, never dispatch keys.
 */
function resolveDualActionRefs(ir: ComponentIR): DualActionRefs | undefined {
  if (!ir.dom || ir.surface != null) return undefined;
  if (ir.behavior.normalizedChannels.length > 0) return undefined;
  const refs: {
    part?: string;
    ref: string;
    click: BindingExpression | undefined;
  }[] = [];
  const walk = (node: NonNullable<ComponentIR["dom"]>): void => {
    if (node.componentRef) {
      refs.push({
        part: node.part,
        ref: node.componentRef,
        click: node.events.click,
      });
    }
    (node.children ?? []).forEach(walk);
  };
  walk(ir.dom);
  if (refs.length !== 2) return undefined;
  if (
    !hasConventionalProp(ir, "onClick") ||
    !hasConventionalProp(ir, "onDismiss")
  ) {
    return undefined;
  }
  const action = refs.find(
    (entry) =>
      entry.part === "action" &&
      entry.click?.kind === "prop" &&
      entry.click.prop === "onClick",
  )?.ref;
  const dismiss = refs.find(
    (entry) =>
      entry.part === "dismiss" &&
      entry.click?.kind === "prop" &&
      entry.click.prop === "onDismiss",
  )?.ref;
  return action && dismiss ? { action, dismiss } : undefined;
}

function emitDualActionComposite(ir: ComponentIR, refs: DualActionRefs): string {
  const exportName = swiftExportName(ir.name);
  const hasVariant = Object.keys(ir.variants).includes("variant");
  const variantType = ir.definedTypes[`${ir.name}Variant`] ? `${ir.name}Variant` : null;
  const defaultVariant = variantType ? findPropDefaultOrNull(ir, "variant") : null;
  const hasDisabled = hasConventionalProp(ir, "disabled");
  const hasIcon = hasConventionalProp(ir, "icon");
  const hasDismissible = hasConventionalProp(ir, "dismissible");
  const hasAriaLabel = hasConventionalProp(ir, "ariaLabel");
  const variantArgs = hasVariant && variantType && defaultVariant
    ? `variant: ${variantType} = .${swiftCaseRef(defaultVariant)},`
    : "";

  const lines: string[] = [];
  lines.push("// @generated:start component");
  lines.push(
    `/// Emitted through the dual-action composite path: the referenced ` +
      `components compose the action/dismiss pair within DsSwiftUI.`,
  );
  const generics = ["Text: View"];
  if (hasIcon) generics.push("IconRegion: View");
  lines.push(`public struct ${exportName}<${generics.join(", ")}>: View {`);
  if (variantArgs) lines.push(`${INDENT}private let variant: ${variantType}`);
  if (hasDisabled) lines.push(`${INDENT}private let disabled: Bool`);
  if (hasDismissible) lines.push(`${INDENT}private let dismissible: Bool`);
  lines.push(`${INDENT}private let onClick: (() -> Void)?`);
  lines.push(`${INDENT}private let onDismiss: (() -> Void)?`);
  if (hasAriaLabel) lines.push(`${INDENT}private let accessibilityLabel: String?`);
  if (hasIcon) lines.push(`${INDENT}private let iconRegion: IconRegion`);
  lines.push(`${INDENT}private let text: Text`);
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params: string[] = [];
  if (variantArgs) params.push(variantArgs);
  if (hasDisabled) params.push("disabled: Bool = false,");
  if (hasDismissible) params.push("dismissible: Bool = false,");
  params.push("onClick: (() -> Void)? = nil,");
  params.push("onDismiss: (() -> Void)? = nil,");
  if (hasAriaLabel) params.push("accessibilityLabel: String? = nil,");
  if (hasIcon) params.push("@ViewBuilder icon: () -> IconRegion = { EmptyView() },");
  params.push("@ViewBuilder text: () -> Text");
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  if (variantArgs) lines.push(`${INDENT}${INDENT}self.variant = variant`);
  if (hasDisabled) lines.push(`${INDENT}${INDENT}self.disabled = disabled`);
  if (hasDismissible) lines.push(`${INDENT}${INDENT}self.dismissible = dismissible`);
  lines.push(`${INDENT}${INDENT}self.onClick = onClick`);
  lines.push(`${INDENT}${INDENT}self.onDismiss = onDismiss`);
  if (hasAriaLabel) lines.push(`${INDENT}${INDENT}self.accessibilityLabel = accessibilityLabel`);
  if (hasIcon) lines.push(`${INDENT}${INDENT}self.iconRegion = icon()`);
  lines.push(`${INDENT}${INDENT}self.text = text()`);
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}HStack(spacing: 4) {`);
  lines.push(
    `${INDENT}${INDENT}${INDENT}DsSwiftUI.${swiftExportName(refs.action)}(`,
  );
  if (variantArgs) lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}variant: variant,`);
  if (hasDisabled) lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}disabled: disabled,`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}onTap: onClick`);
  lines.push(`${INDENT}${INDENT}${INDENT}) {`);
  if (hasIcon) lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}iconRegion`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}text`);
  lines.push(`${INDENT}${INDENT}${INDENT}}`);
  if (hasAriaLabel) {
    lines.push(`${INDENT}${INDENT}${INDENT}.fsdsAccessibilityLabel(accessibilityLabel)`);
  }
  lines.push(`${INDENT}${INDENT}${INDENT}if ${hasDismissible ? "dismissible" : "true"} {`);
  lines.push(
    `${INDENT}${INDENT}${INDENT}${INDENT}DsSwiftUI.${swiftExportName(refs.dismiss)}(`,
  );
  if (hasDisabled) lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}disabled: disabled,`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}onTap: onDismiss`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}SwiftUI.Image(systemName: "xmark")`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}.fsdsAccessibilityLabel("Dismiss")`);
  lines.push(`${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}}`);
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n");
}

// The count-iterated field-group predicate is shared substrate
// (native-emission-class.ts): one string channel over a count-iterated input.


function emitCountFieldGroup(ir: ComponentIR): string {
  const exportName = swiftExportName(ir.name);
  const chrome = resolveChrome(ir);
  const hasLength = hasConventionalProp(ir, "length");
  const lengthDefault =
    ir.styledProps.find((p) => p.safeName === "length")?.defaultExpr ?? "6";
  const hasDisabled = hasConventionalProp(ir, "disabled");
  const hasOnComplete = hasConventionalProp(ir, "onComplete");

  const lines: string[] = [];
  lines.push("// @generated:start component");
  if (ir.tokenScopes.length > 0) lines.push(...emitTokenScopesSection(ir));
  lines.push("");
  lines.push(
    `/// Emitted through the count-iterated field-group path: the string ` +
      `channel distributes over N single-character fields (setCharAt ` +
      `semantics — the last character of a multi-char payload wins); ` +
      `onComplete fires when every field is filled.`,
  );
  if (exportName !== ir.name) {
    lines.push(
      `/// SwiftUI reserves the \`${ir.name}\` type name; this target ` +
        `exports it as \`${exportName}\`.`,
    );
  }
  lines.push(`public struct ${exportName}: View {`);
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`);
    lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
    lines.push(`${INDENT}}`);
  }
  lines.push(`${INDENT}@StateObject private var value: ControllableValue<String>`);
  if (hasLength) lines.push(`${INDENT}private let length: Int`);
  if (hasDisabled) lines.push(`${INDENT}private let disabled: Bool`);
  if (hasOnComplete) lines.push(`${INDENT}private let onComplete: ((String) -> Void)?`);
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
  }
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params = [
    "value: Binding<String>? = nil,",
    'defaultValue: String = "",',
    "onChange: ((String) -> Void)? = nil,",
  ];
  if (hasLength) params.push(`length: Int = ${lengthDefault.replace(/"/g, '"')},`);
  if (hasDisabled) params.push("disabled: Bool = false,");
  if (hasOnComplete) params.push("onComplete: ((String) -> Void)? = nil");
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self._value = StateObject(wrappedValue: ControllableValue(controlled: value, defaultValue: defaultValue, onChange: onChange))`);
  if (hasLength) lines.push(`${INDENT}${INDENT}self.length = length`);
  if (hasDisabled) lines.push(`${INDENT}${INDENT}self.disabled = disabled`);
  if (hasOnComplete) lines.push(`${INDENT}${INDENT}self.onComplete = onComplete`);
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}private func character(at index: Int) -> String {`);
  lines.push(`${INDENT}${INDENT}guard index < value.value.count else { return "" }`);
  lines.push(`${INDENT}${INDENT}return String(Array(value.value)[index])`);
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}/// setCharAt: write the payload's last character at the index, `);
  lines.push(`${INDENT}/// padding with spaces so the index always exists.`);
  lines.push(`${INDENT}private func setCharacter(_ raw: String, at index: Int) {`);
  lines.push(`${INDENT}${INDENT}var chars = Array(value.value.padding(toLength: length${hasLength ? "" : " ?? 6"}, withPad: " ", startingAt: 0))`);
  lines.push(`${INDENT}${INDENT}guard index < chars.count else { return }`);
  lines.push(`${INDENT}${INDENT}let payload = raw.count > 0 ? Array(raw) : [" "]`);
  lines.push(`${INDENT}${INDENT}chars[index] = payload[payload.count - 1]`);
  lines.push(`${INDENT}${INDENT}let next = String(chars).trimmingCharacters(in: .whitespaces)`);
  lines.push(`${INDENT}${INDENT}value.set(next)`);
  if (hasOnComplete) {
    lines.push(`${INDENT}${INDENT}if next.count == length {`);
    lines.push(`${INDENT}${INDENT}${INDENT}onComplete?(next)`);
    lines.push(`${INDENT}${INDENT}}`);
  }
  lines.push(`${INDENT}}`);
  lines.push("");
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}private var layered: [String: FsdsTokenValue?] {`);
    lines.push(`${INDENT}${INDENT}resolveFsdsLayeredTokens(`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsScopes,`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsTheme,`);
    lines.push(`${INDENT}${INDENT}${INDENT}layers: ["root"]`);
    lines.push(`${INDENT}${INDENT})`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func colorSlot(_ suffix: String) -> Color? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.color`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func pxSlot(_ suffix: String) -> CGFloat? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.px`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(
      ...emitChromeAccessorLines(chrome, [
        "background", "foreground", "borderColor", "borderWidth",
        "radius", "blockPadding", "inlinePadding", "gap", "minHeight",
      ]),
    );
    lines.push("");
  }
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}HStack(spacing: ${chrome.gap ? "gap" : "nil"}) {`);
  lines.push(`${INDENT}${INDENT}${INDENT}ForEach(0..<length, id: \\.self) { index in`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}SwiftUI.TextField("", text: Binding(`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}get: { character(at: index) },`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}set: { setCharacter($0, at: index) }`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}))`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}.frame(width: 32)`);
  if (hasDisabled) lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}.disabled(disabled)`);
  lines.push(`${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}}`);
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n");
}

/**
 * FEAT-CODEBLOCK-HIGHLIGHT-01: SwiftUI does not realize content
 * transforms — a transform degrades to its source prop binding (plain
 * monospaced text), matching the non-web degradation doctrine.
 */
function contentOrTransformSource(
  content: DomNodeIR["content"],
): BindingExpression | undefined {
  if (content === undefined) return undefined;
  return isContentTransform(content) ? content.source : content;
}

/**
 * Prop-text leaf: the root (or its code part) renders a string prop as
 * its entire content (CodeSnippet: text, CodeBlock: code).
 */
function isPropTextLeaf(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  if (ir.behavior.normalizedChannels.length > 0) return false;
  if ((ir.dom.children ?? []).length > 0) {
    // CodeBlock shape: pre > code with content binding (or a highlight
    // content transform, degrading to its source prop here).
    const codeChild = (ir.dom.children ?? []).find((c) => c.part === "code");
    if (!codeChild || (codeChild.children ?? []).length > 0) return false;
    return contentOrTransformSource(codeChild.content)?.kind === "prop";
  }
  return contentOrTransformSource(ir.dom.content)?.kind === "prop";
}

function propTextPropName(ir: ComponentIR): string | null {
  const direct = contentOrTransformSource(ir.dom?.content);
  if (direct?.kind === "prop" && "prop" in direct) return direct.prop;
  const codeChild = (ir.dom?.children ?? []).find((c) => c.part === "code");
  const nested = contentOrTransformSource(codeChild?.content);
  if (nested?.kind === "prop" && "prop" in nested) return nested.prop;
  return null;
}

function emitPropTextLeaf(ir: ComponentIR): string {
  const exportName = swiftExportName(ir.name);
  const chrome = resolveChrome(ir);
  const textProp = propTextPropName(ir)!;
  const lines: string[] = [];
  lines.push("// @generated:start component");
  if (ir.tokenScopes.length > 0) lines.push(...emitTokenScopesSection(ir));
  lines.push("");
  lines.push(
    `/// Emitted through the prop-text leaf path: the \`${textProp}\` prop ` +
      `is the entire content, rendered as monospaced text.`,
  );
  if (exportName !== ir.name) {
    lines.push(
      `/// SwiftUI reserves the \`${ir.name}\` type name; this target ` +
        `exports it as \`${exportName}\`.`,
    );
  }
  lines.push(`public struct ${exportName}: View {`);
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`);
    lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
    lines.push(`${INDENT}}`);
  }
  lines.push(`${INDENT}private let ${textProp}: String`);
  lines.push("");
  lines.push(`${INDENT}public init(${textProp}: String = "") {`);
  lines.push(`${INDENT}${INDENT}self.${textProp} = ${textProp}`);
  lines.push(`${INDENT}}`);
  lines.push("");
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}private var layered: [String: FsdsTokenValue?] {`);
    lines.push(`${INDENT}${INDENT}resolveFsdsLayeredTokens(`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsScopes,`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsTheme,`);
    lines.push(`${INDENT}${INDENT}${INDENT}layers: ["root"]`);
    lines.push(`${INDENT}${INDENT})`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func colorSlot(_ suffix: String) -> Color? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.color`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func pxSlot(_ suffix: String) -> CGFloat? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.px`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(
      ...emitChromeAccessorLines(chrome, [
        "background", "foreground", "borderColor", "radius",
        "blockPadding", "inlinePadding", "gap",
      ]),
    );
    lines.push("");
    lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
    lines.push("");
  }
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}SwiftUI.Text(${textProp})`);
  lines.push(`${INDENT}${INDENT}${INDENT}.font(.system(.body, design: .monospaced))`);
  if (chrome.blockPadding) lines.push(`${INDENT}${INDENT}${INDENT}.padding(.vertical, blockPadding)`);
  if (chrome.inlinePadding) lines.push(`${INDENT}${INDENT}${INDENT}.padding(.horizontal, inlinePadding)`);
  if (chrome.background) lines.push(`${INDENT}${INDENT}${INDENT}.background(background)`);
  if (chrome.radius) lines.push(`${INDENT}${INDENT}${INDENT}.clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))`);
  if (chrome.foreground) lines.push(`${INDENT}${INDENT}${INDENT}.foregroundStyle(foreground)`);
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  void chrome;
  return lines.join("\n");
}

/** Media leaf: an img root fed by src/alt props (Image). */
function isMediaLeaf(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  return ir.dom.tag === "img" && (ir.dom.children ?? []).length === 0;
}

function emitMediaLeaf(ir: ComponentIR): string {
  const exportName = swiftExportName(ir.name);
  const hasAlt = hasConventionalProp(ir, "alt");
  const hasWidth = hasConventionalProp(ir, "width");
  const hasHeight = hasConventionalProp(ir, "height");
  const lines: string[] = [];
  lines.push("// @generated:start component");
  lines.push(
    `/// Emitted through the media-leaf path: src drives an AsyncImage; ` +
      `alt lowers through the conditional a11y helper.`,
  );
  if (exportName !== ir.name) {
    lines.push(
      `/// SwiftUI reserves the \`${ir.name}\` type name; this target ` +
        `exports it as \`${exportName}\`.`,
    );
  }
  lines.push(`public struct ${exportName}: View {`);
  lines.push(`${INDENT}private let src: String`);
  if (hasAlt) lines.push(`${INDENT}private let alt: String?`);
  if (hasWidth) lines.push(`${INDENT}private let width: CGFloat?`);
  if (hasHeight) lines.push(`${INDENT}private let height: CGFloat?`);
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params = ["src: String,"];
  if (hasAlt) params.push("alt: String? = nil,");
  if (hasWidth) params.push("width: CGFloat? = nil,");
  if (hasHeight) params.push("height: CGFloat? = nil");
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self.src = src`);
  if (hasAlt) lines.push(`${INDENT}${INDENT}self.alt = alt`);
  if (hasWidth) lines.push(`${INDENT}${INDENT}self.width = width`);
  if (hasHeight) lines.push(`${INDENT}${INDENT}self.height = height`);
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}AsyncImage(url: URL(string: src)) { phase in`);
  lines.push(`${INDENT}${INDENT}${INDENT}if let image = phase.image {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}image.resizable().scaledToFit()`);
  lines.push(`${INDENT}${INDENT}${INDENT}} else if phase.error != nil {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}SwiftUI.Image(systemName: "photo")`);
  lines.push(`${INDENT}${INDENT}${INDENT}} else {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}ProgressView()`);
  lines.push(`${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}}`);
  if (hasWidth || hasHeight) {
    lines.push(`${INDENT}${INDENT}${INDENT}.frame(`);
    const frameArgs: string[] = [];
    if (hasWidth) frameArgs.push("width: width");
    if (hasHeight) frameArgs.push("height: height");
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${frameArgs.join(", ")}`);
    lines.push(`${INDENT}${INDENT}${INDENT})`);
  }
  if (hasAlt) lines.push(`${INDENT}${INDENT}${INDENT}.fsdsAccessibilityLabel(alt)`);
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n");
}

/**
 * Src-or-fallback composition: one referenced child whose `src` prop binding
 * is gated by the host's `src`, with host-authored text as the fallback. The
 * reference identity is returned for emission; it never selects the class.
 */
function resolveSrcFallbackRef(ir: ComponentIR): string | undefined {
  if (!ir.dom || ir.surface != null) return undefined;
  if (ir.behavior.normalizedChannels.length > 0) return undefined;
  const refs: string[] = [];
  const walk = (node: NonNullable<ComponentIR["dom"]>): void => {
    const srcBinding = node.bindings.src;
    if (
      node.componentRef &&
      node.ifProp === "src" &&
      srcBinding?.kind === "prop" &&
      srcBinding.prop === "src"
    ) {
      refs.push(node.componentRef);
    }
    (node.children ?? []).forEach(walk);
  };
  walk(ir.dom);
  return refs.length === 1 && hasConventionalProp(ir, "src")
    ? refs[0]
    : undefined;
}

function emitSrcOrFallback(ir: ComponentIR, componentRef: string): string {
  const exportName = swiftExportName(ir.name);
  const chrome = resolveChrome(ir);
  const hasName = hasConventionalProp(ir, "name");
  const lines: string[] = [];
  lines.push("// @generated:start component");
  if (ir.tokenScopes.length > 0) lines.push(...emitTokenScopesSection(ir));
  lines.push("");
  lines.push(
    `/// Emitted through the src-or-fallback path: the referenced component ` +
      `renders when src is set; the name prop is the fallback content.`,
  );
  lines.push(`public struct ${exportName}: View {`);
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`);
    lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
    lines.push(`${INDENT}}`);
  }
  lines.push(`${INDENT}private let src: String?`);
  if (hasName) lines.push(`${INDENT}private let name: String?`);
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params = ["src: String? = nil,"];
  if (hasName) params.push("name: String? = nil");
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self.src = src`);
  if (hasName) lines.push(`${INDENT}${INDENT}self.name = name`);
  lines.push(`${INDENT}}`);
  lines.push("");
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}private var layered: [String: FsdsTokenValue?] {`);
    lines.push(`${INDENT}${INDENT}resolveFsdsLayeredTokens(`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsScopes,`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsTheme,`);
    lines.push(`${INDENT}${INDENT}${INDENT}layers: ["root"]`);
    lines.push(`${INDENT}${INDENT})`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func colorSlot(_ suffix: String) -> Color? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.color`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func pxSlot(_ suffix: String) -> CGFloat? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.px`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(
      ...emitChromeAccessorLines(chrome, [
        "background", "foreground", "borderColor", "radius",
        "blockPadding", "inlinePadding", "gap",
      ]),
    );
    lines.push("");
    lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
    lines.push("");
  }
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}Group {`);
  lines.push(`${INDENT}${INDENT}${INDENT}if let src {`);
  lines.push(
    `${INDENT}${INDENT}${INDENT}${INDENT}DsSwiftUI.${swiftExportName(componentRef)}(src: src${hasName ? ", alt: name" : ""})`,
  );
  lines.push(`${INDENT}${INDENT}${INDENT}} else {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}SwiftUI.Text(name ?? "")`);
  lines.push(`${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}${INDENT}.frame(width: 40, height: 40)`);
  if (chrome.radius) lines.push(`${INDENT}${INDENT}${INDENT}.clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))`);
  if (chrome.background) lines.push(`${INDENT}${INDENT}${INDENT}.background(background)`);
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n");
}

/**
 * Expandable content: an expanded boolean channel + a content region +
 * line-count props (Truncate, ShowMore). Content lineLimits to the
 * authored count unless expanded; a disclosure toggle appears when the
 * contract authors one (expandable/trigger part).
 */
function isExpandableContent(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  if (ir.dom.tag !== "div") return false;
  const boolChannels = ir.behavior.normalizedChannels.filter(
    (c) => c.valueType === "boolean" && c.name.startsWith("expand"),
  );
  if (boolChannels.length !== 1) return false;
  let childrenLeaves = 0;
  let hasInstance = false;
  const walk = (node: NonNullable<ComponentIR["dom"]>): void => {
    if ((node as { componentRef?: string }).componentRef) hasInstance = true;
    const kids = node.children ?? [];
    if (node.tag === "children" && kids.length === 0) childrenLeaves += 1;
    kids.forEach(walk);
  };
  walk(ir.dom);
  return childrenLeaves === 1 && !hasInstance;
}

function emitExpandableContent(ir: ComponentIR): string {
  const exportName = swiftExportName(ir.name);
  const chrome = resolveChrome(ir);
  const channel = ir.behavior.normalizedChannels.find(
    (c) => c.valueType === "boolean" && c.name.startsWith("expand"),
  )!;
  const hasLines = hasConventionalProp(ir, "lines") || hasConventionalProp(ir, "maxLines");
  const linesProp = hasConventionalProp(ir, "lines") ? "lines" : "maxLines";
  const linesDefault =
    ir.styledProps.find((p) => p.safeName === linesProp)?.defaultExpr ?? "3";
  const hasExpandable = hasConventionalProp(ir, "expandable");

  const lines: string[] = [];
  lines.push("// @generated:start component");
  if (ir.tokenScopes.length > 0) lines.push(...emitTokenScopesSection(ir));
  lines.push("");
  lines.push(
    `/// Emitted through the expandable-content path: the expanded ` +
      `channel (ControllableValue substrate) gates the line limit; the ` +
      `disclosure toggle appears when the contract authors one.`,
  );
  const kids = countChildrenLeaves(ir);
  lines.push(
    `public struct ${exportName}<Content: View>: View {`,
  );
  if (kids === 0) {
    // Decorative box: chrome only, no content region (Skeleton).
    lines.push(`${INDENT}public init() {}`);
    lines.push("");
    lines.push(`${INDENT}public var body: some View {`);
    lines.push(`${INDENT}${INDENT}RoundedRectangle(cornerRadius: ${chrome.radius ? "radius" : "8"}, style: .continuous)`);
    if (chrome.background) lines.push(`${INDENT}${INDENT}${INDENT}.fill(background)`);
    lines.push(`${INDENT}${INDENT}${INDENT}.frame(height: ${chrome.minHeight ? "minHeight" : "12"})`);
    lines.push(`${INDENT}}`);
    lines.push(`}`);
    lines.push("// @generated:end");
    return lines.join("\n");
  }
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`);
    lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
    lines.push(`${INDENT}}`);
  }
  lines.push(`${INDENT}@StateObject private var expanded: ControllableValue<Bool>`);
  if (hasExpandable) lines.push(`${INDENT}private let expandable: Bool`);
  if (hasLines) lines.push(`${INDENT}private let ${linesProp}: Int`);
  lines.push(`${INDENT}private let content: Content`);
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
  }
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params = [
    "expanded: Binding<Bool>? = nil,",
    "defaultExpanded: Bool = false,",
    "onExpandedChange: ((Bool) -> Void)? = nil,",
  ];
  if (hasExpandable) params.push("expandable: Bool = true,");
  if (hasLines) params.push(`${linesProp}: Int = ${linesDefault.replace(/"/g, '"')},`);
  params.push("@ViewBuilder content: () -> Content");
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self._expanded = StateObject(wrappedValue: ControllableValue(controlled: expanded, defaultValue: defaultExpanded, onChange: onExpandedChange))`);
  if (hasExpandable) lines.push(`${INDENT}${INDENT}self.expandable = expandable`);
  if (hasLines) lines.push(`${INDENT}${INDENT}self.${linesProp} = ${linesProp}`);
  lines.push(`${INDENT}${INDENT}self.content = content()`);
  lines.push(`${INDENT}}`);
  lines.push("");
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}private var layered: [String: FsdsTokenValue?] {`);
    lines.push(`${INDENT}${INDENT}resolveFsdsLayeredTokens(`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsScopes,`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsTheme,`);
    lines.push(`${INDENT}${INDENT}${INDENT}layers: ["root"]`);
    lines.push(`${INDENT}${INDENT})`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func colorSlot(_ suffix: String) -> Color? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.color`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func pxSlot(_ suffix: String) -> CGFloat? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.px`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(
      ...emitChromeAccessorLines(chrome, [
        "background", "foreground", "borderColor", "radius",
        "blockPadding", "inlinePadding", "gap",
      ]),
    );
    lines.push("");
  }
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}VStack(spacing: 4) {`);
  lines.push(`${INDENT}${INDENT}${INDENT}content`);
  if (hasLines) {
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}.lineLimit(expanded.value ? nil : ${linesProp})`);
  }
  lines.push(`${INDENT}${INDENT}${INDENT}if ${hasExpandable ? "expandable" : "true"} {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}Button(expanded.value ? "Show less" : "Show more") {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}expanded.toggle()`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}.buttonStyle(.plain)`);
  lines.push(`${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}}`);
  if (chrome.foreground) lines.push(`${INDENT}${INDENT}${INDENT}.foregroundStyle(foreground)`);
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  void channel;
  return lines.join("\n");
}

/**
 * The native-disclosure collapse class: contracts declaring the
 * `native-disclosure` intent (Details) collapse to SwiftUI
 * DisclosureGroup — the open channel projects through the controllable
 * state pattern; the summary string prop is the group label; the content
 * compound part is the expanded region.
 */
function emitDisclosureComponent(ir: ComponentIR): string {
  const openChannel = ir.behavior.normalizedChannels.find(
    (c) => c.valueType === "boolean",
  );
  if (!openChannel) {
    throw new Error(
      `emitDisclosureComponent: ${ir.name} declares native-disclosure but ` +
        `has no boolean open channel.`,
    );
  }
  const contentParts = ir.compoundParts.filter((p) => p.name === "content");
  if (contentParts.length !== 1) {
    throw new Error(
      `emitDisclosureComponent: ${ir.name} needs exactly one content ` +
        `compound part (found: ${ir.compoundParts.map((p) => p.name).join("/") || "none"}).`,
    );
  }
  const hasSummary = hasConventionalProp(ir, "summary");
  const hasDisabled = hasConventionalProp(ir, "disabled");

  const lines: string[] = [];
  lines.push("// @generated:start component");
  lines.push(...emitTokenScopesSection(ir));
  lines.push("");
  lines.push(
    `/// Emitted through the native-disclosure collapse path: SwiftUI ` +
      `DisclosureGroup realizes the summary + expandable content anatomy.`,
  );
  const exportName = swiftExportName(ir.name);
  if (exportName !== ir.name) {
    lines.push(
      `/// SwiftUI reserves the \`${ir.name}\` type name; this target ` +
        `exports it as \`${exportName}\`.`,
    );
  }
  lines.push(`public struct ${exportName}<Content: View>: View {`);
  lines.push(`${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`);
  lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
  lines.push(`${INDENT}}`);
  lines.push(`${INDENT}@StateObject private var open: ControllableValue<Bool>`);
  if (hasSummary) lines.push(`${INDENT}private let summary: String?`);
  if (hasDisabled) lines.push(`${INDENT}private let disabled: Bool`);
  lines.push(`${INDENT}private let content: Content`);
  lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params = ["open: Binding<Bool>? = nil,", "defaultOpen: Bool = false,", "onOpenChange: ((Bool) -> Void)? = nil,"];
  if (hasSummary) params.push("summary: String? = nil,");
  if (hasDisabled) params.push("disabled: Bool = false,");
  params.push("@ViewBuilder content: () -> Content");
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self._open = StateObject(wrappedValue: ControllableValue(controlled: open, defaultValue: defaultOpen, onChange: onOpenChange))`);
  if (hasSummary) lines.push(`${INDENT}${INDENT}self.summary = summary`);
  if (hasDisabled) lines.push(`${INDENT}${INDENT}self.disabled = disabled`);
  lines.push(`${INDENT}${INDENT}self.content = content()`);
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push("");
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}DisclosureGroup(isExpanded: Binding(`);
  lines.push(`${INDENT}${INDENT}${INDENT}get: { open.value },`);
  lines.push(`${INDENT}${INDENT}${INDENT}set: { open.set($0) }`);
  lines.push(`${INDENT}${INDENT})) {`);
  lines.push(`${INDENT}${INDENT}${INDENT}content`);
  lines.push(`${INDENT}${INDENT}} label: {`);
  if (hasSummary) {
    lines.push(`${INDENT}${INDENT}${INDENT}if let summary {`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}SwiftUI.Text(summary)`);
    lines.push(`${INDENT}${INDENT}${INDENT}} else {`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}EmptyView()`);
    lines.push(`${INDENT}${INDENT}${INDENT}}`);
  } else {
    lines.push(`${INDENT}${INDENT}${INDENT}EmptyView()`);
  }
  lines.push(`${INDENT}${INDENT}}`);
  if (hasDisabled) {
    lines.push(`${INDENT}${INDENT}${INDENT}.disabled(disabled)`);
  }
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n");
}

/**
 * The static-content class: a passive non-container root (label,
 * blockquote, p, …) whose entire dom is one projected children region —
 * no channels, no surface. Label and Blockquote are the corpus consumers.
 */
// The static-content class predicate is shared substrate
// (native-emission-class.ts): passive root, at most one projected children
// leaf, no essential component instances.

function emitStaticContentComponent(ir: ComponentIR): string {
  const exportName = swiftExportName(ir.name);
  const chrome = resolveChrome(ir);
  const axes = collectVariantAxes(ir);
  // An absent consumer region may expose a contract-declared literal source.
  const fallbackSources: string[] = [];
  const collectFallback = (node: DomNodeIR): void => {
    const source = contentOrTransformSource(node.content);
    if (node.ifProp === "children" && node.ifNegated && source?.kind === "prop") {
      fallbackSources.push(source.prop);
    }
    node.children?.forEach(collectFallback);
  };
  collectFallback(ir.dom!);
  if (fallbackSources.length > 1) throw new Error("Static consumer content supports one literal fallback source");
  const layerInfo = emitLayerExpressions(axes);
  const layerArray = ['"root"', ...layerInfo.expressions];
  const layersExpr = layerInfo.needsCompactMap
    ? `[${layerArray.join(", ")}].compactMap { $0 }`
    : `[${layerArray.join(", ")}]`;

  const lines: string[] = [];
  lines.push("// @generated:start component");
  if (ir.tokenScopes.length > 0) lines.push(...emitTokenScopesSection(ir));
  lines.push("");
  lines.push(
    `/// Emitted through the static-content path: passive ` +
      `${ir.dom!.tag} root with a single consumer content region.`,
  );
  if (exportName !== ir.name) {
    lines.push(
      `/// SwiftUI reserves the \`${ir.name}\` type name; this target ` +
        `exports it as \`${exportName}\`.`,
    );
  }
  lines.push(`public struct ${exportName}<Content: View>: View {`);
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`);
    lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
    lines.push(`${INDENT}}`);
  }
  for (const axis of axes) {
    lines.push(`${INDENT}private let ${escapeSwiftKeyword(axis.prop)}: ${axis.typeName}${axis.defaultMember === null ? "?" : ""}`);
  }
  lines.push(`${INDENT}private let content: Content`);
  if (ir.tokenScopes.length > 0) {
    lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
  }
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params = axes.map((axis) =>
    axis.defaultMember !== null
      ? `${axis.prop}: ${axis.typeName} = .${swiftCaseRef(axis.defaultMember)},`
      : `${axis.prop}: ${axis.typeName}? = nil,`,
  );
  params.push(
    countChildrenLeaves(ir) === 0
      ? "@ViewBuilder content: () -> Content = { EmptyView() }"
      : "@ViewBuilder content: () -> Content",
  );
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  for (const axis of axes) lines.push(`${INDENT}${INDENT}self.${escapeSwiftKeyword(axis.prop)} = ${escapeSwiftKeyword(axis.prop)}`);
  lines.push(`${INDENT}${INDENT}self.content = content()`);
  lines.push(`${INDENT}}`);
  if (ir.tokenScopes.length > 0) {
    lines.push("");
    lines.push(`${INDENT}private var layered: [String: FsdsTokenValue?] {`);
    lines.push(`${INDENT}${INDENT}resolveFsdsLayeredTokens(`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsScopes,`);
    lines.push(`${INDENT}${INDENT}${INDENT}fsdsTheme,`);
    lines.push(`${INDENT}${INDENT}${INDENT}layers: ${layersExpr}`);
    lines.push(`${INDENT}${INDENT})`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func colorSlot(_ suffix: String) -> Color? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.color`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(`${INDENT}private func pxSlot(_ suffix: String) -> CGFloat? {`);
    lines.push(`${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.px`);
    lines.push(`${INDENT}}`);
    lines.push("");
    lines.push(
      ...emitChromeAccessorLines(chrome, [
        "background", "foreground", "borderColor", "borderWidth",
        "radius", "blockPadding", "inlinePadding", "gap", "minHeight",
      ]),
    );
  }
  lines.push("");
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}content`);
  if (ir.dom!.tag === "pre") lines.push(`${INDENT}${INDENT}${INDENT}.font(.system(.body, design: .monospaced))`);
  if (ir.tokenScopes.length > 0) {
    if (chrome.blockPadding) lines.push(`${INDENT}${INDENT}${INDENT}.padding(.vertical, blockPadding)`);
    if (chrome.inlinePadding) lines.push(`${INDENT}${INDENT}${INDENT}.padding(.horizontal, inlinePadding)`);
    if (chrome.background) lines.push(`${INDENT}${INDENT}${INDENT}.background(background)`);
    if (chrome.radius) lines.push(`${INDENT}${INDENT}${INDENT}.clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))`);
    if (chrome.foreground) lines.push(`${INDENT}${INDENT}${INDENT}.foregroundStyle(foreground)`);
  }
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  if (fallbackSources.length === 1) {
    const source = escapeSwiftKeyword(fallbackSources[0]!);
    lines.push("", `extension ${exportName} where Content == SwiftUI.Text {`);
    lines.push(`${INDENT}public init(`);
    for (const param of params.slice(0, -1)) lines.push(`${INDENT}${INDENT}${param}`);
    lines.push(`${INDENT}${INDENT}${source}: String = ""`, `${INDENT}) {`);
    const argumentsList = axes.map(axis => `${axis.prop}: ${escapeSwiftKeyword(axis.prop)}`).join(", ");
    lines.push(`${INDENT}${INDENT}self.init(${argumentsList}) { SwiftUI.Text(verbatim: ${source}) }`);
    lines.push(`${INDENT}}`, "}");
  }
  lines.push("// @generated:end");
  return lines.join("\n");
}

/**
 * The compound-part composer class: a passive container root with NO root
 * dom tree, whose content regions are its compound parts. Card is the
 * corpus consumer. Anchored surfaces (Popover/Tooltip) share the shape but
 * carry `ir.surface` and dispatch to the surface path before this point.
 */
function isCompoundPartComposer(ir: ComponentIR): boolean {
  return (
    ir.dom === undefined &&
    ir.surface == null &&
    ir.compoundParts.length > 0 &&
    ir.root.element === "div"
  );
}

/**
 * Token slot-name suffixes the emitters know how to apply, and the chrome
 * they drive. This is the corpus-wide token naming vocabulary — the
 * SwiftUI analog of the primitive emitter's axis table. Alternatives exist
 * because slot naming is not uniform across the corpus (Button authors
 * `*.size.radius`, Card `*.size.radius.default`; foreground is `.default`
 * on Button but `.primary` on Card).
 */
export const SLOT_SUFFIX_ALTERNATIVES = {
  background: ["color.background.default", "color.bg.default", "color.bg"],
  foreground: ["color.foreground.default", "color.foreground.primary", "color.text.default", "color.fg"],
  borderColor: ["color.border.default", "color.border"],
  borderWidth: ["size.border", "size.border.default"],
  radius: ["size.radius", "size.radius.default", "radius"],
  blockPadding: ["padding-block-start"],
  inlinePadding: ["padding-inline-start"],
  gap: ["box-model.gap"],
  minHeight: ["min-height"],
  statusAccentColor: ["color.statusAccent.default"],
  statusAccentWidth: ["size.statusAccent.width"],
} as const;

export type SlotConcern = keyof typeof SLOT_SUFFIX_ALTERNATIVES;

/**
 * The first alternative suffix that exists in any of the component's
 * scopes, or null when the component authors no slot for the concern.
 * Chrome is presence-driven: a null concern is simply not applied.
 */
function pickSuffix(
  ir: ComponentIR,
  concern: SlotConcern,
): string | null {
  for (const suffix of SLOT_SUFFIX_ALTERNATIVES[concern]) {
    if (
      ir.tokenScopes.some((scope) =>
        scope.values.some((v) => v.name.endsWith(suffix)),
      )
    ) {
      return suffix;
    }
  }
  return null;
}

function emitActionComponent(ir: ComponentIR): string {
  const exportName = swiftExportName(ir.name);
  const chrome = resolveChrome(ir);
  const has = (concern: SlotConcern) => chrome[concern] !== undefined;

  const lines: string[] = [];
  lines.push("// @generated:start component");
  lines.push(
    `/// Token scope data for ${exportName} (ir.tokenScopes → RN normal ` +
      `form: data consumed through FsdsTheme at render, never resolved ` +
      `constants). A caseless enum namespace because generic types cannot ` +
      `hold static stored properties.`,
  );
  lines.push(`enum ${ir.name}Tokens {`);
  lines.push(`${INDENT}public static let scopes: FsdsComponentTokenScopes = [${ir.tokenScopes.length === 0 ? ":" : ""}`);
  for (const scope of ir.tokenScopes) {
    lines.push(`${INDENT}${INDENT}"${scope.scope}": [`);
    for (const value of scope.values) {
      let literalArg = "";
      const refArg = value.resolvesTo ? `ref: "${value.resolvesTo}"` : "";
      if (value.rawValue) {
        const kind = value.isLiteral ? "literal" : "fallback";
        const dark = graphDarkFor(value);
        literalArg = dark
          ? `${kind}: .adaptive(light: ${swiftLiteral(value.rawValue)}, dark: ${swiftLiteral(dark)})`
          : `${kind}: .string(${swiftLiteral(value.rawValue)})`;
      }
      lines.push(
        `${INDENT}${INDENT}${INDENT}"${value.name}": FsdsComponentTokenDefinition(` +
          `cssVar: "${value.cssVar}", name: "${value.name}"${refArg ? ", " + refArg : ""}${literalArg ? ", " + literalArg : ""}),`,
      );
    }
    lines.push(`${INDENT}${INDENT}],`);
  }
  lines.push(`${INDENT}]`);
  lines.push(`}`);
  lines.push("");
  lines.push(
    `/// Emitted through the projected-children action path: interactive ` +
      `button root with a single consumer content region.`,
  );
  if (exportName !== ir.name) {
    lines.push(
      `/// SwiftUI reserves the \`${ir.name}\` type name; this target ` +
        `exports it as \`${exportName}\`.`,
    );
  }
  lines.push(`public struct ${exportName}<Label: View>: View {`);
  lines.push(`${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`);
  lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
  lines.push(`${INDENT}}`);

  // Props
  const variantAxes = Object.keys(ir.variants);
  for (const axis of variantAxes) {
    lines.push(`${INDENT}private let ${axis}: ${ir.name}${capitalize(axis)}`);
  }
  if (hasConventionalProp(ir, "disabled")) {
    lines.push(`${INDENT}private let disabled: Bool`);
  }
  if (hasConventionalProp(ir, "loading")) {
    lines.push(`${INDENT}private let loading: Bool`);
  }
  if (hasConventionalProp(ir, "ariaLabel")) {
    lines.push(`${INDENT}private let accessibilityLabel: String?`);
  }
  if (hasConventionalProp(ir, "onClick")) {
    lines.push(`${INDENT}private let onTap: (() -> Void)?`);
  }
  lines.push(`${INDENT}private let label: Label`);
  lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
  lines.push("");

  // Initializer — defaults from contract prop defaults.
  lines.push(`${INDENT}public init(`);
  const params: string[] = [];
  for (const axis of variantAxes) {
    const def = findPropDefault(ir, axis);
    params.push(
      `${INDENT}${INDENT}${axis}: ${ir.name}${capitalize(axis)} = .${swiftCaseRef(def)},`,
    );
  }
  if (hasConventionalProp(ir, "disabled")) {
    params.push(`${INDENT}${INDENT}disabled: Bool = false,`);
  }
  if (hasConventionalProp(ir, "loading")) {
    params.push(`${INDENT}${INDENT}loading: Bool = false,`);
  }
  if (hasConventionalProp(ir, "ariaLabel")) {
    params.push(`${INDENT}${INDENT}accessibilityLabel: String? = nil,`);
  }
  if (hasConventionalProp(ir, "onClick")) {
    params.push(`${INDENT}${INDENT}onTap: (() -> Void)? = nil,`);
  }
  params.push(`${INDENT}${INDENT}@ViewBuilder label: () -> Label`);
  lines.push(...params);
  lines.push(`${INDENT}) {`);
  for (const axis of variantAxes) {
    lines.push(`${INDENT}${INDENT}self.${axis} = ${axis}`);
  }
  if (hasConventionalProp(ir, "disabled")) {
    lines.push(`${INDENT}${INDENT}self.disabled = disabled`);
  }
  if (hasConventionalProp(ir, "loading")) {
    lines.push(`${INDENT}${INDENT}self.loading = loading`);
  }
  if (hasConventionalProp(ir, "ariaLabel")) {
    lines.push(`${INDENT}${INDENT}self.accessibilityLabel = accessibilityLabel`);
  }
  if (hasConventionalProp(ir, "onClick")) {
    lines.push(`${INDENT}${INDENT}self.onTap = onTap`);
  }
  lines.push(`${INDENT}${INDENT}self.label = label()`);
  lines.push(`${INDENT}}`);
  lines.push("");

  // Token resolution: root base + variant layers, theme-driven.
  lines.push(`${INDENT}private var layered: [String: FsdsTokenValue?] {`);
  lines.push(`${INDENT}${INDENT}resolveFsdsLayeredTokens(`);
  lines.push(`${INDENT}${INDENT}${INDENT}fsdsScopes,`);
  lines.push(`${INDENT}${INDENT}${INDENT}fsdsTheme,`);
  const layerList = [
    "\"root\"",
    ...variantAxes.map(
      (axis) => `"variant_\\(${axis}.rawValue)"`,
    ),
  ];
  lines.push(
    `${INDENT}${INDENT}${INDENT}layers: [${layerList.join(", ")}]`,
  );
  lines.push(`${INDENT}${INDENT})`);
  lines.push(`${INDENT}}`);
  lines.push("");

  // Slot accessors (presence-driven).
  lines.push(`${INDENT}private func colorSlot(_ suffix: String) -> Color? {`);
  lines.push(
    `${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.color`,
  );
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}private func pxSlot(_ suffix: String) -> CGFloat? {`);
  lines.push(
    `${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.px`,
  );
  lines.push(`${INDENT}}`);
  lines.push("");
  const accessors: string[] = [];
  if (has("background")) {
    accessors.push(
      `${INDENT}private var background: Color { colorSlot("${chrome.background}") ?? .accentColor }`,
    );
  }
  if (has("foreground")) {
    accessors.push(
      `${INDENT}private var foreground: Color { colorSlot("${chrome.foreground}") ?? .primary }`,
    );
  }
  if (has("borderColor")) {
    accessors.push(
      `${INDENT}private var borderColor: Color { colorSlot("${chrome.borderColor}") ?? .clear }`,
    );
  }
  if (has("borderWidth")) {
    accessors.push(
      `${INDENT}private var borderWidth: CGFloat { pxSlot("${chrome.borderWidth}") ?? 0 }`,
    );
  }
  if (has("radius")) {
    accessors.push(
      `${INDENT}private var radius: CGFloat { pxSlot("${chrome.radius}") ?? 0 }`,
    );
  }
  if (has("blockPadding")) {
    accessors.push(
      `${INDENT}private var blockPadding: CGFloat { pxSlot("${chrome.blockPadding}") ?? 0 }`,
    );
  }
  if (has("inlinePadding")) {
    accessors.push(
      `${INDENT}private var inlinePadding: CGFloat { pxSlot("${chrome.inlinePadding}") ?? 0 }`,
    );
  }
  if (has("minHeight")) {
    accessors.push(
      `${INDENT}private var minHeight: CGFloat { pxSlot("${chrome.minHeight}") ?? 0 }`,
    );
  }
  lines.push(...accessors);
  lines.push("");

  // Label content: loading swaps the projected content for a progress
  // affordance (the spinner part's decoration role realized natively).
  if (hasConventionalProp(ir, "loading")) {
    lines.push(`${INDENT}@ViewBuilder`);
    lines.push(`${INDENT}private var labelContent: some View {`);
    lines.push(`${INDENT}${INDENT}if loading {`);
    lines.push(`${INDENT}${INDENT}${INDENT}ProgressView().controlSize(.small)`);
    lines.push(`${INDENT}${INDENT}} else {`);
    lines.push(`${INDENT}${INDENT}${INDENT}label`);
    lines.push(`${INDENT}${INDENT}}`);
    lines.push(`${INDENT}}`);
    lines.push("");
  }

  // Body.
  lines.push(`${INDENT}public var body: some View {`);
  const action = hasConventionalProp(ir, "onClick") ? "{ onTap?() }" : "{}";
  const innerContent = hasConventionalProp(ir, "loading")
    ? "labelContent"
    : "label";
  lines.push(`${INDENT}${INDENT}Button(action: ${action}) {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${innerContent}`);
  if (has("blockPadding")) {
    lines.push(
      `${INDENT}${INDENT}${INDENT}${INDENT}.padding(.vertical, blockPadding)`,
    );
  }
  if (has("inlinePadding")) {
    lines.push(
      `${INDENT}${INDENT}${INDENT}${INDENT}.padding(.horizontal, inlinePadding)`,
    );
  }
  if (has("minHeight")) {
    lines.push(
      `${INDENT}${INDENT}${INDENT}${INDENT}.frame(minHeight: minHeight)`,
    );
  }
  if (has("background")) {
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}.background(background)`);
  }
  if (has("radius")) {
    lines.push(
      `${INDENT}${INDENT}${INDENT}${INDENT}.clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))`,
    );
  }
  if (has("borderColor") && has("borderWidth")) {
    const radiusExpr = has("radius") ? "radius" : "0";
    lines.push(
      `${INDENT}${INDENT}${INDENT}${INDENT}.overlay(` +
        `RoundedRectangle(cornerRadius: ${radiusExpr}, style: .continuous)` +
        `.stroke(borderColor, lineWidth: borderWidth))`,
    );
  }
  lines.push(`${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}.buttonStyle(.plain)`);
  if (has("foreground")) {
    lines.push(`${INDENT}${INDENT}.foregroundStyle(foreground)`);
  }
  if (hasConventionalProp(ir, "disabled") && hasConventionalProp(ir, "loading")) {
    lines.push(`${INDENT}${INDENT}.disabled(disabled || loading)`);
  } else if (hasConventionalProp(ir, "disabled")) {
    lines.push(`${INDENT}${INDENT}.disabled(disabled)`);
  }
  if (hasConventionalProp(ir, "ariaLabel")) {
    lines.push(`${INDENT}${INDENT}.fsdsAccessibilityLabel(accessibilityLabel)`);
  }
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");

  return lines.join("\n");
}

/**
 * Resolve every chrome concern the component authors slots for. Emitters
 * consult this once and generate accessors/modifiers only for present
 * concerns — absent concerns are skipped, never defaulted into existence.
 */
export function resolveChrome(ir: ComponentIR): Partial<Record<SlotConcern, string>> {
  const chrome: Partial<Record<SlotConcern, string>> = {};
  for (const concern of Object.keys(SLOT_SUFFIX_ALTERNATIVES) as SlotConcern[]) {
    const suffix = pickSuffix(ir, concern);
    if (suffix) chrome[concern] = suffix;
  }
  return chrome;
}

/**
 * Axis facts for variant-layered components. An axis with an authored
 * contract default always layers; an axis without one becomes an optional
 * parameter whose layer is applied only when set (the web behavior for
 * unset variant props — no variant class, no overrides).
 */
interface VariantAxis {
  prop: string;
  typeName: string;
  defaultMember: string | null;
}

function collectVariantAxes(ir: ComponentIR): VariantAxis[] {
  // An axis is emitted only when its prop references a declared union
  // type (e.g. ButtonVariant); axes without a typed prop (Links' inline
  // size values) are omitted from the API rather than guessed at.
  return Object.keys(ir.variants)
    .map((axis) => {
      const prop = ir.styledProps.find((p) => p.safeName === axis);
      const typeName = prop?.typeRefs.find((ref) => ir.definedTypes[ref]);
      if (!typeName) return null;
      return {
        prop: axis,
        typeName,
        defaultMember: findPropDefaultOrNull(ir, axis),
      };
    })
    .filter((axis): axis is VariantAxis => axis !== null);
}

function findPropDefaultOrNull(ir: ComponentIR, name: string): string | null {
  const prop = ir.styledProps.find((p) => p.safeName === name);
  const authored = prop?.defaultExpr?.replace(/^["']|["']$/g, "");
  const values = ir.variants[name];
  if (authored && values?.includes(authored)) return authored;
  return null;
}

/**
 * Emit the Swift layer-expression list for the variant axes: authored
 * defaults layer unconditionally; optional axes layer via compactMap over
 * the optional parameter.
 */
function emitLayerExpressions(axes: VariantAxis[]): {
  expressions: string[];
  needsCompactMap: boolean;
} {
  const expressions = axes.map((axis) =>
    axis.defaultMember !== null
      ? `"variant_\\(${escapeSwiftKeyword(axis.prop)}.rawValue)"`
      : `${escapeSwiftKeyword(axis.prop)}.map { "variant_\\($0.rawValue)" }`,
  );
  return {
    expressions,
    needsCompactMap: axes.some((a) => a.defaultMember === null),
  };
}

/**
 * Emit a compound-part composer: one ViewBuilder region closure per
 * compound part (contract part order), chrome from the root scope, variant
 * axes layered per their defaults. Card is the corpus consumer.
 */
function emitComposerComponent(
  ir: ComponentIR,
  regionNames: string[],
): string {
  const exportName = swiftExportName(ir.name);
  const chrome = resolveChrome(ir);
  const clipping = nativeRootClipping(ir, "ios");
  const regions = regionNames;
  const axes = collectVariantAxes(ir);
  const layerInfo = emitLayerExpressions(axes);
  const layerArray = [
    '"root"',
    ...layerInfo.expressions,
  ];
  const layersExpr = layerInfo.needsCompactMap
    ? `[${layerArray.join(", ")}].compactMap { $0 }`
    : `[${layerArray.join(", ")}]`;

  const lines: string[] = [];
  lines.push("// @generated:start component");
  lines.push(
    `/// Token scope data for ${exportName} (ir.tokenScopes → RN normal ` +
      `form: data consumed through FsdsTheme at render, never resolved ` +
      `constants). A caseless enum namespace because generic types cannot ` +
      `hold static stored properties.`,
  );
  lines.push(`enum ${ir.name}Tokens {`);
  lines.push(`${INDENT}public static let scopes: FsdsComponentTokenScopes = [${ir.tokenScopes.length === 0 ? ":" : ""}`);
  for (const scope of ir.tokenScopes) {
    lines.push(`${INDENT}${INDENT}"${scope.scope}": [`);
    for (const value of scope.values) {
      let literalArg = "";
      const refArg = value.resolvesTo ? `ref: "${value.resolvesTo}"` : "";
      if (value.rawValue) {
        const kind = value.isLiteral ? "literal" : "fallback";
        const dark = graphDarkFor(value);
        literalArg = dark
          ? `${kind}: .adaptive(light: ${swiftLiteral(value.rawValue)}, dark: ${swiftLiteral(dark)})`
          : `${kind}: .string(${swiftLiteral(value.rawValue)})`;
      }
      lines.push(
        `${INDENT}${INDENT}${INDENT}"${value.name}": FsdsComponentTokenDefinition(` +
          `cssVar: "${value.cssVar}", name: "${value.name}"${refArg ? ", " + refArg : ""}${literalArg ? ", " + literalArg : ""}),`,
      );
    }
    lines.push(`${INDENT}${INDENT}],`);
  }
  lines.push(`${INDENT}]`);
  lines.push(`}`);
  lines.push("");
  lines.push(
    `/// Emitted through a composer path: passive container root, one ` +
      `content region per named region (compound part or named slot).`,
  );
  if (exportName !== ir.name) {
    lines.push(
      `/// SwiftUI reserves the \`${ir.name}\` type name; this target ` +
        `exports it as \`${exportName}\`.`,
    );
  }
  const genericParams = regions.map((r) => swiftCase(capitalize(r)));
  lines.push(
    `public struct ${exportName}${genericParams.length > 0 ? `<${genericParams.map((g) => `${g}: View`).join(", ")}>` : ""}: View {`,
  );
  lines.push(
    `${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`,
  );
  lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
  lines.push(`${INDENT}}`);
  for (const axis of axes) {
    lines.push(
      `${INDENT}private let ${escapeSwiftKeyword(axis.prop)}: ${axis.typeName}${axis.defaultMember === null ? "?" : ""}`,
    );
  }
  for (const region of regions) {
    lines.push(`${INDENT}private let ${swiftCase(region)}: ${swiftCase(capitalize(region))}`);
  }
  lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params: string[] = [];
  for (const axis of axes) {
    params.push(
      axis.defaultMember !== null
        ? `${INDENT}${INDENT}${axis.prop}: ${axis.typeName} = .${swiftCaseRef(axis.defaultMember)},`
        : `${INDENT}${INDENT}${axis.prop}: ${axis.typeName}? = nil,`,
    );
  }
  for (const region of regions) {
    params.push(
      `${INDENT}${INDENT}@ViewBuilder ${region}: () -> ${capitalize(region)} = { EmptyView() },`,
    );
  }
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  lines.push(...params);
  lines.push(`${INDENT}) {`);
  for (const axis of axes) {
    lines.push(`${INDENT}${INDENT}self.${escapeSwiftKeyword(axis.prop)} = ${escapeSwiftKeyword(axis.prop)}`);
  }
  for (const region of regions) {
    lines.push(`${INDENT}${INDENT}self.${region} = ${region}()`);
  }
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}private var layered: [String: FsdsTokenValue?] {`);
  lines.push(`${INDENT}${INDENT}resolveFsdsLayeredTokens(`);
  lines.push(`${INDENT}${INDENT}${INDENT}fsdsScopes,`);
  lines.push(`${INDENT}${INDENT}${INDENT}fsdsTheme,`);
  lines.push(`${INDENT}${INDENT}${INDENT}layers: ${layersExpr}`);
  lines.push(`${INDENT}${INDENT})`);
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}private func colorSlot(_ suffix: String) -> Color? {`);
  lines.push(
    `${INDENT}${INDENT}layered.first { $0.key.hasSuffix(suffix) }?.value?.color`,
  );
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}private func pxSlot(_ suffix: String, requireRadius: Bool = false) -> CGFloat? {`);
  lines.push(
    `${INDENT}${INDENT}let value = layered.first { $0.key.hasSuffix(suffix) }?.value`,
    `${INDENT}${INDENT}return requireRadius ? fsdsRequireRadius(value, slot: suffix) : value?.px`,
  );
  lines.push(`${INDENT}}`);
  lines.push("");
  const accessors: string[] = [];
  if (chrome.background) {
    accessors.push(`${INDENT}private var background: Color { colorSlot("${chrome.background}") ?? .accentColor }`);
  }
  if (chrome.foreground) {
    accessors.push(`${INDENT}private var foreground: Color { colorSlot("${chrome.foreground}") ?? .primary }`);
  }
  if (chrome.borderColor) {
    accessors.push(`${INDENT}private var borderColor: Color { colorSlot("${chrome.borderColor}") ?? .clear }`);
  }
  if (chrome.borderWidth) {
    accessors.push(`${INDENT}private var borderWidth: CGFloat { pxSlot("${chrome.borderWidth}") ?? 0 }`);
  }
  if (chrome.radius) {
    accessors.push(`${INDENT}private var radius: CGFloat { pxSlot("${chrome.radius}", requireRadius: true) ?? 0 }`);
  }
  if (chrome.blockPadding) {
    accessors.push(`${INDENT}private var blockPadding: CGFloat { pxSlot("${chrome.blockPadding}") ?? 0 }`);
  }
  if (chrome.inlinePadding) {
    accessors.push(`${INDENT}private var inlinePadding: CGFloat { pxSlot("${chrome.inlinePadding}") ?? 0 }`);
  }
  if (chrome.gap) {
    accessors.push(`${INDENT}private var gap: CGFloat { pxSlot("${chrome.gap}") ?? 0 }`);
  }
  if (chrome.statusAccentColor) {
    accessors.push(`${INDENT}private var statusAccent: Color { colorSlot("${chrome.statusAccentColor}") ?? .clear }`);
  }
  if (chrome.statusAccentWidth) {
    accessors.push(`${INDENT}private var statusAccentWidth: CGFloat { pxSlot("${chrome.statusAccentWidth}") ?? 0 }`);
  }
  lines.push(...accessors);
  lines.push("");
  lines.push(`${INDENT}@ViewBuilder`);
  lines.push(`${INDENT}private var regions: some View {`);
  lines.push(
    `${INDENT}${INDENT}VStack(spacing: ${chrome.gap ? "gap" : "nil"}) {`,
  );
  for (const region of regions) {
    lines.push(`${INDENT}${INDENT}${INDENT}${region}`);
  }
  lines.push(`${INDENT}${INDENT}}`);
  lines.push(`${INDENT}}`);
  lines.push("");
  const hasAccentBar =
    chrome.statusAccentColor !== undefined && chrome.statusAccentWidth !== undefined;
  lines.push(`${INDENT}public var body: some View {`);
  if (hasAccentBar) {
    lines.push(`${INDENT}${INDENT}HStack(spacing: 0) {`);
    lines.push(
      `${INDENT}${INDENT}${INDENT}Rectangle().fill(statusAccent).frame(width: statusAccentWidth)`,
    );
    lines.push(`${INDENT}${INDENT}${INDENT}regions`);
    lines.push(`${INDENT}${INDENT}}`);
  } else {
    lines.push(`${INDENT}${INDENT}regions`);
  }
  if (chrome.blockPadding) {
    lines.push(`${INDENT}${INDENT}${INDENT}.padding(.vertical, blockPadding)`);
  }
  if (chrome.inlinePadding) {
    lines.push(`${INDENT}${INDENT}${INDENT}.padding(.horizontal, inlinePadding)`);
  }
  if (chrome.background) {
    lines.push(`${INDENT}${INDENT}${INDENT}.background(background, in: RoundedRectangle(cornerRadius: ${chrome.radius ? "radius" : "0"}, style: .continuous))`);
  }
  if (clipping === "hidden") {
    lines.push(chrome.radius
      ? `${INDENT}${INDENT}${INDENT}.clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))`
      : `${INDENT}${INDENT}${INDENT}.clipped()`);
  }
  if (chrome.borderColor && chrome.borderWidth) {
    const radiusExpr = chrome.radius ? "radius" : "0";
    lines.push(
      `${INDENT}${INDENT}${INDENT}.overlay(` +
        `RoundedRectangle(cornerRadius: ${radiusExpr}, style: .continuous)` +
        `.stroke(borderColor, lineWidth: borderWidth))`,
    );
  }
  if (chrome.foreground) {
    lines.push(`${INDENT}${INDENT}${INDENT}.foregroundStyle(foreground)`);
  }
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");

  return lines.join("\n");
}

/** Swift keywords that may appear as union values (e.g. CardDensity `default`, ListVariant `as`). */
const SWIFT_KEYWORDS: ReadonlySet<string> = new Set([
  "default", "in", "out", "case", "for", "if", "else", "return", "init",
  "as", "is", "guard", "while", "defer", "where", "extension",
  "internal", "public", "private", "open", "static", "self", "Type", "Protocol",
]);

export function escapeSwiftKeyword(identifier: string): string {
  if (SWIFT_KEYWORDS.has(identifier)) return `\`${identifier}\``;
  if (/^[0-9]/.test(identifier)) return `\`${identifier}\``;
  return identifier;
}

/** `in-progress` → `case inProgress = "in-progress"` (kebab values keep a raw value). */
export function swiftCaseDecl(value: string): string {
  const swiftName = swiftCase(value);
  if (swiftName !== value) return `${swiftName} = "${value}"`;
  return escapeSwiftKeyword(swiftName);
}

/** Enum member reference: `.default` → `` .`default` `` for keyword members. */
export function swiftCaseRef(value: string): string {
  return escapeSwiftKeyword(swiftCase(value));
}

/** `in-progress` → `inProgress` (Swift identifier reference). */
export function swiftCase(value: string): string {
  return value
    .split("-")
    .map((part, i) =>
      i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join("");
}


/** Chrome accessor lines shared by the component and surface emitters. */
export function emitChromeAccessorLines(
  chrome: Partial<Record<SlotConcern, string>>,
  include: readonly SlotConcern[],
): string[] {
  const accessors: string[] = [];
  for (const concern of include) {
    const suffix = chrome[concern];
    if (!suffix) continue;
    switch (concern) {
      case "background":
        accessors.push(`${INDENT}private var background: Color { colorSlot("${suffix}") ?? .accentColor }`);
        break;
      case "foreground":
        accessors.push(`${INDENT}private var foreground: Color { colorSlot("${suffix}") ?? .primary }`);
        break;
      case "borderColor":
        accessors.push(`${INDENT}private var borderColor: Color { colorSlot("${suffix}") ?? .clear }`);
        break;
      case "borderWidth":
        accessors.push(`${INDENT}private var borderWidth: CGFloat { pxSlot("${suffix}") ?? 0 }`);
        break;
      case "radius":
        accessors.push(`${INDENT}private var radius: CGFloat { pxSlot("${suffix}") ?? 0 }`);
        break;
      case "blockPadding":
        accessors.push(`${INDENT}private var blockPadding: CGFloat { pxSlot("${suffix}") ?? 0 }`);
        break;
      case "inlinePadding":
        accessors.push(`${INDENT}private var inlinePadding: CGFloat { pxSlot("${suffix}") ?? 0 }`);
        break;
      case "gap":
        accessors.push(`${INDENT}private var gap: CGFloat { pxSlot("${suffix}") ?? 0 }`);
        break;
      case "minHeight":
        accessors.push(`${INDENT}private var minHeight: CGFloat { pxSlot("${suffix}") ?? 0 }`);
        break;
      case "statusAccentColor":
        accessors.push(`${INDENT}private var statusAccent: Color { colorSlot("${suffix}") ?? .clear }`);
        break;
      case "statusAccentWidth":
        accessors.push(`${INDENT}private var statusAccentWidth: CGFloat { pxSlot("${suffix}") ?? 0 }`);
        break;
    }
  }
  return accessors;
}

/**
 * Lazily loaded resolved token graph (read-only). Theme-aware tokens carry
 * $value {light, dark}; invariant tokens carry a plain string. Used ONLY
 * to source dark values for adaptive pairs — the contract fallback stays
 * the light authority. Absent graph → no adaptive pairs (documented
 * degradation; CI/pre-push always build tokens before generation).
 */
let resolvedTokenGraph: Record<string, unknown> | null | undefined;

function loadResolvedGraph(contractsRoot?: string): Record<string, unknown> | null {
  if (resolvedTokenGraph !== undefined) return resolvedTokenGraph;
  try {
    // contractsRoot = <repo>/packages/ds-contracts when threaded; the
    // codegen CLI and the vitest suite both run from the repo root, so
    // process.cwd() is the equivalent fallback for unthreaded call sites.
    const repoRoot = contractsRoot
      ? nodePath.resolve(contractsRoot, "..", "..")
      : process.cwd();
    const graphPath = nodePath.resolve(
      repoRoot,
      "packages",
      "ds-tokens",
      "generated",
      "resolved.tokens.json",
    );
    resolvedTokenGraph = JSON.parse(
      nodeFs.readFileSync(graphPath, "utf8"),
    ) as Record<string, unknown>;
  } catch {
    resolvedTokenGraph = null;
  }
  return resolvedTokenGraph;
}

/** Walk the graph along a dotted path; null when absent. */
function graphValueAt(
  graph: Record<string, unknown>,
  resolvesTo: string,
): unknown {
  let node: unknown = graph;
  for (const segment of resolvesTo.split(".")) {
    if (typeof node !== "object" || node === null) return null;
    node = (node as Record<string, unknown>)[segment];
  }
  return node;
}

/**
 * The dark half of a theme-aware color token, when the slot resolves to
 * one: $value must be {light, dark} with a hex dark. The light half is
 * not taken from the graph — the contract fallback stays the light
 * authority (the corpus's collapsed-to-light convention).
 */
function graphDarkFor(
  value: { name: string; rawValue?: string; resolvesTo?: string },
  contractsRoot?: string,
): string | null {
  // The component-local slot name does not exist in the graph; the
  // resolvesTo path is the graph address.
  if (!value.resolvesTo) return null;
  if (!value.rawValue || !value.rawValue.startsWith("#")) return null;
  const graph = loadResolvedGraph(contractsRoot);
  if (!graph) return null;
  const token = graphValueAt(graph, value.resolvesTo);
  if (typeof token !== "object" || token === null) return null;
  const tokenValue = (token as Record<string, unknown>).$value;
  if (typeof tokenValue !== "object" || tokenValue === null) return null;
  const dark = (tokenValue as Record<string, unknown>).dark;
  return typeof dark === "string" && dark.startsWith("#") ? dark : null;
}

/** Generated token-scope-data lines shared by the component and surface emitters. */
export function emitTokenScopesSection(
  ir: ComponentIR,
  contractsRoot?: string,
): string[] {
  const lines: string[] = [];
  lines.push(
    `/// Token scope data for ${swiftExportName(ir.name)} (ir.tokenScopes → RN normal ` +
      `form: data consumed through FsdsTheme at render, never resolved ` +
      `constants). A caseless enum namespace because generic types cannot ` +
      `hold static stored properties.`,
  );
  lines.push(`enum ${ir.name}Tokens {`);
  lines.push(`${INDENT}public static let scopes: FsdsComponentTokenScopes = [${ir.tokenScopes.length === 0 ? ":" : ""}`);
  for (const scope of ir.tokenScopes) {
    lines.push(`${INDENT}${INDENT}"${scope.scope}": [`);
    for (const value of scope.values) {
      let literalArg = "";
      const refArg = value.resolvesTo ? `ref: "${value.resolvesTo}"` : "";
      if (value.rawValue) {
        const kind = value.isLiteral ? "literal" : "fallback";
        const dark = graphDarkFor(value, contractsRoot);
        literalArg = dark
          ? `${kind}: .adaptive(light: ${swiftLiteral(value.rawValue)}, dark: ${swiftLiteral(dark)})`
          : `${kind}: .string(${swiftLiteral(value.rawValue)})`;
      }
      lines.push(
        `${INDENT}${INDENT}${INDENT}"${value.name}": FsdsComponentTokenDefinition(` +
          `cssVar: "${value.cssVar}", name: "${value.name}"${refArg ? ", " + refArg : ""}${literalArg ? ", " + literalArg : ""}),`,
      );
    }
    lines.push(`${INDENT}${INDENT}],`);
  }
  lines.push(`${INDENT}]`);
  lines.push(`}`);
  return lines;
}

function hasConventionalProp(ir: ComponentIR, name: string): boolean {
  return ir.styledProps.some((p) => p.safeName === name);
}

function findPropDefault(ir: ComponentIR, name: string): string {
  const prop = ir.styledProps.find((p) => p.safeName === name);
  const authored = prop?.defaultExpr?.replace(/^["']|["']$/g, "");
  const values = ir.variants[name];
  if (authored && values?.includes(authored)) return authored;
  return values?.[0] ?? "unknown";
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function emitImports(): string {
  return [
    "// @generated:start imports",
    "import SwiftUI",
    "// @generated:end",
  ].join("\n");
}

export function emitTypes(ir: ComponentIR): string {
  const lines: string[] = ["// @generated:start types"];
  for (const [typeName, def] of Object.entries(ir.definedTypes)) {
    if (def.kind !== "union" || !def.values) continue;
    lines.push(`public enum ${typeName}: String, CaseIterable {`);
    for (const value of def.values) {
      lines.push(`${INDENT}case ${swiftCaseDecl(value)}`);
    }
    lines.push("}");
  }
  lines.push("// @generated:end");
  return lines.join("\n");
}

/**
 * Emit a SwiftUI View struct whose body collapses to `Toggle(.switch)`.
 *
 * Channel projection (controllable-state pattern):
 *   - `controlledChecked: Binding<Bool>?`         from channel.value
 *   - `@State private var uncontrolledChecked`    from channel.defaultValue
 *   - `onChange: ((Bool) -> Void)?`               from channel.onChange
 *
 * The two derived helpers (`checked` getter, `setChecked` mutator)
 * implement the same controlled-takes-precedence rule as React's
 * `useControllableState`. SwiftUI's `Binding(get:set:)` ties the
 * native Toggle to those helpers.
 *
 * Non-channel props (size, disabled, name, value, accessibilityLabel)
 * are emitted as plain `let` fields. `name` and `value` are retained
 * in the public API for consumers wiring to a form layer but are not
 * read by the body — that matches the round-1 golden where form data
 * is informational on non-web targets.
 */
function emitToggleComponent(ir: ComponentIR): string {
  const checkedChannel = findChannel(ir, "checked");
  if (!checkedChannel) {
    throw new Error(
      `generateSwiftUIComponentSource: ${ir.name} declares native-toggle-` +
        `affordance but has no "checked" channel.`,
    );
  }

  const sizeTypeName = findSizeTypeName(ir);
  const sizeDefaultMember = sizeTypeName
    ? findSizeDefaultMember(ir, sizeTypeName)
    : undefined;
  // Track geometry is emitted only when the contract authors width AND
  // height token facts for at least one variant. Without authored facts the
  // native Toggle keeps its intrinsic platform size — never a 0x0 frame.
  const hasTrackGeometry =
    sizeTypeName !== undefined &&
    sizeDefValues(ir, sizeTypeName).some(
      (v) =>
        sizeValuePx(ir, v, "width") !== undefined &&
        sizeValuePx(ir, v, "height") !== undefined,
    );

  const lines: string[] = [];
  lines.push("// @generated:start component");
  lines.push(`public struct ${ir.name}: View {`);

  // Channel storage
  lines.push(`${INDENT}@StateObject private var checked: ControllableValue<Bool>`);

  // Non-channel props (deterministic order matching golden)
  if (sizeTypeName) {
    lines.push(`${INDENT}private let size: ${sizeTypeName}`);
  }
  lines.push(`${INDENT}private let disabled: Bool`);
  lines.push(`${INDENT}private let name: String?`);
  lines.push(`${INDENT}private let value: String?`);
  lines.push(`${INDENT}private let accessibilityLabel: String?`);
  lines.push("");

  // Initializer
  lines.push(`${INDENT}public init(`);
  lines.push(`${INDENT}${INDENT}checked: Binding<Bool>? = nil,`);
  lines.push(`${INDENT}${INDENT}defaultChecked: Bool = false,`);
  lines.push(`${INDENT}${INDENT}onChange: ((Bool) -> Void)? = nil,`);
  if (sizeTypeName && sizeDefaultMember) {
    lines.push(`${INDENT}${INDENT}size: ${sizeTypeName} = .${swiftCaseRef(sizeDefaultMember)},`);
  }
  lines.push(`${INDENT}${INDENT}disabled: Bool = false,`);
  lines.push(`${INDENT}${INDENT}name: String? = nil,`);
  lines.push(`${INDENT}${INDENT}value: String? = nil,`);
  lines.push(`${INDENT}${INDENT}accessibilityLabel: String? = nil`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self._checked = StateObject(wrappedValue: ControllableValue(controlled: checked, defaultValue: defaultChecked, onChange: onChange))`);
  if (sizeTypeName) {
    lines.push(`${INDENT}${INDENT}self.size = size`);
  }
  lines.push(`${INDENT}${INDENT}self.disabled = disabled`);
  lines.push(`${INDENT}${INDENT}self.name = name`);
  lines.push(`${INDENT}${INDENT}self.value = value`);
  lines.push(
    `${INDENT}${INDENT}self.accessibilityLabel = accessibilityLabel`,
  );

  lines.push(`${INDENT}}`);
  lines.push("");

  // Channel write accessor

  // Body: Toggle with .switch style
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}Toggle(isOn: Binding(`);
  lines.push(`${INDENT}${INDENT}${INDENT}get: { checked.value },`);
  lines.push(`${INDENT}${INDENT}${INDENT}set: { checked.set($0) }`);
  lines.push(`${INDENT}${INDENT})) {`);
  lines.push(`${INDENT}${INDENT}${INDENT}EmptyView()`);
  lines.push(`${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}.toggleStyle(.switch)`);
  lines.push(`${INDENT}${INDENT}.disabled(disabled)`);
  lines.push(
    `${INDENT}${INDENT}.fsdsAccessibilityLabel(accessibilityLabel)`,
  );
  lines.push(
    `${INDENT}${INDENT}.accessibilityValue(checked.value ? "on" : "off")`,
  );
  if (hasTrackGeometry) {
    lines.push(
      `${INDENT}${INDENT}.frame(width: trackWidth, height: trackHeight)`,
    );
  }
  lines.push(`${INDENT}}`);
  lines.push("");

  // Size accessors — variants with no authored token fall through to the
  // contract-declared default member's value so SwiftUI never ships a
  // 0-sized track. Skipped entirely when no track geometry is authored
  // (the native control's intrinsic size is the honest realization).
  if (sizeTypeName && sizeDefaultMember && hasTrackGeometry) {
    emitSizeAccessor(lines, "trackWidth", ir, sizeTypeName, sizeDefaultMember, "width");
    lines.push("");
    emitSizeAccessor(lines, "trackHeight", ir, sizeTypeName, sizeDefaultMember, "height");
  }

  lines.push(`}`);
  lines.push("// @generated:end");

  return lines.join("\n");
}

function emitSizeAccessor(
  lines: string[],
  accessorName: string,
  ir: ComponentIR,
  sizeTypeName: string,
  defaultMember: string,
  dimension: "width" | "height",
): void {
  const sizeDef = ir.definedTypes[sizeTypeName];
  if (!sizeDef?.values) return;

  // Per-variant size values come from typed token facts (FEAT-MOBILE-IR-001),
  // not from regexing CSS var() strings. A variant with no authored token
  // falls through to the default member's value.
  const defaultValue = sizeValuePx(ir, defaultMember, dimension);

  lines.push(`${INDENT}private var ${accessorName}: CGFloat {`);
  lines.push(`${INDENT}${INDENT}switch size {`);
  for (const value of sizeDef.values) {
    const variantPx = sizeValuePx(ir, value, dimension);
    const px = variantPx ?? defaultValue ?? 0;
    lines.push(`${INDENT}${INDENT}case .${swiftCaseRef(value)}: return ${px}`);
  }
  lines.push(`${INDENT}${INDENT}}`);
  lines.push(`${INDENT}}`);
}

function findChannel(
  ir: ComponentIR,
  name: string,
): NormalizedChannelIR | undefined {
  return ir.behavior.normalizedChannels.find((c) => c.name === name);
}

/**
 * Find the `<Component>Size` defined type, if the contract declares one.
 * Returns undefined when no size variants exist.
 */
function findSizeTypeName(ir: ComponentIR): string | undefined {
  const expected = `${ir.name}Size`;
  if (ir.definedTypes[expected]?.kind === "union") return expected;
  return undefined;
}

/**
 * Declared values of a union defined type (empty when absent).
 */
function sizeDefValues(ir: ComponentIR, sizeTypeName: string): string[] {
  return ir.definedTypes[sizeTypeName]?.values ?? [];
}

/**
 * The default member of the size union, derived from the contract's
 * `props[].default` fact — never a hardcoded member name (ToggleSwitch's
 * union is small/medium/large with default `medium`; Switch's is
 * sm/md/lg with default `md`). Located by the prop's type ref, not by a
 * prop-name literal. Fails loudly when the authored default is not a
 * member of the union; falls back to the first member only when the
 * contract authors no default at all.
 */
function findSizeDefaultMember(ir: ComponentIR, sizeTypeName: string): string {
  const values = ir.definedTypes[sizeTypeName]?.values ?? [];
  const prop = ir.styledProps.find((p) => p.typeRefs.includes(sizeTypeName));
  const authored = prop?.defaultExpr?.replace(/^["']|["']$/g, "");
  if (authored) {
    if (!values.includes(authored)) {
      throw new Error(
        `generateSwiftUIComponentSource: prop "${prop?.name}" defaults to ` +
          `"${authored}", which is not a member of ${sizeTypeName} ` +
          `(${values.join(", ")}).`,
      );
    }
    return authored;
  }
  return values[0]!;
}

/**
 * Resolve the pixel value for a `<componentSlug>.size.<variant>.track.<dimension>`
 * token from typed token facts (FEAT-MOBILE-IR-001), NOT by parsing CSS.
 *
 * The token fact's `rawValue` is the concrete value the contract authored as
 * the var() fallback (e.g. `"48px"`); we read it directly and parse the
 * leading integer. Returns undefined when no fact for that variant/dimension
 * exists, so the caller can fall back to md.
 *
 * Lookup is by the slot `name` (path), which is target-neutral and embeds the
 * variant — no CSS custom-property string is constructed or scanned, and no
 * branch is keyed on component identity.
 */
function sizeValuePx(
  ir: ComponentIR,
  variant: string,
  dimension: "width" | "height",
): number | undefined {
  const slotName = `${ir.cssPrefix}.size.${variant}.track.${dimension}`;
  const fact = ir.tokenFacts.find(
    (t: TokenFactIR) => t.name === slotName && t.rawValue !== undefined,
  );
  if (!fact?.rawValue) return undefined;
  const match = fact.rawValue.match(/^(\d+)/);
  return match ? Number(match[1]) : undefined;
}
