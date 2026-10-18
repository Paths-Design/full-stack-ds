// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Avatar } from "../Avatar";

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

describe("Avatar — unit", () => {
  it("renders with default props", () => {
    render(<Avatar data-testid="avatar" name={"placeholder"} />);
    expect(screen.getByTestId("avatar")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Avatar data-testid="avatar" name={"placeholder"} />);
    expect(screen.getByTestId("avatar")).toHaveClass("avatar");
  });

  it("merges custom className", () => {
    render(<Avatar data-testid="avatar" name={"placeholder"} className="custom" />);
    expect(screen.getByTestId("avatar")).toHaveClass("avatar", "custom");
  });

  it("has the correct ARIA role", () => {
    render(<Avatar data-testid="avatar" name={"placeholder"} />);
    expect(screen.getByTestId("avatar")).toHaveAttribute("role", "img");
  });

  it("applies size=small variant class", () => {
    render(<Avatar data-testid="avatar" name={"placeholder"} size="small" />);
    expect(screen.getByTestId("avatar")).toHaveClass("avatar--small");
  });

  it("applies size=medium variant class", () => {
    render(<Avatar data-testid="avatar" name={"placeholder"} size="medium" />);
    expect(screen.getByTestId("avatar")).toHaveClass("avatar--medium");
  });

  it("applies size=large variant class", () => {
    render(<Avatar data-testid="avatar" name={"placeholder"} size="large" />);
    expect(screen.getByTestId("avatar")).toHaveClass("avatar--large");
  });

  it("applies size=extra-large variant class", () => {
    render(<Avatar data-testid="avatar" name={"placeholder"} size="extra-large" />);
    expect(screen.getByTestId("avatar")).toHaveClass("avatar--extra-large");
  });
});

describe("Avatar — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Avatar name="Test Avatar" /></>);
    const component = baseElement.querySelector('[data-fsds-component="avatar"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
