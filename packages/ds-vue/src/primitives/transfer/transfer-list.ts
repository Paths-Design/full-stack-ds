/**
 * Framework-free core of a dual-listbox transfer list. Copied byte-for-byte
 * into each web package and React Native by the codegen CLI; the per-framework
 * hooks wrap `createTransferList`.
 *
 * Two listboxes partition a candidate set. The selected list is the value, in
 * the order items were moved into it; the available list is every option not
 * in the value, in options order. An item is marked for transfer by Space or a
 * click, and `aria-selected` reports that mark. Enter, or a button, moves the
 * marked items (Enter: the focused item when nothing is marked) to the other
 * list and reports the new value.
 */

export type TransferListSide = "available" | "selected";

export interface TransferListOptions {
  /** Candidate item ids, in display order; absent reads as none. */
  options?: readonly string[];
  /** Ids in the selected list, in transfer order; absent reads as none. */
  value?: readonly string[];
  onValueChange(value: string[]): void;
}

export interface TransferListItem {
  key: string;
  label: string;
  side: TransferListSide;
  marked: boolean;
  tabIndex: 0 | -1;
}

export interface TransferListState {
  available: TransferListItem[];
  selected: TransferListItem[];
  addDisabled: boolean;
  removeDisabled: boolean;
}

export type TransferListMarks = Record<TransferListSide, Set<string>>;
export type TransferListFocus = Partial<Record<TransferListSide, string>>;

export interface TransferListKeyEvent {
  key: string;
  target: EventTarget | null;
  currentTarget: EventTarget | null;
  preventDefault(): void;
}

const SIDES: readonly TransferListSide[] = ["available", "selected"];
const other = (side: TransferListSide): TransferListSide => (side === "available" ? "selected" : "available");

function sideItems(side: TransferListSide, keys: readonly string[], marks: TransferListMarks, focus: TransferListFocus): TransferListItem[] {
  const stop = focus[side] !== undefined && keys.includes(focus[side]!) ? focus[side] : keys[0];
  return keys.map((key) => ({
    key,
    label: key,
    side,
    marked: marks[side].has(key),
    tabIndex: key === stop ? 0 : -1,
  }));
}

/** Derive both lists from the options, the marks and each list's focused item. */
export function computeTransferList(options: TransferListOptions, marks: TransferListMarks, focus: TransferListFocus): TransferListState {
  const value = [...new Set(options.value ?? [])];
  const chosen = new Set(value);
  const available = [...new Set(options.options ?? [])].filter((key) => !chosen.has(key));
  const lists = { available, selected: value };
  for (const side of SIDES) {
    for (const key of [...marks[side]]) if (!lists[side].includes(key)) marks[side].delete(key);
  }
  return {
    available: sideItems("available", available, marks, focus),
    selected: sideItems("selected", value, marks, focus),
    addDisabled: marks.available.size === 0,
    removeDisabled: marks.selected.size === 0,
  };
}

function sideOf(element: Element | null): TransferListSide | undefined {
  const side = element?.closest?.("[data-side]")?.getAttribute("data-side");
  return side === "available" || side === "selected" ? side : undefined;
}

