// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Details } from "../Details";

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

describe("Details — unit", () => {
  it("renders with default props", () => {
    render(<Details data-testid="details" summary={"placeholder"} open={true}><span>content</span></Details>);
    expect(screen.getByTestId("details")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Details data-testid="details" summary={"placeholder"} open={true}><span>content</span></Details>);
    expect(screen.getByTestId("details")).toHaveClass("details");
  });

  it("merges custom className", () => {
    render(<Details data-testid="details" summary={"placeholder"} className="custom" open={true}><span>content</span></Details>);
    expect(screen.getByTestId("details")).toHaveClass("details", "custom");
  });

  it("applies variant=default variant class", () => {
    render(<Details data-testid="details" summary={"placeholder"} variant="default" open={true}><span>content</span></Details>);
    expect(screen.getByTestId("details")).toHaveClass("details--default");
  });

  it("applies variant=inline variant class", () => {
    render(<Details data-testid="details" summary={"placeholder"} variant="inline" open={true}><span>content</span></Details>);
    expect(screen.getByTestId("details")).toHaveClass("details--inline");
  });

  it("applies variant=compact variant class", () => {
    render(<Details data-testid="details" summary={"placeholder"} variant="compact" open={true}><span>content</span></Details>);
    expect(screen.getByTestId("details")).toHaveClass("details--compact");
  });

  it("applies icon=left variant class", () => {
    render(<Details data-testid="details" summary={"placeholder"} icon="left" open={true}><span>content</span></Details>);
    expect(screen.getByTestId("details")).toHaveClass("details--left");
  });

  it("applies icon=right variant class", () => {
    render(<Details data-testid="details" summary={"placeholder"} icon="right" open={true}><span>content</span></Details>);
    expect(screen.getByTestId("details")).toHaveClass("details--right");
  });

  it("applies icon=none variant class", () => {
    render(<Details data-testid="details" summary={"placeholder"} icon="none" open={true}><span>content</span></Details>);
    expect(screen.getByTestId("details")).toHaveClass("details--none");
  });

  it("calls onOpenChange when open changes", async () => {
    const onOpenChangeSpy = vi.fn();
    expect(() => render(<Details data-testid="details" summary={"placeholder"} open={false} onOpenChange={onOpenChangeSpy}><span>content</span></Details>)).not.toThrow();
  });
});

describe("Details — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Details aria-label="Test Details" summary={"placeholder"} open={true}><span>content</span></Details></>);
    const component = baseElement.querySelector('[data-fsds-component="details"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
