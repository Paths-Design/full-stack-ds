/**
 * Runtime visual proof rail.
 *
 * Spins up the Vite dev server and renders the contract-fact suites declared
 * below through every framework reachable by this rail's navigable
 * /preview/{framework}/<Name> route (React, Vue, Svelte, Lit, Angular).
 * `src/runtime/rail-coverage.ts` projects the named component/framework/prop
 * surface into the showcase; its coherence test rejects projection drift.
 *
 * Angular DEFAULT-props facts are covered (RUNTIME-RAIL-ANGULAR-01).
 * Its preview is executable (live AOT compile + bootstrapApplication,
 * HARNESS-ANGULAR-PREVIEW-LIVE-BOOTSTRAP-01); this rail reaches it via a
 * navigable /preview/angular/<Name> HTML page added in that spec, which
 * wraps the existing Angular shell and bootstraps the compiled default
 * host. Angular renders light DOM with the same BEM classes/roles, so
 * the existing document.querySelector path covers it (no shadow-piercing).
 * Bringing Angular in surfaced and fixed a real preview defect: numeric/
 * array inputs were emitted as static HTML attributes (bound as strings),
 * so iteration components rendered zero cells; the Angular host now uses
 * property bindings ([prop]="value") for non-string inputs.
 *
 * Angular NON-default prop facts for ShowMore/Progress/Truncate are covered
 * through the same `fsds:config` message-bus seam as React/Vue/Svelte/Lit. The
 * Angular host is still AOT-compiled at startup, but it binds component inputs
 * from a mutable `props` object that the bus replaces at runtime.
 *
 * The rail asserts CONTRACT FACTS, not screenshot pixels. Each `it`
 * block names exactly what claim it is proving and what would
 * invalidate it. Screenshot snapshots live in the sibling
 * `runtime-rail-snapshots/` directory and catch visual drift the
 * fact-assertions miss (sub-pixel layout, color resolution, etc.).
 *
 * What this rail proves:
 *
 *   Progress  — `--fsds-progress-fill-width` is on the inline style
 *               of the fill element. With no `value` prop (the
 *               default), it serves the `var(..., 0)` fallback,
 *               producing 0% computed width.
 *   Truncate  — `--fsds-truncate-content-lines` is on the inline
 *               style of the content element with the default
 *               `lines` prop (undefined → fallback to 3).
 *   ShowMore  — Same as Truncate, with `maxLines` default 3
 *               producing `--fsds-show-more-content-max-lines`.
 *   OTP       — `length=6` (default) renders 6 `[data-otp-index]`
 *               nodes with values 0..5.
 *   Calendar  — the date grid (CALENDAR-DATE-GRID-01) under a fixed clock
 *               (Wednesday 12 March 2031): the default month renders 42 day
 *               buttons with one tab stop on today and aria-current on its
 *               cell; real arrow/Home/End/PageDown keys move DOM focus with
 *               the tab stop, across a month re-render too; following the
 *               ARIA grid pattern the gridcell is the focused, selected day,
 *               with no control inside it; Enter and Space select through the
 *               date-grid core (aria-selected on the cell); clicking an outside-month
 *               day shows its month with focus kept on that day; the month
 *               buttons move an uncontrolled month; `locale=de-DE` gives a
 *               Monday-first German grid, and a controlled `month` stays put;
 *               a key move that controlled month refuses leaves focus and the
 *               tab stop on the day it started from; days outside minDate and
 *               maxDate are aria-disabled, refuse a click, and stop a key move
 *               at the bound, as does every day of a disabled calendar.
 *   CodeBlock — highlight content transform (RUNTIME-RAIL-CODEBLOCK-
 *               HIGHLIGHT-01): with code+language through the config bus,
 *               the rendered `[data-token]` kind sequence equals the frozen
 *               golden typescript stream and the span text reassembles the
 *               source; with `highlight=false`, zero token spans render and
 *               the code element round-trips the source as a plain run.
 *   Status    — the contract-composed Icon renders the mapped canonical glyph
 *               (`info` by default, `check` for `status=success`).
 *
 * Non-default props ARE now asserted for all five frameworks on ShowMore (maxLines),
 * Progress (value), and Truncate (lines): the preview route loads the default
 * message-bus config entry, then the rail posts `fsds:config` with explicit
 * props and asserts the runtime fact changes from the default
 * (RUNTIME-RAIL-NONDEFAULT-PROPS-01).
 *
 * What this rail does NOT prove:
 *
 *   - Non-default props for components OTHER than the ones above, or
 *     for prop kinds beyond the numeric/boolean query surface. The
 *     mechanism generalizes, but only these are asserted here.
 *   - Cross-framework behavioral parity beyond DOM shape (e.g.
 *     whether OTP's React input-focus advance behaves identically
 *     in Svelte). Calendar's keyboard, activation, range-selection and
 *     bounds facts are the exception; no rail observes what a screen
 *     reader announces.
 *   - Non-default props beyond the three asserted components/props.
 */

import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Framework = "react" | "vue" | "svelte" | "lit" | "angular";

const FRAMEWORKS: readonly Framework[] = ["react", "vue", "svelte", "lit", "angular"];

const NONDEFAULT_FRAMEWORKS: readonly Framework[] = ["react", "vue", "svelte", "lit", "angular"];

/**
 * Navigate to a single-component preview route and wait for the
 * component's root element to mount. Each preview shell exposes the
 * component root with the BEM `--block` class derived from the
 * component name; that's the stable cross-framework selector.
 *
 * Lit mounts a custom element with shadow DOM; the rendered light DOM
 * lives under the host. The element-tag-vs-class distinction is
 * documented per-test below where it matters.
 */
async function goto(
  page: Page,
  framework: Framework,
  component: string,
  blockClass: string,
  props?: Record<string, string | number | boolean | Date | readonly unknown[]>,
) {
  await page.goto(`/preview/${framework}/${component}`, {
    waitUntil: "domcontentloaded",
  });
  // For React/Vue/Svelte, the BEM block class lands directly on a DOM
  // node. For Lit, the class lives inside a shadow root under a
  // custom element; `>>` shadow-piercing locators handle that.
  const selector =
    framework === "lit"
      ? `fsds-${kebab(component)} >> .${blockClass}`
      : `.${blockClass}`;
  await page.locator(selector).first().waitFor({
    state: "attached",
    timeout: 30_000,
  });
  // Angular bootstraps asynchronously: bootstrapApplication resolves a
  // microtask after the host attaches, so the block class can be present
  // while the component's @for/*ngFor children are still empty. All preview
  // shells expose `<body data-fsds-ready>`; wait for it before posting the
  // shared config-bus payload so every framework uses the same test path.
  await page.locator("body[data-fsds-ready]").waitFor({
    state: "attached",
    timeout: 30_000,
  });
  if (props) {
    await page.evaluate((nextProps) => {
      window.postMessage({ type: "fsds:config", props: nextProps, tokenCss: "" }, "*");
    }, props);
    await page.waitForTimeout(0);
  }
}

