/**
 * Unity behavior dispatcher (brief rule R7).
 *
 * The interactive runtime behaviors (`BooleanControl`, `ItemGroup`,
 * `AnchoredSurface`) are plain C# classes the generated constructor attaches
 * to the tree the anatomy walker built. Passive content and rule shapes need
 * no interaction attachment. Which path applies is decided from IR facts:
 * value model, interaction
 * operation and presence, surface attachment, and state dimensions. No
 * component, part, channel or class name is consulted.
 *
 * Each behavior realises some facts unconditionally (AnchoredSurface always
 * reparents to the panel root; ItemGroup always runs arrow navigation), so the
 * dispatcher refuses a contract whose declared focus strategy, portal,
 * presence or content facts the selected behavior would contradict. Those
 * refusals are what let the support boundary call the matching families
 * `lowered`.
 */
import type { BindingExpression, ComponentIR, DomNodeIR, NormalizedChannelIR, PartIR } from "../../ir.js";
import { countChildrenLeaves, isBareRuleLeaf, isGuardedActionChrome, isProjectedChildrenAction, isStaticContent } from "../native-emission-class.js";
import { isPartAnchoredSurface } from "../../semantics.js";

export type UnityBehavior = "Passive" | "BooleanControl" | "ItemGroup" | "AnchoredSurface" | "Disclosure" | "Action";

export interface ItemGroupFocus {
  strategy: "roving" | "manual";
  orientation: string;
  wrap: boolean;
}

interface LoweringBase {
  channel: NormalizedChannelIR;
  /** `is-<value>` for the projected state dimension's non-initial value. */
  stateClass: string;
}
export interface BooleanControlLowering extends LoweringBase {
  behavior: "BooleanControl";
  control: PartIR;
}
/**
 * A disclosure: one trigger toggles one presence-tracked content part on a
 * boolean channel. The trigger is a native button; the runtime toggles the
 * content's presence and mirrors the open state class.
 */
export interface DisclosureLowering extends LoweringBase {
  behavior: "Disclosure";
  trigger: PartIR;
  content: PartIR;
}
export interface ItemGroupLowering extends LoweringBase {
  behavior: "ItemGroup";
  trigger: PartIR;
  content: PartIR;
  operation: string;
  multiple: boolean;
  focus: ItemGroupFocus;
}
export interface AnchoredSurfaceLowering {
  behavior: "AnchoredSurface";
  channel: NormalizedChannelIR;
  /** `is-<value>` for the projected state dimension; absent in hover-open mode,
   * whose contract projects a multi-value transition rather than one open class. */
  stateClass?: string;
  trigger: PartIR;
  content: PartIR;
  /** Contract-fact hover/focus open mode (tooltip surface); click mode when absent. */
  openOnHover?: boolean;
  openOnFocus?: boolean;
  closeOnPointerLeave?: boolean;
  contentFocusable?: boolean;
}
/**
 * A projected-children action: a native action affordance whose content is
 * the consumer's projected children. It owns no channel; the native control's
 * activation event invokes the generated callback property. Chrome around the
 * content region (a guarded loading decoration) is not part of the class and
 * is omitted until the P4 conditional componentRef family lands.
 */
export interface ActionLowering {
  behavior: "Action";
  /** The DOM click event's prop binding, realised as a generated callback property. */
  action: string;
  /** The control's disabled prop when its root binds one. */
  disabled?: string;
  /** The pending-state prop bound to aria-busy; its decoration is pending P4. */
  loading?: string;
}
export interface PassiveLowering {
  behavior: "Passive";
}
export type ChannelLowering = BooleanControlLowering | ItemGroupLowering | AnchoredSurfaceLowering | DisclosureLowering;
export type UnityLowering = PassiveLowering | ActionLowering | ChannelLowering;

/** Whether the selected lowering owns a normalized channel trio. */
export function hasChannel(lowering: UnityLowering): lowering is ChannelLowering {
  return lowering.behavior === "BooleanControl" || lowering.behavior === "ItemGroup" || lowering.behavior === "AnchoredSurface" || lowering.behavior === "Disclosure";
}

/**
 * Source: `ir.states.dimensions`. The dimension a behavior projects is the
 * first one whose effect is driven by the channel, else the first selection
 * dimension (declaration order). Its single non-initial value becomes the
 * `is-<value>` state class the behavior toggles.
 */
