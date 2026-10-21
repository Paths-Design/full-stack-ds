// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Tabs, TabsList, TabsTab, TabsPanel } from "../Tabs";

declare module "vitest" {
  interface Assertion<T> {
    // The positional T keeps this augmentation mergeable with vitest's
    // own Assertion<T = any> declaration (TS2428 fires on any rename);
    // the expected param references it so it is never an unused type param.
    toHaveNoViolations(expected?: T): void;
  }
}
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
    render(<Tabs data-testid="tabs"><span>content</span></Tabs>);
    expect(screen.getByTestId("tabs")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Tabs data-testid="tabs"><span>content</span></Tabs>);
    expect(screen.getByTestId("tabs")).toHaveClass("tabs");
  });

  it("merges custom className", () => {
    render(<Tabs data-testid="tabs" className="custom"><span>content</span></Tabs>);
    expect(screen.getByTestId("tabs")).toHaveClass("tabs", "custom");
  });

  it("applies orientation=horizontal variant class", () => {
    render(<Tabs data-testid="tabs" orientation="horizontal"><span>content</span></Tabs>);
    expect(screen.getByTestId("tabs")).toHaveClass("tabs--horizontal");
  });

  it("applies orientation=vertical variant class", () => {
    render(<Tabs data-testid="tabs" orientation="vertical"><span>content</span></Tabs>);
    expect(screen.getByTestId("tabs")).toHaveClass("tabs--vertical");
  });

  it("applies appearance=underline variant class", () => {
    render(<Tabs data-testid="tabs" appearance="underline"><span>content</span></Tabs>);
    expect(screen.getByTestId("tabs")).toHaveClass("tabs--underline");
  });

  it("applies appearance=pills variant class", () => {
    render(<Tabs data-testid="tabs" appearance="pills"><span>content</span></Tabs>);
    expect(screen.getByTestId("tabs")).toHaveClass("tabs--pills");
  });

  it("applies activationMode=automatic variant class", () => {
    render(<Tabs data-testid="tabs" activationMode="automatic"><span>content</span></Tabs>);
    expect(screen.getByTestId("tabs")).toHaveClass("tabs--automatic");
  });

  it("applies activationMode=manual variant class", () => {
    render(<Tabs data-testid="tabs" activationMode="manual"><span>content</span></Tabs>);
    expect(screen.getByTestId("tabs")).toHaveClass("tabs--manual");
  });

  it("calls onValueChange when activeTab changes", async () => {
    const onValueChangeSpy = vi.fn();
    expect(() => render(<Tabs data-testid="tabs" value={""} onValueChange={onValueChangeSpy}><span>content</span></Tabs>)).not.toThrow();
  });
});

