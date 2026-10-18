// @generated:start imports
import { describe, expect, it, beforeEach } from "@jest/globals";
import { TestBed } from "@angular/core/testing";
import { IconComponent } from "../Icon.component";
// @generated:end

// @generated:start tests
function createFixture() {
  const fixture = TestBed.createComponent(IconComponent);
  fixture.componentInstance["name"] = "placeholder" as never;
  return fixture;
}

describe("Icon — unit", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [IconComponent] });
  });

  it("creates the component", () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeInstanceOf(IconComponent);
  });

  it("applies the base CSS class", () => {
    const fixture = createFixture();
    expect(classTokens(fixture.componentInstance)).toContain("icon");
  });

  it("applies size=sm variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.size = "sm";
    expect(classTokens(fixture.componentInstance)).toContain("icon--sm");
  });

  it("applies size=md variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.size = "md";
    expect(classTokens(fixture.componentInstance)).toContain("icon--md");
  });

  it("applies size=lg variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.size = "lg";
    expect(classTokens(fixture.componentInstance)).toContain("icon--lg");
  });

  it("applies size=xl variant class", () => {
    const fixture = createFixture();
    fixture.componentInstance.size = "xl";
    expect(classTokens(fixture.componentInstance)).toContain("icon--xl");
  });
});

function classTokens(component: { classes: () => string }): string[] {
  return component.classes().split(/\s+/).filter(Boolean);
}
// @generated:end

// @custom:start tests
describe("Icon — catalog glyph rendering (ICON-CATALOG-RUNTIME-DELIVERY-01)", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [IconComponent] });
  });

  function renderIcon(name: string, size?: "sm" | "md" | "lg" | "xl") {
    const fixture = TestBed.createComponent(IconComponent);
    fixture.componentInstance.name = name;
    if (size) fixture.componentInstance.size = size;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it("renders the authored 16-grid check glyph at size=sm", () => {
    const host = renderIcon("check", "sm");
    const svg = host.querySelector('svg[data-fsds-icon="check"]');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("viewBox")).toBe("0 0 16 16");
    expect(svg!.getAttribute("width")).toBe("16");
    const paths = svg!.querySelectorAll("path");
    expect(paths).toHaveLength(1);
    // the exact authored path data, not just element presence
    expect(paths[0].getAttribute("d")).toBe("M3.5 8.5L6.5 11.5L12.5 4.5");
    expect(paths[0].getAttribute("stroke-linecap")).toBe("round");
  });

  it("floor-selects the 16-grid variant at size=md but renders at 20px", () => {
    const svg = renderIcon("check", "md").querySelector('svg[data-fsds-icon="check"]');
    expect(svg!.getAttribute("viewBox")).toBe("0 0 16 16");
    expect(svg!.getAttribute("width")).toBe("20");
  });

  it("selects the authored 24-grid variant at size=lg", () => {
    const svg = renderIcon("check", "lg").querySelector('svg[data-fsds-icon="check"]');
    expect(svg!.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg!.querySelector("path")!.getAttribute("d")).toBe("M5 12.5L9.5 17L19 6.5");
  });

  it("renders no svg at all for an unknown icon name", () => {
    expect(renderIcon("does-not-exist").querySelector("svg")).toBeNull();
  });
});

describe("Icon — FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01: undefined size resolves to contract default", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [IconComponent] });
  });

  it("an explicitly-undefined size falls back to the md hint (20px), not the natural SVG size", () => {
    // An `@Input() size?: T = "md"` class-field default only applies once,
    // at construction. Explicitly assigning `undefined` (simulating a
    // consumer's controlled prop update landing `undefined`, distinct
    // from simply never setting the input) must still resolve via the
    // getter's contract-default fallback — proving the accessor
    // re-applies the default on every read, not just at construction.
    const fixture = TestBed.createComponent(IconComponent);
    fixture.componentInstance.name = "check";
    fixture.componentInstance.size = undefined;
    fixture.detectChanges();

    expect(fixture.componentInstance.iconGlyphPx).toBe(20);
    const svg = (fixture.nativeElement as HTMLElement).querySelector(
      'svg[data-fsds-icon="check"]',
    );
    expect(svg!.getAttribute("width")).toBe("20");
  });
});
// @custom:end
