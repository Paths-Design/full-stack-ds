// @generated:start imports
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { SelectComponent } from "../Select.component";
// @generated:end

// @generated:start tests
describe("Select — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SelectComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(SelectComponent);
    expect(fixture.componentInstance).toBeInstanceOf(SelectComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(SelectComponent);
    expect(classTokens(fixture.componentInstance)).toContain("select");
  });

  it("toggles the open channel from the trigger click", () => {
    const fixture = TestBed.createComponent(SelectComponent);
    const seen: boolean[] = [];
    fixture.componentInstance.onOpenChange = (v: boolean) => seen.push(v);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector(".select__trigger") as HTMLElement;
    host.click();
    expect(seen).toEqual([false]);
  });

  it("applies size=sm variant class", () => {
    const fixture = TestBed.createComponent(SelectComponent);
    fixture.componentInstance.size = "sm";
    expect(classTokens(fixture.componentInstance)).toContain("select--sm");
  });

  it("applies size=md variant class", () => {
    const fixture = TestBed.createComponent(SelectComponent);
    fixture.componentInstance.size = "md";
    expect(classTokens(fixture.componentInstance)).toContain("select--md");
  });

  it("applies size=lg variant class", () => {
    const fixture = TestBed.createComponent(SelectComponent);
    fixture.componentInstance.size = "lg";
    expect(classTokens(fixture.componentInstance)).toContain("select--lg");
  });

  it("applies position=bottom variant class", () => {
    const fixture = TestBed.createComponent(SelectComponent);
    fixture.componentInstance.position = "bottom";
    expect(classTokens(fixture.componentInstance)).toContain("select--bottom");
  });

  it("applies position=top variant class", () => {
    const fixture = TestBed.createComponent(SelectComponent);
    fixture.componentInstance.position = "top";
    expect(classTokens(fixture.componentInstance)).toContain("select--top");
  });

  it("applies position=auto variant class", () => {
    const fixture = TestBed.createComponent(SelectComponent);
    fixture.componentInstance.position = "auto";
    expect(classTokens(fixture.componentInstance)).toContain("select--auto");
  });
});

describe("Select — Escape dismissal", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SelectComponent] });
  });

  it("closes on Escape key", () => {
    const fixture = TestBed.createComponent(SelectComponent);
    const onOpenChangeSpy = jest.fn();
    fixture.componentInstance.open = true;
    fixture.componentInstance.onOpenChange = onOpenChangeSpy;
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [SelectComponent],
  template: "<fsds-select [open]=\"open\" [triggerLabel]=\"triggerLabel\"></fsds-select>",
})
class SelectAxeHost {
  readonly open = true;
  readonly triggerLabel = "Test Select";
}

describe("Select — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [SelectAxeHost] });
    const fixture = TestBed.createComponent(SelectAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".select");
    expect(root).not.toBeNull();
    const results = await axe.run(root as HTMLElement, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

describe("Select — keyboard realization (FEAT-A11Y-COMPOSITE-KEYBOARD-01)", () => {
  const pressKey = (element: Element, key: string): void => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  };
  // jsdom fires requestAnimationFrame on a ~16ms timer; the open handler
  // lands focus inside it, so the focus assertions wait past that window.
  const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 50));

  const mountOpen = (setup?: (c: SelectComponent) => void) => {
    TestBed.configureTestingModule({ imports: [SelectComponent] });
    const fixture = TestBed.createComponent(SelectComponent);
    fixture.componentInstance.defaultOpen = true;
    setup?.(fixture.componentInstance);
    fixture.detectChanges();
    return fixture;
  };

  it("ArrowDown on the closed trigger opens the panel and moves focus into the listbox", async () => {
    TestBed.configureTestingModule({ imports: [SelectComponent] });
    const fixture = TestBed.createComponent(SelectComponent);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector("button") as HTMLElement;
    pressKey(trigger, "ArrowDown");
    fixture.detectChanges();
    await settle();
    const listbox = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;
    expect(listbox).toBeTruthy();
    // Non-searchable Select: the search-input initial focus falls back to
    // the first option — focus must land inside the panel either way.
    expect(listbox.contains(document.activeElement)).toBe(true);
  });

  it("roving hosts are programmatically focusable but out of tab order", () => {
    const fixture = mountOpen();
    const listbox = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;
    expect(listbox.getAttribute("tabindex")).toBe("-1");
    for (const option of fixture.nativeElement.querySelectorAll('[role="option"]')) {
      expect((option as HTMLElement).getAttribute("tabindex")).toBe("-1");
    }
  });

  it("ArrowDown/ArrowUp on the listbox rove DOM focus through the options", async () => {
    const fixture = mountOpen();
    const listbox = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;
    const options = fixture.nativeElement.querySelectorAll('[role="option"]');
    (options[0] as HTMLElement).focus();
    pressKey(listbox, "ArrowDown");
    expect(document.activeElement).toBe(options[1]);
    pressKey(listbox, "ArrowDown");
    expect(document.activeElement).toBe(options[2]);
    pressKey(listbox, "ArrowUp");
    expect(document.activeElement).toBe(options[1]);
  });

  it("ArrowUp from the first option wraps to the last; Home/End jump to the extremes", async () => {
    const fixture = mountOpen();
    const listbox = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;
    const options = fixture.nativeElement.querySelectorAll('[role="option"]');
    (options[0] as HTMLElement).focus();
    pressKey(listbox, "ArrowUp");
    expect(document.activeElement).toBe(options[2]);
    pressKey(listbox, "Home");
    expect(document.activeElement).toBe(options[0]);
    pressKey(listbox, "End");
    expect(document.activeElement).toBe(options[2]);
  });

  it("Enter on an option commits that option's value", async () => {
    const changes: unknown[] = [];
    const fixture = mountOpen((c) => {
      c.value = "alpha";
      c.onChange = (v) => changes.push(v);
    });
    const option = fixture.nativeElement.querySelectorAll('[role="option"]')[1] as HTMLElement;
    pressKey(option, "Enter"); // Beta
    expect(changes).toEqual(["beta"]);
  });

  it("Enter adds an absent option's value in multiple mode (controlled)", async () => {
    const changes: unknown[] = [];
    const fixture = mountOpen((c) => {
      c.multiple = true;
      c.value = ["alpha"];
      c.onChange = (v) => changes.push(v);
    });
    const option = fixture.nativeElement.querySelectorAll('[role="option"]')[2] as HTMLElement;
    pressKey(option, "Enter"); // Gamma absent → add
    expect(changes).toEqual([["alpha", "gamma"]]);
  });

  it("Enter removes a present option's value in multiple mode (controlled)", async () => {
    const changes: unknown[] = [];
    const fixture = mountOpen((c) => {
      c.multiple = true;
      c.value = ["alpha", "gamma"];
      c.onChange = (v) => changes.push(v);
    });
    const option = fixture.nativeElement.querySelectorAll('[role="option"]')[0] as HTMLElement;
    pressKey(option, "Enter"); // Alpha present → remove
    expect(changes).toEqual([["gamma"]]);
  });
});

// @custom:end
