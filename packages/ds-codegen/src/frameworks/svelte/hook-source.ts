import { selectionChangeHandler } from "../selection-dismissal.js";
/**
 * Svelte 5 behavior file emitter — the framework-equivalent of
 * `frameworks/vue/hook-source.ts`. Produces a `use<Name>.svelte.ts` file
 * that composes Svelte-side primitives from `@full-stack-ds/svelte`.
 *
 * The `.svelte.ts` extension tells the Svelte compiler that this non-component
 * file uses Svelte 5 runes ($state, $derived, $effect). Output uses plain
 * object getters for reactivity rather than Vue's `Ref<T>`.
 *
 * Dispatches on the same `ir.behavior.normalized*` fields as Vue/React,
 * proving the IR is framework-neutral.
 */
import type { ComponentIR, KeyboardActionIR, NormalizedChannelIR } from "../../ir.js";
import {
  keyboardHandlerParts,
  keyboardModeGateProps,
  focusTargetProps,
  resolveInitialFocusSelector,
  resolveRovingItemSelector,
} from "../../ir.js";
import { renderSections, type Section } from "../../preserve.js";
import { isCompoundStateContainer, isDisclosureContainer } from "../react/hook-source.js";

interface PrimitiveBindings {
  useControllableState: NormalizedChannelIR[];
  useFocusTrap: boolean;
  useScrollLock: boolean;
  usePortal: boolean;
  useAnchorToggle: boolean;
  /** Standalone Escape dismissal for trap-focus components (Modal). */
  useDismissal: boolean;
  /** Prop name that gates Escape dismissal (e.g. closeOnEscape). */
  escapeEnabledByProp: string | undefined;
  /** True when the IR matches the compound-state-container (Tabs-shaped) pattern. */
  isCompoundStateContainer: boolean;
}

/**
 * Identical dispatch logic to the Vue hook emitter — the IR is
 * framework-neutral so the same heuristics apply.
 */
/**
 * The surface's blocking condition: its openness, ANDed with the modality
 * gate prop when the contract declares one (`surface.modalityProp`). An
 * omitted prop reads as the contract default.
 */
function blockingGetter(ir: ComponentIR, openExpr: string): string {
  const gate = ir.surface?.modalityGate;
  if (!gate) return `() => ${openExpr}`;
  const modal = `(opts.${gate.prop}?.() ?? ${gate.defaultModal})`;
  return openExpr === "true" ? `() => ${modal}` : `() => ${openExpr} && ${modal}`;
}

function resolveBindings(ir: ComponentIR): PrimitiveBindings | null {
  const channels = ir.behavior.normalizedChannels;
  const focus = ir.behavior.focus;
  const triggers = ir.behavior.normalizedDismissalTriggers;

  const hasFocusTrap = focus?.strategy === "trap";
  const hasScrollLock = focus?.scrollLock === true;
  // FIX-PORTAL-CONSUMPTION-01: no generated Svelte component reads the
  // portal target (no portal action/mount is emitted), so every portalTarget
  // the hook emitted was dead scaffolding. Suppressed for all Svelte
  // components. React (the only framework with a consumer) gates on
  // portalsRootToBody; the cross-framework portal path is a successor feature.
  const hasPortal = false;
  const escapeTrigger = triggers.find((t) => t.event === "escape");
  const hasEscape = escapeTrigger !== undefined;
  const hasOutsideClick = triggers.some(
    (t) => t.event === "outsideClick" || t.event === "overlayClick",
  );
  // AnchorToggle requires a boolean "open" channel. Components like
  // Walkthrough that have only a numeric step-index channel fall through
  // to standalone Dismissal.
  const hasBooleanOpenChannel = channels.some(
    (c) => c.isDisclosureChannel,
  );
  const useAnchor =
    !hasFocusTrap && (hasEscape || hasOutsideClick) && hasBooleanOpenChannel;
  // Standalone dismissal for trap-focus components: outside-click is handled
  // template-side (overlay onClick), so only Escape needs a document listener.
  const useDismissal = !useAnchor && hasEscape;
  const compoundContainer =
    isCompoundStateContainer(ir) && !isDisclosureContainer(ir);

  if (
    channels.length === 0 &&
    !hasFocusTrap &&
    !hasScrollLock &&
    !hasPortal &&
    !useAnchor &&
    !useDismissal &&
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
    useDismissal,
    escapeEnabledByProp: escapeTrigger?.enabledByProp,
    isCompoundStateContainer: compoundContainer,
  };
}

