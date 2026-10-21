// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
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

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [MarkdownComponent],
  template: "<fsds-markdown [content]=\"content\"></fsds-markdown>",
})
class MarkdownAxeHost {
  readonly content = "placeholder";
}

describe("Markdown — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [MarkdownAxeHost] });
    const fixture = TestBed.createComponent(MarkdownAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".markdown");
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
