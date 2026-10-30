// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
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

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [NavListComponent],
  template: "<fsds-nav-list [ariaLabel]=\"ariaLabel\"><li>content</li></fsds-nav-list>",
})
class NavListAxeHost {
  readonly ariaLabel = "Test NavList";
}

describe("NavList — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [NavListAxeHost] });
    const fixture = TestBed.createComponent(NavListAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".nav-list");
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
