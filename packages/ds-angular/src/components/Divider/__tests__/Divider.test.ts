// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { DividerComponent } from "../Divider.component";
// @generated:end

// @generated:start tests
describe("Divider — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DividerComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(DividerComponent);
    expect(fixture.componentInstance).toBeInstanceOf(DividerComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(DividerComponent);
    expect(classTokens(fixture.componentInstance)).toContain("divider");
  });

  it("applies orientation=horizontal variant class", () => {
    const fixture = TestBed.createComponent(DividerComponent);
    fixture.componentInstance.orientation = "horizontal";
    expect(classTokens(fixture.componentInstance)).toContain("divider--horizontal");
  });

  it("applies orientation=vertical variant class", () => {
    const fixture = TestBed.createComponent(DividerComponent);
    fixture.componentInstance.orientation = "vertical";
    expect(classTokens(fixture.componentInstance)).toContain("divider--vertical");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [DividerComponent],
  template: "<fsds-divider></fsds-divider>",
})
class DividerAxeHost {}

describe("Divider — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [DividerAxeHost] });
    const fixture = TestBed.createComponent(DividerAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".divider");
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
