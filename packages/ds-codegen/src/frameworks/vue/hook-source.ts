import { selectionChangeHandler } from "../selection-dismissal.js";
/**
 * Vue 3 composable emitter — the framework-equivalent of
 * `frameworks/react/hook-source.ts`. Produces a `useX.ts` file that
 * composes Vue-side primitives shipped from `@full-stack-ds/vue`.
 *
 * Dispatches on the same `ir.behavior.normalized*` fields as React,
 * proving the IR is framework-neutral. The output shape uses Vue's
 * Composition API: `Ref<T>` for state, `computed`-style getters
 * exposed through plain functions, refs returned as `Ref<HTMLElement | null>`.
 *
 * For compound-state-container IRs (Tabs-shaped), the emitter also
 * generates the `TabsContextValue` interface and the shared
 * `[provideTabsContext, useTabsContext]` pair so all sub-component SFCs
 * can import from the same module (matching the idBase counter pattern).
 */
import {
  type ComponentIR,
  type KeyboardActionIR,
  type NormalizedChannelIR,
  type SurfaceModalityGateIR,
  keyboardHandlerParts,
  keyboardModeGateProps,
  focusTargetProps,
  pickPrimaryDisclosureChannel,
  resolveInitialFocusSelector,
  resolveRovingItemSelector,
} from "../../ir.js";
import { renderSections, type Section } from "../../preserve.js";
import {
  isCompoundStateContainer,
  isDisclosureContainer,
} from "../react/hook-source.js";

interface PrimitiveBindings {
  useControllableState: NormalizedChannelIR[];
  useFocusTrap: boolean;
  modalityGate: SurfaceModalityGateIR | undefined;
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

function resolveBindings(ir: ComponentIR): PrimitiveBindings | null {
  const channels = ir.behavior.normalizedChannels;
  const focus = ir.behavior.focus;
  const triggers = ir.behavior.normalizedDismissalTriggers;

  const hasFocusTrap = focus?.strategy === "trap";
  const hasScrollLock = focus?.scrollLock === true;
  // FIX-PORTAL-CONSUMPTION-01: the Vue component emitter has NO portal
  // consumption path — no generated component emits <Teleport> or otherwise
  // reads portalTarget, so every portalTarget the hook emitted was dead
  // scaffolding. Suppressed for all Vue components. React (the only
  // framework with a consumer) gates on portalsRootToBody in its own hook
  // emitter; the cross-framework <Teleport> path (and the anchored
  // coordinate machinery it needs) is an explicit successor feature.
  const hasPortal = false;
  const escapeTrigger = triggers.find((t) => t.event === "escape");
  const hasEscape = escapeTrigger !== undefined;
  const hasOutsideClick = triggers.some(
    (t) => t.event === "outsideClick" || t.event === "overlayClick",
  );
  // AnchorToggle needs a boolean "open" state to bind. Non-boolean channels
  // (Walkthrough's step index) fall through to standalone Dismissal.
  const hasBooleanOpenChannel = channels.some(
    (c) => c.isDisclosureChannel,
  );
  const useAnchor =
    !hasFocusTrap && (hasEscape || hasOutsideClick) && hasBooleanOpenChannel;
  // Standalone dismissal: when the anchor-toggle pattern doesn't apply but
  // the contract still declares Escape (e.g. Modal with focus.strategy=trap).
  // Outside-click for trap-focus components is handled at the template layer
  // (overlay onClick), not document-level, so we only wire Escape here.
  const useDismissal = !useAnchor && hasEscape;
  // Disclosure containers (Accordion) do not use tab-hook machinery.
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
    modalityGate: ir.surface?.modalityGate,
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
  const vueNamed = new Set<string>();
  if (
    bindings.useFocusTrap ||
    bindings.usePortal ||
    bindings.useAnchorToggle ||
    bindings.useDismissal
  ) {
    vueNamed.add("ref");
    vueNamed.add("type Ref");
  }
  // Channel state always surfaces in the result interface as Ref<T> (see
  // line 144), so the `Ref` type must be importable whenever there are
  // controllable channels — even without focus/portal/anchor primitives.
  if (bindings.useControllableState.length > 0) {
    vueNamed.add("type Ref");
  }
  if (bindings.modalityGate && (bindings.useFocusTrap || bindings.useScrollLock)) {
    vueNamed.add("computed");
  }
  if (bindings.isCompoundStateContainer) {
    vueNamed.add("ref");
    vueNamed.add("type Ref");
  }

  const primitives: string[] = [];
  if (bindings.useControllableState.length > 0)
    primitives.push("useControllableState");
  if (bindings.useFocusTrap) primitives.push("useFocusTrap");
  if (bindings.useScrollLock) primitives.push("useScrollLock");
  if (bindings.usePortal) primitives.push("usePortal");
  if (bindings.useAnchorToggle) primitives.push("useAnchorToggle");
  if (bindings.useDismissal) primitives.push("useDismissal");
  if (bindings.isCompoundStateContainer) primitives.push("createCompoundContext");
  // Disclosure containers (Accordion) share a provide/inject context pair
  // generated in this module so all sub-component SFCs resolve one symbol.
  if (isDisclosure) primitives.push("createCompoundContext");

  const lines: string[] = [];
  if (vueNamed.size > 0) {
    lines.push(`import { ${[...vueNamed].sort().join(", ")} } from "vue";`);
  }
  if (primitives.length > 0) {
    lines.push(
      `import { ${primitives.sort().join(", ")} } from "../../primitives/index.js";`,
    );
  }
  return lines.join("\n");
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
    // Vue: controlled values are getter-shaped so prop reactivity flows through.
    // Consumer pattern: useSwitch({ checked: () => props.checked, ... }).
    lines.push(`  ${ch.valueProp}?: () => ${t} | undefined;`);
    if (ch.defaultValueProp) lines.push(`  ${ch.defaultValueProp}?: ${t};`);
    lines.push(`  ${ch.changeHandlerProp}?: (value: ${t}) => void;`);
  }

