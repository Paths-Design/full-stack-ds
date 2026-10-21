// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { ProgressComponent } from "../Progress.component";
// @generated:end

// @generated:start tests
describe("Progress — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ProgressComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(ProgressComponent);
    expect(fixture.componentInstance).toBeInstanceOf(ProgressComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(ProgressComponent);
    expect(classTokens(fixture.componentInstance)).toContain("progress");
  });

  it("applies variant=linear variant class", () => {
    const fixture = TestBed.createComponent(ProgressComponent);
    fixture.componentInstance.variant = "linear";
    expect(classTokens(fixture.componentInstance)).toContain("progress--linear");
  });

  it("applies variant=circular variant class", () => {
    const fixture = TestBed.createComponent(ProgressComponent);
    fixture.componentInstance.variant = "circular";
    expect(classTokens(fixture.componentInstance)).toContain("progress--circular");
  });

  it("applies size=sm variant class", () => {
    const fixture = TestBed.createComponent(ProgressComponent);
    fixture.componentInstance.size = "sm";
    expect(classTokens(fixture.componentInstance)).toContain("progress--sm");
  });

  it("applies size=md variant class", () => {
    const fixture = TestBed.createComponent(ProgressComponent);
    fixture.componentInstance.size = "md";
    expect(classTokens(fixture.componentInstance)).toContain("progress--md");
  });

  it("applies size=lg variant class", () => {
    const fixture = TestBed.createComponent(ProgressComponent);
    fixture.componentInstance.size = "lg";
    expect(classTokens(fixture.componentInstance)).toContain("progress--lg");
  });

  it("applies intent=info variant class", () => {
    const fixture = TestBed.createComponent(ProgressComponent);
    fixture.componentInstance.intent = "info";
    expect(classTokens(fixture.componentInstance)).toContain("progress--info");
  });

  it("applies intent=success variant class", () => {
    const fixture = TestBed.createComponent(ProgressComponent);
    fixture.componentInstance.intent = "success";
    expect(classTokens(fixture.componentInstance)).toContain("progress--success");
  });

  it("applies intent=warning variant class", () => {
    const fixture = TestBed.createComponent(ProgressComponent);
    fixture.componentInstance.intent = "warning";
    expect(classTokens(fixture.componentInstance)).toContain("progress--warning");
  });

  it("applies intent=danger variant class", () => {
    const fixture = TestBed.createComponent(ProgressComponent);
    fixture.componentInstance.intent = "danger";
    expect(classTokens(fixture.componentInstance)).toContain("progress--danger");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [ProgressComponent],
  template: "<fsds-progress [label]=\"label\"><span>content</span></fsds-progress>",
})
class ProgressAxeHost {
  readonly label = "Test Progress";
}

describe("Progress — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [ProgressAxeHost] });
    const fixture = TestBed.createComponent(ProgressAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".progress");
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
