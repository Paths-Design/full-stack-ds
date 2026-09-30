import { selectionChangeHandler } from "../selection-dismissal.js";
/**
 * Lit behavior class emitter — the framework-equivalent of
 * `frameworks/vue/hook-source.ts`. Produces a `${Name}Behavior.ts` file
 * that composes ReactiveControllers from `@full-stack-ds/lit/primitives`.
 *
 * Dispatches on the same `ir.behavior.normalized*` fields as React and
 * Vue, proving the IR is framework-neutral. The output shape uses Lit's
 * ReactiveController pattern: a plain class that wires controllers in its
 * constructor and exposes typed getters/setters.
 *
 * For compound-state-container components (Tabs-shaped), the behavior class
 * gains `registeredTabs: string[]`, `registerTab(value)`, and
 * `unregisterTab(value)` — the equivalent of React's useState-based
 * registeredTabs in useTabs.
 */
import type {
  ComponentIR,
  DomNodeIR,
  KeyboardActionIR,
  NormalizedChannelIR,
} from "../../ir.js";
import {
  keyboardHandlerParts,
  keyboardModeGateProps,
  focusTargetProps,
  resolveInitialFocusSelector,
  resolveRovingItemSelector,
} from "../../ir.js";import { renderSections, type Section } from "../../preserve.js";
import {
  isCompoundStateContainer,
  isDisclosureContainer,
} from "../react/hook-source.js";

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
 * Inspect the IR's normalized behavior metadata and decide which
 * ReactiveControllers are needed. Returns `null` when no behavior is
 * required (the emitter skips the file entirely in that case).
 */
/**
 * The surface's blocking condition: its openness, ANDed with the modality
 * gate prop when the contract declares one (`surface.modalityProp`). An
 * omitted prop reads as the contract default.
 */
function blockingExpr(ir: ComponentIR, openExpr: string): string {
  const gate = ir.surface?.modalityGate;
  if (!gate) return openExpr;
  const modal = `(opts.${gate.prop}?.() ?? ${gate.defaultModal})`;
  return openExpr === "true" ? modal : `${openExpr} && ${modal}`;
}

