// @generated:start imports
import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
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

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
