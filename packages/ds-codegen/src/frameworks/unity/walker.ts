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
import { isGuardedActionChrome } from "../native-emission-class.js";
import { resolveAnchoredSurfacePolicy } from "../../semantics.js";
import { disabledProp, findNode, hasChannel, triggerParts, unityLowering, type UnityLowering } from "./behaviors.js";
import { projectComponent, type ComponentProjection, type ContentHost } from "./uss.js";
import { unityGlyphPlan, type UnityGlyphPlan } from "./glyph-plan.js";

const quote = (s: string): string => JSON.stringify(s);
export const pascal = (s: string): string => s.replace(/(^|[-_])([a-z])/g, (_, _sep: string, c: string) => c.toUpperCase());
export const identifier = (s: string): string => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)) throw new Error(`UNITY_IDENTIFIER: ${s}`);
  return s;
};

/**
 * The native UI Toolkit button type, fully qualified. The generated action
 * root and the native trigger parts derive from it; once a `FullStackDS.Button`
 * element exists, an unqualified `Button` inside `namespace FullStackDS` would
 * resolve to the generated element instead, so every native reference names it
 * explicitly.
 */
const NATIVE_BUTTON = "UnityEngine.UIElements.Button";

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

type ElementType = string;

interface ElementPlan {
  /** C# accessor in the constructor; `this` for the class root. */
  ref: string;
  declaration: "self" | "property" | "private" | "local";
  type: ElementType;
  /** `name` and USS class (R2/R3); absent for anonymous nodes. */
  identity?: { name: string; className: string };
  /** Literal content (R5). */
  text?: string;
  /** R5b: declared string prop whose value this text leaf paints. */
  textBinding?: string;
  part?: string;
  children: ElementPlan[];
  /** The private composed-content host (R3), owned by its parent element. */
  insertion?: true;
  glyph?: true;
  refAttrs?: { prop: string; value: string }[];
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
  glyph?: UnityGlyphPlan;
}

const isInsertion = (node: DomNodeIR): boolean => node.tag === INSERTION_TAG || (node.tag === SLOT_TAG && !node.slotName);
const isNamedSlot = (node: DomNodeIR): boolean => node.tag === SLOT_TAG && !!node.slotName;

/**
 * Whether a prop with this name is emitted as a root API member (channel props,
 * carried variant axes, the placement knob). A rendered part whose accessor
 * would take the same identifier is suffixed instead of colliding.
 */
function isEmittedApiName(ctx: Context, name: string): boolean {
  if (ctx.lowering.behavior === "Progress" && (name === ctx.lowering.valueProp || (ctx.lowering.value !== undefined && name === ctx.lowering.value.presenceProp))) return true;
  if (hasChannel(ctx.lowering) && [ctx.lowering.channel.valueProp, ctx.lowering.channel.defaultValueProp, ctx.lowering.channel.changeHandlerProp].includes(name)) return true;
  const prop = ctx.ir.styledProps.find(candidate => candidate.name === name);
  if (!prop || !ctx.ir.variants[name]) return false;
  const option = ctx.lowering.behavior === "ItemGroup" ? ITEM_GROUP_OPTIONS[name] : undefined;
  const placement = ctx.lowering.behavior === "AnchoredSurface" ? ctx.ir.surface?.positioning?.placementProp : undefined;
  return !!option || name === placement || ctx.projection.carrierAxes.has(name);
}

/** R1/R2: the element type of a rendered node. */
function elementType(ctx: Context, node: DomNodeIR): ElementType {
  if (node.iconGlyph !== undefined) return "GlyphElement";
  if (node.componentRef !== undefined) return identifier(node.componentRef);
  if ((node.part && ctx.triggers.has(node.part)) || node.tag === BUTTON_TAG) return NATIVE_BUTTON;
  if (!node.children.length && TEXT_LEAF_TAGS.has(node.tag) && node.content !== undefined) return "Label";
  return "VisualElement";
}

