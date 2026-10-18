// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { ShowMore } from "../ShowMore";

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

describe("ShowMore — unit", () => {
  it("renders with default props", () => {
    render(<ShowMore data-testid="show-more"><span>content</span></ShowMore>);
    expect(screen.getByTestId("show-more")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<ShowMore data-testid="show-more"><span>content</span></ShowMore>);
    expect(screen.getByTestId("show-more")).toHaveClass("show-more");
  });

  it("merges custom className", () => {
    render(<ShowMore data-testid="show-more" className="custom"><span>content</span></ShowMore>);
    expect(screen.getByTestId("show-more")).toHaveClass("show-more", "custom");
  });

  it("calls onExpandedChange when expanded changes", async () => {
    const onExpandedChangeSpy = vi.fn();
    expect(() => render(<ShowMore data-testid="show-more" expanded={false} onExpandedChange={onExpandedChangeSpy}><span>content</span></ShowMore>)).not.toThrow();
  });
});

describe("ShowMore — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><ShowMore><span>content</span></ShowMore></>);
    const component = baseElement.querySelector('[data-fsds-component="show-more"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
describe("ShowMore — expandable behavior", () => {
  it("toggles the trigger label and expanded class in uncontrolled mode", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(
      <ShowMore
        data-testid="show-more"
        showMoreLabel="Read more"
        showLessLabel="Read less"
      >
        Long content that should become unclamped when expanded.
      </ShowMore>,
    );

    const root = screen.getByTestId("show-more");
    const trigger = screen.getByRole("button", { name: "Read more" });

    expect(root).not.toHaveClass("show-more--expanded");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);

    expect(root).toHaveClass("show-more--expanded");
    expect(screen.getByRole("button", { name: "Read less" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("reports the requested next expanded value in controlled mode", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const onExpandedChange = vi.fn();
    render(
      <ShowMore expanded={false} onExpandedChange={onExpandedChange}>
        Controlled content
      </ShowMore>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show more" }));

    expect(onExpandedChange).toHaveBeenCalledWith(true);
  });
});

// @custom:end
