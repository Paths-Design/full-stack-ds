/**
 * Generic anatomy planner for the Godot target.
 *
 * The bounded Godot shapes (sequence, glyph, composite, action, static text /
 * rule, wide surface, scalar control) each own a structural class whose
 * contract facts they can account for exactly. Everything else is the
 * platform's *arbitrary anatomy* class: a contract-authored DOM tree of parts
 * with no bounded lowering. This planner projects that tree structurally —
 * one named scene host per contract part, the consumer content region marked,
 * the mappable style subset projected — and writes a receipt that names every
 * fact the target does not lower.
 *
 * Source fact: `anatomy.dom` node tree, `anatomy.parts`, styled props, native
 * style rules, channels/interaction/form facts.
 * Applies by: passive structural lowering of whatever the bounded planners
 * declined. There is no component-name dispatch here: a renamed contract plans
 * identically, and the planner declines every shape a bounded planner owns.
 * Removable when: the bounded shapes generalize to cover arbitrary anatomy.
 *
 * Discipline: a plan never silently drops a fact. Structural facts the target
 * does not lower are named in `omissions`; prop facts are partitioned into
 * `projectedProps` (values the runtime resolves) and `excluded` (no native
 * projection, each also named in `omissions`). Anatomy that cannot be hosted
 * honestly at all raises `GODOT_UNSUPPORTED_ANATOMY: <Name> <what>`.
 */
import {
  isContentTransform,
  type BindingExpression,
  type ComponentIR,
  type DomNodeIR,
  type ResolvedPropIR,
} from "../../ir.js";
import type {
  GodotAnatomyPlan,
  GodotStyleDeclaration,
  GodotStyleRule,
} from "./plan-types.js";
import {
  isBareRuleLeaf,
  isCompoundPartComposer,
  isIconDecoratedContent,
  isProjectedChildrenAction,
  isStaticContent,
} from "../native-emission-class.js";
import { collectIconGlyphNodes } from "../icon-glyph.js";
import { godotAccessibilityFacts } from "./accessibility-facts.js";

/**
 * Property vocabulary the generic structure can carry natively. Kept in step
 * with the sibling composite projection (composite-plan.ts): a native target
 * admits a closed declaration set instead of inventing a general CSS
 * interpreter. Anything outside this set is a named omission.
 */
const PAINT_PROPERTIES = new Set([
  "background-color", "border-color", "border-width", "border-radius",
]);
const PADDING_PROPERTIES = new Set(["padding", "padding-block", "padding-inline"]);
const TEXT_PROPERTIES = new Set(["color", "font-size", "font-weight"]);
const LAYOUT_PROPERTIES = new Set(["gap", "min-height"]);

/** What a generated host can express natively. */
type HostKind = "root" | "panel" | "stack" | "text" | "control";

/** Godot classes that carry a `text` property, so scene text can be pinned. */
const TEXT_CAPABLE_TYPES = new Set(["Label", "Button", "LineEdit", "TextEdit", "CheckBox"]);

interface SceneDraft {
  node: DomNodeIR;
  /** Godot node name; the contract part, disambiguated when it repeats. */
  name: string;
  part: string;
  /** Godot parent path ("." for a root child). */
  parent: string;
  /** Full node path, used to count direct children. */
  path: string;
  kind: HostKind;
  type: string;
  text: string | undefined;
}

/** Throw the typed refusal; never a bare Error. */
function unsupported(ir: ComponentIR, what: string): never {
  throw new Error(`GODOT_UNSUPPORTED_ANATOMY: ${ir.name} ${what}`);
}

/**
 * The shapes `factory.ts`'s narrow static plan claims: a bare rule leaf or one
 * text root whose only binding is the truncate conditional and whose only child
 * is the consumer content leaf. Mirroring the *claim* (not the whole shape) is
 * what lets a static anatomy the plan declined — extra facts, a new prop, an
 * unsupported selector — fall through to the generic structure with named
 * omissions instead of staying refused.
 */
const STATIC_TEXT_PROPS = new Set(["as", "variant", "size", "weight", "align", "transform", "truncate"]);
const STATIC_RULE_PROPS = new Set(["orientation", "decorative", "thickness", "title"]);
const STATIC_TEXT_STYLES = new Set(["color", "font-size", "font-weight", "line-height", "letter-spacing"]);
const STATIC_RULE_STYLES = new Set([
  "border-top-color", "border-left-color", "border-top-width", "border-left-width",
  "margin-top", "margin-bottom", "margin-left", "margin-right",
]);

/** The static plan's style claim: root-targeted variant rules over the shape's
 * own declaration vocabulary, no pseudo selectors, no other unsupported leaf. */
