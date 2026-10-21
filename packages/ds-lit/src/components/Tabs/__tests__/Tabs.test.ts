// @generated:start imports
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import "../Tabs";
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
  it("renders with default props", async () => {
    const container = document.createElement("div");
    container.innerHTML = `<fsds-tabs value="a">
  <fsds-tabs-list>
    <fsds-tabs-tab value="a">A</fsds-tabs-tab>
    <fsds-tabs-tab value="b">B</fsds-tabs-tab>
  </fsds-tabs-list>
  <fsds-tabs-panel value="a">PA</fsds-tabs-panel>
  <fsds-tabs-panel value="b">PB</fsds-tabs-panel>
</fsds-tabs>`;
    document.body.append(container);
    await customElements.whenDefined("fsds-tabs");
    const el = container.querySelector("fsds-tabs")!;
    await (el as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete;
    expect(el).toBeInstanceOf(HTMLElement);
    container.remove();
  });

  it("applies orientation=horizontal variant class", async () => {
    const el = document.createElement("fsds-tabs") as HTMLElement & {
      updateComplete?: Promise<unknown>;
    };
    el.setAttribute("orientation", "horizontal");
    const container = document.createElement("div");
    container.append(el);
    document.body.append(container);
    await customElements.whenDefined("fsds-tabs");
    await el.updateComplete;
    const root = el.shadowRoot?.firstElementChild ?? el;
    const classes = (root?.className ?? "").split(/\s+/).filter(Boolean);
    expect(classes).toContain("tabs--horizontal");
    container.remove();
  });

  it("applies orientation=vertical variant class", async () => {
    const el = document.createElement("fsds-tabs") as HTMLElement & {
      updateComplete?: Promise<unknown>;
    };
    el.setAttribute("orientation", "vertical");
    const container = document.createElement("div");
    container.append(el);
    document.body.append(container);
    await customElements.whenDefined("fsds-tabs");
    await el.updateComplete;
    const root = el.shadowRoot?.firstElementChild ?? el;
    const classes = (root?.className ?? "").split(/\s+/).filter(Boolean);
    expect(classes).toContain("tabs--vertical");
    container.remove();
  });

  it("applies appearance=underline variant class", async () => {
    const el = document.createElement("fsds-tabs") as HTMLElement & {
      updateComplete?: Promise<unknown>;
    };
    el.setAttribute("appearance", "underline");
    const container = document.createElement("div");
    container.append(el);
    document.body.append(container);
    await customElements.whenDefined("fsds-tabs");
    await el.updateComplete;
    const root = el.shadowRoot?.firstElementChild ?? el;
    const classes = (root?.className ?? "").split(/\s+/).filter(Boolean);
    expect(classes).toContain("tabs--underline");
    container.remove();
  });

  it("applies appearance=pills variant class", async () => {
    const el = document.createElement("fsds-tabs") as HTMLElement & {
      updateComplete?: Promise<unknown>;
    };
    el.setAttribute("appearance", "pills");
    const container = document.createElement("div");
    container.append(el);
    document.body.append(container);
    await customElements.whenDefined("fsds-tabs");
    await el.updateComplete;
    const root = el.shadowRoot?.firstElementChild ?? el;
    const classes = (root?.className ?? "").split(/\s+/).filter(Boolean);
    expect(classes).toContain("tabs--pills");
    container.remove();
  });

  it("applies activationMode=automatic variant class", async () => {
    const el = document.createElement("fsds-tabs") as HTMLElement & {
      updateComplete?: Promise<unknown>;
    };
    el.setAttribute("activationMode", "automatic");
    const container = document.createElement("div");
    container.append(el);
    document.body.append(container);
    await customElements.whenDefined("fsds-tabs");
    await el.updateComplete;
    const root = el.shadowRoot?.firstElementChild ?? el;
    const classes = (root?.className ?? "").split(/\s+/).filter(Boolean);
    expect(classes).toContain("tabs--automatic");
    container.remove();
  });

  it("applies activationMode=manual variant class", async () => {
    const el = document.createElement("fsds-tabs") as HTMLElement & {
      updateComplete?: Promise<unknown>;
    };
    el.setAttribute("activationMode", "manual");
    const container = document.createElement("div");
    container.append(el);
    document.body.append(container);
    await customElements.whenDefined("fsds-tabs");
    await el.updateComplete;
    const root = el.shadowRoot?.firstElementChild ?? el;
    const classes = (root?.className ?? "").split(/\s+/).filter(Boolean);
    expect(classes).toContain("tabs--manual");
    container.remove();
  });
});

