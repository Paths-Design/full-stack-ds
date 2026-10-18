// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { ShuttleComponent } from "../Shuttle.component";
// @generated:end

// @generated:start tests
describe("Shuttle — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ShuttleComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(ShuttleComponent);
    expect(fixture.componentInstance).toBeInstanceOf(ShuttleComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(ShuttleComponent);
    expect(classTokens(fixture.componentInstance)).toContain("shuttle");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
