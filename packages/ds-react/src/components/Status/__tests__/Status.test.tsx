// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Status } from "../Status";

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

describe("Status — unit", () => {
  it("renders with default props", () => {
    render(<Status data-testid="status" status={"info"}><span>content</span></Status>);
    expect(screen.getByTestId("status")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Status data-testid="status" status={"info"}><span>content</span></Status>);
    expect(screen.getByTestId("status")).toHaveClass("status");
  });

  it("merges custom className", () => {
    render(<Status data-testid="status" status={"info"} className="custom"><span>content</span></Status>);
    expect(screen.getByTestId("status")).toHaveClass("status", "custom");
  });

  it("applies status=info variant class", () => {
    render(<Status data-testid="status" status="info"><span>content</span></Status>);
    expect(screen.getByTestId("status")).toHaveClass("status--info");
  });

  it("applies status=success variant class", () => {
    render(<Status data-testid="status" status="success"><span>content</span></Status>);
    expect(screen.getByTestId("status")).toHaveClass("status--success");
  });

  it("applies status=warning variant class", () => {
    render(<Status data-testid="status" status="warning"><span>content</span></Status>);
    expect(screen.getByTestId("status")).toHaveClass("status--warning");
  });

  it("applies status=danger variant class", () => {
    render(<Status data-testid="status" status="danger"><span>content</span></Status>);
    expect(screen.getByTestId("status")).toHaveClass("status--danger");
  });

  it("applies status=error variant class", () => {
    render(<Status data-testid="status" status="error"><span>content</span></Status>);
    expect(screen.getByTestId("status")).toHaveClass("status--error");
  });
});

describe("Status — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Status aria-label="Test Status" status={"info"}><span>content</span></Status></>);
    const component = baseElement.querySelector('[data-fsds-component="status"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

describe("Status — composed icon", () => {
  it("renders the contract-mapped success glyph", () => {
    const { container } = render(<Status status="success">Success</Status>);
    expect(container.querySelector('svg[data-fsds-icon="check"]')).not.toBeNull();
  });

  it("renders the contract-mapped warning glyph", () => {
    const { container } = render(<Status status="warning">Warning</Status>);
    expect(
      container.querySelector('svg[data-fsds-icon="triangle-alert"]'),
    ).not.toBeNull();
  });
});

// @custom:end
