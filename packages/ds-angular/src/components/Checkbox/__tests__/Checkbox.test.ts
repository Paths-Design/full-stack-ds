// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { CheckboxComponent } from "../Checkbox.component";
// @generated:end

// @generated:start tests
describe("Checkbox — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CheckboxComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(CheckboxComponent);
    expect(fixture.componentInstance).toBeInstanceOf(CheckboxComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(CheckboxComponent);
    expect(classTokens(fixture.componentInstance)).toContain("checkbox");
  });

  it("applies size=sm variant class", () => {
    const fixture = TestBed.createComponent(CheckboxComponent);
    fixture.componentInstance.size = "sm";
    expect(classTokens(fixture.componentInstance)).toContain("checkbox--sm");
  });

  it("applies size=md variant class", () => {
    const fixture = TestBed.createComponent(CheckboxComponent);
    fixture.componentInstance.size = "md";
    expect(classTokens(fixture.componentInstance)).toContain("checkbox--md");
  });

  it("applies size=lg variant class", () => {
    const fixture = TestBed.createComponent(CheckboxComponent);
    fixture.componentInstance.size = "lg";
    expect(classTokens(fixture.componentInstance)).toContain("checkbox--lg");
  });

  it("sets .indeterminate as a DOM property (not an attribute) and lowers aria-checked to mixed", () => {
    const fixture = TestBed.createComponent(CheckboxComponent);
    fixture.componentInstance.indeterminate = true;
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector("input") as HTMLInputElement;
    expect(el.indeterminate).toBe(true);
    expect(el.getAttribute("aria-checked")).toBe("mixed");
  });

  it("re-applies .indeterminate when the input changes from true to false, and aria-checked reflects checked state again", () => {
    const fixture = TestBed.createComponent(CheckboxComponent);
    fixture.componentRef.setInput("indeterminate", true);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector("input") as HTMLInputElement;
    expect(el.indeterminate).toBe(true);
    fixture.componentRef.setInput("indeterminate", false);
    fixture.detectChanges();
    expect(el.indeterminate).toBe(false);
    expect(el.getAttribute("aria-checked")).toBe("false");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [CheckboxComponent],
  template: "<fsds-checkbox [ariaLabel]=\"ariaLabel\"></fsds-checkbox>",
})
class CheckboxAxeHost {
  readonly ariaLabel = "Test Checkbox";
}

describe("Checkbox — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [CheckboxAxeHost] });
    const fixture = TestBed.createComponent(CheckboxAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".checkbox");
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
