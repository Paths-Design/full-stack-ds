// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Badge } from "../Badge";

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

describe("Badge — unit", () => {
  it("renders with default props", () => {
    render(<Badge data-testid="badge"><span>content</span></Badge>);
    expect(screen.getByTestId("badge")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Badge data-testid="badge"><span>content</span></Badge>);
    expect(screen.getByTestId("badge")).toHaveClass("badge");
  });

  it("merges custom className", () => {
    render(<Badge data-testid="badge" className="custom"><span>content</span></Badge>);
    expect(screen.getByTestId("badge")).toHaveClass("badge", "custom");
  });

  it("applies variant=default variant class", () => {
    render(<Badge data-testid="badge" variant="default"><span>content</span></Badge>);
    expect(screen.getByTestId("badge")).toHaveClass("badge--default");
  });

  it("applies variant=status variant class", () => {
    render(<Badge data-testid="badge" variant="status"><span>content</span></Badge>);
    expect(screen.getByTestId("badge")).toHaveClass("badge--status");
  });

  it("applies variant=counter variant class", () => {
    render(<Badge data-testid="badge" variant="counter"><span>content</span></Badge>);
    expect(screen.getByTestId("badge")).toHaveClass("badge--counter");
  });

  it("applies variant=tag variant class", () => {
    render(<Badge data-testid="badge" variant="tag"><span>content</span></Badge>);
    expect(screen.getByTestId("badge")).toHaveClass("badge--tag");
  });

  it("applies intent=info variant class", () => {
    render(<Badge data-testid="badge" intent="info"><span>content</span></Badge>);
    expect(screen.getByTestId("badge")).toHaveClass("badge--info");
  });

  it("applies intent=success variant class", () => {
    render(<Badge data-testid="badge" intent="success"><span>content</span></Badge>);
    expect(screen.getByTestId("badge")).toHaveClass("badge--success");
  });

  it("applies intent=warning variant class", () => {
    render(<Badge data-testid="badge" intent="warning"><span>content</span></Badge>);
    expect(screen.getByTestId("badge")).toHaveClass("badge--warning");
  });

  it("applies intent=danger variant class", () => {
    render(<Badge data-testid="badge" intent="danger"><span>content</span></Badge>);
    expect(screen.getByTestId("badge")).toHaveClass("badge--danger");
  });

  it("applies size=sm variant class", () => {
    render(<Badge data-testid="badge" size="sm"><span>content</span></Badge>);
    expect(screen.getByTestId("badge")).toHaveClass("badge--sm");
  });

  it("applies size=md variant class", () => {
    render(<Badge data-testid="badge" size="md"><span>content</span></Badge>);
    expect(screen.getByTestId("badge")).toHaveClass("badge--md");
  });

  it("applies size=lg variant class", () => {
    render(<Badge data-testid="badge" size="lg"><span>content</span></Badge>);
    expect(screen.getByTestId("badge")).toHaveClass("badge--lg");
  });
});

describe("Badge — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Badge><span>content</span></Badge></>);
    const component = baseElement.querySelector('[data-fsds-component="badge"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