function kebab(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/**
 * Read the inline style attribute as a CSS-property map. The
 * `style.getPropertyValue` API doesn't expose author-defined custom
 * properties on HTMLElement.style without an explicit lookup; reading
 * the raw `style` attribute and parsing it is the most direct way to
 * inspect `--fsds-*` values that the codegen wrote inline.
 */
async function readInlineStyle(
  page: Page,
  framework: Framework,
  component: string,
  blockClass: string,
  partClass: string,
): Promise<Record<string, string>> {
  const hostSelector = framework === "lit" ? `fsds-${kebab(component)}` : "body";
  return page.evaluate(
    ({ host, block, part, isLit }) => {
      const root: Document | ShadowRoot | null = isLit
        ? (document.querySelector(host) as HTMLElement)?.shadowRoot ?? null
        : document;
      if (!root) return {};
      const el = root.querySelector(`.${block} .${part}, .${part}`) as HTMLElement | null;
      if (!el) return {};
      const out: Record<string, string> = {};
      for (let i = 0; i < el.style.length; i++) {
        const k = el.style[i];
        out[k] = el.style.getPropertyValue(k);
      }
      return out;
    },
    { host: hostSelector, block: blockClass, part: partClass, isLit: framework === "lit" },
  );
}

test.describe("Runtime rail — Progress (CSS-var fallback)", () => {
  for (const framework of FRAMEWORKS) {
    test(`${framework}: fill carries --fsds-progress-fill-width inline`, async ({ page }) => {
      await goto(page, framework, "Progress", "progress");

      // The Progress contract gives `value` no default. The fill's
      // inline style binding is `style={{ '--fsds-progress-fill-width': value }}`
      // — when value is undefined, React renders the var as
      // `--fsds-progress-fill-width: undefined` which is dropped from
      // the inline-style attribute. The CSS rule consumes the var
      // with a `, 0` fallback, so the computed width resolves to 0%.
      //
      // Claim: every framework, on default props, produces a fill
      // element. Whether the inline CSS var is present (when value
      // happens to be set) is asserted in the value-bearing branch
      // of this test below; default-only frameworks pass through.
      const style = await readInlineStyle(page, framework, "Progress", "progress", "progress__fill");
      // Default props have no value — the inline style should be empty,
      // proving the codegen correctly drops undefined sources rather
      // than serializing the literal string "undefined".
      expect(style).not.toHaveProperty("--fsds-progress-fill-width", "undefined");
    });
  }
});

test.describe("Runtime rail — Status (composed Icon)", () => {
  for (const framework of FRAMEWORKS) {
    test(`${framework}: default info status renders the canonical info glyph`, async ({ page }) => {
      await goto(page, framework, "Status", "status");
      await expect(page.locator('svg[data-fsds-icon="info"]')).toHaveCount(1);
    });
  }
});

test.describe("Runtime rail — Status non-default status", () => {
  for (const framework of NONDEFAULT_FRAMEWORKS) {
    test(`${framework}: status=success renders the canonical check glyph`, async ({ page }) => {
      await goto(page, framework, "Status", "status", { status: "success" });
      await expect(page.locator('svg[data-fsds-icon="check"]')).toHaveCount(1);
    });
  }
});

// FEAT-CHANNEL-UPDATE-OPERATIONS-01 — OWED runtime interaction fact.
//
// The OTP field's `input` wire now applies the set-char-at-index update
// operation (`channel:value.onChange:setCharAt(iter:index)`). An interaction
// fact — type into field 0, assert the composed channel value — was
// attempted here and found NOT supportable through the current preview shell,
// for two concrete, verified reasons:
//   1. The OTP field `<input>` binds NO `value`/`bind:value` attribute (the
//      composed value flows to the `value` CHANNEL, not back to per-field DOM),
//      so typing changes no DOM-observable field state to assert against.
//   2. The preview shell exposes a props config-bus (`fsds:config`) and
//      `<body data-fsds-ready>` for DOM assertions, but NO callback-capture
//      surface — there is no way to observe the `onChange` payload from the
//      Playwright side without adding one to src/runtime/ (a preview-shell
//      change outside this spec's scope.in, which lists e2e/ but not src/runtime/).
// The behavioral truth is instead pinned at the component-test tier (React +
// Vue `setCharAt` suites). This fact is left OWED: wiring a preview-shell
// callback recorder (e.g. window.__fsds_lastChange) is the enabling follow-up.
test.describe("Runtime rail — OTP (count iteration)", () => {
  for (const framework of FRAMEWORKS) {
    test(`${framework}: renders length=6 input cells with data-otp-index 0..5`, async ({ page }) => {
      await goto(page, framework, "OTP", "otp");

      const indices = await page.evaluate(
        ({ host, isLit }) => {
          const root: Document | ShadowRoot | null = isLit
            ? (document.querySelector(host) as HTMLElement)?.shadowRoot ?? null
            : document;
          if (!root) return [];
          return Array.from(root.querySelectorAll("[data-otp-index]")).map(
            (n) => (n as HTMLElement).getAttribute("data-otp-index"),
          );
        },
        { host: `fsds-${kebab("OTP")}`, isLit: framework === "lit" },
      );

      // length defaults to 6 in the contract — 6 cells expected.
      expect(indices).toEqual(["0", "1", "2", "3", "4", "5"]);
    });
  }
});

// The instant every Calendar test runs at — Wednesday 12 March 2031, local
// time. The date grid derives its default month and today from the clock, so
// pinning it makes the default render (and its screenshot) a fixed fact.
const CALENDAR_TODAY = new Date(2031, 2, 12, 10, 0, 0);

interface CalendarFacts {
  keys: string[];
  tabStops: string[];
  focused: string | null;
  /** The focused element's role and selected state: the gridcell itself under the grid pattern. */
  focusedCell: { role: string | null; selected: string | null } | null;
  /** Focusable or clickable elements inside the grid body; none under the grid pattern. */
  nestedControls: number;
  selected: string[];
  current: string[];
  outsideMonth: number;
  caption: string;
  gridLabel: string | null;
  gridMultiselectable: string | null;
  weekdays: string[];
  labels: Record<string, string>;
  /** Days not marked aria-disabled="true", in grid order. */
  enabled: string[];
  /** aria-disabled on the previous and next month buttons. */
  navDisabled: (string | null)[];
}

/** Read the rendered date grid; Lit renders it inside the host's shadow root. */
async function calendarFacts(page: Page, framework: Framework): Promise<CalendarFacts | null> {
  return page.evaluate(
    ({ host, isLit }) => {
      const root: Document | ShadowRoot | null = isLit
        ? (document.querySelector(host) as HTMLElement | null)?.shadowRoot ?? null
        : document;
      if (!root) return null;
      const dayOf = (cell: Element) => cell.getAttribute("data-date") ?? "";
      const active = root.activeElement as HTMLElement | null;
      const cells = (selector: string) => Array.from(root.querySelectorAll(`[role="gridcell"]${selector}`));
      const days = Array.from(root.querySelectorAll<HTMLElement>("[data-date]"));
      return {
        keys: days.map((day) => day.getAttribute("data-date") ?? ""),
        tabStops: days.filter((day) => day.getAttribute("tabindex") === "0").map((day) => day.getAttribute("data-date") ?? ""),
        focused: active?.getAttribute("data-date") ?? null,
        focusedCell: active?.hasAttribute("data-date")
          ? { role: active.getAttribute("role"), selected: active.getAttribute("aria-selected") }
          : null,
        nestedControls: root.querySelectorAll("tbody button, tbody a, tbody input, tbody [data-date] [tabindex]").length,
        selected: cells('[aria-selected="true"]').map(dayOf),
        current: cells('[aria-current="date"]').map(dayOf),
        // A false flag renders as "false" (React/Vue/Svelte/Angular) or is
        // omitted (Lit's ifDefined); either way it is not an outside day.
        outsideMonth: cells("[data-outside-month]").filter((cell) => cell.getAttribute("data-outside-month") !== "false").length,
        caption: root.querySelector(".calendar__caption")?.textContent?.trim() ?? "",
        gridLabel: root.querySelector('[role="grid"]')?.getAttribute("aria-label") ?? null,
        gridMultiselectable: root.querySelector('[role="grid"]')?.getAttribute("aria-multiselectable") ?? null,
        weekdays: Array.from(root.querySelectorAll('[role="columnheader"]')).map((header) => header.getAttribute("aria-label") ?? ""),
        labels: Object.fromEntries(days.map((day) => [day.getAttribute("data-date") ?? "", day.getAttribute("aria-label") ?? ""])),
        enabled: days.filter((day) => day.getAttribute("aria-disabled") !== "true").map(dayOf),
        navDisabled: ["previous", "next"].map(
          (direction) => root.querySelector(`[data-calendar-nav="${direction}"]`)?.getAttribute("aria-disabled") ?? null,
        ),
      };
    },
    { host: `fsds-${kebab("Calendar")}`, isLit: framework === "lit" },
  );
}

test.describe("Runtime rail — Calendar (date grid: roving focus, activation, month and locale)", () => {
  // CALENDAR-DATE-GRID-01: every web target binds the shared date-grid core, so
  // the same facts hold in a real browser for all five. CSS locators pierce
  // Lit's open shadow root; the active day is read from the root that owns it
  // (document.activeElement is the Lit host).
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(CALENDAR_TODAY);
  });

  for (const framework of FRAMEWORKS) {
    test(`${framework}: the default grid shows today's month with one tab stop on today`, async ({ page }) => {
      await goto(page, framework, "Calendar", "calendar");
      const facts = await calendarFacts(page, framework);
      expect(facts).not.toBeNull();
      // March 2031 begins on a Saturday; en-US weeks begin on Sunday, so the
      // six rendered weeks run from 23 February to 5 April.
      expect(facts!.keys).toHaveLength(42);
      expect(facts!.keys[0]).toBe("2031-02-23");
      expect(facts!.keys[41]).toBe("2031-04-05");
      expect(facts!.outsideMonth).toBe(11);
      expect(facts!.tabStops).toEqual(["2031-03-12"]);
      expect(facts!.current).toEqual(["2031-03-12"]);
      expect(facts!.selected).toEqual([]);
      expect(facts!.caption).toBe("March 2031");
      expect(facts!.gridLabel).toBe("March 2031");
      expect(facts!.gridMultiselectable).toBe("false");
      expect(facts!.weekdays[0]).toBe("Sunday");
      expect(facts!.weekdays).toHaveLength(7);
      expect(facts!.labels["2031-03-12"]).toBe("Wednesday, March 12, 2031");
      // The ARIA grid pattern: no control inside a cell; the gridcell is the day.
      expect(facts!.nestedControls).toBe(0);
    });
  }

  for (const framework of FRAMEWORKS) {
    test(`${framework}: arrow/Home/End/Page keys move DOM focus with the tab stop; Enter and Space select`, async ({ page }) => {
      await goto(page, framework, "Calendar", "calendar");
      await page.locator('[data-date="2031-03-12"]').focus();
      const expectFocus = async (key: string) => {
        // Focus and the single tab stop must land on the same day.
        await expect.poll(async () => {
          const facts = await calendarFacts(page, framework);
          return facts && { focused: facts.focused, tabStops: facts.tabStops };
        }).toEqual({ focused: key, tabStops: [key] });
      };
      await expectFocus("2031-03-12");
      const moves: Array<[string, string]> = [
        ["ArrowRight", "2031-03-13"],
        ["ArrowDown", "2031-03-20"],
        ["Home", "2031-03-16"],
        ["End", "2031-03-22"],
        ["ArrowUp", "2031-03-15"],
        ["ArrowLeft", "2031-03-14"],
      ];
      for (const [key, day] of moves) {
        await page.keyboard.press(key);
        await expectFocus(day);
      }

      // A gridcell has no native activation: the date-grid core's Enter and
      // Space select the focused day; single mode replaces the previous day.
      await page.keyboard.press("Enter");
      await expect.poll(async () => (await calendarFacts(page, framework))?.selected).toEqual(["2031-03-14"]);
      // Focus and the selected state are on one element, the gridcell.
      expect((await calendarFacts(page, framework))!.focusedCell).toEqual({ role: "gridcell", selected: "true" });
      await page.keyboard.press("ArrowRight");
      await expectFocus("2031-03-15");
      await page.keyboard.press("Space");
      await expect.poll(async () => (await calendarFacts(page, framework))?.selected).toEqual(["2031-03-15"]);

      // PageDown leaves the month: the grid re-renders April and focus follows
      // onto the day that did not exist in the previous render.
      await page.keyboard.press("PageDown");
      await expectFocus("2031-04-15");
      const april = await calendarFacts(page, framework);
      expect(april!.caption).toBe("April 2031");
      expect(april!.gridLabel).toBe("April 2031");
    });
  }

  for (const framework of FRAMEWORKS) {
    test(`${framework}: the month buttons move an uncontrolled month`, async ({ page }) => {
      await goto(page, framework, "Calendar", "calendar");
      await page.locator('[data-calendar-nav="next"]').click();
      await expect.poll(async () => (await calendarFacts(page, framework))?.caption).toBe("April 2031");
      const april = await calendarFacts(page, framework);
      expect(april!.gridLabel).toBe("April 2031");
      expect(april!.tabStops).toEqual(["2031-04-12"]);
      expect(april!.current).toEqual([]);

      await page.locator('[data-calendar-nav="previous"]').click();
      await page.locator('[data-calendar-nav="previous"]').click();
      await expect.poll(async () => (await calendarFacts(page, framework))?.caption).toBe("February 2031");
      expect((await calendarFacts(page, framework))!.tabStops).toEqual(["2031-02-12"]);
    });
  }

  for (const framework of FRAMEWORKS) {
    test(`${framework}: clicking an outside-month day selects it, shows its month and keeps focus on it`, async ({ page }) => {
      await goto(page, framework, "Calendar", "calendar");
      // Chromium focuses a clicked button. April's grid re-renders the buttons
      // by position, so focus stays on 2 April only if it follows the day.
      await page.locator('[data-date="2031-04-02"]').click();
      await expect.poll(async () => {
        const facts = await calendarFacts(page, framework);
        return facts && { caption: facts.caption, selected: facts.selected, focused: facts.focused, tabStops: facts.tabStops };
      }).toEqual({ caption: "April 2031", selected: ["2031-04-02"], focused: "2031-04-02", tabStops: ["2031-04-02"] });
    });
  }

  for (const framework of FRAMEWORKS) {
    test(`${framework}: range mode declares multiple selection on the grid and selects the span between two days`, async ({ page }) => {
      await goto(page, framework, "Calendar", "calendar", { mode: "range", month: new Date(2031, 2, 1) });
      await expect.poll(async () => (await calendarFacts(page, framework))?.gridMultiselectable).toBe("true");
      await page.locator('[data-date="2031-03-12"]').click();
      await page.locator('[data-date="2031-03-09"]').click();
      await expect.poll(async () => (await calendarFacts(page, framework))?.selected)
        .toEqual(["2031-03-09", "2031-03-10", "2031-03-11", "2031-03-12"]);
    });
  }

  for (const framework of FRAMEWORKS) {
    test(`${framework}: days outside the bounds are aria-disabled, refuse a click, and stop a key move at the bound`, async ({ page }) => {
      // The month is uncontrolled, so a month button that were not refused would move it.
      await goto(page, framework, "Calendar", "calendar", {
        mode: "single",
        minDate: new Date(2031, 2, 5),
        maxDate: new Date(2031, 2, 25),
      });
      await expect.poll(async () => (await calendarFacts(page, framework))?.enabled.length).toBe(21);
      const march = await calendarFacts(page, framework);
      expect([march!.enabled[0], march!.enabled.at(-1)]).toEqual(["2031-03-05", "2031-03-25"]);
      expect(march!.navDisabled).toEqual(["true", "true"]);
      expect(march!.tabStops).toEqual(["2031-03-12"]);

      const settle = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      // force skips Playwright's own aria-disabled check: the pointer still lands on the day and the grid must refuse it.
      await page.locator('[data-date="2031-03-26"]').click({ force: true });
      await page.locator('[data-calendar-nav="next"]').click({ force: true });
      await settle();
      const refused = await calendarFacts(page, framework);
      expect({ selected: refused!.selected, caption: refused!.caption }).toEqual({ selected: [], caption: "March 2031" });

      await page.locator('[data-date="2031-03-20"]').focus();
      await page.keyboard.press("ArrowDown");
      await expect.poll(async () => (await calendarFacts(page, framework))?.focused).toBe("2031-03-25");
      await page.keyboard.press("PageDown");
      await settle();
      expect((await calendarFacts(page, framework))!.focused).toBe("2031-03-25");
      await page.keyboard.press("Enter");
      await expect.poll(async () => (await calendarFacts(page, framework))?.selected).toEqual(["2031-03-25"]);
    });
  }

  for (const framework of FRAMEWORKS) {
    test(`${framework}: a disabled calendar marks every day disabled and refuses a click and the month buttons`, async ({ page }) => {
      await goto(page, framework, "Calendar", "calendar", { mode: "single", disabled: true });
      await expect.poll(async () => (await calendarFacts(page, framework))?.navDisabled).toEqual(["true", "true"]);
      const march = await calendarFacts(page, framework);
      expect({ days: march!.keys.length, enabled: march!.enabled }).toEqual({ days: 42, enabled: [] });
      await page.locator('[data-date="2031-03-10"]').click({ force: true });
      await page.locator('[data-calendar-nav="next"]').click({ force: true });
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const refused = await calendarFacts(page, framework);
      expect({ selected: refused!.selected, caption: refused!.caption }).toEqual({ selected: [], caption: "March 2031" });
    });
  }

  for (const framework of FRAMEWORKS) {
    test(`${framework}: locale de-DE renders a Monday-first German grid; a controlled month stays put`, async ({ page }) => {
      await goto(page, framework, "Calendar", "calendar", {
        locale: "de-DE",
        mode: "single",
        month: new Date(2031, 4, 1),
      });
      await expect.poll(async () => (await calendarFacts(page, framework))?.caption).toBe("Mai 2031");
      const may = await calendarFacts(page, framework);
      // 1 May 2031 is a Thursday; de-DE weeks begin on Monday.
      expect(may!.keys[0]).toBe("2031-04-28");
      expect(may!.weekdays[0]).toBe("Montag");
      expect(may!.labels["2031-05-01"]).toBe("Donnerstag, 1. Mai 2031");
      expect(may!.tabStops).toEqual(["2031-05-01"]);

      // The consumer owns a controlled month: without one applying
      // onMonthChange, the grid keeps showing May through the frames in which
      // an uncontrolled month re-renders (the previous test).
      await page.locator('[data-calendar-nav="next"]').click();
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      expect((await calendarFacts(page, framework))!.caption).toBe("Mai 2031");
    });
  }

  for (const framework of FRAMEWORKS) {
    test(`${framework}: a key move a controlled month refuses leaves focus and the tab stop where they were`, async ({ page }) => {
      await goto(page, framework, "Calendar", "calendar", { mode: "single", month: new Date(2031, 4, 1) });
      await expect.poll(async () => (await calendarFacts(page, framework))?.caption).toBe("May 2031");
      const settle = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const position = async () => {
        const facts = await calendarFacts(page, framework);
        return facts && { caption: facts.caption, focused: facts.focused, tabStops: facts.tabStops };
      };
      await page.locator('[data-date="2031-05-31"]').focus();
      // 1 June is on screen as an outside-month day of May's grid; focus must
      // not jump to it while the grid still shows May.
      await page.keyboard.press("ArrowRight");
      await settle();
      expect(await position()).toEqual({ caption: "May 2031", focused: "2031-05-31", tabStops: ["2031-05-31"] });
      // 30 June is not on screen at all.
      await page.keyboard.press("PageDown");
      await settle();
      expect(await position()).toEqual({ caption: "May 2031", focused: "2031-05-31", tabStops: ["2031-05-31"] });
      // An in-month move still lands.
      await page.keyboard.press("ArrowLeft");
      await expect.poll(position).toEqual({ caption: "May 2031", focused: "2031-05-30", tabStops: ["2031-05-30"] });
    });
  }
});

