/**
 * Framework-neutral emission-class substrate for the native targets
 * (SwiftUI, Jetpack Compose).
 *
 * An *emission class* is a structural fact about a component's IR — "this
 * component IS a projected-children action," "this component IS a static
 * content chrome box" — not a fact about any framework. Which classes a
 * target *realizes*, and in what order it prefers them, is target
 * capability; what the component IS is not. Predicates that are identical
 * across targets live here exactly once (precedent: swift's emitter
 * exported `isProjectedChildrenAction` for the jetpack action path with
 * "the IR owns this fact"; this module is that fact's durable home).
 *
 * Predicates that genuinely differ between targets (the jetpack
 * prop-text/expandable gates are broader than swift's) stay in their
 * emitters — a divergence there is capability information, and unifying it
 * would silently change one target's admitted set. What this module
 * guarantees is that every predicate the targets share word-for-word is
 * written once, and that the divergent ones compose from the same atoms
 * (`countChildrenLeaves`, `hasEssentialComponentInstance`) so drift is
 * visible at the dispatch site.
 *
 * Contract: pure functions over `ComponentIR`. No emitter imports a
 * component NAME from here — a class predicate that special-cases a name
 * is a missing IR fact (see AGENTS.md layer authority).
 */
import type {
  BindingExpression,
  ComponentIR,
  DomNodeIR,
  NormalizedChannelIR,
} from "../ir.js";

/**
 * The projected-children action class: a native action affordance whose
 * entire content is the consumer's projected children.
 *
 * The class fact is *consumer content shape*, not literal child arity: an
 * action root the consumer fills with exactly one content region and no
 * named slots. Internal chrome around that region (Button's `spinner` and
 * `loadingText` parts) is not part of the class test, because native
 * targets synthesize their own loading affordance from the `loading` prop
 * rather than from `anatomy.dom`.
 *
 * The predicate previously required the root's sole child to be a bare
 * `children` node. That held only while the web DOM happened to project
 * children directly off the root; giving Button the spinner/loadingText
 * elements its contract has always declared (so those style carriers
 * become reachable) dropped Button out of every native emission class and
 * made `--target=all` throw. Web anatomy must not decide whether a native
 * target has a button.
 *
 * Named slots and a second content region are still rejected — those are
 * genuinely different composition classes, handled by composer paths.
 */
export function isProjectedChildrenAction(ir: ComponentIR): boolean {
  if (!ir.dom || ir.root.element !== "button") return false;
  // `ir.root.element` is derived from `a11y.role`, not from the dom — Chip
  // declares role "button" on a `<span>` root that owns two Button instances.
  // The action class needs the host to really be a button element.
  if (ir.dom.tag !== "button") return false;
  let contentRegions = 0;
  let namedSlots = 0;
  const walk = (node: DomNodeIR): void => {
    if (node.tag === "children") contentRegions += 1;
    if (node.tag === "slot") namedSlots += 1;
    for (const child of node.children ?? []) walk(child);
  };
  for (const child of ir.dom.children ?? []) walk(child);
  return contentRegions === 1 && namedSlots === 0;
}

/**
 * Count of `children` projection leaves in the dom tree — the atomic
 * measure behind the content-class predicates. A `children` node with its
 * own children is a wrapper, not a leaf.
 */
export function countChildrenLeaves(ir: ComponentIR): number {
  let count = 0;
  const walk = (node: DomNodeIR): void => {
    const kids = node.children ?? [];
    if (node.tag === "children" && kids.length === 0) count += 1;
    kids.forEach(walk);
  };
  if (ir.dom) walk(ir.dom);
  return count;
}

/**
 * Whether the dom tree holds a component-instance reference that is
 * essential (not a `decoration`-roled part). A contract-authored
 * decoration may degrade on a target without changing the component's
 * class; an essential instance means the component is a composer over
 * another component, which is a different class.
 */
export function hasEssentialComponentInstance(ir: ComponentIR): boolean {
  if (!ir.dom) return false;
  let hasInstance = false;
  const walk = (node: DomNodeIR): void => {
    if ((node as { componentRef?: string }).componentRef) {
      const role = ir.parts.find((part) => part.name === node.part)?.details?.role;
      if (role !== "decoration") hasInstance = true;
    }
    (node.children ?? []).forEach(walk);
  };
  walk(ir.dom);
  return hasInstance;
}

