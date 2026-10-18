// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { TableComponent } from "../Table.component";
// @generated:end

// @generated:start tests
describe("Table — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TableComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(TableComponent);
    expect(fixture.componentInstance).toBeInstanceOf(TableComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(TableComponent);
    expect(classTokens(fixture.componentInstance)).toContain("table");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