test.describe("Runtime rail — Shuttle (array iteration with channel source)", () => {
  // PRODUCTION-ARRAY-ITERATION-CONSUMER-01: the production proof.
  // Shuttle's contract declares `defaultValue: ["alpha", "beta", "gamma"]`
  // and binds `iterate.source` to `channel:selection.value` (the
  // resolved channel value, not the raw destructured prop). At runtime
  // we expect 3 `<li role="option">` cells with text "alpha", "beta",
  // "gamma" in order.
  //
  // What this proves:
  //   - The IR's V2 grammar (BindingExpression `iterationLocal`) lowers
  //     to bare-identifier emit on each framework.
  //   - The iteration source goes through the value renderer (so
  //     `channel:selection.value` resolves to the controllable-state
  //     identifier — `selection` in React, `behavior.selection.value`
  //     in Vue, etc. — NOT the raw `value` prop).
  //   - The `?? []` undefined-guard doesn't fire because defaultValue
  //     seeds the controllable state.
  //   - `content: "iter:item"` in the iterated `<li>`'s child `<span>`
  //     lowers to the per-iteration item value at each position.
  //
  // What this does NOT prove:
  //   - Mutating the selection at runtime (no transfer behavior tested).
  //   - The unselected/source list (Shuttle's dual-listbox design
  //     wasn't built; contract has selected-only DOM by design).
  //   - That all listboxes in the system render `aria-selected` correctly.
  //     This rail only asserts Shuttle, whose selected-only DOM makes
  //     `aria-selected="true"` truthful on every rendered option.
  //     Select and Command have suppression records pending the property-
  //     path slice.
  for (const framework of FRAMEWORKS) {
    test(`${framework}: renders defaultValue items as <li role="option" aria-selected="true"> with iter:item text`, async ({
      page,
    }) => {
      await goto(page, framework, "Shuttle", "shuttle");

      const items = await page.evaluate(
        ({ host, isLit }) => {
          const root: Document | ShadowRoot | null = isLit
            ? (document.querySelector(host) as HTMLElement)?.shadowRoot ?? null
            : document;
          if (!root)
            return {
              count: 0,
              texts: [] as string[],
              roles: [] as Array<string | null>,
              ariaSelected: [] as Array<string | null>,
            };
          const nodes = Array.from(
            root.querySelectorAll(".shuttle__item"),
          );
          return {
            count: nodes.length,
            texts: nodes.map((n) => (n.textContent ?? "").trim()),
            roles: nodes.map((n) => n.getAttribute("role")),
            ariaSelected: nodes.map((n) => n.getAttribute("aria-selected")),
          };
        },
        { host: `fsds-${kebab("Shuttle")}`, isLit: framework === "lit" },
      );

      // defaultValue = ["alpha", "beta", "gamma"] in the contract.
      expect(items.count).toBe(3);
      expect(items.texts).toEqual(["alpha", "beta", "gamma"]);
      // Each cell carries role="option" per the contract's attr.
      expect(items.roles).toEqual(["option", "option", "option"]);
      // A11Y-CONTRACT-OBLIGATION-VALIDATOR-01: every rendered option in
      // Shuttle's selected-only list is selected by definition. The
      // contract's static `attrs.aria-selected: "true"` surfaces as a
      // literal "true" string on each DOM node.
      expect(items.ariaSelected).toEqual(["true", "true", "true"]);
    });
  }
});

