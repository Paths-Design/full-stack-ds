// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { ProfileFlag } from "../ProfileFlag";

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

describe("ProfileFlag — unit", () => {
  it("renders with default props", () => {
    render(<ProfileFlag data-testid="profile-flag"><span>content</span></ProfileFlag>);
    expect(screen.getByTestId("profile-flag")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<ProfileFlag data-testid="profile-flag"><span>content</span></ProfileFlag>);
    expect(screen.getByTestId("profile-flag")).toHaveClass("profile-flag");
  });

  it("merges custom className", () => {
    render(<ProfileFlag data-testid="profile-flag" className="custom"><span>content</span></ProfileFlag>);
    expect(screen.getByTestId("profile-flag")).toHaveClass("profile-flag", "custom");
  });
});

describe("ProfileFlag — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><ProfileFlag><span>content</span></ProfileFlag></>);
    const component = baseElement.querySelector('[data-fsds-component="profile-flag"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