describe("Tabs — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Tabs aria-label="Test Tabs"><span>content</span></Tabs></>);
    const component = baseElement.querySelector('[data-fsds-component="tabs"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
import userEvent from "@testing-library/user-event";

/**
 * Helper to render a standard two-tab fixture.
 * defaultValue controls which tab starts active.
 */
function renderTabs(opts: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  activationMode?: "automatic" | "manual";
  loop?: boolean;
  unmountInactive?: boolean;
} = {}) {
  return render(
    <Tabs
      defaultValue={opts.defaultValue ?? "a"}
      value={opts.value}
      onValueChange={opts.onValueChange}
      activationMode={opts.activationMode}
      loop={opts.loop}
      unmountInactive={opts.unmountInactive}
      data-testid="tabs-root"
    >
      <TabsList data-testid="tabs-list">
        <TabsTab value="a" data-testid="tab-a">Tab A</TabsTab>
        <TabsTab value="b" data-testid="tab-b">Tab B</TabsTab>
      </TabsList>
      <TabsPanel value="a" data-testid="panel-a">Panel A content</TabsPanel>
      <TabsPanel value="b" data-testid="panel-b">Panel B content</TabsPanel>
    </Tabs>,
  );
}

describe("Tabs — behavioral", () => {
  it("renders the active panel and hides the inactive panel by default", async () => {
    renderTabs({ defaultValue: "a" });
    // Active panel content is visible
    expect(screen.getByTestId("panel-a")).toBeInTheDocument();
    // Inactive panel is unmounted (unmountInactive defaults to true)
    expect(screen.queryByTestId("panel-b")).toBeNull();
  });

  it("clicking a tab activates it and swaps panels", async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: "a" });

    // Initially tab A is active
    expect(screen.getByTestId("panel-a")).toBeInTheDocument();
    expect(screen.queryByTestId("panel-b")).toBeNull();

    // Click tab B
    await user.click(screen.getByTestId("tab-b"));

    // Panel B should now be rendered, panel A gone
    expect(screen.getByTestId("panel-b")).toBeInTheDocument();
    expect(screen.queryByTestId("panel-a")).toBeNull();
  });

  it("calls onValueChange when a tab is clicked", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderTabs({ defaultValue: "a", onValueChange });

    await user.click(screen.getByTestId("tab-b"));
    expect(onValueChange).toHaveBeenCalledWith("b");
  });

  it("aria-selected is true for active tab, false for inactive", async () => {
    renderTabs({ defaultValue: "a" });
    const tabA = screen.getByTestId("tab-a");
    const tabB = screen.getByTestId("tab-b");
    expect(tabA).toHaveAttribute("aria-selected", "true");
    expect(tabB).toHaveAttribute("aria-selected", "false");
  });

  it("flips aria-selected when tab is clicked", async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: "a" });

    await user.click(screen.getByTestId("tab-b"));
    expect(screen.getByTestId("tab-a")).toHaveAttribute("aria-selected", "false");
    expect(screen.getByTestId("tab-b")).toHaveAttribute("aria-selected", "true");
  });

  it("roving tabindex: active tab has tabindex=0, inactive has tabindex=-1", async () => {
    renderTabs({ defaultValue: "a" });
    expect(screen.getByTestId("tab-a")).toHaveAttribute("tabindex", "0");
    expect(screen.getByTestId("tab-b")).toHaveAttribute("tabindex", "-1");
  });

  it("tablist is programmatically focusable, out of tab order", () => {
    renderTabs({ defaultValue: "a" });
    // The tablist hosts the delegated roving keydown; its interactive role
    // demands programmatic focusability while -1 keeps it out of tab order.
    expect(screen.getByRole("tablist")).toHaveAttribute("tabindex", "-1");
  });

  it("roving tabindex updates when active tab changes", async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: "a" });

    await user.click(screen.getByTestId("tab-b"));
    expect(screen.getByTestId("tab-a")).toHaveAttribute("tabindex", "-1");
    expect(screen.getByTestId("tab-b")).toHaveAttribute("tabindex", "0");
  });

  it("tabs have role=tab, panels have role=tabpanel", async () => {
    renderTabs({ defaultValue: "a" });
    expect(screen.getByTestId("tab-a")).toHaveAttribute("role", "tab");
    expect(screen.getByTestId("tab-b")).toHaveAttribute("role", "tab");
    // Panel A is active and visible
    expect(screen.getByTestId("panel-a")).toHaveAttribute("role", "tabpanel");
  });

  it("tab has aria-controls matching panel id, panel has aria-labelledby matching tab id", async () => {
    renderTabs({ defaultValue: "a" });
    const tabA = screen.getByTestId("tab-a");
    const panelA = screen.getByTestId("panel-a");
    const tabId = tabA.id;
    const panelId = panelA.id;

    // tab's id should match panel's aria-labelledby
    expect(panelA).toHaveAttribute("aria-labelledby", tabId);
    // tab's aria-controls should match panel's id
    expect(tabA).toHaveAttribute("aria-controls", panelId);
  });

  it("keyboard ArrowRight moves focus to next tab (automatic mode activates it)", async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: "a" });

    // Focus tab A then press ArrowRight
    const tabA = screen.getByTestId("tab-a");
    await user.click(tabA); // gives focus
    await user.keyboard("{ArrowRight}");

    // Tab B should now be active (automatic activation)
    expect(screen.getByTestId("tab-b")).toHaveAttribute("aria-selected", "true");
  });

  it("keyboard ArrowLeft moves focus to previous tab", async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: "b" });

    // Focus tab B then press ArrowLeft
    const tabB = screen.getByTestId("tab-b");
    await user.click(tabB);
    await user.keyboard("{ArrowLeft}");

    expect(screen.getByTestId("tab-a")).toHaveAttribute("aria-selected", "true");
  });

  it("in a right-to-left page, ArrowLeft moves to the next tab and ArrowRight to the previous", async () => {
    // Without loop, a physical mapping leaves the first tab selected: ArrowLeft
    // from the first tab has no previous tab to reach.
    document.documentElement.setAttribute("dir", "rtl");
    try {
      const user = userEvent.setup();
      renderTabs({ defaultValue: "a", loop: false });
      await user.click(screen.getByTestId("tab-a"));
      await user.keyboard("{ArrowLeft}");
      expect(screen.getByTestId("tab-b")).toHaveAttribute("aria-selected", "true");
      await user.keyboard("{ArrowRight}");
      expect(screen.getByTestId("tab-a")).toHaveAttribute("aria-selected", "true");
    } finally {
      document.documentElement.removeAttribute("dir");
    }
  });

  it("keyboard Home moves focus to first tab", async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: "b" });

    const tabB = screen.getByTestId("tab-b");
    await user.click(tabB);
    await user.keyboard("{Home}");

    expect(screen.getByTestId("tab-a")).toHaveAttribute("aria-selected", "true");
  });

  it("keyboard End moves focus to last tab", async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: "a" });

    const tabA = screen.getByTestId("tab-a");
    await user.click(tabA);
    await user.keyboard("{End}");

    expect(screen.getByTestId("tab-b")).toHaveAttribute("aria-selected", "true");
  });

  it("keyboard loop: ArrowRight from last tab wraps to first", async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: "b", loop: true });

    const tabB = screen.getByTestId("tab-b");
    await user.click(tabB);
    await user.keyboard("{ArrowRight}");

    expect(screen.getByTestId("tab-a")).toHaveAttribute("aria-selected", "true");
  });

  it("manual activation mode: ArrowRight moves focus but does NOT activate tab", async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: "a", activationMode: "manual" });

    const tabA = screen.getByTestId("tab-a");
    await user.click(tabA);
    await user.keyboard("{ArrowRight}");

    // Tab A is still active — ArrowRight only moved focus
    expect(screen.getByTestId("tab-a")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("tab-b")).toHaveAttribute("aria-selected", "false");
  });

  it("unmountInactive=false: inactive panels render with hidden attribute", async () => {
    renderTabs({ defaultValue: "a", unmountInactive: false });

    const panelA = screen.getByTestId("panel-a");
    const panelB = screen.getByTestId("panel-b");

    // Both panels are in DOM
    expect(panelA).toBeInTheDocument();
    expect(panelB).toBeInTheDocument();

    // Inactive panel B has hidden attribute
    expect(panelB).toHaveAttribute("hidden");
    // Active panel A does not have hidden
    expect(panelA).not.toHaveAttribute("hidden");
  });

  it("controlled mode: value prop controls the active tab", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <Tabs value="a" onValueChange={onValueChange} data-testid="tabs-root">
        <TabsList>
          <TabsTab value="a" data-testid="tab-a">A</TabsTab>
          <TabsTab value="b" data-testid="tab-b">B</TabsTab>
        </TabsList>
        <TabsPanel value="a" data-testid="panel-a">A</TabsPanel>
        <TabsPanel value="b" data-testid="panel-b">B</TabsPanel>
      </Tabs>,
    );

    expect(screen.getByTestId("tab-a")).toHaveAttribute("aria-selected", "true");

    // Click B — calls handler but doesn't update (controlled)
    await user.click(screen.getByTestId("tab-b"));
    expect(onValueChange).toHaveBeenCalledWith("b");

    // Rerender with new value
    rerender(
      <Tabs value="b" onValueChange={onValueChange} data-testid="tabs-root">
        <TabsList>
          <TabsTab value="a" data-testid="tab-a">A</TabsTab>
          <TabsTab value="b" data-testid="tab-b">B</TabsTab>
        </TabsList>
        <TabsPanel value="a" data-testid="panel-a">A</TabsPanel>
        <TabsPanel value="b" data-testid="panel-b">B</TabsPanel>
      </Tabs>,
    );
    expect(screen.getByTestId("tab-b")).toHaveAttribute("aria-selected", "true");
  });
});

describe("Tabs — accessibility (full fixture)", () => {
  it("fully-composed Tabs has no unexpected axe violations", async () => {
    const { container } = render(
      <>
        <Tabs defaultValue="a" aria-label="Feature tabs">
          <TabsList>
            <TabsTab value="a">Tab A</TabsTab>
            <TabsTab value="b">Tab B</TabsTab>
          </TabsList>
          <TabsPanel value="a">Content A</TabsPanel>
          <TabsPanel value="b">Content B</TabsPanel>
        </Tabs>
      </>,
    );
    const results = await axe(container, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @custom:end
