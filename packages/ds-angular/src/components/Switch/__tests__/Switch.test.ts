// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { SwitchComponent } from "../Switch.component";
// @generated:end

// @generated:start tests
describe("Switch — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SwitchComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(SwitchComponent);
    expect(fixture.componentInstance).toBeInstanceOf(SwitchComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(SwitchComponent);
    expect(classTokens(fixture.componentInstance)).toContain("switch");
  });

  it("applies size=sm variant class", () => {
    const fixture = TestBed.createComponent(SwitchComponent);
    fixture.componentInstance.size = "sm";
    expect(classTokens(fixture.componentInstance)).toContain("switch--sm");
  });

  it("applies size=md variant class", () => {
    const fixture = TestBed.createComponent(SwitchComponent);
    fixture.componentInstance.size = "md";
    expect(classTokens(fixture.componentInstance)).toContain("switch--md");
  });

  it("applies size=lg variant class", () => {
    const fixture = TestBed.createComponent(SwitchComponent);
    fixture.componentInstance.size = "lg";
    expect(classTokens(fixture.componentInstance)).toContain("switch--lg");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [SwitchComponent],
  template: "<fsds-switch aria-label=\"Test Switch\"><span>content</span></fsds-switch>",
})
class SwitchAxeHost {}

describe("Switch — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [SwitchAxeHost] });
    const fixture = TestBed.createComponent(SwitchAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".switch");
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
