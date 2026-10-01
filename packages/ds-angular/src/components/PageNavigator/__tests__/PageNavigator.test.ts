// @generated:start imports
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { PageNavigatorComponent } from "../PageNavigator.component";
// @generated:end

// @generated:start tests
describe("PageNavigator — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PageNavigatorComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(PageNavigatorComponent);
    expect(fixture.componentInstance).toBeInstanceOf(PageNavigatorComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(PageNavigatorComponent);
    expect(classTokens(fixture.componentInstance)).toContain("page-navigator");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
