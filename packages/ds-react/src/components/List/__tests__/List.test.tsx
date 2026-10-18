// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { List } from "../List";

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

describe("List — unit", () => {
  it("renders with default props", () => {
    render(<List data-testid="list"><li>content</li></List>);
    expect(screen.getByTestId("list")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<List data-testid="list"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list");
  });

  it("merges custom className", () => {
    render(<List data-testid="list" className="custom"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list", "custom");
  });

  it("applies as=ul variant class", () => {
    render(<List data-testid="list" as="ul"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--ul");
  });

  it("applies as=ol variant class", () => {
    render(<List data-testid="list" as="ol"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--ol");
  });

  it("applies as=dl variant class", () => {
    render(<List data-testid="list" as="dl"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--dl");
  });

  it("applies variant=default variant class", () => {
    render(<List data-testid="list" variant="default"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--variant-default");
  });

  it("applies variant=unstyled variant class", () => {
    render(<List data-testid="list" variant="unstyled"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--variant-unstyled");
  });

  it("applies variant=inline variant class", () => {
    render(<List data-testid="list" variant="inline"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--variant-inline");
  });

  it("applies variant=divided variant class", () => {
    render(<List data-testid="list" variant="divided"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--variant-divided");
  });

  it("applies variant=spaced variant class", () => {
    render(<List data-testid="list" variant="spaced"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--variant-spaced");
  });

  it("applies marker=default variant class", () => {
    render(<List data-testid="list" marker="default"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--marker-default");
  });

  it("applies marker=none variant class", () => {
    render(<List data-testid="list" marker="none"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--marker-none");
  });

  it("applies marker=disc variant class", () => {
    render(<List data-testid="list" marker="disc"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--marker-disc");
  });

  it("applies marker=circle variant class", () => {
    render(<List data-testid="list" marker="circle"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--marker-circle");
  });

  it("applies marker=square variant class", () => {
    render(<List data-testid="list" marker="square"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--marker-square");
  });

  it("applies marker=decimal variant class", () => {
    render(<List data-testid="list" marker="decimal"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--marker-decimal");
  });

  it("applies marker=alpha variant class", () => {
    render(<List data-testid="list" marker="alpha"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--marker-alpha");
  });

  it("applies marker=roman variant class", () => {
    render(<List data-testid="list" marker="roman"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--marker-roman");
  });

  it("applies spacing=none variant class", () => {
    render(<List data-testid="list" spacing="none"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--spacing-none");
  });

  it("applies spacing=sm variant class", () => {
    render(<List data-testid="list" spacing="sm"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--spacing-sm");
  });

  it("applies spacing=md variant class", () => {
    render(<List data-testid="list" spacing="md"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--spacing-md");
  });

  it("applies spacing=lg variant class", () => {
    render(<List data-testid="list" spacing="lg"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--spacing-lg");
  });

  it("applies size=sm variant class", () => {
    render(<List data-testid="list" size="sm"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--size-sm");
  });

  it("applies size=md variant class", () => {
    render(<List data-testid="list" size="md"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--size-md");
  });

  it("applies size=lg variant class", () => {
    render(<List data-testid="list" size="lg"><li>content</li></List>);
    expect(screen.getByTestId("list")).toHaveClass("list--size-lg");
  });
});

describe("List — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><List aria-label="Test List"><li>content</li></List></>);
    const component = baseElement.querySelector('[data-fsds-component="list"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
