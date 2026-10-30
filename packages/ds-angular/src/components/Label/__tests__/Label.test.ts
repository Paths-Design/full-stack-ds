// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { LabelComponent } from "../Label.component";
// @generated:end

// @generated:start tests
describe("Label — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LabelComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(LabelComponent);
    expect(fixture.componentInstance).toBeInstanceOf(LabelComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(LabelComponent);
    expect(classTokens(fixture.componentInstance)).toContain("label");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [LabelComponent],
  template: "<fsds-label><span>content</span></fsds-label>",
})
class LabelAxeHost {}

describe("Label — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [LabelAxeHost] });
    const fixture = TestBed.createComponent(LabelAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".label");
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