/**
 * The static-content class: a passive root (no channels, no surface, not
 * an action/control element) whose tree projects at most one consumer
 * content region and holds no essential component instances.
 *
 * One children leaf is the plain chrome-surrounds-content shape. Zero
 * leaves with no root content binding is a decorative box (Skeleton): its
 * purely internal children exist so the web can paint per-`lines` bars,
 * and requiring an empty child list made that web realization drop
 * Skeleton out of every emission class. A native decorative box does not
 * honor `lines` — a pre-existing, ledgered gap, not a class change.
 */
export function isStaticContent(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  if (ir.behavior.normalizedChannels.length > 0) return false;
  if (ir.dom.tag === "button" || ir.dom.tag === "input") return false;
  if (hasEssentialComponentInstance(ir)) return false;
  if (ir.dom.tag === "img") return false;
  const childrenLeaves = countChildrenLeaves(ir);
  if (childrenLeaves === 1) return true;
  if (childrenLeaves === 0 && !ir.dom.content) {
    return true;
  }
  return false;
}

/** A bare rule leaf: an hr root with no children and no channels (Divider). */
export function isBareRuleLeaf(ir: ComponentIR): boolean {
  return (
    !!ir.dom &&
    ir.dom.tag === "hr" &&
    (ir.dom.children ?? []).length === 0 &&
    ir.behavior.normalizedChannels.length === 0 &&
    ir.surface == null
  );
}

/** A visual-only leaf: one childless span under a passive root (Spinner). */
export function isVisualOnlyLeaf(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  if (ir.behavior.normalizedChannels.length > 0) return false;
  const children = ir.dom.children ?? [];
  if (children.length !== 1) return false;
  const child = children[0]!;
  return child.tag === "span" && (child.children ?? []).length === 0;
}

/**
 * The dom's single `input` element, when the tree holds exactly one and
 * projects no consumer content — the shape a native scalar control can
 * absorb whole. Returns null otherwise.
 *
 * The input need not be the root. Checkbox wraps its input in a `<label>`
 * beside a visual `indicator` span so those parts carry real style hooks on
 * the web; a native target collapses that whole group into one control, so
 * the wrapper is immaterial to the class. Requiring an input *root* made a
 * web anatomy repair silently drop Checkbox out of every native emission
 * class.
 *
 * Three conditions, each with its own witness:
 *
 * 1. The input is the root or a *direct* child of it. An input buried deeper
 *    belongs to some inner structure, not to this component as a whole —
 *    OTP's `field` sits under a `group` wrapper and Select's under its
 *    listbox search box. Neither is a scalar control the way Checkbox and
 *    Input are, and admitting them would swap their realization for a
 *    scalar control.
 * 2. The tree projects no consumer content. TextField pairs a direct-child
 *    input with named slot regions; it is a composer, and the composer
 *    class is what knows how to place those regions.
 * 3. That input is not iterated. A single iterated input renders N controls;
 *    collapsing it to one native control would silently drop N-1 of them.
 *    No corpus contract has this shape today, so the falsifier is synthetic.
 */
export function soleInputElement(dom: DomNodeIR): DomNodeIR | null {
  const candidates =
    dom.tag === "input"
      ? [dom]
      : (dom.children ?? []).filter((child) => child.tag === "input");
  if (candidates.length !== 1) return null;
  const input = candidates[0]!;
  if (input.iteration !== undefined) return null;

  let projections = 0;
  const walk = (node: DomNodeIR): void => {
    if (node.tag === "children" || node.tag === "slot") projections += 1;
    for (const child of node.children ?? []) walk(child);
  };
  walk(dom);
  return projections === 0 ? input : null;
}

/**
 * The single scalar (string or boolean) channel of an input-root control,
 * or null when the shape does not match. String lowers to a text control;
 * boolean lowers to a boolean (checkbox) control.
 */
export function soleValueChannel(ir: ComponentIR): NormalizedChannelIR | null {
  const scalar = ir.behavior.normalizedChannels.filter(
    (c) => c.valueType === "string" || c.valueType === "boolean",
  );
  return scalar.length === 1 ? scalar[0]! : null;
}

/**
 * The scalar value-control class: a dom tree whose single non-iterated
 * input absorbs the whole component, paired with exactly one scalar value
 * channel. `Checkbox` (boolean) and `Input` (string) are the corpus
 * consumers. The channel's `valueType` discriminates the realization; the
 * class membership is target-neutral.
 */
