// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { ListComponent } from "../List.component";
// @generated:end

// @generated:start tests
describe("List — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ListComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(ListComponent);
    expect(fixture.componentInstance).toBeInstanceOf(ListComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    expect(classTokens(fixture.componentInstance)).toContain("list");
  });

  it("applies as=ul variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.as = "ul";
    expect(classTokens(fixture.componentInstance)).toContain("list--ul");
  });

  it("applies as=ol variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.as = "ol";
    expect(classTokens(fixture.componentInstance)).toContain("list--ol");
  });

  it("applies as=dl variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.as = "dl";
    expect(classTokens(fixture.componentInstance)).toContain("list--dl");
  });

  it("applies variant=default variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.variant = "default";
    expect(classTokens(fixture.componentInstance)).toContain("list--variant-default");
  });

  it("applies variant=unstyled variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.variant = "unstyled";
    expect(classTokens(fixture.componentInstance)).toContain("list--variant-unstyled");
  });

  it("applies variant=inline variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.variant = "inline";
    expect(classTokens(fixture.componentInstance)).toContain("list--variant-inline");
  });

  it("applies variant=divided variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.variant = "divided";
    expect(classTokens(fixture.componentInstance)).toContain("list--variant-divided");
  });

  it("applies variant=spaced variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.variant = "spaced";
    expect(classTokens(fixture.componentInstance)).toContain("list--variant-spaced");
  });

  it("applies marker=default variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.marker = "default";
    expect(classTokens(fixture.componentInstance)).toContain("list--marker-default");
  });

  it("applies marker=none variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.marker = "none";
    expect(classTokens(fixture.componentInstance)).toContain("list--marker-none");
  });

  it("applies marker=disc variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.marker = "disc";
    expect(classTokens(fixture.componentInstance)).toContain("list--marker-disc");
  });

  it("applies marker=circle variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.marker = "circle";
    expect(classTokens(fixture.componentInstance)).toContain("list--marker-circle");
  });

  it("applies marker=square variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.marker = "square";
    expect(classTokens(fixture.componentInstance)).toContain("list--marker-square");
  });

  it("applies marker=decimal variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.marker = "decimal";
    expect(classTokens(fixture.componentInstance)).toContain("list--marker-decimal");
  });

  it("applies marker=alpha variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.marker = "alpha";
    expect(classTokens(fixture.componentInstance)).toContain("list--marker-alpha");
  });

  it("applies marker=roman variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.marker = "roman";
    expect(classTokens(fixture.componentInstance)).toContain("list--marker-roman");
  });

  it("applies spacing=none variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.spacing = "none";
    expect(classTokens(fixture.componentInstance)).toContain("list--spacing-none");
  });

  it("applies spacing=sm variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.spacing = "sm";
    expect(classTokens(fixture.componentInstance)).toContain("list--spacing-sm");
  });

  it("applies spacing=md variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.spacing = "md";
    expect(classTokens(fixture.componentInstance)).toContain("list--spacing-md");
  });

  it("applies spacing=lg variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.spacing = "lg";
    expect(classTokens(fixture.componentInstance)).toContain("list--spacing-lg");
  });

  it("applies size=sm variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.size = "sm";
    expect(classTokens(fixture.componentInstance)).toContain("list--size-sm");
  });

  it("applies size=md variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.size = "md";
    expect(classTokens(fixture.componentInstance)).toContain("list--size-md");
  });

  it("applies size=lg variant class", () => {
    const fixture = TestBed.createComponent(ListComponent);
    fixture.componentInstance.size = "lg";
    expect(classTokens(fixture.componentInstance)).toContain("list--size-lg");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [ListComponent],
  template: "<fsds-list aria-label=\"Test List\"><li>content</li></fsds-list>",
})
class ListAxeHost {}

describe("List — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [ListAxeHost] });
    const fixture = TestBed.createComponent(ListAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".list");
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
