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
import type { BindingExpression, ComponentIR, DomNodeIR, NormalizedChannelIR, PartIR, ResolvedPropIR } from "../../ir.js";
import { countChildrenLeaves, isBareRuleLeaf, isGuardedActionChrome, isProjectedChildrenAction, isStaticContent } from "../native-emission-class.js";
import { isPartAnchoredSurface } from "../../semantics.js";

export type UnityBehavior = "Passive" | "Slots" | "Coachmark" | "Anchor" | "Media" | "Avatar" | "BooleanControl" | "TextInput" | "ItemGroup" | "AnchoredSurface" | "Disclosure" | "Progress" | "Action" | "ComposedAction" | "Modal" | "Toast";

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
/**
 * A progress value: a declared numeric prop drives a decoration element's
 * size through a CSS-variable style binding, and an optional presence-guarded
 * label element is owned by the behavior. The runtime sets the fill's native
 * percentage length and toggles the label's presence; no event channel is
 * involved (the contract declares a plain value prop, not a channel).
 */
export interface ProgressLowering {
  behavior: "Progress";
  fill: PartIR;
  /** The declared numeric prop the fill's style binding reads. */
  valueProp: string;
  /** The presence-guarded value label the runtime shows/hides. */
  value?: { part: PartIR; presenceProp: string };
  min: number;
  max: number;
}
export interface ItemGroupLowering extends LoweringBase {
  behavior: "ItemGroup";
  trigger: PartIR;
  content: PartIR;
  operation: string;
  multiple: boolean;
  focus: ItemGroupFocus;
}
/**
 * A blocking modal surface: a persistent, centered dialog panel that owns an
 * open channel, a backdrop overlay and a close trigger. The runtime portals the
 * host to the panel root, traps focus while open, and honours the declared
 * dismissal triggers through generated knobs.
 */
export interface ModalLowering extends LoweringBase {
  behavior: "Modal";
  trigger: PartIR;
  content: PartIR;
  overlay?: PartIR;
  /** The trigger's presence prop, lowered to a generated Dismissible flag. */
  dismissibleProp?: string;
  /** The surface's edge placement prop, realised by the runtime's Placement. */
  placementProp?: string;
}
/**
 * A non-blocking ephemeral viewport surface: a toast card that owns an open
 * channel, an auto-dismiss timer, a title text and a close control. The runtime
 * portals the host to the panel root and anchors it to the viewport edge.
 */