export function isValueChannelControl(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  if (soleInputElement(ir.dom) === null) return false;
  return soleValueChannel(ir) !== null;
}

/**
 * The glyph-host class: some dom node carries the iconGlyph fact (Icon,
 * NavTree). The component lowers to a registry lookup over the shared
 * glyph substrate; size hints from the IR map the size prop to the
 * rendered frame; decorative-by-default comes from the catalog semantics.
 *
 * The predicate is "any node carries iconGlyph," which is deliberately
 * greedy: NavTree matches because its item icons carry the fact, even
 * though its primary shape is a list. Admission is the allowlist's
 * decision, not the dispatch's — a target may decline to admit a
 * component whose best class has not landed (compose and NavTree).
 */
export function isGlyphHost(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  const stack = [ir.dom];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.iconGlyph) return true;
    stack.push(...(node.children ?? []));
  }
  return false;
}

/** The first iconGlyph fact in the dom walk, for emitters that lower it. */
export function domGlyph(
  ir: ComponentIR,
): NonNullable<ComponentIR["dom"]>["iconGlyph"] {
  const stack = [ir.dom!];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.iconGlyph) return node.iconGlyph;
    stack.push(...(node.children ?? []));
  }
  return undefined;
}

/**
 * The icon-decorated-content class: a passive root (no channels, no
 * surface) whose content is one consumer region beside an author-
 * addressable icon — a string icon prop (registry lookup) or a ReactNode
 * icon prop (consumer region). Status has neither (its glyph is
 * state-driven) and needs a status→glyph intent table instead.
 *
 * Exactly one children leaf, an icon part, and component-instance
 * children only under a dismiss part (its omission is documented).
 */
export function isIconDecoratedContent(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  if (ir.root.element !== "div" && ir.root.element !== "span") return false;
  if (ir.behavior.normalizedChannels.length > 0) return false;
  const hasIconProp = ir.styledProps.some(
    (p) => p.safeName === "icon" && (p.type === "string" || p.type === "ReactNode"),
  );
  if (!hasIconProp) return false;
  let childrenLeaves = 0;
  let hasIconPart = false;
  let strayInstance = false;
  const walk = (node: DomNodeIR): void => {
    if (node.part === "icon") hasIconPart = true;
    const isInstance = Boolean((node as { componentRef?: string }).componentRef);
    const isDismissPart = node.part === "dismiss";
    if (isInstance && !isDismissPart) strayInstance = true;
    const kids = node.children ?? [];
    if (node.tag === "children" && kids.length === 0) childrenLeaves += 1;
    kids.forEach(walk);
  };
  walk(ir.dom);
  return childrenLeaves === 1 && hasIconPart && !strayInstance;
}

/** One member of a radio-group option alias, lowered to a scalar type. */
export interface RadioGroupMemberFact {
  name: string;
  optional: boolean;
  type: "String" | "Bool";
}

/**
 * The native radio-collection facts: identity, label, disabled state, and
 * channel writes all come from the IR. Returns null when the contract is
 * not a single-choice collection.
 *
 * The gate is pure IR-fact extraction (dom role, compositeControl
 * interaction model, iteration, member bindings, defined-type alias) — it
 * is framework-neutral, which is why it lives here rather than in the
 * swift emitter that first needed it.
 */
export interface RadioGroupFacts {
  optionsProp: string;
  itemType: string;
  members: RadioGroupMemberFact[];
  valueMember: string;
  labelMember: string;
  disabledMember?: string;
  /** Member bound to the item's `title` (help text), when the alias has one. */
  helpMember?: string;
  disabledOptional: boolean;
  channel: NormalizedChannelIR;
  defaultValueProp?: string;
  labelProp?: string;
  orientation?: {
    propName: string;
    typeName: string;
    values: string[];
    defaultMember: string;
  };
}

const memberOf = (binding: BindingExpression | undefined): string | undefined =>
  binding?.kind === "iterationLocal" &&
  binding.local === "item" &&
  binding.path?.length === 1
    ? binding.path[0]
    : undefined;

