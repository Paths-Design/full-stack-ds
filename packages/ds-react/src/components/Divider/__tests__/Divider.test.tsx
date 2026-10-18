// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Divider } from "../Divider";

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

describe("Divider — unit", () => {
  it("renders with default props", () => {
    render(<Divider data-testid="divider" />);
    expect(screen.getByTestId("divider")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Divider data-testid="divider" />);
    expect(screen.getByTestId("divider")).toHaveClass("divider");
  });

  it("merges custom className", () => {
    render(<Divider data-testid="divider" className="custom" />);
    expect(screen.getByTestId("divider")).toHaveClass("divider", "custom");
  });

  it("applies orientation=horizontal variant class", () => {
    render(<Divider data-testid="divider" orientation="horizontal" />);
    expect(screen.getByTestId("divider")).toHaveClass("divider--horizontal");
  });

  it("applies orientation=vertical variant class", () => {
    render(<Divider data-testid="divider" orientation="vertical" />);
    expect(screen.getByTestId("divider")).toHaveClass("divider--vertical");
  });
});

describe("Divider — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Divider /></>);
    const component = baseElement.querySelector('[data-fsds-component="divider"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
