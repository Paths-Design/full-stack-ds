// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { OTPComponent } from "../OTP.component";
// @generated:end

// @generated:start tests
describe("OTP — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [OTPComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(OTPComponent);
    expect(fixture.componentInstance).toBeInstanceOf(OTPComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(OTPComponent);
    expect(classTokens(fixture.componentInstance)).toContain("otp");
  });

  it("applies mode=numeric variant class", () => {
    const fixture = TestBed.createComponent(OTPComponent);
    fixture.componentInstance.mode = "numeric";
    expect(classTokens(fixture.componentInstance)).toContain("otp--numeric");
  });

  it("applies mode=alphanumeric variant class", () => {
    const fixture = TestBed.createComponent(OTPComponent);
    fixture.componentInstance.mode = "alphanumeric";
    expect(classTokens(fixture.componentInstance)).toContain("otp--alphanumeric");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [OTPComponent],
  template: "<fsds-otp [label]=\"label\"></fsds-otp>",
})
class OTPAxeHost {
  readonly label = "Test OTP";
}

describe("OTP — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [OTPAxeHost] });
    const fixture = TestBed.createComponent(OTPAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".otp");
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
