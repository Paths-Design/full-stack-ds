// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
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

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [CarouselComponent],
  template: "<fsds-carousel [label]=\"label\"><span>content</span></fsds-carousel>",
})
class CarouselAxeHost {
  readonly label = "Test Carousel";
}

describe("Carousel — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [CarouselAxeHost] });
    const fixture = TestBed.createComponent(CarouselAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".carousel");
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
