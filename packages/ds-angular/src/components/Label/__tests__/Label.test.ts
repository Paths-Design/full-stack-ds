// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
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

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