function staticStyleClaim(ir: ComponentIR, allowed: Set<string>): boolean {
  const rules = (ir.nativeStyleRules?.rules ?? []).filter(rule => rule.sourceKey !== "tokens" && rule.sourceKey !== "structure");
  if (rules.some(rule => rule.part !== "root" || rule.pseudo || rule.predicates.some(predicate => predicate.kind !== "variant"))) return false;
  const unsupportedDeclaration = rules.some(rule => rule.declarations.some(declaration =>
    !declaration.property.includes(".") && !declaration.platforms && !allowed.has(declaration.property)));
  if (unsupportedDeclaration) return false;
  return (ir.nativeStyleRules?.unsupported ?? []).every(rule => rule.sourceKey === `.${ir.cssPrefix}[data-truncate="true"]`);
}

function boundedStaticShape(ir: ComponentIR): boolean {
  if (isBareRuleLeaf(ir)) {
    if (!ir.styledProps.every(prop => STATIC_RULE_PROPS.has(prop.name))) return false;
    return staticStyleClaim(ir, STATIC_RULE_STYLES);
  }
  if (!isStaticContent(ir) || !ir.dom) return false;
  const root = ir.dom;
  const child = root.children[0];
  if (root.part !== "root" || root.children.length !== 1 || child?.tag !== "children") return false;
  if (Object.keys(root.bindings).join() !== "data-truncate") return false;
  const truncate = root.bindings["data-truncate"];
  if (truncate?.kind !== "conditional" || truncate.condition.kind !== "prop" || truncate.condition.prop !== "truncate" ||
      truncate.whenTrue.kind !== "literal" || truncate.whenTrue.value !== "true" ||
      truncate.whenFalse.kind !== "literal" || truncate.whenFalse.value !== "false") return false;
  if (Object.keys(root.attrs).length || Object.keys(root.events).length || Object.keys(root.propertyBindings).length ||
      root.cssVarBindings.length || root.activation || root.focusContainer || root.keyboardActions?.length ||
      root.content || root.componentRef || root.iteration || root.ifProp || root.ifSlot || root.iconGlyph ||
      root.generatedIdSlug || root.idRefAttrs.length) return false;
  if (child.children.length || Object.keys(child.bindings).length || Object.keys(child.attrs).length || child.content) return false;
  if (!ir.styledProps.every(prop => STATIC_TEXT_PROPS.has(prop.name))) return false;
  return staticStyleClaim(ir, STATIC_TEXT_STYLES);
}

/**
 * The compound-part composite claim: a dom-less part dictionary whose every
 * non-root part is one of the compound parts and holds no component instance.
 * A stray part or reference makes composite decline, so the generic planner
 * must not decline on the class alone.
 */
function boundedCompoundShape(ir: ComponentIR): boolean {
  if (!isCompoundPartComposer(ir)) return false;
  const compoundNames = new Set(ir.compoundParts.map(part => part.name));
  if (ir.parts.some(part => part.name !== "root" && !compoundNames.has(part.name))) return false;
  return !ir.compoundParts.some(part => part.componentRef);
}

/**
 * The pure single-glyph host `glyph-plan.ts` claims: one glyph node that is the
 * root's only child over a passive root. The glyph plan declines every wider
 * glyph-bearing shape (a glyph nested in a heading row, a tree with several
 * glyphs) so those fall to the generic structure; only the bounded claim is
 * declined here.
 */
function boundedGlyphHost(ir: ComponentIR): boolean {
  if (!ir.dom) return false;
  const entries = collectIconGlyphNodes(ir.dom);
  if (entries.length !== 1 || ir.dom.children.length !== 1 || ir.dom.children[0] !== entries[0]!.node) return false;
  return ir.behavior.normalizedChannels.length === 0 && !ir.interaction && !ir.formControl &&
    !ir.surface && !ir.compoundParts.length && !ir.motion.sequence;
}

/**
 * The bounded icon-decorated composite shape: exactly two direct root regions,
 * an `icon` part and a `content` part. A decorated anatomy with extra regions
 * (Alert, AlertNotice) is not that shape; composite-plan.ts declines it so the
 * generic planner can host the consumer children slot itself.
 */
function boundedDecoratedContent(ir: ComponentIR): boolean {
  if (!isIconDecoratedContent(ir) || !ir.dom) return false;
  const root = ir.dom;
  return root.children.length === 2 &&
    root.children.some(node => node.part === "icon") &&
    root.children.some(node => node.part === "content");
}

/**
 * The scalar control shapes the legacy control runtime owns (boolean value
 * model, single select/toggle-item activation trigger). Declined so the
 * generic structure cannot steal a control plan.
 */
function specialisedControlShape(ir: ComponentIR): boolean {
  if (ir.formControl?.valueModel === "boolean") return true;
  const triggers = ir.interaction?.triggers ?? [];
  return triggers.length === 1 && (triggers[0]!.operation === "select" || triggers[0]!.operation === "toggle-item");
}