function generateImports(
  bindings: PrimitiveBindings,
  isDisclosure: boolean,
): string {
  const primitives: string[] = [];
  if (bindings.useControllableState.length > 0)
    primitives.push("createControllableState");
  if (bindings.useFocusTrap) primitives.push("createFocusTrap");
  if (bindings.useScrollLock) primitives.push("createScrollLock");
  if (bindings.usePortal) primitives.push("createPortal");
  if (bindings.useAnchorToggle) primitives.push("createAnchorToggle");
  if (bindings.useDismissal) primitives.push("createDismissal");
  if (bindings.isCompoundStateContainer) primitives.push("createCompoundContext");
  if (isDisclosure) primitives.push("createCompoundContext");

  if (primitives.length === 0) return "";
  return `import { ${primitives.sort().join(", ")} } from "../../primitives/index.js";`;
}

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

function generateOptionsInterface(
  ir: ComponentIR,
  bindings: PrimitiveBindings,
): string {
  const lines: string[] = [`export interface Use${ir.name}Options {`];

  for (const ch of bindings.useControllableState) {
    const t = ch.valueType ?? "unknown";
    // Svelte 5: ALL prop fields are getter-shaped so $state/$derived
    // reactivity flows through prop updates. Consumer pattern:
    // useX({ checked: () => checkedProp, onChange: () => onChangeProp, ... }).
    lines.push(`  ${ch.valueProp}?: () => ${t} | undefined;`);
    if (ch.defaultValueProp)
      lines.push(`  ${ch.defaultValueProp}?: () => ${t} | undefined;`);
    lines.push(
      `  ${ch.changeHandlerProp}?: () => ((value: ${t}) => void) | undefined;`,
    );
  }

  for (const t of ir.behavior.normalizedDismissalTriggers) {
    if (!t.enabledByProp) continue;
    lines.push(`  ${t.enabledByProp}?: () => boolean | undefined;`);
  }

  if (bindings.usePortal) {
    const targetProp = ir.behavior.portal?.targetProp;
    if (targetProp) lines.push(`  ${targetProp}?: Element | string;`);
  }

  if (bindings.isCompoundStateContainer) {
    lines.push(`  /** Base string for generating tab and panel IDs. Defaults to a generated id. */`);
    lines.push(`  idBase?: string | (() => string | undefined);`);
  }

  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: getter-shaped mode gates so the select
  // handler reads the live gate on every keydown.
  for (const gate of keyboardModeGateProps(ir)) {
    lines.push(`  /** Mode gate the keyboard select behavior reads. */`);
    lines.push(`  ${gate}?: () => boolean | undefined;`);
  }
  for (const { prop } of focusTargetProps(ir)) {
    lines.push(`  ${prop}?: () => string | undefined;`);
  }

  const modalityGate = ir.surface?.modalityGate;
  if (modalityGate) {
    lines.push(`  /** When false the surface is non-blocking: no focus trap, no scroll lock. */`);
    lines.push(`  ${modalityGate.prop}?: () => boolean | undefined;`);
  }

  lines.push(`}`);
  return lines.join("\n");
}