export function radioGroupFacts(ir: ComponentIR): RadioGroupFacts | null {
  const control = ir.compositeControl;
  if (
    !ir.dom ||
    ir.dom.attrs.role !== "radiogroup" ||
    !control ||
    control.interactionModel !== "collection-selection" ||
    control.commit !== "change" ||
    control.channel.valueType !== "string" ||
    control.update.kind !== "channelCall"
  ) {
    return null;
  }

  const item = ir.dom.children.find((node) => node.iteration?.kind === "array");
  const option = item?.children.find((node) => node.part === control.part.name);
  const valueMember = memberOf(option?.bindings.value);
  const labelMember = memberOf(option?.bindings["aria-label"]);
  const disabledMember = memberOf(option?.bindings.disabled);
  const checked = option?.bindings.checked;
  if (
    !item?.iteration?.itemType ||
    !option ||
    option.tag !== "input" ||
    option.attrs.type !== "radio" ||
    !valueMember ||
    !labelMember ||
    memberOf(control.update.arg) !== valueMember ||
    checked?.kind !== "predicate" ||
    checked.op !== "eq" ||
    memberOf(checked.left) !== valueMember ||
    checked.right.kind !== "channel" ||
    checked.right.channel !== control.channel.name ||
    checked.right.field !== "value"
  ) {
    return null;
  }

  const type = item.iteration.itemType;
  const alias = ir.definedTypes[type]?.alias ?? "";
  const members: RadioGroupMemberFact[] = [
    ...alias.matchAll(/(\w+)(\?)?:\s*(string|boolean)(?=\s*[;}])/g),
  ].map((match) => ({
    name: match[1]!,
    optional: !!match[2],
    type: match[3] === "string" ? "String" : "Bool",
  }));
  const hasMember = (
    name: string,
    memberType: string,
    required = false,
  ): boolean =>
    members.some(
      (entry) =>
        entry.name === name &&
        entry.type === memberType &&
        (!required || !entry.optional),
    );
  if (
    !hasMember(valueMember, "String", true) ||
    !hasMember(labelMember, "String", true) ||
    (disabledMember && !hasMember(disabledMember, "Bool"))
  ) {
    return null;
  }
  const disabledOptional =
    members.find((entry) => entry.name === disabledMember)?.optional ?? false;
  const label = ir.dom.bindings["aria-label"];
  const labelProp =
    label?.kind === "prop" && !label.path?.length ? label.prop : undefined;
  const orientation = ir.styledProps.find((prop) => prop.safeName === "orientation");
  const orientationType = orientation?.typeRefs[0];
  const hasOrientation =
    orientationType &&
    ir.definedTypes[orientationType]?.values?.includes("horizontal") &&
    ir.definedTypes[orientationType]?.values?.includes("vertical");
  const helpMember = memberOf(item.bindings.title);
  const helpUsable = helpMember && hasMember(helpMember, "String");

  return {
    optionsProp: item.iteration.sourceProp,
    itemType: type,
    members,
    valueMember,
    labelMember,
    disabledMember,
    helpMember: helpUsable ? helpMember : undefined,
    disabledOptional,
    channel: control.channel,
    defaultValueProp: control.channel.defaultValueProp,
    labelProp,
    orientation: hasOrientation
      ? {
          propName: orientation!.safeName,
          typeName: orientationType!,
          values: ir.definedTypes[orientationType!]!.values!,
          defaultMember:
            orientation!.defaultExpr === '"horizontal"'
              ? "horizontal"
              : "vertical",
        }
      : undefined,
  };
}

/**
 * The array-iterated list class: exactly one channel whose value type is
 * an array (excluding Date arrays, which are grids) over a dom tree that
 * contains an array-iteration node. Shuttle is the corpus consumer.
 *
 * Pure structural facts — target-neutral, which is why it lives here
 * rather than in the swift emitter that first needed it
 * (FEAT-COMPOSE-SHUTTLE-ADMISSION-01).
 */
export function isArrayIteratedList(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  const channels = ir.behavior.normalizedChannels;
  if (channels.length !== 1) return false;
  const vt = channels[0]!.valueType ?? "";
  if (!vt.includes("[]")) return false;
  if (vt.includes("Date")) return false;
  const walk = (node: DomNodeIR): boolean => {
    const iteration = (node as { iteration?: { kind?: string } }).iteration;
    if (iteration?.kind === "array") return true;
    return (node.children ?? []).some(walk);
  };
  return walk(ir.dom);
}

/**
 * The interactive-composite class: a div root with one scalar channel
 * (a string or a union of string members, excluding Date grids) over an
 * anatomy that carries both a trigger part (`trigger`/`tab`) and a content
 * part (`content`/`panel`). Accordion (union openness) and Tabs (scalar
 * activeTab) are the corpus consumers; the realization is the
 * compound-context pattern (root injects the channel, subcomponents
 * consume and mutate it).
 *
 * Pure structural facts — target-neutral, which is why it lives here
 * rather than in the swift emitter that first needed it.
 */