export function stateClassOf(ir: ComponentIR): string {
  const dimensions = Object.values(ir.states.dimensions ?? {});
  const dimension = dimensions.find(d => d.effect === "channel") ?? dimensions.find(d => d.category === "selection");
  const active = dimension?.values.filter(v => v !== dimension.initial) ?? [];
  if (active.length !== 1) {
    throw new Error(`UNITY_UNSUPPORTED_STATE: ${ir.name} declares no channel or selection state dimension with exactly one non-initial value for the behavior to project`);
  }
  return `is-${active[0]}`;
}

/** A parts-only contract with no dom tree selects the passive lowering when it
 * declares no channel, interaction or surface: the walker synthesizes the tree
 * from `ir.parts`, and explicit subcomponent parts become composed classes. */
function isPartsOnlyContainer(ir: ComponentIR): boolean {
  if (ir.dom) return false;
  if (ir.parts.length === 0) return false;
  if (ir.behavior.normalizedChannels.length > 0) return false;
  return true;
}

/** A passive container for the Unity target: exactly one consumer content leaf
 * plus chrome the passive lowering can omit by fact (node-content decorations
 * and guarded action chrome), with no channel, interaction or surface. This is
 * the static-content class widened by facts the Unity lowering drops. */
function isUnityStaticContainer(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  if (ir.behavior.normalizedChannels.length > 0) return false;
  if (ir.dom.tag === "button" || ir.dom.tag === "input" || ir.dom.tag === "img") return false;
  if (countChildrenLeaves(ir) !== 1) return false;
  let essential = false;
  const walk = (node: DomNodeIR): void => {
    if (node !== ir.dom && node.componentRef !== undefined) {
      const role = ir.parts.find(part => part.name === node.part)?.details?.role;
      if (role !== "decoration" && !isGuardedActionChrome(ir, node)) essential = true;
    }
    (node.children ?? []).forEach(walk);
  };
  (ir.dom.children ?? []).forEach(walk);
  return !essential;
}

/** Source: IR control/interaction/attachment axes. Applies by value model,
 * operation and attachment, never identity. Extend when new axes are admitted. */