function generateResultInterface(
  ir: ComponentIR,
  bindings: PrimitiveBindings,
): string {
  const lines: string[] = [`export interface Use${ir.name}Result {`];

  for (const ch of bindings.useControllableState) {
    const t = ch.valueType ?? "unknown";
    const setter = `set${capitalize(ch.name)}`;
    // Svelte 5: expose as readonly getter (plain value, not Ref)
    lines.push(`  readonly ${ch.name}: ${t};`);
    lines.push(`  ${setter}(next: ${t}): void;`);
  }

  if (
    bindings.useFocusTrap ||
    bindings.usePortal ||
    bindings.useAnchorToggle ||
    bindings.useDismissal
  ) {
    lines.push(`  panelRef: { el: HTMLElement | null };`);
  }
  if (bindings.useAnchorToggle) {
    lines.push(`  anchorRef: { el: HTMLElement | null };`);
  }

  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: one keydown handler per hosting part.
  // The composite item handler carries the item value, mirroring its click.
  for (const part of keyboardHandlerParts(ir)) {
    const isItemPart = ir.compositeControl?.part.name === part;
    lines.push(
      isItemPart
        ? `  handle${capitalize(part)}Keydown: (event: KeyboardEvent, value: string) => void;`
        : `  handle${capitalize(part)}Keydown: (event: KeyboardEvent) => void;`,
    );
  }
  if (bindings.usePortal) {
    lines.push(`  readonly portalTarget: Element | null;`);
  }

  if (bindings.isCompoundStateContainer) {
    lines.push(`  /** DOM-order list of registered tab values. */`);
    lines.push(`  readonly registeredTabs: string[];`);
    lines.push(`  registerTab: (value: string) => void;`);
    lines.push(`  unregisterTab: (value: string) => void;`);
    lines.push(`  /** Base string for generating tab and panel IDs. */`);
    lines.push(`  idBase: string;`);
  }

  lines.push(`}`);
  return lines.join("\n");
}

/**
 * Generate the `${Name}ContextValue` interface + `provide${Name}Context` /
 * `use${Name}Context` pair for compound-state-container IRs.
 * These live in the hook source file so all sub-SFCs import from one leaf.
 */
function generateCompoundContextTypes(ir: ComponentIR): string {
  const name = ir.name;
  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "activeTab";
  const channelType = channel?.valueType ?? "string";
  const setterName = `set${capitalize(channelName)}`;

  return [
    `export interface ${name}ContextValue {`,
    `  readonly ${channelName}: ${channelType};`,
    `  ${setterName}: (value: ${channelType}) => void;`,
    `  registerTab: (value: string) => void;`,
    `  unregisterTab: (value: string) => void;`,
    `  readonly registeredTabs: string[];`,
    `  idBase: string;`,
    `  orientation: "horizontal" | "vertical";`,
    `  activationMode: "automatic" | "manual";`,
    `  loop: boolean;`,
    `  unmountInactive: boolean;`,
    `}`,
    ``,
    `const _${name.toLowerCase()}Context = createCompoundContext<${name}ContextValue>("${name}");`,
    ``,
    `export function provide${name}Context(value: ${name}ContextValue): void {`,
    `  _${name.toLowerCase()}Context.provide(value);`,
    `}`,
    ``,
    `export function use${name}Context(): ${name}ContextValue {`,
    `  return _${name.toLowerCase()}Context.consume();`,
    `}`,
  ].join("\n");
}

const keyGuardFor = (keys: string[]): string =>
  keys.map((k) => `event.key === ${JSON.stringify(k)}`).join(" || ");

/** Lower the open op: reveal the disclosure, then land focus in the panel. */
function emitSvelteOpenKeydownBody(
  lines: string[],
  ir: ComponentIR,
  bindings: PrimitiveBindings,
  part: string,
  openChannel: NormalizedChannelIR | undefined,
  anchorOwnsChannel: boolean,
  itemSelector: string | undefined,
  initialSelector: string | undefined,
): void {
  const actions = ir.keyboardActions.filter((a) => a.part === part);
  if (!openChannel || openChannel.valueType !== "boolean") {
    throw new Error(
      `Component "${ir.name}": keyboard "open" behavior on part "${part}" requires a boolean disclosure channel.`,
    );
  }
  const setter = anchorOwnsChannel
    ? "anchorToggle.setOpen"
    : `${openChannel.name}State.set`;
  const panelRef = bindings.useAnchorToggle
    ? "anchorToggle.panelRef.el"
    : bindings.useFocusTrap || bindings.usePortal || bindings.useDismissal
      ? "panelRef.el"
      : undefined;
  if (!panelRef) {
    throw new Error(
      `Component "${ir.name}": keyboard "open" behavior on part "${part}" requires a panel ref (anchor-toggle or focus-trap binding) to receive focus.`,
    );
  }
  const keys = actions.map((a) => a.key);
  const focusTargetExpr = initialSelector
    ? itemSelector
      ? `(${panelRef}.querySelector<HTMLElement>(${JSON.stringify(initialSelector)}) ?? ${panelRef}.querySelector<HTMLElement>(${JSON.stringify(itemSelector)}))?.focus();`
      : `${panelRef}.querySelector<HTMLElement>(${JSON.stringify(initialSelector)})?.focus();`
    : itemSelector
      ? `${panelRef}.querySelector<HTMLElement>(${JSON.stringify(itemSelector)})?.focus();`
      : `${panelRef}.focus();`;
  lines.push(`    if (!(${keyGuardFor(keys)})) return;`);
  lines.push(`    event.preventDefault();`);
  lines.push(`    ${setter}(true);`);
  lines.push(`    requestAnimationFrame(() => {`);
  lines.push(`      if (!${panelRef}) return;`);
  lines.push(`      ${focusTargetExpr}`);
  lines.push(`    });`);
}

