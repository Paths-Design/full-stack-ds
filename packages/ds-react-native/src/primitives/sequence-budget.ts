export interface SequenceOptions {
  index: number;
  labels: readonly string[];
  childKeys: readonly string[];
  durationMs: number | null | undefined;
  autoPlay: boolean;
  onIndexChange: (index: number) => void;
}

export interface SequenceSnapshot {
  index: number;
  valid: boolean;
  playing: boolean;
  timed: boolean;
  paused: boolean;
  pending: boolean;
  elapsed: number;
  reducedMotion: boolean;
  direction: number;
  revision: number;
}

export interface SequenceTransition {
  durationMs: number;
  easing: string;
  referenceWidth: number;
  minMultiplier: number;
  maxMultiplier: number;
}

/** Native sequence policy. Platform events supply pause reasons; projections
 * observe the same deadline that requests advancement. Animation completion
 * may release a pause, but cannot request another index.
 */
export function createSequenceBudget(publish: (state: SequenceSnapshot) => void) {
  let options: SequenceOptions | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let frame: ReturnType<typeof setTimeout> | undefined;
  let remaining = 0;
  let deadline = 0;
  let playing = false;
  let focusStopped = false;
  let pending = false;
  let reducedMotion = false;
  let direction = 1;
  let revision = 0;
  let destroyed = false;
  let identity = "";
  const reasons = new Set<string>();
  const now = () => performance.now();
  const index = () => Math.max(0, Math.min((options?.childKeys.length ?? 1) - 1, Math.trunc(options?.index ?? 0) || 0));
  const valid = () => Boolean(options && options.labels.length > 1 && options.labels.length === options.childKeys.length);
  const duration = () => typeof options?.durationMs === "number" && Number.isFinite(options.durationMs) && options.durationMs > 0 ? options.durationMs : 0;
  const left = () => timer === undefined ? remaining : Math.max(0, deadline - now());
  const snapshot = (): SequenceSnapshot => ({ index: index(), valid: valid(), playing,
    timed: duration() > 0, paused: reasons.size > 0 || !playing || pending, pending,
    elapsed: duration() ? Math.max(0, Math.min(1, 1 - left() / duration())) : 0,
    reducedMotion, direction, revision });
  const paint = () => { if (!destroyed) publish(snapshot()); };
  const cancel = () => {
    remaining = left();
    if (timer !== undefined) clearTimeout(timer);
    if (frame !== undefined) clearTimeout(frame);
    timer = undefined;
    frame = undefined;
  };
  const draw = () => {
    frame = undefined;
    paint();
    if (timer !== undefined) frame = setTimeout(draw, reducedMotion ? 100 : 16);
  };
  const start = () => {
    if (destroyed || !valid() || !duration() || !playing || pending || reasons.size || timer !== undefined || remaining <= 0) return;
    deadline = now() + remaining;
    timer = setTimeout(() => {
      timer = undefined;
      remaining = 0;
      request(index() + 1);
    }, remaining);
    draw();
  };
  const reconcile = () => { cancel(); start(); paint(); };
  const request = (next: number) => {
    if (destroyed || !valid() || !options) return;
    const count = options.childKeys.length;
    const value = ((Math.trunc(next) % count) + count) % count;
    if (value === index()) return;
    direction = Math.sign(next - index()) || 1;
    pending = true;
    cancel();
    paint();
    options.onIndexChange(value);
  };
  const sync = (next: SequenceOptions) => {
    if (destroyed) return;
    cancel();
    const nextIdentity = JSON.stringify([next.labels, next.childKeys]);
    const changed = !options || next.index !== options.index || identity !== nextIdentity;
    const newDuration = !Object.is(options?.durationMs, next.durationMs);
    if (next.autoPlay !== options?.autoPlay) playing = next.autoPlay && !focusStopped;
    if (changed) {
      if (!pending && options) direction = Math.sign(next.index - options.index) || 1;
      pending = false;
      revision++;
    }
    options = next;
    identity = nextIdentity;
    if (changed || newDuration) remaining = duration();
    // Invalid composition must not erase platform/interaction pause ownership.
    start();
    paint();
  };
  const pause = (reason: string) => { reasons.add(reason); reconcile(); };
  const resume = (reason: string) => { reasons.delete(reason); reconcile(); };
  const stop = () => { focusStopped = true; playing = false; reconcile(); };
  const rotate = (value = !playing) => {
    focusStopped = false;
    playing = value;
    // A controlled request still needs acknowledgement, even after Stop/Start.
    if (remaining <= 0 && !pending) remaining = duration();
    reconcile();
  };
  return { sync, snapshot, request, pause, resume, stop, rotate,
    beginTransition() {
      cancel(); reasons.add("transition"); remaining = duration(); paint();
      return revision;
    },
    finishTransition(owner: number) { if (owner === revision) resume("transition"); },
    setReducedMotion(value: boolean) { reducedMotion = value; reconcile(); },
    destroy() { cancel(); destroyed = true; options = undefined; reasons.clear(); },
  };
}
