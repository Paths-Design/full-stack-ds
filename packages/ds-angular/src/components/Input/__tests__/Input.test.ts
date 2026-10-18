// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { InputComponent } from "../Input.component";
// @generated:end

// @generated:start tests
describe("Input — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InputComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(InputComponent);
    expect(fixture.componentInstance).toBeInstanceOf(InputComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(InputComponent);
    expect(classTokens(fixture.componentInstance)).toContain("input");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
