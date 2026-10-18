/**
 * Behavioral contract for the generated Calendar's date grid, shared by every
 * web runtime. Each package supplies a harness that mounts its generated
 * Calendar and flushes its own update and post-render cycle; the obligations
 * below are the same in every framework.
 *
 * Dates sit in 2031 so the current month (and so the today marker) never
 * coincides with a fixture month, except in the test that asks for it.
 */
export interface CalendarTestProps {
  month?: Date;
  defaultMonth?: Date;
  value?: Date | Date[] | null;
  defaultValue?: Date | Date[] | null;
  mode?: "single" | "range";
  locale?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  caption?: string;
  onChange?: (value: Date | Date[] | null) => void;
  onMonthChange?: (month: Date) => void;
}

export interface CalendarView {
  /** The generated `.calendar` root element. */
  root: Element;
  /** Run an interaction, then flush the framework's updates and post-render effects. */
  act(interaction: () => void): Promise<void>;
}

export interface CalendarHarness {
  /** Mount a generated Calendar attached to the document, inside a `dir` wrapper when given. */
  mount(props: CalendarTestProps, options?: { dir?: "ltr" | "rtl" }): Promise<CalendarView>;
}

type TestBody = () => void | Promise<void>;
export interface CalendarTestRunner {
  describe(name: string, body: () => void): void;
  it(name: string, body: TestBody): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect(value: unknown): any;
}

const MARCH = new Date(2031, 2, 1);
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const text = (element: Element | null | undefined) => (element?.textContent ?? "").trim();
const days = (root: Element) => [...root.querySelectorAll<HTMLElement>("button[data-date]")];
const button = (root: Element, key: string) => {
  const found = root.querySelector<HTMLElement>(`button[data-date="${key}"]`);
  if (!found) throw new Error(`no day ${key}`);
  return found;
};
const cell = (root: Element, key: string) => button(root, key).closest("td")!;
const tabStops = (root: Element) => days(root).filter((b) => b.getAttribute("tabindex") === "0").map((b) => b.dataset.date);
const selected = (root: Element) =>
  [...root.querySelectorAll("td")].filter((td) => td.getAttribute("aria-selected") === "true").map((td) => td.querySelector<HTMLElement>("button")!.dataset.date);
const focused = (root: Element) => ((root.getRootNode() as Document | ShadowRoot).activeElement as HTMLElement | null)?.dataset?.date;
const caption = (root: Element) => text(root.querySelector(".calendar__caption"));
const nav = (root: Element, which: "previous" | "next") => root.querySelector<HTMLElement>(`[data-calendar-nav="${which}"]`)!;
const press = (target: Element, key: string, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, composed: true, ...init }));

