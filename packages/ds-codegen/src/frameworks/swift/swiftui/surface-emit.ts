import { nativeSlotArguments, nativeTokenScopes } from "../../native-token-consumption.js";
import { resolveSurfaceAutoDismiss } from "../../../semantics.js";
/**
 * SwiftUI surface emission.
 *
 * The surface path routes by `ir.surface.kind`:
 *
 * - Centered modal (`dialog`, blocking modality): presented as a SwiftUI
 *   `.sheet` whose dismissal drives the openness channel back through the
 *   controllable-state projection (native Esc/overlay dismissal realizes
 *   the contract's escape/overlayClick triggers). FEAT-SWIFTUI-DIALOG-SURFACE-01.
 * - Anchored tooltip: the trigger region hosts consumer content; hover
 *   drives the open channel and presents the content region in a popover
 *   (FEAT-SWIFTUI-TOOLTIP-ANCHOR-01). Anchored popovers still throw.
 *
 * The component path refuses every surface kind; all surfaces route here.
 */
import type { ComponentIR } from "../../../ir.js";
import { partTextSource, type NativeTextSource } from "../../native-messages.js";
import { swiftMessage, swiftStringProp, withSwiftMessagesEnvironment, type SwiftStringProp } from "./messages.js";
import {
  emitTypes,
  swiftCase,
  swiftExportName,
  resolveChrome,
  emitChromeAccessorLines,
  emitTokenScopesSection,
} from "./component-source.js";

const INDENT = "    ";

export function isSurfaceComponent(ir: ComponentIR): boolean {
  return ir.surface != null;
}

export interface SwiftUISurfaceFiles {
  componentFile: string;
  behaviorFile: string | null;
}

/** Swift reserved member names on a View — `body` collides with the View requirement. */
const SWIFT_VIEW_RESERVED_MEMBERS: ReadonlySet<string> = new Set(["body"]);

function regionPropertyName(part: string): string {
  return SWIFT_VIEW_RESERVED_MEMBERS.has(part) ? `${part}Content` : part;
}

