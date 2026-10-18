// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { FieldComponent } from "../Field.component";
// @generated:end

// @generated:start tests
function createFixture() {
  const fixture = TestBed.createComponent(FieldComponent);
  fixture.componentInstance["name"] = "placeholder" as never;
  return fixture;
}

describe("Field — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FieldComponent] });
  });

  it("creates the component", () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeInstanceOf(FieldComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = createFixture();
    expect(classTokens(fixture.componentInstance)).toContain("field");
  });

  it("applies status=idle variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.status = "idle";
    expect(classTokens(fixture.componentInstance)).toContain("field--idle");
  });

  it("applies status=validating variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.status = "validating";
    expect(classTokens(fixture.componentInstance)).toContain("field--validating");
  });

  it("applies status=valid variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.status = "valid";
    expect(classTokens(fixture.componentInstance)).toContain("field--valid");
  });

  it("applies status=invalid variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.status = "invalid";
    expect(classTokens(fixture.componentInstance)).toContain("field--invalid");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