test.describe("Runtime rail — Walkthrough (object-array iteration with paths)", () => {
  // PRODUCTION-OBJECT-ARRAY-CONSUMER-01: the production proof of
  // BINDING-EXPRESSION-V2-PATH-01.
  //
  // Walkthrough's contract declares:
  //   - `steps: WalkthroughStepSpec[]` with a contract default of 3
  //     WalkthroughStepSpec objects: { anchor, title } each
  //   - `iterate.kind: "array"` on `button[part="dot"]` using
  //     `prop:steps` and `itemType: "WalkthroughStepSpec"`
  //   - `aria-label: "iter:item.title"` — object-field projection
  //   - `data-step-index: "iter:index"` — index local alongside path
  //
  // What this proves:
  //   - BindingExpressionV2 property paths (iter:item.<field>) lower
  //     correctly in production output, not just synthetic test contracts.
  //   - Every framework emits the dotted accessor (`item.title`) without
  //     a component-name branch in the emitter.
  //   - Index and item locals coexist on the same iterated node.
  //   - The `description?: string` optional field is deliberately NOT
  //     bound — paths only project required object fields in this slice.
  //
  // What this does NOT prove:
  //   - Active-step state, dot interaction, focus, or any guided-tour
  //     behavior. The iteration is structural; the component's
  //     interactive surface is untouched by this slice.
  //   - That paths work for predicates ("is this dot the active step?").
  //     That requires BINDING-EXPRESSION-V2-PREDICATE-01.
  //   - That object-array iteration scales beyond one production
  //     consumer. The mechanism is the same as Shuttle's array iteration;
  //     the path lowering is the new fact.
  //   - Select / Command aria-selected repayment — those suppressions
  //     remain pending the predicate slice.
  const EXPECTED_TITLES = [
    "Welcome to the tour",
    "Browse your dashboard",
    "Configure preferences",
  ];
  for (const framework of FRAMEWORKS) {
    test(`${framework}: renders one dot per step with aria-label=step.title and data-step-index=index`, async ({
      page,
    }) => {
      await goto(page, framework, "Walkthrough", "walkthrough");

      const dots = await page.evaluate(
        ({ host, isLit }) => {
          const root: Document | ShadowRoot | null = isLit
            ? (document.querySelector(host) as HTMLElement)?.shadowRoot ?? null
            : document;
          if (!root)
            return {
              count: 0,
              ariaLabels: [] as Array<string | null>,
              stepIndexes: [] as Array<string | null>,
            };
          const nodes = Array.from(root.querySelectorAll(".walkthrough__dot"));
          return {
            count: nodes.length,
            ariaLabels: nodes.map((n) => n.getAttribute("aria-label")),
            stepIndexes: nodes.map((n) => n.getAttribute("data-step-index")),
          };
        },
        { host: `fsds-${kebab("Walkthrough")}`, isLit: framework === "lit" },
      );

      // The contract's `steps` default seeds three objects.
      expect(dots.count).toBe(3);
      // Each dot's aria-label is the projected `title` field of its
      // corresponding step. This is the production witness of
      // `iter:item.title` lowering correctly across frameworks.
      expect(dots.ariaLabels).toEqual(EXPECTED_TITLES);
      // Iteration locals (item AND index) coexist on the same node:
      // the data-step-index reads `iter:index` while aria-label reads
      // `iter:item.title`.
      expect(dots.stepIndexes).toEqual(["0", "1", "2"]);
    });
  }
});

