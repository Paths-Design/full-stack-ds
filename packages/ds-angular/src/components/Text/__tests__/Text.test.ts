// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { TextComponent } from "../Text.component";
// @generated:end

// @generated:start tests
describe("Text — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TextComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(TextComponent);
    expect(fixture.componentInstance).toBeInstanceOf(TextComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    expect(classTokens(fixture.componentInstance)).toContain("text");
  });

  it("applies variant=display variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.variant = "display";
    expect(classTokens(fixture.componentInstance)).toContain("text--display");
  });

  it("applies variant=headline variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.variant = "headline";
    expect(classTokens(fixture.componentInstance)).toContain("text--headline");
  });

  it("applies variant=title variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.variant = "title";
    expect(classTokens(fixture.componentInstance)).toContain("text--title");
  });

  it("applies variant=body variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.variant = "body";
    expect(classTokens(fixture.componentInstance)).toContain("text--body");
  });

  it("applies variant=caption variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.variant = "caption";
    expect(classTokens(fixture.componentInstance)).toContain("text--caption");
  });

  it("applies variant=overline variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.variant = "overline";
    expect(classTokens(fixture.componentInstance)).toContain("text--overline");
  });

  it("applies variant=code variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.variant = "code";
    expect(classTokens(fixture.componentInstance)).toContain("text--code");
  });

  it("applies size=xs variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.size = "xs";
    expect(classTokens(fixture.componentInstance)).toContain("text--xs");
  });

  it("applies size=sm variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.size = "sm";
    expect(classTokens(fixture.componentInstance)).toContain("text--sm");
  });

  it("applies size=md variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.size = "md";
    expect(classTokens(fixture.componentInstance)).toContain("text--md");
  });

  it("applies size=lg variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.size = "lg";
    expect(classTokens(fixture.componentInstance)).toContain("text--lg");
  });

  it("applies size=xl variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.size = "xl";
    expect(classTokens(fixture.componentInstance)).toContain("text--xl");
  });

  it("applies size=2xl variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.size = "2xl";
    expect(classTokens(fixture.componentInstance)).toContain("text--2xl");
  });

  it("applies size=3xl variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.size = "3xl";
    expect(classTokens(fixture.componentInstance)).toContain("text--3xl");
  });

  it("applies weight=light variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.weight = "light";
    expect(classTokens(fixture.componentInstance)).toContain("text--light");
  });

  it("applies weight=normal variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.weight = "normal";
    expect(classTokens(fixture.componentInstance)).toContain("text--normal");
  });

  it("applies weight=medium variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.weight = "medium";
    expect(classTokens(fixture.componentInstance)).toContain("text--medium");
  });

  it("applies weight=semibold variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.weight = "semibold";
    expect(classTokens(fixture.componentInstance)).toContain("text--semibold");
  });

  it("applies weight=bold variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.weight = "bold";
    expect(classTokens(fixture.componentInstance)).toContain("text--bold");
  });

  it("applies align=left variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.align = "left";
    expect(classTokens(fixture.componentInstance)).toContain("text--left");
  });

  it("applies align=center variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.align = "center";
    expect(classTokens(fixture.componentInstance)).toContain("text--center");
  });

  it("applies align=right variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.align = "right";
    expect(classTokens(fixture.componentInstance)).toContain("text--right");
  });

  it("applies align=justify variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.align = "justify";
    expect(classTokens(fixture.componentInstance)).toContain("text--justify");
  });

  it("applies transform=none variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.transform = "none";
    expect(classTokens(fixture.componentInstance)).toContain("text--none");
  });

  it("applies transform=uppercase variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.transform = "uppercase";
    expect(classTokens(fixture.componentInstance)).toContain("text--uppercase");
  });

  it("applies transform=lowercase variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.transform = "lowercase";
    expect(classTokens(fixture.componentInstance)).toContain("text--lowercase");
  });

  it("applies transform=capitalize variant class", () => {
    const fixture = TestBed.createComponent(TextComponent);
    fixture.componentInstance.transform = "capitalize";
    expect(classTokens(fixture.componentInstance)).toContain("text--capitalize");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [TextComponent],
  template: "<fsds-text><span>content</span></fsds-text>",
})
class TextAxeHost {}

describe("Text — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [TextAxeHost] });
    const fixture = TestBed.createComponent(TextAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".text");
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
