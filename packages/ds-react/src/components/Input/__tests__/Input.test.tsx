// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Input } from "../Input";

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

describe("Input — unit", () => {
  it("renders with default props", () => {
    render(<Input data-testid="input" />);
    expect(screen.getByTestId("input")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Input data-testid="input" />);
    expect(screen.getByTestId("input")).toHaveClass("input");
  });

  it("merges custom className", () => {
    render(<Input data-testid="input" className="custom" />);
    expect(screen.getByTestId("input")).toHaveClass("input", "custom");
  });

  it("calls onChange when value changes", async () => {
    const onChangeSpy = vi.fn();
    render(<Input data-testid="input" onChange={onChangeSpy} />);
    fireEvent.change(screen.getByTestId("input"), { target: { value: "test" } });
    expect(onChangeSpy).toHaveBeenCalled();
  });
});

describe("Input — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Input ariaLabel="Test Input" /></>);
    const component = baseElement.querySelector('[data-fsds-component="input"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
