// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { TruncateComponent } from "../Truncate.component";
// @generated:end

// @generated:start tests
describe("Truncate — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TruncateComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(TruncateComponent);
    expect(fixture.componentInstance).toBeInstanceOf(TruncateComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(TruncateComponent);
    expect(classTokens(fixture.componentInstance)).toContain("truncate");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [TruncateComponent],
  template: "<fsds-truncate><span>content</span></fsds-truncate>",
})
class TruncateAxeHost {}

describe("Truncate — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [TruncateAxeHost] });
    const fixture = TestBed.createComponent(TruncateAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".truncate");
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
