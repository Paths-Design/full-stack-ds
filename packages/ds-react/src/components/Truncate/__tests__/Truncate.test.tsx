// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Truncate } from "../Truncate";

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

describe("Truncate — unit", () => {
  it("renders with default props", () => {
    render(<Truncate data-testid="truncate"><span>content</span></Truncate>);
    expect(screen.getByTestId("truncate")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Truncate data-testid="truncate"><span>content</span></Truncate>);
    expect(screen.getByTestId("truncate")).toHaveClass("truncate");
  });

  it("merges custom className", () => {
    render(<Truncate data-testid="truncate" className="custom"><span>content</span></Truncate>);
    expect(screen.getByTestId("truncate")).toHaveClass("truncate", "custom");
  });

  it("calls onExpandedChange when expanded changes", async () => {
    const onExpandedChangeSpy = vi.fn();
    expect(() => render(<Truncate data-testid="truncate" expanded={false} onExpandedChange={onExpandedChangeSpy}><span>content</span></Truncate>)).not.toThrow();
  });
});

describe("Truncate — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Truncate><span>content</span></Truncate></>);
    const component = baseElement.querySelector('[data-fsds-component="truncate"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
describe("Truncate — expandable behavior", () => {
  it("toggles the toggle label and expanded class in uncontrolled mode", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(
      <Truncate
        data-testid="truncate"
        expandable
        expandText="Expand"
        collapseText="Collapse"
      >
        Long content that should become unclamped when expanded.
      </Truncate>,
    );

    const root = screen.getByTestId("truncate");
    const toggle = screen.getByRole("button", { name: "Expand" });

    expect(root).not.toHaveClass("truncate--expanded");
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);

    expect(root).toHaveClass("truncate--expanded");
    expect(screen.getByRole("button", { name: "Collapse" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("reports the requested next expanded value in controlled mode", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const onExpandedChange = vi.fn();
    render(
      <Truncate expanded={false} onExpandedChange={onExpandedChange} expandable>
        Controlled content
      </Truncate>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show more" }));

    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });
});

// @custom:end
