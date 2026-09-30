import { selectionChangeHandler } from "../selection-dismissal.js";
/**
 * React behavior hook emitter.
 *
 * Reads the normalized behavior fields on `ComponentIR` and produces a
 * `use<Name>.ts` file that composes the primitive hooks shipped from
 * `@full-stack-ds/react/primitives/hooks`. The generator is purely
 * declarative — it dispatches on contract data:
 *
 *   - `behavior.normalizedChannels`            → useControllableState per channel
 *   - `behavior.focus?.strategy === "trap"`    → useFocusTrap
 *   - `behavior.focus?.scrollLock === true`    → useScrollLock
 *   - `behavior.portal?.enabled === true`      → usePortal
 *   - `behavior.normalizedDismissalTriggers`   → useAnchorToggle (when no
 *                                                focus trap; otherwise the
 *                                                trap + Escape listener pair
 *                                                handles dismissal)
 *   - compound-state-container pattern         → register/unregister/registeredTabs + idBase
 *
 * Returns `null` when no behavior field is populated; the CLI uses that
 * signal to skip emission.
 */
import {
  type ComponentIR,
  type KeyboardActionIR,
  type NormalizedChannelIR,
  type PartIR,
  type ResolvedPropIR,
  keyboardModeGateProps,
  focusTargetProps,
  pickPrimaryDisclosureChannel,
  resolveInitialFocusSelector,
  resolveRovingItemSelector,
} from "../../ir.js";
import { renderSections, type Section } from "../../preserve.js";
import {
  portalsRootToBody,
  selectorAnchoredRootPortal,
} from "../../semantics.js";
import { isSurfaceComponent } from "./surface-emit.js";

// ---------------------------------------------------------------------------
// Compound-state-container pattern detection
// ---------------------------------------------------------------------------

/**
 * Returns true when the IR matches the "compound-state-container" pattern:
 *   - has an interactive item element (see `getInteractiveItemPart`) that is
 *     either the repeatable part itself (Tabs — `tab` is multiple+interactive)
 *     or a DOM-descendant of the repeatable part (Accordion — `item` is
 *     multiple, its nested `trigger` is interactive)
 *   - AND has a part with `details.role === "region"` (the content panel)
 *
 * Routes to one of two contract-derived lowerings: tab-selection (`role="tab"`,
 * single-select, roving focus) when the item binds a selection channel, or
 * repeated disclosure (`aria-expanded`, per-item toggle) when the item binds an
 * expansion channel — discriminated by `isDisclosureContainer`.
 */
export function isCompoundStateContainer(ir: ComponentIR): boolean {
  if (ir.interaction) return ir.interaction.triggers.some(t => t.operation === "select" || t.operation === "toggle-item");
  return !!getInteractiveItemPart(ir) && !!getRegionPart(ir);
}

/**
 * Returns the repeatable ("multiple") part that anchors a compound-state
 * container — the element the consumer stamps out once per item (Tabs `tab`,
 * Accordion `item`). When several parts declare `multiple`, the first in
 * declaration order is the outermost repeat unit (the contract lists ancestors
 * before descendants), so the others (Accordion's `header`/`content`/
 * `contentInner`) are sub-nodes within it, not separate repeat anchors.
 */
export function getMultipleItemPart(ir: ComponentIR): PartIR | undefined {
  return ir.parts.find((p) => p.details?.multiple === true);
}

/**
 * Returns the interactive host element of a compound-state container — the
 * element that receives the click/toggle handler and drives the channel.
 *
 * Ancestor-aware resolution (mirrors `getGroupHostOrnamentPart`'s DOM walk):
 *   1. If the repeatable ("multiple") part is itself interactive, it IS the
 *      host (Tabs: `tab` is multiple+interactive). Returned directly, so Tabs
 *      output is byte-unchanged.
 *   2. Otherwise, walk the repeatable part's `anatomy.dom` subtree for a
 *      descendant part flagged `interactive` and return it (Accordion: `item`
 *      is multiple but not interactive; its nested `trigger`, two DOM levels
 *      down via `item > header > trigger`, carries `interactive: true`).
 *
 * Falls back to the legacy co-located predicate (multiple AND interactive on
 * one part) when there is no `anatomy.dom` to walk.
 */
export function getInteractiveItemPart(ir: ComponentIR): PartIR | undefined {
  const binding = ir.interaction?.triggers.find(t => t.operation === "select" || t.operation === "toggle-item");
  if (binding) return binding.part;
  const coLocated = ir.parts.find(
    (p) => p.details?.multiple === true && p.details?.interactive === true,
  );
  if (coLocated) return coLocated;

  const multiplePart = getMultipleItemPart(ir);
  if (!multiplePart || !ir.dom) return undefined;

  const multipleNode = findDomNodeForPart(ir.dom, multiplePart.name);
  if (!multipleNode) return undefined;

  const descendantPartNames = collectDescendantPartNames(multipleNode);
  return ir.parts.find(
    (p) => descendantPartNames.has(p.name) && p.details?.interactive === true,
  );
}

/**
 * Returns true when a compound-state container is a *repeated-disclosure*
 * container (Accordion) rather than a *tab-selection* container (Tabs).
 *
 * Discriminated purely from contract data: the interactive item's DOM node
 * binds `aria-expanded` to a channel value. Tabs's item binds `aria-selected`
 * instead, so it returns false and stays on the tab-selection lowering. No
 * component-name matching.
 */
