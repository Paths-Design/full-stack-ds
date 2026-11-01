// @generated:start imports
import { describe, expect, it } from "vitest";
import { createRawSnippet, type Component } from "svelte";
import { render } from "@testing-library/svelte";
import { axe } from "vitest-axe";
import Blockquote from "../Blockquote.svelte";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Blockquote — unit", () => {
  it("renders with default props", () => {
    const { container } = render(Blockquote as unknown as Component<Record<string, unknown>>, { props: {} });
    expect(container.firstElementChild).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const { container } = render(Blockquote as unknown as Component<Record<string, unknown>>, { props: {} });
    expect(container.firstElementChild?.className).toContain("blockquote");
  });

  it("merges custom class", () => {
    const { container } = render(Blockquote as unknown as Component<Record<string, unknown>>, { props: { "class": "custom" } });
    expect(container.firstElementChild?.className).toContain("blockquote");
    expect(container.firstElementChild?.className).toContain("custom");
  });

  it("applies variant=default variant class", () => {
    const { container } = render(Blockquote as unknown as Component<Record<string, unknown>>, { props: { "variant": "default" } });
    expect(container.firstElementChild?.className).toContain("blockquote--default");
  });

  it("applies variant=bordered variant class", () => {
    const { container } = render(Blockquote as unknown as Component<Record<string, unknown>>, { props: { "variant": "bordered" } });
    expect(container.firstElementChild?.className).toContain("blockquote--bordered");
  });

  it("applies variant=highlighted variant class", () => {
    const { container } = render(Blockquote as unknown as Component<Record<string, unknown>>, { props: { "variant": "highlighted" } });
    expect(container.firstElementChild?.className).toContain("blockquote--highlighted");
  });

  it("applies size=sm variant class", () => {
    const { container } = render(Blockquote as unknown as Component<Record<string, unknown>>, { props: { "size": "sm" } });
    expect(container.firstElementChild?.className).toContain("blockquote--sm");
  });

  it("applies size=md variant class", () => {
    const { container } = render(Blockquote as unknown as Component<Record<string, unknown>>, { props: { "size": "md" } });
    expect(container.firstElementChild?.className).toContain("blockquote--md");
  });

  it("applies size=lg variant class", () => {
    const { container } = render(Blockquote as unknown as Component<Record<string, unknown>>, { props: { "size": "lg" } });
    expect(container.firstElementChild?.className).toContain("blockquote--lg");
  });
});

describe("Blockquote — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { container } = render(Blockquote as unknown as Component<Record<string, unknown>>, { props: { "children": createRawSnippet(() => ({ render: () => "<span>content</span>" })) } });
    const results = await axe(container, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
it("updates and omits source URL metadata while retaining the content snippet", async () => {
  const quote = "التصميم — 日本語 — “quoted”";
  const children = createRawSnippet(() => ({ render: () => `<span lang="ar" dir="rtl">${quote}</span>` }));
  const { container, rerender } = render(Blockquote as unknown as Component<Record<string, unknown>>, { props: { children } });
  const element = container.querySelector("blockquote");
  expect(element).not.toBeNull();
  for (const cite of [undefined, "https://example.test/مصدر?edition=2&lang=ar", "/sources/日本語#quote", "", undefined]) {
    await rerender({ cite, children });
    expect(container.querySelector("blockquote")).toBe(element);
    expect(element!.getAttribute("cite")).toBe(cite ?? null);
    expect(element!.textContent).toBe(quote);
    expect(element!.querySelector("a, button, [tabindex]")).toBeNull();
  }
});
// @custom:end
