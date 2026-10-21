// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
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

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [ProfileFlagComponent],
  template: "<fsds-profile-flag><span>content</span></fsds-profile-flag>",
})
class ProfileFlagAxeHost {}

describe("ProfileFlag — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [ProfileFlagAxeHost] });
    const fixture = TestBed.createComponent(ProfileFlagAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".profile-flag");
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
