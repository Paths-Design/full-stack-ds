/**
 * Date-grid core: the visible month, its six-week day grid, selection,
 * roving-focus movement and Intl formatting for a calendar month grid.
 *
 * The grid is a pure function of the options and of the one piece of state
 * the core owns, the focused day. Framework bindings own reactivity: they
 * call `sync` while rendering, re-render when `subscribe` fires, and call
 * `afterRender` once the DOM reflects a keyboard move so focus can follow it.
 *
 * Days are local calendar days (`new Date(y, m, d)`), so arithmetic never
 * crosses a daylight-saving boundary by an hour. Formatting uses the
 * locale's calendar when its months coincide with Gregorian months and the
 * Gregorian calendar otherwise, because the grid itself is Gregorian.
 */

export type DateGridValue = Date | Date[] | null;

export interface DateGridOptions {
  value: DateGridValue | undefined;
  /** Any date inside the visible month; undefined follows the selection, then today. */
  month: Date | undefined;
  mode?: string;
  locale?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  /** An explicit caption replaces the formatted month and year. */
  caption?: string;
  onValueChange(value: DateGridValue): void;
  onMonthChange(month: Date): void;
}

export interface DateGridDay {
  /** Local calendar day as YYYY-MM-DD. */
  key: string;
  date: Date;
  label: string;
  fullLabel: string;
  selected: boolean;
  current: "date" | undefined;
  disabled: boolean;
  outsideMonth: boolean;
  tabIndex: 0 | -1;
}

export interface DateGridWeek {
  key: string;
  days: DateGridDay[];
}

export interface DateGridWeekday {
  key: string;
  short: string;
  long: string;
}

export interface DateGridState {
  month: Date;
  caption: string;
  weekdays: DateGridWeekday[];
  weeks: DateGridWeek[];
  previousDisabled: boolean;
  nextDisabled: boolean;
  disabled: boolean;
}

export interface DateGridKeyEvent {
  key: string;
  shiftKey?: boolean;
  target: EventTarget | null;
  currentTarget: EventTarget | null;
  preventDefault(): void;
}

const WEEKS = 6;
/** Calendars whose months are the Gregorian months (only era or year numbering differs). */
const GREGORIAN_MONTH_CALENDARS = new Set(["gregory", "iso8601", "buddhist", "japanese", "roc"]);
/** CLDR first-day-of-week territories for engines without Intl.Locale week info; every other territory starts on Monday. */
const SUNDAY_FIRST = new Set("AG AS BD BR BS BT BW BZ CA CO DM DO ET GT GU HK HN ID IL IN JM JP KE KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW".split(" "));
const SATURDAY_FIRST = new Set("AE AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY".split(" "));
const FRIDAY_FIRST = new Set(["MV"]);

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
/** Same day of the month `months` later, clamped to the target month's length (Jan 31 + 1 month = Feb 28). */
function addMonths(date: Date, months: number): Date {
  const first = new Date(date.getFullYear(), date.getMonth() + months, 1);
  return new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), daysInMonth(first.getFullYear(), first.getMonth())));
}
const isValidDate = (value: unknown): value is Date => value instanceof Date && !Number.isNaN(value.getTime());
const pad = (value: number) => String(value).padStart(2, "0");
export const dateGridKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

function parseKey(key: string | null | undefined): Date | undefined {
  const match = key ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(key) : null;
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
}

/** The selected days as a sorted [start, end] span (range) or a list (single). */
function selectionOf(value: DateGridValue | undefined): Date[] {
  if (isValidDate(value)) return [startOfDay(value)];
  if (Array.isArray(value)) return value.filter(isValidDate).map(startOfDay);
  return [];
}

