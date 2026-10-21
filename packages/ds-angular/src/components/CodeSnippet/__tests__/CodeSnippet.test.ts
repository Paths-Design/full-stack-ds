// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { CodeSnippetComponent } from "../CodeSnippet.component";
// @generated:end

// @generated:start tests
function createFixture() {
  const fixture = TestBed.createComponent(CodeSnippetComponent);
  fixture.componentInstance["text"] = "placeholder" as never;
  return fixture;
}

describe("CodeSnippet — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CodeSnippetComponent] });
  });

  it("creates the component", () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeInstanceOf(CodeSnippetComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = createFixture();
    expect(classTokens(fixture.componentInstance)).toContain("code-snippet");
  });

  it("applies as=code variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.as = "code";
    expect(classTokens(fixture.componentInstance)).toContain("code-snippet--code");
  });

  it("applies as=kbd variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.as = "kbd";
    expect(classTokens(fixture.componentInstance)).toContain("code-snippet--kbd");
  });

  it("applies as=samp variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.as = "samp";
    expect(classTokens(fixture.componentInstance)).toContain("code-snippet--samp");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [CodeSnippetComponent],
  template: "<fsds-code-snippet [text]=\"text\"></fsds-code-snippet>",
})
class CodeSnippetAxeHost {
  readonly text = "placeholder";
}

describe("CodeSnippet — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [CodeSnippetAxeHost] });
    const fixture = TestBed.createComponent(CodeSnippetAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".code-snippet");
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
