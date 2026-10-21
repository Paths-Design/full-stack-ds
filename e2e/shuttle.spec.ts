import { expect, test, type Page } from "@playwright/test";

/**
 * Shuttle — the dual-listbox transfer (SHUTTLE-DUAL-LISTBOX-01) in a real
 * browser on every web target. Every target binds the shared transfer-list
 * core, so the same facts hold for all five: two multi-select listboxes named
 * from the catalog, one tab stop per list, a mark (aria-selected) set by
 * Space or a click, and Enter or the Add and Remove buttons moving the marked
 * items. The preview mounts Shuttle uncontrolled with its contract default
 * options (alpha, beta, gamma, delta, epsilon) and an empty selection.
 *
 * CSS locators pierce Lit's open shadow root; the focused item is read from
 * the root that owns it (document.activeElement is the Lit host).
 */

type Framework = "react" | "vue" | "svelte" | "lit" | "angular";
const FRAMEWORKS: readonly Framework[] = ["react", "vue", "svelte", "lit", "angular"];
const OPTIONS = ["alpha", "beta", "gamma", "delta", "epsilon"];

async function goto(page: Page, framework: Framework) {
  await page.goto(`/preview/${framework}/Shuttle`, { waitUntil: "domcontentloaded" });
  await page.locator(framework === "lit" ? "fsds-shuttle >> .shuttle" : ".shuttle").first().waitFor({ state: "attached", timeout: 30_000 });
  await page.locator("body[data-fsds-ready]").waitFor({ state: "attached", timeout: 30_000 });
}

interface ListFacts {
  role: string | null;
  label: string | null;
  multiselectable: string | null;
  keys: string[];
  marked: string[];
  tabStops: string[];
  roles: string[];
}

interface ShuttleFacts {
  groupRole: string | null;
  available: ListFacts;
  selected: ListFacts;
  addDisabled: boolean;
  removeDisabled: boolean;
  addLabel: string;
  removeLabel: string;
  /** The focused item as side/key, or null when focus is not on an item. */
  focused: string | null;
  /** Focusable or interactive elements inside any option. */
  nestedControls: number;
}

async function shuttleFacts(page: Page, framework: Framework): Promise<ShuttleFacts | null> {
  return page.evaluate((isLit) => {
    const root: Document | ShadowRoot | null = isLit
      ? (document.querySelector("fsds-shuttle") as HTMLElement | null)?.shadowRoot ?? null
      : document;
    if (!root) return null;
    const list = (side: string) => {
      const box = root.querySelector(`[data-side="${side}"]`);
      const items = Array.from(box?.querySelectorAll<HTMLElement>("[data-value]") ?? []);
      const key = (item: HTMLElement) => item.getAttribute("data-value") ?? "";
      return {
        role: box?.getAttribute("role") ?? null,
        label: box?.getAttribute("aria-label") ?? null,
        multiselectable: box?.getAttribute("aria-multiselectable") ?? null,
        keys: items.map(key),
        marked: items.filter((item) => item.getAttribute("aria-selected") === "true").map(key),
        tabStops: items.filter((item) => item.getAttribute("tabindex") === "0").map(key),
        roles: [...new Set(items.map((item) => item.getAttribute("role") ?? ""))],
      };
    };
    const button = (part: string) => root.querySelector<HTMLButtonElement>(`.shuttle__${part}`);
    const active = root.activeElement as HTMLElement | null;
    const side = active?.closest("[data-side]")?.getAttribute("data-side");
    return {
      groupRole: root.querySelector(".shuttle")?.getAttribute("role") ?? null,
      available: list("available"),
      selected: list("selected"),
      addDisabled: button("add")?.disabled ?? false,
      removeDisabled: button("remove")?.disabled ?? false,
      addLabel: button("add")?.textContent?.trim() ?? "",
      removeLabel: button("remove")?.textContent?.trim() ?? "",
      focused: active?.hasAttribute("data-value") && side ? `${side}/${active.getAttribute("data-value")}` : null,
      nestedControls: root.querySelectorAll("[role=option] button, [role=option] a, [role=option] input, [role=option] [tabindex]").length,
    };
  }, framework === "lit");
}

const item = (page: Page, side: string, key: string) => page.locator(`[data-side="${side}"] [data-value="${key}"]`);