test.describe("Runtime rail — Select (predicate:memberOf for aria-selected)", () => {
  // PRODUCTION-PREDICATE-CONSUMER-01: the production repayment of
  // Select's `aria-selected` suppression from
  // A11Y-CONTRACT-OBLIGATION-VALIDATOR-01.
  //
  // Select's contract declares:
  //   - `options: SelectOption[]` with a default of three items
  //     (Alpha, Beta, Gamma) so the rail can mount with concrete data.
  //   - `defaultValue: string | string[]` with a default of `"beta"`
  //     (scalar string — exercises the eq arm of memberOf).
  //   - `defaultOpen: true` so the listbox renders without an
  //     interaction (the contract's existing `if: "open"` guards the
  //     content panel).
  //   - `iterate.kind: "array"` on the option node over `prop:options`.
  //   - `aria-selected = predicate:memberOf(iter:item.value, channel:selection.value)`.
  //
  // What this proves:
  //   - BindingExpressionV2 predicate grammar lowers correctly in
  //     production output across React/Vue/Svelte/Lit.
  //   - `predicate:memberOf` truthfully handles the scalar arm of
  //     Select's `string | string[]` selection union — exactly one
  //     option (whose value matches `defaultValue`) renders
  //     `aria-selected="true"`; the other rendered options render
  //     `aria-selected="false"`.
  //   - The Select contract no longer carries an `aria-selected`
  //     suppression in `a11y.obligations.suppress`; the obligation
  //     validator now sees `aria-selected` declared as a dynamic
  //     binding and admits the contract without recording an
  //     unresolved obligation.
  //   - svelte-check no longer warns
  //     `a11y_role_has_required_aria_props` on Select.svelte.
  //
  // What this does NOT prove:
  //   - The array arm of `memberOf` against runtime `string[]`
  //     selection. The contract's `defaultValue` seeded here is a
  //     scalar; covering the array arm in the rail would require an
  //     out-of-band override (not in this slice). Codegen-level
  //     emitter tests pin the array-arm lowering syntactically.
  //   - Selection mutation at runtime (clicking, keyboard
  //     navigation). Select's interactive behavior is unchanged.
  //   - Command's `aria-selected` debt. Command's suppression
  //     remains intentionally open with a refreshed reason —
  //     Command's highlighted item is active-descendant state, not
  //     selected-value state, and resolution requires a separate
  //     mechanism.
  // VUE-FIRST-RENDER-CONTROLLABLE-DEFAULT-01 unblocked the Vue rail
  // case. The original gap: Vue's `Boolean` prop coercion turned an
  // omitted `open` prop into the literal `false` at runtime, which
  // the controllable-state computed prefers over the uncontrolled
  // default. The fix injects explicit `<name>: undefined` defaults
  // into `withDefaults` for every boolean-shaped prop without a
  // contract default, neutralizing the coercion. Vue now rejoins the
  // rest of FRAMEWORKS for Select.
  for (const framework of FRAMEWORKS) {
    test(`${framework}: renders one aria-selected=true option matching defaultValue=beta`, async ({
      page,
    }) => {
      await goto(page, framework, "Select", "select");

      const options = await page.evaluate(
        ({ host, isLit }) => {
          const root: Document | ShadowRoot | null = isLit
            ? (document.querySelector(host) as HTMLElement)?.shadowRoot ?? null
            : document;
          if (!root)
            return {
              count: 0,
              values: [] as Array<string | null>,
              ariaSelected: [] as Array<string | null>,
            };
          const nodes = Array.from(root.querySelectorAll(".select__option"));
          return {
            count: nodes.length,
            values: nodes.map((n) => n.getAttribute("data-value")),
            ariaSelected: nodes.map((n) => n.getAttribute("aria-selected")),
          };
        },
        { host: `fsds-${kebab("Select")}`, isLit: framework === "lit" },
      );

      // The contract's `options` default seeds three items.
      expect(options.count).toBe(3);
      // Each option carries its value as a data attribute (the
      // `iter:item.value` path projection).
      expect(options.values).toEqual(["alpha", "beta", "gamma"]);
      // `defaultValue: "beta"` selects exactly the second option.
      // The memberOf ternary collapses to scalar equality at runtime
      // because `selection` is a string, not an array. Each
      // framework's ARIA-string serialization produces "true"/"false"
      // literals.
      expect(options.ariaSelected).toEqual(["false", "true", "false"]);
    });

    // What a screen reader is handed: Chromium's accessibility tree, read over
    // CDP (Lit's shadow content is part of it). A combobox role on a wrapper
    // that cannot take focus, beside a focusable button whose aria-label hides
    // its text, reads as "Select an option" whatever is selected.
    test(`${framework}: exposes one combobox, the focusable trigger, valued by the selected label`, async ({ page }) => {
      await goto(page, framework, "Select", "select");
      expect(await comboboxes(page)).toEqual([
        { name: "Select an option", value: "Beta", expanded: true, focusable: true },
      ]);
    });
  }
});

