// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Button } from "../Button";

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

describe("Button — unit", () => {
  it("renders with default props", () => {
    render(<Button data-testid="button"><span>content</span></Button>);
    expect(screen.getByTestId("button")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Button data-testid="button"><span>content</span></Button>);
    expect(screen.getByTestId("button")).toHaveClass("button");
  });

  it("merges custom className", () => {
    render(<Button data-testid="button" className="custom"><span>content</span></Button>);
    expect(screen.getByTestId("button")).toHaveClass("button", "custom");
  });

  it("applies size=small variant class", () => {
    render(<Button data-testid="button" size="small"><span>content</span></Button>);
    expect(screen.getByTestId("button")).toHaveClass("button--small");
  });

  it("applies size=medium variant class", () => {
    render(<Button data-testid="button" size="medium"><span>content</span></Button>);
    expect(screen.getByTestId("button")).toHaveClass("button--medium");
  });

  it("applies size=large variant class", () => {
    render(<Button data-testid="button" size="large"><span>content</span></Button>);
    expect(screen.getByTestId("button")).toHaveClass("button--large");
  });

  it("applies variant=primary variant class", () => {
    render(<Button data-testid="button" variant="primary"><span>content</span></Button>);
    expect(screen.getByTestId("button")).toHaveClass("button--primary");
  });

  it("applies variant=secondary variant class", () => {
    render(<Button data-testid="button" variant="secondary"><span>content</span></Button>);
    expect(screen.getByTestId("button")).toHaveClass("button--secondary");
  });

  it("applies variant=tertiary variant class", () => {
    render(<Button data-testid="button" variant="tertiary"><span>content</span></Button>);
    expect(screen.getByTestId("button")).toHaveClass("button--tertiary");
  });

  it("applies variant=ghost variant class", () => {
    render(<Button data-testid="button" variant="ghost"><span>content</span></Button>);
    expect(screen.getByTestId("button")).toHaveClass("button--ghost");
  });

  it("applies variant=destructive variant class", () => {
    render(<Button data-testid="button" variant="destructive"><span>content</span></Button>);
    expect(screen.getByTestId("button")).toHaveClass("button--destructive");
  });

  it("applies variant=outline variant class", () => {
    render(<Button data-testid="button" variant="outline"><span>content</span></Button>);
    expect(screen.getByTestId("button")).toHaveClass("button--outline");
  });
});

describe("Button — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Button ariaLabel="Test Button"><span>content</span></Button></>);
    const component = baseElement.querySelector('[data-fsds-component="button"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