/**
 * Source fact: the IR shape itself.
 * Applies by: structural class membership only, never component identity.
 * Removable when: the shape predicates retire.
 */
export function godotAnatomyPlan(ir: ComponentIR): GodotAnatomyPlan | undefined {
  const dom = ir.dom;
  if (!dom) return undefined;
  if (ir.surface != null) return undefined;
  if (ir.motion.sequence) return undefined;
  if (boundedGlyphHost(ir)) return undefined;
  if (boundedStaticShape(ir)) return undefined;
  if (isProjectedChildrenAction(ir)) return undefined;
  if (boundedCompoundShape(ir) || boundedDecoratedContent(ir)) return undefined;
  if (specialisedControlShape(ir)) return undefined;
  return buildAnatomyPlan(ir, dom);
}

function describeExpression(expression: BindingExpression | import("../../ir.js").ContentTransformIR): string {
  if (isContentTransform(expression)) return `content-transform:${expression.transform}`;
  switch (expression.kind) {
    case "prop": return `prop:${expression.prop}${expression.path?.length ? `.${expression.path.join(".")}` : ""}`;
    case "channel": return `channel:${expression.channel}.${expression.field}`;
    case "literal": return "literal";
    case "message": return `message:${expression.key}`;
    case "iterationLocal": return `iterationLocal:${expression.local}`;
    case "conditional": return "conditional";
    case "predicate": return `predicate:${expression.op}`;
    case "projection": return `projection:${expression.op}`;
    case "valueMap": return "valueMap";
    case "channelCall": return `channelCall:${expression.channel}`;
    case "channelUpdate": return `channelUpdate:${expression.channel}.${expression.op}`;
    case "paged": return `paged:${expression.action ?? expression.field ?? "value"}`;
    case "dateGrid": return `dateGrid:${expression.action ?? expression.field ?? "value"}`;
    case "transfer": return `transfer:${expression.action ?? expression.field ?? "value"}`;
  }
}

/** Every prop name an expression reads, so a prop receipt can name its use. */
function propRefs(expression: BindingExpression | import("../../ir.js").ContentTransformIR, into: Set<string>): void {
  if (isContentTransform(expression)) {
    if (expression.transform === "highlight") {
      into.add(expression.sourceProp);
      into.add(expression.languageProp);
    } else {
      into.add(expression.sourceProp);
    }
    return;
  }
  switch (expression.kind) {
    case "prop": into.add(expression.prop); return;
    case "iterationLocal":
    case "literal":
    case "channel": return;
    case "message": expression.params.forEach(param => propRefs(param.value, into)); return;
    case "conditional": propRefs(expression.condition, into); propRefs(expression.whenTrue, into); propRefs(expression.whenFalse, into); return;
    case "predicate": propRefs(expression.left, into); propRefs(expression.right, into); return;
    case "projection": propRefs(expression.source, into); propRefs(expression.selection, into); propRefs(expression.fallback, into); return;
    case "valueMap": propRefs(expression.source, into); return;
    case "channelCall": propRefs(expression.arg, into); return;
    case "channelUpdate": expression.operands.forEach(operand => propRefs(operand, into)); return;
    case "paged": case "dateGrid": case "transfer": if (expression.arg) propRefs(expression.arg, into); return;
  }
}

/** How the claimed props are used by anatomy facts, for honest prop receipts. */
function propUsages(ir: ComponentIR): Map<string, string> {
  const usage = new Map<string, string>();
  const note = (expression: BindingExpression | import("../../ir.js").ContentTransformIR | undefined, label: string): void => {
    if (!expression) return;
    const refs = new Set<string>();
    propRefs(expression, refs);
    for (const prop of refs) if (!usage.has(prop)) usage.set(prop, label);
  };
  const visit = (node: DomNodeIR): void => {
    note(node.content, "bound to node content; native text projection unverified");
    for (const [attribute, binding] of Object.entries(node.bindings)) note(binding, `bound to the ${attribute} attribute; native attribute projection unverified`);
    for (const [attribute, binding] of Object.entries(node.propertyBindings)) note(binding, `bound to the ${attribute} DOM property; native property projection unverified`);
    for (const [event, binding] of Object.entries(node.events)) note(binding, `bound to the ${event} event; no native signal projection`);
    for (const binding of node.cssVarBindings) note(binding.value, "bound to a CSS variable; native style-variable projection unverified");
    if (node.iteration) note(node.iteration.source, "drives node iteration; repeated native instances unlowered");
    node.children.forEach(visit);
  };
  visit(ir.dom!);
  return usage;
}

