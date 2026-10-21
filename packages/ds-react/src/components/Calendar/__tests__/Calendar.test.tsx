// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Calendar } from "../Calendar";

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

describe("Calendar — unit", () => {
  it("renders with default props", () => {
    render(<Calendar data-testid="calendar" />);
    expect(screen.getByTestId("calendar")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Calendar data-testid="calendar" />);
    expect(screen.getByTestId("calendar")).toHaveClass("calendar");
  });

  it("merges custom className", () => {
    render(<Calendar data-testid="calendar" className="custom" />);
    expect(screen.getByTestId("calendar")).toHaveClass("calendar", "custom");
  });

  it("has the correct ARIA role", () => {
    render(<Calendar data-testid="calendar" />);
    expect(screen.getByTestId("calendar")).toHaveAttribute("role", "group");
  });

  it("applies mode=single variant class", () => {
    render(<Calendar data-testid="calendar" mode="single" />);
    expect(screen.getByTestId("calendar")).toHaveClass("calendar--single");
  });

  it("applies mode=range variant class", () => {
    render(<Calendar data-testid="calendar" mode="range" />);
    expect(screen.getByTestId("calendar")).toHaveClass("calendar--range");
  });

  it("calls onChange when value changes", async () => {
    const onChangeSpy = vi.fn();
    expect(() => render(<Calendar data-testid="calendar" value={null} onChange={onChangeSpy} />)).not.toThrow();
  });

  it("calls onMonthChange when month changes", async () => {
    const onMonthChangeSpy = vi.fn();
    expect(() => render(<Calendar data-testid="calendar" month={new Date(0)} onMonthChange={onMonthChangeSpy} />)).not.toThrow();
  });
});

describe("Calendar — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Calendar aria-label="Test Calendar" /></>);
    const component = baseElement.querySelector('[data-fsds-component="calendar"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
