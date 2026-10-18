// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { AlertComponent } from "../Alert.component";
// @generated:end

// @generated:start tests
describe("Alert — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AlertComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(AlertComponent);
    expect(fixture.componentInstance).toBeInstanceOf(AlertComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(AlertComponent);
    expect(classTokens(fixture.componentInstance)).toContain("alert");
  });

  it("applies intent=info variant class", () => {
    const fixture = TestBed.createComponent(AlertComponent);
    fixture.componentInstance.intent = "info";
    expect(classTokens(fixture.componentInstance)).toContain("alert--info");
  });

  it("applies intent=success variant class", () => {
    const fixture = TestBed.createComponent(AlertComponent);
    fixture.componentInstance.intent = "success";
    expect(classTokens(fixture.componentInstance)).toContain("alert--success");
  });

  it("applies intent=warning variant class", () => {
    const fixture = TestBed.createComponent(AlertComponent);
    fixture.componentInstance.intent = "warning";
    expect(classTokens(fixture.componentInstance)).toContain("alert--warning");
  });

  it("applies intent=danger variant class", () => {
    const fixture = TestBed.createComponent(AlertComponent);
    fixture.componentInstance.intent = "danger";
    expect(classTokens(fixture.componentInstance)).toContain("alert--danger");
  });

  it("applies level=inline variant class", () => {
    const fixture = TestBed.createComponent(AlertComponent);
    fixture.componentInstance.level = "inline";
    expect(classTokens(fixture.componentInstance)).toContain("alert--inline");
  });

  it("applies level=section variant class", () => {
    const fixture = TestBed.createComponent(AlertComponent);
    fixture.componentInstance.level = "section";
    expect(classTokens(fixture.componentInstance)).toContain("alert--section");
  });

  it("applies level=page variant class", () => {
    const fixture = TestBed.createComponent(AlertComponent);
    fixture.componentInstance.level = "page";
    expect(classTokens(fixture.componentInstance)).toContain("alert--page");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
