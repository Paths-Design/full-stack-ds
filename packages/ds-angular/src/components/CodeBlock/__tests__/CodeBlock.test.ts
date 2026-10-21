// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
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

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [CodeBlockComponent],
  template: "<fsds-code-block [code]=\"code\" [language]=\"language\"><span>content</span></fsds-code-block>",
})
class CodeBlockAxeHost {
  readonly code = "placeholder";
  readonly language = "bash";
}

describe("CodeBlock — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [CodeBlockAxeHost] });
    const fixture = TestBed.createComponent(CodeBlockAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".code-block");
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
