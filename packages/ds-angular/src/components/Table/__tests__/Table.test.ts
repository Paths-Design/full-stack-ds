// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
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

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [TableComponent],
  template: "<fsds-table [ariaLabel]=\"ariaLabel\"><tbody><tr><td>content</td></tr></tbody></fsds-table>",
})
class TableAxeHost {
  readonly ariaLabel = "Test Table";
}

describe("Table — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [TableAxeHost] });
    const fixture = TestBed.createComponent(TableAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".table");
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
