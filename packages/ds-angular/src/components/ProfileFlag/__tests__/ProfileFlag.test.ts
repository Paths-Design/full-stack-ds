// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { ProfileFlagComponent } from "../ProfileFlag.component";
// @generated:end

// @generated:start tests
describe("ProfileFlag — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ProfileFlagComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(ProfileFlagComponent);
    expect(fixture.componentInstance).toBeInstanceOf(ProfileFlagComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(ProfileFlagComponent);
    expect(classTokens(fixture.componentInstance)).toContain("profile-flag");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