interface AnatomyWalk {
  drafts: SceneDraft[];
  /** Contract part name -> first generated host name. */
  hosted: Map<string, string>;
  /** Hosts that directly host a consumer content projection. */
  contentHosts: SceneDraft[];
  rootType: string;
  rootKind: HostKind;
  contentPart: string | undefined;
  omissions: string[];
}

function buildAnatomyPlan(ir: ComponentIR, dom: DomNodeIR): GodotAnatomyPlan {
  const walk = walkAnatomy(ir, dom);
  const styles = projectStyles(ir, walk);
  const accessibility = godotAccessibilityFacts(ir, new Set(["root", ...walk.drafts.map(draft => draft.part)]));
  const projected = new Set<string>();
  for (const rule of styles.rules) {
    for (const predicate of rule.predicates) {
      const axis = variantAxis(predicate);
      if (axis) projected.add(axis);
    }
  }
  const usages = propUsages(ir);
  const projectedProps = ir.styledProps.filter(prop => projected.has(prop.name)).map(prop => prop.name);
  const projectedNames = new Set(projectedProps);
  const excluded: string[] = [];
  const propOmissions: string[] = [];
  for (const prop of ir.styledProps) {
    if (projectedNames.has(prop.name)) continue;
    excluded.push(prop.name);
    propOmissions.push(`${prop.name}: ${propNonProjection(ir, prop, usages)}`);
  }
  const unprojectedAxes = [...projected].filter(axis => !ir.styledProps.some(prop => prop.name === axis));
  const axisOmissions = unprojectedAxes.map(axis => `${axis}: projected style predicate axis is not a declared prop`);
  const omissions = [
    ...walk.omissions,
    ...styles.omissions,
    ...contractOmissions(ir),
    ...partOmissions(ir, walk.hosted),
    ...propOmissions,
    ...axisOmissions,
  ];
  return {
    operation: "anatomy",
    rootType: walk.rootType,
    sceneNodes: walk.drafts.map(draft => ({
      name: draft.name,
      type: draft.type,
      parent: draft.parent,
      ...(draft.part ? { part: draft.part } : {}),
      ...(draft.text === undefined ? {} : { text: draft.text }),
    })),
    parts: ir.parts.filter(part => part.name !== "root" && walk.hosted.has(part.name)).map(part => part.name),
    ...(walk.contentPart ? { contentPart: walk.contentPart } : {}),
    styles: styles.rules,
    ...(styles.focusRings ? { focusRings: styles.focusRings } : {}),
    ...(Object.keys(accessibility).length ? { accessibility } : {}),
    projectedProps,
    excluded,
    omissions,
  };
}

function variantAxis(predicate: unknown): string | undefined {
  const candidate = predicate as { kind?: string; axis?: string } | undefined;
  return candidate?.kind === "variant" && typeof candidate.axis === "string" ? candidate.axis : undefined;
}

function propNonProjection(ir: ComponentIR, prop: ResolvedPropIR, usages: Map<string, string>): string {
  const usage = usages.get(prop.name);
  if (prop.propType.kind === "callback" || prop.type.includes("=>")) return "callback surface has no native signal projection";
  if (prop.type === "ReactNode" || prop.type === "node" || prop.propType.kind === "node") return "consumer node content is not projected natively";
  if (Object.prototype.hasOwnProperty.call(ir.variants, prop.name)) return "variant axis has no projected native style predicate";
  if (usage) return usage;
  if (prop.defaultExpr !== undefined) return "declared default is not projected into the generated scene";
  return "no executable native projection";
}