export function isDisclosureContainer(ir: ComponentIR): boolean {
  if (ir.interaction) return ir.interaction.triggers.some(t => t.operation === "toggle-item");
  if (!ir.dom) return false;
  const itemPart = getInteractiveItemPart(ir);
  const regionPart = getRegionPart(ir);
  if (!itemPart || !regionPart) return false;
  const itemNode = findDomNodeForPart(ir.dom, itemPart.name);
  if (!itemNode) return false;
  const expandedBinding = itemNode.bindings["aria-expanded"];
  return expandedBinding !== undefined && expandedBinding.kind === "channel";
}

/** Depth-first search for the DOM node whose `part` matches `partName`. */
function findDomNodeForPart(
  root: NonNullable<ComponentIR["dom"]>,
  partName: string,
): NonNullable<ComponentIR["dom"]> | undefined {
  const stack: NonNullable<ComponentIR["dom"]>[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.part === partName) return node;
    if (node.children) stack.push(...node.children);
  }
  return undefined;
}

/** Collects the `part` names of every strict descendant of `node`. */
function collectDescendantPartNames(
  node: NonNullable<ComponentIR["dom"]>,
): Set<string> {
  const names = new Set<string>();
  const stack: NonNullable<ComponentIR["dom"]>[] = [...(node.children ?? [])];
  while (stack.length > 0) {
    const n = stack.pop()!;
    if (n.part !== undefined) names.add(n.part);
    if (n.children) stack.push(...n.children);
  }
  return names;
}

/** Returns the first part with role="region" (e.g. panel). */
export function getRegionPart(ir: ComponentIR): PartIR | undefined {
  if (ir.interaction) return ir.interaction.content;
  return ir.parts.find((p) => p.details?.role === "region");
}

/**
 * Returns the "group host" part — the container that holds the interactive
 * items and should receive the keyboard handler (e.g. "list").
 */
export function getGroupHostPart(ir: ComponentIR): PartIR | undefined {
  return ir.parts.find((p) => p.details?.role === "group");
}

/**
 * Returns the "ornament" part of the group host — a sibling sub-node of
 * the interactive item that the contract declares as a singleton decoration
 * (e.g. Tabs's `indicator`). Detected from `anatomy.dom`: a child of the
 * group-host node that is NOT a slot/children placeholder, NOT the
 * interactive item template, and has a non-empty `part` name.
 *
 * This generalizes Tabs's active-indicator pattern to any compound-state
 * container that declares a peer-of-the-item ornament. The emitter renders
 * it as a sibling of the consumer-passed children inside the group host.
 *
 * Returns `undefined` when:
 *   - the contract has no `anatomy.dom` (legacy compound-emit path)
 *   - the group host has no children other than the interactive item
 *   - the group host has more than one non-item child (ambiguous; emitter
 *     stays conservative rather than guessing)
 *
 * Scope note (TABS-INDICATOR-REALIZATION-01): this finds the *declared*
 * ornament so the emitter can project the DOM element. It does NOT prove
 * measured positioning, active-tab width sync, or animation correctness
 * beyond what the contract-authored CSS already specifies.
 */
export function getGroupHostOrnamentPart(
  ir: ComponentIR,
): PartIR | undefined {
  if (!ir.dom) return undefined;
  const groupHost = getGroupHostPart(ir);
  const itemPart = getInteractiveItemPart(ir);
  if (!groupHost || !itemPart) return undefined;

  // Find the dom-tree node corresponding to the group host (depth-first).
  const stack: typeof ir.dom[] = [ir.dom];
  let groupNode: (typeof ir.dom) | undefined;
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.part === groupHost.name) {
      groupNode = node;
      break;
    }
    if (node.children) stack.push(...node.children);
  }
  if (!groupNode) return undefined;

  // Among the group host's direct children, count those that are concrete
  // declared parts (not slot/children placeholders) and not the item.
  const ornamentCandidates = groupNode.children.filter(
    (c) =>
      c.tag !== "slot" &&
      c.tag !== "children" &&
      c.part !== undefined &&
      c.part !== itemPart.name,
  );
  if (ornamentCandidates.length !== 1) return undefined;
  const ornamentName = ornamentCandidates[0].part!;
  return ir.parts.find((p) => p.name === ornamentName);
}

interface PrimitiveBindings {
  useControllableState: NormalizedChannelIR[];
  useFocusTrap: boolean;
  useScrollLock: boolean;
  usePortal: boolean;
  useAnchorToggle: boolean;
  useDismissal: boolean;
  hasEscapeTrigger: boolean;
  hasOutsideClickTrigger: boolean;
  /** True when the IR matches the compound-state-container (Tabs-shaped) pattern. */
  isCompoundStateContainer: boolean;
}

/**
 * The surface's blocking condition: its openness, ANDed with the modality
 * gate prop when the contract declares one (`surface.modalityProp`). An
 * omitted prop reads as the contract default.
 */
function blockingExpr(ir: ComponentIR, openExpr: string): string {
  const gate = ir.surface?.modalityGate;
  if (!gate) return openExpr;
  const modal = `(options.${gate.prop} ?? ${gate.defaultModal})`;
  return openExpr === "true" ? modal : `${openExpr} && ${modal}`;
}

/**
 * Determine which primitive hooks the contract's behavior fields map onto.
 * Returns `null` when no primitive is required (the contract has no
 * behavior worth lifting and the generator should skip emission).
 */
