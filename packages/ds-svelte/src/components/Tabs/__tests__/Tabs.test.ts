// @generated:start imports
import { describe, expect, it } from "vitest";
import { createRawSnippet, type Component } from "svelte";
import { render } from "@testing-library/svelte";
import { axe } from "vitest-axe";
import Tabs from "../Tabs.svelte";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Tabs — unit", () => {
  it("renders with default props", () => {
    const { container } = render(Tabs as unknown as Component<Record<string, unknown>>, { props: {} });
    expect(container.firstElementChild).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const { container } = render(Tabs as unknown as Component<Record<string, unknown>>, { props: {} });
    expect(container.firstElementChild?.className).toContain("tabs");
  });

  it("merges custom class", () => {
    const { container } = render(Tabs as unknown as Component<Record<string, unknown>>, { props: { "class": "custom" } });
    expect(container.firstElementChild?.className).toContain("tabs");
    expect(container.firstElementChild?.className).toContain("custom");
  });

  it("applies orientation=horizontal variant class", () => {
    const { container } = render(Tabs as unknown as Component<Record<string, unknown>>, { props: { "orientation": "horizontal" } });
    expect(container.firstElementChild?.className).toContain("tabs--horizontal");
  });

  it("applies orientation=vertical variant class", () => {
    const { container } = render(Tabs as unknown as Component<Record<string, unknown>>, { props: { "orientation": "vertical" } });
    expect(container.firstElementChild?.className).toContain("tabs--vertical");
  });

  it("applies appearance=underline variant class", () => {
    const { container } = render(Tabs as unknown as Component<Record<string, unknown>>, { props: { "appearance": "underline" } });
    expect(container.firstElementChild?.className).toContain("tabs--underline");
  });

  it("applies appearance=pills variant class", () => {
    const { container } = render(Tabs as unknown as Component<Record<string, unknown>>, { props: { "appearance": "pills" } });
    expect(container.firstElementChild?.className).toContain("tabs--pills");
  });

  it("applies activationMode=automatic variant class", () => {
    const { container } = render(Tabs as unknown as Component<Record<string, unknown>>, { props: { "activationMode": "automatic" } });
    expect(container.firstElementChild?.className).toContain("tabs--automatic");
  });

  it("applies activationMode=manual variant class", () => {
    const { container } = render(Tabs as unknown as Component<Record<string, unknown>>, { props: { "activationMode": "manual" } });
    expect(container.firstElementChild?.className).toContain("tabs--manual");
  });
});