/** Lower the roving-* ops: move DOM focus within the queried item set. */
function emitSvelteRovingKeydownBody(
  lines: string[],
  ir: ComponentIR,
  part: string,
  itemSelector: string,
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
  // The DOM KeyboardEvent types currentTarget as `EventTarget | null`; the
  // template binds this handler only on the declared host part, so the
  // element view is asserted here once, at the query site.
  lines.push(`    const items = Array.from(`);
  lines.push(`      (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(${JSON.stringify(itemSelector)}),`);
  lines.push(`    );`);
  lines.push(`    const currentIndex = items.findIndex((item) => item === document.activeElement);`);
  const actions = ir.keyboardActions.filter((a) => a.part === part);
  actions.forEach((action, i) => {
    const keyword = i === 0 ? "if" : "else if";
    lines.push(`    ${keyword} (event.key === ${JSON.stringify(action.key)}) {`);
    lines.push(`      event.preventDefault();`);
    lines.push(`      items[${indexExpr(action.op)}]?.focus();`);
    lines.push(`    }`);
  });
}

/** Lower the select op: run the item's click activation from the keyboard. */
function emitSvelteSelectKeydownBody(
  lines: string[],
  ir: ComponentIR,
  bindings: PrimitiveBindings,
  part: string,
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
  const stateVar = `${channel.name}State`;
  const current = `Array.isArray(${stateVar}.value) ? ${stateVar}.value : ${stateVar}.value == null ? [] : [${stateVar}.value]`;
  const modeGates = keyboardModeGateProps(ir);
  const gate = modeGates.length > 0 ? `opts.${modeGates[0]}?.()` : undefined;
  const keys = ir.keyboardActions
    .filter((a) => a.part === part && a.op === "select")
    .map((a) => a.key);
  lines.push(`    if (!(${keyGuardFor(keys)})) return;`);
  lines.push(`    event.preventDefault();`);
  lines.push(`    const current = ${current};`);
  lines.push(
    gate
      ? `    ${stateVar}.set(${gate} ? (current.includes(value) ? current.filter((member) => member !== value) : [...current, value]) : value);`
      : `    ${stateVar}.set(current.includes(value) ? current.filter((member) => member !== value) : [...current, value]);`,
  );
}

/**
 * FEAT-A11Y-COMPOSITE-KEYBOARD-01: lower the IR's keyboard actions into one
 * plain function per hosting part (runes files take plain functions, not
 * memoized callbacks). Dispatch mirrors the React hook emitter: select op →
 * the composite activation; roving-* ops → focus movement over the item
 * selector; otherwise the open op → reveal + post-open focus. Every
 * realization fails loud on a missing IR precondition rather than emitting
 * a handler that silently no-ops.
 */