/** R1: the base type of a compound sub-element class. */
function compoundBase(ctx: Context, part: PartIR, node: DomNodeIR | undefined): string {
  if (ctx.triggers.has(part.name) || (node?.tag ?? part.nativeTag) === BUTTON_TAG) return NATIVE_BUTTON;
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
  const progressGuard = ctx.lowering.behavior === "Progress" && ctx.lowering.value !== undefined &&
    node.part === ctx.lowering.value.part.name && node.ifProp === ctx.lowering.value.presenceProp && !node.ifNegated && !node.ifSlot;
  if ((node.ifProp || node.ifSlot) && !presenceGuard && !progressGuard) throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${where} declares a conditional guard (pending P4)`);
}

/**
 * R1: chrome a native action control does not realise — the guarded loading
 * decoration is a conditional componentRef (pending P4) — is omitted rather
 * than rendered from a fact the lowering does not carry; the support boundary
 * classifies those leaves refused.
 */
function isOmittedActionChrome(ctx: Context, node: DomNodeIR): boolean {
  const { lowering } = ctx;
  return lowering.behavior === "Action" && lowering.loading !== undefined &&
    node.ifProp === lowering.loading && node.componentRef !== undefined;
}

/** Whether a subtree contains an iteration node; a passive root cannot lower
 * iteration, so the topmost such subtree is omitted by fact. */
function containsIteration(node: DomNodeIR): boolean {
  return node.iteration !== undefined || node.children.some(containsIteration);
}

/**
 * R1/R2: a passive root cannot materialise chrome, composed instances,
 * iteration or content transforms. Five shapes are omitted by fact: a
 * decoration whose content is a dynamic node prop (IR `nodeKind:
 * "node-ref"`), a guarded action chrome — a native button or componentRef
 * element carrying an event binding — whose presence prop is a declared prop,
 * a decoration-role component instance, any subtree containing iteration, and
 * a node whose content is a content transform. The boundary refuses each
 * omitted subtree; selection is by prop kind, binding, part-role and content
 * facts, never by component or part name.
 */
function isOmittedPassiveDecoration(ir: ComponentIR, lowering: UnityLowering, node: DomNodeIR): boolean {
  if (lowering.behavior !== "Passive") return false;
  if (containsIteration(node)) return true;
  // A content transform (no binding discriminator) has no static projection.
  if (node.content !== undefined && !("kind" in node.content)) return true;
  const role = node.part === undefined ? undefined : ir.parts.find(part => part.name === node.part)?.details?.role;
  if (node.componentRef !== undefined && role === "decoration") return true;
  if (node.ifProp === undefined) return false;
  const prop = ir.styledProps.find(candidate => candidate.name === node.ifProp);
  if (!prop) return false;
  if (prop.nodeKind === "node-ref") {
    return node.content !== undefined && "kind" in node.content && node.content.kind === "prop" && node.content.prop === node.ifProp;
  }
  return isGuardedActionChrome(ir, node);
}

/** Whether a declared prop narrows to a string: an inline narrowed type or a
 * deferred reference to one. Only a string content binding has a text surface. */
function isStringProp(prop: ResolvedPropIR): boolean {
  return prop.propType.kind === "string" || (prop.propType.kind === "fallback" && prop.propType.raw === "string");
}

/** A decoration whose content is a dynamic node prop has no static
 * projection; every lowering omits it (the node-content prop stays pending). */
function isOmittedNodeContentDecoration(ir: ComponentIR, node: DomNodeIR): boolean {
  const content = node.content;
  if (content === undefined || !("kind" in content) || content.kind !== "prop") return false;
  const prop = ir.styledProps.find(candidate => candidate.name === content.prop);
  return prop?.nodeKind === "node-ref";
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
  // A disclosure's content part is owned by the attached behavior, so it is
  // rendered in the root class rather than composed as a sub-element class.
  const behaviorContent = ctx.lowering.behavior === "Disclosure" ? ctx.lowering.content.name : undefined;
  const isCompound = (node: DomNodeIR): boolean => !!node.part && ctx.compound.has(node.part) && node.part !== behaviorContent;
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
    if (isOmittedActionChrome(ctx, node)) continue;
    if (isOmittedNodeContentDecoration(ctx.ir, node)) continue;
    if (isOmittedPassiveDecoration(ctx.ir, ctx.lowering, node)) continue;
    if (isCompound(node)) {
      if (composedHost && index === firstCompound) insertionHost(ctx, cls, parent, holes);
      continue;
    }
    const composed = ctx.lowering.behavior === "ComposedAction"
      ? ctx.lowering.triggers.find(trigger => trigger.part.name === node.part)
      : undefined;
    if (composed !== undefined) {
      if (node.componentRef === undefined) throw new Error(`UNITY_UNSUPPORTED_REF: ${ctx.ir.name} composed trigger ${node.part} carries no component reference`);
      // The referenced component's own styling attributes are not composed; the
      // boundary refuses them. A11y/form bindings are DOM metadata, and only the
      // disabled binding is adapted onto the generated root's enabled state.
      if (Object.keys(node.propertyBindings).length) throw new Error(`UNITY_UNSUPPORTED_REF: ${ctx.ir.name} composed ${node.componentRef} carries DOM property bindings`);
      for (const event of Object.keys(node.events)) if (event !== "click") throw new Error(`UNITY_UNSUPPORTED_REF: ${ctx.ir.name} composed ${node.componentRef} carries event ${event}`);
      if (node.ifProp !== undefined && node.ifProp !== composed.guardProp) throw new Error(`UNITY_UNSUPPORTED_REF: ${ctx.ir.name} composed ${node.componentRef} declares an unowned guard`);
      const element: ElementPlan = { ref: identifier(pascal(node.part!)), declaration: "property", type: NATIVE_BUTTON, identity: identityFor(ctx, node.part!), part: node.part!, children: [] };
      parent.children.push(element);
      cls.members.push(element);
      walkChildren(ctx, cls, element, node.children.filter(child => !isOmittedNodeContentDecoration(ctx.ir, child)), holes);
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
    if (node.componentRef !== undefined &&
        (Object.keys(node.bindings).length || Object.keys(node.events).length || node.children.length ||
         Object.keys(node.propertyBindings).length || node.componentInstance?.attrs.some(attr => attr.kind !== "prop")))
      throw new Error(`UNITY_UNSUPPORTED_REF: ${ctx.ir.name} ${node.componentRef} carries unlowered bindings, events or children`);
    const text = literalContent(node);
    if (text !== undefined && type === "VisualElement") throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${ctx.ir.name} <${node.tag}> carries literal content but lowers to no text element`);
    // R5b: a text leaf bound to a declared string prop paints the generated
    // string attribute through its Label. The root class exposes the property;
    // the walker asserts the prop exists and is a string so no binding is
    // silently dropped. The passive lowering already omits such nodes.
    const contentBinding = node.content !== undefined && "kind" in node.content &&
      node.content.kind === "prop" && !node.content.path?.length ? node.content.prop : undefined;
    if (contentBinding !== undefined) {
      if (ctx.lowering.behavior === "Passive") throw new Error(`UNITY_UNSUPPORTED_PASSIVE_ANATOMY: ${ctx.ir.name} ${node.part ?? node.tag} has unlowered authored facts`);
      const contentProp = ctx.ir.styledProps.find(candidate => candidate.name === contentBinding);
      if (!contentProp || !isStringProp(contentProp)) throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${ctx.ir.name} <${node.tag}> content prop ${contentBinding} is not a declared string prop`);
      if (type !== "Label" || node.children.length) throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${ctx.ir.name} <${node.tag}> content prop ${contentBinding} does not lower to a text leaf`);
    }
    const element: ElementPlan = ctx.glyph?.node === node
      ? { ref: "glyphElement", declaration: "private", type: "GlyphElement", children: [], glyph: true }
      : node.part
      ? { ref: identifier(pascal(node.part)) + (!ctx.compound.has(node.part) && isEmittedApiName(ctx, node.part) ? "Control" : ""), declaration: "property", type, identity: identityFor(ctx, node.part), part: node.part, children: [] }
      : { ref: `node${++cls.locals}`, declaration: "local", type, children: [] };
    if (text !== undefined) element.text = text;
    if (contentBinding !== undefined) element.textBinding = contentBinding;
    if (node.componentRef !== undefined) {
      const instance = node.componentInstance;
      if (instance && (instance.ref !== node.componentRef || !instance.targetGlyph))
        throw new Error(`UNITY_UNSUPPORTED_REF: ${ctx.ir.name} ${node.componentRef} has no admitted glyph mount capability`);
      const attrs = instance?.attrs ?? Object.entries(node.attrs).map(([sourceAttr, value]) => ({ sourceAttr, targetProp: sourceAttr, value, kind: "prop" as const }));
      if (instance && attrs.some(attr => ![instance.targetGlyph!.namePropName, instance.targetGlyph!.sizePropName].includes(attr.targetProp)))
        throw new Error(`UNITY_UNSUPPORTED_REF: ${ctx.ir.name} ${node.componentRef} has a prop without a Unity glyph API`);
      element.refAttrs = attrs.map(attr => ({ prop: identifier(pascal(attr.targetProp ?? attr.sourceAttr)), value: attr.value }));
    }
    parent.children.push(element);
    if (element.declaration !== "local") cls.members.push(element);
    // A component instance owns its own anatomy; do not recurse into it.
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
    // A boolean form control whose form-control part IS the root is the button
    // element itself (ToggleSwitch); it derives the native button so the shared
    // BooleanControl binds native activation, and exposes Trigger = this.
    const rootControl = ctx.lowering.behavior === "BooleanControl" && ctx.lowering.control.name === ir.dom.part && ir.dom.tag === BUTTON_TAG;
    const root = newClass(name,
      ctx.lowering.behavior === "Action" || rootControl ? NATIVE_BUTTON : passiveText ? "TextElement" : "VisualElement",
      true, rootIdentity(ctx, ir.dom.part));
    // A native action control projects the consumer's children itself: the
    // contract's guarded loading chrome is omitted (pending P4) and a wrapper
    // that only holds the content region is flattened so the insertion point
    // is the control's own contentContainer.
    const action = ctx.lowering.behavior === "Action";
    const children = action
      ? ir.dom.children
          .filter(node => !isOmittedActionChrome(ctx, node))
          .flatMap(node => node.children.length === 1 && isInsertion(node.children[0]!) ? node.children : [node])
      : ir.dom.children;
    walkChildren(ctx, root, root.root, children, { count: 0 });
    classes.push(root);
  } else {
    // R9: parts-only contract. The part declaring the root role is the class
    // itself (the first root-only part when none declares it); every other
    // non-compound part is a direct child in declared order.
    const rootPart = ir.parts.find(p => p.details?.role === ROOT_ROLE) ?? ir.parts.find(p => p.isRootOnly);
    const root = newClass(name, "VisualElement", true, rootIdentity(ctx, rootPart?.name));
    for (const part of ir.parts) {
      if (part === rootPart || ctx.compound.has(part.name)) continue;
      const type: ElementType = ctx.triggers.has(part.name) || part.nativeTag === BUTTON_TAG ? NATIVE_BUTTON : "VisualElement";
      const element: ElementPlan = { ref: identifier(pascal(part.name)), declaration: "property", type, identity: identityFor(ctx, part.name), part: part.name, children: [] };
      root.root.children.push(element);
      root.members.push(element);
    }
    classes.push(root);
  }
  for (const part of ir.compoundParts) {
    if (ctx.lowering.behavior === "Disclosure" && part.name === ctx.lowering.content.name) continue;
    const node = findNode(ir.dom, part.name);
    const cls = newClass(identifier(`${name}${pascal(part.name)}`), compoundBase(ctx, part, node), false, identityFor(ctx, part.name), part);
    if (node) {
      assertRenderable(ctx, node);
      walkChildren(ctx, cls, cls.root, node.children, { count: 0 });
    }
    classes.push(cls);
  }
  // A string content property named like another member (a trigger part named
  // for the same word) keeps the contract name on the property and suffixes the
  // element accessor, so both remain addressable in C#.
  for (const cls of classes) {
    for (const member of cls.members) {
      if (!member.textBinding) continue;
      const propName = identifier(pascal(member.textBinding));
      for (const other of cls.members) if (other !== member && other.ref === propName) other.ref = identifier(`${other.ref}Control`);
    }
  }
  return classes;
}

