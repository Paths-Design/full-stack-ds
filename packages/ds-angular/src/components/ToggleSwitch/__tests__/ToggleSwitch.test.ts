// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
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

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
