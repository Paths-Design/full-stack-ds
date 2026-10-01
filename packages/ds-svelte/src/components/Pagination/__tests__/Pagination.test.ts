// @generated:start imports
import { describe, expect, it } from "vitest";
import type { Component } from "svelte";
import { render } from "@testing-library/svelte";
import { axe } from "vitest-axe";
import Pagination from "../Pagination.svelte";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Pagination — unit", () => {
  it("renders with default props", () => {
    const { container } = render(Pagination as unknown as Component<Record<string, unknown>>, { props: {} });
    expect(container.firstElementChild).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const { container } = render(Pagination as unknown as Component<Record<string, unknown>>, { props: {} });
    expect(container.firstElementChild?.className).toContain("pagination");
  });

  it("merges custom class", () => {
    const { container } = render(Pagination as unknown as Component<Record<string, unknown>>, { props: { "class": "custom" } });
    expect(container.firstElementChild?.className).toContain("pagination");
    expect(container.firstElementChild?.className).toContain("custom");
  });

  it("has the correct ARIA role", () => {
    const { container } = render(Pagination as unknown as Component<Record<string, unknown>>, { props: {} });
    expect(container.firstElementChild?.getAttribute("role")).toBe("group");
  });

  it("applies presentation=indicators variant class", () => {
    const { container } = render(Pagination as unknown as Component<Record<string, unknown>>, { props: { "presentation": "indicators" } });
    expect(container.firstElementChild?.className).toContain("pagination--indicators");
  });

  it("applies presentation=pages variant class", () => {
    const { container } = render(Pagination as unknown as Component<Record<string, unknown>>, { props: { "presentation": "pages" } });
    expect(container.firstElementChild?.className).toContain("pagination--pages");
  });

  it("applies progress=none variant class", () => {
    const { container } = render(Pagination as unknown as Component<Record<string, unknown>>, { props: { "progress": "none" } });
    expect(container.firstElementChild?.className).toContain("pagination--none");
  });

  it("applies progress=elapsed variant class", () => {
    const { container } = render(Pagination as unknown as Component<Record<string, unknown>>, { props: { "progress": "elapsed" } });
    expect(container.firstElementChild?.className).toContain("pagination--elapsed");
  });
});

describe("Pagination — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { container } = render(Pagination as unknown as Component<Record<string, unknown>>, { props: { "label": "Test Pagination" } });
    const results = await axe(container, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
