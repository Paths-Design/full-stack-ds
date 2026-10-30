// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { BlockquoteComponent } from "../Blockquote.component";
// @generated:end

// @generated:start tests
describe("Blockquote — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BlockquoteComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(BlockquoteComponent);
    expect(fixture.componentInstance).toBeInstanceOf(BlockquoteComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(BlockquoteComponent);
    expect(classTokens(fixture.componentInstance)).toContain("blockquote");
  });

  it("applies variant=default variant class", () => {
    const fixture = TestBed.createComponent(BlockquoteComponent);
    fixture.componentInstance.variant = "default";
    expect(classTokens(fixture.componentInstance)).toContain("blockquote--default");
  });

  it("applies variant=bordered variant class", () => {
    const fixture = TestBed.createComponent(BlockquoteComponent);
    fixture.componentInstance.variant = "bordered";
    expect(classTokens(fixture.componentInstance)).toContain("blockquote--bordered");
  });

  it("applies variant=highlighted variant class", () => {
    const fixture = TestBed.createComponent(BlockquoteComponent);
    fixture.componentInstance.variant = "highlighted";
    expect(classTokens(fixture.componentInstance)).toContain("blockquote--highlighted");
  });

  it("applies size=sm variant class", () => {
    const fixture = TestBed.createComponent(BlockquoteComponent);
    fixture.componentInstance.size = "sm";
    expect(classTokens(fixture.componentInstance)).toContain("blockquote--sm");
  });

  it("applies size=md variant class", () => {
    const fixture = TestBed.createComponent(BlockquoteComponent);
    fixture.componentInstance.size = "md";
    expect(classTokens(fixture.componentInstance)).toContain("blockquote--md");
  });

  it("applies size=lg variant class", () => {
    const fixture = TestBed.createComponent(BlockquoteComponent);
    fixture.componentInstance.size = "lg";
    expect(classTokens(fixture.componentInstance)).toContain("blockquote--lg");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [BlockquoteComponent],
  template: "<fsds-blockquote><span>content</span></fsds-blockquote>",
})
class BlockquoteAxeHost {}

describe("Blockquote — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [BlockquoteAxeHost] });
    const fixture = TestBed.createComponent(BlockquoteAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".blockquote");
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
