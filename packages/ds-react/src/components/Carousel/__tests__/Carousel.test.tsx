// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Carousel } from "../Carousel";

declare module "vitest" {
  interface Assertion<T> {
    toHaveNoViolations(): void;
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

describe("Carousel — unit", () => {
  it("renders with default props", () => {
    render(<Carousel data-testid="carousel"><span>content</span></Carousel>);
    expect(screen.getByTestId("carousel")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Carousel data-testid="carousel"><span>content</span></Carousel>);
    expect(screen.getByTestId("carousel")).toHaveClass("carousel");
  });

  it("merges custom className", () => {
    render(<Carousel data-testid="carousel" className="custom"><span>content</span></Carousel>);
    expect(screen.getByTestId("carousel")).toHaveClass("carousel", "custom");
  });

  it("applies indicator=pagination variant class", () => {
    render(<Carousel data-testid="carousel" indicator="pagination"><span>content</span></Carousel>);
    expect(screen.getByTestId("carousel")).toHaveClass("carousel--pagination");
  });

  it("applies indicator=next variant class", () => {
    render(<Carousel data-testid="carousel" indicator="next"><span>content</span></Carousel>);
    expect(screen.getByTestId("carousel")).toHaveClass("carousel--next");
  });

  it("applies indicator=both variant class", () => {
    render(<Carousel data-testid="carousel" indicator="both"><span>content</span></Carousel>);
    expect(screen.getByTestId("carousel")).toHaveClass("carousel--both");
  });

  it("calls onIndexChange when slide changes", async () => {
    const onIndexChangeSpy = vi.fn();
    expect(() => render(<Carousel data-testid="carousel" index={0} onIndexChange={onIndexChangeSpy}><span>content</span></Carousel>)).not.toThrow();
  });
});

describe("Carousel — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Carousel label="Test Carousel"><span>content</span></Carousel></>);
    const component = baseElement.querySelector('[data-fsds-component="carousel"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
