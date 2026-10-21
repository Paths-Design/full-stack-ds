/**
 * Tabs behavioral tests — Angular (Jest + TestBed)
 *
 * Coverage mirrors the React 18-test surface as closely as possible given
 * Angular's template-driven change-detection model.
 *
 * Angular controlled-mode note:
 *   The controlled pattern requires the host to propagate value changes back
 *   through `onValueChange`. The fixture below handles this by updating its
 *   own `value` property in the callback, which flows back through `[value]`.
 *   This is the correct production usage pattern.
 *
 * Organized into:
 *   1. Basic class-recipe (unit, TabsComponent alone)
 *   2. Compound integration — panel visibility, aria, click, keyboard nav
 *   3. Manual activation mode
 *   4. unmountInactive=false (hidden-attribute mode)
 *   5. Controlled mode — value input update
 */
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { Component, signal, ChangeDetectionStrategy } from "@angular/core";
import { TestBed, type ComponentFixture } from "@angular/core/testing";
import axe from "axe-core";
import { TabsComponent } from "../Tabs.component";
import { TabsListComponent } from "../TabsList.component";
import { TabsTabComponent } from "../TabsTab.component";
import { TabsPanelComponent } from "../TabsPanel.component";

// ---------------------------------------------------------------------------
// Self-managed fixture — uses controlled mode with a local signal to track
// the current active tab. onValueChange updates the local signal, which flows
// back through [value], completing the controlled round-trip.
// ---------------------------------------------------------------------------

/**
 * Fixture component uses signals for all config props so mutations flow
 * through Angular's reactive binding system. Template reads signals via
 * () so template engine tracks them as signal deps.
 */
