// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
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

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
