import { createPresenceBudget } from "./presence-budget.js";

export interface SequenceConfig {
  labels: { start: string; stop: string; item: string };
  transition?: { durationMs: number; easing: string; referenceWidth: number; minMultiplier: number; maxMultiplier: number };
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
  let pointerRotationIntent: boolean | undefined;
  let previousAutoPlay: boolean | undefined;
  let previousIndex: number | undefined;
  let previousLabels: string | undefined;
  let pending = false;
  let connected = false;
  let reducedMotion = false;
  let activeSlide: HTMLElement | undefined;
  let requestedIndex: number | undefined;
  let requestedDirection = 1;
  let motion: { outgoing: HTMLElement; animations: Animation[]; restore: () => void } | undefined;
  let hovered = false;
  const originalDisplay = new WeakMap<HTMLElement, { value: string; priority: string; inert: boolean; attrs: Record<string, string | null> }>();
  const restoreSlide = (slide: HTMLElement) => {
    const original = originalDisplay.get(slide);
    if (!original) return;
    if (original.value) slide.style.setProperty("display", original.value, original.priority);
    else slide.style.removeProperty("display");
    slide.inert = original.inert;
    for (const [key, value] of Object.entries(original.attrs)) {
      if (value === null) slide.removeAttribute(key);
      else slide.setAttribute(key, value);
    }
    originalDisplay.delete(slide);
  };
  const all = (selector: string) => Array.from(root?.querySelectorAll<HTMLElement>(selector) ?? [])
    .filter(el => el.closest("[data-sequence-root]") === root);
  const part = (key: keyof SequenceConfig["parts"]) => all(config.parts[key])[0];
  const index = () => Math.max(0, Math.min(slides.length - 1, Math.trunc(options?.index ?? 0) || 0));
  const valid = () => Boolean(options && slides.length === options.labels.length && slides.length > 1);
  const budget = createPresenceBudget(() => {
    if (!pending && playing && valid()) request(index() + 1);
  }, 10, (remaining, enabled, reduced) => {
    reducedMotion = reduced;
    if (reduced) finishMotion();
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
  const finishMotion = () => {
    const current = motion;
    if (!current) return;
    motion = undefined;
    current.animations.forEach(animation => animation.cancel());
    current.restore();
    if (slides.includes(current.outgoing) && current.outgoing !== activeSlide) {
      current.outgoing.hidden = true;
      current.outgoing.style.setProperty("display", "none", "important");
    }
    budget.resume("transition");
  };
  const beginMotion = (from: HTMLElement, to: HTMLElement, direction: number, fromTransform: string, toTransform?: string) => {
    const profile = config.transition;
    const viewport = part("viewport");
    if (!profile || !viewport || reducedMotion || typeof to.animate !== "function") return;
    const width = viewport.getBoundingClientRect().width;
    const multiplier = Math.min(profile.maxMultiplier, Math.max(profile.minMultiplier, Math.sqrt(width / profile.referenceWidth)));
    const duration = profile.durationMs * multiplier;
    const sign = direction * (getComputedStyle(viewport).direction === "rtl" ? -1 : 1);
    const originals = ["position", "left", "top", "width"].map(key => [key, from.style.getPropertyValue(key), from.style.getPropertyPriority(key)]);
    const oldDisplay = originalDisplay.get(from)!;
    from.hidden = false;
    if (oldDisplay.value) from.style.setProperty("display", oldDisplay.value, oldDisplay.priority);
    else from.style.removeProperty("display");
    from.style.position = "absolute";
    from.style.left = "0";
    from.style.top = "0";
    from.style.width = `${width}px`;
    const animations = [
      from.animate([{ transform: fromTransform }, { transform: `translateX(${-sign * 100}%)` }], { duration, easing: profile.easing, fill: "both" }),
      to.animate([{ transform: toTransform ?? `translateX(${sign * 100}%)` }, { transform: "none" }], { duration, easing: profile.easing, fill: "both" }),
    ];
    const current = { outgoing: from, animations, restore: () => {
      for (const [key, value, priority] of originals) {
        if (value) from.style.setProperty(key, value, priority);
        else from.style.removeProperty(key);
      }
    } };
    motion = current;
    budget.pause("transition");
    // Presentation completion only releases reading time; it never advances.
    void Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (motion === current) finishMotion();
    }, () => { if (motion === current) finishMotion(); });
  };
  const render = () => {
    if (!root || !options) return;
    const nextSlide = slides[index()];
    const previousSlide = activeSlide;
    const changedSlide = previousSlide && nextSlide && previousSlide !== nextSlide;
    const fromTransform = changedSlide ? getComputedStyle(previousSlide).transform : "none";
    const toTransform = changedSlide && motion?.outgoing === nextSlide ? getComputedStyle(nextSlide).transform : undefined;
    if (changedSlide) finishMotion();
    activeSlide = nextSlide;
    const timed = typeof options.durationMs === "number" && Number.isFinite(options.durationMs) && options.durationMs > 0;
    root.dataset.sequencePlaying = String(playing && timed);
    const viewport = part("viewport");
    viewport?.setAttribute("aria-live", playing && timed ? "off" : "polite");
    slides.forEach((slide, i) => {
      if (!originalDisplay.has(slide)) originalDisplay.set(slide, {
        value: slide.style.getPropertyValue("display"), priority: slide.style.getPropertyPriority("display"),
        inert: slide.inert,
        attrs: Object.fromEntries(["hidden", "role", "aria-label", "aria-roledescription", "aria-hidden"].map(key => [key, slide.getAttribute(key)])),
      });
      const display = originalDisplay.get(slide)!;
      const visible = i === index() || slide === motion?.outgoing;
      if (visible) {
        if (display.value) slide.style.setProperty("display", display.value, display.priority);
        else slide.style.removeProperty("display");
      } else slide.style.setProperty("display", "none", "important");
      slide.hidden = !visible;
      slide.inert = i !== index();
      slide.setAttribute("aria-hidden", String(i !== index()));
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", config.labels.item);
      slide.setAttribute("aria-label", options!.labels[i] ?? `${i + 1} of ${slides.length}`);
    });
    if (changedSlide) {
      const direction = requestedIndex === index() ? requestedDirection : Math.sign(index() - slides.indexOf(previousSlide)) || 1;
      beginMotion(previousSlide, nextSlide, direction, fromTransform, toTransform);
      requestedIndex = undefined;
    }
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
      rotation.hidden = !timed;
      const label = playing ? config.labels.stop : config.labels.start;
      rotation.textContent = label;
      rotation.setAttribute("aria-label", label);
    }
  };
  const readSlides = () => {
    const viewport = part("viewport");
    const previous = slides;
    slides = Array.from(viewport?.children ?? []).flatMap(el => el instanceof HTMLSlotElement
      ? el.assignedElements({ flatten: true }) : [el]).filter((el): el is HTMLElement => el instanceof HTMLElement);
    // Release animation ownership before returning removed content to its consumer.
    if (motion && !slides.includes(motion.outgoing)) finishMotion();
    if (activeSlide && !slides.includes(activeSlide)) { finishMotion(); activeSlide = undefined; }
    for (const slide of previous) if (!slides.includes(slide)) restoreSlide(slide);
  };
  const syncBudget = (restart = false) => {
    if (!options || !connected) return;
    budget.sync(valid(), options.durationMs);
    // Reopening an invalid composition resets the budget's pause reasons.
    // Reconcile every sequence-owned reason from its current owner.
    if (motion) budget.pause("transition");
    else budget.resume("transition");
    if (hovered) budget.pause("hover");
    else budget.resume("hover");
    if (!playing || pending) budget.pause("rotation");
    else budget.resume("rotation");
    if (restart) budget.restart();
  };
  const request = (next: number) => {
    if (!options || !valid()) return;
    const value = (next + slides.length) % slides.length;
    requestedIndex = value;
    requestedDirection = Math.sign(next - index()) || 1;
    // Wait for the controlled channel to acknowledge. Never repeat requests
    // against stale consumer state, including a delayed timer callback.
    pending = true;
    budget.pause("rotation");
    options.onIndexChange(value);
  };
  const stop = () => { focusStopped = true; playing = false; render(); syncBudget(); };
  const control = (event: Event) => {
    const target = event.composedPath().find(node => node instanceof HTMLButtonElement) as HTMLButtonElement | undefined;
    return target && target.closest("[data-sequence-root]") === root && !target.disabled ? target : undefined;
  };
  const clearPointerIntent = () => { pointerRotationIntent = undefined; };
  const pointerDown = (event: Event) => {
    clearPointerIntent();
    if ((event as PointerEvent).button === 0 && control(event)?.matches(config.parts.rotation)) {
      // Focus may stop rotation between pointerdown and click. Keep the action
      // the user pressed; keyboard activation instead uses the focused state.
      pointerRotationIntent = !playing;
    }
  };
  const click = (event: Event) => {
    const intent = event instanceof MouseEvent && event.detail > 0 ? pointerRotationIntent : undefined;
    clearPointerIntent();
    const target = control(event);
    if (!target) return;
    if (target.matches(config.parts.rotation)) {
      focusStopped = false;
      playing = intent ?? !playing;
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
    clearPointerIntent();
    observer?.disconnect();
    finishMotion();
    activeSlide = undefined;
    slides.forEach(restoreSlide);
    root?.removeEventListener("click", click);
    root?.removeEventListener("pointerdown", pointerDown);
    root?.removeEventListener("pointercancel", clearPointerIntent);
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
    root.addEventListener("pointerdown", pointerDown);
    root.addEventListener("pointercancel", clearPointerIntent);
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
