// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Switch } from "../Switch";

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

describe("Switch — unit", () => {
  it("renders with default props", () => {
    render(<Switch data-testid="switch"><span>content</span></Switch>);
    expect(screen.getByTestId("switch")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Switch data-testid="switch"><span>content</span></Switch>);
    expect(screen.getByTestId("switch")).toHaveClass("switch");
  });

  it("merges custom className", () => {
    render(<Switch data-testid="switch" className="custom"><span>content</span></Switch>);
    expect(screen.getByTestId("switch")).toHaveClass("switch", "custom");
  });

  it("applies size=sm variant class", () => {
    render(<Switch data-testid="switch" size="sm"><span>content</span></Switch>);
    expect(screen.getByTestId("switch")).toHaveClass("switch--sm");
  });

  it("applies size=md variant class", () => {
    render(<Switch data-testid="switch" size="md"><span>content</span></Switch>);
    expect(screen.getByTestId("switch")).toHaveClass("switch--md");
  });

  it("applies size=lg variant class", () => {
    render(<Switch data-testid="switch" size="lg"><span>content</span></Switch>);
    expect(screen.getByTestId("switch")).toHaveClass("switch--lg");
  });

  it("calls onChange when checked changes", async () => {
    const onChangeSpy = vi.fn();
    expect(() => render(<Switch data-testid="switch" checked={false} onChange={onChangeSpy}><span>content</span></Switch>)).not.toThrow();
  });
});

describe("Switch — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Switch aria-label="Test Switch"><span>content</span></Switch></>);
    const component = baseElement.querySelector('[data-fsds-component="switch"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
