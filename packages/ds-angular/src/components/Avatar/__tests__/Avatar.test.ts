// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { AvatarComponent } from "../Avatar.component";
// @generated:end

// @generated:start tests
function createFixture() {
  const fixture = TestBed.createComponent(AvatarComponent);
  fixture.componentInstance["name"] = "placeholder" as never;
  return fixture;
}

describe("Avatar — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AvatarComponent] });
  });

  it("creates the component", () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeInstanceOf(AvatarComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = createFixture();
    expect(classTokens(fixture.componentInstance)).toContain("avatar");
  });

  it("applies size=small variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.size = "small";
    expect(classTokens(fixture.componentInstance)).toContain("avatar--small");
  });

  it("applies size=medium variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.size = "medium";
    expect(classTokens(fixture.componentInstance)).toContain("avatar--medium");
  });

  it("applies size=large variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.size = "large";
    expect(classTokens(fixture.componentInstance)).toContain("avatar--large");
  });

  it("applies size=extra-large variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.size = "extra-large";
    expect(classTokens(fixture.componentInstance)).toContain("avatar--extra-large");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
