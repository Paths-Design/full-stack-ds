/**
 * Unity anatomy walker (brief rules R1–R11).
 *
 * Lowers `ir.dom` — or, for parts-only contracts, a tree synthesized from
 * `ir.parts` — into UI Toolkit C#: one `[UxmlElement]` class for the
 * component root and one per `ir.compoundParts` entry. Element types, part
 * identity, insertion points, optional channel API, props and any behavior the
 * constructor attaches all derive from IR facts. Nothing here branches on a
 * component, part, channel or class name; the only name table is the
 * item-group option vocabulary, applied only when the ItemGroup behavior was
 * selected by fact.
 */
import type { ComponentIR, DomNodeIR, PartIR, ResolvedPropIR } from "../../ir.js";
import { resolveAnchoredSurfacePolicy } from "../../semantics.js";
import { disabledProp, findNode, triggerParts, unityLowering, type UnityLowering } from "./behaviors.js";
import { projectComponent, type ComponentProjection, type ContentHost } from "./uss.js";

const quote = (s: string): string => JSON.stringify(s);
export const pascal = (s: string): string => s.replace(/(^|[-_])([a-z])/g, (_, _sep: string, c: string) => c.toUpperCase());
export const identifier = (s: string): string => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)) throw new Error(`UNITY_IDENTIFIER: ${s}`);
  return s;
};

/**
 * Item-group option vocabulary (R6). Source: support-boundary.json rules
 * `prop-item-group-options` and `prop-appearance` (both lowered). Applied
 * only when `unityLowering` selected ItemGroup; `knob` is the ItemGroup
 * property the prop drives (`appearance` is a class modifier only).
 */
export const ITEM_GROUP_OPTIONS: Readonly<Record<string, { kind: "string" | "boolean"; knob?: string }>> = {
  type: { kind: "string", knob: "SelectionType" },
  orientation: { kind: "string", knob: "Orientation" },
  activationMode: { kind: "string", knob: "ActivationMode" },
  appearance: { kind: "string" },
  collapsible: { kind: "boolean", knob: "Collapsible" },
  loop: { kind: "boolean", knob: "Loop" },
  unmountInactive: { kind: "boolean", knob: "UnmountInactive" },
};

/** Source: HTML element/attribute vocabulary as `DomNodeIR.tag` and
 * `DomNodeIR.bindings` carry it. Applies by tag/attribute, never by part. */
const INSERTION_TAG = "children";
const SLOT_TAG = "slot";
const BUTTON_TAG = "button";
const LABEL_TAG = "label";
const TEXT_LEAF_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", LABEL_TAG]);
/** Source: `ContractPartDetails.role` enum value naming the component root part. */
const ROOT_ROLE = "root";

type ElementType = "VisualElement" | "Button" | "Label";

interface ElementPlan {
  /** C# accessor in the constructor; `this` for the class root. */
  ref: string;
  declaration: "self" | "property" | "private" | "local";
  type: ElementType;
  /** `name` and USS class (R2/R3); absent for anonymous nodes. */
  identity?: { name: string; className: string };
  /** Literal content (R5). */
  text?: string;
  part?: string;
  children: ElementPlan[];
  /** The private composed-content host (R3), owned by its parent element. */
  insertion?: true;
}

interface ClassPlan {
  name: string;
  base: string;
  isRoot: boolean;
  part?: PartIR;
  root: ElementPlan;
  /** Accessor that becomes `contentContainer`; undefined keeps the default. */
  contentContainer?: string;
  /** Declared members, in document order (properties, fields). */
  members: ElementPlan[];
  locals: number;
}

interface Context {
  ir: ComponentIR;
  lowering: UnityLowering;
  compound: Map<string, PartIR>;
  triggers: Set<string>;
  prefix: string;
  /** USS projection facts the generated classes depend on (uss.ts). */
  projection: Pick<ComponentProjection, "carrierAxes" | "gapClasses">;
  /** Composed-content hosts planned so far (owner and host class names). */
  hosts: ContentHost[];
}