export interface ToastLowering extends LoweringBase {
  behavior: "Toast";
  content: PartIR;
  close: PartIR;
  title?: PartIR;
  action?: PartIR;
  timingProp?: string;
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
/**
 * A composed trigger: a component reference declaring a trigger role and a
 * direct click callback binding lowers to native action chrome — a `Button`
 * carrying the part identity, whose click forwards to the generated callback
 * property. A guarded reference's presence follows a generated boolean flag.
 * The referenced component's own visual composition is not claimed.
 */
export interface ComposedActionTrigger {
  part: PartIR;
  guardProp?: string;
  callbackProp: string;
}
export interface ComposedActionLowering {
  behavior: "ComposedAction";
  triggers: ComposedActionTrigger[];
  disabledProp?: string;
}
/**
 * A slot-only composition container: the contract's structure is a set of
 * named slot hosts plus carrier axes, and its channel is context propagation
 * for a consumer-supplied child control. No runtime class attaches; the value
 * context and validation state are withheld.
 */
export interface SlotsLowering {
  behavior: "Slots";
}
/**
 * An inline coachmark scaffold: the persistent non-blocking tour card renders
 * its slot hosts and native controls inline. The numeric step channel becomes a
 * consumer-managed attribute; the skip/previous/next callback props become
 * generated actions wired to the native buttons. Anchoring, message labels,
 * and the dots iteration are withheld/pending.
 */
export interface CoachmarkLowering {
  behavior: "Coachmark";
  channel: NormalizedChannelIR;
  callbacks: { part: string; prop: string }[];
  disabled?: { part: string; prop: string };
}
/**
 * A navigable anchor scaffold: the generated host carries the declared
 * destination metadata (href/target/rel) and, on activation while enabled,
 * raises an activation request through LinkControl. It never navigates itself
 * and does not model visited state.
 */
export interface AnchorLowering {
  behavior: "Anchor";
  hrefProp: string;
  targetProp?: string;
  relProp?: string;
  disabledProp?: string;
}
/**
 * A native media element: the generated class derives the UI Toolkit Image
 * element, and the declared source string is loaded as a Resources texture by
 * ImageControl. URL fetching, alternative text semantics and responsive source
 * selection are not realised.
 */
export interface MediaLowering {
  behavior: "Media";
  srcProp: string;
}
/**
 * A guarded media composition: an admitted Image child and a text fallback, each
 * shown when its declared string prop is non-empty. AvatarControl owns the
 * presence of both children and paints the fallback text; no a11y label or
 * priority semantics are realised.
 */
export interface AvatarLowering {
  behavior: "Avatar";
  srcProp: string;
  initialsProp: string;
  imageRef: string;
  imagePart: string;
}
export interface PassiveLowering {
  behavior: "Passive";
  /** A declared string prop the text-host root paints through `TextElement.text`. */
  textProp?: string;
}
export interface TextInputLowering {
  behavior: "TextInput";
  channel: NormalizedChannelIR;
  control: PartIR;
  /** The placeholder binding prop, realised through the native text edition. */
  placeholderProp?: string;
}
export type ChannelLowering = BooleanControlLowering | TextInputLowering | ItemGroupLowering | AnchoredSurfaceLowering | DisclosureLowering | ModalLowering | ToastLowering;
export type UnityLowering = PassiveLowering | SlotsLowering | CoachmarkLowering | AnchorLowering | MediaLowering | AvatarLowering | ActionLowering | ProgressLowering | ComposedActionLowering | ChannelLowering;

/** Whether the selected lowering owns a normalized channel trio. */
export function hasChannel(lowering: UnityLowering): lowering is ChannelLowering {
  return lowering.behavior === "BooleanControl" || lowering.behavior === "TextInput" || lowering.behavior === "ItemGroup" || lowering.behavior === "AnchoredSurface" || lowering.behavior === "Disclosure" || lowering.behavior === "Modal" || lowering.behavior === "Toast" || lowering.behavior === "Coachmark";
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

function declaredProp(ir: ComponentIR, name: string): ResolvedPropIR | undefined {
  return ir.styledProps.find(candidate => candidate.name === name);
}
function hasSlots(node: DomNodeIR | undefined): boolean {
  if (node === undefined) return false;
  if (node.tag === "slot") return true;
  return node.children.some(hasSlots);
}

function propIsString(ir: ComponentIR, name: string): boolean {
  const prop = declaredProp(ir, name);
  return prop !== undefined && (prop.propType.kind === "string" || (prop.propType.kind === "fallback" && prop.propType.raw === "string"));
}

function propIsBoolean(ir: ComponentIR, name: string): boolean {
  const prop = declaredProp(ir, name);
  return prop !== undefined && (prop.propType.kind === "boolean" || (prop.propType.kind === "fallback" && prop.propType.raw === "boolean"));
}

/**
 * A passive text-content host: a non-interactive root whose only content is a
 * direct binding to a declared string prop. The root derives `TextElement` and
 * the prop becomes a generated text attribute; selection is by tag/binding and
 * prop-type facts, never by name.
 */
function textContentProp(ir: ComponentIR): string | undefined {
  if (!ir.dom || ir.dom.componentRef !== undefined) return undefined;
  if (["button", "input", "img"].includes(ir.dom.tag)) return undefined;
  const content = ir.dom.content;
  if (content === undefined || !("kind" in content) || content.kind !== "prop" || content.path?.length) return undefined;
  const prop = ir.styledProps.find(candidate => candidate.name === content.prop);
  if (!prop) return undefined;
  const stringProp = prop.propType.kind === "string" || (prop.propType.kind === "fallback" && prop.propType.raw === "string");
  return stringProp ? content.prop : undefined;
}

/**
 * A composed trigger shape: a component reference with trigger role and a
 * direct click callback binding, in a contract with no channel, form control,
 * interaction or surface. Selection is by role, binding and guard facts.
 */
function composedActionLowering(ir: ComponentIR): ComposedActionLowering | undefined {
  if (!ir.dom || ir.surface || ir.formControl || ir.interaction || ir.behavior.normalizedChannels.length > 0) return undefined;
  const triggers: ComposedActionTrigger[] = [];
  let disabledProp: string | undefined;
  const walk = (node: DomNodeIR): void => {
    if (node.componentRef !== undefined && node.part !== undefined) {
      const part = ir.parts.find(candidate => candidate.name === node.part);
      const click = node.events.click;
      if (part?.details?.role === "trigger" && click?.kind === "prop" && !click.path?.length) {
        const guardProp = node.ifProp !== undefined && !node.ifNegated && propIsBoolean(ir, node.ifProp) ? node.ifProp : undefined;
        triggers.push({ part, ...(guardProp === undefined ? {} : { guardProp }), callbackProp: click.prop });
        const disabled = node.bindings["disabled"];
        if (disabledProp === undefined && disabled?.kind === "prop" && !disabled.path?.length) disabledProp = disabled.prop;
      }
    }
    node.children.forEach(walk);
  };
  walk(ir.dom);
  if (triggers.length === 0 || !triggers.some(trigger => trigger.guardProp === undefined)) return undefined;
  return { behavior: "ComposedAction", triggers, ...(disabledProp === undefined ? {} : { disabledProp }) };
}

/**
 * A value-fill shape: a decoration element whose CSS-variable style binding is
 * driven by a declared numeric prop, and optionally one presence-guarded label
 * driven by a declared boolean prop. The range comes from the root's
 * `aria-valuemin` / `aria-valuemax` literal bindings when present. Selected by
 * binding, prop type and guard facts, never by component or part name.
 */
function valueFillLowering(ir: ComponentIR): ProgressLowering | undefined {
  if (!ir.dom) return undefined;
  const numeric = (name: string): boolean => {
    const prop = ir.styledProps.find(candidate => candidate.name === name);
    return prop !== undefined && (prop.propType.kind === "number" || (prop.propType.kind === "fallback" && prop.propType.raw === "number"));
  };
  const booleanProp = (name: string): boolean => {
    const prop = ir.styledProps.find(candidate => candidate.name === name);
    return prop !== undefined && (prop.propType.kind === "boolean" || (prop.propType.kind === "fallback" && prop.propType.raw === "boolean"));
  };
  const range = (attribute: string, fallback: number): number => {
    const binding = ir.dom!.bindings[attribute];
    if (binding?.kind !== "literal") return fallback;
    const parsed = Number(binding.value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  let fill: PartIR | undefined;
  let valueProp: string | undefined;
  let value: ProgressLowering["value"];
  const walk = (node: DomNodeIR): void => {
    if (!fill && node.cssVarBindings.some(binding => binding.value.kind === "prop" && numeric(binding.value.prop))) {
      const binding = node.cssVarBindings.find(candidate => candidate.value.kind === "prop" && numeric((candidate.value as { prop: string }).prop))!;
      const part = node.part === undefined ? undefined : ir.parts.find(candidate => candidate.name === node.part);
      if (part) { fill = part; valueProp = (binding.value as { prop: string }).prop; }
    }
    if (!value && node.ifProp !== undefined && !node.ifNegated && booleanProp(node.ifProp)) {
      const part = node.part === undefined ? undefined : ir.parts.find(candidate => candidate.name === node.part);
      if (part) value = { part, presenceProp: node.ifProp };
    }
    node.children.forEach(walk);
  };
  walk(ir.dom);
  if (!fill || valueProp === undefined) return undefined;
  return { behavior: "Progress", fill, valueProp, ...(value ? { value } : {}), min: range("aria-valuemin", 0), max: range("aria-valuemax", 100) };
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
    const inlineCoachmark = ir.surface.kind === "coachmark" && ir.surface.modality === "non-blocking" &&
      ir.surface.presence === "persistent" && ir.dom !== undefined && !ir.interaction &&
      ir.behavior.normalizedChannels.length === 1 && ir.behavior.normalizedChannels[0]!.valueType === "number";
    if (inlineCoachmark) {
      const channel = ir.behavior.normalizedChannels[0]!;
      const callbacks: { part: string; prop: string }[] = [];
      let disabled: { part: string; prop: string } | undefined;
      const walk = (node: DomNodeIR): void => {
        const click = node.events.click;
        if (node.part !== undefined && click?.kind === "prop" && !click.path?.length) callbacks.push({ part: node.part, prop: click.prop });
        const bind = node.bindings["disabled"];
        if (node.part !== undefined && bind?.kind === "prop" && !bind.path?.length && disabled === undefined) disabled = { part: node.part, prop: bind.prop };
        node.children.forEach(walk);
      };
      walk(ir.dom!);
      return { behavior: "Coachmark", channel, callbacks, ...(disabled === undefined ? {} : { disabled }) };
    }
    const ephemeralToast = ir.surface.kind === "toast" && ir.surface.modality === "non-blocking" &&
      ir.surface.presence === "ephemeral" && ir.surface.positioning?.strategy === "viewport-edge" &&
      ir.surface.content !== undefined && !ir.interaction &&
      ir.behavior.normalizedChannels.length === 1 && ir.behavior.normalizedChannels[0]!.valueType === "boolean";
    if (ephemeralToast) {
      const channel = ir.behavior.normalizedChannels[0]!;
      const content = ir.surface.content!;
      const closeNode = ir.parts.find(part => part.details?.role === "trigger" &&
        findNode(ir.dom, part.name)?.events.click?.kind === "channel" &&
        (findNode(ir.dom, part.name)?.events.click as { channel?: string } | undefined)?.channel === channel.name);
      const titleNode = ir.dom === undefined ? undefined : (() => {
        let found: DomNodeIR | undefined;
        const walk = (node: DomNodeIR): void => {
          if (found) return;
          if (node.ifProp !== undefined && node.content !== undefined && "kind" in node.content && node.content.kind === "prop" && node.content.prop === node.ifProp && propIsString(ir, node.ifProp)) found = node;
          node.children.forEach(walk);
        };
        walk(ir.dom!);
        return found;
      })();
      const actionNode = ir.dom === undefined ? undefined : (() => {
        let found: DomNodeIR | undefined;
        const walk = (node: DomNodeIR): void => {
          if (found) return;
          if (node.ifSlot !== undefined) found = node;
          node.children.forEach(walk);
        };
        walk(ir.dom!);
        return found;
      })();
      const partOf = (node: DomNodeIR | undefined): PartIR | undefined => node?.part === undefined ? undefined : ir.parts.find(part => part.name === node.part);
      if (ir.behavior.normalizedChannels.length === 1 && content.part !== undefined) {
        const triggerPart = closeNode === undefined ? undefined : partOf(findNode(ir.dom, closeNode.name)!);
        if (triggerPart !== undefined) {
          return {
            behavior: "Toast",
            channel,
            stateClass: `is-${channel.valueProp}`,
            content: content.part,
            close: triggerPart,
            ...(titleNode === undefined || partOf(titleNode) === undefined ? {} : { title: partOf(titleNode)! }),
            ...(actionNode === undefined || partOf(actionNode) === undefined ? {} : { action: partOf(actionNode)! }),
            ...(ir.surface.timing?.autoDismissProp === undefined ? {} : { timingProp: ir.surface.timing.autoDismissProp }),
          };
        }
      }
      throw new Error(`UNITY_UNSUPPORTED_SURFACE: ${ir.name} ephemeral toast declares no channel-bound close trigger`);
    }
    const centeredDialog = ir.surface.kind === "dialog" && ir.surface.positioning?.strategy === "centered";
    const edgeSheet = ir.surface.kind === "sheet" && ir.surface.positioning?.strategy === "viewport-edge";
    const modalSurface = ir.surface.modality === "blocking" && (centeredDialog || edgeSheet) &&
      ir.surface.presence === "persistent" && ir.surface.content?.interactive === true &&
      ir.interaction?.triggers.length === 1 && ir.interaction.triggers[0]!.operation === "close" &&
      ir.surface.dismissal.every(dismissal => ["escape", "outside-click", "close-button"].includes(dismissal));
    if (modalSurface) {
      if (focus !== undefined && focus !== "none" && focus !== "auto" && focus !== "trap") refuseFocus("Modal");
      const content = ir.surface.content!;
      const trigger = ir.interaction!.triggers[0]!.part;
      const triggerNode = findNode(ir.dom, trigger.name);
      const dismissibleProp = triggerNode?.ifProp !== undefined && !triggerNode.ifNegated && propIsBoolean(ir, triggerNode.ifProp) ? triggerNode.ifProp : undefined;
      const overlay = ir.parts.find(part => part.details?.role === "overlay");
      const channel = ir.interaction!.channel;
      return {
        behavior: "Modal",
        channel,
        stateClass: `is-${channel.valueProp}`,
        trigger,
        content: content.part,
        ...(overlay === undefined ? {} : { overlay }),
        ...(dismissibleProp === undefined ? {} : { dismissibleProp }),
        ...(ir.surface.positioning?.placementProp === undefined ? {} : { placementProp: ir.surface.positioning.placementProp }),
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
  if (!ir.interaction && !ir.formControl && ir.behavior.normalizedChannels.length === 0) {
    const progress = valueFillLowering(ir);
    if (progress) return progress;
    const composed = composedActionLowering(ir);
    if (composed) return composed;
  }
  // A guarded media composition: a referenced Image child bound to a source
  // prop plus a guarded text fallback. Runtime presence toggles both children.
  if (!ir.interaction && !ir.formControl && ir.surface === undefined && ir.behavior.normalizedChannels.length === 0 && ir.dom !== undefined) {
    const imageNode = ir.dom.children.find(node => node.componentRef !== undefined &&
      node.bindings.src?.kind === "prop" && node.ifProp !== undefined);
    const fallback = ir.dom.children.find(node => node.content !== undefined && "kind" in node.content &&
      node.content.kind === "prop" && node.ifProp === node.content.prop && node.part !== undefined);
    if (imageNode?.componentRef !== undefined && imageNode.bindings.src?.kind === "prop" && imageNode.ifProp !== undefined &&
        fallback !== undefined && fallback.part !== undefined) {
      if (imageNode.part === undefined) throw new Error(`UNITY_UNSUPPORTED_REF: ${ir.name} image reference carries no part`);
      return { behavior: "Avatar", srcProp: imageNode.bindings.src.prop, initialsProp: fallback.ifProp!, imageRef: imageNode.componentRef, imagePart: imageNode.part };
    }
  }
  // A native media element: an `<img>` root with a prop-bound source. The host
  // derives the UI Toolkit Image element and ImageControl loads the source as a
  // Resources texture; no URL fetching or alternative text is realised.
  if (ir.dom?.tag === "img" && ir.dom.bindings.src?.kind === "prop" && !ir.interaction && !ir.formControl &&
      ir.surface === undefined && ir.behavior.normalizedChannels.length === 0) {
    const src = ir.dom.bindings.src;
    if (src.kind !== "prop" || src.path?.length) throw new Error(`UNITY_UNSUPPORTED_MEDIA: ${ir.name} source binding is not a direct prop`);
    return { behavior: "Media", srcProp: src.prop };
  }
  // A navigable anchor: an `<a>` root whose destination metadata is
  // prop-bound. The generated host never navigates; the runtime raises an
  // activation request while enabled.
  if (ir.dom?.tag === "a" && ir.dom.bindings.href?.kind === "prop" && !ir.interaction && !ir.formControl &&
      ir.surface === undefined && ir.behavior.normalizedChannels.length === 0) {
    const propOf = (attribute: string): string | undefined => {
      const binding = ir.dom!.bindings[attribute];
      return binding?.kind === "prop" && !binding.path?.length ? binding.prop : undefined;
    };
    const hrefProp = propOf("href")!;
    const targetProp = propOf("target");
    const relProp = propOf("rel");
    const disabled = propIsBoolean(ir, "disabled") ? "disabled" : disabledProp(ir);
    return {
      behavior: "Anchor",
      hrefProp,
      ...(targetProp === undefined ? {} : { targetProp }),
      ...(relProp === undefined ? {} : { relProp }),
      ...(disabled === undefined ? {} : { disabledProp: disabled }),
    };
  }
  const textProp = textContentProp(ir);
  if (!ir.interaction && !ir.formControl && (isBareRuleLeaf(ir) || isStaticContent(ir) || isUnityStaticContainer(ir) || isPartsOnlyContainer(ir) || textProp !== undefined)) {
    if (focus !== undefined && focus !== "none") throw new Error(`UNITY_UNSUPPORTED_FOCUS: ${ir.name} declares focus.strategy ${JSON.stringify(focus)}, which Passive does not realise`);
    return { behavior: "Passive", ...(textProp === undefined ? {} : { textProp }) };
  }
  // A slot-only composition container: no interaction, surface or form-control,
  // but a channel and named slot hosts. The channel is context propagation for a
  // consumer-supplied child control and is withheld; only the slot hosts and the
  // carrier axes are realised.
  if (!ir.interaction && !ir.formControl && ir.surface === undefined && ir.behavior.normalizedChannels.length > 0 && hasSlots(ir.dom)) {
    return { behavior: "Slots" };
  }
  if (ir.formControl?.valueModel === "boolean") {
    if (focus !== undefined && focus !== "auto") refuseFocus("BooleanControl");
    return { behavior: "BooleanControl", channel: ir.formControl.channel, control: ir.formControl.part, stateClass: stateClassOf(ir) };
  }
  // A native text input: the form-control part is the root input element and its
  // value model is text; the generated class derives TextField and the string
  // value channel is wired through TextControl.
  if (ir.formControl?.valueModel === "text") {
    if (findNode(ir.dom, ir.formControl.part.name)?.tag !== "input") throw new Error(`UNITY_UNSUPPORTED_INTERACTION: ${ir.name} text form control is not an input element`);
    if (focus !== undefined && focus !== "none" && focus !== "auto") refuseFocus("TextInput");
    const placeholder = findNode(ir.dom, ir.formControl.part.name)?.bindings["placeholder"];
    return {
      behavior: "TextInput",
      channel: ir.formControl.channel,
      control: ir.formControl.part,
      ...(placeholder?.kind === "prop" && !placeholder.path?.length ? { placeholderProp: placeholder.prop } : {}),
    };
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
