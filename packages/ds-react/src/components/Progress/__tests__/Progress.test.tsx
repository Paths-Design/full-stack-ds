// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Progress } from "../Progress";

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

describe("Progress — unit", () => {
  it("renders with default props", () => {
    render(<Progress data-testid="progress"><span>content</span></Progress>);
    expect(screen.getByTestId("progress")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Progress data-testid="progress"><span>content</span></Progress>);
    expect(screen.getByTestId("progress")).toHaveClass("progress");
  });

  it("merges custom className", () => {
    render(<Progress data-testid="progress" className="custom"><span>content</span></Progress>);
    expect(screen.getByTestId("progress")).toHaveClass("progress", "custom");
  });

  it("has the correct ARIA role", () => {
    render(<Progress data-testid="progress"><span>content</span></Progress>);
    expect(screen.getByTestId("progress")).toHaveAttribute("role", "progressbar");
  });

  it("applies variant=linear variant class", () => {
    render(<Progress data-testid="progress" variant="linear"><span>content</span></Progress>);
    expect(screen.getByTestId("progress")).toHaveClass("progress--linear");
  });

  it("applies variant=circular variant class", () => {
    render(<Progress data-testid="progress" variant="circular"><span>content</span></Progress>);
    expect(screen.getByTestId("progress")).toHaveClass("progress--circular");
  });

  it("applies size=sm variant class", () => {
    render(<Progress data-testid="progress" size="sm"><span>content</span></Progress>);
    expect(screen.getByTestId("progress")).toHaveClass("progress--sm");
  });

  it("applies size=md variant class", () => {
    render(<Progress data-testid="progress" size="md"><span>content</span></Progress>);
    expect(screen.getByTestId("progress")).toHaveClass("progress--md");
  });

  it("applies size=lg variant class", () => {
    render(<Progress data-testid="progress" size="lg"><span>content</span></Progress>);
    expect(screen.getByTestId("progress")).toHaveClass("progress--lg");
  });

  it("applies intent=info variant class", () => {
    render(<Progress data-testid="progress" intent="info"><span>content</span></Progress>);
    expect(screen.getByTestId("progress")).toHaveClass("progress--info");
  });

  it("applies intent=success variant class", () => {
    render(<Progress data-testid="progress" intent="success"><span>content</span></Progress>);
    expect(screen.getByTestId("progress")).toHaveClass("progress--success");
  });

  it("applies intent=warning variant class", () => {
    render(<Progress data-testid="progress" intent="warning"><span>content</span></Progress>);
    expect(screen.getByTestId("progress")).toHaveClass("progress--warning");
  });

  it("applies intent=danger variant class", () => {
    render(<Progress data-testid="progress" intent="danger"><span>content</span></Progress>);
    expect(screen.getByTestId("progress")).toHaveClass("progress--danger");
  });
});

describe("Progress — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Progress label="Test Progress"><span>content</span></Progress></>);
    const component = baseElement.querySelector('[data-fsds-component="progress"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
