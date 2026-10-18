// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Image } from "../Image";

declare module "vitest" {
  interface Assertion<T> {
    // The positional T keeps this augmentation mergeable with vitest's
    // own Assertion<T = any> declaration (TS2428 fires on any rename);
    // the expected param references it so it is never an unused type param.
    toHaveNoViolations(expected?: T): void;
  }
}
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Image — unit", () => {
  it("renders with default props", () => {
    render(<Image data-testid="image" alt={"placeholder"} />);
    expect(screen.getByTestId("image")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Image data-testid="image" alt={"placeholder"} />);
    expect(screen.getByTestId("image")).toHaveClass("image");
  });

  it("merges custom className", () => {
    render(<Image data-testid="image" alt={"placeholder"} className="custom" />);
    expect(screen.getByTestId("image")).toHaveClass("image", "custom");
  });

  it("applies size=xs variant class", () => {
    render(<Image data-testid="image" alt={"placeholder"} size="xs" />);
    expect(screen.getByTestId("image")).toHaveClass("image--size-xs");
  });

  it("applies size=sm variant class", () => {
    render(<Image data-testid="image" alt={"placeholder"} size="sm" />);
    expect(screen.getByTestId("image")).toHaveClass("image--size-sm");
  });

  it("applies size=md variant class", () => {
    render(<Image data-testid="image" alt={"placeholder"} size="md" />);
    expect(screen.getByTestId("image")).toHaveClass("image--size-md");
  });

  it("applies size=lg variant class", () => {
    render(<Image data-testid="image" alt={"placeholder"} size="lg" />);
    expect(screen.getByTestId("image")).toHaveClass("image--size-lg");
  });

  it("applies size=xl variant class", () => {
    render(<Image data-testid="image" alt={"placeholder"} size="xl" />);
    expect(screen.getByTestId("image")).toHaveClass("image--size-xl");
  });

  it("applies size=full variant class", () => {
    render(<Image data-testid="image" alt={"placeholder"} size="full" />);
    expect(screen.getByTestId("image")).toHaveClass("image--size-full");
  });

  it("applies radius=none variant class", () => {
    render(<Image data-testid="image" alt={"placeholder"} radius="none" />);
    expect(screen.getByTestId("image")).toHaveClass("image--radius-none");
  });

  it("applies radius=sm variant class", () => {
    render(<Image data-testid="image" alt={"placeholder"} radius="sm" />);
    expect(screen.getByTestId("image")).toHaveClass("image--radius-sm");
  });

  it("applies radius=md variant class", () => {
    render(<Image data-testid="image" alt={"placeholder"} radius="md" />);
    expect(screen.getByTestId("image")).toHaveClass("image--radius-md");
  });

  it("applies radius=lg variant class", () => {
    render(<Image data-testid="image" alt={"placeholder"} radius="lg" />);
    expect(screen.getByTestId("image")).toHaveClass("image--radius-lg");
  });

  it("applies radius=full variant class", () => {
    render(<Image data-testid="image" alt={"placeholder"} radius="full" />);
    expect(screen.getByTestId("image")).toHaveClass("image--radius-full");
  });
});

describe("Image — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Image aria-label="Test Image" alt={"placeholder"} /></>);
    const component = baseElement.querySelector('[data-fsds-component="image"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
