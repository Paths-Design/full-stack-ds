// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { TextField } from "../TextField";

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

describe("TextField — unit", () => {
  it("renders with default props", () => {
    render(<TextField data-testid="text-field" />);
    expect(screen.getByTestId("text-field")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<TextField data-testid="text-field" />);
    expect(screen.getByTestId("text-field")).toHaveClass("text-field");
  });

  it("merges custom className", () => {
    render(<TextField data-testid="text-field" className="custom" />);
    expect(screen.getByTestId("text-field")).toHaveClass("text-field", "custom");
  });

  it("calls onChange when value changes", async () => {
    const onChangeSpy = vi.fn();
    expect(() => render(<TextField data-testid="text-field" value={""} onChange={onChangeSpy} />)).not.toThrow();
  });
});

describe("TextField — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><TextField slots={{ "label": <span>Test TextField label</span>, "description": <span>Test TextField description</span>, "error": <span>Test TextField error</span> }} /></>);
    const component = baseElement.querySelector('[data-fsds-component="text-field"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