describe("Tabs — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { container } = render(Tabs as unknown as Component<Record<string, unknown>>, { props: { "aria-label": "Test Tabs", "children": createRawSnippet(() => ({ render: () => "<span>content</span>" })) } });
    const results = await axe(container, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
import { describe as desc, it as test, expect as exp, vi } from "vitest";
import type { Component as SvelteComp } from "svelte";
import { render as svelteRender, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import TabsFixture from "./TabsFixture.svelte";

/**
 * Stable CSS/role selectors that don't rely on data-testid passthrough.
 * Tab IDs follow the pattern: `${idBase}-tab-${value}`
 * Panel IDs follow the pattern: `${idBase}-panel-${value}`
 */
const sel = {
  tabA: `[role="tab"][data-value="a"]`,
  tabB: `[role="tab"][data-value="b"]`,
  tabList: `[role="tablist"]`,
  panelA: `[role="tabpanel"][id$="-panel-a"]`,
  panelB: `[role="tabpanel"][id$="-panel-b"]`,
};

function renderTabs(props: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  activationMode?: "automatic" | "manual";
  loop?: boolean;
  unmountInactive?: boolean;
  orientation?: "horizontal" | "vertical";
  values?: string[];
} = {}) {
  return svelteRender(TabsFixture as unknown as SvelteComp<Record<string, unknown>>, {
    props: {
      defaultValue: props.defaultValue ?? "a",
      ...(props.values !== undefined ? { values: props.values } : {}),
      ...(props.value !== undefined ? { value: props.value } : {}),
      ...(props.onValueChange !== undefined ? { onValueChange: props.onValueChange } : {}),
      ...(props.activationMode !== undefined ? { activationMode: props.activationMode } : {}),
      ...(props.loop !== undefined ? { loop: props.loop } : {}),
      ...(props.unmountInactive !== undefined ? { unmountInactive: props.unmountInactive } : {}),
      ...(props.orientation !== undefined ? { orientation: props.orientation } : {}),
    },
  });
}

desc("Tabs — behavioral", () => {
  test("renders the active panel and hides the inactive panel by default", async () => {
    const { container } = renderTabs({ defaultValue: "a" });
    await tick();

    exp(container.querySelector(sel.panelA)).toBeTruthy();
    exp(container.querySelector(sel.panelB)).toBeFalsy();
  });

  test("clicking a tab activates it and swaps panels", async () => {
    const { container } = renderTabs({ defaultValue: "a" });
    await tick();

    exp(container.querySelector(sel.panelA)).toBeTruthy();
    exp(container.querySelector(sel.panelB)).toBeFalsy();

    // Click tab B
    const tabB = container.querySelector<HTMLButtonElement>(sel.tabB)!;
    await fireEvent.click(tabB);
    await tick();

    exp(container.querySelector(sel.panelB)).toBeTruthy();
    exp(container.querySelector(sel.panelA)).toBeFalsy();
  });

  test("calls onValueChange when a tab is clicked", async () => {
    const onValueChange = vi.fn();
    const { container } = renderTabs({ defaultValue: "a", onValueChange });
    await tick();

    const tabB = container.querySelector<HTMLButtonElement>(sel.tabB)!;
    await fireEvent.click(tabB);

    exp(onValueChange).toHaveBeenCalledWith("b");
  });

  test("aria-selected is true for active tab, false for inactive", async () => {
    const { container } = renderTabs({ defaultValue: "a" });
    await tick();

    const tabA = container.querySelector<HTMLButtonElement>(sel.tabA)!;
    const tabB = container.querySelector<HTMLButtonElement>(sel.tabB)!;

    exp(tabA.getAttribute("aria-selected")).toBe("true");
    exp(tabB.getAttribute("aria-selected")).toBe("false");
  });

  test("flips aria-selected when tab is clicked", async () => {
    const { container } = renderTabs({ defaultValue: "a" });
    await tick();

    const tabB = container.querySelector<HTMLButtonElement>(sel.tabB)!;
    await fireEvent.click(tabB);
    await tick();

    const tabA = container.querySelector<HTMLButtonElement>(sel.tabA)!;
    exp(tabA.getAttribute("aria-selected")).toBe("false");
    exp(tabB.getAttribute("aria-selected")).toBe("true");
  });

  test("roving tabindex: active tab has tabindex=0, inactive has tabindex=-1", async () => {
    const { container } = renderTabs({ defaultValue: "a" });
    await tick();

    const tabA = container.querySelector<HTMLButtonElement>(sel.tabA)!;
    const tabB = container.querySelector<HTMLButtonElement>(sel.tabB)!;

    exp(tabA.getAttribute("tabindex")).toBe("0");
    exp(tabB.getAttribute("tabindex")).toBe("-1");
  });

  test("tablist is programmatically focusable, out of tab order", async () => {
    const { container } = renderTabs({ defaultValue: "a" });
    await tick();

    // The tablist hosts the delegated roving keydown; its interactive role
    // demands programmatic focusability (svelte a11y_interactive_supports_focus)
    // while -1 keeps it out of the tab order.
    const list = container.querySelector<HTMLElement>('[role="tablist"]')!;
    exp(list.getAttribute("tabindex")).toBe("-1");
  });

  test("roving tabindex updates when active tab changes", async () => {
    const { container } = renderTabs({ defaultValue: "a" });
    await tick();

    const tabB = container.querySelector<HTMLButtonElement>(sel.tabB)!;
    await fireEvent.click(tabB);
    await tick();

    const tabA = container.querySelector<HTMLButtonElement>(sel.tabA)!;
    exp(tabA.getAttribute("tabindex")).toBe("-1");
    exp(tabB.getAttribute("tabindex")).toBe("0");
  });

  test("tabs have role=tab, tablist has role=tablist, panels have role=tabpanel", async () => {
    const { container } = renderTabs({ defaultValue: "a" });
    await tick();

    exp(container.querySelector(sel.tabA)?.getAttribute("role")).toBe("tab");
    exp(container.querySelector(sel.tabB)?.getAttribute("role")).toBe("tab");
    exp(container.querySelector(sel.tabList)?.getAttribute("role")).toBe("tablist");
    exp(container.querySelector(sel.panelA)?.getAttribute("role")).toBe("tabpanel");
  });

  test("tab aria-controls matches panel id, panel aria-labelledby matches tab id", async () => {
    const { container } = renderTabs({ defaultValue: "a" });
    await tick();

    const tabA = container.querySelector<HTMLButtonElement>(sel.tabA)!;
    const panelA = container.querySelector<HTMLElement>(sel.panelA)!;

    const tabId = tabA.getAttribute("id") ?? "";
    const panelId = panelA.getAttribute("id") ?? "";

    // IDs follow pattern: ${idBase}-tab-a / ${idBase}-panel-a
    exp(tabId).toMatch(/-tab-a$/);
    exp(panelId).toMatch(/-panel-a$/);
    // aria-controls on the tab points at the panel
    exp(tabA.getAttribute("aria-controls")).toBe(panelId);
    // aria-labelledby on the panel points at the tab
    exp(panelA.getAttribute("aria-labelledby")).toBe(tabId);
  });

  test("keyboard ArrowRight moves focus to next tab and activates it (automatic mode)", async () => {
    const { container } = renderTabs({ defaultValue: "a" });
    await tick();

    const list = container.querySelector<HTMLElement>(sel.tabList)!;
    await fireEvent.keyDown(list, { key: "ArrowRight" });
    await tick();

    const tabB = container.querySelector<HTMLButtonElement>(sel.tabB)!;
    exp(tabB.getAttribute("aria-selected")).toBe("true");
  });

  test("keyboard ArrowLeft moves focus to previous tab", async () => {
    const { container } = renderTabs({ defaultValue: "b" });
    await tick();

    const list = container.querySelector<HTMLElement>(sel.tabList)!;
    await fireEvent.keyDown(list, { key: "ArrowLeft" });
    await tick();

    const tabA = container.querySelector<HTMLButtonElement>(sel.tabA)!;
    exp(tabA.getAttribute("aria-selected")).toBe("true");
  });

  test("manual activation: repeated arrows move on from the focused tab while the selection stays", async () => {
    document.documentElement.setAttribute("dir", "rtl");
    try {
      const { container } = renderTabs({ defaultValue: "a", activationMode: "manual", loop: false, values: ["a", "b", "c"] });
      await tick();
      const press = async (key: string) => {
        await fireEvent.keyDown(document.activeElement as HTMLElement, { key });
        await tick();
      };
      container.querySelector<HTMLElement>('[role="tab"][data-value="a"]')!.focus();
      await press("ArrowLeft");
      await press("ArrowLeft");
      exp(document.activeElement?.getAttribute("data-value")).toBe("c");
      exp(container.querySelector('[role="tab"][data-value="a"]')!.getAttribute("aria-selected")).toBe("true");
      await press("ArrowRight");
      exp(document.activeElement?.getAttribute("data-value")).toBe("b");
    } finally {
      document.documentElement.removeAttribute("dir");
    }
  });

  test("in a right-to-left page, ArrowLeft moves to the next tab and ArrowRight to the previous", async () => {
    // Without loop, a physical mapping leaves the first tab selected: ArrowLeft
    // from the first tab has no previous tab to reach.
    document.documentElement.setAttribute("dir", "rtl");
    try {
      const { container } = renderTabs({ defaultValue: "a", loop: false });
      await tick();
      const list = container.querySelector<HTMLElement>(sel.tabList)!;
      await fireEvent.keyDown(list, { key: "ArrowLeft" });
      await tick();
      exp(container.querySelector(sel.tabB)!.getAttribute("aria-selected")).toBe("true");
      await fireEvent.keyDown(list, { key: "ArrowRight" });
      await tick();
      exp(container.querySelector(sel.tabA)!.getAttribute("aria-selected")).toBe("true");
    } finally {
      document.documentElement.removeAttribute("dir");
    }
  });

  test("keyboard Home moves focus to first tab", async () => {
    const { container } = renderTabs({ defaultValue: "b" });
    await tick();

    const list = container.querySelector<HTMLElement>(sel.tabList)!;
    await fireEvent.keyDown(list, { key: "Home" });
    await tick();

    const tabA = container.querySelector<HTMLButtonElement>(sel.tabA)!;
    exp(tabA.getAttribute("aria-selected")).toBe("true");
  });

  test("keyboard End moves focus to last tab", async () => {
    const { container } = renderTabs({ defaultValue: "a" });
    await tick();

    const list = container.querySelector<HTMLElement>(sel.tabList)!;
    await fireEvent.keyDown(list, { key: "End" });
    await tick();

    const tabB = container.querySelector<HTMLButtonElement>(sel.tabB)!;
    exp(tabB.getAttribute("aria-selected")).toBe("true");
  });

  test("keyboard loop: ArrowRight from last tab wraps to first", async () => {
    const { container } = renderTabs({ defaultValue: "b", loop: true });
    await tick();

    const list = container.querySelector<HTMLElement>(sel.tabList)!;
    await fireEvent.keyDown(list, { key: "ArrowRight" });
    await tick();

    const tabA = container.querySelector<HTMLButtonElement>(sel.tabA)!;
    exp(tabA.getAttribute("aria-selected")).toBe("true");
  });

  test("manual activation mode: ArrowRight moves focus but does NOT activate tab", async () => {
    const { container } = renderTabs({ defaultValue: "a", activationMode: "manual" });
    await tick();

    const list = container.querySelector<HTMLElement>(sel.tabList)!;
    await fireEvent.keyDown(list, { key: "ArrowRight" });
    await tick();

    // Tab A should still be active (ArrowRight only moves focus in manual mode)
    const tabA = container.querySelector<HTMLButtonElement>(sel.tabA)!;
    const tabB = container.querySelector<HTMLButtonElement>(sel.tabB)!;
    exp(tabA.getAttribute("aria-selected")).toBe("true");
    exp(tabB.getAttribute("aria-selected")).toBe("false");
  });

  test("unmountInactive=false: inactive panels render with hidden attribute", async () => {
    const { container } = renderTabs({ defaultValue: "a", unmountInactive: false });
    await tick();

    // Both panels should be in the DOM
    const panels = container.querySelectorAll("[role='tabpanel']");
    exp(panels.length).toBe(2);

    const activePanel = container.querySelector<HTMLElement>(`[role="tabpanel"][id$="-panel-a"]`);
    const inactivePanel = container.querySelector<HTMLElement>(`[role="tabpanel"][id$="-panel-b"]`);

    exp(activePanel).toBeTruthy();
    exp(inactivePanel).toBeTruthy();

    // Inactive panel B has hidden attribute; active A does not
    exp(inactivePanel?.hasAttribute("hidden")).toBe(true);
    exp(activePanel?.hasAttribute("hidden")).toBe(false);
  });

  test("controlled mode: value prop controls the active tab and callback fires", async () => {
    const onValueChange = vi.fn();

    // Render with controlled value prop = "a"
    const { container, rerender } = svelteRender(
      TabsFixture as unknown as SvelteComp<Record<string, unknown>>,
      {
        props: {
          value: "a",
          onValueChange,
        },
      },
    );
    await tick();

    const tabA = container.querySelector<HTMLButtonElement>(sel.tabA)!;
    exp(tabA.getAttribute("aria-selected")).toBe("true");

    // Click tab B — callback fires
    const tabB = container.querySelector<HTMLButtonElement>(sel.tabB)!;
    await fireEvent.click(tabB);
    await tick();

    exp(onValueChange).toHaveBeenCalledWith("b");

    // Rerender with updated controlled value to verify external control works
    await rerender({ value: "b", onValueChange });
    await tick();

    exp(tabB.getAttribute("aria-selected")).toBe("true");
  });
});

desc("Tabs — accessibility (full fixture)", () => {
  test("fully-composed Tabs has no unexpected axe violations", async () => {
    const { container } = renderTabs({ defaultValue: "a" });
    await tick();

    const results = await axe(container, componentAxeOptions);
    exp(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @custom:end