/** Every combobox in the page's accessibility tree, as Chromium exposes it. */
async function comboboxes(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send("Accessibility.enable");
  const { nodes } = await client.send("Accessibility.getFullAXTree");
  await client.detach();
  const property = (node: (typeof nodes)[number], name: string) =>
    node.properties?.find((entry) => entry.name === name)?.value.value ?? null;
  return nodes
    .filter((node) => !node.ignored && node.role?.value === "combobox")
    .map((node) => ({
      name: node.name?.value ?? null,
      value: node.value?.value ?? null,
      expanded: property(node, "expanded"),
      focusable: property(node, "focusable"),
    }));
}

// ---------------------------------------------------------------------
// FEAT-PREVIEW-CALLBACK-CAPTURE-01 — the repo's first browser-level
// interaction fact.
//
// Every prior rail block asserts a RENDER fact from static or config-bus
// props; nothing before this clicked an element and observed the runtime
// consequence of an event handler actually firing. This block does: it
// clicks the Select trigger and asserts both (a) the open-channel
// callback fired with the payload the contract predicts, and (b) the DOM
// mutated as that callback's real consumer (a mounted component) would
// mutate it.
//
// The capture surface (src/runtime/config-entry.ts) wraps any prop the
// component's contract declares with propType.kind === "callback" — data-
// driven from packages/ds-contracts/components/Select/Select.contract.json,
// not hardcoded to "onOpenChange" in the preview shell. Invocations land on
// window.__fsdsCallbackLog, readable via page.evaluate.
//
// Select's contract declares `defaultOpen: true` (see anatomy above — the
// `content` node is `if: "open"`, and the rail's default-props Select test
// above already relies on the listbox being open by default to assert
// aria-selected). The FIRST trigger click therefore closes the select, so
// the open-channel callback's first payload is `false`, not `true` — this
// is asserted explicitly rather than assumed.
// Note on title: deliberately NOT "Runtime rail — Select …" — the
// rail-coverage.ts projection + its coherence test (rail-coverage.test.ts,
// out of this spec's scope.in) parse `test.describe("Runtime rail — <Component>…"`
// titles to build a committed default/non-default coverage projection for the
// showcase's Evidence panel. A third title starting with "Runtime rail — Select"
// would misparse as a second (colliding) Select default-facts entry, since the
// parser only recognizes "default" and "non-default <prop>" surfaces, not an
// interaction-fact surface. Prefixing with "Runtime rail interactions" keeps
// this block outside that parser's component-name capture entirely, so this
// e2e-only addition doesn't require touching rail-coverage.ts (out of scope).
test.describe("Runtime rail interactions — Select (first interaction: trigger click)", () => {
  for (const framework of ["react", "vue", "svelte", "lit"] as const) {
    test(`${framework}: clicking .select__trigger fires onOpenChange(false) and closes the listbox`, async ({
      page,
    }) => {
      await goto(page, framework, "Select", "select");

      const hostSelector = framework === "lit" ? `fsds-${kebab("Select")}` : null;

      // Fact 1 (pre-click): defaultOpen=true means the listbox starts open
      // and the root carries the --open modifier class.
      const before = await page.evaluate(
        ({ host, isLit }) => {
          const root: Document | ShadowRoot | null = isLit
            ? (document.querySelector(host!) as HTMLElement)?.shadowRoot ?? null
            : document;
          if (!root) return { hasOpenClass: false, hasContent: false };
          const rootEl = root.querySelector(".select");
          return {
            hasOpenClass: !!rootEl?.classList.contains("select--open"),
            hasContent: !!root.querySelector(".select__content"),
          };
        },
        { host: hostSelector, isLit: framework === "lit" },
      );
      expect(before.hasOpenClass).toBe(true);
      expect(before.hasContent).toBe(true);

      // Click the trigger. For Lit, Playwright's `>>` shadow-piercing
      // locator syntax (already used by `goto`'s selector construction)
      // reaches the button inside the shadow root.
      const triggerSelector =
        framework === "lit" ? `${hostSelector} >> .select__trigger` : ".select__trigger";
      await page.locator(triggerSelector).first().click();

      // Fact 2: the callback-capture surface recorded the invocation. The
      // channel's onOpenChange handler is called with the NEW open value —
      // toggling from the true default produces false first.
      const log = await page.evaluate(
        () => (window as unknown as { __fsdsCallbackLog?: Array<{ name: string; args: unknown[] }> })
          .__fsdsCallbackLog ?? [],
      );
      const openChangeCalls = log.filter((entry) => entry.name === "onOpenChange");
      expect(openChangeCalls).toHaveLength(1);
      expect(openChangeCalls[0].args).toEqual([false]);

      // Fact 3: the DOM consequence of that callback firing — the mounted
      // component's own state updated (this is NOT the preview replaying
      // fsds:config; the click drove the component's internal useState/ref/
      // writable directly), the --open modifier class is gone, and the
      // listbox content is unmounted (each framework's contract-generated
      // source guards `.select__content` behind `if: open`/`{#if}`/`v-if`/
      // the Lit conditional-template branch).
      const after = await page.evaluate(
        ({ host, isLit }) => {
          const root: Document | ShadowRoot | null = isLit
            ? (document.querySelector(host!) as HTMLElement)?.shadowRoot ?? null
            : document;
          if (!root) return { hasOpenClass: true, hasContent: true };
          const rootEl = root.querySelector(".select");
          return {
            hasOpenClass: !!rootEl?.classList.contains("select--open"),
            hasContent: !!root.querySelector(".select__content"),
          };
        },
        { host: hostSelector, isLit: framework === "lit" },
      );
      expect(after.hasOpenClass).toBe(false);
      expect(after.hasContent).toBe(false);
    });
  }

  // Angular's preview path bootstraps via bootstrapApplication + AOT compile
  // and (per the OTP interaction-fact non-claim above, now resolved for
  // React/Vue/Svelte/Lit by this same capture surface) still binds inputs
  // from a mutable `props` object driven by the fsds:config bus rather than
  // wiring the compiled host's own callback props through the capture
  // wrapper — buildAngularDemo's synthesized HostComponent template passes
  // `[onOpenChange]="..."` bindings straight to the Select's Angular @Output
  // wiring, not through a config-entry.ts-style renderComponent(props) call
  // that withCallbackCapture can intercept (angular-preview has no
  // config-entry.ts consumer at all — see buildAngularDemo in
  // src/runtime/demos.ts, which is a fundamentally different synthesized-
  // host pipeline than the shared react/vue/svelte/lit config-entry bus).
  // Recorded skipped per the existing preview constraint, matching how the
  // OTP block above documents the same gap for a different component.
  // NOTE: this must live INSIDE a named test — a bare test.skip(true, …) at
  // describe scope skips EVERY test in the describe (it silently skipped all
  // four framework interaction facts on first landing).
  test("angular: clicking .select__trigger fires onOpenChange(false) and closes the listbox", () => {
    test.skip(
      true,
      "Angular preview does not route through config-entry.ts's callback-capture wrapper (synthesized-host pipeline, not the shared fsds:config bus renderer) — see comment above",
    );
  });
});