function resolveBindings(ir: ComponentIR): PrimitiveBindings | null {
  const channels = ir.behavior.normalizedChannels;
  const focus = ir.behavior.focus;
  const portal = ir.behavior.portal;
  const triggers = ir.behavior.normalizedDismissalTriggers;

  const hasFocusTrap = focus?.strategy === "trap";
  const hasScrollLock = focus?.scrollLock === true;
  // FIX-PORTAL-CONSUMPTION-01: only emit the portal primitive when the
  // component-source actually consumes it (full-overlay surface portaled to
  // body). Contracts that declare `portal.enabled` without a consumable
  // surface (no surface block, or an anchored/inline surface) no longer emit
  // an orphaned `renderInPortal` the component never reads.
  // Selector-anchored root portals (coachmark tours) also consume
  // renderInPortal: the whole panel mounts at body and tracks a page
  // element resolved from the active step's selector.
  const hasPortal =
    portalsRootToBody({ behavior: { portal }, surface: ir.surface }) ||
    selectorAnchoredRootPortal({ behavior: { portal }, surface: ir.surface }) !==
      null;
  const hasEscapeTrigger = triggers.some((t) => t.event === "escape");
  const hasOutsideClickTrigger = triggers.some(
    (t) => t.event === "outsideClick" || t.event === "overlayClick",
  );
  // Prefer useAnchorToggle when there's no focus trap (overlay-style components).
  // Focus-trap components (Modal) use useDismissal directly for escape handling.
  // useAnchorToggle requires a boolean "open" channel — components with only
  // non-boolean channels (e.g. Walkthrough's step index) fall through to
  // standalone useDismissal instead.
  const hasBooleanOpenChannel = channels.some((c) => c.isDisclosureChannel);
  const useAnchor =
    !hasFocusTrap &&
    (hasEscapeTrigger || hasOutsideClickTrigger) &&
    hasBooleanOpenChannel;
  // Modal-pattern: useFocusTrap + escape trigger → useDismissal for escape key.
  // Also used as the fallback when AnchorToggle can't be wired (no boolean channel).
  const useDismissalHook =
    (hasFocusTrap && hasEscapeTrigger) ||
    (!useAnchor && hasEscapeTrigger);

  // A repeated-disclosure container (Accordion) does NOT use the
  // tab-style hook machinery (register/unregister/idBase); its root owns a
  // plain channel plus an inline useId. Only tab-selection containers get the
  // compound hook surface, so exclude disclosure here.
  const compoundContainer =
    isCompoundStateContainer(ir) && !isDisclosureContainer(ir);

  if (
    channels.length === 0 &&
    !hasFocusTrap &&
    !hasScrollLock &&
    !hasPortal &&
    !useAnchor &&
    !compoundContainer
  ) {
    return null;
  }

  return {
    useControllableState: channels,
    useFocusTrap: hasFocusTrap,
    useScrollLock: hasScrollLock,
    usePortal: hasPortal,
    useAnchorToggle: useAnchor,
    useDismissal: useDismissalHook,
    hasEscapeTrigger,
    hasOutsideClickTrigger,
    isCompoundStateContainer: compoundContainer,
  };
}

/**
 * Look up a hook prop by name in the contract's `props.hook.members` list,
 * which the IR carries on `behavior.<...>` indirectly. We re-derive it from
 * the raw contract via `behavior` instead of `styledProps` because hook
 * props are a separate API surface.
 */
function findHookProp(
  ir: ComponentIR,
  name: string,
): ResolvedPropIR | undefined {
  return ir.styledProps.find((p) => p.name === name);
}

/**
 * Build the `Use<Name>Options` interface body. Each entry corresponds to a
 * hook prop the generator references in the body. Today this is the union
 * of channel props (value/default/onChange), dismissal toggle props, and
 * focus/portal target refs.
 */
function generateOptionsInterface(
  ir: ComponentIR,
  bindings: PrimitiveBindings,
): string {
  const lines: string[] = [`export interface Use${ir.name}Options {`];

  for (const ch of bindings.useControllableState) {
    const t = ch.valueType ?? "unknown";
    lines.push(`  /** Controlled "${ch.name}" value. */`);
    lines.push(`  ${ch.valueProp}?: ${t};`);
    if (ch.defaultValueProp) {
      lines.push(`  /** Initial uncontrolled "${ch.name}" value. */`);
      lines.push(`  ${ch.defaultValueProp}?: ${t};`);
    }
    lines.push(`  /** Called when "${ch.name}" changes. */`);
    lines.push(`  ${ch.changeHandlerProp}?: (value: ${t}) => void;`);
  }

  for (const t of ir.behavior.normalizedDismissalTriggers) {
    if (!t.enabledByProp) continue;
    lines.push(
      `  /** ${t.description ?? `Whether "${t.event}" dismissal is enabled.`} */`,
    );
    lines.push(`  ${t.enabledByProp}?: boolean;`);
  }

  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: the keyboard select handler evaluates
  // the composite control's mode gate, so the component forwards the gate
  // props into the hook.
  for (const gateProp of keyboardModeGateProps(ir)) {
    lines.push(`  /** Mode gate the keyboard select behavior reads. */`);
    lines.push(`  ${gateProp}?: boolean;`);
  }

  const modalityGate = ir.surface?.modalityGate;
  if (modalityGate) {
    lines.push(`  /** When false the surface is non-blocking: no focus trap, no scroll lock. */`);
    lines.push(`  ${modalityGate.prop}?: boolean;`);
  }

  for (const { prop } of focusTargetProps(ir)) {
    lines.push(`  /** CSS selector or element ID used by the focus policy. */`);
    lines.push(`  ${prop}?: string;`);
  }

  if (bindings.usePortal) {
    const targetProp = ir.behavior.portal?.targetProp;
    if (targetProp) {
      lines.push(
        `  /** DOM element or selector for the portal mount point. */`,
      );
      lines.push(`  ${targetProp}?: Element | string;`);
    }
  }

  if (bindings.isCompoundStateContainer) {
    lines.push(`  /** Base string for generating tab and panel IDs. Defaults to a generated id. */`);
    lines.push(`  idBase?: string;`);
  }

  lines.push(`}`);
  return lines.join("\n");
}

