// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
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

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