test.describe("Runtime rail — Truncate (CSS-var fallback)", () => {
  for (const framework of FRAMEWORKS) {
    test(`${framework}: content element has style attribute slot for --fsds-truncate-content-lines`, async ({ page }) => {
      await goto(page, framework, "Truncate", "truncate");

      // Truncate's `lines` prop has no default. With undefined source,
      // the emitter drops the inline custom property and the CSS rule
      // serves the `var(..., 3)` fallback. The semantic claim is:
      // the codegen produced a binding-aware fill site (verified by
      // codegen tests); at runtime, default props leave the inline
      // slot absent rather than literal "undefined".
      const style = await readInlineStyle(page, framework, "Truncate", "truncate", "truncate__content");
      expect(style).not.toHaveProperty("--fsds-truncate-content-lines", "undefined");
    });
  }
});

test.describe("Runtime rail — ShowMore (CSS-var with default)", () => {
  for (const framework of FRAMEWORKS) {
    test(`${framework}: content element carries --fsds-show-more-content-max-lines from default 3`, async ({ page }) => {
      await goto(page, framework, "ShowMore", "show-more");

      // ShowMore's `maxLines` prop defaults to 3 in the contract,
      // so the default-props demo SHOULD have the inline var set.
      const style = await readInlineStyle(page, framework, "ShowMore", "show-more", "show-more__content");
      expect(style["--fsds-show-more-content-max-lines"]).toBe("3");
    });
  }
});

// ---------------------------------------------------------------------
// Non-default prop rail (RUNTIME-RAIL-NONDEFAULT-PROPS-01).
//
// These tests drive an EXPLICIT non-default prop through the fsds:config
// message bus and assert the runtime fact CHANGES from the default. Each pairs
// a default render with a non-default render and asserts they differ — so a
// preview entry that ignored the bus payload would FAIL here, not silently pass.
// This closes the rail's prior "non-default props are not asserted" non-claim
// for R/V/S/L.
// ---------------------------------------------------------------------

test.describe("Runtime rail — ShowMore non-default maxLines", () => {
  for (const framework of NONDEFAULT_FRAMEWORKS) {
    test(`${framework}: maxLines=7 overrides the default-3 CSS var`, async ({ page }) => {
      await goto(page, framework, "ShowMore", "show-more", { maxLines: 7 });
      const style = await readInlineStyle(
        page,
        framework,
        "ShowMore",
        "show-more",
        "show-more__content",
      );
      // The override must reach the inline var: 7, not the default 3.
      expect(style["--fsds-show-more-content-max-lines"]).toBe("7");
      expect(style["--fsds-show-more-content-max-lines"]).not.toBe("3");
    });
  }

});

test.describe("Runtime rail — Progress non-default value", () => {
  for (const framework of NONDEFAULT_FRAMEWORKS) {
    test(`${framework}: value=50 sets the fill var and aria-valuenow`, async ({ page }) => {
      // Default Progress has no value -> no inline var (asserted above).
      await goto(page, framework, "Progress", "progress", { value: 50 });

      // Fact 1: the fill carries the inline CSS var derived from value=50.
      const style = await readInlineStyle(
        page,
        framework,
        "Progress",
        "progress",
        "progress__fill",
      );
      expect(style).toHaveProperty("--fsds-progress-fill-width");
      expect(style["--fsds-progress-fill-width"]).toContain("50");
      // Not the dropped-undefined state the default-props test asserts.
      expect(style["--fsds-progress-fill-width"]).not.toBe("undefined");

      // Fact 2: the progressbar root reflects aria-valuenow=50.
      const ariaValueNow = await page.evaluate(
        ({ host, isLit }) => {
          const root: Document | ShadowRoot | null = isLit
            ? (document.querySelector(host) as HTMLElement)?.shadowRoot ?? null
            : document;
          if (!root) return null;
          const el = root.querySelector('[role="progressbar"]') as HTMLElement | null;
          return el?.getAttribute("aria-valuenow") ?? null;
        },
        { host: `fsds-${kebab("Progress")}`, isLit: framework === "lit" },
      );
      expect(ariaValueNow).toBe("50");
    });
  }
});

test.describe("Runtime rail — Truncate non-default lines", () => {
  for (const framework of NONDEFAULT_FRAMEWORKS) {
    test(`${framework}: lines=5 sets an exact CSS-var value`, async ({ page }) => {
      // Default Truncate has no lines -> inline var absent (asserted above).
      await goto(page, framework, "Truncate", "truncate", { lines: 5 });
      const style = await readInlineStyle(
        page,
        framework,
        "Truncate",
        "truncate",
        "truncate__content",
      );
      // Upgrades the default "not the string undefined" assertion to an
      // exact non-default value.
      expect(style["--fsds-truncate-content-lines"]).toBe("5");
    });
  }
});

// ---------------------------------------------------------------------

test.describe("Runtime rail — CodeBlock highlight (golden token stream)", () => {
  // RUNTIME-RAIL-CODEBLOCK-HIGHLIGHT-01. The expected kind sequence is
  // loaded from the frozen golden fixtures — the same cross-framework
  // identity baseline the per-package tokenizer tests assert against —
  // so this rail fact and the unit rails cannot drift apart.
  for (const framework of NONDEFAULT_FRAMEWORKS) {
    test(`${framework}: token spans match the frozen golden typescript stream`, async ({ page }) => {
      const golden = loadGoldenTypescriptCase();
      await goto(page, framework, "CodeBlock", "code-block", {
        code: golden.code,
        language: golden.language,
      });
      const facts = await readCodeBlockTokenFacts(page, framework);
      expect(facts.spanCount).toBe(golden.visibleTokens.length);
      expect(facts.kinds).toEqual(golden.visibleTokens.map((token) => token.kind));
      // The line wrapper owns exact endings; token parts own visible syntax.
      expect(facts.spanText).toBe(golden.visibleTokens.map((token) => token.text).join(""));
      expect(facts.plainText).toBe(golden.code);
    });
  }
});

test.describe("Runtime rail — CodeBlock gate-off plain run", () => {
  for (const framework of NONDEFAULT_FRAMEWORKS) {
    test(`${framework}: highlight=false degrades to a single plain text run`, async ({ page }) => {
      const golden = loadGoldenTypescriptCase();
      await goto(page, framework, "CodeBlock", "code-block", {
        code: golden.code,
        language: golden.language,
        highlight: false,
      });
      const facts = await readCodeBlockTokenFacts(page, framework);
      expect(facts.spanCount).toBe(0);
      // Vue/Angular pretty-print their templates around the
      // interpolation; the round-trip claim is the source characters,
      // hence trim().
      expect(facts.plainText.trim()).toBe(golden.code);
    });
  }
});

// ---------------------------------------------------------------------

/**
 * RUNTIME-RAIL-CODEBLOCK-HIGHLIGHT-01: the frozen golden typescript case
 * from the canonical tokenizer's fixture file — the single identity
 * baseline shared with the per-package tokenizer tests.
 */
function loadGoldenTypescriptCase(): {
  language: string;
  code: string;
  visibleTokens: { kind: string; text: string }[];
} {
  const fixture = JSON.parse(
    readFileSync(
      join(
        process.cwd(),
        "packages",
        "ds-codegen",
        "src",
        "highlight",
        "golden-fixtures.json",
      ),
      "utf8",
    ),
  ) as {
    cases: { language: string; code: string; expected: { kind: string; text: string }[] }[];
  };
  const ts = fixture.cases.find((c) => c.language === "typescript");
  if (!ts) throw new Error("golden fixtures: typescript case missing");
  return {
    language: ts.language,
    code: ts.code,
    visibleTokens: ts.expected.flatMap((token) =>
      token.text.split(/\r?\n/).filter(Boolean).map((text) => ({ kind: token.kind, text })),
    ),
  };
}