const isInsertion = (node: DomNodeIR): boolean => node.tag === INSERTION_TAG || (node.tag === SLOT_TAG && !node.slotName);
const isNamedSlot = (node: DomNodeIR): boolean => node.tag === SLOT_TAG && !!node.slotName;

/** R1/R2: the element type of a rendered node. */
function elementType(ctx: Context, node: DomNodeIR): ElementType {
  if (node.componentRef !== undefined) return "VisualElement";
  if ((node.part && ctx.triggers.has(node.part)) || node.tag === BUTTON_TAG) return "Button";
  if (!node.children.length && TEXT_LEAF_TAGS.has(node.tag) && node.content !== undefined) return "Label";
  return "VisualElement";
}

/** R1: the base type of a compound sub-element class. */
function compoundBase(ctx: Context, part: PartIR, node: DomNodeIR | undefined): string {
  if (ctx.triggers.has(part.name) || (node?.tag ?? part.nativeTag) === BUTTON_TAG) return "Button";
  const content = ctx.ir.surface?.content;
  if (content && content.part.name === part.name && content.interactive) return "ScrollView";
  return "VisualElement";
}

/** R5: guards and iteration are pending P4, except the presence guard the IR
 * synthesizes on the content part, which the selected behavior realises. */
function assertRenderable(ctx: Context, node: DomNodeIR): void {
  const where = `${ctx.ir.name}${node.part ? ` part ${node.part}` : ` <${node.tag || node.componentRef}>`}`;
  if (node.iteration) throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${where} declares iteration (pending P4)`);
  const interaction = ctx.ir.interaction;
  const presenceGuard = interaction && interaction.presence === "unmount" && node.part === interaction.content.name &&
    node.ifProp === interaction.channel.valueProp && !node.ifNegated && !node.ifSlot;
  if ((node.ifProp || node.ifSlot) && !presenceGuard) throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${where} declares a conditional guard (pending P4)`);
}

function literalContent(node: DomNodeIR): string | undefined {
  const content = node.content;
  return content && "kind" in content && content.kind === "literal" ? content.value : undefined;
}

function identityFor(ctx: Context, part: string): { name: string; className: string } {
  return { name: part, className: `${ctx.prefix}__${part}` };
}

/** R3: a private `children` host at the current position becomes the
 * class's contentContainer; a class has at most one insertion point. */
