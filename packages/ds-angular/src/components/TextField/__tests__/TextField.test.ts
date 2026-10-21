// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { TextFieldComponent } from "../TextField.component";
// @generated:end

// @generated:start tests
describe("TextField — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TextFieldComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(TextFieldComponent);
    expect(fixture.componentInstance).toBeInstanceOf(TextFieldComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(TextFieldComponent);
    expect(classTokens(fixture.componentInstance)).toContain("text-field");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [TextFieldComponent],
  template: "<fsds-text-field><span slot=\"label\">Test TextField label</span><span slot=\"description\">Test TextField description</span><span slot=\"error\">Test TextField error</span></fsds-text-field>",
})
class TextFieldAxeHost {}

describe("TextField — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [TextFieldAxeHost] });
    const fixture = TestBed.createComponent(TextFieldAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".text-field");
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