function resolveBindings(ir: ComponentIR): PrimitiveBindings | null {
  const channels = ir.behavior.normalizedChannels;
  const focus = ir.behavior.focus;
  const triggers = ir.behavior.normalizedDismissalTriggers;

  const hasFocusTrap = focus?.strategy === "trap";
  const hasScrollLock = focus?.scrollLock === true;
  // FIX-PORTAL-CONSUMPTION-01: no generated Lit component reads the portal
  // target (no PortalController is mounted into a component render), so every
  // portalTarget the hook emitted was dead scaffolding. Suppressed for all
  // Lit components. React (the only framework with a consumer) gates on
  // portalsRootToBody; the cross-framework portal path is a successor feature.
  const hasPortal = false;
  const escapeTrigger = triggers.find((t) => t.event === "escape");
  const hasEscape = escapeTrigger !== undefined;
  const hasOutsideClick = triggers.some(
    (t) => t.event === "outsideClick" || t.event === "overlayClick",
  );
  // AnchorToggle needs a boolean "open" state to drive escape/outside-click
  // dismissal. Components like Walkthrough that have a non-boolean "step
  // index" channel can't bind AnchorToggle without a type mismatch — fall
  // through to standalone Dismissal in that case.
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

function generateImports(bindings: PrimitiveBindings): string {
  const primitives: string[] = [];
  if (bindings.useControllableState.length > 0)
    primitives.push("ControllableStateController");
  if (bindings.useFocusTrap) primitives.push("FocusTrapController");
  if (bindings.useScrollLock) primitives.push("ScrollLockController");
  if (bindings.usePortal) primitives.push("PortalController");
  if (bindings.useAnchorToggle) primitives.push("AnchorToggleController");
  if (bindings.useDismissal) primitives.push("DismissalController");

  const lines: string[] = [
    `import type { ReactiveControllerHost } from 'lit';`,
  ];
  if (primitives.length > 0) {
    lines.push(
      `import { ${primitives.sort().join(", ")} } from '../../primitives/index.js';`,
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
  const lines: string[] = [`export interface ${ir.name}BehaviorOptions {`];

  for (const ch of bindings.useControllableState) {
    const t = ch.valueType ?? "unknown";
    // Lit: controlled values are getter-shaped so the LitElement's reactive
    // property changes propagate. Consumer pattern (in element constructor):
    // new XBehavior(this, { checked: () => this.checked, ... }).
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

  if (bindings.useFocusTrap || needsKeyboardPanelBinding(ir)) {
    lines.push(`  containerEl?: HTMLElement;`);
    if (needsKeyboardPanelBinding(ir)) lines.push(`  anchorEl?: HTMLElement;`);
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

/**
 * FEAT-A11Y-COMPOSITE-KEYBOARD-01: whether a keyboard `open` action needs the
 * interaction panel element routed through the options — true when any DOM
 * node carries the `keyboardPanel` fact (Select anchors its open path on the
 * anchor toggle but still lands focus in the rendered panel).
 */
function needsKeyboardPanelBinding(ir: ComponentIR): boolean {
  const walk = (node: DomNodeIR): boolean =>
    node.keyboardPanel === true || node.children.some(walk);
  return ir.dom ? walk(ir.dom) : false;
}

/**
 * FEAT-A11Y-COMPOSITE-KEYBOARD-01: lower the IR's keyboard actions into one
 * class method per hosting part on the behavior class. Dispatch mirrors the
 * React/Vue/Svelte/Angular hook emitters: select op → the composite
 * activation; roving-* ops → focus movement over the item selector;
 * otherwise the open op → reveal + post-open focus through the options'
 * `containerEl`. Every realization fails loud on a missing IR precondition
 * rather than emitting a handler that silently no-ops.
 */
function emitLitKeyboardHandlerMethods(
  lines: string[],
  ir: ComponentIR,
  bindings: PrimitiveBindings,
): void {
  if (ir.keyboardActions.length === 0) return;
  const itemSelector = resolveRovingItemSelector(ir);
  const initialSelector = resolveInitialFocusSelector(ir);

  // Hosting parts in first-declaration order; the template's handler
  // bindings use the same order.
  const parts = keyboardHandlerParts(ir);

  const openChannel = bindings.useControllableState.find(
    (c) => c.isDisclosureChannel,
  );

  for (const part of parts) {
    const ident = `handle${capitalize(part)}Keydown`;
    const actions = ir.keyboardActions.filter((a) => a.part === part);
    const isItemPart = ir.compositeControl?.part.name === part;
    const param = isItemPart
      ? `event: KeyboardEvent, value: string`
      : `event: KeyboardEvent`;
    lines.push(``);
    lines.push(`  ${ident}(${param}): void {`);
    if (actions.some((a) => a.op === "select")) {
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
          `Component "${ir.name}": keyboard "select" behavior targets channel "${control.channel.name}", which the behavior class does not manage.`,
        );
      }
      const modeGates = keyboardModeGateProps(ir);
      const gate = modeGates.length > 0 ? `this.opts.${modeGates[0]}?.()` : undefined;
      const setter = `this.set${capitalize(channel.name)}`;
      const keys = actions
        .filter((a) => a.op === "select")
        .map((a) => a.key);
      const keyGuard = keys
        .map((k) => `event.key === ${JSON.stringify(k)}`)
        .join(" || ");
      lines.push(`    if (!(${keyGuard})) return;`);
      lines.push(`    event.preventDefault();`);
      // A typed `string[]` local keeps the narrowing explicit across the
      // getter read (a fresh property read per mention would not narrow).
      lines.push(`    const currentValue = this.${channel.name};`);
      lines.push(
        `    const current: string[] = Array.isArray(currentValue) ? [...currentValue] : currentValue == null ? [] : [currentValue];`,
      );
      lines.push(
        gate
          ? `    ${setter}(${gate} ? (current.includes(value) ? current.filter((member) => member !== value) : [...current, value]) : value);`
          : `    ${setter}(current.includes(value) ? current.filter((member) => member !== value) : [...current, value]);`,
      );
    } else if (actions.every((a) => a.op.startsWith("roving-"))) {
      if (!itemSelector) {
        throw new Error(
          `Component "${ir.name}": keyboard roving behavior on part "${part}" requires a composite item part to derive the roving item selector.`,
        );
      }
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
      // The DOM KeyboardEvent types currentTarget as `EventTarget | null`;
      // the template binds this handler only on the declared host part, so
      // the element view is asserted here once, at the query site.
      lines.push(`    const items = Array.from(`);
      lines.push(`      (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(${JSON.stringify(itemSelector)}),`);
      lines.push(`    );`);
      // Lit renders into a shadow root, where document.activeElement stops
      // at the host boundary — resolve the focused item through the root
      // that owns this panel.
      lines.push(`    const root = (event.currentTarget as HTMLElement).getRootNode();`);
      lines.push(`    const active = root instanceof ShadowRoot ? root.activeElement : document.activeElement;`);
      lines.push(`    const currentIndex = items.findIndex((item) => item === active);`);
      actions.forEach((action, i) => {
        const keyword = i === 0 ? "if" : "else if";
        lines.push(`    ${keyword} (event.key === ${JSON.stringify(action.key)}) {`);
        lines.push(`      event.preventDefault();`);
        lines.push(`      items[${indexExpr(action.op)}]?.focus();`);
        lines.push(`    }`);
      });
    } else {
      if (!openChannel || openChannel.valueType !== "boolean") {
        throw new Error(
          `Component "${ir.name}": keyboard "open" behavior on part "${part}" requires a boolean disclosure channel.`,
        );
      }
      if (!needsKeyboardPanelBinding(ir) && !bindings.useFocusTrap) {
        throw new Error(
          `Component "${ir.name}": keyboard "open" behavior on part "${part}" requires the interaction panel element (keyboardPanel node or focus container) to receive focus.`,
        );
      }
      const keys = actions.map((a) => a.key);
      const keyGuard = keys
        .map((k) => `event.key === ${JSON.stringify(k)}`)
        .join(" || ");
      const focusTargetExpr = initialSelector
        ? itemSelector
          ? `(panel.querySelector<HTMLElement>(${JSON.stringify(initialSelector)}) ?? panel.querySelector<HTMLElement>(${JSON.stringify(itemSelector)}))?.focus();`
          : `panel.querySelector<HTMLElement>(${JSON.stringify(initialSelector)})?.focus();`
        : itemSelector
          ? `panel.querySelector<HTMLElement>(${JSON.stringify(itemSelector)})?.focus();`
          : `panel.focus();`;
      lines.push(`    if (!(${keyGuard})) return;`);
      lines.push(`    event.preventDefault();`);
      lines.push(`    this.set${capitalize(openChannel.name)}(true);`);
      lines.push(`    requestAnimationFrame(() => {`);
      lines.push(`      const panel = this.opts.containerEl;`);
      lines.push(`      if (!panel) return;`);
      lines.push(`      ${focusTargetExpr}`);
      lines.push(`    });`);
    }
    lines.push(`  }`);
  }
}

function generateClassBody(ir: ComponentIR, bindings: PrimitiveBindings): string {
  const className = `${ir.name}Behavior`;
  const lines: string[] = [];

  lines.push(`export class ${className} {`);

  // When compound-state-container, we need to store the host ref so the
  // register/unregisterTab methods can call host.requestUpdate().
  if (bindings.isCompoundStateContainer) {
    lines.push(`  private _host: ReactiveControllerHost;`);
  }

  // Field declarations.
  //
  // `openChannel` is the controllable-state binding that the AnchorToggle
  // owns (when present). It must be the boolean / "open" channel, not the
  // first declared channel: components like Select declare a selection
  // channel (`value`) before the open channel, and wiring AnchorToggle to
  // the selection channel mis-types it and breaks Escape-dismissal at
  // runtime. Match by `valueType === "boolean"` or `name === "open"`,
  // mirroring the heuristic used below for focus-trap / scroll-lock.
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
    const t = ch.valueType ?? "unknown";
    lines.push(`  readonly ${ch.name}State: ControllableStateController<${t}>;`);
  }
  if (bindings.useAnchorToggle) {
    lines.push(`  readonly anchorToggle: AnchorToggleController;`);
  }
  if (bindings.useFocusTrap) {
    lines.push(`  readonly focusTrap: FocusTrapController;`);
  }
  if (bindings.useScrollLock) {
    lines.push(`  readonly scrollLock: ScrollLockController;`);
  }
  if (bindings.usePortal) {
    lines.push(`  readonly portal: PortalController;`);
  }
  if (bindings.useDismissal) {
    lines.push(`  readonly dismissal: DismissalController;`);
  }

  // Constructor
  lines.push(``);
  lines.push(
    `  constructor(host: ReactiveControllerHost, private opts: ${className}Options = {}) {`,
  );
  if (bindings.isCompoundStateContainer) {
    lines.push(`    this._host = host;`);
  }

  for (const ch of bindings.useControllableState) {
    if (anchorOwnsChannel && ch === openChannel) continue;
    const t = ch.valueType ?? "unknown";
    const def = defaultExprFor(ch.defaultValueProp, t);
    const defaultExpr = ch.defaultValueProp
      ? `opts.${ch.defaultValueProp} ?? ${def}`
      : def;
    lines.push(`    this.${ch.name}State = new ControllableStateController<${t}>(host, {`);
    // opts.<valueProp> is itself a getter; pass it directly.
    lines.push(`      controlled: opts.${ch.valueProp},`);
    lines.push(`      defaultValue: ${defaultExpr},`);
    const focus = "this.opts.anchorEl?.focus()";
    const selectionHandler = bindings.useAnchorToggle ? selectionChangeHandler(ir, ch.name, `opts.${ch.changeHandlerProp}?.`, name => `opts.${name}?.()`, "this.anchorToggle.setOpen(false)", focus, name => `opts.${name}`) : undefined;
    lines.push(`      onChange: ${selectionHandler ?? `opts.${ch.changeHandlerProp}`},`);
    lines.push(`    });`);
  }

  if (bindings.useAnchorToggle && openChannel) {
    lines.push(`    this.anchorToggle = new AnchorToggleController(`);
    lines.push(`      host as ReactiveControllerHost & EventTarget,`);
    lines.push(`      {`);
    lines.push(`        open: opts.${openChannel.valueProp},`);
    // Only emit defaultOpen if the contract declares one for this channel.
    // Components like Toast omit `defaultValue` since they have an external
    // controller (ToastProvider) managing state.
    if (openChannel.defaultValueProp) {
      lines.push(`        defaultOpen: opts.${openChannel.defaultValueProp} ?? false,`);
    } else {
      lines.push(`        defaultOpen: false,`);
    }
    lines.push(`        onOpenChange: opts.${openChannel.changeHandlerProp},`);
    lines.push(`      },`);
    lines.push(`    );`);
  }

  if (bindings.useFocusTrap) {
    const boolChannel = bindings.useControllableState.find(
      (c) => c.isDisclosureChannel,
    );
    const activeExpr = blockingExpr(
      ir,
      boolChannel ? `this.${boolChannel.name}State.value` : "true",
    );
    lines.push(`    this.focusTrap = new FocusTrapController(host, {`);
    lines.push(`      getActive: () => ${activeExpr},`);
    lines.push(`      getContainer: () => opts.containerEl ?? null,`);
    for (const { target, prop } of focusTargetProps(ir)) {
      lines.push(`      get${capitalize(target)}: opts.${prop},`);
    }
    lines.push(`    });`);
  }

  if (bindings.useScrollLock) {
    const boolChannel = bindings.useControllableState.find(
      (c) => c.isDisclosureChannel,
    );
    const activeExpr = blockingExpr(
      ir,
      boolChannel ? `this.${boolChannel.name}State.value` : "true",
    );
    lines.push(`    this.scrollLock = new ScrollLockController(host, {`);
    lines.push(`      getActive: () => ${activeExpr},`);
    lines.push(`    });`);
  }

  if (bindings.usePortal) {
    const targetProp = ir.behavior.portal?.targetProp;
    const target = targetProp
      ? `() => opts.${targetProp}`
      : "() => undefined";
    lines.push(`    this.portal = new PortalController(host, {`);
    lines.push(`      enabled: true,`);
    lines.push(`      getTarget: ${target},`);
    lines.push(`    });`);
  }

  if (bindings.useDismissal) {
    const boolChannel = bindings.useControllableState.find(
      (c) => c.isDisclosureChannel,
    );
    const openExpr = boolChannel
      ? `this.${boolChannel.name}State.value`
      : "true";
    const setterCall = boolChannel
      ? `this.${boolChannel.name}State.set(false)`
      : `void 0`;
    const closeOnEscapeExpr = bindings.escapeEnabledByProp
      ? `() => opts.${bindings.escapeEnabledByProp}`
      : `() => true`;
    lines.push(`    this.dismissal = new DismissalController(host, {`);
    lines.push(`      open: () => ${openExpr},`);
    lines.push(`      closeOnEscape: ${closeOnEscapeExpr},`);
    lines.push(`      onDismiss: () => { ${setterCall}; },`);
    lines.push(`    });`);
  }

  lines.push(`  }`);

  // Convenience getters/setters.
  //
  // Anchor-toggle channels delegate to `this.anchorToggle.open` / `setOpen`,
  // since the AnchorToggleController owns that state. All other controllable
  // state channels delegate to their per-channel `${name}State` controller.
  // Previously the two cases were mutually exclusive — the if-else branched
  // the entire emission, so components with both an anchor channel and an
  // additional controllable channel (Command's `search`, Select's `selection`)
  // got accessors only for the anchor channel. Restructure so the anchor
  // accessor emits alongside the per-channel accessors for everything else.
  const anchorEmitsOpen = bindings.useAnchorToggle && !!openChannel;
  if (anchorEmitsOpen && openChannel) {
    lines.push(``);
    lines.push(`  get ${openChannel.name}(): boolean { return this.anchorToggle.open; }`);
    lines.push(`  set${capitalize(openChannel.name)}(value: boolean) { this.anchorToggle.setOpen(value); }`);
  }
  for (const ch of bindings.useControllableState) {
    // Skip the open channel only when AnchorToggle has already emitted its
    // accessor pair above. When AnchorToggle isn't in use, the channel state
    // still lives in `${ch.name}State` and needs its own accessors.
    if (anchorEmitsOpen && ch === openChannel) continue;
    const t = ch.valueType ?? "unknown";
    lines.push(``);
    lines.push(`  get ${ch.name}(): ${t} { return this.${ch.name}State.value; }`);
    lines.push(`  set${capitalize(ch.name)}(value: ${t}) { this.${ch.name}State.set(value); }`);
  }

  // Compound-state-container (Tabs-shaped): add registeredTabs list and
  // register/unregister methods. Lit controllers don't have @state, so we
  // store it as a plain field and call host.requestUpdate() after mutations.
  if (bindings.isCompoundStateContainer) {
    lines.push(``);
    lines.push(`  /** DOM-order list of registered tab values. */`);
    lines.push(`  registeredTabs: string[] = [];`);
    lines.push(``);
    lines.push(`  registerTab(value: string): void {`);
    lines.push(`    if (this.registeredTabs.includes(value)) return;`);
    lines.push(`    this.registeredTabs = [...this.registeredTabs, value];`);
    lines.push(`    this._host.requestUpdate();`);
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  unregisterTab(value: string): void {`);
    lines.push(`    const next = this.registeredTabs.filter((v) => v !== value);`);
    lines.push(`    if (next.length === this.registeredTabs.length) return;`);
    lines.push(`    this.registeredTabs = next;`);
    lines.push(`    this._host.requestUpdate();`);
    lines.push(`  }`);
  }

  // FEAT-A11Y-COMPOSITE-KEYBOARD-01: the handler methods close over every
  // controller field above, so they emit last, just before the class body
  // closes.
  emitLitKeyboardHandlerMethods(lines, ir, bindings);

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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Emit a Lit `${Name}Behavior` class for a `ComponentIR`. Returns `null`
 * when the contract has no behavior that needs a controller.
 */
export function generateLitHookSource(ir: ComponentIR): string | null {
  const bindings = resolveBindings(ir);
  if (!bindings) return null;

  const importsBody = generateImports(bindings);
  const inlineTypesBody = generateInlineTypes(ir, bindings);
  const optionsBody = generateOptionsInterface(ir, bindings);
  const classBody = generateClassBody(ir, bindings);

  const typesBody = [inlineTypesBody, optionsBody]
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
    { kind: "generated", id: "hook", body: classBody },
    blank(),
    { kind: "custom", id: "trailing", body: "" },
    blank(),
  ];

  return renderSections(sections, "line");
}