describe("Tabs — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    // Build elements imperatively so we can set idBase before connecting.
    const container = document.createElement("div");
    await customElements.whenDefined("fsds-tabs");
    await customElements.whenDefined("fsds-tabs-list");
    await customElements.whenDefined("fsds-tabs-tab");
    await customElements.whenDefined("fsds-tabs-panel");
    const tabsEl = document.createElement("fsds-tabs") as HTMLElement & {
      value: string;
      idBase?: string;
      updateComplete?: Promise<unknown>;
    };
    tabsEl.value = "a";
    tabsEl.idBase = "axe-test";
    const listEl = document.createElement("fsds-tabs-list");
    const tabA = document.createElement("fsds-tabs-tab") as HTMLElement & {
      value: string;
      updateComplete?: Promise<unknown>;
    };
    tabA.value = "a"; tabA.textContent = "Tab A";
    const tabB = document.createElement("fsds-tabs-tab") as HTMLElement & {
      value: string;
      updateComplete?: Promise<unknown>;
    };
    tabB.value = "b"; tabB.textContent = "Tab B";
    listEl.append(tabA, tabB);
    const panelA = document.createElement("fsds-tabs-panel") as HTMLElement & {
      value: string;
      updateComplete?: Promise<unknown>;
    };
    panelA.value = "a"; panelA.textContent = "Panel A";
    const panelB = document.createElement("fsds-tabs-panel") as HTMLElement & {
      value: string;
      updateComplete?: Promise<unknown>;
    };
    panelB.value = "b"; panelB.textContent = "Panel B";
    tabsEl.append(listEl, panelA, panelB);
    container.append(tabsEl);
    document.body.append(container);
    await tabsEl.updateComplete;
    // Allow time for microtask-deferred tab registration.
    await new Promise((r) => setTimeout(r, 0));
    // Wait for children to re-render after context is established.
    await tabA.updateComplete; await tabB.updateComplete;
    await panelA.updateComplete; await panelB.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    const results = await axe(container, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
    container.remove();
  });
});

// @generated:end

// @custom:start tests

// CODEGEN-EMIT-LINT-HYGIENE-01: typed element shape replaces `as any`
// casts throughout this hand-authored region.
type TabsElement = HTMLElement & Record<string, unknown>;

// ---------------------------------------------------------------------------
// Behavioral test helpers
// ---------------------------------------------------------------------------

interface TabsFixture {
  container: HTMLElement;
  tabsEl: HTMLElement & Record<string, unknown>;
  listEl: HTMLElement;
  tabA: HTMLElement & Record<string, unknown>;
  tabB: HTMLElement & Record<string, unknown>;
  panelA: HTMLElement & Record<string, unknown>;
  panelB: HTMLElement & Record<string, unknown>;
}

async function renderTabs(opts: {
  value?: string;
  defaultValue?: string;
  unmountInactive?: boolean;
  activationMode?: string;
  orientation?: string;
  loop?: boolean;
  idBase?: string;
} = {}): Promise<TabsFixture> {
  await customElements.whenDefined("fsds-tabs");
  await customElements.whenDefined("fsds-tabs-list");
  await customElements.whenDefined("fsds-tabs-tab");
  await customElements.whenDefined("fsds-tabs-panel");

  const tabsEl = document.createElement("fsds-tabs") as TabsElement;
  // Use defaultValue (uncontrolled) so internal state mutations
  // (from clicks/keyboard) are reflected in behavior.activeTab.
  // Pass `controlled: true` explicitly for controlled-mode tests.
  tabsEl.defaultValue = opts.defaultValue ?? opts.value ?? "a";
  if (opts.value !== undefined && (opts as typeof opts & { controlled?: boolean }).controlled === true) {
    tabsEl.value = opts.value;
  }
  tabsEl.idBase = opts.idBase ?? "test-tabs";
  if (opts.unmountInactive !== undefined) tabsEl.unmountInactive = opts.unmountInactive;
  if (opts.activationMode !== undefined) tabsEl.activationMode = opts.activationMode;
  if (opts.orientation !== undefined) tabsEl.orientation = opts.orientation;
  if (opts.loop !== undefined) tabsEl.loop = opts.loop;

  const listEl = document.createElement("fsds-tabs-list");
  const tabA = document.createElement("fsds-tabs-tab") as TabsElement;
  tabA.value = "a"; tabA.textContent = "Tab A";
  const tabB = document.createElement("fsds-tabs-tab") as TabsElement;
  tabB.value = "b"; tabB.textContent = "Tab B";
  listEl.append(tabA, tabB);

  const panelA = document.createElement("fsds-tabs-panel") as TabsElement;
  panelA.value = "a"; panelA.textContent = "Panel A";
  const panelB = document.createElement("fsds-tabs-panel") as TabsElement;
  panelB.value = "b"; panelB.textContent = "Panel B";

  // Build the tree before connecting to DOM so defaultValue is captured
  // by the behavior controller at construction time (it reads this.defaultValue
  // in the class field initializer before connectedCallback fires).
  tabsEl.append(listEl, panelA, panelB);
  const container = document.createElement("div");
  container.append(tabsEl);
  // NOTE: properties are set BEFORE document.body.append so the class field
  // initializer (behavior = new TabsBehavior(...)) picks up defaultValue.
  // LitElement is constructed lazily but before first update, so this is safe.
  document.body.append(container);

  await tabsEl.updateComplete;
  await new Promise((r) => setTimeout(r, 0)); // microtask: tab registration
  // Tab registration triggers tabsEl.requestUpdate() which re-provides context.
  await tabsEl.updateComplete;
  await (tabA as TabsElement).updateComplete;
  await (tabB as TabsElement).updateComplete;
  await (panelA as TabsElement).updateComplete;
  await (panelB as TabsElement).updateComplete;
  // Final tick to let all reactive updates settle.
  await new Promise((r) => setTimeout(r, 0));

  return { container, tabsEl, listEl, tabA, tabB, panelA, panelB };
}

