// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Label } from "../Label";

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

describe("Label — unit", () => {
  it("renders with default props", () => {
    render(<Label data-testid="label"><span>content</span></Label>);
    expect(screen.getByTestId("label")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Label data-testid="label"><span>content</span></Label>);
    expect(screen.getByTestId("label")).toHaveClass("label");
  });

  it("merges custom className", () => {
    render(<Label data-testid="label" className="custom"><span>content</span></Label>);
    expect(screen.getByTestId("label")).toHaveClass("label", "custom");
  });
});

describe("Label — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Label><span>content</span></Label></>);
    const component = baseElement.querySelector('[data-fsds-component="label"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