/**
 * Build the `Use<Name>Result` interface — the public shape the component
 * binds to. Composed from whichever primitive bindings are active.
 */
function generateResultInterface(
  ir: ComponentIR,
  bindings: PrimitiveBindings,
): string {
  const lines: string[] = [`export interface Use${ir.name}Result {`];

  for (const ch of bindings.useControllableState) {
    const t = ch.valueType ?? "unknown";
    const setter = `set${capitalize(ch.name)}`;
    lines.push(`  ${ch.name}: ${t};`);
    lines.push(`  ${setter}: (next: ${t}) => void;`);
  }

  if (bindings.useFocusTrap || bindings.usePortal || bindings.useAnchorToggle) {
    lines.push(`  panelRef: RefObject<HTMLDivElement | null>;`);
  }
  if (bindings.useAnchorToggle) {
    lines.push(`  anchorRef: RefObject<HTMLElement | null>;`);
  }
  if (bindings.usePortal) {
    lines.push(`  renderInPortal: (node: ReactNode) => ReactNode;`);
  }

  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: one keydown handler per hosting part.
  // The composite item part's handler also receives the item value.
  const itemPart = ir.compositeControl?.part.name;
  const handlerParts: string[] = [];
  for (const action of ir.keyboardActions) {
    if (!handlerParts.includes(action.part)) handlerParts.push(action.part);
  }
  for (const part of handlerParts) {
    if (part === itemPart) {
      lines.push(
        `  handle${capitalize(part)}Keydown: (event: ReactKeyboardEvent<HTMLElement>, value: string) => void;`,
      );
    } else {
      lines.push(
        `  handle${capitalize(part)}Keydown: (event: ReactKeyboardEvent<HTMLElement>) => void;`,
      );
    }
  }

  if (bindings.isCompoundStateContainer) {
    lines.push(`  /** DOM-order list of registered tab values. */`);
    lines.push(`  registeredTabs: string[];`);
    lines.push(`  registerTab: (value: string) => void;`);
    lines.push(`  unregisterTab: (value: string) => void;`);
    lines.push(`  /** Base string for generating tab and panel IDs. */`);
    lines.push(`  idBase: string;`);
  }

  lines.push(`}`);
  return lines.join("\n");
}

function generateImports(ir: ComponentIR, bindings: PrimitiveBindings): string {
  const reactNamed: string[] = [];
  const reactTypes: string[] = [];
  if (bindings.useFocusTrap || bindings.usePortal || bindings.useAnchorToggle) {
    reactNamed.push("useRef");
    reactTypes.push("type RefObject");
  }
  if (bindings.usePortal) reactTypes.push("type ReactNode");
  if (bindings.isCompoundStateContainer) {
    reactNamed.push("useCallback");
    reactNamed.push("useId");
    reactNamed.push("useState");
  }
  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: keydown handlers need useCallback and a
  // DOM-keyboard-event type alias (aliased so it cannot collide with the DOM
  // lib's global KeyboardEvent in consumer code). useCallback may already be
  // present from the compound-container branch above — named imports must
  // dedupe or the emitted import line is a compile error.
  if (ir.keyboardActions.length > 0) {
    if (!reactNamed.includes("useCallback")) reactNamed.push("useCallback");
    reactTypes.push("type KeyboardEvent as ReactKeyboardEvent");
  }

  const primitives: string[] = [];
  if (bindings.useControllableState.length > 0)
    primitives.push("useControllableState");
  if (bindings.useDismissal) primitives.push("useDismissal");
  if (bindings.useFocusTrap) primitives.push("useFocusTrap");
  if (bindings.useScrollLock) primitives.push("useScrollLock");
  if (bindings.usePortal) primitives.push("usePortal");
  if (bindings.useAnchorToggle) primitives.push("useAnchorToggle");

  const lines: string[] = [];
  if (reactNamed.length > 0 || reactTypes.length > 0) {
    const all = [...reactTypes, ...reactNamed].sort();
    lines.push(`import { ${all.join(", ")} } from "react";`);
  }
  if (primitives.length > 0) {
    lines.push(
      `import { ${primitives.sort().join(", ")} } from "../../primitives/hooks";`,
    );
  }
  return lines.join("\n");
}

/**
 * Emit `export type X = ...;` declarations for any contract-defined types
 * referenced by channels. The hook file self-contains these so it works
 * regardless of whether the component file (legacy or migrated) exports them.
 * Types are exported so consumers (and the component) can reuse them.
 */