async function settleUpdates(...els: HTMLElement[]): Promise<void> {
  // Run multiple settle cycles to propagate context updates through the tree.
  // Cycle 1: root update + context dispatch
  for (const el of els) await (el as TabsElement).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  // Cycle 2: children re-render after context event
  for (const el of els) await (el as TabsElement).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
}

// ---------------------------------------------------------------------------
// Behavioral tests
// ---------------------------------------------------------------------------

describe("Tabs — behavioral", () => {
  it("renders active panel and hides inactive panel (unmountInactive=true default)", async () => {
    const { container, panelA, panelB } = await renderTabs({ value: "a" });
    // Panel A is active — role="tabpanel" is set on the HOST. Shadow has inner div.
    expect(panelA.getAttribute("role")).toBe("tabpanel");
    expect(panelA.shadowRoot?.querySelector("div.tabs__panel")).not.toBeNull();
    // Panel B is inactive and unmountInactive=true — shadow should be empty (no inner div).
    expect(panelB.shadowRoot?.querySelector("div.tabs__panel")).toBeNull();
    container.remove();
  });

  it("renders all panels with hidden attribute when unmountInactive=false", async () => {
    const { container, panelA, panelB } = await renderTabs({ value: "a", unmountInactive: false });
    // Both panels should have role="tabpanel" on the host.
    expect(panelA.getAttribute("role")).toBe("tabpanel");
    expect(panelB.getAttribute("role")).toBe("tabpanel");
    // Panel B is inactive, so it should have hidden attribute on the HOST.
    expect(panelB.hasAttribute("hidden")).toBe(true);
    // Panel A is active, no hidden.
    expect(panelA.hasAttribute("hidden")).toBe(false);
    container.remove();
  });

  it("clicking tab B activates it and deactivates tab A", async () => {
    const { container, tabsEl, tabA, tabB, panelA, panelB } = await renderTabs({ value: "a" });
    tabB.click();
    await settleUpdates(tabsEl as TabsElement, tabA as TabsElement, tabB as TabsElement, panelA as TabsElement, panelB as TabsElement);

    expect(tabB.getAttribute("aria-selected")).toBe("true");
    expect(tabA.getAttribute("aria-selected")).toBe("false");
    // Panel B should now be rendered (unmountInactive=true default), panel A unmounted.
    expect(panelB.shadowRoot?.querySelector("div.tabs__panel")).not.toBeNull();
    expect(panelA.shadowRoot?.querySelector("div.tabs__panel")).toBeNull();
    container.remove();
  });

  it("fires onValueChange when tab is clicked", async () => {
    const { import: _i, ..._ } = {} as Record<string, unknown>;
    void _; void _i;
    const { container, tabsEl, tabB } = await renderTabs({ value: "a" });
    const spy = vi.fn();
    (tabsEl as TabsElement).onValueChange = spy;
    tabB.click();
    await settleUpdates(tabsEl as TabsElement);
    expect(spy).toHaveBeenCalledWith("b");
    container.remove();
  });

  it("aria-selected polarity: active tab=true, inactive tab=false", async () => {
    const { container, tabA, tabB } = await renderTabs({ value: "a" });
    expect(tabA.getAttribute("aria-selected")).toBe("true");
    expect(tabB.getAttribute("aria-selected")).toBe("false");
    container.remove();
  });

  it("flips aria-selected after click", async () => {
    const { container, tabsEl, tabA, tabB } = await renderTabs({ value: "a" });
    tabB.click();
    await settleUpdates(tabsEl as TabsElement, tabA as TabsElement, tabB as TabsElement);
    expect(tabA.getAttribute("aria-selected")).toBe("false");
    expect(tabB.getAttribute("aria-selected")).toBe("true");
    container.remove();
  });

  it("roving tabindex: active tab=0, inactive tab=-1", async () => {
    const { container, tabA, tabB } = await renderTabs({ value: "a" });
    expect(tabA.getAttribute("tabindex")).toBe("0");
    expect(tabB.getAttribute("tabindex")).toBe("-1");
    container.remove();
  });

  it("roving tabindex updates after activation", async () => {
    const { container, tabsEl, tabA, tabB } = await renderTabs({ value: "a" });
    tabB.click();
    await settleUpdates(tabsEl as TabsElement, tabA as TabsElement, tabB as TabsElement);
    expect(tabA.getAttribute("tabindex")).toBe("-1");
    expect(tabB.getAttribute("tabindex")).toBe("0");
    container.remove();
  });

  it("tabs have role=tab on host", async () => {
    const { container, tabA, tabB } = await renderTabs();
    expect(tabA.getAttribute("role")).toBe("tab");
    expect(tabB.getAttribute("role")).toBe("tab");
    container.remove();
  });

  it("panels have role=tabpanel on host", async () => {
    const { container, panelA } = await renderTabs({ unmountInactive: false });
    expect(panelA.getAttribute("role")).toBe("tabpanel");
    container.remove();
  });

  it("aria-controls on tab matches panel id", async () => {
    const { container, tabA, panelA } = await renderTabs({ value: "a", unmountInactive: false });
    const panelId = panelA.getAttribute("id")!;
    expect(tabA.getAttribute("aria-controls")).toBe(panelId);
    container.remove();
  });

  it("aria-labelledby on panel matches tab id", async () => {
    const { container, tabA, panelA } = await renderTabs({ value: "a", unmountInactive: false });
    const tabId = tabA.getAttribute("id")!;
    expect(panelA.getAttribute("aria-labelledby")).toBe(tabId);
    container.remove();
  });

  it("tablist has role=tablist", async () => {
    const { container, listEl } = await renderTabs();
    const inner = listEl.shadowRoot?.querySelector("[role='tablist']");
    expect(inner).not.toBeNull();
    container.remove();
  });

  it("tablist is programmatically focusable, out of tab order", async () => {
    const { container, listEl } = await renderTabs();
    // The tablist hosts the delegated roving keydown (connectedCallback
    // addEventListener); its interactive role demands programmatic
    // focusability while -1 keeps it out of tab order.
    const inner = listEl.shadowRoot?.querySelector("[role='tablist']");
    expect(inner?.getAttribute("tabindex")).toBe("-1");
    container.remove();
  });

  it("keyboard ArrowRight moves focus to next tab (automatic mode — also activates)", async () => {
    const { container, tabsEl, tabA, tabB } = await renderTabs({ value: "a", activationMode: "automatic" });
    // Focus the list to receive keydown.
    const listEl = tabsEl.querySelector("fsds-tabs-list")!;
    listEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }));
    await settleUpdates(tabsEl as TabsElement, tabA as TabsElement, tabB as TabsElement);
    // In automatic mode, ArrowRight should activate tab B.
    expect(tabB.getAttribute("aria-selected")).toBe("true");
    container.remove();
  });

  it("keyboard ArrowLeft moves focus to previous tab (automatic mode)", async () => {
    const { container, tabsEl, tabA, tabB } = await renderTabs({ value: "b", activationMode: "automatic" });
    const listEl = tabsEl.querySelector("fsds-tabs-list")!;
    listEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, composed: true }));
    await settleUpdates(tabsEl as TabsElement, tabA as TabsElement, tabB as TabsElement);
    expect(tabA.getAttribute("aria-selected")).toBe("true");
    container.remove();
  });

  it("in a right-to-left container, ArrowLeft moves to the next tab and ArrowRight to the previous", async () => {
    // Without loop, a physical mapping leaves the first tab selected: ArrowLeft
    // from the first tab has no previous tab to reach.
    const { container, tabsEl, tabA, tabB } = await renderTabs({ value: "a", activationMode: "automatic", loop: false });
    container.setAttribute("dir", "rtl");
    const listEl = tabsEl.querySelector("fsds-tabs-list")!;
    listEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, composed: true }));
    await settleUpdates(tabsEl as TabsElement, tabA as TabsElement, tabB as TabsElement);
    expect(tabB.getAttribute("aria-selected")).toBe("true");
    listEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }));
    await settleUpdates(tabsEl as TabsElement, tabA as TabsElement, tabB as TabsElement);
    expect(tabA.getAttribute("aria-selected")).toBe("true");
    container.remove();
  });

  it("manual activation: repeated arrows move on from the focused tab while the selection stays", async () => {
    const container = document.createElement("div");
    container.setAttribute("dir", "rtl");
    const tabsEl = Object.assign(document.createElement("fsds-tabs"), { defaultValue: "a", activationMode: "manual", loop: false }) as TabsElement;
    const listEl = document.createElement("fsds-tabs-list");
    const tabEls = ["a", "b", "c"].map((value) => {
      const tab = Object.assign(document.createElement("fsds-tabs-tab"), { value }) as TabsElement;
      tab.textContent = `Tab ${value}`;
      return tab;
    });
    listEl.append(...tabEls);
    tabsEl.append(listEl);
    container.append(tabsEl);
    document.body.append(container);
    const press = async (key: string) => {
      (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true }));
      await settleUpdates(tabsEl, ...tabEls);
    };
    await settleUpdates(tabsEl, ...tabEls);
    tabEls[0].focus();
    await press("ArrowLeft");
    await press("ArrowLeft");
    expect(document.activeElement).toBe(tabEls[2]);
    expect(tabEls[0].getAttribute("aria-selected")).toBe("true");
    await press("ArrowRight");
    expect(document.activeElement).toBe(tabEls[1]);
    container.remove();
  });

  it("keyboard Home moves to first tab", async () => {
    const { container, tabsEl, tabA, tabB } = await renderTabs({ value: "b", activationMode: "automatic" });
    const listEl = tabsEl.querySelector("fsds-tabs-list")!;
    listEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true, composed: true }));
    await settleUpdates(tabsEl as TabsElement, tabA as TabsElement, tabB as TabsElement);
    expect(tabA.getAttribute("aria-selected")).toBe("true");
    container.remove();
  });

  it("keyboard End moves to last tab", async () => {
    const { container, tabsEl, tabA, tabB } = await renderTabs({ value: "a", activationMode: "automatic" });
    const listEl = tabsEl.querySelector("fsds-tabs-list")!;
    listEl.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true, composed: true }));
    await settleUpdates(tabsEl as TabsElement, tabA as TabsElement, tabB as TabsElement);
    expect(tabB.getAttribute("aria-selected")).toBe("true");
    container.remove();
  });

  it("keyboard ArrowRight wraps from last to first with loop=true", async () => {
    const { container, tabsEl, tabA, tabB } = await renderTabs({ value: "b", activationMode: "automatic", loop: true });
    const listEl = tabsEl.querySelector("fsds-tabs-list")!;
    listEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }));
    await settleUpdates(tabsEl as TabsElement, tabA as TabsElement, tabB as TabsElement);
    expect(tabA.getAttribute("aria-selected")).toBe("true");
    container.remove();
  });

  it("keyboard ArrowRight does NOT wrap when loop=false", async () => {
    const { container, tabsEl, tabA, tabB } = await renderTabs({ value: "b", activationMode: "automatic", loop: false });
    const listEl = tabsEl.querySelector("fsds-tabs-list")!;
    listEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }));
    await settleUpdates(tabsEl as TabsElement, tabA as TabsElement, tabB as TabsElement);
    // Should stay on tab B (last tab, no wrap).
    expect(tabB.getAttribute("aria-selected")).toBe("true");
    container.remove();
  });

  it("manual mode: ArrowRight does not activate tab", async () => {
    const { container, tabsEl, tabA, tabB } = await renderTabs({ value: "a", activationMode: "manual" });
    const listEl = tabsEl.querySelector("fsds-tabs-list")!;
    listEl.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }));
    await settleUpdates(tabsEl as TabsElement, tabA as TabsElement, tabB as TabsElement);
    // Tab A should still be active (manual mode: focus moves but no activation).
    expect(tabA.getAttribute("aria-selected")).toBe("true");
    expect(tabB.getAttribute("aria-selected")).toBe("false");
    container.remove();
  });
});

import { vi } from "vitest";

// @custom:end
