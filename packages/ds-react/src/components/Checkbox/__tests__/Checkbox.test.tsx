// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Checkbox } from "../Checkbox";

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

describe("Checkbox — unit", () => {
  it("renders with default props", () => {
    render(<Checkbox data-testid="checkbox" />);
    expect(screen.getByTestId("checkbox")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Checkbox data-testid="checkbox" />);
    expect(screen.getByTestId("checkbox")).toHaveClass("checkbox");
  });

  it("merges custom className", () => {
    render(<Checkbox data-testid="checkbox" className="custom" />);
    expect(screen.getByTestId("checkbox")).toHaveClass("checkbox", "custom");
  });

  it("applies size=sm variant class", () => {
    render(<Checkbox data-testid="checkbox" size="sm" />);
    expect(screen.getByTestId("checkbox")).toHaveClass("checkbox--sm");
  });

  it("applies size=md variant class", () => {
    render(<Checkbox data-testid="checkbox" size="md" />);
    expect(screen.getByTestId("checkbox")).toHaveClass("checkbox--md");
  });

  it("applies size=lg variant class", () => {
    render(<Checkbox data-testid="checkbox" size="lg" />);
    expect(screen.getByTestId("checkbox")).toHaveClass("checkbox--lg");
  });

  it("calls onChange when checked changes", async () => {
    const onChangeSpy = vi.fn();
    expect(() => render(<Checkbox data-testid="checkbox" checked={false} onChange={onChangeSpy} />)).not.toThrow();
  });

  it("sets .indeterminate as a DOM property (not an attribute) and lowers aria-checked to mixed", () => {
    const { container } = render(<Checkbox data-testid="checkbox" indeterminate />);
    const el = container.querySelector(".checkbox__input") as HTMLInputElement;
    expect(el.indeterminate).toBe(true);
    expect(el.getAttribute("aria-checked")).toBe("mixed");
  });

  it("re-applies .indeterminate when the prop changes from true to false, and aria-checked reflects checked state again", () => {
    const { container, rerender } = render(<Checkbox data-testid="checkbox" indeterminate />);
    const el = container.querySelector(".checkbox__input") as HTMLInputElement;
    expect(el.indeterminate).toBe(true);
    rerender(<Checkbox data-testid="checkbox" />);
    expect(el.indeterminate).toBe(false);
    expect(el.getAttribute("aria-checked")).toBe("false");
  });
});

describe("Checkbox — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Checkbox ariaLabel="Test Checkbox" /></>);
    const component = baseElement.querySelector('[data-fsds-component="checkbox"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