  for (const t of ir.behavior.normalizedDismissalTriggers) {
    if (!t.enabledByProp) continue;
    lines.push(`  ${t.enabledByProp}?: boolean;`);
  }

  if (bindings.usePortal) {
    const targetProp = ir.behavior.portal?.targetProp;
    if (targetProp) lines.push(`  ${targetProp}?: Element | string;`);
  }

  if (bindings.isCompoundStateContainer) {
    lines.push(`  /** Base string for generating tab and panel IDs. Defaults to a generated id. */`);
    lines.push(`  idBase?: string;`);
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
    lines.push(`  ${ch.name}: Ref<${t}>;`);
    lines.push(`  ${setter}: (next: ${t}) => void;`);
  }

  if (
    bindings.useFocusTrap ||
    bindings.usePortal ||
    bindings.useAnchorToggle ||
    bindings.useDismissal
  ) {
    lines.push(`  panelRef: Ref<HTMLElement | null>;`);
  }
  if (bindings.useAnchorToggle) {
    lines.push(`  anchorRef: Ref<HTMLElement | null>;`);
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
    lines.push(`  portalTarget: Ref<Element | null>;`);
  }

  if (bindings.isCompoundStateContainer) {
    lines.push(`  /** DOM-order list of registered tab values. */`);
    lines.push(`  registeredTabs: Ref<string[]>;`);
    lines.push(`  registerTab: (value: string) => void;`);
    lines.push(`  unregisterTab: (value: string) => void;`);
    lines.push(`  /** Base string for generating tab and panel IDs. */`);
    lines.push(`  idBase: string;`);
  }

  lines.push(`}`);
  return lines.join("\n");
}

/**
 * Mirror of the React side: pick the boolean open-channel for
 * `useAnchorToggle` to wire. Non-boolean channels (Walkthrough's
 * `step: number`, Select's `value: string|string[]`) are managed by
 * useControllableState independently, never wired into anchor-toggle.
 */
function pickOpenChannel(
  channels: NormalizedChannelIR[],
): NormalizedChannelIR | undefined {
  // Delegates to the IR's structural priority order so the emitter does
  // not maintain its own `c.name === "open"` / `"expanded"` predicate.
  return pickPrimaryDisclosureChannel(channels);
}

