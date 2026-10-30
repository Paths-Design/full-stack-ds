// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
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

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [StatComponent],
  template: "<fsds-stat><span>content</span></fsds-stat>",
})
class StatAxeHost {}

describe("Stat — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [StatAxeHost] });
    const fixture = TestBed.createComponent(StatAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".stat");
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
