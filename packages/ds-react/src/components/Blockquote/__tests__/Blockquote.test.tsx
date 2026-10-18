// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Blockquote } from "../Blockquote";

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

describe("Blockquote — unit", () => {
  it("renders with default props", () => {
    render(<Blockquote data-testid="blockquote"><span>content</span></Blockquote>);
    expect(screen.getByTestId("blockquote")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Blockquote data-testid="blockquote"><span>content</span></Blockquote>);
    expect(screen.getByTestId("blockquote")).toHaveClass("blockquote");
  });

  it("merges custom className", () => {
    render(<Blockquote data-testid="blockquote" className="custom"><span>content</span></Blockquote>);
    expect(screen.getByTestId("blockquote")).toHaveClass("blockquote", "custom");
  });

  it("applies variant=default variant class", () => {
    render(<Blockquote data-testid="blockquote" variant="default"><span>content</span></Blockquote>);
    expect(screen.getByTestId("blockquote")).toHaveClass("blockquote--default");
  });

  it("applies variant=bordered variant class", () => {
    render(<Blockquote data-testid="blockquote" variant="bordered"><span>content</span></Blockquote>);
    expect(screen.getByTestId("blockquote")).toHaveClass("blockquote--bordered");
  });

  it("applies variant=highlighted variant class", () => {
    render(<Blockquote data-testid="blockquote" variant="highlighted"><span>content</span></Blockquote>);
    expect(screen.getByTestId("blockquote")).toHaveClass("blockquote--highlighted");
  });

  it("applies size=sm variant class", () => {
    render(<Blockquote data-testid="blockquote" size="sm"><span>content</span></Blockquote>);
    expect(screen.getByTestId("blockquote")).toHaveClass("blockquote--sm");
  });

  it("applies size=md variant class", () => {
    render(<Blockquote data-testid="blockquote" size="md"><span>content</span></Blockquote>);
    expect(screen.getByTestId("blockquote")).toHaveClass("blockquote--md");
  });

  it("applies size=lg variant class", () => {
    render(<Blockquote data-testid="blockquote" size="lg"><span>content</span></Blockquote>);
    expect(screen.getByTestId("blockquote")).toHaveClass("blockquote--lg");
  });
});

describe("Blockquote — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Blockquote><span>content</span></Blockquote></>);
    const component = baseElement.querySelector('[data-fsds-component="blockquote"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