export function isInteractiveComposite(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  if (ir.dom.tag !== "div") return false;
  const channels = ir.behavior.normalizedChannels;
  if (channels.length !== 1) return false;
  const t = channels[0]!.valueType ?? "";
  if (t.includes("Date")) return false;
  const isScalar = t === "string" || t.includes("|");
  if (!isScalar) return false;
  const parts = new Set<string>();
  const walk = (node: DomNodeIR): void => {
    if (node.part) parts.add(node.part);
    (node.children ?? []).forEach(walk);
  };
  walk(ir.dom);
  const hasTrigger = parts.has("trigger") || parts.has("tab");
  const hasContent = parts.has("content") || parts.has("panel");
  return hasTrigger && hasContent;
}

/**
 * The paged-position set class: a declared `pagedSet` policy whose sole
 * numeric channel owns an array-iterated action item that requests a paged
 * position — the position-selection surface itself, with no component
 * instances and no stepping triggers. Pagination is the corpus consumer.
 *
 * Pure structural facts — target-neutral (SWIFTUI-PAGED-POSITION-ADMISSION-01).
 */
export function isPagedPositionSet(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null || !ir.pagedSet) return false;
  const channels = ir.behavior.normalizedChannels;
  if (channels.length !== 1) return false;
  if (channels[0]!.name !== ir.pagedSet.channel) return false;
  let hasRequestedItem = false;
  const walk = (node: DomNodeIR): void => {
    const iteration = (node as { iteration?: { kind?: string } }).iteration;
    if (node.tag === "button" && iteration?.kind === "array") {
      const requested = Object.values(node.events).some(
        (binding) => binding.kind === "paged" && binding.action === "request",
      );
      if (requested) hasRequestedItem = true;
    }
    (node.children ?? []).forEach(walk);
  };
  walk(ir.dom);
  return hasRequestedItem;
}

/**
 * The paged navigator composite class: a declared `pagedSet` policy whose
 * dom both steps positions (a `paged:previous`/`paged:next` trigger) and
 * edits a draft position that commits to the request channel — the
 * first-class navigation chrome over a paged set. Its component references
 * (action triggers, a draft field, a composed position set) lower to sibling
 * native views. PageNavigator is the corpus consumer.
 *
 * Pure structural facts — target-neutral (SWIFTUI-PAGED-POSITION-ADMISSION-01).
 */
export function isPagedNavigatorComposite(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null || !ir.pagedSet) return false;
  let hasStepTrigger = false;
  let hasDraftCommit = false;
  const walk = (node: DomNodeIR): void => {
    for (const binding of Object.values(node.events)) {
      if (binding.kind !== "paged") continue;
      if (binding.action === "previous" || binding.action === "next") {
        hasStepTrigger = true;
      }
      if (binding.action === "commit" || binding.action === "edit") {
        hasDraftCommit = true;
      }
    }
    (node.children ?? []).forEach(walk);
  };
  walk(ir.dom);
  return hasStepTrigger && hasDraftCommit;
}

/**
 * The sequence pager class: a declared `sequence` policy (numeric index
 * channel over an items prop with owned previous/next parts) over a passive
 * root whose viewport projects the consumer's children — a slide sequence
 * with a picker composition, not a bare paged set. Carousel is the corpus
 * consumer.
 *
 * Pure structural facts — target-neutral (SWIFTUI-PAGED-POSITION-ADMISSION-01).
 */
export function isSequencePager(ir: ComponentIR): boolean {
  const sequence = ir.motion.sequence;
  if (!ir.dom || ir.surface != null || !sequence) return false;
  const channels = ir.behavior.normalizedChannels;
  if (channels.length !== 1) return false;
  if (channels[0]!.name !== sequence.channel) return false;
  let hasProjectedViewport = false;
  let hasStepTrigger = false;
  const walk = (node: DomNodeIR): void => {
    if (node.tag === "children") hasProjectedViewport = true;
    if (
      node.tag === "button" &&
      (node.part === sequence.previous || node.part === sequence.next)
    ) {
      hasStepTrigger = true;
    }
    (node.children ?? []).forEach(walk);
  };
  walk(ir.dom);
  return hasProjectedViewport && hasStepTrigger;
}