test.describe("Shuttle — dual-listbox transfer", () => {
  for (const framework of FRAMEWORKS) {
    test(`${framework}: two named multi-select listboxes, one tab stop each, nothing marked`, async ({ page }) => {
      await goto(page, framework);
      const facts = await shuttleFacts(page, framework);
      expect(facts).not.toBeNull();
      expect(facts!.groupRole).toBe("group");
      expect(facts!.available).toEqual({
        role: "listbox", label: "Available", multiselectable: "true",
        keys: OPTIONS, marked: [], tabStops: ["alpha"], roles: ["option"],
      });
      expect(facts!.selected).toEqual({
        role: "listbox", label: "Selected", multiselectable: "true",
        keys: [], marked: [], tabStops: [], roles: [],
      });
      // A button stays disabled until its source list holds a mark.
      expect([facts!.addDisabled, facts!.removeDisabled]).toEqual([true, true]);
      expect([facts!.addLabel, facts!.removeLabel]).toEqual(["Add", "Remove"]);
      // The listbox pattern: the option is the control; nothing focusable inside it.
      expect(facts!.nestedControls).toBe(0);
    });
  }

  for (const framework of FRAMEWORKS) {
    test(`${framework}: arrows, Home and End move focus with the tab stop; Space marks; Enter transfers`, async ({ page }) => {
      await goto(page, framework);
      await item(page, "available", "alpha").focus();
      const expectFocus = async (key: string) => {
        await expect.poll(async () => {
          const facts = await shuttleFacts(page, framework);
          return facts && { focused: facts.focused, tabStops: facts.available.tabStops };
        }).toEqual({ focused: `available/${key}`, tabStops: [key] });
      };
      await expectFocus("alpha");
      for (const [key, to] of [["ArrowDown", "beta"], ["End", "epsilon"], ["ArrowDown", "epsilon"], ["Home", "alpha"], ["ArrowUp", "alpha"]] as const) {
        await page.keyboard.press(key);
        await expectFocus(to);
      }

      // Space marks the focused item without moving it.
      await page.keyboard.press("ArrowDown");
      await expectFocus("beta");
      await page.keyboard.press(" ");
      await expect.poll(async () => (await shuttleFacts(page, framework))?.available.marked).toEqual(["beta"]);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await expectFocus("delta");
      await page.keyboard.press(" ");
      await expect.poll(async () => (await shuttleFacts(page, framework))?.available.marked).toEqual(["beta", "delta"]);
      expect((await shuttleFacts(page, framework))!.addDisabled).toBe(false);

      // Enter moves every marked item, in list order, and focus stays in the
      // source list on the nearest item that remains.
      await page.keyboard.press("Enter");
      await expect.poll(async () => {
        const facts = await shuttleFacts(page, framework);
        return facts && { available: facts.available.keys, selected: facts.selected.keys, marked: facts.available.marked, focused: facts.focused };
      }).toEqual({ available: ["alpha", "gamma", "epsilon"], selected: ["beta", "delta"], marked: [], focused: "available/gamma" });
      expect((await shuttleFacts(page, framework))!.addDisabled).toBe(true);

      // With nothing marked, Enter moves the focused item.
      await page.keyboard.press("Enter");
      await expect.poll(async () => (await shuttleFacts(page, framework))?.selected.keys).toEqual(["beta", "delta", "gamma"]);
    });
  }

  for (const framework of FRAMEWORKS) {
    test(`${framework}: a click marks an item, and Add and Remove move the marked items`, async ({ page }) => {
      await goto(page, framework);
      await item(page, "available", "gamma").click();
      await item(page, "available", "alpha").click();
      await expect.poll(async () => (await shuttleFacts(page, framework))?.available.marked).toEqual(["alpha", "gamma"]);
      // A second click unmarks.
      await item(page, "available", "alpha").click();
      await expect.poll(async () => (await shuttleFacts(page, framework))?.available.marked).toEqual(["gamma"]);
      await item(page, "available", "alpha").click();

      await page.locator(".shuttle__add").click();
      await expect.poll(async () => {
        const facts = await shuttleFacts(page, framework);
        return facts && { available: facts.available.keys, selected: facts.selected.keys, addDisabled: facts.addDisabled };
      }).toEqual({ available: ["beta", "delta", "epsilon"], selected: ["alpha", "gamma"], addDisabled: true });

      await item(page, "selected", "alpha").click();
      await expect.poll(async () => (await shuttleFacts(page, framework))?.removeDisabled).toBe(false);
      await page.locator(".shuttle__remove").click();
      // A removed item returns to its place in options order.
      await expect.poll(async () => {
        const facts = await shuttleFacts(page, framework);
        return facts && { available: facts.available.keys, selected: facts.selected.keys, removeDisabled: facts.removeDisabled };
      }).toEqual({ available: ["alpha", "beta", "delta", "epsilon"], selected: ["gamma"], removeDisabled: true });
    });
  }
});
