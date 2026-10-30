// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { ToggleSwitchComponent } from "../ToggleSwitch.component";
// @generated:end

// @generated:start tests
describe("ToggleSwitch — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ToggleSwitchComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(ToggleSwitchComponent);
    expect(fixture.componentInstance).toBeInstanceOf(ToggleSwitchComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(ToggleSwitchComponent);
    expect(classTokens(fixture.componentInstance)).toContain("toggle-switch");
  });

  it("toggles the checked channel from the root click", () => {
    const fixture = TestBed.createComponent(ToggleSwitchComponent);
    const seen: boolean[] = [];
    fixture.componentInstance.onChange = (v: boolean) => seen.push(v);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector(".toggle-switch") as HTMLElement;
    host.click();
    expect(seen).toEqual([true]);
  });

  it("applies size=small variant class", () => {
    const fixture = TestBed.createComponent(ToggleSwitchComponent);
    fixture.componentInstance.size = "small";
    expect(classTokens(fixture.componentInstance)).toContain("toggle-switch--small");
  });

  it("applies size=medium variant class", () => {
    const fixture = TestBed.createComponent(ToggleSwitchComponent);
    fixture.componentInstance.size = "medium";
    expect(classTokens(fixture.componentInstance)).toContain("toggle-switch--medium");
  });

  it("applies size=large variant class", () => {
    const fixture = TestBed.createComponent(ToggleSwitchComponent);
    fixture.componentInstance.size = "large";
    expect(classTokens(fixture.componentInstance)).toContain("toggle-switch--large");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [ToggleSwitchComponent],
  template: "<fsds-toggle-switch [ariaLabel]=\"ariaLabel\"></fsds-toggle-switch>",
})
class ToggleSwitchAxeHost {
  readonly ariaLabel = "Test ToggleSwitch";
}

describe("ToggleSwitch — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [ToggleSwitchAxeHost] });
    const fixture = TestBed.createComponent(ToggleSwitchAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".toggle-switch");
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
