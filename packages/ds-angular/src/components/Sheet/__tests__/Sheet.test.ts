// @generated:start imports
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { SheetComponent } from "../Sheet.component";
// @generated:end

// @generated:start tests
describe("Sheet — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SheetComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(SheetComponent);
    expect(fixture.componentInstance).toBeInstanceOf(SheetComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(SheetComponent);
    expect(classTokens(fixture.componentInstance)).toContain("sheet");
  });

  it("applies side=top variant class", () => {
    const fixture = TestBed.createComponent(SheetComponent);
    fixture.componentInstance.side = "top";
    expect(classTokens(fixture.componentInstance)).toContain("sheet--top");
  });

  it("applies side=right variant class", () => {
    const fixture = TestBed.createComponent(SheetComponent);
    fixture.componentInstance.side = "right";
    expect(classTokens(fixture.componentInstance)).toContain("sheet--right");
  });

  it("applies side=bottom variant class", () => {
    const fixture = TestBed.createComponent(SheetComponent);
    fixture.componentInstance.side = "bottom";
    expect(classTokens(fixture.componentInstance)).toContain("sheet--bottom");
  });

  it("applies side=left variant class", () => {
    const fixture = TestBed.createComponent(SheetComponent);
    fixture.componentInstance.side = "left";
    expect(classTokens(fixture.componentInstance)).toContain("sheet--left");
  });
});

describe("Sheet — Escape dismissal", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SheetComponent] });
  });

  it("closes on Escape key", () => {
    const fixture = TestBed.createComponent(SheetComponent);
    const onOpenChangeSpy = jest.fn();
    fixture.componentInstance.open = true;
    fixture.componentInstance.onOpenChange = onOpenChangeSpy;
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });
});

describe("Sheet — overlay-click dismissal", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SheetComponent] });
  });

  it("closes on overlay click", () => {
    const fixture = TestBed.createComponent(SheetComponent);
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
  imports: [SheetComponent],
  template: "<fsds-sheet [open]=\"open\"><span slot=\"title\">Test Sheet title</span><span slot=\"description\">Test Sheet description</span><span>content</span></fsds-sheet>",
})
class SheetAxeHost {
  readonly open = true;
}

describe("Sheet — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [SheetAxeHost] });
    const fixture = TestBed.createComponent(SheetAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = document.body.querySelector<HTMLElement>(".sheet");
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

// @custom:end