export function generateSwiftUISurfaceFiles(ir: ComponentIR): SwiftUISurfaceFiles {
  const withTypes = (body: string): string => {
    // Project only the data section: compile-time decisions still see the full IR.
    const used = nativeSlotArguments(body, ["colorSlot", "pxSlot"]);
    const original = emitTokenScopesSection(ir).join("\n");
    const projected = emitTokenScopesSection({ ...ir, tokenScopes: nativeTokenScopes(ir, used, true) }).join("\n");
    if (!body.includes(original)) throw new Error(`Missing Swift token section for ${ir.name}`);
    const sections = [emitTypes(ir), withSwiftMessagesEnvironment(body.replace(original, projected), INDENT)];
    return sections.filter((x) => x.trim().length > 0).join("\n\n") + "\n";
  };
  if (!ir.surface) {
    throw new Error("generateSwiftUISurfaceFiles: component declares no surface block.");
  }
  if (ir.surface.kind === "tooltip" || ir.surface.kind === "popover") {
    return { componentFile: withTypes(emitAnchoredSurface(ir)), behaviorFile: null };
  }
  if (ir.surface.kind === "coachmark") {
    return { componentFile: withTypes(emitCoachmarkSurface(ir)), behaviorFile: null };
  }
  if (ir.surface.kind === "toast") {
    // The generative proof of the compositional substrate: a NEW surface
    // kind emits through the same ControllableValue channel with only a
    // presentation row — ephemeral presence drives a dwell auto-dismiss
    // task whose duration comes from the motion token scopes. Zero new
    // state-machine code (FEAT-SWIFTUI-PRESENCE-COMPOSITION-01).
    return { componentFile: withTypes(emitToastSurface(ir)), behaviorFile: null };
  }
  // `sheet` shares the centered-modal presentation shape (openness
  // channel + compound content regions); macOS sheets are window-attached
  // and modal, so side/modal props are omitted-and-documented.
  if (ir.surface.kind !== "dialog" && ir.surface.kind !== "sheet") {
    throw new Error(
      `generateSwiftUISurfaceFiles: surface kind "${ir.surface.kind}" is not ` +
        `implemented — implemented kinds are the centered modal (dialog/` +
        `sheet) and the anchored tooltip. Anchored popovers remain a later ` +
        `slice.`,
    );
  }
  const openness = ir.behavior.normalizedChannels.find(
    (c) => c.valueType === "boolean",
  );
  const searchChannel = ir.behavior.normalizedChannels.find(
    (c) => c.valueType === "string",
  );
  // The search prompt is the placeholder prop: an explicit value, then its
  // message (catalog-resolved) or authored literal; with no prop, no prompt.
  const placeholder = searchChannel && ir.styledProps.some((p) => p.safeName === "placeholder")
    ? swiftStringProp(ir, "placeholder", INDENT)
    : null;
  const searchPrompt = placeholder
    ? placeholder.accessor.length > 0
      ? "SwiftUI.Text(placeholder)"
      : "placeholder.map { SwiftUI.Text($0) }"
    : null;
  if (!openness) {
    throw new Error(
      `generateSwiftUISurfaceFiles: dialog surface on "${ir.name}" declares ` +
        `no boolean openness channel.`,
    );
  }

  const exportName = swiftExportName(ir.name);
  const chrome = resolveChrome(ir);
  const regions = ir.compoundParts.map((part) => regionPropertyName(part.name));
  const lines: string[] = [];

  lines.push("// @generated:start imports");
  lines.push("import SwiftUI");
  lines.push("// @generated:end");
  lines.push("");
  lines.push("// @generated:start component");
  lines.push(...emitTokenScopesSection(ir));
  lines.push("");
  lines.push(
    `/// Emitted through the centered-modal surface path: presented as a ` +
      `sheet whose native dismissal (Esc, overlay click) drives the ` +
      `openness channel back through onOpenChange — the contract's ` +
      `escape/overlayClick dismissal triggers realized by the platform.`,
  );
  if (exportName !== ir.name) {
    lines.push(
      `/// SwiftUI reserves the \`${ir.name}\` type name; this target ` +
        `exports it as \`${exportName}\`.`,
    );
  }
  const genericParams = regions.map((r) => `${swiftCase(capitalize(r))}: View`);
  lines.push(
    `public struct ${exportName}${genericParams.length > 0 ? `<${genericParams.join(", ")}>` : ""}: View {`,
  );
  lines.push(`${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`);
  lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
  lines.push(`${INDENT}}`);
  lines.push(`${INDENT}@StateObject private var open: ControllableValue<Bool>`);
  // The consumer's binding is stored separately: a CONTROLLED binding is
  // dependency-tracked by SwiftUI (projected from the consumer's observed
  // state) and drives presentation directly, while a computed binding over
  // the StateObject is tracked only through its own uncontrolled
  // @Published storage — a controlled after-mount flip never re-presents
  // through it. set() always routes through ControllableValue so
  // onOpenChange fires and native dismissal writes the channel back.
  lines.push(`${INDENT}private let openControlled: Binding<Bool>?`);
  if (searchChannel) {
  lines.push(`${INDENT}@StateObject private var search: ControllableValue<String>`);
  }
  if (placeholder) lines.push(placeholder.stored);
  for (const region of regions) {
    lines.push(`${INDENT}private let ${region}: ${swiftCase(capitalize(region))}`);
  }
  lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params: string[] = [
    "open: Binding<Bool>? = nil,",
    "defaultOpen: Bool = false,",
    "onOpenChange: ((Bool) -> Void)? = nil,",
  ];
  if (searchChannel) {
    params.push("search: Binding<String>? = nil,");
    params.push('defaultSearch: String = "",');
    params.push("onSearchChange: ((String) -> Void)? = nil,");
  }
  if (placeholder) params.push(placeholder.param);
  for (const region of regions) {
    params.push(
      `@ViewBuilder ${region}: () -> ${swiftCase(capitalize(region))} = { EmptyView() }${region === regions[regions.length - 1] ? "" : ","}`,
    );
  }
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self._open = StateObject(wrappedValue: ControllableValue(controlled: open, defaultValue: defaultOpen, onChange: onOpenChange))`);
  lines.push(`${INDENT}${INDENT}self.openControlled = open`);
  if (searchChannel) {
  lines.push(`${INDENT}${INDENT}self._search = StateObject(wrappedValue: ControllableValue(controlled: search, defaultValue: defaultSearch, onChange: onSearchChange))`);
  }
  if (placeholder) lines.push(placeholder.assign);
  for (const region of regions) {
    lines.push(`${INDENT}${INDENT}self.${region} = ${region}()`);
  }
  lines.push(`${INDENT}}`);
  if (placeholder) lines.push(...placeholder.accessor);
  lines.push("");
  lines.push("");
  if (searchChannel) {
    lines.push("");
  }
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
      "background",
      "foreground",
      "borderColor",
      "radius",
      "blockPadding",
      "inlinePadding",
      "gap",
      "minHeight",
    ]),
  );
  lines.push("");
  lines.push(`${INDENT}@ViewBuilder`);
  lines.push(`${INDENT}private var panel: some View {`);
  lines.push(`${INDENT}${INDENT}VStack(spacing: ${chrome.gap ? "gap" : "nil"}) {`);
  if (searchChannel) {
    lines.push(`${INDENT}${INDENT}${INDENT}SwiftUI.TextField(`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}"",`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}text: Binding(`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}get: { search.value },`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}set: { search.set($0) }`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT})${searchPrompt ? "," : ""}`);
    if (searchPrompt) lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}prompt: ${searchPrompt}`);
    lines.push(`${INDENT}${INDENT}${INDENT})`);
  }
  for (const region of regions) {
    lines.push(`${INDENT}${INDENT}${INDENT}${region}`);
  }
  lines.push(`${INDENT}${INDENT}}`);
  if (chrome.blockPadding) {
    lines.push(`${INDENT}${INDENT}${INDENT}.padding(.vertical, blockPadding)`);
  }
  if (chrome.inlinePadding) {
    lines.push(`${INDENT}${INDENT}${INDENT}.padding(.horizontal, inlinePadding)`);
  }
  if (chrome.background) {
    lines.push(`${INDENT}${INDENT}${INDENT}.background(background)`);
  }
  if (chrome.radius) {
    lines.push(`${INDENT}${INDENT}${INDENT}.clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))`);
  }
  if (chrome.foreground) {
    lines.push(`${INDENT}${INDENT}${INDENT}.foregroundStyle(foreground)`);
  }
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}private var presentationBinding: Binding<Bool> {`);
  lines.push(`${INDENT}${INDENT}if let controlled = openControlled {`);
  lines.push(`${INDENT}${INDENT}${INDENT}return Binding(`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}get: { controlled.wrappedValue },`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}set: { open.set($0) }`);
  lines.push(`${INDENT}${INDENT}${INDENT})`);
  lines.push(`${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}return Binding(`);
  lines.push(`${INDENT}${INDENT}${INDENT}get: { open.value },`);
  lines.push(`${INDENT}${INDENT}${INDENT}set: { open.set($0) }`);
  lines.push(`${INDENT}${INDENT})`);
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}public var body: some View {`);
  // A presentation modifier needs a renderable anchor: on EmptyView the
  // sheet never presents (defaultOpen probe, press-proof harness run
  // 2026-08-17). A zero-size clear view anchors with no layout footprint.
  lines.push(`${INDENT}${INDENT}SwiftUI.Color.clear.frame(width: 0, height: 0)`);
  lines.push(`${INDENT}${INDENT}${INDENT}.sheet(isPresented: presentationBinding) {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}panel`);
  lines.push(`${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");

  return { componentFile: withTypes(lines.join("\n")), behaviorFile: null };
}


/** Placement union value → SwiftUI popover edge (grammar-level mapping). */
const PLACEMENT_EDGE: Record<string, string> = {
  // `auto` is browser auto-positioning; the platform default popover edge
  // on macOS presents below the anchor, so auto lowers to .bottom.
  auto: ".bottom",
  top: ".top",
  bottom: ".bottom",
  left: ".leading",
  right: ".trailing",
  "top-start": ".topLeading",
  "top-end": ".topTrailing",
  "bottom-start": ".bottomLeading",
  "bottom-end": ".bottomTrailing",
};

/**
 * The anchored-surface branch: the trigger region is consumer content and
 * SurfaceIR.openTriggers selects the native interaction wrapper. Click becomes
 * a plain Button; hover becomes onHover. Both drive the same controllable-state
 * projection and present the content region in a native popover.
 */
function emitAnchoredSurface(ir: ComponentIR): string {
  const openChannel = ir.behavior.normalizedChannels.find(
    (c) => c.valueType === "boolean",
  );
  if (!openChannel) {
    throw new Error(
      `emitAnchoredSurface: anchored surface on "${ir.name}" declares no ` +
        `boolean open channel.`,
    );
  }
  const triggerPart = ir.compoundParts.find((p) => p.name === "trigger");
  const contentPart = ir.compoundParts.find((p) => p.name === "content");
  if (!triggerPart || !contentPart) {
    throw new Error(
      `emitAnchoredSurface: anchored surface on "${ir.name}" lacks ` +
        `trigger/content compound parts (found: ` +
        `${ir.compoundParts.map((p) => p.name).join("/") || "none"}).`,
    );
  }

  const exportName = swiftExportName(ir.name);
  const chrome = resolveChrome(ir);
  const placementType = ir.styledProps.find((p) => p.safeName === "placement")
    ?.typeRefs[0];
  const placementValues = placementType
    ? (ir.definedTypes[placementType]?.values ?? [])
    : [];
  const defaultPlacement =
    ir.styledProps.find((p) => p.safeName === "placement")?.defaultExpr
      ?.replace(/^["']|["']$/g, "") ?? placementValues[0];
  for (const value of placementValues) {
    if (!PLACEMENT_EDGE[value]) {
      throw new Error(
        `emitAnchoredSurface: placement value "${value}" has no SwiftUI ` +
          `popover edge mapping.`,
      );
    }
  }
  const hasDisabled = ir.styledProps.some((p) => p.safeName === "disabled");
  const opensOnClick = ir.surface?.openTriggers.includes("click") ?? false;
  const opensOnHover = ir.surface?.openTriggers.includes("hover") ?? false;
  if (!opensOnClick && !opensOnHover) {
    throw new Error(
      `emitAnchoredSurface: anchored surface on "${ir.name}" declares no ` +
        `SwiftUI-realizable open trigger (expected "click" or "hover").`,
    );
  }
  const activationSummary = [
    opensOnClick ? "press" : undefined,
    opensOnHover ? "hover" : undefined,
  ].filter(Boolean).join(" and ");

  const lines: string[] = [];
  lines.push("// @generated:start imports");
  lines.push("import SwiftUI");
  lines.push("// @generated:end");
  lines.push("");
  lines.push("// @generated:start component");
  lines.push(...emitTokenScopesSection(ir));
  lines.push("");
  lines.push(
    `/// Emitted through the anchored-surface path: ${activationSummary} on ` +
      `the trigger region drives the open channel from the declared open triggers, ` +
      `presenting the content region in a popover. Native popover dismissal ` +
      `realizes platform dismissal.`,
  );
  if (exportName !== ir.name) {
    lines.push(
      `/// SwiftUI reserves the \`${ir.name}\` type name; this target ` +
        `exports it as \`${exportName}\`.`,
    );
  }
  lines.push(`public struct ${exportName}<Trigger: View, Content: View>: View {`);
  lines.push(`${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`);
  lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
  lines.push(`${INDENT}}`);
  lines.push(`${INDENT}@StateObject private var open: ControllableValue<Bool>`);
  // See the centered-modal emitter for why the controlled binding is stored.
  lines.push(`${INDENT}private let openControlled: Binding<Bool>?`);
  if (placementValues.length > 0) {
    lines.push(`${INDENT}private let placement: ${placementType}`);
  }
  if (hasDisabled) {
    lines.push(`${INDENT}private let disabled: Bool`);
  }
  lines.push(`${INDENT}private let trigger: Trigger`);
  lines.push(`${INDENT}private let content: Content`);
  lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params: string[] = [
    "open: Binding<Bool>? = nil,",
    "defaultOpen: Bool = false,",
    "onOpenChange: ((Bool) -> Void)? = nil,",
  ];
  if (placementValues.length > 0 && defaultPlacement && PLACEMENT_EDGE[defaultPlacement]) {
    params.push(`placement: ${placementType} = .${swiftCase(defaultPlacement)},`);
  }
  if (hasDisabled) {
    params.push("disabled: Bool = false,");
  }
  params.push("@ViewBuilder trigger: () -> Trigger,");
  params.push("@ViewBuilder content: () -> Content = { EmptyView() }");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self._open = StateObject(wrappedValue: ControllableValue(controlled: open, defaultValue: defaultOpen, onChange: onOpenChange))`);
  lines.push(`${INDENT}${INDENT}self.openControlled = open`);
  if (placementValues.length > 0 && defaultPlacement) {
    lines.push(`${INDENT}${INDENT}self.placement = placement`);
  }
  if (hasDisabled) {
    lines.push(`${INDENT}${INDENT}self.disabled = disabled`);
  }
  lines.push(`${INDENT}${INDENT}self.trigger = trigger()`);
  lines.push(`${INDENT}${INDENT}self.content = content()`);
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
  lines.push(
    ...emitChromeAccessorLines(chrome, [
      "background",
      "foreground",
      "borderColor",
      "radius",
      "blockPadding",
      "inlinePadding",
      "gap",
      "minHeight",
    ]),
  );
  lines.push("");
  lines.push(`${INDENT}@ViewBuilder`);
  lines.push(`${INDENT}private var panel: some View {`);
  lines.push(`${INDENT}${INDENT}content`);
  if (chrome.blockPadding) {
    lines.push(`${INDENT}${INDENT}${INDENT}.padding(.vertical, blockPadding)`);
  }
  if (chrome.inlinePadding) {
    lines.push(`${INDENT}${INDENT}${INDENT}.padding(.horizontal, inlinePadding)`);
  }
  if (chrome.background) {
    lines.push(`${INDENT}${INDENT}${INDENT}.background(background)`);
  }
  if (chrome.radius) {
    lines.push(`${INDENT}${INDENT}${INDENT}.clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))`);
  }
  if (chrome.foreground) {
    lines.push(`${INDENT}${INDENT}${INDENT}.foregroundStyle(foreground)`);
  }
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}private var presentationBinding: Binding<Bool> {`);
  lines.push(`${INDENT}${INDENT}if let controlled = openControlled {`);
  lines.push(`${INDENT}${INDENT}${INDENT}return Binding(`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}get: { controlled.wrappedValue },`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}set: { open.set($0) }`);
  lines.push(`${INDENT}${INDENT}${INDENT})`);
  lines.push(`${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}return Binding(`);
  lines.push(`${INDENT}${INDENT}${INDENT}get: { open.value },`);
  lines.push(`${INDENT}${INDENT}${INDENT}set: { open.set($0) }`);
  lines.push(`${INDENT}${INDENT})`);
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}public var body: some View {`);
  if (opensOnClick) {
    lines.push(`${INDENT}${INDENT}SwiftUI.Button(action: { open.toggle() }) {`);
    lines.push(`${INDENT}${INDENT}${INDENT}trigger`);
    lines.push(`${INDENT}${INDENT}}`);
    lines.push(`${INDENT}${INDENT}.buttonStyle(.plain)`);
    if (hasDisabled) {
      lines.push(`${INDENT}${INDENT}.disabled(disabled)`);
    }
  } else {
    lines.push(`${INDENT}${INDENT}trigger`);
  }
  const modifierIndent = opensOnClick
    ? `${INDENT}${INDENT}`
    : `${INDENT}${INDENT}${INDENT}`;
  if (placementValues.length > 0) {
    lines.push(`${modifierIndent}.popover(isPresented: presentationBinding, arrowEdge: placementEdge) {`);
  } else {
    lines.push(`${modifierIndent}.popover(isPresented: presentationBinding) {`);
  }
  lines.push(`${modifierIndent}${INDENT}panel`);
  lines.push(`${modifierIndent}}`);
  if (opensOnHover) {
    lines.push(`${modifierIndent}.onHover { hovering in`);
    lines.push(
      hasDisabled
        ? `${modifierIndent}${INDENT}if !disabled { open.set(hovering) }`
        : `${modifierIndent}${INDENT}open.set(hovering)`,
    );
    lines.push(`${modifierIndent}}`);
  }
  lines.push(`${INDENT}}`);
  if (placementValues.length > 0) {
    lines.push("");
    lines.push(`${INDENT}private var placementEdge: Edge {`);
    lines.push(`${INDENT}${INDENT}switch placement {`);
    for (const value of placementValues) {
      lines.push(
        `${INDENT}${INDENT}case .${swiftCase(value)}: return ${PLACEMENT_EDGE[value]}`,
      );
    }
    lines.push(`${INDENT}${INDENT}}`);
    lines.push(`${INDENT}}`);
  }
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n") + "\n";
}


function emitToastSurface(ir: ComponentIR): string {
  const chrome = resolveChrome(ir);
  const regions = ir.compoundParts.map((part) => regionPropertyName(part.name));
  // Dismissal is a behavior policy, never the first unrelated animation duration.
  const dwellMs = resolveSurfaceAutoDismiss(ir)?.defaultMs ?? null;
  const ephemeral = ir.surface?.presence === "ephemeral";

  const lines: string[] = [];
  lines.push("// @generated:start imports");
  lines.push("import SwiftUI");
  lines.push("// @generated:end");
  lines.push("");
  lines.push("// @generated:start component");
  lines.push(...emitTokenScopesSection(ir));
  lines.push("");
  lines.push(
    `/// Emitted through the toast surface path: an overlay presentation ` +
      `over the open channel (the shared ControllableValue substrate)` +
      (ephemeral && dwellMs
        ? `; ephemeral presence auto-dismisses after the dwell token (${dwellMs}ms).`
        : `.`),
  );
  const toastGenerics = regions
    .map((r) => `${swiftCase(capitalize(r))}: View`)
    .join(", ");
  lines.push(
    `public struct Toast${toastGenerics ? `<${toastGenerics}>` : ""}: View {`,
  );
  lines.push(`${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`);
  lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
  lines.push(`${INDENT}}`);
  lines.push(`${INDENT}@StateObject private var open: ControllableValue<Bool>`);
  for (const region of regions) {
    lines.push(`${INDENT}private let ${region}: ${swiftCase(capitalize(region))}`);
  }
  lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params = [
    "open: Binding<Bool>? = nil,",
    "defaultOpen: Bool = false,",
    "onOpenChange: ((Bool) -> Void)? = nil,",
  ];
  regions.forEach((region, i) => {
    params.push(
      `@ViewBuilder ${region}: () -> ${swiftCase(capitalize(region))} = { EmptyView() }${i === regions.length - 1 ? "" : ","}`,
    );
  });
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self._open = StateObject(wrappedValue: ControllableValue(controlled: open, defaultValue: defaultOpen, onChange: onOpenChange))`);
  for (const region of regions) {
    lines.push(`${INDENT}${INDENT}self.${region} = ${region}()`);
  }
  lines.push(`${INDENT}}`);
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
      "blockPadding", "inlinePadding", "gap", "minHeight",
    ]),
  );
  lines.push("");
  lines.push(`${INDENT}@ViewBuilder`);
  lines.push(`${INDENT}private var panel: some View {`);
  lines.push(`${INDENT}${INDENT}VStack(spacing: ${chrome.gap ? "gap" : "nil"}) {`);
  for (const region of regions) {
    lines.push(`${INDENT}${INDENT}${INDENT}${region}`);
  }
  lines.push(`${INDENT}${INDENT}}`);
  if (chrome.blockPadding) lines.push(`${INDENT}${INDENT}${INDENT}.padding(.vertical, blockPadding)`);
  if (chrome.inlinePadding) lines.push(`${INDENT}${INDENT}${INDENT}.padding(.horizontal, inlinePadding)`);
  if (chrome.background) lines.push(`${INDENT}${INDENT}${INDENT}.background(background)`);
  if (chrome.radius) lines.push(`${INDENT}${INDENT}${INDENT}.clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))`);
  if (chrome.foreground) lines.push(`${INDENT}${INDENT}${INDENT}.foregroundStyle(foreground)`);
  lines.push(`${INDENT}}`);
  lines.push("");
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}ZStack(alignment: .topTrailing) {`);
  lines.push(`${INDENT}${INDENT}${INDENT}Color.clear`);
  lines.push(`${INDENT}${INDENT}${INDENT}if open.value {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}panel`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}.transition(.move(edge: .top).combined(with: .opacity))`);
  lines.push(`${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}}`);
  if (ephemeral && dwellMs) {
    lines.push(`${INDENT}${INDENT}${INDENT}.task(id: open.value) {`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}if open.value {`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}try? await Task.sleep(for: .milliseconds(${dwellMs}))`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}open.set(false)`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}}`);
    lines.push(`${INDENT}${INDENT}${INDENT}}`);
  }
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n");
}


function emitCoachmarkSurface(ir: ComponentIR): string {
  const chrome = resolveChrome(ir);
  const slots = domSlotNamesEmit(ir);
  const stepChannel = ir.behavior.normalizedChannels.find(
    (c) => c.valueType === "number",
  );
  if (!stepChannel) {
    throw new Error(
      `emitCoachmarkSurface: coachmark on \`${ir.name}\` declares no number step channel.`,
    );
  }
  const hasOnComplete = hasConventionalPropEmit(ir, "onComplete");
  // Step count from the contract's authored steps default (array length);
  // completion is reaching the LAST index, not a hardcoded threshold.
  const stepsProp = ir.styledProps.find((p) => p.safeName === "steps");
  const authoredStepCount = Array.isArray(stepsProp?.defaultExpr)
    ? (stepsProp!.defaultExpr as unknown[]).length
    : typeof stepsProp?.defaultExpr === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(stepsProp!.defaultExpr as string) as unknown;
            return Array.isArray(parsed) ? parsed.length : 3;
          } catch {
            return 3;
          }
        })()
      : 3;
  const hasOnSkip = hasConventionalPropEmit(ir, "onSkip");
  // Control text follows each control part's content/aria-label bindings:
  // messages lower to catalog lookups, props surface as init params that
  // fall back to their message.
  const control = (part: string) => {
    const content = partTextSource(ir, part, "content");
    if (!content) throw new Error(`emitCoachmarkSurface: ${ir.name} part ${part} binds no text`);
    const label = partTextSource(ir, part, "aria-label");
    return { content, label };
  };
  const skip = hasOnSkip ? control("skip") : undefined;
  const previous = control("prev");
  const next = control("next");
  const textProps = new Map<string, SwiftStringProp>();
  for (const source of [skip?.content, skip?.label, previous.content, previous.label, next.content, next.label]) {
    if (source?.kind === "prop" && !textProps.has(source.prop)) {
      textProps.set(source.prop, swiftStringProp(ir, source.prop, INDENT));
    }
  }
  const text = (source: NativeTextSource): string => {
    if (source.kind === "message") return swiftMessage(ir, source.ref.message);
    return source.fallback ? source.prop : `(${source.prop} ?? "")`;
  };
  // An aria-label that repeats the visible text adds nothing on SwiftUI,
  // where the button title is already the accessible name.
  const sourceKey = (source: NativeTextSource): string =>
    source.kind === "prop" ? `prop:${source.prop}` : `message:${source.ref.message.key}`;
  const labelModifier = (entry: { content: NativeTextSource; label: NativeTextSource | undefined }): string | null =>
    !entry.label || sourceKey(entry.label) === sourceKey(entry.content)
      ? null
      : `.accessibilityLabel(${text(entry.label)})`;

  const lines: string[] = [];
  lines.push("// @generated:start imports");
  lines.push("import SwiftUI");
  lines.push("// @generated:end");
  lines.push("");
  lines.push("// @generated:start component");
  lines.push(...emitTokenScopesSection(ir));
  lines.push("");
  lines.push(
    `/// Emitted through the coachmark surface path: an overlay panel on ` +
      `the step channel with prev/next navigation and the contract's ` +
      `completion/skip callbacks.`,
  );
  const generics = slots.map((slot) => `${swiftCase(capitalize(slot))}Region: View`);
  lines.push(
    `public struct ${swiftExportName(ir.name)}${generics.length ? "<" + generics.join(", ") + ">" : ""}: View {`,
  );
  lines.push(`${INDENT}private var fsdsScopes: FsdsComponentTokenScopes {`);
  lines.push(`${INDENT}${INDENT}${ir.name}Tokens.scopes`);
  lines.push(`${INDENT}}`);
  lines.push(`${INDENT}@StateObject private var step: ControllableValue<Double>`)
  lines.push(`${INDENT}private let stepCount: Int`);
  if (hasOnComplete) lines.push(`${INDENT}private let onComplete: (() -> Void)?`);
  if (hasOnSkip) lines.push(`${INDENT}private let onSkip: (() -> Void)?`);
  for (const decl of textProps.values()) lines.push(decl.stored);
  for (const slot of slots) {
    lines.push(`${INDENT}private let ${slot}: ${swiftCase(capitalize(slot))}Region`);
  }
  lines.push(`${INDENT}@Environment(\\.fsdsTheme) private var fsdsTheme`);
  lines.push("");
  lines.push(`${INDENT}public init(`);
  const params = [
    "step: Double = 0,",
    `stepCount: Int = ${authoredStepCount},`,
    "onStepChange: ((Double) -> Void)? = nil,",
  ];
  if (hasOnComplete) params.push("onComplete: (() -> Void)? = nil,");
  if (hasOnSkip) params.push("onSkip: (() -> Void)? = nil,");
  for (const decl of textProps.values()) params.push(decl.param);
  slots.forEach((slot) => {
    params.push(`@ViewBuilder ${slot}: () -> ${swiftCase(capitalize(slot))}Region = { EmptyView() },`);
  });
  params[params.length - 1] = params[params.length - 1]!.replace(/,$/, "");
  for (const param of params) lines.push(`${INDENT}${INDENT}${param}`);
  lines.push(`${INDENT}) {`);
  lines.push(`${INDENT}${INDENT}self._step = StateObject(wrappedValue: ControllableValue(controlled: nil, defaultValue: step, onChange: onStepChange))`)
  lines.push(`${INDENT}${INDENT}self.stepCount = stepCount`);
  if (hasOnComplete) lines.push(`${INDENT}${INDENT}self.onComplete = onComplete`);
  if (hasOnSkip) lines.push(`${INDENT}${INDENT}self.onSkip = onSkip`);
  for (const decl of textProps.values()) lines.push(decl.assign);
  for (const slot of slots) lines.push(`${INDENT}${INDENT}self.${slot} = ${slot}()`);
  lines.push(`${INDENT}}`);
  lines.push("");
  const textAccessors = [...textProps.values()].flatMap((decl) => decl.accessor);
  if (textAccessors.length > 0) {
    lines.push(...textAccessors);
    lines.push("");
  }
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
  lines.push(`${INDENT}public var body: some View {`);
  lines.push(`${INDENT}${INDENT}VStack(spacing: ${chrome.gap ? "gap" : "8"}) {`);
  for (const slot of slots) lines.push(`${INDENT}${INDENT}${INDENT}${slot}`);
  lines.push(`${INDENT}${INDENT}${INDENT}HStack {`);
  const pushLabel = (entry: { content: NativeTextSource; label: NativeTextSource | undefined }): void => {
    const modifier = labelModifier(entry);
    if (modifier) lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}${modifier}`);
  };
  if (skip) {
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}Button(${text(skip.content)}) { onSkip?() }`);
    lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}.buttonStyle(.plain)`);
    pushLabel(skip);
  }
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}Spacer()`);
  lines.push(
    `${INDENT}${INDENT}${INDENT}${INDENT}Button(${text(previous.content)}) { if step.value > 0 { step.set(step.value - 1) } }`,
  );
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}.buttonStyle(.plain)`);
  pushLabel(previous);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}Button(${text(next.content)}) {`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}step.set(step.value + 1)`);
  if (hasOnComplete) lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}${INDENT}if Int(step.value) >= stepCount - 1 { onComplete?() }`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}${INDENT}${INDENT}.buttonStyle(.borderedProminent)`);
  pushLabel(next);
  lines.push(`${INDENT}${INDENT}${INDENT}}`);
  lines.push(`${INDENT}${INDENT}}`);
  if (chrome.blockPadding) lines.push(`${INDENT}${INDENT}${INDENT}.padding(.vertical, blockPadding)`);
  if (chrome.inlinePadding) lines.push(`${INDENT}${INDENT}${INDENT}.padding(.horizontal, inlinePadding)`);
  if (chrome.background) lines.push(`${INDENT}${INDENT}${INDENT}.background(background)`);
  if (chrome.radius) lines.push(`${INDENT}${INDENT}${INDENT}.clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))`);
  lines.push(`${INDENT}}`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return lines.join("\n");
}

function domSlotNamesEmit(ir: ComponentIR): string[] {
  const out: string[] = [];
  const walk = (node: NonNullable<ComponentIR["dom"]>): void => {
    const slotName = (node as { slotName?: string }).slotName;
    if (node.tag === "slot" && slotName) out.push(slotName);
    (node.children ?? []).forEach(walk);
  };
  if (ir.dom) walk(ir.dom);
  return out;
}

function hasConventionalPropEmit(ir: ComponentIR, name: string): boolean {
  return ir.styledProps.some((p) => p.safeName === name);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
