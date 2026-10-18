// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
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

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
