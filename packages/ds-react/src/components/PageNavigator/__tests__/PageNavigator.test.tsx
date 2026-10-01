// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { PageNavigator } from "../PageNavigator";

declare module "vitest" {
  interface Assertion<T> {
    toHaveNoViolations(): void;
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

describe("PageNavigator — unit", () => {
  it("renders with default props", () => {
    render(<PageNavigator data-testid="page-navigator" />);
    expect(screen.getByTestId("page-navigator")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<PageNavigator data-testid="page-navigator" />);
    expect(screen.getByTestId("page-navigator")).toHaveClass("page-navigator");
  });

  it("merges custom className", () => {
    render(<PageNavigator data-testid="page-navigator" className="custom" />);
    expect(screen.getByTestId("page-navigator")).toHaveClass("page-navigator", "custom");
  });

  it("has the correct ARIA role", () => {
    render(<PageNavigator data-testid="page-navigator" />);
    expect(screen.getByTestId("page-navigator")).toHaveAttribute("role", "group");
  });

  it("calls onIndexChange when page changes", async () => {
    const onIndexChangeSpy = vi.fn();
    expect(() => render(<PageNavigator data-testid="page-navigator" index={0} onIndexChange={onIndexChangeSpy} />)).not.toThrow();
  });
});

describe("PageNavigator — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><PageNavigator label="Test PageNavigator" /></>);
    const component = baseElement.querySelector('[data-fsds-component="page-navigator"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
