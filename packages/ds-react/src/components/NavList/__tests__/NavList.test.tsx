// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { NavList } from "../NavList";

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

describe("NavList — unit", () => {
  it("renders with default props", () => {
    render(<NavList data-testid="nav-list"><li>content</li></NavList>);
    expect(screen.getByTestId("nav-list")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<NavList data-testid="nav-list"><li>content</li></NavList>);
    expect(screen.getByTestId("nav-list")).toHaveClass("nav-list");
  });

  it("merges custom className", () => {
    render(<NavList data-testid="nav-list" className="custom"><li>content</li></NavList>);
    expect(screen.getByTestId("nav-list")).toHaveClass("nav-list", "custom");
  });

  it("applies orientation=vertical variant class", () => {
    render(<NavList data-testid="nav-list" orientation="vertical"><li>content</li></NavList>);
    expect(screen.getByTestId("nav-list")).toHaveClass("nav-list--vertical");
  });

  it("applies orientation=horizontal variant class", () => {
    render(<NavList data-testid="nav-list" orientation="horizontal"><li>content</li></NavList>);
    expect(screen.getByTestId("nav-list")).toHaveClass("nav-list--horizontal");
  });
});

describe("NavList — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><NavList ariaLabel="Test NavList"><li>content</li></NavList></>);
    const component = baseElement.querySelector('[data-fsds-component="nav-list"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