const behaviorMember = { BooleanControl: "Control", ItemGroup: "Group", AnchoredSurface: "Surface", Disclosure: "Disclosure", Progress: "Progress" } as const;

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

/** C# forbids a member that shares its enclosing type's name; a colliding
 * generated member takes a `Value` suffix (`Status.StatusValue`). The
 * realization check in factory.ts reads the same rule. */
export function classMemberName(className: string, base: string): string {
  const name = identifier(pascal(base));
  return name === className ? `${name}Value` : name;
}

/** R6: a variant-axis prop validated against the axis values. The root
 * modifier class follows `ir.classRecipe.valueModifiers` (`<base>--<value>`,
 * as on the web) and is the single record of the current value (runtime
 * `Variants`); a vocabulary knob follows it. */
function variantProperty(ctx: Context, prop: ResolvedPropIR, values: string[], knob: string | undefined): string {
  const name = classMemberName(ctx.ir.name, prop.name);
  const modifier = ctx.ir.classRecipe.valueModifiers.find(m => m.propName === prop.name);
  if (!modifier) throw new Error(`UNITY_UNSUPPORTED_VARIANT: ${ctx.ir.name}.${prop.name} is a variant axis without a class-recipe value modifier`);
  const base = quote(ctx.ir.classRecipe.base);
  if (modifier.valuePrefix) {
    // A colliding axis is disambiguated by the class recipe's prefix
    // (`<base>--<prop>-<value>`); the prefixed runtime helpers key that spelling.
    const valuePrefix = quote(modifier.valuePrefix);
    const args = `${base}, ${valuePrefix}, ${values.map(quote).join(", ")}`;
    return `        [UxmlAttribute] public string ${name} { get => Variants.GetAxis(this, ${args}); set { Variants.SetAxis(this, ${base}, ${valuePrefix}, value, ${values.map(quote).join(", ")});${knob ? ` ${knob} = value;` : ""} } }`;
  }
  const args = `${base}, ${values.map(quote).join(", ")}`;
  return `        [UxmlAttribute] public string ${name} { get => Variants.Get(this, ${args}); set { Variants.Set(this, ${base}, value, ${values.map(quote).join(", ")});${knob ? ` ${knob} = value;` : ""} } }`;
}

