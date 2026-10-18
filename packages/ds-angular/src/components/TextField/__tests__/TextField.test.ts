// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { TextFieldComponent } from "../TextField.component";
// @generated:end

// @generated:start tests
describe("TextField — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TextFieldComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(TextFieldComponent);
    expect(fixture.componentInstance).toBeInstanceOf(TextFieldComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(TextFieldComponent);
    expect(classTokens(fixture.componentInstance)).toContain("text-field");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
