// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { ShuttleComponent } from "../Shuttle.component";
// @generated:end

// @generated:start tests
describe("Shuttle — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ShuttleComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(ShuttleComponent);
    expect(fixture.componentInstance).toBeInstanceOf(ShuttleComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(ShuttleComponent);
    expect(classTokens(fixture.componentInstance)).toContain("shuttle");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [ShuttleComponent],
  template: "<fsds-shuttle [ariaLabel]=\"ariaLabel\"></fsds-shuttle>",
})
class ShuttleAxeHost {
  readonly ariaLabel = "Test Shuttle";
}

describe("Shuttle — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [ShuttleAxeHost] });
    const fixture = TestBed.createComponent(ShuttleAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".shuttle");
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