function emitSvelteKeyboardHandlerFunctions(
  lines: string[],
  ir: ComponentIR,
  bindings: PrimitiveBindings,
  openChannel: NormalizedChannelIR | undefined,
  anchorOwnsChannel: boolean,
): void {
  if (ir.keyboardActions.length === 0) return;
  const itemSelector = resolveRovingItemSelector(ir);
  const initialSelector = resolveInitialFocusSelector(ir);

  // Hosting parts in first-declaration order; the return object and the
  // template's handler bindings use the same order.
  const parts: string[] = [];
  for (const action of ir.keyboardActions) {
    if (!parts.includes(action.part)) parts.push(action.part);
  }

  for (const part of parts) {
    const ident = `handle${capitalize(part)}Keydown`;
    const actions = ir.keyboardActions.filter((a) => a.part === part);
    const isItemPart = ir.compositeControl?.part.name === part;
    const param = isItemPart
      ? `event: KeyboardEvent, value: string`
      : `event: KeyboardEvent`;
    lines.push(`  function ${ident}(${param}): void {`);
    if (actions.some((a) => a.op === "select")) {
      emitSvelteSelectKeydownBody(lines, ir, bindings, part);
    } else if (actions.every((a) => a.op.startsWith("roving-"))) {
      if (!itemSelector) {
        throw new Error(
          `Component "${ir.name}": keyboard roving behavior on part "${part}" requires a composite item part to derive the roving item selector.`,
        );
      }
      emitSvelteRovingKeydownBody(lines, ir, part, itemSelector);
    } else {
      emitSvelteOpenKeydownBody(
        lines,
        ir,
        bindings,
        part,
        openChannel,
        anchorOwnsChannel,
        itemSelector,
        initialSelector,
      );
    }
    lines.push(`  }`);
    lines.push(``);
  }
}

