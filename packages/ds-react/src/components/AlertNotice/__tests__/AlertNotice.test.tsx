// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { AlertNotice } from "../AlertNotice";

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

describe("AlertNotice — unit", () => {
  it("renders with default props", () => {
    render(<AlertNotice data-testid="alert-notice"><span>content</span></AlertNotice>);
    expect(screen.getByTestId("alert-notice")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<AlertNotice data-testid="alert-notice"><span>content</span></AlertNotice>);
    expect(screen.getByTestId("alert-notice")).toHaveClass("alert-notice");
  });

  it("merges custom className", () => {
    render(<AlertNotice data-testid="alert-notice" className="custom"><span>content</span></AlertNotice>);
    expect(screen.getByTestId("alert-notice")).toHaveClass("alert-notice", "custom");
  });

  it("has the correct ARIA role", () => {
    render(<AlertNotice data-testid="alert-notice"><span>content</span></AlertNotice>);
    expect(screen.getByTestId("alert-notice")).toHaveAttribute("role", "alert");
  });

  it("applies status=info variant class", () => {
    render(<AlertNotice data-testid="alert-notice" status="info"><span>content</span></AlertNotice>);
    expect(screen.getByTestId("alert-notice")).toHaveClass("alert-notice--info");
  });

  it("applies status=success variant class", () => {
    render(<AlertNotice data-testid="alert-notice" status="success"><span>content</span></AlertNotice>);
    expect(screen.getByTestId("alert-notice")).toHaveClass("alert-notice--success");
  });

  it("applies status=warning variant class", () => {
    render(<AlertNotice data-testid="alert-notice" status="warning"><span>content</span></AlertNotice>);
    expect(screen.getByTestId("alert-notice")).toHaveClass("alert-notice--warning");
  });

  it("applies status=error variant class", () => {
    render(<AlertNotice data-testid="alert-notice" status="error"><span>content</span></AlertNotice>);
    expect(screen.getByTestId("alert-notice")).toHaveClass("alert-notice--error");
  });

  it("applies level=page variant class", () => {
    render(<AlertNotice data-testid="alert-notice" level="page"><span>content</span></AlertNotice>);
    expect(screen.getByTestId("alert-notice")).toHaveClass("alert-notice--page");
  });

  it("applies level=section variant class", () => {
    render(<AlertNotice data-testid="alert-notice" level="section"><span>content</span></AlertNotice>);
    expect(screen.getByTestId("alert-notice")).toHaveClass("alert-notice--section");
  });

  it("applies level=inline variant class", () => {
    render(<AlertNotice data-testid="alert-notice" level="inline"><span>content</span></AlertNotice>);
    expect(screen.getByTestId("alert-notice")).toHaveClass("alert-notice--inline");
  });
});

describe("AlertNotice — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><AlertNotice dismissLabel="Test AlertNotice"><span>content</span></AlertNotice></>);
    const component = baseElement.querySelector('[data-fsds-component="alert-notice"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
