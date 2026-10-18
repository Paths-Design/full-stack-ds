// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Breadcrumbs } from "../Breadcrumbs";

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

describe("Breadcrumbs — unit", () => {
  it("renders with default props", () => {
    render(<Breadcrumbs data-testid="breadcrumbs"><li>content</li></Breadcrumbs>);
    expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Breadcrumbs data-testid="breadcrumbs"><li>content</li></Breadcrumbs>);
    expect(screen.getByTestId("breadcrumbs")).toHaveClass("breadcrumbs");
  });

  it("merges custom className", () => {
    render(<Breadcrumbs data-testid="breadcrumbs" className="custom"><li>content</li></Breadcrumbs>);
    expect(screen.getByTestId("breadcrumbs")).toHaveClass("breadcrumbs", "custom");
  });
});

describe("Breadcrumbs — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Breadcrumbs ariaLabel="Test Breadcrumbs"><li>content</li></Breadcrumbs></>);
    const component = baseElement.querySelector('[data-fsds-component="breadcrumbs"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