export function unityLowering(ir: ComponentIR): UnityLowering {
  const focus = ir.behavior.focus?.strategy;
  const portal = ir.behavior.portal?.enabled === true;
  const refuseFocus = (behavior: UnityBehavior): never => { throw new Error(`UNITY_UNSUPPORTED_FOCUS: ${ir.name} declares focus.strategy ${JSON.stringify(focus)}, which ${behavior} does not realise`); };
  if (ir.surface) {
    // Hover/focus-open anchored surface: a non-interactive content surface that
    // opens from pointer hover (and focus) and closes on pointer leave. The
    // contract facts select the mode; the click-opened surface below is the
    // other mode of the same behavior.
    const hoverSurface = ir.surface.kind === "tooltip" && isPartAnchoredSurface(ir.surface) &&
      ir.surface.modality === "non-blocking" && ir.surface.content?.interactive === false &&
      ir.surface.openTriggers.includes("hover") && portal &&
      (focus === undefined || focus === "none") &&
      ir.interaction?.triggers.length === 1 && ir.interaction.triggers[0]!.operation === "open" &&
      ir.surface.anchor !== undefined && ir.surface.content !== undefined;
    if (hoverSurface) {
      return {
        behavior: "AnchoredSurface",
        channel: ir.interaction!.channel,
        trigger: ir.surface.anchor!.part,
        content: ir.surface.content!.part,
        openOnHover: true,
        openOnFocus: ir.surface.openTriggers.includes("focus"),
        closeOnPointerLeave: ir.surface.dismissal.includes("pointer-leave"),
        contentFocusable: false,
      };
    }
    if (!isPartAnchoredSurface(ir.surface) || ir.surface.modality !== "non-blocking" ||
        ir.surface.openTriggers.join() !== "click" || ir.interaction?.triggers[0]?.operation !== "toggle" ||
        ir.surface.dismissal.some(d => !["escape", "outside-click", "blur"].includes(d))) {
      throw new Error(`UNITY_UNSUPPORTED_SURFACE: ${ir.name}`);
    }
    // AnchoredSurface reparents a persistent, focusable ScrollView to the panel
    // root and detaches it on close; a surface declaring otherwise is refused.
    if (!portal || ir.surface.presence !== "persistent" || ir.surface.content?.interactive !== true || ir.interaction.presence !== "unmount") {
      throw new Error(`UNITY_UNSUPPORTED_SURFACE: ${ir.name} declares portal/presence/content facts AnchoredSurface does not realise`);
    }
    if (focus !== undefined && focus !== "none") refuseFocus("AnchoredSurface");
    // AnchoredSurface exposes a CloseOn<Event> knob for these trigger events only.
    const unknown = ir.behavior.normalizedDismissalTriggers.find(t => !["escape", "outsideClick", "blur"].includes(t.event));
    if (unknown) throw new Error(`UNITY_UNSUPPORTED_SURFACE: ${ir.name} declares dismissal trigger ${JSON.stringify(unknown.event)}, which AnchoredSurface does not realise`);
    return { behavior: "AnchoredSurface", channel: ir.interaction.channel, trigger: ir.surface.anchor!.part, content: ir.surface.content.part, stateClass: stateClassOf(ir) };
  }
  if (portal) throw new Error(`UNITY_UNSUPPORTED_PORTAL: ${ir.name} enables a portal but only anchored surfaces reparent content`);
  // A native action affordance: the consumer's content is projected children
  // and the control owns no channel. Its activation is the native platform
  // button's click, so the DOM click binding becomes a generated callback
  // property. The loading chrome around the content region is a conditional
  // componentRef (pending P4), so it is omitted rather than silently rendered.
  if (isProjectedChildrenAction(ir)) {
    if (focus !== undefined && focus !== "auto")
      throw new Error(`UNITY_UNSUPPORTED_FOCUS: ${ir.name} declares focus.strategy ${JSON.stringify(focus)}, which the native action control does not realise`);
    const root = ir.dom!;
    const click = root.events.click;
    const action = click?.kind === "prop" && !click.path?.length ? click.prop : undefined;
    if (!action) throw new Error(`UNITY_UNSUPPORTED_INTERACTION: ${ir.name} action root declares no click prop binding`);
    const busy = root.bindings["aria-busy"];
    if (busy !== undefined && (busy.kind !== "prop" || busy.path?.length))
      throw new Error(`UNITY_UNSUPPORTED_INTERACTION: ${ir.name} loading binding is not a direct prop`);
    const disabled = root.bindings[DISABLED_ATTRIBUTE];
    if (disabled !== undefined && (disabled.kind !== "prop" || disabled.path?.length))
      throw new Error(`UNITY_UNSUPPORTED_INTERACTION: ${ir.name} disabled binding is not a direct prop`);
    return {
      behavior: "Action",
      action,
      ...(disabled !== undefined && disabled.kind === "prop" ? { disabled: disabled.prop } : {}),
      ...(busy !== undefined && busy.kind === "prop" ? { loading: busy.prop } : {}),
    };
  }
  if (!ir.interaction && !ir.formControl && (isBareRuleLeaf(ir) || isStaticContent(ir) || isUnityStaticContainer(ir) || isPartsOnlyContainer(ir))) {
    if (focus !== undefined && focus !== "none") throw new Error(`UNITY_UNSUPPORTED_FOCUS: ${ir.name} declares focus.strategy ${JSON.stringify(focus)}, which Passive does not realise`);
    return { behavior: "Passive" };
  }
  if (ir.formControl?.valueModel === "boolean") {
    if (focus !== undefined && focus !== "auto") refuseFocus("BooleanControl");
    return { behavior: "BooleanControl", channel: ir.formControl.channel, control: ir.formControl.part, stateClass: stateClassOf(ir) };
  }
  const interaction = ir.interaction;
  // A disclosure: one trigger toggles one presence-tracked content part on a
  // boolean channel, with no surface. The runtime toggles the content's
  // presence and mirrors the state class; the trigger is a native button.
  if (interaction?.triggers.length === 1 && interaction.triggers[0]!.operation === "toggle" && !ir.surface) {
    if (interaction.channel.valueType !== "boolean") throw new Error(`UNITY_UNSUPPORTED_INTERACTION: ${ir.name} disclosure channel is not boolean`);
    if (interaction.presence !== "unmount") throw new Error(`UNITY_UNSUPPORTED_INTERACTION: ${ir.name} declares presence ${JSON.stringify(interaction.presence)}, which Disclosure does not realise`);
    if (focus !== undefined && focus !== "none" && focus !== "auto") refuseFocus("Disclosure");
    return { behavior: "Disclosure", channel: interaction.channel, trigger: interaction.triggers[0]!.part, content: interaction.content, stateClass: stateClassOf(ir) };
  }
  if (interaction?.triggers.length === 1 && ["select", "toggle-item"].includes(interaction.triggers[0]!.operation)) {
    if (interaction.presence !== "hidden") throw new Error(`UNITY_UNSUPPORTED_INTERACTION: ${ir.name} declares presence ${JSON.stringify(interaction.presence)}, which ItemGroup does not realise`);
    if (focus !== "roving" && focus !== "manual") return refuseFocus("ItemGroup");
    const orientation = ir.behavior.focus?.orientation;
    if (!orientation) throw new Error(`UNITY_UNSUPPORTED_FOCUS: ${ir.name} declares ${focus} focus without an orientation, which ItemGroup needs to map arrow keys`);
    // ItemGroup pairs composed sub-elements through IKeyedPart; a part that
    // opts out of being compound renders inline with no pairing key.
    const trigger = interaction.triggers[0]!.part;
    const compound = new Set(ir.compoundParts.map(p => p.name));
    const pairing = "must be a compound sub-element so it can carry the pairing key";
    if (!compound.has(trigger.name)) throw new Error(`UNITY_UNSUPPORTED_INTERACTION: ${ir.name} ItemGroup trigger part ${trigger.name} ${pairing}`);
    if (!compound.has(interaction.content.name)) throw new Error(`UNITY_UNSUPPORTED_INTERACTION: ${ir.name} ItemGroup content part ${interaction.content.name} ${pairing}`);
    return {
      behavior: "ItemGroup",
      channel: interaction.channel,
      trigger,
      content: interaction.content,
      operation: interaction.triggers[0]!.operation,
      multiple: (interaction.channel.valueType ?? "").includes("[]"),
      focus: { strategy: focus, orientation, wrap: ir.behavior.focus?.wrap === true },
      stateClass: stateClassOf(ir),
    };
  }
  throw new Error(`UNITY_UNSUPPORTED_INTERACTION: ${ir.name}`);
}

