// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { PaginationComponent } from "../Pagination.component";
// @generated:end

// @generated:start tests
describe("Pagination — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PaginationComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(PaginationComponent);
    expect(fixture.componentInstance).toBeInstanceOf(PaginationComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(PaginationComponent);
    expect(classTokens(fixture.componentInstance)).toContain("pagination");
  });

  it("applies presentation=indicators variant class", () => {
    const fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentInstance.presentation = "indicators";
    expect(classTokens(fixture.componentInstance)).toContain("pagination--indicators");
  });

  it("applies presentation=pages variant class", () => {
    const fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentInstance.presentation = "pages";
    expect(classTokens(fixture.componentInstance)).toContain("pagination--pages");
  });

  it("applies progress=none variant class", () => {
    const fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentInstance.progress = "none";
    expect(classTokens(fixture.componentInstance)).toContain("pagination--none");
  });

  it("applies progress=elapsed variant class", () => {
    const fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentInstance.progress = "elapsed";
    expect(classTokens(fixture.componentInstance)).toContain("pagination--elapsed");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [PaginationComponent],
  template: "<fsds-pagination [label]=\"label\"></fsds-pagination>",
})
class PaginationAxeHost {
  readonly label = "Test Pagination";
}

describe("Pagination — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [PaginationAxeHost] });
    const fixture = TestBed.createComponent(PaginationAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".pagination");
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
