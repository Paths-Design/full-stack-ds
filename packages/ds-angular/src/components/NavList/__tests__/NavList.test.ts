// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { NavListComponent } from "../NavList.component";
// @generated:end

// @generated:start tests
describe("NavList — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NavListComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(NavListComponent);
    expect(fixture.componentInstance).toBeInstanceOf(NavListComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(NavListComponent);
    expect(classTokens(fixture.componentInstance)).toContain("nav-list");
  });

  it("applies orientation=vertical variant class", () => {
    const fixture = TestBed.createComponent(NavListComponent);
    fixture.componentInstance.orientation = "vertical";
    expect(classTokens(fixture.componentInstance)).toContain("nav-list--vertical");
  });

  it("applies orientation=horizontal variant class", () => {
    const fixture = TestBed.createComponent(NavListComponent);
    fixture.componentInstance.orientation = "horizontal";
    expect(classTokens(fixture.componentInstance)).toContain("nav-list--horizontal");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