const keyGuardFor = (keys: string[]): string =>
  keys.map((k) => `event.key === ${JSON.stringify(k)}`).join(" || ");

/** Lower the open op: reveal the disclosure, then land focus in the panel. */
function emitVueOpenKeydownBody(
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
    : `set${capitalize(openChannel.name)}`;
  const panelRef = bindings.useAnchorToggle
    ? "anchorToggle.panelRef.value"
    : bindings.useFocusTrap || bindings.usePortal || bindings.useDismissal
      ? "panelRef.value"
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
function emitVueRovingKeydownBody(
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
function emitVueSelectKeydownBody(
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
  const current = `Array.isArray(${channel.name}.value) ? ${channel.name}.value : ${channel.name}.value == null ? [] : [${channel.name}.value]`;
  const modeGates = keyboardModeGateProps(ir);
  const gate = modeGates.length > 0 ? `options.${modeGates[0]}?.()` : undefined;
  const setter = `set${capitalize(channel.name)}`;
  const keys = ir.keyboardActions
    .filter((a) => a.part === part && a.op === "select")
    .map((a) => a.key);
  lines.push(`    if (!(${keyGuardFor(keys)})) return;`);
  lines.push(`    event.preventDefault();`);
  lines.push(`    const current = ${current};`);
  lines.push(
    gate
      ? `    ${setter}(${gate} ? (current.includes(value) ? current.filter((member) => member !== value) : [...current, value]) : value);`
      : `    ${setter}(current.includes(value) ? current.filter((member) => member !== value) : [...current, value]);`,
  );
}

/**
 * FEAT-A11Y-COMPOSITE-KEYBOARD-01: lower the IR's keyboard actions into one
 * plain function per hosting part (a composable exposes plain functions, not
 * memoized callbacks). Dispatch mirrors the React hook emitter: select op →
 * the composite activation; roving-* ops → focus movement over the item
 * selector; otherwise the open op → reveal + post-open focus. Every
 * realization fails loud on a missing IR precondition rather than emitting
 * a handler that silently no-ops.
 */
function emitVueKeyboardHandlerFunctions(
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
      emitVueSelectKeydownBody(lines, ir, bindings, part);
    } else if (actions.every((a) => a.op.startsWith("roving-"))) {
      if (!itemSelector) {
        throw new Error(
          `Component "${ir.name}": keyboard roving behavior on part "${part}" requires a composite item part to derive the roving item selector.`,
        );
      }
      emitVueRovingKeydownBody(lines, ir, part, itemSelector);
    } else {
      emitVueOpenKeydownBody(
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

  // Module-level counter for stable idBase generation
  if (bindings.isCompoundStateContainer) {
    lines.push(`let _${ir.name.toLowerCase()}IdCounter = 0;`);
    lines.push(``);
  }

  lines.push(
    `export function use${ir.name}(options: Use${ir.name}Options = {}): Use${ir.name}Result {`,
  );

  const openChannel = pickOpenChannel(bindings.useControllableState);
  const anchorOwnsChannel =
    bindings.useAnchorToggle &&
    !!openChannel &&
    openChannel.valueType === "boolean";

  for (const ch of bindings.useControllableState) {
    if (anchorOwnsChannel && ch === openChannel) continue;
    const setter = `set${capitalize(ch.name)}`;
    const t = ch.valueType ?? "unknown";
    const def = defaultExprFor(ch.defaultValueProp, t);
    const defaultExpr = ch.defaultValueProp
      ? `options.${ch.defaultValueProp} ?? ${def}`
      : def;
    lines.push(
      `  const { value: ${ch.name}, set: ${setter} } = useControllableState<${t}>({`,
    );
    // options.<valueProp> is itself a getter; pass it directly to the
    // controllable-state primitive (it expects `() => T | undefined`).
    lines.push(`    controlled: options.${ch.valueProp},`);
    lines.push(`    defaultValue: ${defaultExpr},`);
    const selectionHandler = bindings.useAnchorToggle ? selectionChangeHandler(ir, ch.name, `options.${ch.changeHandlerProp}?.`, name => `options.${name}?.()`, "anchorToggle.setOpen(false)", "anchorToggle.anchorRef.value?.focus()", name => `options.${name}`) : undefined;
    lines.push(`    onChange: ${selectionHandler ?? `options.${ch.changeHandlerProp}`},`);
    lines.push(`  });`);
    lines.push(``);
  }

  if (bindings.useFocusTrap || bindings.usePortal || bindings.useDismissal) {
    lines.push(`  const panelRef = ref<HTMLElement | null>(null);`);
  }

  if (bindings.useAnchorToggle) {
    lines.push(`  const anchorToggle = useAnchorToggle({`);
    if (openChannel && openChannel.valueType === "boolean") {
      lines.push(`    open: options.${openChannel.valueProp},`);
      if (openChannel.defaultValueProp) {
        lines.push(
          `    defaultOpen: options.${openChannel.defaultValueProp} ?? false,`,
        );
      } else {
        lines.push(`    defaultOpen: false,`);
      }
      lines.push(`    onOpenChange: options.${openChannel.changeHandlerProp},`);
    }
    lines.push(`  });`, ``);
  }

  // The modality gate (surface.modalityProp) folds into one derived ref the
  // focus trap and scroll lock share.
  const gate = bindings.modalityGate;
  const disclosureChannel = bindings.useControllableState.find(
    (c) => c.isDisclosureChannel,
  );
  if (gate && (bindings.useFocusTrap || bindings.useScrollLock)) {
    const openExpr = disclosureChannel ? `${disclosureChannel.name}.value` : "true";
    lines.push(
      `  const blocking = computed(() => ${openExpr} && (options.${gate.prop}?.() ?? ${gate.defaultModal}));`,
    );
  }
  const activeRef = gate
    ? "blocking"
    : disclosureChannel
      ? disclosureChannel.name
      : "ref(true)";

  if (bindings.useFocusTrap) {
    lines.push(`  useFocusTrap(panelRef, {`);
    lines.push(`    active: ${activeRef},`);
    for (const { target, prop } of focusTargetProps(ir)) {
      lines.push(`    ${target}: options.${prop},`);
    }
    lines.push(`  });`);
    lines.push(``);
  }

  if (bindings.useScrollLock) {
    lines.push(`  useScrollLock(${activeRef});`);
    lines.push(``);
  }

  if (bindings.usePortal) {
    const targetProp = ir.behavior.portal?.targetProp;
    const target = targetProp ? `() => options.${targetProp}` : "() => undefined";
    lines.push(`  const { target: portalTarget } = usePortal({`);
    lines.push(`    enabled: true,`);
    lines.push(`    target: ${target},`);
    lines.push(`  });`, ``);
  }

  if (bindings.useDismissal) {
    const channel = bindings.useControllableState.find(
      (c) => c.isDisclosureChannel,
    );
    const openExpr = channel ? `${channel.name}.value` : "true";
    const setterCall = channel
      ? `set${capitalize(channel.name)}(false)`
      : `void 0`;
    const closeOnEscapeExpr = bindings.escapeEnabledByProp
      ? `() => options.${bindings.escapeEnabledByProp}`
      : `() => true`;
    lines.push(`  useDismissal({`);
    lines.push(`    open: () => ${openExpr},`);
    lines.push(`    closeOnEscape: ${closeOnEscapeExpr},`);
    lines.push(`    onDismiss: () => ${setterCall},`);
    lines.push(`  });`, ``);
  }

  // Compound-state-container (Tabs-shaped) wiring
  if (bindings.isCompoundStateContainer) {
    lines.push(`  const registeredTabs = ref<string[]>([]);`);
    lines.push(``);
    lines.push(`  const resolvedIdBase = options.idBase ?? \`${ir.name.toLowerCase()}-\${++_${ir.name.toLowerCase()}IdCounter}\`;`);
    lines.push(``);
    lines.push(`  function registerTab(value: string): void {`);
    lines.push(`    if (!registeredTabs.value.includes(value)) {`);
    lines.push(`      registeredTabs.value = [...registeredTabs.value, value];`);
    lines.push(`    }`);
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  function unregisterTab(value: string): void {`);
    lines.push(`    registeredTabs.value = registeredTabs.value.filter((v) => v !== value);`);
    lines.push(`  }`);
    lines.push(``);
  }

  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: one plain function per hosting part,
  // emitted after every primitive it closes over.
  emitVueKeyboardHandlerFunctions(lines, ir, bindings, openChannel, anchorOwnsChannel);

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
    lines.push(`    panelRef: anchorToggle.panelRef,`);
  } else if (
    bindings.useFocusTrap ||
    bindings.usePortal ||
    bindings.useDismissal
  ) {
    lines.push(`    panelRef,`);
  }
  if (bindings.usePortal) {
    lines.push(`    portalTarget,`);
  }
  if (bindings.isCompoundStateContainer) {
    lines.push(`    registeredTabs,`);
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

function defaultExprFor(_defaultProp: string | undefined, valueType: string): string {
  if (valueType === "boolean") return "false";
  if (valueType === "number") return "0";
  if (valueType === "string") return '""';
  return "undefined as never";
}

function capitalize(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

/**
 * Generate the TabsContextValue interface and shared provide/inject pair
 * that all sub-component SFCs import from the same module.
 *
 * Must be in the same file as useTabs so all sub-components share one
 * symbol instance (a per-file createCompoundContext call would produce a
 * distinct symbol that doesn't match the provided value).
 */
function generateCompoundContextTypes(ir: ComponentIR): string {
  const { name } = ir;
  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "activeTab";
  const setterName = `set${capitalize(channelName)}`;

  const lines: string[] = [];
  lines.push(`export interface ${name}ContextValue {`);
  lines.push(`  ${channelName}: Ref<string>;`);
  lines.push(`  ${setterName}: (value: string) => void;`);
  lines.push(`  registerTab: (value: string) => void;`);
  lines.push(`  unregisterTab: (value: string) => void;`);
  lines.push(`  registeredTabs: Ref<string[]>;`);
  lines.push(`  idBase: string;`);
  lines.push(`  orientation: "horizontal" | "vertical";`);
  lines.push(`  activationMode: "automatic" | "manual";`);
  lines.push(`  loop: boolean;`);
  lines.push(`  unmountInactive: boolean;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(
    `export const [provide${name}Context, use${name}Context] =`,
  );
  lines.push(`  createCompoundContext<${name}ContextValue>("${name}");`);
  return lines.join("\n");
}

/**
 * Disclosure (Accordion-shaped) context: openness channel + per-item toggle
 * helpers + type/collapsible/disabled/idBase. Shares one provide/inject symbol
 * across the root and sub-component SFCs. No tab-style register/idBase counter.
 */
function generateVueDisclosureContextTypes(ir: ComponentIR): string {
  const { name } = ir;
  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "openness";
  const lines: string[] = [];
  lines.push(`export interface ${name}ContextValue {`);
  lines.push(`  ${channelName}: Ref<string | string[]>;`);
  lines.push(`  toggleItem: (value: string) => void;`);
  lines.push(`  isItemOpen: (value: string) => boolean;`);
  lines.push(`  type: "single" | "multiple";`);
  lines.push(`  collapsible: boolean;`);
  lines.push(`  disabled: boolean;`);
  lines.push(`  idBase: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export const [provide${name}Context, use${name}Context] =`);
  lines.push(`  createCompoundContext<${name}ContextValue>("${name}");`);
  return lines.join("\n");
}

export function generateVueHookSource(ir: ComponentIR): string | null {
  const bindings = resolveBindings(ir);
  if (!bindings) return null;

  const isDisclosure = isDisclosureContainer(ir);
  const importsBody = generateImports(bindings, isDisclosure);
  const inlineTypesBody = generateInlineTypes(ir, bindings);
  const optionsBody = generateOptionsInterface(ir, bindings);
  const resultBody = generateResultInterface(ir, bindings);
  const contextTypesBody = bindings.isCompoundStateContainer
    ? generateCompoundContextTypes(ir)
    : isDisclosure
      ? generateVueDisclosureContextTypes(ir)
      : "";
  const hookBody = generateBody(ir, bindings);

  const typesBody = [inlineTypesBody, optionsBody, resultBody, contextTypesBody]
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
