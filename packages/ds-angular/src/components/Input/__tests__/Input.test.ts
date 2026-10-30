// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { InputComponent } from "../Input.component";
// @generated:end

// @generated:start tests
describe("Input — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InputComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(InputComponent);
    expect(fixture.componentInstance).toBeInstanceOf(InputComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(InputComponent);
    expect(classTokens(fixture.componentInstance)).toContain("input");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [InputComponent],
  template: "<fsds-input [ariaLabel]=\"ariaLabel\"></fsds-input>",
})
class InputAxeHost {
  readonly ariaLabel = "Test Input";
}

describe("Input — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [InputAxeHost] });
    const fixture = TestBed.createComponent(InputAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".input");
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
