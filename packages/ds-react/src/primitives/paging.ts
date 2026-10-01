export interface PagedSetOptions {
  index: number;
  items: readonly unknown[];
  count?: number;
  disabled?: boolean;
  onIndexChange(index: number): void;
}
export interface PagedSetState {
  index: number;
  count: number;
  ordinal: string;
  draft: string;
  disabled: boolean;
  previousDisabled: boolean;
  nextDisabled: boolean;
}

/** Position and request policy. Item completion/progress remain consumer data. */
export function createPagedSet() {
  let options: PagedSetOptions | undefined;
  let pending: number | undefined;
  let requestSerial = 0;
  let state: PagedSetState = { index: 0, count: 0, ordinal: "", draft: "", disabled: true, previousDisabled: true, nextDisabled: true };
  const listeners = new Set<() => void>();
  const publish = (next: PagedSetState) => {
    if (Object.keys(next).every(key => next[key as keyof PagedSetState] === state[key as keyof PagedSetState])) return;
    state = next;
    listeners.forEach(listener => listener());
  };
  const request = (index: number) => {
    if (state.disabled || !Number.isSafeInteger(index) || index < 0 || index >= state.count || index === state.index || index === pending) return;
    pending = index;
    const ticket = ++requestSerial;
    queueMicrotask(() => { if (ticket === requestSerial) pending = undefined; });
    options!.onIndexChange(index);
  };
  const cancel = () => publish({ ...state, draft: state.ordinal });
  const commit = () => {
    if (/^[0-9]+$/.test(state.draft.trim())) request(Number(state.draft.trim()) - 1);
    cancel();
  };
  return {
    get state() { return state; },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    sync(next: PagedSetOptions) {
      const count = next.count ?? next.items.length;
      const valid = Number.isSafeInteger(count) && count > 0 && (next.items.length === 0 || next.items.length === count) &&
        Number.isSafeInteger(next.index) && next.index >= 0 && next.index < count;
      const changed = !options || next.index !== options.index || count !== state.count || next.disabled !== options.disabled;
      if (changed) pending = undefined;
      const ordinal = valid ? String(next.index + 1) : "";
      options = next;
      publish({ index: next.index, count: Number.isSafeInteger(count) && count >= 0 ? count : 0,
        ordinal, draft: changed ? ordinal : state.draft, disabled: !valid || !!next.disabled,
        previousDisabled: !valid || !!next.disabled || next.index === 0,
        nextDisabled: !valid || !!next.disabled || next.index === count - 1 });
    },
    request,
    previous: () => request(state.index - 1),
    next: () => request(state.index + 1),
    edit(value: string) { if (!state.disabled) publish({ ...state, draft: value }); },
    commit,
    commitOnEnter(event: { key: string; preventDefault(): void }) {
      if (event.key === "Enter") { event.preventDefault(); commit(); }
      if (event.key === "Escape") { event.preventDefault(); cancel(); }
    },
    cancel,
  };
}
export type PagedSet = ReturnType<typeof createPagedSet>;
