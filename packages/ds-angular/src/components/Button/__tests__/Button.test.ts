// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { ButtonComponent } from "../Button.component";
// @generated:end

// @generated:start tests
describe("Button — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ButtonComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    expect(fixture.componentInstance).toBeInstanceOf(ButtonComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    expect(classTokens(fixture.componentInstance)).toContain("button");
  });

  it("applies size=small variant class", () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentInstance.size = "small";
    expect(classTokens(fixture.componentInstance)).toContain("button--small");
  });

  it("applies size=medium variant class", () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentInstance.size = "medium";
    expect(classTokens(fixture.componentInstance)).toContain("button--medium");
  });

  it("applies size=large variant class", () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentInstance.size = "large";
    expect(classTokens(fixture.componentInstance)).toContain("button--large");
  });

  it("applies variant=primary variant class", () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentInstance.variant = "primary";
    expect(classTokens(fixture.componentInstance)).toContain("button--primary");
  });

  it("applies variant=secondary variant class", () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentInstance.variant = "secondary";
    expect(classTokens(fixture.componentInstance)).toContain("button--secondary");
  });

  it("applies variant=tertiary variant class", () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentInstance.variant = "tertiary";
    expect(classTokens(fixture.componentInstance)).toContain("button--tertiary");
  });

  it("applies variant=ghost variant class", () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentInstance.variant = "ghost";
    expect(classTokens(fixture.componentInstance)).toContain("button--ghost");
  });

  it("applies variant=destructive variant class", () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentInstance.variant = "destructive";
    expect(classTokens(fixture.componentInstance)).toContain("button--destructive");
  });

  it("applies variant=outline variant class", () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentInstance.variant = "outline";
    expect(classTokens(fixture.componentInstance)).toContain("button--outline");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [ButtonComponent],
  template: "<fsds-button [ariaLabel]=\"ariaLabel\"><span>content</span></fsds-button>",
})
class ButtonAxeHost {
  readonly ariaLabel = "Test Button";
}

describe("Button — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [ButtonAxeHost] });
    const fixture = TestBed.createComponent(ButtonAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".button");
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