function insertionHost(ctx: Context, cls: ClassPlan, parent: ElementPlan, holes: { count: number }): void {
  if (++holes.count > 1) throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${ctx.ir.name} ${cls.name} declares more than one children insertion point`);
  const host: ElementPlan = { ref: INSERTION_TAG, declaration: "private", type: "VisualElement", identity: identityFor(ctx, INSERTION_TAG), children: [], insertion: true };
  if (parent.identity) ctx.hosts.push({ owner: parent.identity.className, host: host.identity!.className });
  parent.children.push(host);
  cls.members.push(host);
  cls.contentContainer = host.ref;
}

function walkChildren(ctx: Context, cls: ClassPlan, parent: ElementPlan, nodes: DomNodeIR[], holes: { count: number }): void {
  const isCompound = (node: DomNodeIR): boolean => !!node.part && ctx.compound.has(node.part);
  // R4: compound nodes are composed by the consumer. When a rendered sibling
  // follows the first of them, composed content keeps document order through
  // an insertion host at that position; otherwise the default contentContainer
  // (after every generated child) already preserves it.
  const rendered = (node: DomNodeIR): boolean => !isCompound(node) && !isInsertion(node);
  const firstCompound = nodes.findIndex(isCompound);
  const lastCompound = nodes.map(isCompound).lastIndexOf(true);
  // One composed position cannot keep compound parts on both sides of a
  // rendered sibling in document order.
  if (nodes.some((node, index) => rendered(node) && index > firstCompound && index < lastCompound)) {
    throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${ctx.ir.name} ${cls.name} interleaves compound parts around a rendered sibling (pending P4)`);
  }
  const composedHost = firstCompound >= 0 && nodes.slice(firstCompound + 1).some(rendered);
  for (const [index, node] of nodes.entries()) {
    if (isCompound(node)) {
      if (composedHost && index === firstCompound) insertionHost(ctx, cls, parent, holes);
      continue;
    }
    assertRenderable(ctx, node);
    if (isInsertion(node)) {
      if (nodes.length === 1) {
        if (++holes.count > 1) throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${ctx.ir.name} ${cls.name} declares more than one children insertion point`);
        if (parent.ref !== "this") cls.contentContainer = parent.ref;
        continue;
      }
      insertionHost(ctx, cls, parent, holes);
      continue;
    }
    if (isNamedSlot(node)) {
      const slot = node.slotName!;
      const host: ElementPlan = { ref: `${identifier(pascal(slot))}Slot`, declaration: "property", type: "VisualElement", identity: identityFor(ctx, node.part ?? slot), part: node.part, children: [] };
      parent.children.push(host);
      cls.members.push(host);
      continue;
    }
    const type = elementType(ctx, node);
    const text = literalContent(node);
    if (text !== undefined && type === "VisualElement") throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${ctx.ir.name} <${node.tag}> carries literal content but lowers to no text element`);
    const element: ElementPlan = node.part
      ? { ref: identifier(pascal(node.part)), declaration: "property", type, identity: identityFor(ctx, node.part), part: node.part, children: [] }
      : { ref: `node${++cls.locals}`, declaration: "local", type, children: [] };
    if (text !== undefined) element.text = text;
    parent.children.push(element);
    if (element.declaration !== "local") cls.members.push(element);
    // componentRef nodes are identity-only placeholders (R5); iconGlyph and
    // cssVarBindings stay pending P4 and contribute no members.
    if (node.componentRef === undefined) walkChildren(ctx, cls, element, node.children, holes);
  }
}

function newClass(name: string, base: string, isRoot: boolean, identity: ElementPlan["identity"], part?: PartIR): ClassPlan {
  return { name, base, isRoot, part, root: { ref: "this", declaration: "self", type: "VisualElement", identity, children: [] }, members: [], locals: 0 };
}

function rootIdentity(ctx: Context, part: string | undefined): { name: string; className: string } {
  return part ? { name: part, className: ctx.prefix } : { name: "", className: ctx.prefix };
}

/** R1–R4, R9: the class plans for one component. */
function planClasses(ctx: Context): ClassPlan[] {
  const { ir } = ctx;
  const name = identifier(ir.name);
  const classes: ClassPlan[] = [];
  if (ir.dom) {
    assertRenderable(ctx, ir.dom);
    // A passive text host paints consumer string content itself; a generic
    // VisualElement has no text surface. Child elements remain composable.
    const passiveText = ctx.lowering.behavior === "Passive" && TEXT_LEAF_TAGS.has(ir.dom.tag) &&
      ir.dom.children.length === 1 && isInsertion(ir.dom.children[0]!);
    const root = newClass(name, passiveText ? "TextElement" : "VisualElement", true, rootIdentity(ctx, ir.dom.part));
    walkChildren(ctx, root, root.root, ir.dom.children, { count: 0 });
    classes.push(root);
  } else {
    // R9: parts-only contract. The part declaring the root role is the class
    // itself (the first root-only part when none declares it); every other
    // non-compound part is a direct child in declared order.
    const rootPart = ir.parts.find(p => p.details?.role === ROOT_ROLE) ?? ir.parts.find(p => p.isRootOnly);
    const root = newClass(name, "VisualElement", true, rootIdentity(ctx, rootPart?.name));
    for (const part of ir.parts) {
      if (part === rootPart || ctx.compound.has(part.name)) continue;
      const type: ElementType = ctx.triggers.has(part.name) || part.nativeTag === BUTTON_TAG ? "Button" : "VisualElement";
      const element: ElementPlan = { ref: identifier(pascal(part.name)), declaration: "property", type, identity: identityFor(ctx, part.name), part: part.name, children: [] };
      root.root.children.push(element);
      root.members.push(element);
    }
    classes.push(root);
  }
  for (const part of ir.compoundParts) {
    const node = findNode(ir.dom, part.name);
    const cls = newClass(identifier(`${name}${pascal(part.name)}`), compoundBase(ctx, part, node), false, identityFor(ctx, part.name), part);
    if (node) {
      assertRenderable(ctx, node);
      walkChildren(ctx, cls, cls.root, node.children, { count: 0 });
    }
    classes.push(cls);
  }
  return classes;
}

