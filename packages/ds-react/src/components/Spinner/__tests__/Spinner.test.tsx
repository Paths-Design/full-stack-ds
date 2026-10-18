// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Spinner } from "../Spinner";

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

describe("Spinner — unit", () => {
  it("renders with default props", () => {
    render(<Spinner data-testid="spinner" />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Spinner data-testid="spinner" />);
    expect(screen.getByTestId("spinner")).toHaveClass("spinner");
  });

  it("merges custom className", () => {
    render(<Spinner data-testid="spinner" className="custom" />);
    expect(screen.getByTestId("spinner")).toHaveClass("spinner", "custom");
  });

  it("has the correct ARIA role", () => {
    render(<Spinner data-testid="spinner" />);
    expect(screen.getByTestId("spinner")).toHaveAttribute("role", "status");
  });

  it("applies size=xs variant class", () => {
    render(<Spinner data-testid="spinner" size="xs" />);
    expect(screen.getByTestId("spinner")).toHaveClass("spinner--xs");
  });

  it("applies size=sm variant class", () => {
    render(<Spinner data-testid="spinner" size="sm" />);
    expect(screen.getByTestId("spinner")).toHaveClass("spinner--sm");
  });

  it("applies size=md variant class", () => {
    render(<Spinner data-testid="spinner" size="md" />);
    expect(screen.getByTestId("spinner")).toHaveClass("spinner--md");
  });

  it("applies size=lg variant class", () => {
    render(<Spinner data-testid="spinner" size="lg" />);
    expect(screen.getByTestId("spinner")).toHaveClass("spinner--lg");
  });

  it("applies thickness=hairline variant class", () => {
    render(<Spinner data-testid="spinner" thickness="hairline" />);
    expect(screen.getByTestId("spinner")).toHaveClass("spinner--hairline");
  });

  it("applies thickness=regular variant class", () => {
    render(<Spinner data-testid="spinner" thickness="regular" />);
    expect(screen.getByTestId("spinner")).toHaveClass("spinner--regular");
  });

  it("applies thickness=bold variant class", () => {
    render(<Spinner data-testid="spinner" thickness="bold" />);
    expect(screen.getByTestId("spinner")).toHaveClass("spinner--bold");
  });
});

describe("Spinner — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Spinner label="Test Spinner" /></>);
    const component = baseElement.querySelector('[data-fsds-component="spinner"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