/**
 * The count-iterated field-group class: a div root whose sole channel is a
 * string over a dom tree containing a count-iterated `input` — a fixed
 * number of per-slot controls writing one character each. OTP is the
 * corpus consumer (the `length` prop drives the slot count).
 *
 * Pure structural facts — target-neutral, which is why it lives here
 * rather than in the swift emitter that first needed it
 * (FEAT-COMPOSE-OTP-ADMISSION-01).
 */
export function isCountIteratedFieldGroup(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  if (ir.root.element !== "div") return false;
  const stringChannels = ir.behavior.normalizedChannels.filter(
    (c) => c.valueType === "string",
  );
  if (stringChannels.length !== 1) return false;
  if (ir.behavior.normalizedChannels.length !== 1) return false;
  let hasCountField = false;
  const walk = (node: DomNodeIR): void => {
    const iteration = (node as { iteration?: { kind?: string } }).iteration;
    if (node.tag === "input" && iteration?.kind === "count") hasCountField = true;
    (node.children ?? []).forEach(walk);
  };
  walk(ir.dom);
  return hasCountField;
}

/**
 * The labeled text-control class: a div root with exactly one string
 * channel over a dom tree containing an `input`. Unlike the input-root
 * value-channel control, this shape wraps the control in label/
 * description/error regions — TextField is the corpus consumer.
 *
 * Pure structural facts — target-neutral, which is why it lives here
 * rather than in the swift emitter that first needed it
 * (FEAT-COMPOSE-TEXTFIELD-ADMISSION-01).
 */
export function isLabeledTextControl(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  if (ir.dom.tag !== "div") return false;
  const strings = ir.behavior.normalizedChannels.filter(
    (c) => c.valueType === "string",
  );
  if (strings.length !== 1 || ir.behavior.normalizedChannels.length !== 1) {
    return false;
  }
  let hasInputPart = false;
  const walk = (node: DomNodeIR): void => {
    if (node.tag === "input") hasInputPart = true;
    (node.children ?? []).forEach(walk);
  };
  walk(ir.dom);
  return hasInputPart;
}

/**
 * The selection-control class: a div root whose one union-typed channel
 * drives an options-array control (single/multi projections of the same
 * union). Select is the corpus consumer.
 *
 * Moved verbatim from the swift emitter that first needed it — pure
 * structural facts, so it lives in the shared substrate
 * (FEAT-COMPOSE-SELECT-ADMISSION-01).
 */
export function isSelectionControl(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  if (ir.root.element !== "div") return false;
  const union = ir.behavior.normalizedChannels.filter(
    (c) => (c.valueType ?? "").includes("|"),
  );
  if (union.length !== 1) return false;
  return ir.styledProps.some(
    (p) => p.safeName === "options" && typeof p.type === "string" && p.type.includes("[]"),
  );
}

/**
 * The date-grid surface class: a dom-bearing, non-surface component whose
 * sole channel is Date-valued and whose grid projects each item's day of
 * month through the closed `dateDayOfMonth` projection. Calendar is the
 * corpus consumer.
 *
 * This is the class the collection predicates already reserve: both
 * `isArrayIteratedList` and `isInteractiveComposite` reject a Date-typed
 * channel outright, because a date grid iterates its own `days` prop rather
 * than carrying an array *channel* or a trigger/content anatomy.
 *
 * Moved out of the swift emitter that first needed it, and strengthened
 * there with the projection fact: a Date-valued channel with no day grid (a
 * future date picker, a range summary) is no longer silently claimed by
 * this class (FEAT-COMPOSE-CALENDAR-ADMISSION-01).
 *
 * Pure structural facts — target-neutral.
 */
export function isDateGridSurface(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  const channels = ir.behavior.normalizedChannels;
  if (channels.length !== 1) return false;
  if (!(channels[0]!.valueType ?? "").includes("Date")) return false;
  return domProjectsDateDayOfMonth(ir.dom);
}

/** Does any dom node realize the closed `dateDayOfMonth` projection as its
 *  content or an attribute binding? Walks the projection's own source chain
 *  so a nested/composed expression still counts. */
function domProjectsDateDayOfMonth(node: DomNodeIR): boolean {
  const projections = [
    ...Object.values(node.bindings ?? {}),
    node.content,
  ];
  if (projections.some(isDateDayOfMonthProjection)) return true;
  return (node.children ?? []).some(domProjectsDateDayOfMonth);
}

