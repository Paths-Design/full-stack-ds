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

function resolve(target: FocusTarget, root: Document | ShadowRoot | HTMLElement): HTMLElement | null {
  if (typeof target !== 'string') return target ?? null;
  // An element ID is accepted alongside a CSS selector. Missing or malformed
  // selectors fall back to the default without aborting the opening lifecycle.
  const byId = 'getElementById' in root
    ? root.getElementById(target)
    : Array.from(root.querySelectorAll<HTMLElement>('[id]')).find(el => el.id === target);
  if (byId instanceof HTMLElement) return byId;
  try { return root.querySelector<HTMLElement>(target); } catch { return null; }
}

function available(element: HTMLElement): boolean {
  if (!element.isConnected || element.matches(':disabled,[disabled],input[type="hidden"]') ||
      element.closest('[hidden],[inert]')) return false;
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    const style = element.ownerDocument.defaultView?.getComputedStyle(node);
    if (style?.display === 'none' || style?.visibility === 'hidden') return false;
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

  const candidates = () => Array.from(container?.querySelectorAll<HTMLElement>(SELECTOR) ?? [])
    .filter(el => el.tabIndex >= 0 && available(el));
  const activeElement = () => {
    const root = container?.getRootNode() as Document | ShadowRoot | undefined;
    return root?.activeElement ?? document.activeElement;
  };
  const focusInitial = () => {
    if (!container) return;
    const requested = resolve(options.getInitialFocus?.(), container);
    const initial = requested && container.contains(requested) && available(requested)
      ? requested : candidates()[0] ?? container;
    if (initial.tabIndex < 0 && !initial.hasAttribute('tabindex')) {
      initial.tabIndex = -1;
      temporaryFocusability.push(initial);
    }
    initial.focus({ preventScroll: true });
  };
  const releaseContainer = () => {
    for (const element of temporaryFocusability) element.removeAttribute('tabindex');
    temporaryFocusability.length = 0;
    container = null;
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Tab' || event.defaultPrevented || sessions.at(-1) !== session || !container) return;
    const elements = candidates();
    const active = activeElement();
    if (!elements.length) {
      event.preventDefault();
      focusInitial();
    } else if (!container.contains(active) ||
        (active instanceof HTMLElement && active.tabIndex < 0) ||
        (event.shiftKey && active === elements[0])) {
      event.preventDefault();
      (event.shiftKey ? elements.at(-1)! : elements[0]).focus({ preventScroll: true });
    } else if (!event.shiftKey && active === elements.at(-1)) {
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
      const root = options.getContainer()?.getRootNode() as Document | ShadowRoot | undefined;
      previous = (root?.activeElement ?? document.activeElement) as HTMLElement | null;
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
