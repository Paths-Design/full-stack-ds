// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { AlertNoticeComponent } from "../AlertNotice.component";
// @generated:end

// @generated:start tests
describe("AlertNotice — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AlertNoticeComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(AlertNoticeComponent);
    expect(fixture.componentInstance).toBeInstanceOf(AlertNoticeComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(AlertNoticeComponent);
    expect(classTokens(fixture.componentInstance)).toContain("alert-notice");
  });

  it("applies status=info variant class", () => {
    const fixture = TestBed.createComponent(AlertNoticeComponent);
    fixture.componentInstance.status = "info";
    expect(classTokens(fixture.componentInstance)).toContain("alert-notice--info");
  });

  it("applies status=success variant class", () => {
    const fixture = TestBed.createComponent(AlertNoticeComponent);
    fixture.componentInstance.status = "success";
    expect(classTokens(fixture.componentInstance)).toContain("alert-notice--success");
  });

  it("applies status=warning variant class", () => {
    const fixture = TestBed.createComponent(AlertNoticeComponent);
    fixture.componentInstance.status = "warning";
    expect(classTokens(fixture.componentInstance)).toContain("alert-notice--warning");
  });

  it("applies status=error variant class", () => {
    const fixture = TestBed.createComponent(AlertNoticeComponent);
    fixture.componentInstance.status = "error";
    expect(classTokens(fixture.componentInstance)).toContain("alert-notice--error");
  });

  it("applies level=page variant class", () => {
    const fixture = TestBed.createComponent(AlertNoticeComponent);
    fixture.componentInstance.level = "page";
    expect(classTokens(fixture.componentInstance)).toContain("alert-notice--page");
  });

  it("applies level=section variant class", () => {
    const fixture = TestBed.createComponent(AlertNoticeComponent);
    fixture.componentInstance.level = "section";
    expect(classTokens(fixture.componentInstance)).toContain("alert-notice--section");
  });

  it("applies level=inline variant class", () => {
    const fixture = TestBed.createComponent(AlertNoticeComponent);
    fixture.componentInstance.level = "inline";
    expect(classTokens(fixture.componentInstance)).toContain("alert-notice--inline");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
