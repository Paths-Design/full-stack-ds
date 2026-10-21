// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
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

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [WalkthroughComponent],
  template: "<div id=\"step-1\"></div><fsds-walkthrough><span slot=\"title\">Test Walkthrough title</span><span slot=\"description\">Test Walkthrough description</span></fsds-walkthrough>",
})
class WalkthroughAxeHost {}

describe("Walkthrough — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [WalkthroughAxeHost] });
    const fixture = TestBed.createComponent(WalkthroughAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = document.body.querySelector<HTMLElement>(".walkthrough");
    expect(root).not.toBeNull();
    const results = await axe.run(root as HTMLElement, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
