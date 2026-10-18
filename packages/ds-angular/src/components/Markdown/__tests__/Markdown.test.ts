// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { MarkdownComponent } from "../Markdown.component";
// @generated:end

// @generated:start tests
function createFixture() {
  const fixture = TestBed.createComponent(MarkdownComponent);
  fixture.componentInstance["content"] = "placeholder" as never;
  return fixture;
}

describe("Markdown — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [MarkdownComponent] });
  });

  it("creates the component", () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeInstanceOf(MarkdownComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = createFixture();
    expect(classTokens(fixture.componentInstance)).toContain("markdown");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
