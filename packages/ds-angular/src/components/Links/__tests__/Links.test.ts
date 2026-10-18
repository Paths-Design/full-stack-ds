// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { LinksComponent } from "../Links.component";
// @generated:end

// @generated:start tests
describe("Links — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LinksComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(LinksComponent);
    expect(fixture.componentInstance).toBeInstanceOf(LinksComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(LinksComponent);
    expect(classTokens(fixture.componentInstance)).toContain("links");
  });

  it("applies size=small variant class", () => {
    const fixture = TestBed.createComponent(LinksComponent);
    fixture.componentInstance.size = "small";
    expect(classTokens(fixture.componentInstance)).toContain("links--small");
  });

  it("applies size=medium variant class", () => {
    const fixture = TestBed.createComponent(LinksComponent);
    fixture.componentInstance.size = "medium";
    expect(classTokens(fixture.componentInstance)).toContain("links--medium");
  });

  it("applies size=large variant class", () => {
    const fixture = TestBed.createComponent(LinksComponent);
    fixture.componentInstance.size = "large";
    expect(classTokens(fixture.componentInstance)).toContain("links--large");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
