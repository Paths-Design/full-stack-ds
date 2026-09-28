/** Mirrored web primitive: one active-time budget, with an optional DOM projection.
 * Framework wrappers own lifecycle. Progress never owns dismissal or another clock.
 */
export function createPresenceBudget(onDismiss: () => void, reducedMotionSteps = 10, onProgress?: (remaining: number, enabled: boolean, reduced: boolean) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let frame: number | undefined;
  let duration = 0;
  let remaining = 0;
  let deadline = 0;
  let enabled = false;
  let lastOpen: boolean | undefined;
  let lastDuration: number | null | undefined;
  const reasons = new Set<string>();
  let target: HTMLElement | undefined;
  let listening = false;
  let media: MediaQueryList | undefined;
  const now = () => performance.now();
  const left = () => timer === undefined ? remaining : Math.max(0, deadline - now());
  const cancelFrame = () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
  };
  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const paint = () => {
    const fraction = enabled ? Math.min(1, left() / duration) : 0;
    const value = media?.matches
      ? Math.ceil(fraction * reducedMotionSteps) / reducedMotionSteps : fraction;
    onProgress?.(fraction, enabled, media?.matches ?? false);
    if (target) {
      target.hidden = !enabled;
      target.style.transform = `scaleX(${value})`;
    }
  };
  const draw = () => {
    frame = undefined;
    paint();
    if ((target || onProgress) && timer !== undefined) frame = requestAnimationFrame(draw);
  };
  const render = () => {
    cancelFrame();
    draw();
  };
  const start = () => {
    if (!enabled || reasons.size || timer !== undefined || remaining <= 0) return;
    deadline = now() + remaining;
    timer = setTimeout(() => {
      timer = undefined;
      remaining = 0;
      render();
      onDismiss();
    }, remaining);
    render();
  };
  const pause = (reason = "manual") => {
    reasons.add(reason);
    remaining = left();
    clearTimer();
    render();
  };
  const resume = (reason = "manual") => {
    reasons.delete(reason);
    start();
  };
  const visibility = () => {
    if (document.hidden) pause("document-hidden");
    else resume("document-hidden");
  };
  const connect = () => {
    if (listening || typeof document === "undefined") return;
    listening = true;
    document.addEventListener("visibilitychange", visibility);
    media = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : undefined;
    media?.addEventListener("change", render);
    if (document.hidden) reasons.add("document-hidden");
  };
  const sync = (open: boolean, ms: number | null | undefined) => {
    connect();
    if (open === lastOpen && Object.is(ms, lastDuration)) return;
    const reopening = lastOpen !== true && open;
    lastOpen = open;
    lastDuration = ms;
    clearTimer();
    enabled = open && typeof ms === "number" && Number.isFinite(ms) && ms > 0;
    duration = enabled ? ms as number : 0;
    remaining = duration;
    if (!open || reopening) {
      reasons.clear();
      if (typeof document !== "undefined" && document.hidden) reasons.add("document-hidden");
    }
    start();
    render();
  };
  const bindProgress = (element: Element | null | undefined) => {
    target = element instanceof HTMLElement ? element : undefined;
    render();
  };
  const destroy = () => {
    clearTimer();
    cancelFrame();
    if (listening) document.removeEventListener("visibilitychange", visibility);
    media?.removeEventListener("change", render);
    listening = false;
    enabled = false;
    lastOpen = undefined;
    remaining = 0;
    reasons.clear();
    paint();
  };
  const focusOut = (event?: { currentTarget: EventTarget | null; relatedTarget: EventTarget | null }) => {
    if (event?.currentTarget instanceof Node && event.relatedTarget instanceof Node &&
        event.currentTarget.contains(event.relatedTarget)) return;
    resume("focus");
  };
  const restart = () => {
    clearTimer();
    remaining = duration;
    start();
    render();
  };
  return { sync, pause, resume, bindProgress, destroy, focusOut, restart,
    /** Read-only projection for consumers; never a second time source. */
    snapshot: () => ({ enabled, remainingMs: left(), durationMs: duration, paused: reasons.size > 0 }),
  };
}