function generateInlineTypes(
  ir: ComponentIR,
  bindings: PrimitiveBindings,
): string {
  const referenced = new Set<string>();
  for (const ch of bindings.useControllableState) {
    if (ch.valueType && ir.definedTypes[ch.valueType]) {
      referenced.add(ch.valueType);
    }
  }
  if (referenced.size === 0) return "";

  const lines: string[] = [];
  for (const name of [...referenced].sort()) {
    const def = ir.definedTypes[name];
    if (def.kind === "union" && def.values) {
      lines.push(
        `export type ${name} = ${def.values.map((v) => `"${v}"`).join(" | ")};`,
      );
    } else if (def.kind === "alias" && def.alias) {
      lines.push(`export type ${name} = ${def.alias};`);
    }
  }
  return lines.join("\n");
}

/**
 * Select the channel that represents the component's open/closed (visibility)
 * state — the one `useAnchorToggle` should manage. Prefers a boolean channel
 * named `open` or `expanded`; falls back to any boolean channel; returns
 * `undefined` when none qualify (in which case `useAnchorToggle` should not be
 * wired to any channel — its open state is internal). Callers must check that
 * the contract actually carries one before treating anchor-toggle as owning a
 * channel.
 */
function pickOpenChannel(
  channels: NormalizedChannelIR[],
): NormalizedChannelIR | undefined {
  // Delegates to the IR's structural priority order so each emitter does
  // not maintain its own `c.name === "open"` / `"expanded"` predicate.
  return pickPrimaryDisclosureChannel(channels);
}

/**
 * FEAT-A11Y-COMPOSITE-KEYBOARD-01 — React lowering of the realized keyboard
 * actions. One `useCallback` handler per hosting part, emitted from the same
 * IR facts the template binds (`node.keyboardActions`):
 *
 *   - `open`        → open the boolean disclosure channel, then move focus
 *                     into the panel (initialFocus part's first focusable
 *                     element, falling back to the roving item set).
 *   - `roving-*`    → query the item set by the composite part's role and
 *                     move DOM focus per the op, honoring `focus.wrap`.
 *   - `select`      → commit the composite control's `toggleMembership`
 *                     update against the item value the template passes,
 *                     mirroring the item's click binding exactly.
 *
 * Handlers are returned from the hook and bound by the component template.
 */
function emitKeyboardHandlers(
  lines: string[],
  ir: ComponentIR,
  bindings: PrimitiveBindings,
  openChannel: NormalizedChannelIR | undefined,
  anchorOwnsChannel: boolean,
): void {
  const itemSelector = resolveRovingItemSelector(ir);
  const initialSelector = resolveInitialFocusSelector(ir);

  // Hosting parts in first-declaration order; the return object and the
  // component's destructure use the same order.
  const parts: string[] = [];
  for (const action of ir.keyboardActions) {
    if (!parts.includes(action.part)) parts.push(action.part);
  }

  for (const part of parts) {
    const actions = ir.keyboardActions.filter((a) => a.part === part);
    const ident = `handle${capitalize(part)}Keydown`;
    const keyGuard = (keys: string[]): string =>
      keys.map((k) => `event.key === ${JSON.stringify(k)}`).join(" || ");

    if (actions.some((a) => a.op === "select")) {
      emitSelectKeydownHandler(lines, ir, bindings, part, ident, keyGuard);
      continue;
    }

    if (actions.every((a) => a.op.startsWith("roving-"))) {
      if (!itemSelector) {
        throw new Error(
          `Component "${ir.name}": roving keyboard actions on part "${part}" require a role on the composite item part.`,
        );
      }
      emitRovingKeydownHandler(
        lines,
        ir,
        part,
        ident,
        itemSelector,
        keyGuard,
      );
      continue;
    }

    emitOpenKeydownHandler(
      lines,
      ir,
      bindings,
      part,
      ident,
      openChannel,
      anchorOwnsChannel,
      itemSelector,
      initialSelector,
      keyGuard,
    );
  }
}

/** Lower the `open` op: reveal the panel and move focus into it. */
function emitOpenKeydownHandler(
  lines: string[],
  ir: ComponentIR,
  bindings: PrimitiveBindings,
  part: string,
  ident: string,
  openChannel: NormalizedChannelIR | undefined,
  anchorOwnsChannel: boolean,
  itemSelector: string | undefined,
  initialSelector: string | undefined,
  keyGuard: (keys: string[]) => string,
): void {
  const actions = ir.keyboardActions.filter((a) => a.part === part);
  if (!openChannel || openChannel.valueType !== "boolean") {
    throw new Error(
      `Component "${ir.name}": keyboard "open" behavior on part "${part}" requires a boolean disclosure channel.`,
    );
  }
  const setter = anchorOwnsChannel
    ? "anchorToggle.setOpen"
    : `set${capitalize(openChannel.name)}`;
  const panelRefIdent = bindings.useAnchorToggle
    ? "anchorToggle.panelRef"
    : bindings.useFocusTrap || bindings.usePortal
      ? "panelRef"
      : undefined;
  if (!panelRefIdent) {
    throw new Error(
      `Component "${ir.name}": keyboard "open" behavior on part "${part}" requires a panel ref (anchor-toggle or focus-trap binding) to receive focus.`,
    );
  }
  const keys = actions.map((a) => a.key);
  const focusTargetExpr = initialSelector
    ? itemSelector
      ? `(${panelRefIdent}.current.querySelector<HTMLElement>(${JSON.stringify(initialSelector)}) ?? ${panelRefIdent}.current.querySelector<HTMLElement>(${JSON.stringify(itemSelector)}))?.focus();`
      : `${panelRefIdent}.current.querySelector<HTMLElement>(${JSON.stringify(initialSelector)})?.focus();`
    : itemSelector
      ? `${panelRefIdent}.current.querySelector<HTMLElement>(${JSON.stringify(itemSelector)})?.focus();`
      : `${panelRefIdent}.current.focus();`;
  lines.push(`  const ${ident} = useCallback(`);
  lines.push(`    (event: ReactKeyboardEvent<HTMLElement>) => {`);
  lines.push(`      if (!(${keyGuard(keys)})) return;`);
  lines.push(`      event.preventDefault();`);
  lines.push(`      ${setter}(true);`);
  lines.push(`      requestAnimationFrame(() => {`);
  lines.push(`        if (!${panelRefIdent}.current) return;`);
  lines.push(`        ${focusTargetExpr}`);
  lines.push(`      });`);
  lines.push(`    },`);
  // exhaustive-deps: the callback reads members off the anchor bundle (setOpen
  // and panelRef), so the dependency is the bundle root itself — listing a
  // single member leaves the other member access uncovered.
  const depIdents = new Set<string>();
  for (const ident of [setter, panelRefIdent]) {
    depIdents.add(ident.startsWith("anchorToggle.") ? "anchorToggle" : ident);
  }
  lines.push(`    [${[...depIdents].join(", ")}],`);
  lines.push(`  );`);
  lines.push(``);
}

