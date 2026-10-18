// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { computeDateGrid, createDateGrid, dateGridKey, dateGridWeekStart, type DateGridOptions } from "./date-grid.js";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const options = (over: Partial<DateGridOptions> = {}): DateGridOptions => ({
  value: undefined, month: day(2026, 10, 1), locale: "en-US", mode: "single",
  onValueChange: () => {}, onMonthChange: () => {}, ...over,
});
const keys = (grid: ReturnType<typeof computeDateGrid>) => grid.weeks.flatMap((w) => w.days.map((d) => d.key));
const find = (grid: ReturnType<typeof computeDateGrid>, key: string) => grid.weeks.flatMap((w) => w.days).find((d) => d.key === key)!;
const tabStops = (grid: ReturnType<typeof computeDateGrid>) => grid.weeks.flatMap((w) => w.days).filter((d) => d.tabIndex === 0).map((d) => d.key);
const TODAY = day(2026, 10, 18);

function keyEvent(key: string, from: string, extra: { shiftKey?: boolean; rtl?: boolean } = {}) {
  const root = document.createElement("table");
  if (extra.rtl) root.setAttribute("dir", "rtl");
  const button = document.createElement("button");
  button.setAttribute("data-date", from);
  root.append(button);
  const preventDefault = vi.fn();
  return { event: { key, shiftKey: extra.shiftKey, target: button, currentTarget: root, preventDefault }, preventDefault, root };
}

describe("date grid derivation", () => {
  it("lays out six locale-ordered weeks around the visible month", () => {
    const us = computeDateGrid(options(), undefined, TODAY);
    expect(us.weeks).toHaveLength(6);
    expect(us.weeks.every((w) => w.days.length === 7)).toBe(true);
    expect(keys(us)[0]).toBe("2026-09-27");
    expect(keys(us)[41]).toBe("2026-11-07");
    expect(us.weekdays.map((w) => w.short)).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    expect(us.weekdays[0].long).toBe("Sunday");
    expect(us.caption).toBe("October 2026");

    const de = computeDateGrid(options({ locale: "de-DE" }), undefined, TODAY);
    expect(keys(de)[0]).toBe("2026-09-28");
    expect(de.weekdays[0].long).toBe("Montag");
    expect(de.caption).toBe("Oktober 2026");
    expect(find(de, "2026-10-18").fullLabel).toBe("Sonntag, 18. Oktober 2026");
  });

  it("formats day labels and names in the locale's numbering system", () => {
    const ar = computeDateGrid(options({ locale: "ar-EG" }), undefined, TODAY);
    expect(keys(ar)[0]).toBe("2026-09-26");
    expect(find(ar, "2026-10-18").label).toBe("١٨");
    expect(find(ar, "2026-10-18").outsideMonth).toBe(false);
    expect(find(ar, "2026-09-30").outsideMonth).toBe(true);
  });

  it("formats in Gregorian when the locale's calendar months differ, and keeps Gregorian-month calendars", () => {
    const fa = computeDateGrid(options({ locale: "fa-IR" }), undefined, TODAY);
    expect(find(fa, "2026-10-18").label).toBe("۱۸");
    expect(fa.caption).toBe("اکتبر ۲۰۲۶");
    const th = computeDateGrid(options({ locale: "th-TH" }), undefined, TODAY);
    expect(th.caption).toBe("ตุลาคม 2569");
  });

  it("an explicit caption replaces the formatted month", () => {
    expect(computeDateGrid(options({ caption: "Check-in" }), undefined, TODAY).caption).toBe("Check-in");
  });

  it("exposes exactly one tab stop: focused day, else selected day, else today, else the first enabled day", () => {
    expect(tabStops(computeDateGrid(options(), undefined, TODAY))).toEqual(["2026-10-18"]);
    expect(tabStops(computeDateGrid(options({ value: day(2026, 10, 3) }), undefined, TODAY))).toEqual(["2026-10-03"]);
    expect(tabStops(computeDateGrid(options({ value: day(2026, 10, 3) }), "2026-10-09", TODAY))).toEqual(["2026-10-09"]);
    expect(tabStops(computeDateGrid(options({ month: day(2026, 12, 1) }), undefined, TODAY))).toEqual(["2026-12-01"]);
    expect(tabStops(computeDateGrid(options({ minDate: day(2026, 10, 20) }), undefined, TODAY))).toEqual(["2026-10-20"]);
    // A focused key outside the visible month does not hold the tab stop.
    expect(tabStops(computeDateGrid(options(), "2026-11-02", TODAY))).toEqual(["2026-10-18"]);
  });

  it("follows the selection's month when no month is given", () => {
    const grid = computeDateGrid(options({ month: undefined, value: day(2027, 3, 9) }), undefined, TODAY);
    expect(grid.caption).toBe("March 2027");
    expect(computeDateGrid(options({ month: undefined }), undefined, TODAY).caption).toBe("October 2026");
  });

  it("marks single and range selections, and today", () => {
    const single = computeDateGrid(options({ value: day(2026, 10, 3) }), undefined, TODAY);
    expect(keys(single).filter((k) => find(single, k).selected)).toEqual(["2026-10-03"]);
    const range = computeDateGrid(options({ mode: "range", value: [day(2026, 10, 9), day(2026, 10, 6)] }), undefined, TODAY);
    expect(keys(range).filter((k) => find(range, k).selected)).toEqual(["2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"]);
    const open = computeDateGrid(options({ mode: "range", value: [day(2026, 10, 9)] }), undefined, TODAY);
    expect(keys(open).filter((k) => find(open, k).selected)).toEqual(["2026-10-09"]);
    expect(keys(single).filter((k) => find(single, k).current === "date")).toEqual(["2026-10-18"]);
  });

  it("disables days outside the bounds and the nav buttons that would leave them", () => {
    const grid = computeDateGrid(options({ minDate: day(2026, 10, 5), maxDate: day(2026, 10, 28) }), undefined, TODAY);
    expect(find(grid, "2026-10-04").disabled).toBe(true);
    expect(find(grid, "2026-10-05").disabled).toBe(false);
    expect(find(grid, "2026-10-29").disabled).toBe(true);
    expect([grid.previousDisabled, grid.nextDisabled]).toEqual([true, true]);
    const open = computeDateGrid(options({ minDate: day(2026, 10, 1), maxDate: day(2026, 11, 1) }), undefined, TODAY);
    expect([open.previousDisabled, open.nextDisabled]).toEqual([true, false]);
    const off = computeDateGrid(options({ disabled: true }), undefined, TODAY);
    expect(off.weeks.flatMap((w) => w.days).every((d) => d.disabled)).toBe(true);
    expect([off.previousDisabled, off.nextDisabled]).toEqual([true, true]);
  });

  it("does not throw on an invalid locale tag", () => {
    expect(() => computeDateGrid(options({ locale: "not a locale" }), undefined, TODAY)).not.toThrow();
  });
});

