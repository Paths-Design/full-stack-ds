/**
 * Wider Godot surface planner.
 *
 * The bounded control path already realises one surface family: a
 * part-anchored, non-blocking, click-opened overlay. Every other
 * presence-surface shape the IR can describe reaches this planner — blocking
 * dialogs, viewport-edge sheets, transient toasts, hover/focus tooltips and
 * selector-anchored coachmarks included.
 *
 * The returned plan is a dispatch selector plus a receipt, not a claim of
 * behavioural parity. `runtime/surface.gd` owns generic overlay presence (an
 * open/close flag, an `open_changed` signal and an inert projection of the
 * declared prop defaults); every semantic this target does not lower is named
 * in `omissions`, and every prop axis it does not realise is named in
 * `excluded`. Dispatch reads `ComponentIR` facts only — never `ir.name`.
 */
import type { BindingExpression, ComponentIR, DomNodeIR } from "../../ir.js";
import { isPartAnchoredSurface } from "../../semantics.js";
import type { GodotSurfacePlan } from "./plan-types.js";

/**
 * The overlay base owns an `open` flag plus an `open_changed` signal: that is
 * the native realization of the conventional open-state prop axis, and of
 * nothing else. Every other declared prop is receipted in `excluded`, with a
 * matching `omissions` line.
 */
const NATIVE_OPEN_STATE_PROPS = new Set(["open", "onOpenChange"]);

