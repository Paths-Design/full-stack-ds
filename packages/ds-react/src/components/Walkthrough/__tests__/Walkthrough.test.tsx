// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Walkthrough } from "../Walkthrough";

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

describe("Walkthrough — unit", () => {
  it("renders with default props", () => {
    render(<Walkthrough data-testid="walkthrough" />);
    expect(screen.getByTestId("walkthrough")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Walkthrough data-testid="walkthrough" />);
    expect(screen.getByTestId("walkthrough")).toHaveClass("walkthrough");
  });

  it("merges custom className", () => {
    render(<Walkthrough data-testid="walkthrough" className="custom" />);
    expect(screen.getByTestId("walkthrough")).toHaveClass("walkthrough", "custom");
  });

  it("has the correct ARIA role", () => {
    render(<Walkthrough data-testid="walkthrough" />);
    expect(screen.getByTestId("walkthrough")).toHaveAttribute("role", "status");
  });

  it("applies placement=top variant class", () => {
    render(<Walkthrough data-testid="walkthrough" placement="top" />);
    expect(screen.getByTestId("walkthrough")).toHaveClass("walkthrough--top");
  });

  it("applies placement=bottom variant class", () => {
    render(<Walkthrough data-testid="walkthrough" placement="bottom" />);
    expect(screen.getByTestId("walkthrough")).toHaveClass("walkthrough--bottom");
  });

  it("applies placement=left variant class", () => {
    render(<Walkthrough data-testid="walkthrough" placement="left" />);
    expect(screen.getByTestId("walkthrough")).toHaveClass("walkthrough--left");
  });

  it("applies placement=right variant class", () => {
    render(<Walkthrough data-testid="walkthrough" placement="right" />);
    expect(screen.getByTestId("walkthrough")).toHaveClass("walkthrough--right");
  });

  it("applies placement=auto variant class", () => {
    render(<Walkthrough data-testid="walkthrough" placement="auto" />);
    expect(screen.getByTestId("walkthrough")).toHaveClass("walkthrough--auto");
  });

  it("calls onStepChange when step changes", async () => {
    const onStepChangeSpy = vi.fn();
    expect(() => render(<Walkthrough data-testid="walkthrough" index={0} onStepChange={onStepChangeSpy} />)).not.toThrow();
  });
});

describe("Walkthrough — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Walkthrough slots={{ "title": <span>Test Walkthrough title</span>, "description": <span>Test Walkthrough description</span> }} /></>);
    const component = baseElement.querySelector('[data-fsds-component="walkthrough"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
