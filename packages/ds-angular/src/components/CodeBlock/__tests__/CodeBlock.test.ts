// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { CodeBlockComponent } from "../CodeBlock.component";
// @generated:end

// @generated:start tests
function createFixture() {
  const fixture = TestBed.createComponent(CodeBlockComponent);
  fixture.componentInstance["code"] = "placeholder" as never;
  fixture.componentInstance["language"] = "bash" as never;
  return fixture;
}

describe("CodeBlock — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CodeBlockComponent] });
  });

  it("creates the component", () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeInstanceOf(CodeBlockComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = createFixture();
    expect(classTokens(fixture.componentInstance)).toContain("code-block");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
