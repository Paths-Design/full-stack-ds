import { createPresenceBudget } from "./presence-budget.js";

export interface SequenceConfig {
  labels: { start: string; stop: string; item: string };
  parts: Record<"viewport" | "previous" | "next" | "rotation" | "picker", string>;
  progress: Array<{ selector: string; effect: "elapsed-width" | "elapsed-ring"; steps: number }>;
}
export interface SequenceOptions {
  index: number;
  labels: readonly string[];
  durationMs: number | null | undefined;
  autoPlay: boolean;
  onIndexChange: (index: number) => void;
}

/** A DOM projection of a controlled sequence. No clock other than presence-budget. */
export function createSequenceBudget(config: SequenceConfig) {
  let options: SequenceOptions | undefined;
  let root: HTMLElement | undefined;
  let observer: MutationObserver | undefined;
  let slides: HTMLElement[] = [];
  let playing = false;
  let focusStopped = false;
  let previousAutoPlay: boolean | undefined;
  let previousIndex: number | undefined;
  let previousLabels: string | undefined;
  let pending = false;
  let connected = false;
  let hovered = false;
  const originalDisplay = new WeakMap<HTMLElement, { value: string; priority: string }>();
  const all = (selector: string) => Array.from(root?.querySelectorAll<HTMLElement>(selector) ?? [])
    .filter(el => el.closest("[data-sequence-root]") === root);
  const part = (key: keyof SequenceConfig["parts"]) => all(config.parts[key])[0];
  const index = () => Math.max(0, Math.min(slides.length - 1, Math.trunc(options?.index ?? 0) || 0));
  const valid = () => Boolean(options && slides.length === options.labels.length && slides.length > 1);
  const budget = createPresenceBudget(() => {
    if (!pending && playing && valid()) request(index() + 1);
  }, 10, (remaining, enabled, reduced) => {
    for (const binding of config.progress) {
      const elapsed = 1 - remaining;
      const value = reduced ? Math.floor(elapsed * binding.steps) / binding.steps : elapsed;
      for (const el of all(binding.selector)) {
        const picker = el.closest(config.parts.picker);
        const active = !picker || picker.getAttribute("data-sequence-active") === "true";
        el.hidden = !enabled || !active;
        el.style.setProperty("--sequence-progress", String(value));
        if (binding.effect === "elapsed-width") el.style.transform = `scaleX(${value})`;
      }
    }
  });
  const render = () => {
    if (!root || !options) return;
    root.dataset.sequencePlaying = String(playing);
    const viewport = part("viewport");
    viewport?.setAttribute("aria-live", playing ? "off" : "polite");
    slides.forEach((slide, i) => {
      if (!originalDisplay.has(slide)) originalDisplay.set(slide, { value: slide.style.getPropertyValue("display"), priority: slide.style.getPropertyPriority("display") });
      const display = originalDisplay.get(slide)!;
      if (i === index()) {
        if (display.value) slide.style.setProperty("display", display.value, display.priority);
        else slide.style.removeProperty("display");
      } else slide.style.setProperty("display", "none", "important");
      slide.hidden = i !== index();
      slide.inert = i !== index();
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", config.labels.item);
      slide.setAttribute("aria-label", options!.labels[i] ?? `${i + 1} of ${slides.length}`);
    });
    all(config.parts.picker).forEach((picker, i) => {
      picker.dataset.sequenceActive = String(i === index());
      picker.setAttribute("aria-disabled", String(i === index() || !valid()));
    });
    for (const key of ["previous", "next", "rotation"] as const) {
      const button = part(key);
      if (button instanceof HTMLButtonElement) button.disabled = !valid();
    }
    const rotation = part("rotation");
    if (rotation) {
      const label = playing ? config.labels.stop : config.labels.start;
      rotation.textContent = label;
      rotation.setAttribute("aria-label", label);
    }
  };
  const readSlides = () => {
    const viewport = part("viewport");
    slides = Array.from(viewport?.children ?? []).flatMap(el => el instanceof HTMLSlotElement
      ? el.assignedElements({ flatten: true }) : [el]).filter((el): el is HTMLElement => el instanceof HTMLElement);
  };
  const syncBudget = (restart = false) => {
    if (!options || !connected) return;
    budget.sync(valid(), options.durationMs);
    if (hovered) budget.pause("hover");
    else budget.resume("hover");
    if (!playing || pending) budget.pause("rotation");
    else budget.resume("rotation");
    if (restart) budget.restart();
  };
  const request = (next: number) => {
    if (!options || !valid()) return;
    const value = (next + slides.length) % slides.length;
    // Wait for the controlled channel to acknowledge. Never repeat requests
    // against stale consumer state, including a delayed timer callback.
    pending = true;
    budget.pause("rotation");
    options.onIndexChange(value);
  };
  const stop = () => { focusStopped = true; playing = false; render(); syncBudget(); };
  const click = (event: Event) => {
    const target = event.composedPath().find(node => node instanceof HTMLButtonElement) as HTMLButtonElement | undefined;
    if (!target || target.closest("[data-sequence-root]") !== root || target.disabled) return;
    if (target.matches(config.parts.rotation)) {
      focusStopped = false;
      playing = !playing;
      pending = false;
      render(); syncBudget();
    } else if (target.matches(config.parts.next)) request(index() + 1);
    else if (target.matches(config.parts.previous)) request(index() - 1);
    else if (target.matches(config.parts.picker)) {
      const selected = all(config.parts.picker).indexOf(target);
      if (selected !== index()) request(selected);
    }
  };
  const enter = () => { hovered = true; budget.pause("hover"); };
  const leave = () => { hovered = false; budget.resume("hover"); };
  const refresh = () => { readSlides(); render(); syncBudget(); };
  const disconnect = () => {
    connected = false;
    observer?.disconnect();
    root?.removeEventListener("click", click);
    root?.removeEventListener("focusin", stop);
    root?.removeEventListener("pointerenter", enter);
    root?.removeEventListener("pointerleave", leave);
    root?.removeEventListener("slotchange", refresh);
    budget.destroy();
  };
  const connect = () => {
    if (!root || connected) return;
    connected = true;
    root.dataset.sequenceRoot = "";
    root.addEventListener("click", click);
    root.addEventListener("focusin", stop);
    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointerleave", leave);
    root.addEventListener("slotchange", refresh);
    observer = new MutationObserver(refresh);
    const viewport = part("viewport");
    if (viewport) observer.observe(viewport, { childList: true });
    readSlides();
    hovered = root.matches(":hover");
  };
  const sync = (next: SequenceOptions) => {
    options = next;
    connect();
    readSlides();
    const labels = JSON.stringify(next.labels);
    const changed = next.index !== previousIndex || labels !== previousLabels;
    if (root?.matches(":focus-within") && previousAutoPlay === undefined) focusStopped = true;
    if (next.autoPlay !== previousAutoPlay) playing = next.autoPlay && !focusStopped;
    if (changed) pending = false;
    previousAutoPlay = next.autoPlay;
    previousIndex = next.index;
    previousLabels = labels;
    render();
    syncBudget(changed);
  };
  const bindRoot = (element: unknown) => {
    const next = element instanceof HTMLElement ? element : undefined;
    if (next === root) return;
    disconnect();
    root = next;
    if (options) sync(options);
  };
  return { sync, bindRoot, destroy: disconnect, snapshot: budget.snapshot };
}
