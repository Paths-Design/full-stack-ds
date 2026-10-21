// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { BreadcrumbsComponent } from "../Breadcrumbs.component";
// @generated:end

// @generated:start tests
describe("Breadcrumbs — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BreadcrumbsComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(BreadcrumbsComponent);
    expect(fixture.componentInstance).toBeInstanceOf(BreadcrumbsComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(BreadcrumbsComponent);
    expect(classTokens(fixture.componentInstance)).toContain("breadcrumbs");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [BreadcrumbsComponent],
  template: "<fsds-breadcrumbs [ariaLabel]=\"ariaLabel\"><li>content</li></fsds-breadcrumbs>",
})
class BreadcrumbsAxeHost {
  readonly ariaLabel = "Test Breadcrumbs";
}

describe("Breadcrumbs — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [BreadcrumbsAxeHost] });
    const fixture = TestBed.createComponent(BreadcrumbsAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".breadcrumbs");
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
