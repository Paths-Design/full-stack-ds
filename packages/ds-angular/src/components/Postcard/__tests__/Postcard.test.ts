// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
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

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests

// @custom:end
