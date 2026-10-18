// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Links } from "../Links";

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

describe("Links — unit", () => {
  it("renders with default props", () => {
    render(<Links data-testid="links"><span>content</span></Links>);
    expect(screen.getByTestId("links")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Links data-testid="links"><span>content</span></Links>);
    expect(screen.getByTestId("links")).toHaveClass("links");
  });

  it("merges custom className", () => {
    render(<Links data-testid="links" className="custom"><span>content</span></Links>);
    expect(screen.getByTestId("links")).toHaveClass("links", "custom");
  });

  it("applies size=small variant class", () => {
    render(<Links data-testid="links" size="small"><span>content</span></Links>);
    expect(screen.getByTestId("links")).toHaveClass("links--small");
  });

  it("applies size=medium variant class", () => {
    render(<Links data-testid="links" size="medium"><span>content</span></Links>);
    expect(screen.getByTestId("links")).toHaveClass("links--medium");
  });

  it("applies size=large variant class", () => {
    render(<Links data-testid="links" size="large"><span>content</span></Links>);
    expect(screen.getByTestId("links")).toHaveClass("links--large");
  });
});

describe("Links — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Links><span>content</span></Links></>);
    const component = baseElement.querySelector('[data-fsds-component="links"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
