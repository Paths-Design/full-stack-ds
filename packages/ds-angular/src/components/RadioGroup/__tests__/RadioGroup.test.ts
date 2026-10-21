// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { RadioGroupComponent } from "../RadioGroup.component";
// @generated:end

// @generated:start tests
function createFixture() {
  const fixture = TestBed.createComponent(RadioGroupComponent);
  fixture.componentInstance["name"] = "placeholder" as never;
  return fixture;
}

describe("RadioGroup — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RadioGroupComponent] });
  });

  it("creates the component", () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeInstanceOf(RadioGroupComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = createFixture();
    expect(classTokens(fixture.componentInstance)).toContain("radio-group");
  });

  it("applies orientation=vertical variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.orientation = "vertical";
    expect(classTokens(fixture.componentInstance)).toContain("radio-group--vertical");
  });

  it("applies orientation=horizontal variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.orientation = "horizontal";
    expect(classTokens(fixture.componentInstance)).toContain("radio-group--horizontal");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [RadioGroupComponent],
  template: "<fsds-radio-group [name]=\"name\" [ariaLabel]=\"ariaLabel\"></fsds-radio-group>",
})
class RadioGroupAxeHost {
  readonly name = "placeholder";
  readonly ariaLabel = "Test RadioGroup";
}

describe("RadioGroup — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [RadioGroupAxeHost] });
    const fixture = TestBed.createComponent(RadioGroupAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".radio-group");
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
