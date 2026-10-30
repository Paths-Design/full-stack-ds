// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { BadgeComponent } from "../Badge.component";
// @generated:end

// @generated:start tests
describe("Badge — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BadgeComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(BadgeComponent);
    expect(fixture.componentInstance).toBeInstanceOf(BadgeComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(BadgeComponent);
    expect(classTokens(fixture.componentInstance)).toContain("badge");
  });

  it("applies variant=default variant class", () => {
    const fixture = TestBed.createComponent(BadgeComponent);
    fixture.componentInstance.variant = "default";
    expect(classTokens(fixture.componentInstance)).toContain("badge--default");
  });

  it("applies variant=status variant class", () => {
    const fixture = TestBed.createComponent(BadgeComponent);
    fixture.componentInstance.variant = "status";
    expect(classTokens(fixture.componentInstance)).toContain("badge--status");
  });

  it("applies variant=counter variant class", () => {
    const fixture = TestBed.createComponent(BadgeComponent);
    fixture.componentInstance.variant = "counter";
    expect(classTokens(fixture.componentInstance)).toContain("badge--counter");
  });

  it("applies variant=tag variant class", () => {
    const fixture = TestBed.createComponent(BadgeComponent);
    fixture.componentInstance.variant = "tag";
    expect(classTokens(fixture.componentInstance)).toContain("badge--tag");
  });

  it("applies intent=info variant class", () => {
    const fixture = TestBed.createComponent(BadgeComponent);
    fixture.componentInstance.intent = "info";
    expect(classTokens(fixture.componentInstance)).toContain("badge--info");
  });

  it("applies intent=success variant class", () => {
    const fixture = TestBed.createComponent(BadgeComponent);
    fixture.componentInstance.intent = "success";
    expect(classTokens(fixture.componentInstance)).toContain("badge--success");
  });

  it("applies intent=warning variant class", () => {
    const fixture = TestBed.createComponent(BadgeComponent);
    fixture.componentInstance.intent = "warning";
    expect(classTokens(fixture.componentInstance)).toContain("badge--warning");
  });

  it("applies intent=danger variant class", () => {
    const fixture = TestBed.createComponent(BadgeComponent);
    fixture.componentInstance.intent = "danger";
    expect(classTokens(fixture.componentInstance)).toContain("badge--danger");
  });

  it("applies size=sm variant class", () => {
    const fixture = TestBed.createComponent(BadgeComponent);
    fixture.componentInstance.size = "sm";
    expect(classTokens(fixture.componentInstance)).toContain("badge--sm");
  });

  it("applies size=md variant class", () => {
    const fixture = TestBed.createComponent(BadgeComponent);
    fixture.componentInstance.size = "md";
    expect(classTokens(fixture.componentInstance)).toContain("badge--md");
  });

  it("applies size=lg variant class", () => {
    const fixture = TestBed.createComponent(BadgeComponent);
    fixture.componentInstance.size = "lg";
    expect(classTokens(fixture.componentInstance)).toContain("badge--lg");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [BadgeComponent],
  template: "<fsds-badge><span>content</span></fsds-badge>",
})
class BadgeAxeHost {}

describe("Badge — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [BadgeAxeHost] });
    const fixture = TestBed.createComponent(BadgeAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".badge");
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
