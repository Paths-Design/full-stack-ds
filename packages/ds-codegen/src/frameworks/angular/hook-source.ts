import { selectionChangeHandler } from "../selection-dismissal.js";
/**
 * Angular behavior hook emitter — the framework-equivalent of
 * `frameworks/vue/hook-source.ts`. Produces a `useX.ts` file that
 * composes Angular-side primitives shipped from `@full-stack-ds/angular`.
 *
 * Dispatches on the same `ir.behavior.normalized*` fields as React and Vue,
 * proving the IR is framework-neutral. Output shape uses Angular 17+ signals:
 * `Signal<T>` for reactive state, plain ref-like objects for DOM handles.
 *
 * Angular's lifecycle is handled via `DestroyRef`, which the consuming
 * component passes in (injected with `inject(DestroyRef)` in the constructor
 * or field initializer). The generated function always accepts a `destroyRef`
 * on its options so primitives can self-clean.
 *
 * For compound-state-container IRs (Tabs-shaped), the emitter also generates
 * the `TabsContextValue` interface and the shared token/useContext pair so all
 * sub-components can import from the same module.
 */
import type {
  ComponentIR,
  KeyboardActionIR,
  NormalizedChannelIR,
  SurfaceModalityGateIR,
} from "../../ir.js";
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

// ---------------------------------------------------------------------------
// Binding resolution (identical logic to Vue hook-source.ts)
// ---------------------------------------------------------------------------

function resolveBindings(ir: ComponentIR): PrimitiveBindings | null {
  const channels = ir.behavior.normalizedChannels;
  const focus = ir.behavior.focus;
  const triggers = ir.behavior.normalizedDismissalTriggers;

  const hasFocusTrap = focus?.strategy === "trap";
  const hasScrollLock = focus?.scrollLock === true;
  // FIX-PORTAL-CONSUMPTION-01: no generated Angular component reads the
  // portal target (no DOM-append/portal directive is emitted), so every
  // portalTarget the hook emitted was dead scaffolding. Suppressed for all
  // Angular components. React (the only framework with a consumer) gates on
  // portalsRootToBody; the cross-framework portal path is a successor feature.
  const hasPortal = false;
  const escapeTrigger = triggers.find((t) => t.event === "escape");
  const hasEscape = escapeTrigger !== undefined;
  const hasOutsideClick = triggers.some(
    (t) => t.event === "outsideClick" || t.event === "overlayClick",
  );
  // AnchorToggle needs a boolean "open" state. Components without a boolean
  // channel (e.g. Walkthrough's `step: number`) get standalone Dismissal
  // instead — avoids handing AnchorToggle a number-typed value where it
  // expects a boolean.
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
    modalityGate: ir.surface?.modalityGate,
    useScrollLock: hasScrollLock,
    usePortal: hasPortal,
    useAnchorToggle: useAnchor,
    useDismissal,
    escapeEnabledByProp: escapeTrigger?.enabledByProp,
    isCompoundStateContainer: compoundContainer,
  };
}

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

