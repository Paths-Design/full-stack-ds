/**
 * DOM lifecycle shared by the framework focus-trap adapters.
 * A trap follows its actual mounted panel, including portal replacement.
 */
export type FocusTarget = HTMLElement | string | null | undefined;

export interface FocusTrapLifecycleOptions {
  getActive: () => boolean;
  getContainer: () => HTMLElement | null;
  getInitialFocus?: () => FocusTarget;
  getReturnFocus?: () => FocusTarget;
}

const SELECTOR = 'a[href],button,input,select,textarea,[tabindex],[contenteditable="true"]';
const sessions: object[] = [];

/** Rendered descendants include assigned slot content and open shadow roots. */
function composedElements(container: HTMLElement): HTMLElement[] {
  const result: HTMLElement[] = [];
  const seen = new Set<Element>();
  const visit = (element: Element) => {
    if (seen.has(element)) return;
    seen.add(element);
    result.push(element as HTMLElement);
    const children = element instanceof HTMLSlotElement
      ? element.assignedElements({ flatten: true })
      : Array.from(element.shadowRoot?.children ?? element.children);
    for (const child of children) visit(child);
  };
  for (const child of Array.from(container.shadowRoot?.children ?? container.children)) visit(child);
  return result;
}

function focusedElement(): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

function resolve(target: FocusTarget, root: Document | ShadowRoot | HTMLElement): HTMLElement | null {
  if (typeof target !== 'string') return target ?? null;
  if (root instanceof HTMLElement) {
    const elements = [root, ...composedElements(root)];
    const byId = elements.find(element => element.id === target);
    if (byId) return byId;
    try { return elements.find(element => element.matches(target)) ?? null; } catch { return null; }
  }
  // An element ID is accepted alongside a CSS selector. Missing or malformed
  // selectors fall back to the default without aborting the opening lifecycle.
  const byId = root.getElementById(target);
  if (byId instanceof HTMLElement) return byId;
  try { return root.querySelector<HTMLElement>(target); } catch { return null; }
}

function available(element: HTMLElement): boolean {
  if (!element.isConnected || element.matches(':disabled,[disabled],input[type="hidden"]') ||
      element.closest('[hidden],[inert]')) return false;
  for (let node: HTMLElement | null = element; node;) {
    if (node.matches('[hidden],[inert]')) return false;
    const style = element.ownerDocument.defaultView?.getComputedStyle(node);
    if (style?.display === 'none' || style?.visibility === 'hidden') return false;
    const root = node.getRootNode();
    node = node.assignedSlot ?? node.parentElement ??
      (root instanceof ShadowRoot ? root.host as HTMLElement : null);
  }
  return true;
}

export function createFocusTrapLifecycle(options: FocusTrapLifecycleOptions): {
  update: () => void;
  dispose: () => void;
} {
  const session = {};
  let engaged = false;
  let container: HTMLElement | null = null;
  let previous: HTMLElement | null = null;
  let observer: MutationObserver | null = null;
  const temporaryFocusability: HTMLElement[] = [];

  const contains = (element: Element | null) => !!container && !!element &&
    (element === container || composedElements(container).includes(element as HTMLElement));
  const candidates = () => (container ? composedElements(container) : [])
    .filter(el => el.matches(SELECTOR) && el.tabIndex >= 0 && available(el));
  const focus = (element: HTMLElement) => {
    if (element.tabIndex < 0 && !element.hasAttribute('tabindex')) {
      element.tabIndex = -1;
      temporaryFocusability.push(element);
    }
    element.focus({ preventScroll: true });
  };
  const focusInitial = () => {
    if (!container) return;
    const panel = container;
    const target = options.getInitialFocus?.();
    const requested = resolve(target, panel);
    const initial = requested && contains(requested) && available(requested)
      ? requested : candidates()[0] ?? container;
    focus(initial);
    if (target != null && initial !== requested) {
      // A projected custom element may render its shadow content after the panel.
      // Retry once, and only while focus remains on our automatic fallback.
      queueMicrotask(() => {
        if (!engaged || !options.getActive() || container !== panel || focusedElement() !== initial) return;
        const ready = resolve(target, panel);
        if (ready && contains(ready) && available(ready)) focus(ready);
      });
    }
  };
  const releaseContainer = () => {
    for (const element of temporaryFocusability) element.removeAttribute('tabindex');
    temporaryFocusability.length = 0;
    container = null;
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Tab' || event.defaultPrevented || sessions[sessions.length - 1] !== session || !container) return;
    const elements = candidates();
    const active = focusedElement();
    if (!elements.length) {
      event.preventDefault();
      focusInitial();
    } else if (!contains(active) || active === container ||
        (active instanceof HTMLElement && active.tabIndex < 0) ||
        (event.shiftKey && active === elements[0])) {
      event.preventDefault();
      (event.shiftKey ? elements[elements.length - 1]! : elements[0]).focus({ preventScroll: true });
    } else if (!event.shiftKey && active === elements[elements.length - 1]) {
      event.preventDefault();
      elements[0].focus({ preventScroll: true });
    }
  };
  const dispose = () => {
    if (!engaged) return;
    engaged = false;
    observer?.disconnect();
    observer = null;
    document.removeEventListener('keydown', onKey);
    sessions.splice(sessions.indexOf(session), 1);
    const root = container?.getRootNode() as Document | ShadowRoot | undefined;
    const target = options.getReturnFocus?.();
    const requested = (root instanceof ShadowRoot ? resolve(target, root) : null) ?? resolve(target, document);
    const restore = requested && available(requested) ? requested : previous;
    releaseContainer();
    previous = null;
    if (restore?.isConnected) restore.focus({ preventScroll: true });
  };
  const update = () => {
    if (typeof document === 'undefined') return;
    if (!options.getActive()) { dispose(); return; }
    if (!engaged) {
      engaged = true;
      previous = focusedElement() as HTMLElement | null;
      sessions.push(session);
      document.addEventListener('keydown', onKey);
      observer = new MutationObserver(update);
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
    const next = options.getContainer();
    if (!next?.isConnected) {
      releaseContainer();
      return;
    }
    if (next === container) return;
    releaseContainer();
    container = next;
    focusInitial();
  };
  return { update, dispose };
}
