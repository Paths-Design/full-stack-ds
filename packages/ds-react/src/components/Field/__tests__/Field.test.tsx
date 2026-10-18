// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Field } from "../Field";

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

describe("Field — unit", () => {
  it("renders with default props", () => {
    render(<Field data-testid="field" name={"placeholder"} />);
    expect(screen.getByTestId("field")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Field data-testid="field" name={"placeholder"} />);
    expect(screen.getByTestId("field")).toHaveClass("field");
  });

  it("merges custom className", () => {
    render(<Field data-testid="field" name={"placeholder"} className="custom" />);
    expect(screen.getByTestId("field")).toHaveClass("field", "custom");
  });

  it("has the correct ARIA role", () => {
    render(<Field data-testid="field" name={"placeholder"} />);
    expect(screen.getByTestId("field")).toHaveAttribute("role", "group");
  });

  it("applies status=idle variant class", () => {
    render(<Field data-testid="field" name={"placeholder"} status="idle" />);
    expect(screen.getByTestId("field")).toHaveClass("field--idle");
  });

  it("applies status=validating variant class", () => {
    render(<Field data-testid="field" name={"placeholder"} status="validating" />);
    expect(screen.getByTestId("field")).toHaveClass("field--validating");
  });

  it("applies status=valid variant class", () => {
    render(<Field data-testid="field" name={"placeholder"} status="valid" />);
    expect(screen.getByTestId("field")).toHaveClass("field--valid");
  });

  it("applies status=invalid variant class", () => {
    render(<Field data-testid="field" name={"placeholder"} status="invalid" />);
    expect(screen.getByTestId("field")).toHaveClass("field--invalid");
  });

  it("calls onChange when value changes", async () => {
    const onChangeSpy = vi.fn();
    expect(() => render(<Field data-testid="field" name={"placeholder"} value={""} onChange={onChangeSpy} />)).not.toThrow();
  });
});

describe("Field — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Field slots={{ "label": <span>Test Field label</span> }} name={"placeholder"} /></>);
    const component = baseElement.querySelector('[data-fsds-component="field"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
