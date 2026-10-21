// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { PostcardComponent } from "../Postcard.component";
// @generated:end

// @generated:start tests
function createFixture() {
  const fixture = TestBed.createComponent(PostcardComponent);
  fixture.componentInstance["postId"] = "placeholder" as never;
  fixture.componentInstance["author"] = {} as never;
  fixture.componentInstance["timestamp"] = "placeholder" as never;
  fixture.componentInstance["stats"] = {} as never;
  return fixture;
}

describe("Postcard — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PostcardComponent] });
  });

  it("creates the component", () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeInstanceOf(PostcardComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = createFixture();
    expect(classTokens(fixture.componentInstance)).toContain("postcard");
  });

  it("applies type=image variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.type = "image";
    expect(classTokens(fixture.componentInstance)).toContain("postcard--image");
  });

  it("applies type=video variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.type = "video";
    expect(classTokens(fixture.componentInstance)).toContain("postcard--video");
  });

  it("applies type=audio variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.type = "audio";
    expect(classTokens(fixture.componentInstance)).toContain("postcard--audio");
  });
});

// `region` asks whether all page content is landmark-contained, a page
// question; a single component under test cannot answer it.
const componentAxeOptions = { rules: { region: { enabled: false } } };

@Component({
  standalone: true,
  imports: [PostcardComponent],
  template: "<fsds-postcard [postId]=\"postId\" [author]=\"author\" [timestamp]=\"timestamp\" [stats]=\"stats\" aria-label=\"Test Postcard\"><span>content</span></fsds-postcard>",
})
class PostcardAxeHost {
  readonly postId = "placeholder";
  readonly author = {};
  readonly timestamp = "placeholder";
  readonly stats = {};
}

describe("Postcard — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    TestBed.configureTestingModule({ imports: [PostcardAxeHost] });
    const fixture = TestBed.createComponent(PostcardAxeHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(".postcard");
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
