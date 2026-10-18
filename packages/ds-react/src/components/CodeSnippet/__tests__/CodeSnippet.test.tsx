// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { CodeSnippet } from "../CodeSnippet";

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

describe("CodeSnippet — unit", () => {
  it("renders with default props", () => {
    render(<CodeSnippet data-testid="code-snippet" text={"placeholder"} />);
    expect(screen.getByTestId("code-snippet")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<CodeSnippet data-testid="code-snippet" text={"placeholder"} />);
    expect(screen.getByTestId("code-snippet")).toHaveClass("code-snippet");
  });

  it("merges custom className", () => {
    render(<CodeSnippet data-testid="code-snippet" text={"placeholder"} className="custom" />);
    expect(screen.getByTestId("code-snippet")).toHaveClass("code-snippet", "custom");
  });

  it("applies as=code variant class", () => {
    render(<CodeSnippet data-testid="code-snippet" text={"placeholder"} as="code" />);
    expect(screen.getByTestId("code-snippet")).toHaveClass("code-snippet--code");
  });

  it("applies as=kbd variant class", () => {
    render(<CodeSnippet data-testid="code-snippet" text={"placeholder"} as="kbd" />);
    expect(screen.getByTestId("code-snippet")).toHaveClass("code-snippet--kbd");
  });

  it("applies as=samp variant class", () => {
    render(<CodeSnippet data-testid="code-snippet" text={"placeholder"} as="samp" />);
    expect(screen.getByTestId("code-snippet")).toHaveClass("code-snippet--samp");
  });
});

describe("CodeSnippet — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><CodeSnippet text={"placeholder"} /></>);
    const component = baseElement.querySelector('[data-fsds-component="code-snippet"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