/** A passive host has no channel or behavior to attach. Only variant axes
 * with an actual USS carrier become public attributes. Admission must classify
 * every omitted prop as pending/refused; a lowered prop must pass the
 * emitted-property realization check in the boundary. */
function passiveRootApi(ctx: Context): RootApi {
  const members: string[] = [];
  const defaults: string[] = [];
  const glyph = ctx.glyph;
  if (glyph) {
    const name = identifier(pascal(glyph.nameProp));
    members.push(`        [UxmlAttribute] public string ${name} { get => glyphElement.GlyphName; set => glyphElement.GlyphName = value; }`);
  }
  for (const prop of ctx.ir.styledProps) {
    const values = ctx.ir.variants[prop.name];
    if (!values || !ctx.projection.carrierAxes.has(prop.name)) continue;
    if (glyph?.sizeProp === prop.name) {
      const name = identifier(pascal(prop.name));
      const args = values.map(quote).join(", ");
      const px = values.map(value => `value == ${quote(value)} ? ${glyph.sizeHints[value]}`).join(" : ");
      members.push(`        [UxmlAttribute] public string ${name} { get => Variants.Get(this, ${quote(ctx.ir.classRecipe.base)}, ${args}); set { Variants.Set(this, ${quote(ctx.ir.classRecipe.base)}, value, ${args}); glyphElement.PixelSize = ${px} : 0; } }`);
    } else members.push(variantProperty(ctx, prop, values, undefined));
    const literal = defaultLiteral(ctx.ir, prop, values);
    if (literal !== undefined) defaults.push(`${identifier(pascal(prop.name))} = ${literal};`);
  }
  return { members, attach: ["Theme.AddStyleSheet(this);"], defaults };
}

