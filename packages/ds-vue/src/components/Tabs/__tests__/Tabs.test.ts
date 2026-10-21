// @generated:start imports
import { describe, it, expect } from "vitest";
import type { Component } from "vue";
import { mount } from "@vue/test-utils";
import { axe } from "vitest-axe";
import Tabs from "../Tabs.vue";
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
    const wrapper = mount(Tabs as Component, { props: {}, attrs: { "data-testid": "tabs" }, slots: { "default": "content" } });
    expect(wrapper.element).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const wrapper = mount(Tabs as Component, { props: {}, attrs: { "data-testid": "tabs" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("tabs");
  });

  it("merges custom class", () => {
    const wrapper = mount(Tabs as Component, { props: {}, attrs: { "data-testid": "tabs", "class": "custom" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("tabs");
    expect(wrapper.classes()).toContain("custom");
  });

  it("forwards data-testid to the rendered element", () => {
    const wrapper = mount(Tabs as Component, { props: {}, attrs: { "data-testid": "tabs" }, slots: { "default": "content" } });
    expect(wrapper.find('[data-testid="tabs"]').exists()).toBe(true);
  });

  it("applies orientation=horizontal variant class", () => {
    const wrapper = mount(Tabs as Component, { props: { "orientation": "horizontal" }, attrs: { "data-testid": "tabs" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("tabs--horizontal");
  });

  it("applies orientation=vertical variant class", () => {
    const wrapper = mount(Tabs as Component, { props: { "orientation": "vertical" }, attrs: { "data-testid": "tabs" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("tabs--vertical");
  });

  it("applies appearance=underline variant class", () => {
    const wrapper = mount(Tabs as Component, { props: { "appearance": "underline" }, attrs: { "data-testid": "tabs" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("tabs--underline");
  });

  it("applies appearance=pills variant class", () => {
    const wrapper = mount(Tabs as Component, { props: { "appearance": "pills" }, attrs: { "data-testid": "tabs" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("tabs--pills");
  });

  it("applies activationMode=automatic variant class", () => {
    const wrapper = mount(Tabs as Component, { props: { "activationMode": "automatic" }, attrs: { "data-testid": "tabs" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("tabs--automatic");
  });

  it("applies activationMode=manual variant class", () => {
    const wrapper = mount(Tabs as Component, { props: { "activationMode": "manual" }, attrs: { "data-testid": "tabs" }, slots: { "default": "content" } });
    expect(wrapper.classes()).toContain("tabs--manual");
  });
});

describe("Tabs — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const wrapper = mount(Tabs as Component, { props: {}, attrs: { "data-testid": "tabs", "aria-label": "Test Tabs" }, slots: { "default": "<span>content</span>" } });
    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
// CODEGEN-EMIT-LINT-HYGIENE-01: custom suites self-import their own `vi`
// (the Svelte-side convention) — the generated import set is body-derived.
import { vi } from "vitest";
import TabsList from "../TabsList.vue";
import TabsPanel from "../TabsPanel.vue";
import TabsTab from "../TabsTab.vue";
import { h, ref } from "vue";

/**
 * Mount a standard two-tab fixture using the render function (h()) API.
 *
 * Sub-component elements are selected via role + data-value attributes
 * (set on the element directly in the template, not via prop passthrough)
 * or via the id pattern `${idBase}-tab-${value}` / `${idBase}-panel-${value}`.
 *
 * Tabs root is queried via its CSS class; tabs via [role="tab"][data-value];
 * panels via [role="tabpanel"][id*="-panel-"].
 */
function mountTabs(opts: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  activationMode?: "automatic" | "manual";
  loop?: boolean;
  unmountInactive?: boolean;
} = {}) {
  const tabsProps: Record<string, unknown> = {
    defaultValue: opts.defaultValue ?? "a",
  };
  if (opts.value !== undefined) tabsProps.value = opts.value;
  if (opts.onValueChange !== undefined) tabsProps.onValueChange = opts.onValueChange;
  if (opts.activationMode !== undefined) tabsProps.activationMode = opts.activationMode;
  if (opts.loop !== undefined) tabsProps.loop = opts.loop;
  if (opts.unmountInactive !== undefined) tabsProps.unmountInactive = opts.unmountInactive;

  return mount(
    {
      render() {
        return h(Tabs as Component, tabsProps, {
          default: () => [
            h(TabsList as Component, {}, {
              default: () => [
                h(TabsTab as Component, { value: "a" }, { default: () => "Tab A" }),
                h(TabsTab as Component, { value: "b" }, { default: () => "Tab B" }),
              ],
            }),
            h(TabsPanel as Component, { value: "a" }, { default: () => "Panel A content" }),
            h(TabsPanel as Component, { value: "b" }, { default: () => "Panel B content" }),
          ],
        });
      },
    },
    { attachTo: document.body },
  );
}

/** Helpers for stable selectors that don't rely on data-testid passthrough */
const sel = {
  tabA: `[role="tab"][data-value="a"]`,
  tabB: `[role="tab"][data-value="b"]`,
  tabList: `[role="tablist"]`,
  panelA: `[role="tabpanel"][id$="-panel-a"]`,
  panelB: `[role="tabpanel"][id$="-panel-b"]`,
};

describe("Tabs — behavioral", () => {
  it("renders the active panel and hides the inactive panel by default", async () => {
    const wrapper = mountTabs({ defaultValue: "a" });
    await wrapper.vm.$nextTick();

    // Active panel content is present
    expect(wrapper.find(sel.panelA).exists()).toBe(true);
    // Inactive panel is unmounted (unmountInactive defaults to true)
    expect(wrapper.find(sel.panelB).exists()).toBe(false);

    wrapper.unmount();
  });

  it("clicking a tab activates it and swaps panels", async () => {
    const wrapper = mountTabs({ defaultValue: "a" });
    await wrapper.vm.$nextTick();

    // Initially tab A active
    expect(wrapper.find(sel.panelA).exists()).toBe(true);
    expect(wrapper.find(sel.panelB).exists()).toBe(false);

    // Click tab B
    await wrapper.find(sel.tabB).trigger("click");
    await wrapper.vm.$nextTick();

    // Panel B now rendered, panel A unmounted
    expect(wrapper.find(sel.panelB).exists()).toBe(true);
    expect(wrapper.find(sel.panelA).exists()).toBe(false);

    wrapper.unmount();
  });

  it("calls onValueChange when a tab is clicked", async () => {
    const onValueChange = vi.fn();
    const wrapper = mountTabs({ defaultValue: "a", onValueChange });
    await wrapper.vm.$nextTick();

    await wrapper.find(sel.tabB).trigger("click");
    expect(onValueChange).toHaveBeenCalledWith("b");

    wrapper.unmount();
  });

  it("aria-selected is true for active tab, false for inactive", async () => {
    const wrapper = mountTabs({ defaultValue: "a" });
    await wrapper.vm.$nextTick();

    expect(wrapper.find(sel.tabA).attributes("aria-selected")).toBe("true");
    expect(wrapper.find(sel.tabB).attributes("aria-selected")).toBe("false");

    wrapper.unmount();
  });

  it("flips aria-selected when tab is clicked", async () => {
    const wrapper = mountTabs({ defaultValue: "a" });
    await wrapper.vm.$nextTick();

    await wrapper.find(sel.tabB).trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.find(sel.tabA).attributes("aria-selected")).toBe("false");
    expect(wrapper.find(sel.tabB).attributes("aria-selected")).toBe("true");

    wrapper.unmount();
  });

  it("roving tabindex: active tab has tabindex=0, inactive has tabindex=-1", async () => {
    const wrapper = mountTabs({ defaultValue: "a" });
    await wrapper.vm.$nextTick();

    expect(wrapper.find(sel.tabA).attributes("tabindex")).toBe("0");
    expect(wrapper.find(sel.tabB).attributes("tabindex")).toBe("-1");

    wrapper.unmount();
  });

  it("tablist is programmatically focusable, out of tab order", async () => {
    const wrapper = mountTabs({ defaultValue: "a" });
    await wrapper.vm.$nextTick();

    // The tablist hosts the delegated roving keydown; its interactive role
    // demands programmatic focusability while -1 keeps it out of tab order.
    expect(wrapper.find('[role="tablist"]').attributes("tabindex")).toBe("-1");

    wrapper.unmount();
  });

  it("roving tabindex updates when active tab changes", async () => {
    const wrapper = mountTabs({ defaultValue: "a" });
    await wrapper.vm.$nextTick();

    await wrapper.find(sel.tabB).trigger("click");
    await wrapper.vm.$nextTick();

    expect(wrapper.find(sel.tabA).attributes("tabindex")).toBe("-1");
    expect(wrapper.find(sel.tabB).attributes("tabindex")).toBe("0");

    wrapper.unmount();
  });

  it("tabs have role=tab, tablist has role=tablist, panels have role=tabpanel", async () => {
    const wrapper = mountTabs({ defaultValue: "a" });
    await wrapper.vm.$nextTick();

    expect(wrapper.find(sel.tabA).attributes("role")).toBe("tab");
    expect(wrapper.find(sel.tabB).attributes("role")).toBe("tab");
    expect(wrapper.find(sel.tabList).attributes("role")).toBe("tablist");
    expect(wrapper.find(sel.panelA).attributes("role")).toBe("tabpanel");

    wrapper.unmount();
  });

  it("tab aria-controls matches panel id, panel aria-labelledby matches tab id", async () => {
    const wrapper = mountTabs({ defaultValue: "a" });
    await wrapper.vm.$nextTick();

    const tabA = wrapper.find(sel.tabA);
    const panelA = wrapper.find(sel.panelA);
    const tabId = tabA.attributes("id") ?? "";
    const panelId = panelA.attributes("id") ?? "";

    // Tab id and panel id should share a common idBase prefix
    expect(tabId).toMatch(/^tabs-\d+-tab-a$/);
    expect(panelId).toMatch(/^tabs-\d+-panel-a$/);
    // aria-controls on the tab points at the panel
    expect(tabA.attributes("aria-controls")).toBe(panelId);
    // aria-labelledby on the panel points at the tab
    expect(panelA.attributes("aria-labelledby")).toBe(tabId);

    wrapper.unmount();
  });

  it("keyboard ArrowRight moves focus to next tab and activates it (automatic mode)", async () => {
    const wrapper = mountTabs({ defaultValue: "a" });
    await wrapper.vm.$nextTick();

    // Trigger ArrowRight on the tablist element
    const list = wrapper.find(sel.tabList);
    await list.trigger("keydown", { key: "ArrowRight" });
    await wrapper.vm.$nextTick();

    // Tab B should now be active (automatic activation)
    expect(wrapper.find(sel.tabB).attributes("aria-selected")).toBe("true");

    wrapper.unmount();
  });

  it("keyboard ArrowLeft moves focus to previous tab", async () => {
    const wrapper = mountTabs({ defaultValue: "b" });
    await wrapper.vm.$nextTick();

    const list = wrapper.find(sel.tabList);
    await list.trigger("keydown", { key: "ArrowLeft" });
    await wrapper.vm.$nextTick();

    expect(wrapper.find(sel.tabA).attributes("aria-selected")).toBe("true");

    wrapper.unmount();
  });

  it("in a right-to-left page, ArrowLeft moves to the next tab and ArrowRight to the previous", async () => {
    // Without loop, a physical mapping leaves the first tab selected: ArrowLeft
    // from the first tab has no previous tab to reach.
    document.documentElement.setAttribute("dir", "rtl");
    const wrapper = mountTabs({ defaultValue: "a", loop: false });
    try {
      await wrapper.vm.$nextTick();
      const list = wrapper.find(sel.tabList);
      await list.trigger("keydown", { key: "ArrowLeft" });
      await wrapper.vm.$nextTick();
      expect(wrapper.find(sel.tabB).attributes("aria-selected")).toBe("true");
      await list.trigger("keydown", { key: "ArrowRight" });
      await wrapper.vm.$nextTick();
      expect(wrapper.find(sel.tabA).attributes("aria-selected")).toBe("true");
    } finally {
      wrapper.unmount();
      document.documentElement.removeAttribute("dir");
    }
  });

  it("keyboard Home moves focus to first tab", async () => {
    const wrapper = mountTabs({ defaultValue: "b" });
    await wrapper.vm.$nextTick();

    const list = wrapper.find(sel.tabList);
    await list.trigger("keydown", { key: "Home" });
    await wrapper.vm.$nextTick();

    expect(wrapper.find(sel.tabA).attributes("aria-selected")).toBe("true");

    wrapper.unmount();
  });

  it("keyboard End moves focus to last tab", async () => {
    const wrapper = mountTabs({ defaultValue: "a" });
    await wrapper.vm.$nextTick();

    const list = wrapper.find(sel.tabList);
    await list.trigger("keydown", { key: "End" });
    await wrapper.vm.$nextTick();

    expect(wrapper.find(sel.tabB).attributes("aria-selected")).toBe("true");

    wrapper.unmount();
  });

  it("keyboard loop: ArrowRight from last tab wraps to first", async () => {
    const wrapper = mountTabs({ defaultValue: "b", loop: true });
    await wrapper.vm.$nextTick();

    const list = wrapper.find(sel.tabList);
    await list.trigger("keydown", { key: "ArrowRight" });
    await wrapper.vm.$nextTick();

    expect(wrapper.find(sel.tabA).attributes("aria-selected")).toBe("true");

    wrapper.unmount();
  });

  it("manual activation mode: ArrowRight moves focus but does NOT activate tab", async () => {
    const wrapper = mountTabs({ defaultValue: "a", activationMode: "manual" });
    await wrapper.vm.$nextTick();

    const list = wrapper.find(sel.tabList);
    await list.trigger("keydown", { key: "ArrowRight" });
    await wrapper.vm.$nextTick();

    // Tab A is still active — ArrowRight only moved focus in manual mode
    expect(wrapper.find(sel.tabA).attributes("aria-selected")).toBe("true");
    expect(wrapper.find(sel.tabB).attributes("aria-selected")).toBe("false");

    wrapper.unmount();
  });

  it("unmountInactive=false: inactive panels render with hidden attribute", async () => {
    const wrapper = mountTabs({ defaultValue: "a", unmountInactive: false });
    await wrapper.vm.$nextTick();

    // With unmountInactive=false, both panels are in the DOM
    // Active panel-a has no hidden attribute; inactive panel-b has hidden
    // Select by class since both render
    const panels = wrapper.findAll("[role='tabpanel']");
    expect(panels.length).toBe(2);

    const activePanel = wrapper.find(`[role="tabpanel"][id$="-panel-a"]`);
    const inactivePanel = wrapper.find(`[role="tabpanel"][id$="-panel-b"]`);

    expect(activePanel.exists()).toBe(true);
    expect(inactivePanel.exists()).toBe(true);

    // Inactive panel B has hidden attribute; active A does not
    expect(inactivePanel.attributes("hidden")).toBeDefined();
    expect(activePanel.attributes("hidden")).toBeUndefined();

    wrapper.unmount();
  });

  it("controlled mode: value prop controls the active tab and update fires", async () => {
    const onValueChange = vi.fn();
    const active = ref("a");

    function handleChange(v: string) {
      onValueChange(v);
      active.value = v;
    }

    // defineComponent with setup() so TypeScript has proper typing
    const ControlledFixture = {
      setup() {
        return () => h(Tabs as Component, {
          value: active.value,
          onValueChange: handleChange,
        }, {
          default: () => [
            h(TabsList as Component, {}, {
              default: () => [
                h(TabsTab as Component, { value: "a" }, { default: () => "A" }),
                h(TabsTab as Component, { value: "b" }, { default: () => "B" }),
              ],
            }),
            h(TabsPanel as Component, { value: "a" }, { default: () => "A" }),
            h(TabsPanel as Component, { value: "b" }, { default: () => "B" }),
          ],
        });
      },
    };

    const wrapper = mount(ControlledFixture, { attachTo: document.body });
    await wrapper.vm.$nextTick();
    expect(wrapper.find(sel.tabA).attributes("aria-selected")).toBe("true");

    // Click B — handler fires and reactive value updates
    await wrapper.find(sel.tabB).trigger("click");
    await wrapper.vm.$nextTick();

    expect(onValueChange).toHaveBeenCalledWith("b");
    expect(wrapper.find(sel.tabB).attributes("aria-selected")).toBe("true");

    wrapper.unmount();
  });
});

describe("Tabs — accessibility (full fixture)", () => {
  it("fully-composed Tabs has no unexpected axe violations", async () => {
    const wrapper = mount(
      {
        render() {
          return h(Tabs as Component, { defaultValue: "a", "aria-label": "Feature tabs" }, {
            default: () => [
              h(TabsList as Component, {}, {
                default: () => [
                  h(TabsTab as Component, { value: "a" }, { default: () => "Tab A" }),
                  h(TabsTab as Component, { value: "b" }, { default: () => "Tab B" }),
                ],
              }),
              h(TabsPanel as Component, { value: "a" }, { default: () => "Content A" }),
              h(TabsPanel as Component, { value: "b" }, { default: () => "Content B" }),
            ],
          });
        },
      },
      { attachTo: document.body },
    );
    await wrapper.vm.$nextTick();

    const results = await axe(wrapper.element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);

    wrapper.unmount();
  });
});

// @custom:end
