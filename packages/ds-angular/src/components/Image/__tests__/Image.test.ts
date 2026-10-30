// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { ImageComponent } from "../Image.component";
// @generated:end

// @generated:start tests
function createFixture() {
  const fixture = TestBed.createComponent(ImageComponent);
  fixture.componentInstance["alt"] = "placeholder" as never;
  return fixture;
}

describe("Image — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ImageComponent] });
  });

  it("creates the component", () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeInstanceOf(ImageComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = createFixture();
    expect(classTokens(fixture.componentInstance)).toContain("image");
  });

  it("applies size=xs variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.size = "xs";
    expect(classTokens(fixture.componentInstance)).toContain("image--size-xs");
  });

  it("applies size=sm variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.size = "sm";
    expect(classTokens(fixture.componentInstance)).toContain("image--size-sm");
  });

  it("applies size=md variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.size = "md";
    expect(classTokens(fixture.componentInstance)).toContain("image--size-md");
  });

  it("applies size=lg variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.size = "lg";
    expect(classTokens(fixture.componentInstance)).toContain("image--size-lg");
  });

  it("applies size=xl variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.size = "xl";
    expect(classTokens(fixture.componentInstance)).toContain("image--size-xl");
  });

  it("applies size=full variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.size = "full";
    expect(classTokens(fixture.componentInstance)).toContain("image--size-full");
  });

  it("applies radius=none variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.radius = "none";
    expect(classTokens(fixture.componentInstance)).toContain("image--radius-none");
  });

  it("applies radius=sm variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.radius = "sm";
    expect(classTokens(fixture.componentInstance)).toContain("image--radius-sm");
  });

  it("applies radius=md variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.radius = "md";
    expect(classTokens(fixture.componentInstance)).toContain("image--radius-md");
  });

  it("applies radius=lg variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.radius = "lg";
    expect(classTokens(fixture.componentInstance)).toContain("image--radius-lg");
  });

  it("applies radius=full variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.radius = "full";
    expect(classTokens(fixture.componentInstance)).toContain("image--radius-full");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [ImageComponent],
  template: "<fsds-image [alt]=\"alt\" aria-label=\"Test Image\"></fsds-image>",
})
class ImageAxeHost {
  readonly alt = "placeholder";
}

describe("Image — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [ImageAxeHost] });
    const fixture = TestBed.createComponent(ImageAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".image");
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