const behaviorMember = { BooleanControl: "Control", ItemGroup: "Group", AnchoredSurface: "Surface" } as const;

interface RootApi {
  members: string[];
  attach: string[];
  defaults: string[];
}

function defaultLiteral(ir: ComponentIR, prop: ResolvedPropIR, values?: string[]): string | undefined {
  if (prop.defaultExpr === undefined) return undefined;
  const value: unknown = JSON.parse(prop.defaultExpr);
  if (values && (typeof value !== "string" || !values.includes(value))) throw new Error(`UNITY_UNSUPPORTED_DEFAULT: ${ir.name}.${prop.name} default ${prop.defaultExpr} is not one of ${values.join(", ")}`);
  return typeof value === "string" ? quote(value) : String(value);
}

/** R6: a variant-axis prop validated against the axis values. The root
 * modifier class follows `ir.classRecipe.valueModifiers` (`<base>--<value>`,
 * as on the web) and is the single record of the current value (runtime
 * `Variants`); a vocabulary knob follows it. */
function variantProperty(ctx: Context, prop: ResolvedPropIR, values: string[], knob: string | undefined): string {
  const name = identifier(pascal(prop.name));
  const modifier = ctx.ir.classRecipe.valueModifiers.find(m => m.propName === prop.name);
  if (!modifier) throw new Error(`UNITY_UNSUPPORTED_VARIANT: ${ctx.ir.name}.${prop.name} is a variant axis without a class-recipe value modifier`);
  // A colliding axis is disambiguated as `<base>--<prop>-<value>`; the runtime
  // helper keys classes as `<prefix>--<value>` and cannot express it.
  if (modifier.valuePrefix) throw new Error(`UNITY_UNSUPPORTED_VARIANT: ${ctx.ir.name}.${prop.name} shares values with another axis (class-recipe prefix ${JSON.stringify(modifier.valuePrefix)}), which Variants does not key`);
  const args = `${quote(ctx.ir.classRecipe.base)}, ${values.map(quote).join(", ")}`;
  return `        [UxmlAttribute] public string ${name} { get => Variants.Get(this, ${args}); set { Variants.Set(this, ${quote(ctx.ir.classRecipe.base)}, value, ${values.map(quote).join(", ")});${knob ? ` ${knob} = value;` : ""} } }`;
}

/** A passive host has no channel or behavior to attach. Only variant axes
 * with an actual USS carrier become public attributes; the boundary judges
 * any other authored prop before a component is admitted. */
function passiveRootApi(ctx: Context): RootApi {
  const members: string[] = [];
  const defaults: string[] = [];
  const consumed = new Set<string>();
  for (const prop of ctx.ir.styledProps) {
    const values = ctx.ir.variants[prop.name];
    if (!values || !ctx.projection.carrierAxes.has(prop.name)) continue;
    consumed.add(prop.name);
    members.push(variantProperty(ctx, prop, values, undefined));
    const literal = defaultLiteral(ctx.ir, prop, values);
    if (literal !== undefined) defaults.push(`${identifier(pascal(prop.name))} = ${literal};`);
  }
  const unhandled = ctx.ir.styledProps.filter(prop => !consumed.has(prop.name));
  if (unhandled.length) throw new Error(`UNITY_UNSUPPORTED_PASSIVE_PROP: ${ctx.ir.name} does not realise ${unhandled.map(prop => prop.name).join(", ")}`);
  return { members, attach: [], defaults };
}

