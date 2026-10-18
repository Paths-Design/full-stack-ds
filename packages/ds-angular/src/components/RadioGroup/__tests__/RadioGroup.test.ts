// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { RadioGroupComponent } from "../RadioGroup.component";
// @generated:end

// @generated:start tests
function createFixture() {
  const fixture = TestBed.createComponent(RadioGroupComponent);
  fixture.componentInstance["name"] = "placeholder" as never;
  return fixture;
}

describe("RadioGroup — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RadioGroupComponent] });
  });

  it("creates the component", () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeInstanceOf(RadioGroupComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = createFixture();
    expect(classTokens(fixture.componentInstance)).toContain("radio-group");
  });

  it("applies orientation=vertical variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.orientation = "vertical";
    expect(classTokens(fixture.componentInstance)).toContain("radio-group--vertical");
  });

  it("applies orientation=horizontal variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.orientation = "horizontal";
    expect(classTokens(fixture.componentInstance)).toContain("radio-group--horizontal");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