@Component({
  selector: "test-tabs-fixture",
  standalone: true,
  imports: [TabsComponent, TabsListComponent, TabsTabComponent, TabsPanelComponent],
  template: `
    <fsds-tabs
      [value]="activeValue()"
      [orientation]="orientation()"
      [activationMode]="activationMode()"
      [loop]="loop()"
      [unmountInactive]="unmountInactive()"
      [onValueChange]="handleValueChange"
    >
      <fsds-tabs-list>
        <fsds-tabs-tab value="a">Tab A</fsds-tabs-tab>
        <fsds-tabs-tab value="b">Tab B</fsds-tabs-tab>
        <fsds-tabs-tab value="c">Tab C</fsds-tabs-tab>
      </fsds-tabs-list>
      <fsds-tabs-panel value="a">Content A</fsds-tabs-panel>
      <fsds-tabs-panel value="b">Content B</fsds-tabs-panel>
      <fsds-tabs-panel value="c">Content C</fsds-tabs-panel>
    </fsds-tabs>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TabsFixtureComponent {
  activeValue = signal<string>("a");
  orientation = signal<"horizontal" | "vertical">("horizontal");
  activationMode = signal<"automatic" | "manual">("automatic");
  loop = signal<boolean>(true);
  unmountInactive = signal<boolean>(true);
  externalOnValueChange?: (v: string) => void;

  // Arrow function preserves `this` binding when passed to [onValueChange]
  handleValueChange = (v: string): void => {
    this.activeValue.set(v);
    this.externalOnValueChange?.(v);
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTab(host: HTMLElement, value: string): HTMLButtonElement {
  const btn = host.querySelector<HTMLButtonElement>(
    `button[role="tab"][data-value="${value}"]`,
  );
  if (!btn) throw new Error(`Tab button for value="${value}" not found`);
  return btn;
}

/**
 * Find a panel whose id ends with "-panel-{value}".
 * This avoids coupling tests to the auto-generated idBase counter.
 */
function getPanel(host: HTMLElement, value: string): HTMLElement | null {
  return host.querySelector<HTMLElement>(`[role="tabpanel"][id$="-panel-${value}"]`);
}

function getList(host: HTMLElement): HTMLElement {
  const el = host.querySelector<HTMLElement>('[role="tablist"]');
  if (!el) throw new Error("tablist not found");
  return el;
}

function dispatchKey(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}

// ---------------------------------------------------------------------------
// 1. Basic class-recipe tests (unit — TabsComponent alone)
// ---------------------------------------------------------------------------

describe("Tabs — unit class recipe", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TabsComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(TabsComponent);
    expect(fixture.componentInstance).toBeInstanceOf(TabsComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(TabsComponent);
    expect(classTokens(fixture.componentInstance)).toContain("tabs");
  });

  it("applies orientation=horizontal variant class", () => {
    const fixture = TestBed.createComponent(TabsComponent);
    fixture.componentInstance.orientation = "horizontal";
    expect(classTokens(fixture.componentInstance)).toContain("tabs--horizontal");
  });

  it("applies orientation=vertical variant class", () => {
    const fixture = TestBed.createComponent(TabsComponent);
    fixture.componentInstance.orientation = "vertical";
    expect(classTokens(fixture.componentInstance)).toContain("tabs--vertical");
  });

  it("applies activationMode=automatic variant class", () => {
    const fixture = TestBed.createComponent(TabsComponent);
    fixture.componentInstance.activationMode = "automatic";
    expect(classTokens(fixture.componentInstance)).toContain("tabs--automatic");
  });

  it("applies activationMode=manual variant class", () => {
    const fixture = TestBed.createComponent(TabsComponent);
    fixture.componentInstance.activationMode = "manual";
    expect(classTokens(fixture.componentInstance)).toContain("tabs--manual");
  });
});

// ---------------------------------------------------------------------------
// 2. Compound integration tests
// ---------------------------------------------------------------------------

describe("Tabs — compound integration", () => {
  let fixture: ComponentFixture<TabsFixtureComponent>;
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TabsFixtureComponent] });
    fixture = TestBed.createComponent(TabsFixtureComponent);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  // ---- Rendering / panel visibility ----------------------------------------

  it("renders TabsList with role=tablist", () => {
    expect(getList(host)).toBeTruthy();
  });

  it("renders three tab buttons", () => {
    const tabs = host.querySelectorAll('button[role="tab"]');
    expect(tabs).toHaveLength(3);
  });

  it("active panel (a) is visible in the DOM; inactive panels are unmounted", () => {
    expect(getPanel(host, "a")).not.toBeNull();
    expect(getPanel(host, "b")).toBeNull();
    expect(getPanel(host, "c")).toBeNull();
  });

  // ---- ARIA attributes on TabsTab ------------------------------------------

  it("active tab has aria-selected=true", () => {
    expect(getTab(host, "a").getAttribute("aria-selected")).toBe("true");
  });

  it("inactive tabs have aria-selected=false", () => {
    expect(getTab(host, "b").getAttribute("aria-selected")).toBe("false");
    expect(getTab(host, "c").getAttribute("aria-selected")).toBe("false");
  });

  it("active tab has tabindex=0; inactive tabs have tabindex=-1", () => {
    expect(getTab(host, "a").getAttribute("tabindex")).toBe("0");
    expect(getTab(host, "b").getAttribute("tabindex")).toBe("-1");
  });

  it("tab id follows the pattern: idBase-tab-value", () => {
    // id should end with "-tab-a" regardless of the auto-generated base
    expect(getTab(host, "a").id).toMatch(/-tab-a$/);
  });

  it("tab aria-controls matches corresponding panel id (cross-check)", () => {
    const tabA = getTab(host, "a");
    const controls = tabA.getAttribute("aria-controls");
    expect(controls).toMatch(/-panel-a$/);
    // The panel the tab controls actually exists in the DOM
    const panel = host.querySelector(`#${controls}`);
    expect(panel).not.toBeNull();
  });

  it("tab has role=tab", () => {
    expect(getTab(host, "a").getAttribute("role")).toBe("tab");
  });

  // ---- ARIA attributes on TabsPanel ----------------------------------------

  it("visible panel has role=tabpanel", () => {
    expect(getPanel(host, "a")?.getAttribute("role")).toBe("tabpanel");
  });

  it("visible panel id follows the pattern: idBase-panel-value", () => {
    expect(getPanel(host, "a")?.id).toMatch(/-panel-a$/);
  });

  it("visible panel aria-labelledby matches corresponding tab id (cross-check)", () => {
    const panel = getPanel(host, "a");
    const labelledBy = panel?.getAttribute("aria-labelledby");
    expect(labelledBy).toMatch(/-tab-a$/);
    const tab = host.querySelector(`#${labelledBy}`);
    expect(tab).not.toBeNull();
  });

  it("visible panel has tabindex=0", () => {
    expect(getPanel(host, "a")?.getAttribute("tabindex")).toBe("0");
  });

  // ---- TabsList ARIA --------------------------------------------------------

  it("tablist has aria-orientation=horizontal by default", () => {
    expect(getList(host).getAttribute("aria-orientation")).toBe("horizontal");
  });

  it("tablist has aria-orientation=vertical when orientation=vertical", () => {
    fixture.componentInstance.orientation.set("vertical");
    fixture.detectChanges();
    expect(getList(host).getAttribute("aria-orientation")).toBe("vertical");
  });

  // ---- Click activation ----------------------------------------------------

  it("clicking tab B: panel B appears, panel A unmounts", () => {
    getTab(host, "b").click();
    fixture.detectChanges();

    expect(getPanel(host, "a")).toBeNull();
    expect(getPanel(host, "b")).not.toBeNull();
  });

  it("clicking tab B: aria-selected updates", () => {
    getTab(host, "b").click();
    fixture.detectChanges();

    expect(getTab(host, "a").getAttribute("aria-selected")).toBe("false");
    expect(getTab(host, "b").getAttribute("aria-selected")).toBe("true");
  });

  it("clicking tab B: roving tabindex updates", () => {
    getTab(host, "b").click();
    fixture.detectChanges();

    expect(getTab(host, "a").getAttribute("tabindex")).toBe("-1");
    expect(getTab(host, "b").getAttribute("tabindex")).toBe("0");
  });

  it("tablist is programmatically focusable, out of tab order", () => {
    // The tablist hosts the delegated roving keydown; its interactive role
    // demands programmatic focusability while -1 keeps it out of tab order.
    expect(getList(host).getAttribute("tabindex")).toBe("-1");
  });

  it("onValueChange fires with the clicked tab value", () => {
    const spy = jest.fn();
    fixture.componentInstance.externalOnValueChange = spy as (v: string) => void;
    fixture.detectChanges();

    getTab(host, "b").click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith("b");
  });

  // ---- Keyboard navigation — horizontal (automatic mode) -------------------

  it("ArrowRight activates next tab in automatic mode", () => {
    dispatchKey(getList(host), "ArrowRight");
    fixture.detectChanges();

    expect(getTab(host, "b").getAttribute("aria-selected")).toBe("true");
    expect(getPanel(host, "b")).not.toBeNull();
  });

  it("ArrowLeft from B goes back to A", () => {
    getTab(host, "b").click();
    fixture.detectChanges();

    dispatchKey(getList(host), "ArrowLeft");
    fixture.detectChanges();

    expect(getTab(host, "a").getAttribute("aria-selected")).toBe("true");
  });

  it("in a right-to-left page, ArrowLeft moves to the next tab and ArrowRight to the previous", () => {
    // A physical mapping sends ArrowLeft from A to C, wrapping to the previous tab.
    document.documentElement.setAttribute("dir", "rtl");
    try {
      dispatchKey(getList(host), "ArrowLeft");
      fixture.detectChanges();
      expect(getTab(host, "b").getAttribute("aria-selected")).toBe("true");
      dispatchKey(getList(host), "ArrowRight");
      fixture.detectChanges();
      expect(getTab(host, "a").getAttribute("aria-selected")).toBe("true");
    } finally {
      document.documentElement.removeAttribute("dir");
    }
  });

  it("Home key activates first tab", () => {
    getTab(host, "c").click();
    fixture.detectChanges();

    dispatchKey(getList(host), "Home");
    fixture.detectChanges();

    expect(getTab(host, "a").getAttribute("aria-selected")).toBe("true");
  });

  it("End key activates last tab", () => {
    dispatchKey(getList(host), "End");
    fixture.detectChanges();

    expect(getTab(host, "c").getAttribute("aria-selected")).toBe("true");
  });

  it("ArrowRight wraps from last tab to first when loop=true", () => {
    getTab(host, "c").click();
    fixture.detectChanges();

    dispatchKey(getList(host), "ArrowRight");
    fixture.detectChanges();

    expect(getTab(host, "a").getAttribute("aria-selected")).toBe("true");
  });

  it("ArrowLeft wraps from first tab to last when loop=true", () => {
    dispatchKey(getList(host), "ArrowLeft");
    fixture.detectChanges();

    expect(getTab(host, "c").getAttribute("aria-selected")).toBe("true");
  });
});

