// @generated:start imports
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { CarouselComponent } from "../Carousel.component";
// @generated:end

// @generated:start tests
describe("Carousel — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CarouselComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(CarouselComponent);
    expect(fixture.componentInstance).toBeInstanceOf(CarouselComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(CarouselComponent);
    expect(classTokens(fixture.componentInstance)).toContain("carousel");
  });

  it("applies indicator=pagination variant class", () => {
    const fixture = TestBed.createComponent(CarouselComponent);
    fixture.componentInstance.indicator = "pagination";
    expect(classTokens(fixture.componentInstance)).toContain("carousel--pagination");
  });

  it("applies indicator=next variant class", () => {
    const fixture = TestBed.createComponent(CarouselComponent);
    fixture.componentInstance.indicator = "next";
    expect(classTokens(fixture.componentInstance)).toContain("carousel--next");
  });

  it("applies indicator=both variant class", () => {
    const fixture = TestBed.createComponent(CarouselComponent);
    fixture.componentInstance.indicator = "both";
    expect(classTokens(fixture.componentInstance)).toContain("carousel--both");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
