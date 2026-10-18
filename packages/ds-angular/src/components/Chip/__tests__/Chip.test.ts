// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
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

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
