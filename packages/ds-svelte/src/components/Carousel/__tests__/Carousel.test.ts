// @generated:start imports
import { describe, expect, it } from "vitest";
import { createRawSnippet, type Component } from "svelte";
import { render } from "@testing-library/svelte";
import { axe } from "vitest-axe";
import Carousel from "../Carousel.svelte";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Carousel — unit", () => {
  it("renders with default props", () => {
    const { container } = render(Carousel as unknown as Component<Record<string, unknown>>, { props: {} });
    expect(container.firstElementChild).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const { container } = render(Carousel as unknown as Component<Record<string, unknown>>, { props: {} });
    expect(container.firstElementChild?.className).toContain("carousel");
  });

  it("merges custom class", () => {
    const { container } = render(Carousel as unknown as Component<Record<string, unknown>>, { props: { "class": "custom" } });
    expect(container.firstElementChild?.className).toContain("carousel");
    expect(container.firstElementChild?.className).toContain("custom");
  });

  it("applies indicator=pagination variant class", () => {
    const { container } = render(Carousel as unknown as Component<Record<string, unknown>>, { props: { "indicator": "pagination" } });
    expect(container.firstElementChild?.className).toContain("carousel--pagination");
  });

  it("applies indicator=next variant class", () => {
    const { container } = render(Carousel as unknown as Component<Record<string, unknown>>, { props: { "indicator": "next" } });
    expect(container.firstElementChild?.className).toContain("carousel--next");
  });

  it("applies indicator=both variant class", () => {
    const { container } = render(Carousel as unknown as Component<Record<string, unknown>>, { props: { "indicator": "both" } });
    expect(container.firstElementChild?.className).toContain("carousel--both");
  });
});

describe("Carousel — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { container } = render(Carousel as unknown as Component<Record<string, unknown>>, { props: { "label": "Test Carousel", "children": createRawSnippet(() => ({ render: () => "<span>content</span>" })) } });
    const results = await axe(container, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