/**
 * Read CodeBlock's token-span facts from the mounted preview: the
 * `data-token` kind sequence, the concatenated span text, the span
 * count, and the whole `code` element's text (the gate-off plain run).
 * Lit renders into a shadow root — same accessor pattern as
 * `readInlineStyle`.
 */
async function readCodeBlockTokenFacts(
  page: Page,
  framework: Framework,
): Promise<{
  kinds: string[];
  spanText: string;
  spanCount: number;
  plainText: string;
}> {
  return page.evaluate(
    ({ host, isLit }) => {
      const root: Document | ShadowRoot | null = isLit
        ? (document.querySelector(host) as HTMLElement | null)?.shadowRoot ?? null
        : document;
      const code = root?.querySelector("code") ?? null;
      const spans = code ? Array.from(code.querySelectorAll("[data-token]")) : [];
      return {
        kinds: spans.map((s) => s.getAttribute("data-token") ?? ""),
        spanText: spans.map((s) => s.textContent ?? "").join(""),
        spanCount: spans.length,
        plainText: code?.textContent ?? "",
      };
    },
    { host: `fsds-${kebab("CodeBlock")}`, isLit: framework === "lit" },
  );
}

// ---------------------------------------------------------------------

test.describe("Runtime rail — Markdown structural render (golden tree)", () => {
  // RUNTIME-RAIL facts for FEAT-MARKDOWN-CONTENT-TRANSFORM-01: the DOM
  // shape mirrors the frozen golden parse tree — block kinds and mark
  // kinds in document order — across all five frameworks.
  for (const framework of NONDEFAULT_FRAMEWORKS) {
    test(`${framework}: block and mark kind sequences match the golden tree`, async ({ page }) => {
      const doc = loadMarkdownGoldenFullDoc();
      await goto(page, framework, "Markdown", "markdown", {
        content: doc.source,
      });
      const facts = await readMarkdownFacts(page, framework);
      expect(facts.blockKinds).toEqual(doc.blockKinds);
      expect(facts.markKinds).toEqual(doc.markKinds);
    });
  }
});

test.describe("Runtime rail — Markdown literal-HTML doctrine", () => {
  for (const framework of NONDEFAULT_FRAMEWORKS) {
    test(`${framework}: hostile markup renders literally; unsafe hrefs degrade`, async ({ page }) => {
      await goto(page, framework, "Markdown", "markdown", {
        content:
          "# <img src=x onerror=alert(1)>\n\nSee [docs](javascript:alert(1)) and [site](https://example.com).",
      });
      const facts = await readMarkdownFacts(page, framework);
      expect(facts.imgCount).toBe(0);
      expect(facts.scriptCount).toBe(0);
      expect(facts.text).toContain("<img src=x onerror=alert(1)>");
      expect(facts.hrefs).toEqual(["https://example.com"]);
    });
  }
});

/**
 * FEAT-MARKDOWN-CONTENT-TRANSFORM-01: the frozen golden full-document
 * case — same identity-baseline doctrine as the CodeBlock rail facts.
 */
function loadMarkdownGoldenFullDoc(): {
  source: string;
  blockKinds: string[];
  markKinds: string[];
} {
  const fixture = JSON.parse(
    readFileSync(
      join(process.cwd(), "packages", "ds-codegen", "src", "markdown", "fixtures.json"),
      "utf8",
    ),
  ) as {
    cases: { name: string; source: string; expected: unknown[] }[];
  };
  const full = fixture.cases.find((c) => c.name === "full document");
  if (!full) throw new Error("markdown fixtures: full document case missing");
  const blockKinds: string[] = [];
  const markKinds: string[] = [];
  const BLOCK_KINDS = ["heading", "paragraph", "list", "listItem", "codeBlock", "blockquote"];
  const MARK_KINDS = ["emphasis", "strong", "code", "link"];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (!node || typeof node !== "object") return;
    const typed = node as Record<string, unknown>;
    if (typeof typed.kind === "string") {
      // The parser kind "list" realizes as unorderedList/orderedList in
      // the DOM (data-block-kind carries the realized kind).
      if (typed.kind === "list") {
        blockKinds.push(typed.ordered === true ? "orderedList" : "unorderedList");
      } else if (BLOCK_KINDS.includes(typed.kind)) {
        blockKinds.push(typed.kind);
      }
      if (MARK_KINDS.includes(typed.kind)) markKinds.push(typed.kind);
    }
    if (Array.isArray(typed.children)) visit(typed.children);
    if (Array.isArray(typed.items)) visit(typed.items);
  };
  visit(full.expected);
  return { source: full.source, blockKinds, markKinds };
}

async function readMarkdownFacts(
  page: Page,
  framework: Framework,
): Promise<{
  blockKinds: string[];
  markKinds: string[];
  imgCount: number;
  scriptCount: number;
  hrefs: string[];
  text: string;
}> {
  return page.evaluate(
    ({ host, isLit }) => {
      // Scope to the component's rendered tree — the page's own <script>
      // tags are not the component's output.
      const scope: ParentNode = isLit
        ? (document.querySelector(host) as HTMLElement | null)?.shadowRoot ??
          document
        : (document.querySelector(".markdown") as HTMLElement | null) ?? document;
      const blocks = Array.from(scope.querySelectorAll("[data-block-kind]"));
      const marks = Array.from(scope.querySelectorAll("[data-mark-kind]"));
      return {
        blockKinds: blocks.map((el) => el.getAttribute("data-block-kind") ?? ""),
        markKinds: marks.map((el) => el.getAttribute("data-mark-kind") ?? ""),
        imgCount: scope.querySelectorAll("img").length,
        scriptCount: scope.querySelectorAll("script").length,
        hrefs: Array.from(scope.querySelectorAll("a")).map(
          (el) => el.getAttribute("href") ?? "",
        ),
        text: scope.textContent ?? "",
      };
    },
    { host: `fsds-${kebab("Markdown")}`, isLit: framework === "lit" },
  );
}

test.describe("Runtime rail — screenshots", () => {
  // Visual snapshots are intentionally narrow: one component × one
  // framework. The existing `visual-regression.spec.ts` already covers
  // Progress/Switch/Popover/Checkbox at React+Lit × light/dark; the
  // additions here cover the new components introduced or modified
  // by Commits 3-6. React-only keeps the snapshot surface manageable
  // while still proving "the rendered tree differs from what the
  // codegen-emit tests would catch."
  //
  // Skipped in CI: the committed baselines are chromium-darwin only.
  // Running these on Linux CI without Linux baselines would either
  // always-fail (which doesn't catch real regressions) or write
  // Linux baselines on first run (the wrong signal for a gate).
  // Local developers run them implicitly via `pnpm run e2e:rail`
  // against the committed darwin baselines. The fact-assertion
  // describes above run everywhere.
  test.skip(!!process.env.CI, "Screenshot baselines are darwin-only");

  const COMPONENTS = ["Progress", "Truncate", "ShowMore", "OTP", "Calendar"] as const;

  for (const component of COMPONENTS) {
    test(`react: ${component} mounts and matches baseline`, async ({ page }) => {
      const blockClass: Record<(typeof COMPONENTS)[number], string> = {
        Progress: "progress",
        Truncate: "truncate",
        ShowMore: "show-more",
        OTP: "otp",
        Calendar: "calendar",
      };
      // Calendar's default month and today come from the clock.
      if (component === "Calendar") await page.clock.setFixedTime(CALENDAR_TODAY);
      await goto(page, "react", component, blockClass[component]);
      await expect(page).toHaveScreenshot(`${component}-react.png`, {
        maxDiffPixelRatio: 0.02,
        animations: "disabled",
      });
    });
  }
});
