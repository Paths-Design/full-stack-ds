// Hand-written behavioral companion to the generated Calendar scaffold.
import { describe, expect, it } from "vitest";
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { Calendar } from "../Calendar";

const SEPTEMBER = new Date(2026, 8, 1);
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

function mountCalendar(props: Record<string, unknown> = {}) {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = TestRenderer.create(<Calendar defaultMonth={SEPTEMBER} testID="subject" {...props} />);
  });
  return renderer!;
}

/**
 * Host Pressables only (string type) — the test shim renders a component that
 * wraps a same-named host, and both carry identical props.
 */
const pressables = (r: ReactTestRenderer): ReactTestInstance[] =>
  r.root.findAll((n) => String(n.type) === "Pressable" && typeof n.props.onPress === "function");
const navs = (r: ReactTestRenderer) => {
  const [previous, next] = pressables(r).filter((n) => /month/i.test(String(n.props.accessibilityLabel)));
  return { previous: previous!, next: next! };
};
const days = (r: ReactTestRenderer) => pressables(r).filter((n) => !/month/i.test(String(n.props.accessibilityLabel)));
const dayNamed = (r: ReactTestRenderer, label: string) => days(r).find((n) => n.props.accessibilityLabel === label)!;
const selectedLabels = (r: ReactTestRenderer) =>
  days(r).filter((n) => n.props.accessibilityState.selected === true).map((n) => n.props.accessibilityLabel as string);
const texts = (r: ReactTestRenderer) =>
  r.root.findAll((n) => String(n.type) === "Text").map((n) => n.props.children).filter((c) => typeof c === "string");

describe("Calendar — month grid", () => {
  it("renders the visible month's six locale-ordered weeks with full-date names", () => {
    const renderer = mountCalendar();
    const grid = days(renderer);
    expect(grid).toHaveLength(42);
    // September 1, 2026 is a Tuesday; en-US weeks start on Sunday, August 30.
    expect(grid[0]!.props.accessibilityLabel).toBe("Sunday, August 30, 2026");
    expect(grid[2]!.props.accessibilityLabel).toBe("Tuesday, September 1, 2026");
    expect(texts(renderer)).toContain("September 2026");
    expect(texts(renderer).slice(0, 10)).toEqual(expect.arrayContaining(["Sun", "Mon", "Sat"]));
  });

  it("follows the locale for week start, names and caption", () => {
    // October, whose German name differs from the English one.
    const renderer = mountCalendar({ locale: "de-DE", defaultMonth: day(2026, 10, 1) });
    // October 1, 2026 is a Thursday; de-DE weeks start on Monday, September 28.
    expect(days(renderer)[0]!.props.accessibilityLabel).toBe("Montag, 28. September 2026");
    expect(texts(renderer)).toContain("Oktober 2026");
    expect(texts(renderer)).not.toContain("October 2026");
    expect(texts(renderer)).toContain("Mo");
  });
});

describe("Calendar — selection", () => {
  it("selects a tapped day, reports it through onChange, and styles only that day", () => {
    const reported: unknown[] = [];
    const renderer = mountCalendar({ onChange: (next: unknown) => reported.push(next) });
    act(() => dayNamed(renderer, "Thursday, September 10, 2026").props.onPress());
    expect(reported).toEqual([day(2026, 9, 10)]);
    expect(selectedLabels(renderer)).toEqual(["Thursday, September 10, 2026"]);
    const styled = days(renderer).filter((n) => (n.props.style as unknown[]).at(-1) !== undefined);
    expect(styled.map((n) => n.props.accessibilityLabel)).toEqual(["Thursday, September 10, 2026"]);
  });

  it("keeps a controlled selection pinned while still reporting presses", () => {
    let reported: unknown;
    const renderer = mountCalendar({ value: day(2026, 9, 2), onChange: (next: unknown) => (reported = next) });
    act(() => dayNamed(renderer, "Saturday, September 5, 2026").props.onPress());
    expect(reported).toEqual(day(2026, 9, 5));
    expect(selectedLabels(renderer)).toEqual(["Wednesday, September 2, 2026"]);
  });

  it("treats a controlled null as an empty selection, not a fall-back to the default", () => {
    const renderer = mountCalendar({ value: null, defaultValue: day(2026, 9, 2) });
    expect(selectedLabels(renderer)).toEqual([]);
    act(() => renderer.update(<Calendar defaultMonth={SEPTEMBER} value={day(2026, 9, 5)} defaultValue={day(2026, 9, 2)} />));
    expect(selectedLabels(renderer)).toEqual(["Saturday, September 5, 2026"]);
    act(() => renderer.update(<Calendar defaultMonth={SEPTEMBER} value={null} defaultValue={day(2026, 9, 2)} />));
    expect(selectedLabels(renderer)).toEqual([]);
  });

  it("builds an ordered range from two taps and selects every day of the span", () => {
    const reported: unknown[] = [];
    const renderer = mountCalendar({ mode: "range", onChange: (next: unknown) => reported.push(next) });
    act(() => dayNamed(renderer, "Saturday, September 12, 2026").props.onPress());
    act(() => dayNamed(renderer, "Wednesday, September 9, 2026").props.onPress());
    expect(reported.at(-1)).toEqual([day(2026, 9, 9), day(2026, 9, 12)]);
    expect(selectedLabels(renderer)).toEqual([
      "Wednesday, September 9, 2026", "Thursday, September 10, 2026",
      "Friday, September 11, 2026", "Saturday, September 12, 2026",
    ]);
  });

  it("does not select a day outside the bounds, and reports it disabled", () => {
    const reported: unknown[] = [];
    const renderer = mountCalendar({ maxDate: day(2026, 9, 20), onChange: (next: unknown) => reported.push(next) });
    const late = dayNamed(renderer, "Monday, September 21, 2026");
    expect(late.props.accessibilityState.disabled).toBe(true);
    act(() => late.props.onPress());
    expect(reported).toEqual([]);
  });
});

describe("Calendar — month navigation", () => {
  it("next and previous move the month channel and the caption", () => {
    const months: Date[] = [];
    const renderer = mountCalendar({ onMonthChange: (next: Date) => months.push(next) });
    act(() => navs(renderer).next.props.onPress());
    expect(months).toEqual([day(2026, 10, 1)]);
    expect(texts(renderer)).toContain("October 2026");
    act(() => navs(renderer).previous.props.onPress());
    act(() => navs(renderer).previous.props.onPress());
    expect(months.at(-1)).toEqual(day(2026, 8, 1));
    expect(texts(renderer)).toContain("August 2026");
  });

  it("labels the month buttons from the catalog and disables one at a bound", () => {
    const renderer = mountCalendar({ minDate: day(2026, 9, 3) });
    const { previous, next } = navs(renderer);
    expect([previous.props.accessibilityLabel, next.props.accessibilityLabel]).toEqual(["Previous month", "Next month"]);
    expect(previous.props.accessibilityState.disabled).toBe(true);
    expect(next.props.accessibilityState.disabled).toBe(false);
  });
});
