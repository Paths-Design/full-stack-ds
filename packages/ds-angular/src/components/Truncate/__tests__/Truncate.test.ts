// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { TruncateComponent } from "../Truncate.component";
// @generated:end

// @generated:start tests
describe("Truncate — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TruncateComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(TruncateComponent);
    expect(fixture.componentInstance).toBeInstanceOf(TruncateComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(TruncateComponent);
    expect(classTokens(fixture.componentInstance)).toContain("truncate");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
