// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { NavTree } from "../NavTree";

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

describe("NavTree — unit", () => {
  it("renders with default props", () => {
    render(<NavTree data-testid="nav-tree" label={"placeholder"}><li>content</li></NavTree>);
    expect(screen.getByTestId("nav-tree")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<NavTree data-testid="nav-tree" label={"placeholder"}><li>content</li></NavTree>);
    expect(screen.getByTestId("nav-tree")).toHaveClass("nav-tree");
  });

  it("merges custom className", () => {
    render(<NavTree data-testid="nav-tree" label={"placeholder"} className="custom"><li>content</li></NavTree>);
    expect(screen.getByTestId("nav-tree")).toHaveClass("nav-tree", "custom");
  });

  it("has the correct ARIA role", () => {
    render(<NavTree data-testid="nav-tree" label={"placeholder"}><li>content</li></NavTree>);
    expect(screen.getByTestId("nav-tree")).toHaveAttribute("role", "listitem");
  });

  it("applies iconSize=sm variant class", () => {
    render(<NavTree data-testid="nav-tree" label={"placeholder"} iconSize="sm"><li>content</li></NavTree>);
    expect(screen.getByTestId("nav-tree")).toHaveClass("nav-tree--sm");
  });

  it("applies iconSize=md variant class", () => {
    render(<NavTree data-testid="nav-tree" label={"placeholder"} iconSize="md"><li>content</li></NavTree>);
    expect(screen.getByTestId("nav-tree")).toHaveClass("nav-tree--md");
  });
});

describe("NavTree — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><ul><NavTree aria-label="Test NavTree" label={"placeholder"}><li>content</li></NavTree></ul></>);
    const component = baseElement.querySelector('[data-fsds-component="nav-tree"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