function generateImports(
  bindings: PrimitiveBindings,
  isDisclosure: boolean,
): string {
  const coreNamed = new Set<string>();
  coreNamed.add("DestroyRef");

  if (bindings.useControllableState.length > 0) {
    coreNamed.add("type Signal");
  }
  if (bindings.useFocusTrap || bindings.useScrollLock || bindings.useAnchorToggle) {
    coreNamed.add("type Signal");
  }
  if (bindings.modalityGate && (bindings.useFocusTrap || bindings.useScrollLock)) {
    coreNamed.add("computed");
  }
  if (bindings.isCompoundStateContainer) {
    coreNamed.add("signal");
    coreNamed.add("type WritableSignal");
  }
  if (isDisclosure) {
    coreNamed.add("type Signal");
  }

  const primitives: string[] = [];
  if (bindings.useControllableState.length > 0) {
    primitives.push("createControllableState");
  }
  if (bindings.useFocusTrap) primitives.push("createFocusTrap");
  if (bindings.useScrollLock) primitives.push("createScrollLock");
  if (bindings.usePortal) primitives.push("createPortal");
  if (bindings.useAnchorToggle) primitives.push("createAnchorToggle");
  if (bindings.useDismissal) primitives.push("createDismissal");
  if (bindings.isCompoundStateContainer) primitives.push("createCompoundContext");
  if (isDisclosure) primitives.push("createCompoundContext");

  const lines: string[] = [];
  lines.push(
    `import { ${[...coreNamed].sort().join(", ")} } from "@angular/core";`,
  );
  if (primitives.length > 0) {
    lines.push(
      `import { ${primitives.sort().join(", ")} } from "../../primitives/index.js";`,
    );
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Inline types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Options / Result interfaces
// ---------------------------------------------------------------------------

function generateOptionsInterface(
  ir: ComponentIR,
  bindings: PrimitiveBindings,
): string {
  const lines: string[] = [`export interface Use${ir.name}Options {`];

  for (const ch of bindings.useControllableState) {
    const t = ch.valueType ?? "unknown";
    // Angular: controlled values are getter-shaped so signal/computed
    // reactivity flows through @Input updates. Consumer pattern:
    // useX({ checked: () => this.checked, ... }).
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

  // DestroyRef is always required — the consuming component injects it
  lines.push(`  destroyRef: DestroyRef;`);

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
    lines.push(`  ${ch.name}: Signal<${t}>;`);
    lines.push(`  ${setter}: (next: ${t}) => void;`);
  }

  if (
    bindings.useFocusTrap ||
    bindings.usePortal ||
    bindings.useAnchorToggle ||
    bindings.useDismissal
  ) {
    lines.push(`  panelRef: { nativeElement: HTMLElement | null };`);
  }
  if (bindings.useAnchorToggle) {
    lines.push(`  anchorRef: { nativeElement: HTMLElement | null };`);
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
    lines.push(`  portalTarget: Signal<Element | null>;`);
  }

  if (bindings.isCompoundStateContainer) {
    lines.push(`  /** DOM-order list of registered tab values. */`);
    lines.push(`  registeredTabs: WritableSignal<string[]>;`);
    lines.push(`  registerTab: (value: string) => void;`);
    lines.push(`  unregisterTab: (value: string) => void;`);
    lines.push(`  /** Base string for generating tab and panel IDs. */`);
    lines.push(`  idBase: string;`);
  }

  lines.push(`}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// FEAT-A11Y-COMPOSITE-KEYBOARD-01 — keyboard handler lowering
// ---------------------------------------------------------------------------

const keyGuardFor = (keys: string[]): string =>
  keys.map((k) => `event.key === ${JSON.stringify(k)}`).join(" || ");

/** Lower the open op: reveal the disclosure, then land focus in the panel. */
function emitAngularOpenKeydownBody(
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
    ? "anchorToggle.panelRef.nativeElement"
    : bindings.useFocusTrap || bindings.usePortal || bindings.useDismissal
      ? "panelRef.nativeElement"
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
function emitAngularRovingKeydownBody(
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
function emitAngularSelectKeydownBody(
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
  const current = `${channel.name}()`;
  const modeGates = keyboardModeGateProps(ir);
  const gate = modeGates.length > 0 ? `options.${modeGates[0]}?.()` : undefined;
  const setter = `set${capitalize(channel.name)}`;
  const keys = ir.keyboardActions
    .filter((a) => a.part === part && a.op === "select")
    .map((a) => a.key);
  lines.push(`    if (!(${keyGuardFor(keys)})) return;`);
  lines.push(`    event.preventDefault();`);
  // A typed `string[]` local — not the getter-repeated inline ternary — so
  // Angular's strict tsc narrows `.filter`/`.includes` across the signal
  // accessor (calls do not narrow like property reads). Same shape as the
  // click-activation class method.
  lines.push(`    const currentValue = ${current};`);
  lines.push(
    `    const current: string[] = Array.isArray(currentValue) ? [...currentValue] : currentValue == null ? [] : [currentValue];`,
  );
  lines.push(
    gate
      ? `    ${setter}(${gate} ? (current.includes(value) ? current.filter((member) => member !== value) : [...current, value]) : value);`
      : `    ${setter}(current.includes(value) ? current.filter((member) => member !== value) : [...current, value]);`,
  );
}

/**
 * Lower the IR's keyboard actions into one plain closure per hosting part
 * inside `useX`. Dispatch mirrors the React/Vue hook emitters: select op →
 * the composite activation; roving-* ops → focus movement over the item
 * selector; otherwise the open op → reveal + post-open focus. Every
 * realization fails loud on a missing IR precondition rather than emitting
 * a handler that silently no-ops.
 */
function emitAngularKeyboardHandlerFunctions(
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
      emitAngularSelectKeydownBody(lines, ir, bindings, part);
    } else if (actions.every((a) => a.op.startsWith("roving-"))) {
      if (!itemSelector) {
        throw new Error(
          `Component "${ir.name}": keyboard roving behavior on part "${part}" requires a composite item part to derive the roving item selector.`,
        );
      }
      emitAngularRovingKeydownBody(lines, ir, part, itemSelector);
    } else {
      emitAngularOpenKeydownBody(
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

// ---------------------------------------------------------------------------
// Function body
// ---------------------------------------------------------------------------

function generateBody(ir: ComponentIR, bindings: PrimitiveBindings): string {
  const lines: string[] = [];
  // Module-level counter for stable idBase generation per compound instance.
  if (bindings.isCompoundStateContainer) {
    lines.push(`let _${ir.name.toLowerCase()}IdCounter = 0;`);
    lines.push(``);
  }
  // Options default: cast to any so the destroyRef is "required" only at runtime
  lines.push(
    `export function use${ir.name}(options: Use${ir.name}Options): Use${ir.name}Result {`,
  );

  // `openChannel` must be the boolean/"open" controllable-state binding
  // when AnchorToggle is present — components like Select declare a
  // selection channel first, and wiring AnchorToggle to that mis-types it.
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
    const setter = `set${capitalize(ch.name)}`;
    const t = ch.valueType ?? "unknown";
    const def = defaultExprFor(ch.defaultValueProp, t);
    const defaultExpr = ch.defaultValueProp
      ? `options.${ch.defaultValueProp} ?? ${def}`
      : def;
    lines.push(
      `  const { value: ${ch.name}, set: ${setter} } = createControllableState<${t}>({`,
    );
    // options.<valueProp> is itself a getter; pass it directly.
    lines.push(`    controlled: options.${ch.valueProp},`);
    lines.push(`    defaultValue: ${defaultExpr},`);
    const selectionHandler = bindings.useAnchorToggle ? selectionChangeHandler(ir, ch.name, `options.${ch.changeHandlerProp}?.`, name => `options.${name}?.()`, "anchorToggle.setOpen(false)", "anchorToggle.anchorRef.nativeElement?.focus()", name => `options.${name}`) : undefined;
    lines.push(`    onChange: ${selectionHandler ?? `options.${ch.changeHandlerProp}`},`);
    lines.push(`  });`);
    lines.push(``);
  }

  if (bindings.useFocusTrap || bindings.usePortal || bindings.useDismissal) {
    lines.push(`  const panelRef: { nativeElement: HTMLElement | null } = { nativeElement: null };`);
  }

  if (bindings.useAnchorToggle && openChannel) {
    // Only emit defaultOpen when the contract declares one for the open
    // channel — components like Toast omit it (external state controller).
    const defaultOpenLine = openChannel.defaultValueProp
      ? `    defaultOpen: options.${openChannel.defaultValueProp} ?? false,`
      : `    defaultOpen: false,`;
    lines.push(
      `  const anchorToggle = createAnchorToggle({`,
      `    open: options.${openChannel.valueProp},`,
      defaultOpenLine,
      `    onOpenChange: options.${openChannel.changeHandlerProp},`,
      `    destroyRef: options.destroyRef,`,
      `  });`,
      ``,
    );
  }

  // The modality gate (surface.modalityProp) folds into one derived signal
  // the focus trap and scroll lock share.
  const gate = bindings.modalityGate;
  const disclosureChannel = bindings.useControllableState.find(
    (c) => c.isDisclosureChannel,
  );
  if (gate && (bindings.useFocusTrap || bindings.useScrollLock)) {
    const openExpr = disclosureChannel ? `${disclosureChannel.name}()` : "true";
    lines.push(
      `  const blocking = computed(() => ${openExpr} && (options.${gate.prop}?.() ?? ${gate.defaultModal}));`,
    );
  }
  const activeSignal = gate
    ? "blocking"
    : disclosureChannel?.name ?? "{ value: true } as unknown as Signal<boolean>";

  if (bindings.useFocusTrap) {
    lines.push(`  createFocusTrap(panelRef, { active: ${activeSignal}, destroyRef: options.destroyRef,`);
    for (const { target, prop } of focusTargetProps(ir)) {
      lines.push(`    get${capitalize(target)}: options.${prop},`);
    }
    lines.push(`  });`);
    lines.push(``);
  }

  if (bindings.useScrollLock) {
    lines.push(`  createScrollLock(${activeSignal}, options.destroyRef);`);
    lines.push(``);
  }

  if (bindings.usePortal) {
    const targetProp = ir.behavior.portal?.targetProp;
    const target = targetProp ? `() => options.${targetProp}` : "() => undefined";
    lines.push(`  const { target: portalTarget } = createPortal({`);
    lines.push(`    enabled: true,`);
    lines.push(`    target: ${target},`);
    lines.push(`  });`);
    lines.push(``);
  }

  if (bindings.useDismissal) {
    const channel = bindings.useControllableState.find(
      (c) => c.isDisclosureChannel,
    );
    const openGetter = channel ? `() => ${channel.name}()` : `() => true`;
    const setterCall = channel
      ? `set${capitalize(channel.name)}(false)`
      : `void 0`;
    const closeOnEscapeGetter = bindings.escapeEnabledByProp
      ? `() => options.${bindings.escapeEnabledByProp}`
      : `() => true`;
    lines.push(`  createDismissal({`);
    lines.push(`    open: ${openGetter},`);
    lines.push(`    closeOnEscape: ${closeOnEscapeGetter},`);
    lines.push(`    onDismiss: () => { ${setterCall}; },`);
    lines.push(`    destroyRef: options.destroyRef,`);
    lines.push(`  });`);
    lines.push(``);
  }

  // Compound-state-container (Tabs-shaped) wiring
  if (bindings.isCompoundStateContainer) {
    lines.push(`  const registeredTabs = signal<string[]>([]);`);
    lines.push(``);
    lines.push(`  const resolvedIdBase = options.idBase ?? \`${ir.name.toLowerCase()}-\${++_${ir.name.toLowerCase()}IdCounter}\`;`);
    lines.push(``);
    lines.push(`  function registerTab(value: string): void {`);
    lines.push(`    if (!registeredTabs().includes(value)) {`);
    lines.push(`      registeredTabs.set([...registeredTabs(), value]);`);
    lines.push(`    }`);
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  function unregisterTab(value: string): void {`);
    lines.push(`    registeredTabs.set(registeredTabs().filter((v) => v !== value));`);
    lines.push(`  }`);
    lines.push(``);
  }

  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: emit the keyboard handler closures
  // after every channel/ref they close over exists, before the return.
  emitAngularKeyboardHandlerFunctions(lines, ir, bindings, openChannel, anchorOwnsChannel);

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

// ---------------------------------------------------------------------------
// Compound context types
// ---------------------------------------------------------------------------

/**
 * Generate the `${Name}ContextValue` interface + InjectionToken + `use${Name}Context`
 * helper that all sub-components import from the hook module.
 *
 * Angular uses `createCompoundContext<T>(name)` which returns `{ token, useContext }`.
 * The token is provided on the root component; children inject via `useContext()`.
 */
function generateCompoundContextTypes(ir: ComponentIR): string {
  const { name } = ir;
  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "activeTab";
  const setterName = `set${capitalize(channelName)}`;

  const lines: string[] = [];
  lines.push(`export interface ${name}ContextValue {`);
  lines.push(`  readonly ${channelName}: WritableSignal<string>;`);
  lines.push(`  ${setterName}: (value: string) => void;`);
  lines.push(`  registerTab: (value: string) => void;`);
  lines.push(`  unregisterTab: (value: string) => void;`);
  lines.push(`  registeredTabs: WritableSignal<string[]>;`);
  lines.push(`  idBase: string;`);
  lines.push(`  // Config signals — reactive so child components re-render on prop changes`);
  lines.push(`  orientation: WritableSignal<"horizontal" | "vertical">;`);
  lines.push(`  activationMode: WritableSignal<"automatic" | "manual">;`);
  lines.push(`  loop: WritableSignal<boolean>;`);
  lines.push(`  unmountInactive: WritableSignal<boolean>;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(
    `const { token: ${name}ContextToken, useContext: use${name}Context } =`,
  );
  lines.push(`  createCompoundContext<${name}ContextValue>("${name}");`);
  lines.push(``);
  lines.push(`export { ${name}ContextToken, use${name}Context };`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Disclosure (Accordion-shaped) context for Angular: an InjectionToken carrying
 * the openness signal + per-item toggle helpers + type/collapsible/disabled/
 * idBase. Provided on the root component; Trigger/Content inject it. No tab
 * register/idBase counter.
 */
function generateDisclosureContextTypes(ir: ComponentIR): string {
  const { name } = ir;
  const channel = ir.behavior.normalizedChannels[0];
  const channelName = channel?.name ?? "openness";
  const lines: string[] = [];
  lines.push(`export interface ${name}ContextValue {`);
  lines.push(`  readonly ${channelName}: Signal<string | string[]>;`);
  lines.push(`  toggleItem: (value: string) => void;`);
  lines.push(`  isItemOpen: (value: string) => boolean;`);
  lines.push(`  type: Signal<"single" | "multiple">;`);
  lines.push(`  collapsible: Signal<boolean>;`);
  lines.push(`  disabled: Signal<boolean>;`);
  lines.push(`  idBase: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`const { token: ${name}ContextToken, useContext: use${name}Context } =`);
  lines.push(`  createCompoundContext<${name}ContextValue>("${name}");`);
  lines.push(``);
  lines.push(`export { ${name}ContextToken, use${name}Context };`);
  return lines.join("\n");
}

export function generateAngularHookSource(ir: ComponentIR): string | null {
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
      ? generateDisclosureContextTypes(ir)
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
