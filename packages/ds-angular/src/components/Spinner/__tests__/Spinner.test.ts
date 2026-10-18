// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { SpinnerComponent } from "../Spinner.component";
// @generated:end

// @generated:start tests
describe("Spinner — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SpinnerComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(SpinnerComponent);
    expect(fixture.componentInstance).toBeInstanceOf(SpinnerComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(SpinnerComponent);
    expect(classTokens(fixture.componentInstance)).toContain("spinner");
  });

  it("applies size=xs variant class", () => {
    const fixture = TestBed.createComponent(SpinnerComponent);
    fixture.componentInstance.size = "xs";
    expect(classTokens(fixture.componentInstance)).toContain("spinner--xs");
  });

  it("applies size=sm variant class", () => {
    const fixture = TestBed.createComponent(SpinnerComponent);
    fixture.componentInstance.size = "sm";
    expect(classTokens(fixture.componentInstance)).toContain("spinner--sm");
  });

  it("applies size=md variant class", () => {
    const fixture = TestBed.createComponent(SpinnerComponent);
    fixture.componentInstance.size = "md";
    expect(classTokens(fixture.componentInstance)).toContain("spinner--md");
  });

  it("applies size=lg variant class", () => {
    const fixture = TestBed.createComponent(SpinnerComponent);
    fixture.componentInstance.size = "lg";
    expect(classTokens(fixture.componentInstance)).toContain("spinner--lg");
  });

  it("applies thickness=hairline variant class", () => {
    const fixture = TestBed.createComponent(SpinnerComponent);
    fixture.componentInstance.thickness = "hairline";
    expect(classTokens(fixture.componentInstance)).toContain("spinner--hairline");
  });

  it("applies thickness=regular variant class", () => {
    const fixture = TestBed.createComponent(SpinnerComponent);
    fixture.componentInstance.thickness = "regular";
    expect(classTokens(fixture.componentInstance)).toContain("spinner--regular");
  });

  it("applies thickness=bold variant class", () => {
    const fixture = TestBed.createComponent(SpinnerComponent);
    fixture.componentInstance.thickness = "bold";
    expect(classTokens(fixture.componentInstance)).toContain("spinner--bold");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
