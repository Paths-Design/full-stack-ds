// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
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

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [LinksComponent],
  template: "<fsds-links><span>content</span></fsds-links>",
})
class LinksAxeHost {}

describe("Links — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [LinksAxeHost] });
    const fixture = TestBed.createComponent(LinksAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".links");
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
