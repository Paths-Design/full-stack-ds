// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Stat } from "../Stat";

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

describe("Stat — unit", () => {
  it("renders with default props", () => {
    render(<Stat data-testid="stat"><span>content</span></Stat>);
    expect(screen.getByTestId("stat")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Stat data-testid="stat"><span>content</span></Stat>);
    expect(screen.getByTestId("stat")).toHaveClass("stat");
  });

  it("merges custom className", () => {
    render(<Stat data-testid="stat" className="custom"><span>content</span></Stat>);
    expect(screen.getByTestId("stat")).toHaveClass("stat", "custom");
  });

  it("applies size=sm variant class", () => {
    render(<Stat data-testid="stat" size="sm"><span>content</span></Stat>);
    expect(screen.getByTestId("stat")).toHaveClass("stat--sm");
  });

  it("applies size=md variant class", () => {
    render(<Stat data-testid="stat" size="md"><span>content</span></Stat>);
    expect(screen.getByTestId("stat")).toHaveClass("stat--md");
  });

  it("applies size=lg variant class", () => {
    render(<Stat data-testid="stat" size="lg"><span>content</span></Stat>);
    expect(screen.getByTestId("stat")).toHaveClass("stat--lg");
  });

  it("applies trend=up variant class", () => {
    render(<Stat data-testid="stat" trend="up"><span>content</span></Stat>);
    expect(screen.getByTestId("stat")).toHaveClass("stat--up");
  });

  it("applies trend=down variant class", () => {
    render(<Stat data-testid="stat" trend="down"><span>content</span></Stat>);
    expect(screen.getByTestId("stat")).toHaveClass("stat--down");
  });

  it("applies trend=neutral variant class", () => {
    render(<Stat data-testid="stat" trend="neutral"><span>content</span></Stat>);
    expect(screen.getByTestId("stat")).toHaveClass("stat--neutral");
  });
});

describe("Stat — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Stat><span>content</span></Stat></>);
    const component = baseElement.querySelector('[data-fsds-component="stat"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
