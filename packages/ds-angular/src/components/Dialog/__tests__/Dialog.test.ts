// @generated:start imports
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { DialogComponent } from "../Dialog.component";
// @generated:end

// @generated:start tests
describe("Dialog — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DialogComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(DialogComponent);
    expect(fixture.componentInstance).toBeInstanceOf(DialogComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(DialogComponent);
    expect(classTokens(fixture.componentInstance)).toContain("dialog");
  });

  it("applies size=sm variant class", () => {
    const fixture = TestBed.createComponent(DialogComponent);
    fixture.componentInstance.size = "sm";
    expect(classTokens(fixture.componentInstance)).toContain("dialog--sm");
  });

  it("applies size=md variant class", () => {
    const fixture = TestBed.createComponent(DialogComponent);
    fixture.componentInstance.size = "md";
    expect(classTokens(fixture.componentInstance)).toContain("dialog--md");
  });

  it("applies size=lg variant class", () => {
    const fixture = TestBed.createComponent(DialogComponent);
    fixture.componentInstance.size = "lg";
    expect(classTokens(fixture.componentInstance)).toContain("dialog--lg");
  });

  it("applies size=xl variant class", () => {
    const fixture = TestBed.createComponent(DialogComponent);
    fixture.componentInstance.size = "xl";
    expect(classTokens(fixture.componentInstance)).toContain("dialog--xl");
  });

  it("applies size=full variant class", () => {
    const fixture = TestBed.createComponent(DialogComponent);
    fixture.componentInstance.size = "full";
    expect(classTokens(fixture.componentInstance)).toContain("dialog--full");
  });
});

describe("Dialog — Escape dismissal", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DialogComponent] });
  });

  it("closes on Escape key", () => {
    const fixture = TestBed.createComponent(DialogComponent);
    const onOpenChangeSpy = jest.fn();
    fixture.componentInstance.open = true;
    fixture.componentInstance.onOpenChange = onOpenChangeSpy;
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });
});

describe("Dialog — overlay-click dismissal", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DialogComponent] });
  });

  it("closes on overlay click", () => {
    const fixture = TestBed.createComponent(DialogComponent);
    const onOpenChangeSpy = jest.fn();
    fixture.componentInstance.open = true;
    fixture.componentInstance.onOpenChange = onOpenChangeSpy;
    fixture.detectChanges();
    const overlay = fixture.nativeElement.querySelector('[role="presentation"]') as HTMLElement;
    overlay?.click();
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [DialogComponent],
  template: "<fsds-dialog [open]=\"open\"><span slot=\"title\">Test Dialog title</span><span>content</span></fsds-dialog>",
})
class DialogAxeHost {
  readonly open = true;
}

describe("Dialog — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [DialogAxeHost] });
    const fixture = TestBed.createComponent(DialogAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = document.body.querySelector<HTMLElement>(".dialog");
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
describe("Dialog — portal (FEAT-PORTAL-MECHANISM-CROSS-FRAMEWORK-01)", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DialogComponent] });
  });

  it("relocates the host element to document.body, escaping an ancestor stacking context", () => {
    // A transform/overflow ancestor creates a stacking context that would clip
    // a merely-fixed dialog. ngOnInit moves the host element to document.body
    // so the fixed layer escapes it. Place the host inside a transform
    // ancestor first, then run change detection to fire the lifecycle hook.
    const ancestor = document.createElement("div");
    ancestor.style.transform = "translateZ(0)";
    ancestor.style.overflow = "hidden";
    document.body.append(ancestor);

    const fixture = TestBed.createComponent(DialogComponent);
    const host = fixture.nativeElement as HTMLElement;
    ancestor.append(host);
    expect(ancestor.contains(host)).toBe(true);

    // Runs ngOnInit → the portal move.
    fixture.detectChanges();

    // Load-bearing: the host's parent is now document.body, not the transform
    // ancestor that would otherwise trap the fixed overlay.
    expect(host.parentElement).toBe(document.body);
    expect(ancestor.contains(host)).toBe(false);

    fixture.destroy();
    ancestor.remove();
  });
});
// @custom:end