describe("week start", () => {
  afterEach(() => vi.restoreAllMocks());
  it("reads the locale's first day of the week", () => {
    expect([dateGridWeekStart("en-US"), dateGridWeekStart("de-DE"), dateGridWeekStart("ar-EG"), dateGridWeekStart("fa-IR")]).toEqual([0, 1, 6, 6]);
  });
  it("falls back to the CLDR territory table when the engine has no week info", () => {
    const proto = Intl.Locale.prototype as unknown as Record<string, unknown>;
    const saved = Object.getOwnPropertyDescriptor(proto, "weekInfo");
    const savedFn = Object.getOwnPropertyDescriptor(proto, "getWeekInfo");
    Object.defineProperty(proto, "weekInfo", { configurable: true, get: () => undefined });
    Object.defineProperty(proto, "getWeekInfo", { configurable: true, value: undefined });
    try {
      // The engine's week info is gone, so these answers come from the table.
      expect((new Intl.Locale("en-GB") as unknown as { weekInfo?: unknown }).weekInfo).toBeUndefined();
      expect([dateGridWeekStart("en-US"), dateGridWeekStart("en-GB"), dateGridWeekStart("ar-EG"), dateGridWeekStart("dv-MV"), dateGridWeekStart("he")]).toEqual([0, 1, 6, 5, 0]);
    } finally {
      if (saved) Object.defineProperty(proto, "weekInfo", saved); else delete proto.weekInfo;
      if (savedFn) Object.defineProperty(proto, "getWeekInfo", savedFn); else delete proto.getWeekInfo;
    }
  });
});

