// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Markdown } from "../Markdown";

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

describe("Markdown — unit", () => {
  it("renders with default props", () => {
    render(<Markdown data-testid="markdown" content={"placeholder"} />);
    expect(screen.getByTestId("markdown")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Markdown data-testid="markdown" content={"placeholder"} />);
    expect(screen.getByTestId("markdown")).toHaveClass("markdown");
  });

  it("merges custom className", () => {
    render(<Markdown data-testid="markdown" content={"placeholder"} className="custom" />);
    expect(screen.getByTestId("markdown")).toHaveClass("markdown", "custom");
  });
});

describe("Markdown — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Markdown content={"placeholder"} /></>);
    const component = baseElement.querySelector('[data-fsds-component="markdown"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