function assertPassiveAnatomy(ir: ComponentIR, node: DomNodeIR | undefined, glyph?: UnityGlyphPlan, omitted?: (node: DomNodeIR) => boolean): void {
  if (!node || omitted?.(node)) return;
  // DOM-metadata bindings the passive lowering does not render: a11y
  // role/aria attributes on any node, `data-*` attributes on any node, and the
  // root's field-association attributes (htmlFor, form). The admission boundary
  // classifies their leaves.
  const unsupportedBindings = Object.entries(node.bindings).some(([attribute]) => {
    if (attribute === "role" || attribute.startsWith("aria-")) return false;
    if (/^data-[a-z][a-z0-9-]*$/.test(attribute)) return false;
    const rootMetadataBinding = node === ir.dom && (attribute === "htmlFor" || attribute === "form");
    return !rootMetadataBinding;
  });
  const glyphNode = glyph?.node === node;
  // Static attributes are DOM metadata (role/aria/type/spellcheck and similar)
  // the passive lowering does not render; the admission boundary classifies
  // every static-attribute leaf.
  const unhandled = unsupportedBindings || Object.keys(node.propertyBindings).length || Object.keys(node.events).length ||
    node.componentRef !== undefined || (node.iconGlyph !== undefined && !glyphNode) || node.activation !== undefined || node.focusContainer === true ||
    !!node.keyboardActions?.length || node.keyboardPanel === true || node.keyboardAnchor === true || !!node.cssVarBindings.length ||
    node.generatedIdSlug !== undefined || !!node.idRefAttrs.length || node.nativeTextChannel !== undefined || node.nativeRadioChannel !== undefined ||
    (node.content !== undefined && (node === ir.dom || (node.part !== undefined && ir.compoundParts.some(part => part.name === node.part)) ||
      !("kind" in node.content && node.content.kind === "literal")));
  if (unhandled) throw new Error(`UNITY_UNSUPPORTED_PASSIVE_ANATOMY: ${ir.name} ${node.part ?? node.tag} has unlowered authored facts`);
  for (const child of node.children) assertPassiveAnatomy(ir, child, glyph, omitted);
}

/**
 * R6–R8: an action root's API. The native control owns activation; the DOM
 * click binding becomes a generated callback property invoked from the native
 * `clicked` event, the bound disabled prop drives SetEnabled, and carrier-
 * backed variant axes reuse the class-recipe modifier projection.
 */
