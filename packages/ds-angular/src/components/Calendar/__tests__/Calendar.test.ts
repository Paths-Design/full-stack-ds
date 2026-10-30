// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { CalendarComponent } from "../Calendar.component";
// @generated:end

// @generated:start tests
describe("Calendar — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CalendarComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(CalendarComponent);
    expect(fixture.componentInstance).toBeInstanceOf(CalendarComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(CalendarComponent);
    expect(classTokens(fixture.componentInstance)).toContain("calendar");
  });

  it("applies mode=single variant class", () => {
    const fixture = TestBed.createComponent(CalendarComponent);
    fixture.componentInstance.mode = "single";
    expect(classTokens(fixture.componentInstance)).toContain("calendar--single");
  });

  it("applies mode=range variant class", () => {
    const fixture = TestBed.createComponent(CalendarComponent);
    fixture.componentInstance.mode = "range";
    expect(classTokens(fixture.componentInstance)).toContain("calendar--range");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [CalendarComponent],
  template: "<fsds-calendar [ariaLabel]=\"ariaLabel\"></fsds-calendar>",
})
class CalendarAxeHost {
  readonly ariaLabel = "Test Calendar";
}

describe("Calendar — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [CalendarAxeHost] });
    const fixture = TestBed.createComponent(CalendarAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".calendar");
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
