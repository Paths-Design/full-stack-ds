// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { WalkthroughComponent } from "../Walkthrough.component";
// @generated:end

// @generated:start tests
describe("Walkthrough — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [WalkthroughComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(WalkthroughComponent);
    expect(fixture.componentInstance).toBeInstanceOf(WalkthroughComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(WalkthroughComponent);
    expect(classTokens(fixture.componentInstance)).toContain("walkthrough");
  });

  it("applies placement=top variant class", () => {
    const fixture = TestBed.createComponent(WalkthroughComponent);
    fixture.componentInstance.placement = "top";
    expect(classTokens(fixture.componentInstance)).toContain("walkthrough--top");
  });

  it("applies placement=bottom variant class", () => {
    const fixture = TestBed.createComponent(WalkthroughComponent);
    fixture.componentInstance.placement = "bottom";
    expect(classTokens(fixture.componentInstance)).toContain("walkthrough--bottom");
  });

  it("applies placement=left variant class", () => {
    const fixture = TestBed.createComponent(WalkthroughComponent);
    fixture.componentInstance.placement = "left";
    expect(classTokens(fixture.componentInstance)).toContain("walkthrough--left");
  });

  it("applies placement=right variant class", () => {
    const fixture = TestBed.createComponent(WalkthroughComponent);
    fixture.componentInstance.placement = "right";
    expect(classTokens(fixture.componentInstance)).toContain("walkthrough--right");
  });

  it("applies placement=auto variant class", () => {
    const fixture = TestBed.createComponent(WalkthroughComponent);
    fixture.componentInstance.placement = "auto";
    expect(classTokens(fixture.componentInstance)).toContain("walkthrough--auto");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