function actionRootApi(ctx: Context): RootApi {
  const { ir, lowering } = ctx;
  if (lowering.behavior !== "Action") throw new Error(`UNITY_UNREACHABLE: ${ir.name} is not an action lowering`);
  const members: string[] = [];
  const attach: string[] = ["Theme.AddStyleSheet(this);"];
  const defaults: string[] = [];
  const actionName = identifier(pascal(lowering.action));
  members.push(`        public Action ${actionName} { get; set; }`);
  attach.push(`clicked += () => ${actionName}?.Invoke();`);
  const disabled = disabledProp(ir);
  if (disabled !== undefined) {
    const name = identifier(pascal(disabled));
    members.push(`        [UxmlAttribute] public bool ${name} { get => !enabledSelf; set => SetEnabled(!value); }`);
  }
  for (const prop of ir.styledProps) {
    const values = ir.variants[prop.name];
    if (!values || !ctx.projection.carrierAxes.has(prop.name)) continue;
    members.push(variantProperty(ctx, prop, values, undefined));
    const literal = defaultLiteral(ir, prop, values);
    if (literal !== undefined) defaults.push(`${identifier(pascal(prop.name))} = ${literal};`);
  }
  return { members, attach, defaults };
}

/**
 * R6–R8 for the value-fill behavior: the numeric value is a generated float
 * attribute the runtime clamps and converts to the fill's native percentage
 * width; the presence-guarded label is shown/hidden from a generated boolean
 * attribute. Carrier-backed axes emit as modifier attributes, and nothing is
 * emitted for the callback/label props the boundary classifies pending.
 */
function progressRootApi(ctx: Context, classes: ClassPlan[]): RootApi {
  const { ir, lowering } = ctx;
  if (lowering.behavior !== "Progress") throw new Error(`UNITY_UNREACHABLE: ${ir.name} is not a progress lowering`);
  const root = classes[0]!;
  const members: string[] = [`        public ProgressControl ValueFill { get; }`];
  const attach: string[] = [];
  const defaults: string[] = [];
  const fill = root.members.find(m => m.part === lowering.fill.name);
  const value = lowering.value === undefined ? undefined : root.members.find(m => m.part === lowering.value!.part.name);
  if (!fill) throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${ir.name} renders its value fill ${lowering.fill.name} outside the root class`);
  if (lowering.value !== undefined && !value) throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${ir.name} renders its value label ${lowering.value.part.name} outside the root class`);
  attach.push(`ValueFill = ProgressControl.Attach(this, fill: ${fill.ref}, valueElement: ${value ? value.ref : "null"}, min: ${lowering.min}, max: ${lowering.max});`);
  members.push(`        [UxmlAttribute] public float Value { get => (float)ValueFill.Value; set => ValueFill.Value = value; }`);
  if (lowering.value !== undefined) {
    members.push(`        [UxmlAttribute] public bool ShowValue { get => ValueFill.ShowValue; set => ValueFill.ShowValue = value; }`);
  }
  for (const prop of ir.styledProps) {
    if (prop.name === lowering.valueProp || (lowering.value !== undefined && prop.name === lowering.value.presenceProp)) continue;
    const values = ir.variants[prop.name];
    if (!values || !ctx.projection.carrierAxes.has(prop.name)) continue;
    members.push(variantProperty(ctx, prop, values, undefined));
    const literal = defaultLiteral(ir, prop, values);
    if (literal !== undefined) defaults.push(`${identifier(pascal(prop.name))} = ${literal};`);
  }
  return { members, attach, defaults };
}

/**
 * R6–R8 for composed action chrome: each trigger's click forwards to a
 * generated Action property, a guarded trigger's presence follows a generated
 * boolean flag, a declared disabled prop drives the root's enabled state, and
 * carrier-backed axes emit as modifier attributes. The referenced component's
 * own visuals are not composed, so no target props are forwarded.
 */