/** Lower the roving-* ops: move DOM focus within the queried item set. */
function emitRovingKeydownHandler(
  lines: string[],
  ir: ComponentIR,
  part: string,
  ident: string,
  itemSelector: string,
  keyGuard: (keys: string[]) => string,
): void {
  const wrap = ir.behavior.focus?.wrap === true;
  const indexExpr = (op: KeyboardActionIR["op"]): string => {
    switch (op) {
      case "roving-next":
        return wrap
          ? "currentIndex === -1 || currentIndex >= items.length - 1 ? 0 : currentIndex + 1"
          : "currentIndex === -1 ? 0 : Math.min(currentIndex + 1, items.length - 1)";
      case "roving-prev":
        return wrap
          ? "currentIndex <= 0 ? items.length - 1 : currentIndex - 1"
          : "currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0)";
      case "roving-first":
        return "0";
      case "roving-last":
        return "items.length - 1";
      default:
        throw new Error(
          `Component "${ir.name}": non-roving op "${op}" in the roving handler for part "${part}".`,
        );
    }
  };
  lines.push(`  const ${ident} = useCallback(`);
  lines.push(`    (event: ReactKeyboardEvent<HTMLElement>) => {`);
  lines.push(`      const items = Array.from(`);
  lines.push(`        event.currentTarget.querySelectorAll<HTMLElement>(${JSON.stringify(itemSelector)}),`);
  lines.push(`      );`);
  lines.push(`      const currentIndex = items.findIndex((item) => item === document.activeElement);`);
  const actions = ir.keyboardActions.filter((a) => a.part === part);
  actions.forEach((action, i) => {
    const keyword = i === 0 ? "if" : "else if";
    lines.push(`      ${keyword} (${keyGuard([action.key])}) {`);
    lines.push(`        event.preventDefault();`);
    lines.push(`        items[${indexExpr(action.op)}]?.focus();`);
    lines.push(`      }`);
  });
  lines.push(`    },`);
  lines.push(`    [],`);
  lines.push(`  );`);
  lines.push(``);
}

/**
 * Lower the `select` op: commit the composite control's toggleMembership
 * update against the item value the template passes — the exact expression
 * shape the item's click binding emits, keyed off the same mode gate.
 */
function emitSelectKeydownHandler(
  lines: string[],
  ir: ComponentIR,
  bindings: PrimitiveBindings,
  part: string,
  ident: string,
  keyGuard: (keys: string[]) => string,
): void {
  const control = ir.compositeControl;
  if (
    !control ||
    control.update.kind !== "channelUpdate" ||
    control.update.op !== "toggleMembership"
  ) {
    throw new Error(
      `Component "${ir.name}": keyboard "select" behavior on part "${part}" requires a toggleMembership composite control update.`,
    );
  }
  const channel = bindings.useControllableState.find(
    (c) => c.name === control.channel.name,
  );
  if (!channel) {
    throw new Error(
      `Component "${ir.name}": keyboard "select" behavior targets channel "${control.channel.name}", which the hook does not manage.`,
    );
  }
  const setter = `set${capitalize(channel.name)}`;
  const current = `Array.isArray(${channel.name}) ? ${channel.name} : ${channel.name} == null ? [] : [${channel.name}]`;
  const modeGates = keyboardModeGateProps(ir);
  const gate = modeGates.length > 0 ? `options.${modeGates[0]}` : undefined;
  const keys = ir.keyboardActions
    .filter((a) => a.part === part && a.op === "select")
    .map((a) => a.key);
  const deps = gate
    ? [channel.name, setter, gate].join(", ")
    : [channel.name, setter].join(", ");
  lines.push(`  const ${ident} = useCallback(`);
  lines.push(`    (event: ReactKeyboardEvent<HTMLElement>, value: string) => {`);
  lines.push(`      if (!(${keyGuard(keys)})) return;`);
  lines.push(`      event.preventDefault();`);
  lines.push(`      const current = ${current};`);
  lines.push(
    gate
      ? `      ${setter}(${gate} ? (current.includes(value) ? current.filter((member) => member !== value) : [...current, value]) : value);`
      : `      ${setter}(current.includes(value) ? current.filter((member) => member !== value) : [...current, value]);`,
  );
  lines.push(`    },`);
  lines.push(`    [${deps}],`);
  lines.push(`  );`);
  lines.push(``);
}