function isDateDayOfMonthProjection(expression: unknown): boolean {
  if (!expression || typeof expression !== "object") return false;
  const candidate = expression as { kind?: string; op?: string; source?: unknown };
  if (candidate.kind === "projection" && candidate.op === "dateDayOfMonth") return true;
  if (candidate.kind === "projection") return isDateDayOfMonthProjection(candidate.source);
  return false;
}

/**
 * The referenced-action composite class: a passive root that declares no value
 * channel of its own and whose interactivity is supplied entirely by two or
 * more referenced interactive components. Chip is the corpus consumer — its
 * action and optional dismiss controls are both contract references to Button,
 * so the class is composed rather than re-implemented.
 *
 * The threshold is two, not one: a single referenced trigger is a decoration or
 * a slot on some other class's anatomy (Alert's dismiss, Avatar's image), while
 * two or more mean the component *is* the composition. Exactly one corpus
 * component matches.
 *
 * Pure structural facts — target-neutral (FEAT-COMPOSE-REFERENCE-REALIZATION-01).
 */
export function isReferencedActionComposite(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  if (ir.behavior.normalizedChannels.length > 0) return false;
  const triggers = ir.parts.filter(
    (part) => part.componentRef && part.details?.role === "trigger",
  );
  return triggers.length >= 2;
}

/**
 * The named-slot composer class: a passive container WITH a root dom tree
 * whose every leaf is a named slot — semantic wrapper elements (label,
 * help spans) above the slots are allowed; component-instance leaves
 * (TextField's Input) and surfaces are not. Field is the corpus consumer.
 */
export function isNamedSlotComposer(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  if (ir.root.element !== "div") return false;
  const slots = collectDomSlots(ir.dom);
  return slots.length > 0 && allDomLeavesAreSlots(ir.dom);
}

/** Ordered named-slot list from the dom tree (document order). */
export function collectDomSlots(
  node: NonNullable<ComponentIR["dom"]>,
): string[] {
  const out: string[] = [];
  const walk = (n: NonNullable<ComponentIR["dom"]>): void => {
    if (n.tag === "slot") {
      const name = (n as { slotName?: string; name?: string }).slotName
        ?? (n as { name?: string }).name;
      if (name) out.push(name);
    }
    for (const child of n.children ?? []) walk(child);
  };
  walk(node);
  return out;
}

/** True when every leaf of the dom tree is a named slot node. */
function allDomLeavesAreSlots(
  node: NonNullable<ComponentIR["dom"]>,
): boolean {
  const children = node.children ?? [];
  if (children.length === 0) {
    return node.tag === "slot"
      && ((node as { slotName?: string; name?: string }).slotName
        ?? (node as { name?: string }).name) !== undefined;
  }
  return children.every((child) => allDomLeavesAreSlots(child));
}

/**
 * The passive tree item class: a passive list-item root (`li`) whose heading
 * carries a glyph, link and label, and whose list holds projected children.
 * NavTree is the corpus consumer. Distinguished from the other passive leaves
 * by its list-item root, which no other corpus component declares.
 *
 * Pure structural facts — target-neutral (FEAT-COMPOSE-NAVTREE-ADMISSION-01).
 */
export function isPassiveTreeItem(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  if (ir.behavior.normalizedChannels.length > 0) return false;
  if (ir.dom.tag !== "li") return false;
  const parts = new Set(ir.parts.map((part) => part.name));
  return parts.has("heading") && parts.has("list");
}

/**
 * The compound-part composer class: a root that declares no dom of its own and
 * a set of compound parts, so the part vocabulary is the structure. Card is
 * the corpus consumer; a component with a dom carries its structure there
 * instead.
 *
 * Pure structural facts — target-neutral (FEAT-COMPOSE-CARD-ADMISSION-01).
 */
export function isCompoundPartComposer(ir: ComponentIR): boolean {
  if (ir.dom || ir.surface != null) return false;
  if (ir.behavior.normalizedChannels.length > 0) return false;
  return ir.compoundParts.length >= 2;
}

/**
 * The media leaf class: a childless `img` root with no channel — the corpus's
 * only declared media element. What the target does with the image itself is a
 * loader decision, not a structural one; the class claims the shape.
 *
 * Pure structural facts — target-neutral (FEAT-COMPOSE-IMAGE-ADMISSION-01).
 */