export function calendarContract(framework: string, harness: CalendarHarness, runner: CalendarTestRunner): void {
  const { describe, it, expect } = runner;

  describe(`${framework} generated Calendar date grid`, () => {
    it("renders six week rows of seven gridcells under seven locale-ordered column headers", async () => {
      const { root } = await harness.mount({ defaultMonth: MARCH, locale: "en-US" });
      const grid = root.querySelector('table[role="grid"]')!;
      expect(grid.getAttribute("aria-label")).toBe("March 2031");
      const headers = [...grid.querySelectorAll('thead th[role="columnheader"]')];
      expect(headers.map(text)).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
      expect(headers[0].getAttribute("aria-label")).toBe("Sunday");
      const rows = [...grid.querySelectorAll('tbody tr[role="row"]')];
      expect(rows).toHaveLength(6);
      expect(rows.every((row) => row.querySelectorAll('td[role="gridcell"]').length === 7)).toBe(true);
      expect(days(root)[0].dataset.date).toBe("2031-02-23");
      expect(days(root)[41].dataset.date).toBe("2031-04-05");
      expect(button(root, "2031-03-10").getAttribute("aria-label")).toBe("Monday, March 10, 2031");
      expect(text(button(root, "2031-03-10"))).toBe("10");
      expect(cell(root, "2031-02-28").getAttribute("data-outside-month")).toBe("true");
      expect(cell(root, "2031-03-01").getAttribute("data-outside-month")).toBe("false");
      expect(caption(root)).toBe("March 2031");
    });

    it("exposes exactly one day tab stop: the selected day, else the first day of the month", async () => {
      const empty = await harness.mount({ defaultMonth: MARCH });
      expect(tabStops(empty.root)).toEqual(["2031-03-01"]);
      const chosen = await harness.mount({ defaultMonth: MARCH, defaultValue: day(2031, 3, 10) });
      expect(tabStops(chosen.root)).toEqual(["2031-03-10"]);
    });

    it("marks today with aria-current=date and makes it the tab stop of its month", async () => {
      const now = new Date();
      const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const { root } = await harness.mount({});
      expect(cell(root, key).getAttribute("aria-current")).toBe("date");
      expect([...root.querySelectorAll('td[aria-current]')]).toHaveLength(1);
      expect(tabStops(root)).toEqual([key]);
    });

    it("carries the selection on aria-selected of the day cells, single and range", async () => {
      const single = await harness.mount({ defaultMonth: MARCH, defaultValue: day(2031, 3, 10) });
      expect(selected(single.root)).toEqual(["2031-03-10"]);
      expect(cell(single.root, "2031-03-11").getAttribute("aria-selected")).toBe("false");
      const range = await harness.mount({ defaultMonth: MARCH, mode: "range", defaultValue: [day(2031, 3, 12), day(2031, 3, 9)] });
      expect(selected(range.root)).toEqual(["2031-03-09", "2031-03-10", "2031-03-11", "2031-03-12"]);
    });

    it("moves focus and the tab stop with the arrow keys, Home and End", async () => {
      const view = await harness.mount({ defaultMonth: MARCH, defaultValue: day(2031, 3, 12) });
      const { root } = view;
      await view.act(() => button(root, "2031-03-12").focus());
      const step = async (key: string, expected: string) => {
        await view.act(() => press(root.querySelector("[data-date][tabindex='0']")!, key));
        expect([focused(root), tabStops(root)]).toEqual([expected, [expected]]);
      };
      await step("ArrowRight", "2031-03-13");
      await step("ArrowLeft", "2031-03-12");
      await step("ArrowDown", "2031-03-19");
      await step("ArrowUp", "2031-03-12");
      // en-US weeks run Sunday to Saturday; March 12, 2031 is a Wednesday.
      await step("Home", "2031-03-09");
      await step("End", "2031-03-15");
    });

    it("uses the locale's week for Home and End", async () => {
      const view = await harness.mount({ defaultMonth: MARCH, defaultValue: day(2031, 3, 12), locale: "de-DE" });
      await view.act(() => button(view.root, "2031-03-12").focus());
      await view.act(() => press(button(view.root, "2031-03-12"), "Home"));
      expect(focused(view.root)).toBe("2031-03-10");
      await view.act(() => press(button(view.root, "2031-03-10"), "End"));
      expect(focused(view.root)).toBe("2031-03-16");
    });

    it("mirrors ArrowLeft and ArrowRight inside a right-to-left container", async () => {
      const view = await harness.mount({ defaultMonth: MARCH, defaultValue: day(2031, 3, 12) }, { dir: "rtl" });
      await view.act(() => button(view.root, "2031-03-12").focus());
      await view.act(() => press(button(view.root, "2031-03-12"), "ArrowLeft"));
      expect(focused(view.root)).toBe("2031-03-13");
      await view.act(() => press(button(view.root, "2031-03-13"), "ArrowRight"));
      expect(focused(view.root)).toBe("2031-03-12");
    });

    it("crossing a month edge or paging moves the month channel and keeps focus on the moved-to day", async () => {
      const months: Date[] = [];
      const view = await harness.mount({ defaultMonth: MARCH, defaultValue: day(2031, 3, 31), onMonthChange: (m) => months.push(m) });
      const { root } = view;
      await view.act(() => button(root, "2031-03-31").focus());
      await view.act(() => press(button(root, "2031-03-31"), "ArrowRight"));
      expect(months).toEqual([day(2031, 4, 1)]);
      expect(caption(root)).toBe("April 2031");
      expect([focused(root), tabStops(root)]).toEqual(["2031-04-01", ["2031-04-01"]]);
      await view.act(() => press(button(root, "2031-04-01"), "PageDown"));
      expect(caption(root)).toBe("May 2031");
      expect(focused(root)).toBe("2031-05-01");
      await view.act(() => press(button(root, "2031-05-01"), "PageUp", { shiftKey: true }));
      expect(caption(root)).toBe("May 2030");
      expect(focused(root)).toBe("2030-05-01");
      expect(months.at(-1)).toEqual(day(2030, 5, 1));
    });

    it("activating a day selects it through the value channel", async () => {
      const changes: unknown[] = [];
      const view = await harness.mount({ defaultMonth: MARCH, onChange: (v) => changes.push(v) });
      await view.act(() => button(view.root, "2031-03-20").click());
      expect(changes).toEqual([day(2031, 3, 20)]);
      expect(selected(view.root)).toEqual(["2031-03-20"]);
      expect(tabStops(view.root)).toEqual(["2031-03-20"]);
    });

    it("builds an ordered range from two activations in range mode", async () => {
      const changes: unknown[] = [];
      const view = await harness.mount({ defaultMonth: MARCH, mode: "range", onChange: (v) => changes.push(v) });
      await view.act(() => button(view.root, "2031-03-14").click());
      await view.act(() => button(view.root, "2031-03-11").click());
      expect(changes).toEqual([[day(2031, 3, 14)], [day(2031, 3, 11), day(2031, 3, 14)]]);
      expect(selected(view.root)).toEqual(["2031-03-11", "2031-03-12", "2031-03-13", "2031-03-14"]);
    });

    it("the month buttons have visible content and catalog names, and move the month", async () => {
      const months: Date[] = [];
      const view = await harness.mount({ defaultMonth: MARCH, onMonthChange: (m) => months.push(m) });
      const { root } = view;
      expect([nav(root, "previous").getAttribute("aria-label"), nav(root, "next").getAttribute("aria-label")]).toEqual(["Previous month", "Next month"]);
      expect([text(nav(root, "previous")), text(nav(root, "next"))]).toEqual(["‹", "›"]);
      expect(nav(root, "next").getAttribute("type")).toBe("button");
      await view.act(() => nav(root, "next").click());
      expect(months).toEqual([day(2031, 4, 1)]);
      expect(caption(root)).toBe("April 2031");
      await view.act(() => nav(root, "previous").click());
      await view.act(() => nav(root, "previous").click());
      expect(caption(root)).toBe("February 2031");
    });

    it("days outside the bounds are aria-disabled and unselectable, and the nav at a bound is disabled", async () => {
      const changes: unknown[] = [];
      const view = await harness.mount({ defaultMonth: MARCH, minDate: day(2031, 3, 5), maxDate: day(2031, 3, 25), onChange: (v) => changes.push(v) });
      const { root } = view;
      expect(button(root, "2031-03-04").getAttribute("aria-disabled")).toBe("true");
      expect(button(root, "2031-03-05").getAttribute("aria-disabled")).toBe("false");
      await view.act(() => button(root, "2031-03-26").click());
      expect(changes).toEqual([]);
      expect([nav(root, "previous").getAttribute("aria-disabled"), nav(root, "next").getAttribute("aria-disabled")]).toEqual(["true", "true"]);
      expect(tabStops(root)).toEqual(["2031-03-05"]);
    });

    it("a disabled calendar disables every day and both month buttons", async () => {
      const changes: unknown[] = [];
      const view = await harness.mount({ defaultMonth: MARCH, disabled: true, onChange: (v) => changes.push(v) });
      expect(days(view.root).every((b) => b.getAttribute("aria-disabled") === "true")).toBe(true);
      expect(nav(view.root, "next").getAttribute("aria-disabled")).toBe("true");
      await view.act(() => button(view.root, "2031-03-10").click());
      expect(changes).toEqual([]);
    });

    it("formats the caption, headers and day names in the locale", async () => {
      const de = await harness.mount({ defaultMonth: MARCH, locale: "de-DE" });
      expect(caption(de.root)).toBe("März 2031");
      expect([...de.root.querySelectorAll("thead th")].map(text)).toEqual(["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]);
      expect(days(de.root)[0].dataset.date).toBe("2031-02-24");
      expect(button(de.root, "2031-03-10").getAttribute("aria-label")).toBe("Montag, 10. März 2031");
      const ar = await harness.mount({ defaultMonth: MARCH, locale: "ar-EG" });
      expect(caption(ar.root)).toBe("مارس ٢٠٣١");
      expect(days(ar.root)[0].dataset.date).toBe("2031-03-01");
      expect(text(button(ar.root, "2031-03-10"))).toBe("١٠");
    });

    it("an explicit caption replaces the formatted month in the caption and the grid's name", async () => {
      const { root } = await harness.mount({ defaultMonth: MARCH, caption: "Check-in" });
      expect(caption(root)).toBe("Check-in");
      expect(root.querySelector('table[role="grid"]')!.getAttribute("aria-label")).toBe("Check-in");
    });
  });
}