// ---------------------------------------------------------------------------
// 3. Manual activation mode
// ---------------------------------------------------------------------------

describe("Tabs — manual activation mode", () => {
  let fixture: ComponentFixture<TabsFixtureComponent>;
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TabsFixtureComponent] });
    fixture = TestBed.createComponent(TabsFixtureComponent);
    fixture.componentInstance.activationMode.set("manual");
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it("ArrowRight in manual mode does not activate B (only moves focus)", () => {
    dispatchKey(getList(host), "ArrowRight");
    fixture.detectChanges();

    // A is still active — manual mode requires Enter/Space to activate
    expect(getTab(host, "a").getAttribute("aria-selected")).toBe("true");
    expect(getTab(host, "b").getAttribute("aria-selected")).toBe("false");
    expect(getPanel(host, "a")).not.toBeNull();
    expect(getPanel(host, "b")).toBeNull();
  });

  it("repeated arrows move on from the focused tab while the selection stays", () => {
    fixture.componentInstance.loop.set(false);
    fixture.detectChanges();
    document.documentElement.setAttribute("dir", "rtl");
    try {
      const press = (key: string) => {
        dispatchKey(document.activeElement as HTMLElement, key);
        fixture.detectChanges();
      };
      getTab(host, "a").focus();
      press("ArrowLeft");
      press("ArrowLeft");
      expect(document.activeElement).toBe(getTab(host, "c"));
      expect(getTab(host, "a").getAttribute("aria-selected")).toBe("true");
      press("ArrowRight");
      expect(document.activeElement).toBe(getTab(host, "b"));
    } finally {
      document.documentElement.removeAttribute("dir");
    }
  });
});