function generateBody(ir: ComponentIR, bindings: PrimitiveBindings): string {
  const lines: string[] = [];
  lines.push(
    `export function use${ir.name}(options: Use${ir.name}Options = {}): Use${ir.name}Result {`,
  );

  // useAnchorToggle internally manages an open boolean via useControllableState,
  // so when present we elide the redundant per-hook call for the channel it owns.
  // The channel must be boolean — non-boolean channels (Walkthrough's step:number,
  // Select's value:string|string[]) are left alone and managed by useControllableState
  // independently of anchor-toggle's internal open state.
  const openChannel = pickOpenChannel(bindings.useControllableState);
  const anchorOwnsChannel =
    bindings.useAnchorToggle &&
    !!openChannel &&
    openChannel.valueType === "boolean";

  // Channels (skipping the one anchorToggle handles)
  for (const ch of bindings.useControllableState) {
    if (anchorOwnsChannel && ch === openChannel) continue;
    const setter = `set${capitalize(ch.name)}`;
    const t = ch.valueType ?? "unknown";
    const def = defaultExprFor(ir, ch.defaultValueProp, t);
    const defaultExpr = ch.defaultValueProp
      ? `options.${ch.defaultValueProp} ?? ${def}`
      : def;
    lines.push(
      `  const [${ch.name}, ${setter}] = useControllableState<${t}>({`,
    );
    lines.push(`    controlled: options.${ch.valueProp},`);
    lines.push(`    defaultValue: ${defaultExpr},`);
    const selectionHandler = bindings.useAnchorToggle ? selectionChangeHandler(ir, ch.name, `options.${ch.changeHandlerProp}?.`, name => `options.${name}`, "anchorToggle.setOpen(false)", "anchorToggle.anchorRef.current?.focus()") : undefined;
    lines.push(`    onChange: ${selectionHandler ?? `options.${ch.changeHandlerProp}`},`);
    lines.push(`  });`);
    lines.push(``);
  }

  // Refs (panel/anchor)
  if (bindings.useFocusTrap || bindings.usePortal) {
    lines.push(`  const panelRef = useRef<HTMLDivElement>(null);`);
  }
  if (bindings.useAnchorToggle) {
    lines.push(`  // anchor + panel refs come from useAnchorToggle below.`);
  }

  // useDismissal (focus-trap components: Modal, etc.) — escape key handling
  if (bindings.useDismissal) {
    const openChannel = bindings.useControllableState.find(
      (c) => c.valueType === "boolean",
    );
    const escapeProp = ir.behavior.normalizedDismissalTriggers.find(
      (t) => t.event === "escape",
    )?.enabledByProp;
    if (openChannel) {
      const setter = `set${capitalize(openChannel.name)}`;
      lines.push(`  useDismissal({`);
      lines.push(`    open: ${openChannel.name},`);
      lines.push(`    onDismiss: () => ${setter}(false),`);
      if (escapeProp) {
        lines.push(`    closeOnEscape: options.${escapeProp} !== false,`);
      }
      lines.push(`  });`);
      lines.push(``);
    }
  }

  // useAnchorToggle composition (overlay-style components without focus trap).
  // Wires the boolean open-channel into anchor-toggle when one exists; when
  // the contract has dismissal/portal but no boolean channel (rare), the
  // anchor-toggle runs with an internal default-false open state.
  if (bindings.useAnchorToggle) {
    const escapeProp = ir.behavior.normalizedDismissalTriggers.find(
      (t) => t.event === "escape",
    )?.enabledByProp;
    const outsideProp = ir.behavior.normalizedDismissalTriggers.find(
      (t) => t.event === "outsideClick" || t.event === "overlayClick",
    )?.enabledByProp;
    lines.push(`  const anchorToggle = useAnchorToggle({`);
    if (openChannel && openChannel.valueType === "boolean") {
      lines.push(`    open: options.${openChannel.valueProp},`);
      // Only reference options.<defaultValueProp> when the channel declared one;
      // otherwise pass a literal false so we don't reference an undeclared option.
      if (openChannel.defaultValueProp) {
        lines.push(
          `    defaultOpen: options.${openChannel.defaultValueProp} ?? false,`,
        );
      } else {
        lines.push(`    defaultOpen: false,`);
      }
      lines.push(`    onOpenChange: options.${openChannel.changeHandlerProp},`);
    }
    if (escapeProp) {
      lines.push(`    closeOnEscape: options.${escapeProp} !== false,`);
    }
    if (outsideProp) {
      lines.push(
        `    closeOnOutsideClick: options.${outsideProp} !== false,`,
      );
    }
    lines.push(`  });`, ``);
  }

  // Focus trap
  if (bindings.useFocusTrap) {
    const channel = bindings.useControllableState.find(
      (c) => c.isDisclosureChannel,
    );
    const activeExpr = blockingExpr(ir, channel ? channel.name : "true");
    lines.push(`  useFocusTrap(panelRef, {`);
    lines.push(`    active: ${activeExpr},`);
    for (const { target, prop } of focusTargetProps(ir)) {
      lines.push(`    ${target}: options.${prop},`);
    }
    lines.push(`  });`, ``);
  }

  // Scroll lock
  if (bindings.useScrollLock) {
    const channel = bindings.useControllableState.find(
      (c) => c.isDisclosureChannel,
    );
    lines.push(`  useScrollLock(${blockingExpr(ir, channel?.name ?? "true")});`);
    lines.push(``);
  }

  // Portal
  if (bindings.usePortal) {
    const targetProp = ir.behavior.portal?.targetProp;
    const target = targetProp ? `options.${targetProp}` : "undefined";
    lines.push(`  const portal = usePortal({`);
    lines.push(`    enabled: true,`);
    if (target !== "undefined") lines.push(`    target: ${target},`);
    lines.push(`  });`, ``);
  }

  // Compound-state-container (Tabs-shaped) wiring
  if (bindings.isCompoundStateContainer) {
    lines.push(`  const [registeredTabs, setRegisteredTabs] = useState<string[]>([]);`);
    lines.push(``);
    lines.push(`  const generatedId = useId();`);
    lines.push(`  const resolvedIdBase = options.idBase ?? generatedId;`);
    lines.push(``);
    lines.push(`  const registerTab = useCallback((value: string) => {`);
    lines.push(`    setRegisteredTabs((prev) =>`);
    lines.push(`      prev.includes(value) ? prev : [...prev, value],`);
    lines.push(`    );`);
    lines.push(`  }, []);`);
    lines.push(``);
    lines.push(`  const unregisterTab = useCallback((value: string) => {`);
    lines.push(`    setRegisteredTabs((prev) => prev.filter((v) => v !== value));`);
    lines.push(`  }, []);`);
    lines.push(``);
  }

  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: one keydown handler per hosting part,
  // lowered from ir.keyboardActions and returned for template binding.
  const keyboardHandlerParts: string[] = [];
  if (ir.keyboardActions.length > 0) {
    for (const action of ir.keyboardActions) {
      if (!keyboardHandlerParts.includes(action.part)) {
        keyboardHandlerParts.push(action.part);
      }
    }
    emitKeyboardHandlers(lines, ir, bindings, openChannel, anchorOwnsChannel);
  }

  // Build return object
  lines.push(`  return {`);
  for (const ch of bindings.useControllableState) {
    const setter = `set${capitalize(ch.name)}`;
    if (anchorOwnsChannel && ch === openChannel) {
      lines.push(`    ${ch.name}: anchorToggle.open,`);
      lines.push(`    ${setter}: anchorToggle.setOpen,`);
    } else {
      lines.push(`    ${ch.name},`);
      lines.push(`    ${setter},`);
    }
  }
  if (bindings.useAnchorToggle) {
    lines.push(`    anchorRef: anchorToggle.anchorRef,`);
    lines.push(`    panelRef: anchorToggle.panelRef as RefObject<HTMLDivElement | null>,`);
  } else if (bindings.useFocusTrap || bindings.usePortal) {
    lines.push(`    panelRef,`);
  }
  for (const part of keyboardHandlerParts) {
    lines.push(`    handle${capitalize(part)}Keydown,`);
  }
  if (bindings.usePortal) {
    lines.push(`    renderInPortal: portal.render,`);
  }
  if (bindings.isCompoundStateContainer) {
    lines.push(`    registeredTabs,`);
    lines.push(`    registerTab,`);
    lines.push(`    unregisterTab,`);
    lines.push(`    idBase: resolvedIdBase,`);
  }
  lines.push(`  };`);
  lines.push(`}`);
  return lines.join("\n");
}