describe("date grid interaction", () => {
  function setup(over: Partial<DateGridOptions> = {}) {
    const onValueChange = vi.fn();
    const onMonthChange = vi.fn();
    const grid = createDateGrid(() => TODAY);
    const opts = options({ onValueChange, onMonthChange, ...over });
    grid.sync(opts);
    const listener = vi.fn();
    grid.subscribe(listener);
    return { grid, opts, onValueChange, onMonthChange, listener };
  }
  const press = (grid: ReturnType<typeof createDateGrid>, opts: DateGridOptions, key: string, from: string, extra = {}) => {
    const { event, preventDefault } = keyEvent(key, from, extra);
    grid.keydown(event);
    grid.sync(opts);
    return { preventDefault, stop: tabStops(grid.state) };
  };

  it("moves the tab stop by day, week and week edge", () => {
    const { grid, opts, listener } = setup();
    expect(press(grid, opts, "ArrowRight", "2026-10-18").stop).toEqual(["2026-10-19"]);
    expect(press(grid, opts, "ArrowLeft", "2026-10-19").stop).toEqual(["2026-10-18"]);
    expect(press(grid, opts, "ArrowDown", "2026-10-18").stop).toEqual(["2026-10-25"]);
    expect(press(grid, opts, "ArrowUp", "2026-10-25").stop).toEqual(["2026-10-18"]);
    // en-US weeks run Sunday..Saturday; Oct 21 2026 is a Wednesday.
    expect(press(grid, opts, "Home", "2026-10-21").stop).toEqual(["2026-10-18"]);
    expect(press(grid, opts, "End", "2026-10-21").stop).toEqual(["2026-10-24"]);
    expect(listener).toHaveBeenCalledTimes(6);
  });

  it("uses the locale's week for Home and End", () => {
    const { grid, opts } = setup({ locale: "de-DE" });
    expect(press(grid, opts, "Home", "2026-10-21").stop).toEqual(["2026-10-19"]);
    expect(press(grid, opts, "End", "2026-10-21").stop).toEqual(["2026-10-25"]);
  });

  it("mirrors ArrowLeft and ArrowRight in a right-to-left grid", () => {
    const { grid, opts } = setup();
    expect(press(grid, opts, "ArrowLeft", "2026-10-18", { rtl: true }).stop).toEqual(["2026-10-19"]);
    expect(press(grid, opts, "ArrowRight", "2026-10-19", { rtl: true }).stop).toEqual(["2026-10-18"]);
  });

  it("crossing a month edge moves the month channel", () => {
    const { grid, opts, onMonthChange } = setup();
    press(grid, opts, "ArrowRight", "2026-10-31");
    expect(onMonthChange).toHaveBeenLastCalledWith(day(2026, 11, 1));
    press(grid, opts, "ArrowRight", "2026-10-30");
    expect(onMonthChange).toHaveBeenCalledTimes(1);
  });

  it("pages by month and, with Shift, by year, clamping to the month's length", () => {
    const { grid, opts, onMonthChange } = setup({ month: day(2026, 3, 1) });
    const { event } = keyEvent("PageUp", "2026-03-31");
    grid.keydown(event);
    expect(onMonthChange).toHaveBeenLastCalledWith(day(2026, 2, 1));
    grid.sync({ ...opts, month: day(2026, 2, 1) });
    expect(tabStops(grid.state)).toEqual(["2026-02-28"]);
    const leap = keyEvent("PageDown", "2028-02-29", { shiftKey: true });
    grid.keydown(leap.event);
    expect(onMonthChange).toHaveBeenLastCalledWith(day(2029, 2, 1));
    grid.sync({ ...opts, month: day(2029, 2, 1) });
    expect(tabStops(grid.state)).toEqual(["2029-02-28"]);
  });

  it("clamps keyboard moves to the bounds and ignores keys it does not own", () => {
    const { grid, opts, listener } = setup({ minDate: day(2026, 10, 5) });
    const atMin = press(grid, opts, "ArrowLeft", "2026-10-05");
    expect(atMin.preventDefault).toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(press(grid, opts, "ArrowUp", "2026-10-08").stop).toEqual(["2026-10-05"]);
    const other = press(grid, opts, "a", "2026-10-08");
    expect(other.preventDefault).not.toHaveBeenCalled();
  });

  it("a disabled grid neither moves nor selects", () => {
    const { grid, opts, onValueChange, listener } = setup({ disabled: true });
    const { preventDefault } = press(grid, opts, "ArrowRight", "2026-10-18");
    expect(preventDefault).not.toHaveBeenCalled();
    grid.select(find(grid.state, "2026-10-10"));
    grid.previous();
    expect(onValueChange).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("selects a single date and moves to an outside-month day's month", () => {
    const { grid, onValueChange, onMonthChange } = setup();
    grid.select(find(grid.state, "2026-10-10"));
    expect(onValueChange).toHaveBeenLastCalledWith(day(2026, 10, 10));
    expect(onMonthChange).not.toHaveBeenCalled();
    grid.select(find(grid.state, "2026-11-02"));
    expect(onValueChange).toHaveBeenLastCalledWith(day(2026, 11, 2));
    expect(onMonthChange).toHaveBeenLastCalledWith(day(2026, 11, 1));
  });

  it("builds an ordered range from two activations, then starts over", () => {
    const { grid, opts, onValueChange } = setup({ mode: "range" });
    grid.select(find(grid.state, "2026-10-12"));
    expect(onValueChange).toHaveBeenLastCalledWith([day(2026, 10, 12)]);
    grid.sync({ ...opts, value: [day(2026, 10, 12)] });
    grid.select(find(grid.state, "2026-10-08"));
    expect(onValueChange).toHaveBeenLastCalledWith([day(2026, 10, 8), day(2026, 10, 12)]);
    grid.sync({ ...opts, value: [day(2026, 10, 8), day(2026, 10, 12)] });
    grid.select(find(grid.state, "2026-10-20"));
    expect(onValueChange).toHaveBeenLastCalledWith([day(2026, 10, 20)]);
  });

  it("ignores a disabled day", () => {
    const { grid, onValueChange } = setup({ maxDate: day(2026, 10, 15) });
    grid.select(find(grid.state, "2026-10-16"));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("previous and next move the month and carry the focused day", () => {
    const { grid, opts, onMonthChange } = setup({ value: day(2026, 10, 31) });
    grid.next();
    expect(onMonthChange).toHaveBeenLastCalledWith(day(2026, 11, 1));
    grid.sync({ ...opts, month: day(2026, 11, 1) });
    expect(tabStops(grid.state)).toEqual(["2026-11-30"]);
    grid.previous();
    expect(onMonthChange).toHaveBeenLastCalledWith(day(2026, 10, 1));
  });

  it("does not page past a bound", () => {
    const { grid, onMonthChange } = setup({ maxDate: day(2026, 10, 20) });
    grid.next();
    expect(onMonthChange).not.toHaveBeenCalled();
  });

  it("focuses the moved-to day after the next render", () => {
    const { grid, opts } = setup();
    const { event, root } = keyEvent("ArrowRight", "2026-10-18");
    document.body.append(root);
    const target = document.createElement("button");
    target.setAttribute("data-date", "2026-10-19");
    root.append(target);
    grid.keydown(event);
    grid.sync(opts);
    grid.afterRender();
    expect(document.activeElement).toBe(target);
    root.remove();
  });

  /** A grid whose buttons are re-rendered by position, as every target renders it. */
  function positionalGrid(host: ParentNode, keys: string[]) {
    const root = document.createElement("table");
    root.setAttribute("role", "grid");
    const buttons = keys.map((key) => {
      const button = document.createElement("button");
      button.setAttribute("data-date", key);
      root.append(button);
      return button;
    });
    host.append(root);
    return { root, buttons, rerender: (next: string[]) => next.forEach((key, i) => buttons[i].setAttribute("data-date", key)) };
  }

  it("focus follows a focused day selected into another month, onto the button that now shows it", () => {
    const { grid, opts, onMonthChange } = setup();
    // October's grid ends on 7 November; November's re-render reuses the
    // buttons by position, so another button comes to show that day.
    const dom = positionalGrid(document.body, ["2026-10-31", "2026-11-07", "2026-11-01", "2026-11-02"]);
    dom.buttons[1].focus();
    grid.select(find(grid.state, "2026-11-07"));
    expect(onMonthChange).toHaveBeenLastCalledWith(day(2026, 11, 1));
    grid.sync({ ...opts, month: day(2026, 11, 1) });
    dom.rerender(["2026-11-03", "2026-11-04", "2026-11-05", "2026-11-07"]);
    grid.afterRender();
    expect(document.activeElement).toBe(dom.buttons[3]);
    dom.root.remove();
  });

  it("focus follows a selection made inside a shadow root", () => {
    const { grid, opts } = setup();
    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    const dom = positionalGrid(shadow, ["2026-10-31", "2026-11-07"]);
    dom.buttons[1].focus();
    grid.select(find(grid.state, "2026-11-07"));
    grid.sync({ ...opts, month: day(2026, 11, 1) });
    dom.rerender(["2026-11-07", "2026-11-08"]);
    grid.afterRender();
    expect(shadow.activeElement).toBe(dom.buttons[0]);
    host.remove();
  });

  it("a selection never pulls focus into the grid", () => {
    const { grid, opts } = setup();
    const dom = positionalGrid(document.body, ["2026-10-31", "2026-11-07"]);
    const elsewhere = document.createElement("input");
    document.body.append(elsewhere);
    elsewhere.focus();
    grid.select(find(grid.state, "2026-11-07"));
    grid.sync({ ...opts, month: day(2026, 11, 1) });
    dom.rerender(["2026-11-07", "2026-11-08"]);
    grid.afterRender();
    expect(document.activeElement).toBe(elsewhere);
    // Nor does a focused day other than the activated one hand focus over.
    dom.buttons[1].focus();
    grid.select(find(grid.state, "2026-11-07"));
    grid.afterRender();
    expect(document.activeElement).toBe(dom.buttons[1]);
    dom.root.remove();
    elsewhere.remove();
  });

  it("keys local calendar days", () => {
    expect(dateGridKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});