/** The plan's named non-claims for facts that live outside the dom tree. */
function contractOmissions(ir: ComponentIR): string[] {
  // Layout is a target approximation for every anatomy shape: the generated
  // part hosts are Godot containers, not a CSS flow/flex engine.
  const out: string[] = ["layout: generated part hosts are Godot containers; CSS flow geometry and authored child order are not parity-guaranteed"];
  if (ir.root.explicitRole || ir.root.implicitRole || ir.root.effectiveRole || (ir.root.labeling ?? []).length) {
    out.push("root accessibility role and labeling: native projection unverified");
  }
  const keyboard = ir.root.keyboard ?? [];
  if (keyboard.length > 0) out.push(`a11y.keyboard: ${keyboard.length} declared keyboard interaction(s) have no native mapping`);
  for (const obligation of ir.unresolvedA11yObligations ?? []) {
    out.push(`${obligation.part ?? "root"}: suppressed ${obligation.role} ${obligation.attr} obligation; native exposure unverified`);
  }
  if (ir.root.polymorphicTagProp) out.push(`root element: polymorphic tag prop ${ir.root.polymorphicTagProp.propName} has no native element projection`);
  for (const channel of ir.behavior.normalizedChannels) {
    out.push(`channel ${channel.name}: native ${channel.valueType ?? "value"} flow not lowered (${channel.valueProp}/${channel.changeHandlerProp})`);
  }
  if (ir.interaction) {
    for (const trigger of ir.interaction.triggers) {
      out.push(`interaction trigger ${trigger.part.name} (${trigger.operation}): native activation and refused-state behavior not lowered`);
    }
  }
  if (ir.formControl) out.push(`formControl ${ir.formControl.channel.name} (${ir.formControl.valueModel}): native input value and commit flow not lowered`);
  if (ir.compositeControl) out.push(`composite control (${ir.compositeControl.interactionModel}): native collection state and update flow not lowered`);
  if (ir.nativeTextChannels?.length) out.push(`native text channels (${ir.nativeTextChannels.join(", ")}): DOM readback not lowered`);
  if (ir.pagedSet) out.push(`paged set ${ir.pagedSet.channel}: native position request flow not lowered`);
  if (ir.dateGrid) out.push("date grid: native month derivation and date selection not lowered");
  if (ir.transfer) out.push("transfer: native partitioned list transfer behavior not lowered");
  if (ir.textOverflow) out.push("textOverflow: native line clamping and expansion not lowered");
  if (ir.keyframes.length > 0) out.push(`motion.keyframes: ${ir.keyframes.length} declared keyframe animation(s) not lowered`);
  for (const transition of ir.motion.transitions) out.push(`transition ${transition.name}: native animation not lowered`);
  if (ir.motion.countdown) out.push("motion.countdown: native countdown policy not lowered");
  for (const loop of ir.motion.loops) out.push(`motion.loop ${loop.name ?? "loop"}: native loop policy not lowered`);
  if (ir.motion.honorsReducedMotion || ir.motion.reducedMotion) out.push("reduced motion: native preference handling unverified");
  if (ir.messages.length > 0) out.push(`messages: ${ir.messages.length} translatable message(s) render as contract defaults; no native message catalog`);
  if (Object.keys(ir.rootClipping ?? {}).length > 0) out.push("root clipping: native clipping strategy unverified");
  for (const unresolved of ir.unresolvedTypeRefs ?? []) out.push(`type ${unresolved.ref}: unresolved type reference not projected`);
  return out;
}

