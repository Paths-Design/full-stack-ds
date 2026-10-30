// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { ChipComponent } from "../Chip.component";
// @generated:end

// @generated:start tests
describe("Chip — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ChipComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(ChipComponent);
    expect(fixture.componentInstance).toBeInstanceOf(ChipComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(ChipComponent);
    expect(classTokens(fixture.componentInstance)).toContain("chip");
  });

  it("applies variant=default variant class", () => {
    const fixture = TestBed.createComponent(ChipComponent);
    fixture.componentInstance.variant = "default";
    expect(classTokens(fixture.componentInstance)).toContain("chip--default");
  });

  it("applies variant=selected variant class", () => {
    const fixture = TestBed.createComponent(ChipComponent);
    fixture.componentInstance.variant = "selected";
    expect(classTokens(fixture.componentInstance)).toContain("chip--selected");
  });

  it("applies variant=dismissible variant class", () => {
    const fixture = TestBed.createComponent(ChipComponent);
    fixture.componentInstance.variant = "dismissible";
    expect(classTokens(fixture.componentInstance)).toContain("chip--dismissible");
  });

  it("applies size=small variant class", () => {
    const fixture = TestBed.createComponent(ChipComponent);
    fixture.componentInstance.size = "small";
    expect(classTokens(fixture.componentInstance)).toContain("chip--small");
  });

  it("applies size=medium variant class", () => {
    const fixture = TestBed.createComponent(ChipComponent);
    fixture.componentInstance.size = "medium";
    expect(classTokens(fixture.componentInstance)).toContain("chip--medium");
  });

  it("applies size=large variant class", () => {
    const fixture = TestBed.createComponent(ChipComponent);
    fixture.componentInstance.size = "large";
    expect(classTokens(fixture.componentInstance)).toContain("chip--large");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [ChipComponent],
  template: "<fsds-chip aria-label=\"Test Chip\"><span>content</span></fsds-chip>",
})
class ChipAxeHost {}

describe("Chip — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [ChipAxeHost] });
    const fixture = TestBed.createComponent(ChipAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".chip");
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
