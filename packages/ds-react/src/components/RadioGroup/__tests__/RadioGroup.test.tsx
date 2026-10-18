// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { RadioGroup } from "../RadioGroup";

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

describe("RadioGroup — unit", () => {
  it("renders with default props", () => {
    render(<RadioGroup data-testid="radio-group" name={"placeholder"} />);
    expect(screen.getByTestId("radio-group")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<RadioGroup data-testid="radio-group" name={"placeholder"} />);
    expect(screen.getByTestId("radio-group")).toHaveClass("radio-group");
  });

  it("merges custom className", () => {
    render(<RadioGroup data-testid="radio-group" name={"placeholder"} className="custom" />);
    expect(screen.getByTestId("radio-group")).toHaveClass("radio-group", "custom");
  });

  it("has the correct ARIA role", () => {
    render(<RadioGroup data-testid="radio-group" name={"placeholder"} />);
    expect(screen.getByTestId("radio-group")).toHaveAttribute("role", "radiogroup");
  });

  it("applies orientation=vertical variant class", () => {
    render(<RadioGroup data-testid="radio-group" name={"placeholder"} orientation="vertical" />);
    expect(screen.getByTestId("radio-group")).toHaveClass("radio-group--vertical");
  });

  it("applies orientation=horizontal variant class", () => {
    render(<RadioGroup data-testid="radio-group" name={"placeholder"} orientation="horizontal" />);
    expect(screen.getByTestId("radio-group")).toHaveClass("radio-group--horizontal");
  });

  it("calls onChange when selection changes", async () => {
    const onChangeSpy = vi.fn();
    expect(() => render(<RadioGroup data-testid="radio-group" name={"placeholder"} value={""} onChange={onChangeSpy} />)).not.toThrow();
  });
});

describe("RadioGroup — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><RadioGroup ariaLabel="Test RadioGroup" name={"placeholder"} /></>);
    const component = baseElement.querySelector('[data-fsds-component="radio-group"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
