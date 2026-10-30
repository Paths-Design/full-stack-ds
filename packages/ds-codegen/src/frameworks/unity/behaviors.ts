/**
 * Unity behavior dispatcher (brief rule R7).
 *
 * The three runtime behaviors (`BooleanControl`, `ItemGroup`,
 * `AnchoredSurface`) are plain C# classes the generated constructor attaches
 * to the tree the anatomy walker built. Which one attaches, and with which
 * options, is decided here from IR facts only: value model, interaction
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
import { isPartAnchoredSurface } from "../../semantics.js";

export type UnityBehavior = "BooleanControl" | "ItemGroup" | "AnchoredSurface";

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
export interface ItemGroupLowering extends LoweringBase {
  behavior: "ItemGroup";
  trigger: PartIR;
  content: PartIR;
  operation: string;
  multiple: boolean;
  focus: ItemGroupFocus;
}
export interface AnchoredSurfaceLowering extends LoweringBase {
  behavior: "AnchoredSurface";
  trigger: PartIR;
  content: PartIR;
}
export type UnityLowering = BooleanControlLowering | ItemGroupLowering | AnchoredSurfaceLowering;

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

/** Source: IR control/interaction/attachment axes. Applies by value model,
 * operation and attachment, never identity. Extend when new axes are admitted. */
export function unityLowering(ir: ComponentIR): UnityLowering {
  const focus = ir.behavior.focus?.strategy;
  const portal = ir.behavior.portal?.enabled === true;
  const refuseFocus = (behavior: UnityBehavior): never => { throw new Error(`UNITY_UNSUPPORTED_FOCUS: ${ir.name} declares focus.strategy ${JSON.stringify(focus)}, which ${behavior} does not realise`); };
  if (ir.surface) {
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
  if (ir.formControl?.valueModel === "boolean") {
    if (focus !== undefined && focus !== "auto") refuseFocus("BooleanControl");
    return { behavior: "BooleanControl", channel: ir.formControl.channel, control: ir.formControl.part, stateClass: stateClassOf(ir) };
  }
  const interaction = ir.interaction;
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
  return binding?.kind === "prop" ? binding.prop : undefined;
}

/** Trigger parts (R1): the form control part, every interaction trigger part
 * and the surface anchor part. Read from IR facts, never from part names. */
export function triggerParts(ir: ComponentIR): Set<string> {
  const parts = new Set<string>();
  if (ir.formControl) parts.add(ir.formControl.part.name);
  for (const trigger of ir.interaction?.triggers ?? []) parts.add(trigger.part.name);
  if (ir.surface?.anchor) parts.add(ir.surface.anchor.part.name);
  return parts;
}
