// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
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

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
