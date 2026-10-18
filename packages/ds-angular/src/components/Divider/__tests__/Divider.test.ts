// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
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

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
