// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
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

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