// ---------------------------------------------------------------------------
// 4. unmountInactive=false (hidden attribute mode)
// ---------------------------------------------------------------------------

describe("Tabs — unmountInactive=false", () => {
  let fixture: ComponentFixture<TabsFixtureComponent>;
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TabsFixtureComponent] });
    fixture = TestBed.createComponent(TabsFixtureComponent);
    fixture.componentInstance.unmountInactive.set(false);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it("all three panels are in the DOM", () => {
    expect(getPanel(host, "a")).not.toBeNull();
    expect(getPanel(host, "b")).not.toBeNull();
    expect(getPanel(host, "c")).not.toBeNull();
  });

  it("inactive panels have hidden attribute", () => {
    expect(getPanel(host, "b")?.hasAttribute("hidden")).toBe(true);
    expect(getPanel(host, "c")?.hasAttribute("hidden")).toBe(true);
  });

  it("active panel (a) does not have hidden attribute", () => {
    const panelA = getPanel(host, "a");
    // Angular renders [attr.hidden]="null" as no attribute at all
    expect(panelA?.getAttribute("hidden")).toBeNull();
  });

  it("clicking tab B: B becomes visible (no hidden), A gets hidden", () => {
    getTab(host, "b").click();
    fixture.detectChanges();

    expect(getPanel(host, "a")?.hasAttribute("hidden")).toBe(true);
    expect(getPanel(host, "b")?.getAttribute("hidden")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. Controlled mode — value input update
// ---------------------------------------------------------------------------

describe("Tabs — controlled mode", () => {
  let fixture: ComponentFixture<TabsFixtureComponent>;
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TabsFixtureComponent] });
    fixture = TestBed.createComponent(TabsFixtureComponent);
    fixture.componentInstance.activeValue.set("b"); // start on B
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it("initial controlled value B is reflected as active", () => {
    expect(getTab(host, "b").getAttribute("aria-selected")).toBe("true");
    expect(getTab(host, "a").getAttribute("aria-selected")).toBe("false");
  });

  it("changing value signal to C switches the active tab", () => {
    fixture.componentInstance.activeValue.set("c");
    fixture.detectChanges();

    expect(getTab(host, "c").getAttribute("aria-selected")).toBe("true");
    expect(getPanel(host, "c")).not.toBeNull();
    expect(getPanel(host, "b")).toBeNull();
  });
});

// The generated scan renders the Tabs root alone; the tablist, tabs and
// panels exist only in a composition.
describe("Tabs — accessibility (composed)", () => {
  it("a composed Tabs has no unexpected axe violations", async () => {
    TestBed.configureTestingModule({ imports: [TabsFixtureComponent] });
    const fixture = TestBed.createComponent(TabsFixtureComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(getList(host).querySelectorAll('[role="tab"]')).toHaveLength(3);
    expect(getPanel(host, "a")).not.toBeNull();
    // `region` asks a page question; a component under test cannot answer it.
    const results = await axe.run(host, { rules: { region: { enabled: false } } });
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