export function createTransferList() {
  let options: TransferListOptions | undefined;
  let state: TransferListState | undefined;
  const marks: TransferListMarks = { available: new Set(), selected: new Set() };
  const focus: TransferListFocus = {};
  /** An item DOM focus should move to once it renders, found from `root`. */
  let pendingFocus: { side: TransferListSide; key: string; root: Element } | undefined;
  /** The value a transfer reported, until the next sync brings the options
   * that answer it; the lists and a second transfer before then build on it,
   * so keys pressed faster than renders act on what the user has done. */
  let reported: string[] | undefined;
  let version = 0;
  const listeners = new Set<() => void>();
  const publish = () => {
    version += 1;
    listeners.forEach((listener) => listener());
  };
  const current = (): TransferListState => {
    if (!state || !options) throw new Error("transfer list used before sync");
    return state;
  };
  const rootOf = (element: Element) => element.closest('[role="group"]') ?? element.parentElement ?? element;

  /** Move `moving` out of `side`, report the value, and clear that side's marks. */
  const transfer = (side: TransferListSide, moving: string[]) => {
    if (!options || moving.length === 0) return;
    const current = reported ?? options.value ?? [];
    const value = side === "available"
      ? [...current, ...moving.filter((key) => !current.includes(key))]
      : current.filter((key) => !moving.includes(key));
    marks[side].clear();
    reported = value;
    state = computeTransferList({ ...options, value }, marks, focus);
    options.onValueChange(value);
    publish();
  };
  /** The live marks of a side, in that list's order (marks change between syncs). */
  const markedIn = (side: TransferListSide) => current()[side].filter((item) => marks[side].has(item.key)).map((item) => item.key);

  /** The item a key acts on: the one an earlier key targeted while its render
   * is pending (so keys pressed faster than renders accumulate), else the
   * focused item, else the list's tab stop. */
  const anchorKey = (event: TransferListKeyEvent, side: TransferListSide) =>
    (pendingFocus?.side === side ? pendingFocus.key : undefined)
      ?? (event.target as Element | null)?.closest?.("[data-value]")?.getAttribute("data-value")
      ?? current()[side].find((item) => item.tabIndex === 0)?.key;

  const move = (event: TransferListKeyEvent, to: (index: number, last: number) => number) => {
    const side = sideOf(event.currentTarget as Element | null);
    if (!side) return;
    const items = current()[side];
    if (items.length === 0) return;
    event.preventDefault();
    const anchor = anchorKey(event, side);
    const from = items.findIndex((item) => item.key === anchor);
    const next = items[Math.max(0, Math.min(items.length - 1, to(from, items.length - 1)))];
    focus[side] = next.key;
    pendingFocus = { side, key: next.key, root: rootOf(event.currentTarget as Element) };
    publish();
  };

  /** Space: mark or unmark the focused item. */
  const mark = (event: TransferListKeyEvent) => {
    const side = sideOf(event.currentTarget as Element | null);
    if (!side) return;
    const key = anchorKey(event, side);
    const item = current()[side].find((candidate) => candidate.key === key);
    if (!item) return;
    event.preventDefault();
    if (marks[side].has(item.key)) marks[side].delete(item.key);
    else marks[side].add(item.key);
    focus[side] = item.key;
    publish();
  };

  const scheduleTransferFocus = (side: TransferListSide, moving: string[], root: Element) => {
    const items = current()[side];
    // Focus stays in this list on the nearest item that remains, or follows
    // the first moved item when the list empties.
    const remaining = items.filter((item) => !moving.includes(item.key));
    const at = items.findIndex((item) => item.key === moving[0]);
    const nearest = remaining.find((item) => items.indexOf(item) > at) ?? remaining[remaining.length - 1];
    if (nearest) {
      focus[side] = nearest.key;
      pendingFocus = { side, key: nearest.key, root };
    } else {
      focus[other(side)] = moving[0];
      pendingFocus = { side: other(side), key: moving[0], root };
    }
  };

  /** Enter: move the marked items, or the focused item when none is marked. */
  const send = (event: TransferListKeyEvent) => {
    const side = sideOf(event.currentTarget as Element | null);
    if (!side) return;
    const key = anchorKey(event, side);
    const moving = markedIn(side).length > 0 ? markedIn(side) : current()[side].filter((item) => item.key === key).map((item) => item.key);
    if (moving.length === 0) return;
    event.preventDefault();
    scheduleTransferFocus(side, moving, rootOf(event.currentTarget as Element));
    transfer(side, moving);
  };

  /** A web button becomes disabled after consuming its marks. Move focus to
   * an option before that leaves the user without a focused control. Native
   * press events and imperative calls have no DOM focus target. */
  const buttonTransfer = (side: TransferListSide, event?: { currentTarget?: unknown }) => {
    const moving = markedIn(side);
    if (moving.length === 0) return;
    const target = event?.currentTarget as Element | undefined;
    if (target && typeof target.closest === "function") {
      scheduleTransferFocus(side, moving, rootOf(target));
    }
    transfer(side, moving);
  };

  return {
    get state(): TransferListState { return current(); },
    get version(): number { return version; },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    /** Record the latest options and derive both lists; never notifies. */
    sync(next: TransferListOptions): TransferListState {
      options = next;
      reported = undefined;
      state = computeTransferList(next, marks, focus);
      return state;
    },
    /** Mark or unmark an item (a click on an option). */
    toggle(item: TransferListItem) {
      if (!options) return;
      if (marks[item.side].has(item.key)) marks[item.side].delete(item.key);
      else marks[item.side].add(item.key);
      focus[item.side] = item.key;
      publish();
    },
    /** Move the marked available items to the end of the value. */
    add: (event?: { currentTarget?: unknown }) => buttonTransfer("available", event),
    /** Move the marked selected items back to the available list. */
    remove: (event?: { currentTarget?: unknown }) => buttonTransfer("selected", event),
    /** Keys act on the list they are pressed in (its data-side). */
    keydown(event: TransferListKeyEvent) {
      switch (event.key) {
        case "ArrowDown": return move(event, (index) => index + 1);
        case "ArrowUp": return move(event, (index) => index - 1);
        case "Home": return move(event, () => 0);
        case "End": return move(event, (_index, last) => last);
        case " ": return mark(event);
        case "Enter": return send(event);
        default: return undefined;
      }
    },
    /** Move DOM focus to the item a key press targeted, once it renders. */
    afterRender() {
      if (!pendingFocus) return;
      const { side, key, root } = pendingFocus;
      pendingFocus = undefined;
      const target = [...root.querySelectorAll<HTMLElement>(`[data-side="${side}"] [data-value]`)]
        .find((element) => element.getAttribute("data-value") === key);
      if (target && target.ownerDocument.activeElement !== target) target.focus();
    },
  };
}
export type TransferList = ReturnType<typeof createTransferList>;