export function isMediaLeaf(ir: ComponentIR): boolean {
  if (ir.surface != null) return false;
  if (ir.behavior.normalizedChannels.length > 0) return false;
  if (ir.dom?.tag !== "img") return false;
  return (ir.dom.children ?? []).length === 0;
}

/**
 * The referenced content composite class: a passive root with no channel whose
 * only component reference is a content-role part. Avatar is the corpus
 * consumer (an image reference beside a gated initials leaf). Trigger-role
 * references belong to the action composite and decoration-role references to
 * the classes that own a layout.
 *
 * Pure structural facts — target-neutral (FEAT-COMPOSE-AVATAR-ADMISSION-01).
 */
export function isReferencedContentComposite(ir: ComponentIR): boolean {
  if (!ir.dom || ir.surface != null) return false;
  if (ir.behavior.normalizedChannels.length > 0) return false;
  if (ir.dom.tag === "img") return false;
  return ir.parts.some(
    (part) => part.componentRef && part.details?.role === "content",
  );
}

/**
 * The coachmark surface class: a declared surface whose anchor is
 * selector-sourced, distinguished from the anchored classes by its surface
 * kind. Where the anchor comes from is a target capability; that the surface is
 * a coachmark is a contract fact, so the predicate lives here.
 *
 * Pure structural facts — target-neutral (FEAT-COMPOSE-WALKTHROUGH-ADMISSION-01).
 */
export function isCoachmarkSurface(ir: ComponentIR): boolean {
  return ir.surface?.kind === "coachmark";
}

/**
 * The centered-surface class: a declared surface whose positioning
 * strategy is `centered` — a modal panel attached to the viewport rather
 * than to an anchor. Dialog is the corpus consumer. Anchored surfaces
 * (Popover/Tooltip/Walkthrough) and viewport-edge surfaces (Sheet/Toast)
 * are separate classes.
 *
 * Pure structural facts — target-neutral, which is why it lives here
 * rather than in the target that first needed it
 * (FEAT-COMPOSE-DIALOG-ADMISSION-01).
 */
export function isCenteredSurface(ir: ComponentIR): boolean {
  if (!ir.surface) return false;
  return ir.surface.positioning?.strategy === "centered";
}

/**
 * The viewport-edge surface class: a declared surface positioned against a
 * viewport edge rather than an anchor — Sheet (with a `side` placement
 * prop) and Toast (edge placement plus a `duration` auto-dismiss prop) are
 * the corpus consumers. Distinct from the centered class and from anchored
 * surfaces, which position relative to a trigger.
 *
 * Pure structural facts — target-neutral, which is why it lives here
 * rather than in the target that first needed it
 * (FEAT-COMPOSE-EDGE-SURFACES-01).
 */
export function isViewportEdgeSurface(ir: ComponentIR): boolean {
  if (!ir.surface) return false;
  return ir.surface.positioning?.strategy === "viewport-edge";
}

/**
 * The anchored-surface class: a declared surface positioned relative to an
 * anchor part rather than to the viewport. The anchor is a contract part
 * (`surface.anchor`), and the open triggers come from
 * `surface.openTriggers` (click for Popover, hover/focus for Tooltip).
 * Walkthrough is excluded: its anchor is selector-sourced
 * (`surface.selectorAnchor`), which needs a DOM selector lookup this
 * substrate does not have.
 *
 * Pure structural facts — target-neutral (FEAT-COMPOSE-ANCHORED-SURFACES-01).
 */
export function isAnchoredSurface(ir: ComponentIR): boolean {
  if (!ir.surface) return false;
  if (ir.surface.selectorAnchor) return false;
  if (!ir.surface.anchor) return false;
  return ir.surface.positioning?.strategy === "anchored";
}

/**
 * The surface's secondary string channel: a declared surface component whose
 * channels are one boolean (`open`) plus one string channel — Command's
 * `search` query. A surface that filters its own content needs the same fact
 * on every native backend, so it lives here, not in the target that first
 * needed it (FEAT-COMPOSE-COMMAND-ADMISSION-01). Returns the string channel,
 * or undefined when the surface declares no such channel.
 *
 * Pure structural fact — target-neutral.
 */
export function surfaceStringChannel(
  ir: ComponentIR,
): NormalizedChannelIR | undefined {
  if (!ir.surface) return undefined;
  if (!ir.behavior.normalizedChannels.some((c) => c.valueType === "boolean")) {
    return undefined;
  }
  return ir.behavior.normalizedChannels.find((c) => c.valueType === "string");
}
