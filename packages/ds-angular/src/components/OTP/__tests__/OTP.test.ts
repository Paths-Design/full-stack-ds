// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
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

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
