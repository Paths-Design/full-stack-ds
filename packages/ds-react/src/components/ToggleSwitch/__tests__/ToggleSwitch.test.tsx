// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { ToggleSwitch } from "../ToggleSwitch";

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

describe("ToggleSwitch — unit", () => {
  it("renders with default props", () => {
    render(<ToggleSwitch data-testid="toggle-switch" />);
    expect(screen.getByTestId("toggle-switch")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<ToggleSwitch data-testid="toggle-switch" />);
    expect(screen.getByTestId("toggle-switch")).toHaveClass("toggle-switch");
  });

  it("merges custom className", () => {
    render(<ToggleSwitch data-testid="toggle-switch" className="custom" />);
    expect(screen.getByTestId("toggle-switch")).toHaveClass("toggle-switch", "custom");
  });

  it("applies size=small variant class", () => {
    render(<ToggleSwitch data-testid="toggle-switch" size="small" />);
    expect(screen.getByTestId("toggle-switch")).toHaveClass("toggle-switch--small");
  });

  it("applies size=medium variant class", () => {
    render(<ToggleSwitch data-testid="toggle-switch" size="medium" />);
    expect(screen.getByTestId("toggle-switch")).toHaveClass("toggle-switch--medium");
  });

  it("applies size=large variant class", () => {
    render(<ToggleSwitch data-testid="toggle-switch" size="large" />);
    expect(screen.getByTestId("toggle-switch")).toHaveClass("toggle-switch--large");
  });

  it("calls onChange when checked changes", async () => {
    const onChangeSpy = vi.fn();
    render(<ToggleSwitch data-testid="toggle-switch" onChange={onChangeSpy} />);
    await userEvent.setup().click(screen.getByTestId("toggle-switch"));
    expect(onChangeSpy).toHaveBeenCalled();
  });
});

describe("ToggleSwitch — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><ToggleSwitch ariaLabel="Test ToggleSwitch" /></>);
    const component = baseElement.querySelector('[data-fsds-component="toggle-switch"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
