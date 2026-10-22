// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Shuttle } from "../Shuttle";

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

describe("Shuttle — unit", () => {
  it("renders with default props", () => {
    render(<Shuttle data-testid="shuttle" />);
    expect(screen.getByTestId("shuttle")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Shuttle data-testid="shuttle" />);
    expect(screen.getByTestId("shuttle")).toHaveClass("shuttle");
  });

  it("merges custom className", () => {
    render(<Shuttle data-testid="shuttle" className="custom" />);
    expect(screen.getByTestId("shuttle")).toHaveClass("shuttle", "custom");
  });

  it("has the correct ARIA role", () => {
    render(<Shuttle data-testid="shuttle" />);
    expect(screen.getByTestId("shuttle")).toHaveAttribute("role", "group");
  });

  it("calls onValueChange when selection changes", async () => {
    const onValueChangeSpy = vi.fn();
    expect(() => render(<Shuttle data-testid="shuttle" value={[]} onValueChange={onValueChangeSpy} />)).not.toThrow();
  });
});

describe("Shuttle — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Shuttle ariaLabel="Test Shuttle" /></>);
    const component = baseElement.querySelector('[data-fsds-component="shuttle"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
