// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
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

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [PageNavigatorComponent],
  template: "<fsds-page-navigator [label]=\"label\"></fsds-page-navigator>",
})
class PageNavigatorAxeHost {
  readonly label = "Test PageNavigator";
}

describe("PageNavigator — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [PageNavigatorAxeHost] });
    const fixture = TestBed.createComponent(PageNavigatorAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".page-navigator");
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