function composedActionRootApi(ctx: Context, classes: ClassPlan[]): RootApi {
  const { ir, lowering } = ctx;
  if (lowering.behavior !== "ComposedAction") throw new Error(`UNITY_UNREACHABLE: ${ir.name} is not a composed action lowering`);
  const members: string[] = [];
  const attach: string[] = [];
  const defaults: string[] = [];
  const root = classes[0]!;
  const byPart = new Map(root.members.filter(member => member.part !== undefined).map(member => [member.part!, member]));
  for (const trigger of lowering.triggers) {
    const element = byPart.get(trigger.part.name);
    if (!element) throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${ir.name} renders its composed trigger ${trigger.part.name} outside the root class`);
    const callback = identifier(pascal(trigger.callbackProp));
    members.push(`        public Action ${callback} { get; set; }`);
    attach.push(`${element.ref}.clicked += () => ${callback}?.Invoke();`);
    if (trigger.guardProp !== undefined) {
      const guard = identifier(pascal(trigger.guardProp));
      members.push(`        [UxmlAttribute] public bool ${guard} { get => ${element.ref}.style.display.value == DisplayStyle.Flex; set { ${element.ref}.style.display = value ? DisplayStyle.Flex : DisplayStyle.None; } }`);
      attach.push(`${guard} = false;`);
    }
  }
  if (lowering.disabledProp !== undefined) {
    const disabled = identifier(pascal(lowering.disabledProp));
    members.push(`        [UxmlAttribute] public bool ${disabled} { get => !enabledSelf; set => SetEnabled(!value); }`);
  }
  for (const prop of ir.styledProps) {
    if (prop.name === lowering.disabledProp) continue;
    if (lowering.triggers.some(trigger => trigger.guardProp === prop.name || trigger.callbackProp === prop.name)) continue;
    const values = ir.variants[prop.name];
    if (!values || !ctx.projection.carrierAxes.has(prop.name)) continue;
    members.push(variantProperty(ctx, prop, values, undefined));
    const literal = defaultLiteral(ir, prop, values);
    if (literal !== undefined) defaults.push(`${identifier(pascal(prop.name))} = ${literal};`);
  }
  return { members, attach, defaults };
}

/** R6–R8: the root's behavior, channel API and props. */
function rootApi(ctx: Context, classes: ClassPlan[]): RootApi {
  const { ir, lowering } = ctx;
  if (lowering.behavior === "Action") return actionRootApi(ctx);
  if (lowering.behavior === "Passive") return passiveRootApi(ctx);
  if (lowering.behavior === "Progress") return progressRootApi(ctx, classes);
  if (lowering.behavior === "ComposedAction") return composedActionRootApi(ctx, classes);
  const { channel } = lowering;
  const behavior = behaviorMember[lowering.behavior];
  // The runtime control type and the member name differ for the disclosure
  // (the member keeps the behavior name; the class is DisclosureControl).
  const behaviorType = lowering.behavior === "Disclosure" ? "DisclosureControl" : lowering.behavior;
  const members: string[] = [`        public ${behaviorType} ${behavior} { get; }`];
  const attach: string[] = [];
  const defaults: string[] = [];
  const root = classes[0]!;
  const boolean = channel.valueType === "boolean";
  if (lowering.behavior === "BooleanControl") {
    // The form-control part is either a rendered child (Switch/Checkbox) or the
    // root itself (ToggleSwitch); the latter binds native activation on the
    // generated root and exposes Trigger = this.
    const control = root.members.find(m => m.part === lowering.control.name);
    if (lowering.control.name === ir.dom?.part) {
      if (ir.dom.tag !== BUTTON_TAG) throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${ir.name} root form-control part must be a button element`);
      members.push(`        public ${NATIVE_BUTTON} Trigger => this;`);
      attach.push(`${behavior} = BooleanControl.Attach(this, control: this, stateClass: ${quote(lowering.stateClass)}, labelHost: null);`);
    } else {
      if (!control) throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${ir.name} renders its form-control part ${lowering.control.name} outside the root class`);
      members.push(`        public ${control.type} Trigger => ${control.ref};`);
      // HTML label semantics: a `label` root activates the control it contains.
      attach.push(`${behavior} = BooleanControl.Attach(this, control: ${control.ref}, stateClass: ${quote(lowering.stateClass)}, labelHost: ${ir.dom?.tag === LABEL_TAG ? "this" : "null"});`);
    }
  } else if (lowering.behavior === "Disclosure") {
    const trigger = root.members.find(m => m.part === lowering.trigger.name);
    const content = root.members.find(m => m.part === lowering.content.name);
    if (!trigger || trigger.type !== NATIVE_BUTTON) throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${ir.name} renders its disclosure trigger ${lowering.trigger.name} as no native button`);
    if (!content) throw new Error(`UNITY_UNSUPPORTED_ANATOMY: ${ir.name} renders its disclosure content ${lowering.content.name} outside the root class`);
    members.push(`        public ${trigger.type} Trigger => ${trigger.ref};`);
    attach.push(`${behavior} = DisclosureControl.Attach(this, summary: ${trigger.ref}, content: ${content.ref}, stateClass: ${quote(lowering.stateClass)});`);
  } else if (lowering.behavior === "ItemGroup") {
    const { focus } = lowering;
    attach.push(`${behavior} = ItemGroup.Attach(this, triggerClass: ${quote(`${ctx.prefix}__${lowering.trigger.name}`)}, contentClass: ${quote(`${ctx.prefix}__${lowering.content.name}`)}, operation: ${quote(lowering.operation)}, stateClass: ${quote(lowering.stateClass)}, multiple: ${lowering.multiple}, focus: ${quote(focus.strategy)}, orientation: ${quote(focus.orientation)}, wrap: ${focus.wrap});`);
  } else {
    members.push(`        public ${NATIVE_BUTTON} Trigger => ${behavior}.Trigger;`, `        public VisualElement Content => ${behavior}.Content;`);
    // A declared placement default reaches the surface through the Placement
    // prop's default assignment below, not through Attach.
    const classes = `triggerClass: ${quote(`${ctx.prefix}__${lowering.trigger.name}`)}, contentClass: ${quote(`${ctx.prefix}__${lowering.content.name}`)}`;
    if (lowering.openOnHover) {
      attach.push(`${behavior} = AnchoredSurface.Attach(this, ${classes}, stateClass: null, openOnHover: true, openOnFocus: ${lowering.openOnFocus === true}, closeOnPointerLeave: ${lowering.closeOnPointerLeave === true}, contentFocusable: ${lowering.contentFocusable !== false});`);
    } else {
      attach.push(`${behavior} = AnchoredSurface.Attach(this, ${classes}, stateClass: ${quote(lowering.stateClass!)});`);
    }
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
  // R5b: a string prop bound to a rendered text leaf becomes a UxmlAttribute
  // that paints the label's text; the leaf keeps its part identity and styles.
  const textProps = new Map<string, ElementPlan>();
  for (const member of root.members) if (member.textBinding && !textProps.has(member.textBinding)) textProps.set(member.textBinding, member);
  for (const [propName, member] of textProps) {
    const name = identifier(pascal(propName));
    members.push(`        [UxmlAttribute] public string ${name} { get => ${member.ref}.text; set { ${member.ref}.text = value ?? ""; } }`);
    const prop = ir.styledProps.find(candidate => candidate.name === propName);
    const literal = prop === undefined ? undefined : defaultLiteral(ir, prop);
    if (literal !== undefined && typeof literal === "string") defaults.push(`${name} = ${literal};`);
  }
  const disabled = disabledProp(ir);
  const dismissal = lowering.behavior === "AnchoredSurface" ? ir.behavior.normalizedDismissalTriggers.filter(t => t.enabledByProp) : [];
  const declaredDismissal = lowering.behavior === "AnchoredSurface" ? resolveAnchoredSurfacePolicy(ir.surface!).publicDismissalProps.map(d => d.prop) : [];
  const placement = lowering.behavior === "AnchoredSurface" ? ir.surface?.positioning?.placementProp : undefined;
  const channelProps = new Set([channel.valueProp, channel.defaultValueProp, channel.changeHandlerProp]);
  const carriers = ctx.projection.carrierAxes;
  for (const prop of ir.styledProps) {
    if (channelProps.has(prop.name) || textProps.has(prop.name)) continue;
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
    for (const attr of child.refAttrs ?? []) out.push(`${child.ref}.${attr.prop} = ${quote(attr.value)};`);
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
  const channel = hasChannel(ctx.lowering) ? ctx.lowering.channel : undefined;
  const interfaces = cls.isRoot
    ? (channel?.valueType === "boolean" ? ", INotifyValueChanged<bool>" : "")
    : (keyedRole(ctx, cls.part).keyed ? `, ${KEYED_PART_INTERFACE}` : "");
  const members: string[] = [];
  if (cls.isRoot && channel) members.push(`        public const string ChannelName = ${quote(channel.name)};`, `        public const string ChangeHandler = ${quote(channel.changeHandlerProp)};`);
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
  const glyph = unityGlyphPlan(ir);
  if (lowering.behavior === "Passive") assertPassiveAnatomy(ir, ir.dom, glyph, node => isOmittedPassiveDecoration(ir, lowering, node));
  const ctx: Context = { ir, lowering, compound: new Map(ir.compoundParts.map(p => [p.name, p])), triggers: triggerParts(ir), prefix: ir.cssPrefix, projection: projectComponent(ir, lowering), hosts: [], glyph };
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
  return new Set([...body.matchAll(/public (?:new )?(?:bool|string|float|double|int|Action) (\w+) \{/g)].map(m => m[1]!));
}