function generateBody(ir: ComponentIR, bindings: PrimitiveBindings): string {
  const lines: string[] = [];
  lines.push(
    `export function use${ir.name}(opts: Use${ir.name}Options = {}): Use${ir.name}Result {`,
  );

  // `openChannel` must be the boolean/"open" channel when AnchorToggle is
  // present — Select-like components declare a selection channel first, and
  // wiring AnchorToggle to that mis-types it.
  const openChannel =
    bindings.useControllableState.find(
      (c) => c.isDisclosureChannel,
    ) ?? bindings.useControllableState[0];
  const anchorOwnsChannel =
    bindings.useAnchorToggle &&
    !!openChannel &&
    openChannel.valueType === "boolean";

  for (const ch of bindings.useControllableState) {
    if (anchorOwnsChannel && ch === openChannel) continue;
    const varName = `${ch.name}State`;
    const t = ch.valueType ?? "unknown";
    const def = defaultExprFor(ch.defaultValueProp, t);
    const defaultExpr = ch.defaultValueProp
      ? `opts.${ch.defaultValueProp}?.() ?? ${def}`
      : def;
    lines.push(`  const ${varName} = createControllableState<${t}>({`);
    // opts.<valueProp> is itself a getter; pass it directly.
    lines.push(`    controlled: opts.${ch.valueProp},`);
    lines.push(`    defaultValue: ${defaultExpr},`);
    // opts.<changeHandlerProp> is a getter — invoke per-change to read latest fn.
    const selectionHandler = bindings.useAnchorToggle ? selectionChangeHandler(ir, ch.name, `opts.${ch.changeHandlerProp}?.()?.`, name => `opts.${name}?.()`, "anchorToggle.setOpen(false)", "anchorToggle.anchorRef.el?.focus()") : undefined;
    lines.push(`    onChange: ${selectionHandler ?? `(v) => opts.${ch.changeHandlerProp}?.()?.(v)`},`);
    lines.push(`  });`);
    lines.push(``);
  }

  if (bindings.useAnchorToggle && openChannel) {
    // Only pass defaultOpen when the contract declares a
    // defaultValueProp on the channel. The previous fallback to
    // `opts.defaultOpen?.()` referenced a field that wasn't in the
    // generated UseXOptions interface, producing svelte-check
    // admission errors (Toast: "Property 'defaultOpen' does not
    // exist on type 'UseToastOptions'.").
    const defaultOpenLine = openChannel.defaultValueProp
      ? `    defaultOpen: opts.${openChannel.defaultValueProp}?.() ?? false,\n`
      : "";
    lines.push(
      `  const anchorToggle = createAnchorToggle({`,
      `    open: opts.${openChannel.valueProp},`,
      ...(defaultOpenLine ? [defaultOpenLine.replace(/\n$/, "")] : []),
      `    onOpenChange: (v) => opts.${openChannel.changeHandlerProp}?.()?.(v),`,
      `  });`,
      ``,
    );
  }

  // panelRef for focus trap, portal, or dismissal-only components
  if (bindings.useFocusTrap || bindings.usePortal || bindings.useDismissal) {
    lines.push(`  const panelRef = { el: null as HTMLElement | null };`);
  }

  if (bindings.useFocusTrap) {
    const channel = bindings.useControllableState.find(
      (c) => c.isDisclosureChannel,
    );
    const activeGetter = blockingGetter(
      ir,
      channel ? `${channel.name}State.value` : "true",
    );
    lines.push(
      `  createFocusTrap({ getActive: ${activeGetter}, containerRef: panelRef,`,
      ...focusTargetProps(ir).map(({ target, prop }) =>
        `    get${capitalize(target)}: opts.${prop},`),
      `  });`,
    );
    lines.push(``);
  }

  if (bindings.useScrollLock) {
    const channel = bindings.useControllableState.find(
      (c) => c.isDisclosureChannel,
    );
    const activeGetter = blockingGetter(
      ir,
      channel ? `${channel.name}State.value` : "true",
    );
    lines.push(`  createScrollLock(${activeGetter});`);
    lines.push(``);
  }

  if (bindings.usePortal) {
    const targetProp = ir.behavior.portal?.targetProp;
    const target = targetProp ? `() => opts.${targetProp}` : "() => undefined";
    lines.push(`  const portal = createPortal({`);
    lines.push(`    enabled: true,`);
    lines.push(`    target: ${target},`);
    lines.push(`  });`);
    lines.push(``);
  }

  if (bindings.useDismissal) {
    const channel = bindings.useControllableState.find(
      (c) => c.isDisclosureChannel,
    );
    const openGetter = channel
      ? `() => ${channel.name}State.value`
      : `() => true`;
    const setterCall = channel
      ? `${channel.name}State.set(false)`
      : `void 0`;
    // opts.<escapeEnabledByProp> is itself a getter; pass it directly.
    const closeOnEscapeGetter = bindings.escapeEnabledByProp
      ? `opts.${bindings.escapeEnabledByProp}`
      : `() => true`;
    lines.push(`  createDismissal({`);
    lines.push(`    open: ${openGetter},`);
    lines.push(`    closeOnEscape: ${closeOnEscapeGetter},`);
    lines.push(`    onDismiss: () => { ${setterCall}; },`);
    lines.push(`  });`);
    lines.push(``);
  }

  if (bindings.isCompoundStateContainer) {
    const lowerName = ir.name.toLowerCase();
    lines.push(`  let _registeredTabs = $state<string[]>([]);`);
    lines.push(``);
    lines.push(`  const rawIdBase = typeof opts.idBase === "function" ? opts.idBase() : opts.idBase;`);
    lines.push(`  const resolvedIdBase = rawIdBase ?? \`${lowerName}-\${++_${lowerName}IdCounter}\`;`);
    lines.push(``);
    lines.push(`  function registerTab(value: string): void {`);
    lines.push(`    if (!_registeredTabs.includes(value)) {`);
    lines.push(`      _registeredTabs = [..._registeredTabs, value];`);
    lines.push(`    }`);
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  function unregisterTab(value: string): void {`);
    lines.push(`    _registeredTabs = _registeredTabs.filter((v) => v !== value);`);
    lines.push(`  }`);
    lines.push(``);
  }

  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: one plain function per hosting part,
  // emitted after every primitive it closes over.
  emitSvelteKeyboardHandlerFunctions(lines, ir, bindings, openChannel, anchorOwnsChannel);

  // Build return object
  lines.push(`  return {`);
  for (const ch of bindings.useControllableState) {
    const setter = `set${capitalize(ch.name)}`;
    if (anchorOwnsChannel && ch === openChannel) {
      lines.push(
        `    get ${ch.name}() { return anchorToggle.open; },`,
      );
      lines.push(`    ${setter}(v) { anchorToggle.setOpen(v); },`);
    } else {
      const varName = `${ch.name}State`;
      lines.push(`    get ${ch.name}() { return ${varName}.value; },`);
      lines.push(`    ${setter}(v) { ${varName}.set(v); },`);
    }
  }
  if (bindings.useAnchorToggle) {
    lines.push(`    anchorRef: anchorToggle.anchorRef,`);
    lines.push(`    panelRef: anchorToggle.panelRef,`);
  } else if (
    bindings.useFocusTrap ||
    bindings.usePortal ||
    bindings.useDismissal
  ) {
    lines.push(`    panelRef,`);
  }
  if (bindings.usePortal) {
    lines.push(`    get portalTarget() { return portal.target; },`);
  }
  if (bindings.isCompoundStateContainer) {
    lines.push(`    get registeredTabs() { return _registeredTabs; },`);
    lines.push(`    registerTab,`);
    lines.push(`    unregisterTab,`);
    lines.push(`    idBase: resolvedIdBase,`);
  }
  for (const part of keyboardHandlerParts(ir)) {
    lines.push(`    handle${capitalize(part)}Keydown,`);
  }
  lines.push(`  };`);
  lines.push(`}`);
  return lines.join("\n");
}

function defaultExprFor(
  _defaultProp: string | undefined,
  valueType: string,
): string {
  if (valueType === "boolean") return "false";
  if (valueType === "number") return "0";
  if (valueType === "string") return '""';
  return "undefined as never";
}

function capitalize(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

/**
 * Disclosure (Accordion-shaped) context: openness channel + per-item toggle
 * helpers + type/collapsible/disabled/idBase. One shared context leaf so all
 * sub-SFCs consume the same symbol. No tab register/idBase counter.
 */
function generateDisclosureContextTypes(ir: ComponentIR): string {
  const name = ir.name;
  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "openness";
  return [
    `export interface ${name}ContextValue {`,
    `  readonly ${channelName}: string | string[];`,
    `  toggleItem: (value: string) => void;`,
    `  isItemOpen: (value: string) => boolean;`,
    `  type: "single" | "multiple";`,
    `  collapsible: boolean;`,
    `  disabled: boolean;`,
    `  idBase: string;`,
    `}`,
    ``,
    `const _${name.toLowerCase()}Context = createCompoundContext<${name}ContextValue>("${name}");`,
    ``,
    `export function provide${name}Context(value: ${name}ContextValue): void {`,
    `  _${name.toLowerCase()}Context.provide(value);`,
    `}`,
    ``,
    `export function use${name}Context(): ${name}ContextValue {`,
    `  return _${name.toLowerCase()}Context.consume();`,
    `}`,
  ].join("\n");
}

export function generateSvelteHookSource(ir: ComponentIR): string | null {
  const bindings = resolveBindings(ir);
  if (!bindings) return null;

  const isDisclosure = isDisclosureContainer(ir);
  const importsBody = generateImports(bindings, isDisclosure);
  const inlineTypesBody = generateInlineTypes(ir, bindings);
  const optionsBody = generateOptionsInterface(ir, bindings);
  const resultBody = generateResultInterface(ir, bindings);

  // For compound-state-container IRs, also emit the context type + helpers.
  const compoundContextBody = bindings.isCompoundStateContainer
    ? generateCompoundContextTypes(ir)
    : isDisclosure
      ? generateDisclosureContextTypes(ir)
      : "";

  const hookBody = generateBody(ir, bindings);

  // Module-level counter for stable idBase generation per compound instance.
  // Emitted as part of the hook block so it stays in the @generated:hook region.
  const counterLine = bindings.isCompoundStateContainer
    ? `let _${ir.name.toLowerCase()}IdCounter = 0;\n\n`
    : "";
  const fullHookBody = counterLine + hookBody;

  const typesBodyParts = [inlineTypesBody, optionsBody, resultBody, compoundContextBody]
    .filter((s) => s.length > 0);
  const typesBody = typesBodyParts.join("\n\n");

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
    { kind: "generated", id: "hook", body: fullHookBody },
    blank(),
    { kind: "custom", id: "trailing", body: "" },
    blank(),
  ];

  return renderSections(sections, "line");
}