/** Parts the contract declares that the emitted scene does not host. */
function partOmissions(ir: ComponentIR, hosted: Map<string, string>): string[] {
  const out: string[] = [];
  const compound = new Set(ir.compoundParts.map(part => part.name));
  for (const part of ir.parts) {
    if (part.name === "root") continue;
    if (hosted.has(part.name)) {
      if (part.details?.interactive || part.details?.focusable) {
        out.push(`part ${part.name}: declared interactive/focusable; native activation and focus unlowered`);
      }
      continue;
    }
    if (compound.has(part.name)) {
      out.push(`compound part ${part.name}: by-reference subcomponent region; no scene host emitted`);
    } else {
      out.push(`part ${part.name}: declared but has no dom host; consumer composes it`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// DOM walk
// ---------------------------------------------------------------------------

function walkAnatomy(ir: ComponentIR, dom: DomNodeIR): AnatomyWalk {
  const declared = new Map(ir.parts.map(part => [part.name, part]));
  const drafts: SceneDraft[] = [];
  const hosted = new Map<string, string>();
  const nameCounts = new Map<string, number>();
  const contentHosts: SceneDraft[] = [];
  const namedStack: SceneDraft[] = [];
  const omissions: string[] = [];
  const seen = new Set<string>();
  const consumedText = new Set<DomNodeIR>();
  const contentRegions: Array<{ host: SceneDraft | undefined; hostLabel: string }> = [];
  const slotRegions: Array<{ name: string; host: SceneDraft | undefined }> = [];

  const add = (text: string): void => {
    if (seen.has(text)) return;
    seen.add(text);
    omissions.push(text);
  };
  const hostLabel = (): string => namedStack.length ? namedStack[namedStack.length - 1]!.part : "root";

  const textOf = (node: DomNodeIR, host: string): string | undefined => {
    const content = node.content;
    if (!content) {
      // Flatten one anonymous text wrapper into its named ancestor (the
      // authored semantic element sometimes needs a span for styling).
      const anonymous = node.children.filter(child =>
        !child.part && child.tag !== "children" && child.tag !== "slot" && child.children.length === 0 && child.content);
      if (anonymous.length !== 1) {
        if (anonymous.length > 1) add(`${host}: multiple anonymous text regions are not projected`);
        return undefined;
      }
      const wrapper = anonymous[0]!;
      const inner = wrapper.content;
      consumedText.add(wrapper);
      if (!inner) return undefined;
      if (isContentTransform(inner)) {
        add(`${host}: content transform (${inner.transform}) not lowered`);
        return undefined;
      }
      if (inner.kind === "literal") return inner.value;
      if (inner.kind === "message") {
        const message = ir.messages.find(entry => entry.key === inner.key);
        if (message && message.params.length === 0) return message.defaultMessage;
        add(`${host}: message text (${inner.key}) with parameters not projected`);
        return undefined;
      }
      add(`${host}: content binding (${describeExpression(inner)}) not projected; host text is unbound`);
      return undefined;
    }
    if (isContentTransform(content)) {
      add(`${host}: content transform (${content.transform}) not lowered`);
      return undefined;
    }
    if (content.kind === "literal") return content.value;
    if (content.kind === "message") {
      const message = ir.messages.find(entry => entry.key === content.key);
      if (message && message.params.length === 0) return message.defaultMessage;
      add(`${host}: message text (${content.key}) with parameters not projected`);
      return undefined;
    }
    add(`${host}: content binding (${describeExpression(content)}) not projected; host text is unbound`);
    return undefined;
  };

  const collectNodeFacts = (node: DomNodeIR, host: string): void => {
    if (node.projectedCollection) {
      const collection = node.projectedCollection;
      add(`${host}: projected collection items ${collection.itemPart} with separator ${collection.separatorPart} from ${describeExpression(collection.separator)} not lowered`);
    }
    const attrs = Object.keys(node.attrs);
    if (attrs.length) add(`${host}: attributes (${attrs.join(", ")}) not projected natively`);
    const bindings = Object.keys(node.bindings);
    if (bindings.length) add(`${host}: attribute bindings (${bindings.join(", ")}) not projected natively`);
    const properties = Object.keys(node.propertyBindings);
    if (properties.length) add(`${host}: DOM property bindings (${properties.join(", ")}) not lowered`);
    const events = Object.keys(node.events);
    if (events.length) add(`${host}: event bindings (${events.join(", ")}) are not wired natively`);
    if (node.activation) add(`${host}: native activation not wired`);
    if (node.focusContainer || node.keyboardActions?.length || node.keyboardPanel || node.keyboardAnchor) {
      add(`${host}: keyboard and focus management not lowered`);
    }
    if (node.iteration) {
      add(`${host}: iteration (${node.iteration.kind}${node.iteration.sourceProp ? ` over ${node.iteration.sourceProp}` : ""}) emits a single host; repeated native instances not lowered`);
    }
    if (node.ifProp) add(`${host}: render guard (if ${node.ifNegated ? "!" : ""}${node.ifProp}) not lowered; host always emitted`);
    if (node.ifSlot) add(`${host}: named-slot guard (if slot:${node.ifSlot}) not lowered`);
    if (node.componentRef) add(`${host}: referenced ${node.componentRef} component instance is not composed; an empty part host is emitted`);
    if (node.cssVarBindings.length) {
      add(`${host}: CSS variable bindings (${node.cssVarBindings.map(binding => binding.varName).join(", ")}) not lowered`);
    }
    if (node.generatedIdSlug || node.idRefAttrs.length) add(`${host}: generated relationship id attributes not lowered`);
    if (node.nativeTextChannel) add(`${host}: native text channel (${node.nativeTextChannel}) not lowered`);
    if (node.nativeRadioChannel) add(`${host}: native radio channel (${node.nativeRadioChannel}) not lowered`);
    if (node.iconGlyph) add(`${host}: glyph binding not lowered`);
  };

  const visit = (node: DomNodeIR, isRoot: boolean): void => {
    if (!isRoot) {
      if (node.tag === "children") {
        if (node.children.length > 0) unsupported(ir, "a consumer-children insertion point owns nested structure");
        contentRegions.push({ host: namedStack.length ? namedStack[namedStack.length - 1]! : undefined, hostLabel: hostLabel() });
        return;
      }
      if (node.tag === "slot") {
        if (node.slotName) {
          slotRegions.push({ name: node.slotName, host: namedStack.length ? namedStack[namedStack.length - 1]! : undefined });
          add(`${hostLabel()}: named slot ${node.slotName} is folded into the part host; the slot contract is unlowered`);
        } else {
          contentRegions.push({ host: namedStack.length ? namedStack[namedStack.length - 1]! : undefined, hostLabel: hostLabel() });
        }
        if (node.children.length > 0) unsupported(ir, "a slot insertion point owns nested structure");
        return;
      }
      if (node.part) {
        const part = node.part;
        if (!declared.has(part)) unsupported(ir, `dom part ${part} is not declared in anatomy.parts`);
        if (part === "root") unsupported(ir, "dom part root appears below the component root");
        const occurrence = (nameCounts.get(part) ?? 0) + 1;
        nameCounts.set(part, occurrence);
        const name = occurrence === 1 ? part : `${part}_${occurrence}`;
        const parent = namedStack.length ? namedStack[namedStack.length - 1]!.path : ".";
        const draft: SceneDraft = {
          node, name, part, parent,
          path: parent === "." ? name : `${parent}/${name}`,
          kind: "panel",
          type: "PanelContainer",
          text: undefined,
        };
        drafts.push(draft);
        if (!hosted.has(part)) hosted.set(part, name);
        collectNodeFacts(node, part);
        draft.text = textOf(node, part);
        namedStack.push(draft);
        node.children.forEach(child => visit(child, false));
        namedStack.pop();
        return;
      }
      collectNodeFacts(node, hostLabel());
      textOf(node, hostLabel());
      node.children.forEach(child => visit(child, false));
      return;
    }
    // The component root is the generated node itself, not a scene node.
    collectNodeFacts(node, "root");
    const rootText = textOf(node, "root");
    if (rootText !== undefined) add("root: contract content text is not written to the generated root node");
    node.children.forEach(child => visit(child, false));
  };

  visit(dom, true);

  const contentRegionsAll = contentRegions;
  if (contentRegionsAll.length > 1) {
    unsupported(ir, `multiple consumer-content regions (${contentRegionsAll.length}) have no single host contract`);
  }
  const contentRegion = contentRegionsAll[0];
  if (contentRegion?.host) contentHosts.push(contentRegion.host);
  for (const slot of slotRegions) if (slot.host && !contentHosts.includes(slot.host)) contentHosts.push(slot.host);
  const contentPart = contentRegion ? (contentRegion.host ? contentRegion.host.part : "root") : undefined;

  const directChildren = new Map<string, number>();
  for (const draft of drafts) directChildren.set(draft.parent, (directChildren.get(draft.parent) ?? 0) + 1);
  for (const draft of drafts) {
    const contentBinding = draft.node.content && !isContentTransform(draft.node.content) ? draft.node.content : undefined;
    const textHost = draft.node.tag !== "input" && draft.node.tag !== "textarea" &&
      draft.node.tag !== "img" && draft.node.tag !== "button" && contentBinding !== undefined;
    if (draft.node.tag === "img") {
      draft.kind = "control";
      draft.type = "TextureRect";
    } else if (draft.node.tag === "input") {
      draft.kind = "control";
      draft.type = inputType(draft.node);
    } else if (draft.node.tag === "textarea") {
      draft.kind = "control";
      draft.type = "TextEdit";
    } else if (draft.node.tag === "button") {
      draft.kind = "control";
      draft.type = "Button";
    } else if (textHost) {
      draft.kind = "text";
      draft.type = "Label";
    } else if (contentHosts.includes(draft) || (directChildren.get(draft.path) ?? 0) > 1) {
      draft.kind = "stack";
      draft.type = "VBoxContainer";
    } else {
      draft.kind = "panel";
      draft.type = "PanelContainer";
    }
    if (draft.text !== undefined && !TEXT_CAPABLE_TYPES.has(draft.type)) {
      add(`${draft.part}: literal text is not projected; the ${draft.type} host renders no text`);
      draft.text = undefined;
    }
  }

  const root = rootType(dom);
  return {
    drafts,
    hosted,
    contentHosts,
    rootType: root.type,
    rootKind: root.kind,
    contentPart,
    omissions,
  };
}

function inputType(node: DomNodeIR): string {
  const type = node.attrs.type;
  if (type === "checkbox" || type === "radio") return "CheckBox";
  return "LineEdit";
}

function rootType(dom: DomNodeIR): { type: string; kind: HostKind } {
  const content = dom.content;
  if (dom.tag === "img") return { type: "TextureRect", kind: "control" };
  if (dom.tag === "input") return { type: inputType(dom), kind: "control" };
  if (dom.tag === "textarea") return { type: "TextEdit", kind: "control" };
  if (dom.tag === "button") return { type: "Button", kind: "control" };
  if (content && !isContentTransform(content) && dom.children.length === 0) return { type: "Label", kind: "text" };
  return { type: "VBoxContainer", kind: "root" };
}

// ---------------------------------------------------------------------------
// Style projection
// ---------------------------------------------------------------------------

interface StyleProjection {
  rules: GodotStyleRule[];
  focusRings?: AnatomyFocusRing[];
  omissions: string[];
}

/** A focus outline projected onto one part host. */
export interface AnatomyFocusRing {
  part: string;
  width: number;
  color: string;
  offset: number;
}

function focusRingFor(rule: { declarations: { property: string; value: string }[] }): { width: number; color: string; offset: number } | undefined {
  let width = 0;
  let color = "";
  let offset = 0;
  for (const declaration of rule.declarations) {
    const px = /^(-?\d+(?:\.\d+)?)px$/.exec(declaration.value.trim());
    if (declaration.property === "outline-width" && px) width = Math.round(Number(px[1]));
    else if (declaration.property === "outline-color" && /^#[0-9a-f]{3,8}$/i.test(declaration.value.trim())) color = declaration.value.trim();
    else if (declaration.property === "outline-offset" && px) offset = Math.round(Number(px[1]));
  }
  return width > 0 ? { width, color: color || "#ffffff", offset } : undefined;
}

function projectStyles(ir: ComponentIR, walk: AnatomyWalk): StyleProjection {
  const rules: GodotStyleRule[] = [];
  const focusRings: AnatomyFocusRing[] = [];
  const omissions: string[] = [];
  const kinds = new Map<string, HostKind>();
  for (const draft of walk.drafts) if (!kinds.has(draft.part)) kinds.set(draft.part, draft.kind);
  const axes = new Set<string>([
    ...Object.keys(ir.variants),
    ...ir.classRecipe.valueModifiers.map(modifier => modifier.propName),
    ...ir.classRecipe.booleanModifiers.map(modifier => modifier.propName),
  ]);
  for (const rule of ir.nativeStyleRules?.rules ?? []) {
    const hostKind = rule.part === "root" ? walk.rootKind : kinds.get(rule.part);
    if (hostKind === undefined) {
      omissions.push(`${rule.sourceKey}: selector targets part ${rule.part} with no generated host`);
      continue;
    }
    if (rule.pseudo) {
      omissions.push(`${rule.sourceKey}: pseudo-element selector not lowered`);
      continue;
    }
    const statePredicates = rule.predicates.filter(predicate => predicate.kind !== "variant");
    const unknownAxis = rule.predicates.some(predicate => predicate.kind === "variant" && !axes.has(predicate.axis));
    // A rule whose only state predicate is focus is the focus ring for that part:
    // project it as a focus outline instead of dropping it as conditional styling.
    if (statePredicates.length === 1 && statePredicates[0]!.kind === "focus" && !unknownAxis && !rule.pseudo) {
      const ring = focusRingFor(rule);
      if (ring) focusRings.push({ part: rule.part, ...ring });
      else omissions.push(`${rule.sourceKey}: focus selector carries no outline declarations`);
      continue;
    }
    if (statePredicates.length > 0 || unknownAxis) {
      omissions.push(`${rule.sourceKey}: state selector not lowered`);
      continue;
    }
    const declarations: GodotStyleDeclaration[] = [];
    for (const declaration of rule.declarations) {
      if (declaration.platforms && !declaration.platforms.includes("godot")) {
        omissions.push(`${rule.sourceKey}.${declaration.property}: platform ${declaration.platforms.join(",")} only`);
        continue;
      }
      if (declaration.property.includes(".")) {
        declarations.push({
          property: declaration.property,
          value: declaration.value,
          ...(declaration.token ? { token: declaration.token } : {}),
          ...(declaration.designSlot ? { designSlot: declaration.designSlot } : {}),
        });
        continue;
      }
      const capability = declarationCapability(declaration.property, hostKind);
      if (capability !== true) {
        omissions.push(`${rule.sourceKey}.${declaration.property}: ${capability}`);
        continue;
      }
      declarations.push({
        property: declaration.property,
        value: declaration.value,
        ...(declaration.token ? { token: declaration.token } : {}),
        ...(declaration.designSlot ? { designSlot: declaration.designSlot } : {}),
      });
    }
    if (declarations.length > 0) {
      rules.push({ source: rule.sourceKey, part: rule.part, predicates: rule.predicates, declarations });
    }
  }
  for (const rule of ir.nativeStyleRules?.unsupported ?? []) omissions.push(`${rule.sourceKey}: ${rule.reason}`);
  return { rules, ...(focusRings.length ? { focusRings } : {}), omissions };
}

/** Whether a claimed host kind can express one declaration natively. */
function declarationCapability(property: string, kind: HostKind): true | string {
  if (LAYOUT_PROPERTIES.has(property)) {
    if (property === "gap") return kind === "root" || kind === "stack" ? true : `host ${kind} has no stacked layout to space`;
    return true;
  }
  if (TEXT_PROPERTIES.has(property)) {
    return kind === "root" || kind === "text" || kind === "control" ? true : `host ${kind} renders no text`;
  }
  if (PADDING_PROPERTIES.has(property)) {
    return kind === "panel" ? true : `host ${kind} has no padded panel to inset its children`;
  }
  if (PAINT_PROPERTIES.has(property)) {
    return kind === "root" || kind === "panel" ? true : `host ${kind} paints no panel`;
  }
  return "no Godot anatomy style mapping";
}
