// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { NavTreeComponent } from "../NavTree.component";
// @generated:end

// @generated:start tests
function createFixture() {
  const fixture = TestBed.createComponent(NavTreeComponent);
  fixture.componentInstance["label"] = "placeholder" as never;
  return fixture;
}

describe("NavTree — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NavTreeComponent] });
  });

  it("creates the component", () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeInstanceOf(NavTreeComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = createFixture();
    expect(classTokens(fixture.componentInstance)).toContain("nav-tree");
  });

  it("applies iconSize=sm variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.iconSize = "sm";
    expect(classTokens(fixture.componentInstance)).toContain("nav-tree--sm");
  });

  it("applies iconSize=md variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.iconSize = "md";
    expect(classTokens(fixture.componentInstance)).toContain("nav-tree--md");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
