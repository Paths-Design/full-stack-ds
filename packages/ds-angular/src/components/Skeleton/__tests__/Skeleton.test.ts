// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { SkeletonComponent } from "../Skeleton.component";
// @generated:end

// @generated:start tests
describe("Skeleton — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SkeletonComponent] });
  });

  it("creates the component", () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    expect(fixture.componentInstance).toBeInstanceOf(SkeletonComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    expect(classTokens(fixture.componentInstance)).toContain("skeleton");
  });

  it("applies variant=block variant class", () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentInstance.variant = "block";
    expect(classTokens(fixture.componentInstance)).toContain("skeleton--block");
  });

  it("applies variant=text variant class", () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentInstance.variant = "text";
    expect(classTokens(fixture.componentInstance)).toContain("skeleton--text");
  });

  it("applies variant=avatar variant class", () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentInstance.variant = "avatar";
    expect(classTokens(fixture.componentInstance)).toContain("skeleton--avatar");
  });

  it("applies variant=media variant class", () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentInstance.variant = "media";
    expect(classTokens(fixture.componentInstance)).toContain("skeleton--media");
  });

  it("applies variant=dataviz variant class", () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentInstance.variant = "dataviz";
    expect(classTokens(fixture.componentInstance)).toContain("skeleton--dataviz");
  });

  it("applies variant=actions variant class", () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentInstance.variant = "actions";
    expect(classTokens(fixture.componentInstance)).toContain("skeleton--actions");
  });

  it("applies animate=shimmer variant class", () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentInstance.animate = "shimmer";
    expect(classTokens(fixture.componentInstance)).toContain("skeleton--shimmer");
  });

  it("applies animate=wipe variant class", () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentInstance.animate = "wipe";
    expect(classTokens(fixture.componentInstance)).toContain("skeleton--wipe");
  });

  it("applies animate=pulse variant class", () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentInstance.animate = "pulse";
    expect(classTokens(fixture.componentInstance)).toContain("skeleton--pulse");
  });

  it("applies animate=none variant class", () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentInstance.animate = "none";
    expect(classTokens(fixture.componentInstance)).toContain("skeleton--none");
  });

  it("applies density=compact variant class", () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentInstance.density = "compact";
    expect(classTokens(fixture.componentInstance)).toContain("skeleton--compact");
  });

  it("applies density=regular variant class", () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentInstance.density = "regular";
    expect(classTokens(fixture.componentInstance)).toContain("skeleton--regular");
  });

  it("applies density=spacious variant class", () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentInstance.density = "spacious";
    expect(classTokens(fixture.componentInstance)).toContain("skeleton--spacious");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests
describe("Skeleton — FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01: undefined decorative resolves to the contract default (true)", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SkeletonComponent] });
  });

  it("matches react's a11y output for an explicitly-undefined decorative prop", () => {
    // Contract default for `decorative` is `true`. An `@Input()
    // decorative?: boolean = true` class-field default only applies once,
    // at construction — simulate a consumer explicitly clobbering it back
    // to `undefined` post-construction and assert role/aria-busy/
    // aria-hidden still resolve as if `decorative` were `true` (matching
    // react's parameter-default resolution for the same input), not the
    // announced (`decorative: false`) state.
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentInstance.decorative = undefined;
    fixture.detectChanges();

    const root = (fixture.nativeElement as HTMLElement).firstElementChild!;
    expect(root.getAttribute("role")).toBe("presentation");
    expect(root.getAttribute("aria-busy")).toBe("false");
    expect(root.getAttribute("aria-hidden")).toBe("true");
  });
});
// @custom:end
