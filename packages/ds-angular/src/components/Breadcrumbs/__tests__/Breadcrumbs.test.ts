// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
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

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
