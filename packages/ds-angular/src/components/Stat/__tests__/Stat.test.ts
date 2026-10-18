// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { StatComponent } from "../Stat.component";
// @generated:end

// @generated:start tests
describe("Stat — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StatComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(StatComponent);
    expect(fixture.componentInstance).toBeInstanceOf(StatComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(StatComponent);
    expect(classTokens(fixture.componentInstance)).toContain("stat");
  });

  it("applies size=sm variant class", () => {
    const fixture = TestBed.createComponent(StatComponent);
    fixture.componentInstance.size = "sm";
    expect(classTokens(fixture.componentInstance)).toContain("stat--sm");
  });

  it("applies size=md variant class", () => {
    const fixture = TestBed.createComponent(StatComponent);
    fixture.componentInstance.size = "md";
    expect(classTokens(fixture.componentInstance)).toContain("stat--md");
  });

  it("applies size=lg variant class", () => {
    const fixture = TestBed.createComponent(StatComponent);
    fixture.componentInstance.size = "lg";
    expect(classTokens(fixture.componentInstance)).toContain("stat--lg");
  });

  it("applies trend=up variant class", () => {
    const fixture = TestBed.createComponent(StatComponent);
    fixture.componentInstance.trend = "up";
    expect(classTokens(fixture.componentInstance)).toContain("stat--up");
  });

  it("applies trend=down variant class", () => {
    const fixture = TestBed.createComponent(StatComponent);
    fixture.componentInstance.trend = "down";
    expect(classTokens(fixture.componentInstance)).toContain("stat--down");
  });

  it("applies trend=neutral variant class", () => {
    const fixture = TestBed.createComponent(StatComponent);
    fixture.componentInstance.trend = "neutral";
    expect(classTokens(fixture.componentInstance)).toContain("stat--neutral");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