function isSelected(day: Date, selection: Date[], range: boolean): boolean {
  if (range && selection.length >= 2) {
    const [a, b] = selection;
    const [start, end] = a <= b ? [a, b] : [b, a];
    return day >= start && day <= end;
  }
  return selection.some((entry) => sameDay(entry, day));
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(locale: string | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const id = `${locale ?? ""}|${JSON.stringify(options)}`;
  let cached = formatters.get(id);
  if (!cached) {
    let base: Intl.DateTimeFormat;
    try {
      base = new Intl.DateTimeFormat(locale, options);
    } catch {
      base = new Intl.DateTimeFormat(undefined, options);
    }
    cached = GREGORIAN_MONTH_CALENDARS.has(base.resolvedOptions().calendar)
      ? base
      : new Intl.DateTimeFormat(base.resolvedOptions().locale, { ...options, calendar: "gregory" });
    formatters.set(id, cached);
  }
  return cached;
}

interface WeekInfoLocale { getWeekInfo?(): { firstDay: number }; weekInfo?: { firstDay: number } }
/** First day of the week for a locale as a JS weekday (0 = Sunday). */
export function dateGridWeekStart(locale: string | undefined): number {
  try {
    const resolved = new Intl.Locale(locale ?? new Intl.DateTimeFormat().resolvedOptions().locale);
    const info = (resolved as Intl.Locale & WeekInfoLocale).getWeekInfo?.() ?? (resolved as Intl.Locale & WeekInfoLocale).weekInfo;
    if (info && Number.isInteger(info.firstDay)) return info.firstDay % 7;
    const region = resolved.maximize().region ?? "";
    if (SUNDAY_FIRST.has(region)) return 0;
    if (SATURDAY_FIRST.has(region)) return 6;
    if (FRIDAY_FIRST.has(region)) return 5;
    return 1;
  } catch {
    return 0;
  }
}

/**
 * The direction the grid is laid out in: the nearest `dir` attribute on the
 * composed ancestor chain. The walk crosses shadow roots to their hosts,
 * because a page sets `dir` outside a web component's shadow tree.
 */
function isRtl(target: EventTarget | null): boolean {
  let element = target as Element | null;
  while (element) {
    const holder = element.closest?.("[dir]");
    if (holder) return holder.getAttribute("dir") === "rtl";
    const root = element.getRootNode?.() as ShadowRoot | Document | undefined;
    element = root && "host" in root ? root.host : null;
  }
  return false;
}

/** Pure grid derivation from the options and the focused day. */
export function computeDateGrid(options: DateGridOptions, focusedKey: string | undefined, today: Date = new Date()): DateGridState {
  const range = options.mode === "range";
  const selection = selectionOf(options.value);
  const now = startOfDay(today);
  const month = startOfMonth(isValidDate(options.month) ? options.month : selection[0] ?? now);
  const min = isValidDate(options.minDate) ? startOfDay(options.minDate) : undefined;
  const max = isValidDate(options.maxDate) ? startOfDay(options.maxDate) : undefined;
  const disabled = !!options.disabled;
  const outOfBounds = (date: Date) => (min !== undefined && date < min) || (max !== undefined && date > max);
  const weekStart = dateGridWeekStart(options.locale);
  const first = addDays(month, -((month.getDay() - weekStart + 7) % 7));

  const dayLabel = formatter(options.locale, { day: "numeric" });
  const fullLabel = formatter(options.locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const shortWeekday = formatter(options.locale, { weekday: "short" });
  const longWeekday = formatter(options.locale, { weekday: "long" });
  const caption = formatter(options.locale, { month: "long", year: "numeric" });

  const inMonthEnabled = (date: Date) => sameMonth(date, month) && !outOfBounds(date);
  const lastDay = new Date(month.getFullYear(), month.getMonth(), daysInMonth(month.getFullYear(), month.getMonth()));
  const candidates = [parseKey(focusedKey), selection[0], now];
  let focus = candidates.find((date): date is Date => date !== undefined && inMonthEnabled(date));
  if (!focus) {
    for (let date = month; date <= lastDay; date = addDays(date, 1)) {
      if (!outOfBounds(date)) { focus = date; break; }
    }
  }
  const focusKey = dateGridKey(focus ?? month);

  const weeks: DateGridWeek[] = [];
  for (let row = 0; row < WEEKS; row += 1) {
    const days: DateGridDay[] = [];
    for (let column = 0; column < 7; column += 1) {
      const date = addDays(first, row * 7 + column);
      const key = dateGridKey(date);
      days.push({
        key,
        date,
        label: dayLabel.format(date),
        fullLabel: fullLabel.format(date),
        selected: isSelected(date, selection, range),
        current: sameDay(date, now) ? "date" : undefined,
        disabled: disabled || outOfBounds(date),
        outsideMonth: !sameMonth(date, month),
        tabIndex: key === focusKey ? 0 : -1,
      });
    }
    weeks.push({ key: days[0].key, days });
  }
  const weekdays = weeks[0].days.map(({ date }) => ({
    key: String(date.getDay()),
    short: shortWeekday.format(date),
    long: longWeekday.format(date),
  }));
  const previousLast = addDays(month, -1);
  const nextFirst = addDays(lastDay, 1);
  return {
    month,
    caption: options.caption ?? caption.format(month),
    weekdays,
    weeks,
    previousDisabled: disabled || (min !== undefined && previousLast < min),
    nextDisabled: disabled || (max !== undefined && nextFirst > max),
    disabled,
  };
}

export function createDateGrid(clock: () => Date = () => new Date()) {
  let options: DateGridOptions | undefined;
  let focusedKey: string | undefined;
  let pendingFocus: { key: string; root: Element } | undefined;
  let state: DateGridState | undefined;
  let version = 0;
  const listeners = new Set<() => void>();
  const publish = () => {
    version += 1;
    listeners.forEach((listener) => listener());
  };
  const current = (): DateGridState => {
    if (!state) throw new Error("date grid used before sync");
    return state;
  };
  const showMonth = (date: Date) => {
    if (!sameMonth(date, current().month)) options!.onMonthChange(startOfMonth(date));
  };
  const tabStop = (): Date => current().weeks.flatMap((week) => week.days).find((day) => day.tabIndex === 0)?.date ?? current().month;
  const move = (event: DateGridKeyEvent, step: (from: Date) => Date) => {
    const grid = current();
    if (grid.disabled || !options) return;
    const target = event.target as Element | null;
    const from = parseKey(target?.closest?.("[data-date]")?.getAttribute("data-date")) ?? tabStop();
    event.preventDefault();
    let next = step(from);
    if (isValidDate(options.minDate) && next < startOfDay(options.minDate)) next = startOfDay(options.minDate);
    if (isValidDate(options.maxDate) && next > startOfDay(options.maxDate)) next = startOfDay(options.maxDate);
    if (sameDay(next, from)) return;
    const root = event.currentTarget as Element | null;
    if (root) pendingFocus = { key: dateGridKey(next), root };
    focusedKey = dateGridKey(next);
    showMonth(next);
    publish();
  };
  const weekOffset = (date: Date) => (date.getDay() - dateGridWeekStart(options?.locale) + 7) % 7;
  const step = (months: number) => {
    const grid = current();
    if (grid.disabled || (months < 0 ? grid.previousDisabled : grid.nextDisabled)) return;
    const target = addMonths(tabStop(), months);
    focusedKey = dateGridKey(target);
    options!.onMonthChange(startOfMonth(target));
    publish();
  };

  return {
    get state(): DateGridState { return current(); },
    get version(): number { return version; },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    /** Record the latest options and derive the grid; never notifies. */
    sync(next: DateGridOptions): DateGridState {
      options = next;
      state = computeDateGrid(next, focusedKey, clock());
      return state;
    },
    previous: () => step(-1),
    next: () => step(1),
    select(day: DateGridDay) {
      if (!options || current().disabled || day.disabled) return;
      focusedKey = day.key;
      if (options.mode === "range") {
        const selection = selectionOf(options.value);
        options.onValueChange(selection.length === 1
          ? (selection[0] <= day.date ? [selection[0], day.date] : [day.date, selection[0]])
          : [day.date]);
      } else {
        options.onValueChange(day.date);
      }
      showMonth(day.date);
      publish();
    },
    keydown(event: DateGridKeyEvent) {
      switch (event.key) {
        case "ArrowLeft": return move(event, (from) => addDays(from, isRtl(event.currentTarget) ? 1 : -1));
        case "ArrowRight": return move(event, (from) => addDays(from, isRtl(event.currentTarget) ? -1 : 1));
        case "ArrowUp": return move(event, (from) => addDays(from, -7));
        case "ArrowDown": return move(event, (from) => addDays(from, 7));
        case "Home": return move(event, (from) => addDays(from, -weekOffset(from)));
        case "End": return move(event, (from) => addDays(from, 6 - weekOffset(from)));
        case "PageUp": return move(event, (from) => addMonths(from, event.shiftKey ? -12 : -1));
        case "PageDown": return move(event, (from) => addMonths(from, event.shiftKey ? 12 : 1));
        default: return undefined;
      }
    },
    /** Move DOM focus to the day a keyboard move targeted, once it is rendered. */
    afterRender() {
      if (!pendingFocus) return;
      const { key, root } = pendingFocus;
      const button = root.querySelector<HTMLElement>(`[data-date="${key}"]`);
      if (!button) return;
      pendingFocus = undefined;
      if (button.ownerDocument.activeElement !== button) button.focus();
    },
  };
}
export type DateGrid = ReturnType<typeof createDateGrid>;