/** Source: HTML attribute vocabulary as `DomNodeIR.bindings` carries it. */
const DISABLED_ATTRIBUTE = "disabled";

/** The anatomy node rendering `part`, depth-first. */
export function findNode(node: DomNodeIR | undefined, part: string): DomNodeIR | undefined {
  if (!node) return undefined;
  if (node.part === part) return node;
  for (const child of node.children) {
    const found = findNode(child, part);
    if (found) return found;
  }
  return undefined;
}

/** The disabled prop (R6): the interaction's disabledProp, else a
 * `disabled=prop:<p>` binding on the form-control part. Its generated
 * property drives SetEnabled on the root, so the USS projection reads the
 * same fact to lower a `<prefix>--<disabledProp>` modifier as `:disabled`. */
export function disabledProp(ir: ComponentIR): string | undefined {
  if (ir.interaction?.disabledProp) return ir.interaction.disabledProp;
  const control = ir.formControl && findNode(ir.dom, ir.formControl.part.name);
  const binding: BindingExpression | undefined = control?.bindings[DISABLED_ATTRIBUTE];
  if (binding?.kind === "prop") return binding.prop;
  // An action root binds disabled on itself; the generated property still
  // drives SetEnabled on the root, and the USS projection reads the same fact.
  const rootBinding: BindingExpression | undefined = ir.dom?.bindings[DISABLED_ATTRIBUTE];
  return rootBinding?.kind === "prop" && !rootBinding.path?.length ? rootBinding.prop : undefined;
}

/** Trigger parts (R1): the form control part, every interaction trigger part
 * and the surface anchor part. Read from IR facts, never from part names. */
export function triggerParts(ir: ComponentIR): Set<string> {
  const parts = new Set<string>();
  if (ir.formControl) parts.add(ir.formControl.part.name);
  for (const trigger of ir.interaction?.triggers ?? []) parts.add(trigger.part.name);
  if (ir.surface?.anchor) parts.add(ir.surface.anchor.part.name);
  // A projected-children action root is itself the native activation
  // affordance, so bindings on it (disabled) are trigger-part bindings.
  if (isProjectedChildrenAction(ir) && ir.dom?.part) parts.add(ir.dom.part);
  return parts;
}