/** "a", "a and b", "a, b and c" — stable plain-language list. */
function sentenceList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]!}`;
}

/** The contract dismissal vocabulary and the normalized trigger vocabulary
 * spell two closing events differently; equivalent spellings are mapped so a
 * fact is not receipted twice. Events with no equivalent stay visible. */
const DISMISSAL_TRIGGER_EQUIVALENTS: Record<string, string> = {
  overlayClick: "outside-click",
  outsideClick: "outside-click",
  pointerLeave: "pointer-leave",
};

function modalityFacts(ir: ComponentIR): string[] {
  const surface = ir.surface!;
  if (surface.modality === "blocking") {
    const facts = ["modality: blocking backdrop and focus containment unlowered"];
    if (surface.modalityGate) {
      facts.push(`modality: ${surface.modalityGate.prop} prop gate does not downgrade blocking behaviour`);
    }
    return facts;
  }
  return ["modality: non-blocking surface input isolation and modality state have no native mapping"];
}

function dismissalFacts(ir: ComponentIR): string[] {
  const surface = ir.surface!;
  const facts: string[] = [];
  if (surface.dismissal.length) facts.push(`dismissal: ${sentenceList(surface.dismissal)} closing unlowered`);
  const gating = new Set<string>();
  for (const trigger of ir.behavior.normalizedDismissalTriggers) {
    if (trigger.enabledByProp) gating.add(trigger.enabledByProp);
    for (const prop of trigger.enabledByProps ?? []) gating.add(prop);
  }
  if (gating.size) facts.push(`dismissal: ${sentenceList([...gating])} gating unlowered`);
  const declaredClosing = new Set<string>(surface.dismissal);
  const unhandled = ir.behavior.normalizedDismissalTriggers
    .filter(trigger => !declaredClosing.has(DISMISSAL_TRIGGER_EQUIVALENTS[trigger.event] ?? trigger.event))
    .map(trigger => trigger.event);
  if (unhandled.length) facts.push(`dismissal: ${sentenceList([...new Set(unhandled)])} trigger has no native handler`);
  return facts;
}

function stackingFacts(ir: ComponentIR): string[] {
  const portal = ir.behavior.portal;
  if (!portal?.enabled) return ["stacking: overlay order and host layer unverified"];
  const declared = [
    portal.layering ? `${portal.layering} layering` : "unlayered",
    portal.defaultTarget ? `${portal.defaultTarget} mount target` : "no mount target",
    ...(portal.backdrop === undefined ? [] : [`backdrop ${portal.backdrop ? "enabled" : "disabled"}`]),
  ];
  return [`stacking: overlay order and host layer unverified; declared ${declared.join(", ")} not projected`];
}

function anchoringFacts(ir: ComponentIR): string[] {
  const surface = ir.surface!;
  const positioning = surface.positioning;
  if (surface.selectorAnchor) {
    const { prop, path, indexChannel } = surface.selectorAnchor;
    return [`anchor: selector-sourced positioning (${prop}.${path} indexed by ${indexChannel}) unlowered`];
  }
  if (surface.anchor) {
    const facts = [`anchor: ${surface.kind} positioning relative to its trigger unlowered`];
    const placement = [
      positioning?.strategy ?? "anchored",
      `${surface.anchor.relation} relation`,
      ...(positioning?.collision ? [`${positioning.collision} collision`] : []),
      ...(positioning?.placementProp ? [`${positioning.placementProp} prop`] : []),
    ];
    facts.push(`anchor: declared ${sentenceList(placement)} not projected`);
    return facts;
  }
  if (!positioning) return [];
  return [
    `positioning: ${positioning.strategy} placement${positioning.placementProp ? ` (${positioning.placementProp} prop)` : ""}` +
      `${positioning.collision ? ` with ${positioning.collision} collision` : ""} unlowered`,
  ];
}

function transienceFacts(ir: ComponentIR): string[] {
  const surface = ir.surface!;
  const facts: string[] = [];
  if (surface.presence === "ephemeral") {
    const autoDismiss = surface.timing?.autoDismissProp;
    facts.push(autoDismiss
      ? `transience: ${surface.kind} auto-dismiss timer unlowered (${autoDismiss} prop)`
      : `transience: ephemeral ${surface.kind} dismissal scheduling unlowered`);
  }
  const delays = [surface.timing?.openDelayProp, surface.timing?.closeDelayProp].filter((prop): prop is string => prop !== undefined);
  if (delays.length) facts.push(`transition: open/close delays unlowered (${sentenceList(delays)})`);
  return facts;
}

function contentFacts(ir: ComponentIR): string[] {
  const surface = ir.surface!;
  const content = surface.content;
  const facts: string[] = [];
  if (content) {
    facts.push(`content: the ${content.part.name} subtree is not projected into a native scene; consumers mount surface content`);
    if (content.interactive) facts.push(`content: ${content.part.name} is declared interactive; no native focusable content host exists`);
  } else {
    facts.push("content: the declared part tree is not projected into a native scene");
  }
  const compound = ir.compoundParts.map(part => part.name);
  if (compound.length) facts.push(`anatomy: ${compound.length} compound parts (${sentenceList(compound)}) have no native hosts`);
  return facts;
}

function focusFacts(ir: ComponentIR): string[] {
  const focus = ir.behavior.focus;
  if (!focus) return [];
  const facts: string[] = [];
  if (focus.strategy === "trap") facts.push("focus: focus trapping and containment unlowered");
  else if (focus.strategy) facts.push(`focus: declared ${focus.strategy} focus strategy has no native focus policy`);
  if (focus.initialFocus) {
    facts.push(focus.initialFocus.startsWith("prop:")
      ? `focus: ${focus.initialFocus.slice("prop:".length)} initial-focus prop unlowered`
      : `focus: initial focus on part ${focus.initialFocus} unlowered`);
  }
  if (focus.returnFocus) {
    facts.push(focus.returnFocus.startsWith("prop:")
      ? `focus: ${focus.returnFocus.slice("prop:".length)} focus-restoration prop unlowered`
      : `focus: focus restoration to part ${focus.returnFocus} unlowered`);
  }
  if (focus.scrollLock) facts.push("focus: body scroll lock has no native mapping");
  return facts;
}

/** Every aria-* binding or static attribute the DOM tree declares. Prop names
 * are IR facts, so a renamed host prop is receipted under its real name. */
function ariaProjection(ir: ComponentIR): string[] {
  const facts: string[] = [];
  const seen = new Set<string>();
  const add = (fact: string): void => {
    if (seen.has(fact)) return;
    seen.add(fact);
    facts.push(fact);
  };
  const describe = (attr: string, binding: BindingExpression | undefined): void => {
    if (!binding) add(`${attr} (static)`);
    else if (binding.kind === "prop") add(`${attr} (${binding.prop} prop)`);
    else add(`${attr} (${binding.kind} binding)`);
  };
  const visit = (node: DomNodeIR): void => {
    for (const attr of Object.keys(node.attrs)) if (attr.startsWith("aria-")) add(`${attr} (static)`);
    for (const [attr, binding] of Object.entries(node.bindings)) if (attr.startsWith("aria-")) describe(attr, binding);
    node.children.forEach(visit);
  };
  if (ir.dom) visit(ir.dom);
  return facts;
}

function accessibilityFacts(ir: ComponentIR): string[] {
  const facts: string[] = [];
  const role = ir.root.rootRole ?? ir.root.effectiveRole;
  if (role) facts.push(`a11y: the ${role} role has no native accessibility projection`);
  if (ir.root.labeling.length) facts.push(`a11y: ${sentenceList(ir.root.labeling)} labeling has no native accessibility projection`);
  const aria = ariaProjection(ir);
  if (aria.length) facts.push(`a11y: ${sentenceList(aria)} attributes are not projected`);
  return facts;
}

function interactionFacts(ir: ComponentIR): string[] {
  const surface = ir.surface!;
  const facts: string[] = [];
  for (const channel of ir.behavior.normalizedChannels) {
    if (channel.isDisclosureChannel) continue;
    facts.push(`interaction: ${channel.name} ${channel.valueType ?? "value"} channel and ${channel.changeHandlerProp} handler unlowered`);
  }
  const disclosure = ir.behavior.primaryDisclosureChannel;
  if (disclosure?.defaultValueProp) facts.push(`state: ${disclosure.defaultValueProp} initial open value unlowered`);
  if (surface.openTriggers.length) facts.push(`trigger: ${sentenceList(surface.openTriggers)} opening has no native pointer or focus binding`);
  const interaction = ir.interaction;
  if (interaction) {
    if (interaction.triggers.length) {
      facts.push(`interaction: ${sentenceList(interaction.triggers.map(trigger => `${trigger.operation} trigger on part ${trigger.part.name}`))} unlowered`);
    }
    if (interaction.disabledProp) facts.push(`interaction: ${interaction.disabledProp} gating unlowered`);
    if (interaction.focusContainer) facts.push("interaction: the declared focus container has no native focus ownership");
    facts.push(`presence: ${interaction.presence} content presence is not modeled; open/close only toggles the host`);
  }
  const form = ir.formControl;
  if (form) {
    facts.push(`form: the ${form.valueModel} value model and ${form.event} handling on part ${form.part.name} unlowered`);
    if (ir.nativeTextChannels?.length) facts.push(`form: native text readback (${sentenceList(ir.nativeTextChannels)}) unlowered`);
  }
  return facts;
}

/**
 * The plan for a surface the bounded control shape cannot represent.
 *
 * Returns `undefined` when the IR declares no surface, and when the current
 * narrow shape already handles it (part-anchored, non-blocking, click-opened);
 * that path stays first in the caller's dispatch. Everything else gets a plan
 * whose `excluded`/`omissions` receipts are never empty.
 */
export function godotSurfacePlan(ir: ComponentIR): GodotSurfacePlan | undefined {
  const surface = ir.surface;
  if (!surface) return undefined;
  const narrowControlShape = isPartAnchoredSurface(surface) &&
    surface.modality === "non-blocking" &&
    surface.openTriggers.join() === "click";
  if (narrowControlShape) return undefined;
  const excluded = ir.styledProps
    .filter(prop => !NATIVE_OPEN_STATE_PROPS.has(prop.name))
    .map(prop => prop.name);
  const omissions: string[] = [];
  const add = (line: string): void => {
    if (!omissions.includes(line)) omissions.push(line);
  };
  for (const line of [
    ...modalityFacts(ir),
    ...dismissalFacts(ir),
    ...stackingFacts(ir),
    ...anchoringFacts(ir),
    ...transienceFacts(ir),
    ...contentFacts(ir),
    ...focusFacts(ir),
    ...accessibilityFacts(ir),
    ...interactionFacts(ir),
  ]) add(line);
  for (const prop of excluded) add(`${prop}: no executable native surface realization`);
  return {
    operation: "surface",
    // The emitted scene root must stay a PanelContainer: runtime/surface.gd is
    // a PanelContainer subclass owning overlay presence.
    rootType: "PanelContainer",
    anchor: isPartAnchoredSurface(surface) ? "part" : "none",
    modality: surface.modality,
    openTriggers: [...surface.openTriggers],
    excluded,
    omissions,
  };
}