function assertPassiveAnatomy(ir: ComponentIR, node: DomNodeIR | undefined): void {
  if (!node) return;
  const unhandled = Object.keys(node.bindings).length || Object.keys(node.propertyBindings).length || Object.keys(node.events).length || Object.keys(node.attrs).length ||
    node.componentRef !== undefined || node.iconGlyph !== undefined || node.activation !== undefined || node.focusContainer === true ||
    !!node.keyboardActions?.length || node.keyboardPanel === true || node.keyboardAnchor === true || !!node.cssVarBindings.length ||
    node.generatedIdSlug !== undefined || !!node.idRefAttrs.length || node.nativeTextChannel !== undefined || node.nativeRadioChannel !== undefined ||
    (node.content !== undefined && (node === ir.dom || (node.part !== undefined && ir.compoundParts.some(part => part.name === node.part)) ||
      !("kind" in node.content && node.content.kind === "literal")));
  if (unhandled) throw new Error(`UNITY_UNSUPPORTED_PASSIVE_ANATOMY: ${ir.name} ${node.part ?? node.tag} has unlowered authored facts`);
  for (const child of node.children) assertPassiveAnatomy(ir, child);
}

/** R6–R8: the root's behavior, channel API and props. */
function rootApi(ctx: Context, classes: ClassPlan[]): RootApi {
  const { ir, lowering } = ctx;
  if (lowering.behavior === "Passive") return passiveRootApi(ctx);
  const { channel } = lowering;
  const behavior = behaviorMember[lowering.behavior];
  const members: string[] = [`        public ${lowering.behavior} ${behavior} { get; }`];
  const attach: string[] = [];
  const defaults: string[] = [];
  const root = classes[0]!;
  const boolean = channel.valueType === "boolean";
  if (lowering.behavior === "BooleanControl") {
    const control = root.members.find(m => m.part === lowering.control.name);
    if (!control) throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${ir.name} renders its form-control part ${lowering.control.name} outside the root class`);
    members.push(`        public ${control.type} Trigger => ${control.ref};`);
    // HTML label semantics: a `label` root activates the control it contains.
    attach.push(`${behavior} = BooleanControl.Attach(this, control: ${control.ref}, stateClass: ${quote(lowering.stateClass)}, labelHost: ${ir.dom?.tag === LABEL_TAG ? "this" : "null"});`);
  } else if (lowering.behavior === "ItemGroup") {
    const { focus } = lowering;
    attach.push(`${behavior} = ItemGroup.Attach(this, triggerClass: ${quote(`${ctx.prefix}__${lowering.trigger.name}`)}, contentClass: ${quote(`${ctx.prefix}__${lowering.content.name}`)}, operation: ${quote(lowering.operation)}, stateClass: ${quote(lowering.stateClass)}, multiple: ${lowering.multiple}, focus: ${quote(focus.strategy)}, orientation: ${quote(focus.orientation)}, wrap: ${focus.wrap});`);
  } else {
    members.push(`        public Button Trigger => ${behavior}.Trigger;`, `        public VisualElement Content => ${behavior}.Content;`);
    // A declared placement default reaches the surface through the Placement
    // prop's default assignment below, not through Attach.
    attach.push(`${behavior} = AnchoredSurface.Attach(this, triggerClass: ${quote(`${ctx.prefix}__${lowering.trigger.name}`)}, contentClass: ${quote(`${ctx.prefix}__${lowering.content.name}`)}, stateClass: ${quote(lowering.stateClass)});`);
  }
  const valueProp = identifier(pascal(channel.valueProp));
  if (boolean) {
    members.push(
      `        [UxmlAttribute] public bool ${valueProp} { get => ${behavior}.Value; set => ${behavior}.Value = value; }`,
      `        public bool value { get => ${behavior}.Value; set => ${behavior}.Value = value; }`,
      `        public bool Controlled { get => ${behavior}.Controlled; set => ${behavior}.Controlled = value; }`,
      `        public event Action<bool> ValueRequested { add => ${behavior}.ValueRequested += value; remove => ${behavior}.ValueRequested -= value; }`,
      `        public void SetValueWithoutNotify(bool next) => ${behavior}.SetValueWithoutNotify(next);`,
      `        public void RequestValue(bool next) => ${behavior}.RequestValue(next);`,
    );
  } else {
    members.push(
      `        [UxmlAttribute] public string ${valueProp} { get => ${behavior}.Value; set => ${behavior}.Value = value; }`,
      `        public string[] Values { get => ${behavior}.Values; set => ${behavior}.Values = value; }`,
      `        public bool Controlled { get => ${behavior}.Controlled; set => ${behavior}.Controlled = value; }`,
      `        public event Action<string[]> ValueRequested { add => ${behavior}.ValueRequested += value; remove => ${behavior}.ValueRequested -= value; }`,
      `        public event Action<string[]> ValueChanged { add => ${behavior}.ValueChanged += value; remove => ${behavior}.ValueChanged -= value; }`,
    );
  }
  const disabled = disabledProp(ir);
  const dismissal = lowering.behavior === "AnchoredSurface" ? ir.behavior.normalizedDismissalTriggers.filter(t => t.enabledByProp) : [];
  const declaredDismissal = lowering.behavior === "AnchoredSurface" ? resolveAnchoredSurfacePolicy(ir.surface!).publicDismissalProps.map(d => d.prop) : [];
  const placement = lowering.behavior === "AnchoredSurface" ? ir.surface?.positioning?.placementProp : undefined;
  const channelProps = new Set([channel.valueProp, channel.defaultValueProp, channel.changeHandlerProp]);
  const carriers = ctx.projection.carrierAxes;
  for (const prop of ir.styledProps) {
    if (channelProps.has(prop.name)) continue;
    const name = identifier(pascal(prop.name));
    if (prop.name === disabled) {
      members.push(`        [UxmlAttribute] public bool ${name} { get => !enabledSelf; set => SetEnabled(!value); }`);
      continue;
    }
    const trigger = dismissal.find(t => t.enabledByProp === prop.name);
    if (trigger) {
      const knob = `${behavior}.CloseOn${pascal(trigger.event)}`;
      members.push(`        [UxmlAttribute] public bool ${name} { get => ${knob}; set => ${knob} = value; }`);
      defaults.push(`${name} = ${trigger.defaultEnabled && declaredDismissal.includes(prop.name)};`);
      continue;
    }
    const values = ir.variants[prop.name];
    const option = lowering.behavior === "ItemGroup" ? ITEM_GROUP_OPTIONS[prop.name] : undefined;
    if (option?.kind === "boolean") {
      const knob = `${behavior}.${option.knob}`;
      members.push(`        [UxmlAttribute] public bool ${name} { get => ${knob}; set => ${knob} = value; }`);
      const literal = defaultLiteral(ir, prop);
      if (literal !== undefined) defaults.push(`${name} = ${literal};`);
      continue;
    }
    const knob = option ? (option.knob ? `${behavior}.${option.knob}` : undefined) : prop.name === placement ? `${behavior}.Placement` : undefined;
    // A variant axis emits when the attached behavior consumes it (the
    // item-group vocabulary, the surface placement prop) or when the USS
    // projection emits a `<prefix>--<value>` carrier for it (S6); an axis with
    // neither would be an attribute that changes nothing.
    if (values && (option || prop.name === placement || carriers.has(prop.name))) {
      members.push(variantProperty(ctx, prop, values, knob));
      const literal = defaultLiteral(ir, prop, values);
      if (literal !== undefined) defaults.push(`${name} = ${literal};`);
    } else if (knob) {
      members.push(`        [UxmlAttribute] public string ${name} { get => ${knob}; set => ${knob} = value; }`);
      const literal = defaultLiteral(ir, prop);
      if (literal !== undefined) defaults.push(`${name} = ${literal};`);
    }
  }
  return { members, attach, defaults };
}

/** R4: interaction trigger parts carry a per-part Disabled; the pairing key
 * (the web `value` prop) exists only where a behavior pairs parts by it — the
 * ItemGroup trigger and content parts. */
function keyedRole(ctx: Context, part: PartIR | undefined): { keyed: boolean; trigger: boolean } {
  const { lowering } = ctx;
  const trigger = !!part && !!ctx.ir.interaction?.triggers.some(t => t.part.name === part.name);
  const keyed = !!part && lowering.behavior === "ItemGroup" && (part.name === lowering.trigger.name || part.name === lowering.content.name);
  return { keyed, trigger };
}

function compoundApi(ctx: Context, cls: ClassPlan): string[] {
  const role = keyedRole(ctx, cls.part);
  const members: string[] = [];
  if (role.keyed) members.push("        [UxmlAttribute] public string Value { get; set; }");
  if (role.trigger) members.push("        [UxmlAttribute] public bool Disabled { get => !enabledSelf; set => SetEnabled(!value); }");
  return members;
}

/** Runtime interface every keyed compound part implements (see R4). */
const KEYED_PART_INTERFACE = "IKeyedPart";

function declaration(element: ElementPlan): string {
  return element.declaration === "private"
    ? `        private readonly ${element.type} ${element.ref} = new ${element.type}();`
    : `        public ${element.type} ${element.ref} { get; } = new ${element.type}();`;
}

/** Every element under `parent`, depth-first, paired with its parent. */
function descendants(parent: ElementPlan): [ElementPlan, ElementPlan][] {
  return parent.children.flatMap(child => [[child, parent] as [ElementPlan, ElementPlan], ...descendants(child)]);
}

function constructorTree(parent: ElementPlan, out: string[]): void {
  for (const child of parent.children) {
    if (child.declaration === "local") out.push(`var ${child.ref} = new ${child.type}();`);
    if (child.identity) out.push(`${child.ref}.name = ${quote(child.identity.name)};`, `${child.ref}.AddToClassList(${quote(child.identity.className)});`);
    if (child.text !== undefined) out.push(`${child.ref}.text = ${quote(child.text)};`);
    // Generated anatomy belongs to the element's own hierarchy, never to its
    // contentContainer (which is reserved for consumer-composed content).
    const add = parent.ref === "this" ? "hierarchy.Add" : `${parent.ref}.Add`;
    out.push(`${add}(${child.ref});`);
    constructorTree(child, out);
  }
}

function assertUniqueMembers(ctx: Context, cls: ClassPlan, members: string[]): void {
  // Each entry is one member; its name is the first identifier on its first
  // line followed by a body, initializer, parameter list or the line end.
  const names = members.map(m => m.split("\n")[0]!.match(/(\w+)\s*(?:\{|=>|=|\(|;|$)/)?.[1]).filter((n): n is string => !!n);
  const seen = new Set<string>([cls.name]);
  for (const name of names) {
    if (seen.has(name)) throw new Error(`UNITY_IDENTIFIER_COLLISION: ${ctx.ir.name} ${cls.name} declares ${name} twice (or as its own class name)`);
    seen.add(name);
  }
}

function emitClass(ctx: Context, cls: ClassPlan, api: RootApi | undefined): string {
  const interfaces = cls.isRoot
    ? (ctx.lowering.behavior !== "Passive" && ctx.lowering.channel.valueType === "boolean" ? ", INotifyValueChanged<bool>" : "")
    : (keyedRole(ctx, cls.part).keyed ? `, ${KEYED_PART_INTERFACE}` : "");
  const members: string[] = [];
  if (cls.isRoot && ctx.lowering.behavior !== "Passive") members.push(`        public const string ChannelName = ${quote(ctx.lowering.channel.name)};`, `        public const string ChangeHandler = ${quote(ctx.lowering.channel.changeHandlerProp)};`);
  // Public part properties (document order) precede the private insertion host.
  members.push(...cls.members.filter(m => m.declaration === "property").map(declaration), ...cls.members.filter(m => m.declaration === "private").map(declaration));
  if (cls.contentContainer) members.push(`        public override VisualElement contentContainer => ${cls.contentContainer};`);
  members.push(...(api ? api.members : compoundApi(ctx, cls)));
  assertUniqueMembers(ctx, cls, members);
  const body: string[] = [];
  if (cls.root.identity?.name) body.push(`name = ${quote(cls.root.identity.name)};`);
  if (cls.root.identity) body.push(`AddToClassList(${quote(cls.root.identity.className)});`);
  constructorTree(cls.root, body);
  // USS has no `gap`: the projection lowers it to --fsds-gap and the runtime
  // Gap helper spaces the children of every element carrying that fact, and
  // of a composed-content host whose owner carries it (the host restates the
  // owner's container facts, A4).
  const gapped = (element: ElementPlan | undefined): boolean => !!element?.identity && ctx.projection.gapClasses.has(element.identity.className);
  if (gapped(cls.root)) body.push(`Gap.Attach(${cls.root.ref});`);
  for (const [element, parent] of descendants(cls.root)) {
    if (gapped(element) || (element.insertion && gapped(parent))) body.push(`Gap.Attach(${element.ref});`);
  }
  if (api) body.push(...api.attach, ...api.defaults);
  return [
    "    [UxmlElement]",
    `    public partial class ${cls.name} : ${cls.base}${interfaces}`,
    "    {",
    ...members,
    `        public ${cls.name}()`,
    "        {",
    ...body.map(line => `            ${line}`),
    "        }",
    "    }",
  ].join("\n");
}

export interface UnityComponentSource {
  lowering: UnityLowering;
  /** Generated class names, root first. */
  classes: string[];
  /** Composed-content hosts the classes create (the USS projection restates their owners' container facts). */
  hosts: ContentHost[];
  source: string;
}

/** The generated C# for one component: root class plus one class per compound part. */
export function walkComponent(ir: ComponentIR): UnityComponentSource {
  const lowering = unityLowering(ir);
  if (lowering.behavior === "Passive") assertPassiveAnatomy(ir, ir.dom);
  const ctx: Context = { ir, lowering, compound: new Map(ir.compoundParts.map(p => [p.name, p])), triggers: triggerParts(ir), prefix: ir.cssPrefix, projection: projectComponent(ir, lowering), hosts: [] };
  const classes = planClasses(ctx);
  const api = rootApi(ctx, classes);
  const blocks = classes.map((cls, index) => emitClass(ctx, cls, index === 0 ? api : undefined));
  const source = `// Generated from ComponentIR. Regenerate with pnpm run generate:unity.\nusing System;\nusing UnityEngine.UIElements;\n\nnamespace FullStackDS\n{\n${blocks.join("\n\n")}\n}\n`;
  return { lowering, classes: classes.map(c => c.name), hosts: ctx.hosts, source };
}

/** Public members (`public [new] bool|string X {`) the ROOT class declares;
 * the realisation check reads these, not compound sub-element members. */
export function rootPublicMembers(source: string, rootClass: string): Set<string> {
  const start = source.indexOf(`public partial class ${rootClass} :`);
  if (start < 0) return new Set();
  const next = source.indexOf("[UxmlElement]", start);
  const body = source.slice(start, next < 0 ? undefined : next);
  return new Set([...body.matchAll(/public (?:new )?(?:bool|string) (\w+) \{/g)].map(m => m[1]!));
}