function defaultExprFor(
  ir: ComponentIR,
  defaultProp: string | undefined,
  valueType: string,
): string {
  // Source default from the matching hook member if available.
  if (defaultProp) {
    const member = findHookProp(ir, defaultProp);
    if (member?.defaultExpr) return member.defaultExpr;
  }
  if (valueType === "boolean") return "false";
  if (valueType === "number") return "0";
  if (valueType === "string") return '""';
  return "undefined as never";
}

function capitalize(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

/**
 * Generate the full `use<Name>.ts` source for a component IR. Returns
 * `null` when the contract has no behavior worth lifting.
 */
export function generateReactHookSource(ir: ComponentIR): string | null {
  // Presence-surface family: substrate is imported directly by the
  // generated component file; no per-component hook is emitted. Kind-aware:
  // non-anchored kinds (dialog, sheet, toast) keep their behavior hooks.
  if (isSurfaceComponent(ir)) return null;
  const bindings = resolveBindings(ir);
  if (!bindings) return null;

  const importsBody = generateImports(ir, bindings);
  const inlineTypesBody = generateInlineTypes(ir, bindings);
  const optionsBody = generateOptionsInterface(ir, bindings);
  const resultBody = generateResultInterface(ir, bindings);
  const hookBody = generateBody(ir, bindings);

  const typesBody = [inlineTypesBody, optionsBody, resultBody]
    .filter((s) => s.length > 0)
    .join("\n\n");

  const blank = (): Section => ({ kind: "between", body: "" });
  const sections: Section[] = [
    { kind: "generated", id: "imports", body: importsBody },
    blank(),
    { kind: "custom", id: "imports", body: "" },
    blank(),
    { kind: "generated", id: "types", body: typesBody },
    blank(),
    { kind: "custom", id: "types", body: "" },
    blank(),
    { kind: "generated", id: "hook", body: hookBody },
    blank(),
    { kind: "custom", id: "trailing", body: "" },
    blank(),
  ];

  return renderSections(sections, "line");
}
