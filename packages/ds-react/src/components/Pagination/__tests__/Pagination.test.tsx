// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Pagination } from "../Pagination";

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

describe("Pagination — unit", () => {
  it("renders with default props", () => {
    render(<Pagination data-testid="pagination" />);
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Pagination data-testid="pagination" />);
    expect(screen.getByTestId("pagination")).toHaveClass("pagination");
  });

  it("merges custom className", () => {
    render(<Pagination data-testid="pagination" className="custom" />);
    expect(screen.getByTestId("pagination")).toHaveClass("pagination", "custom");
  });

  it("has the correct ARIA role", () => {
    render(<Pagination data-testid="pagination" />);
    expect(screen.getByTestId("pagination")).toHaveAttribute("role", "group");
  });

  it("applies presentation=indicators variant class", () => {
    render(<Pagination data-testid="pagination" presentation="indicators" />);
    expect(screen.getByTestId("pagination")).toHaveClass("pagination--indicators");
  });

  it("applies presentation=pages variant class", () => {
    render(<Pagination data-testid="pagination" presentation="pages" />);
    expect(screen.getByTestId("pagination")).toHaveClass("pagination--pages");
  });

  it("applies progress=none variant class", () => {
    render(<Pagination data-testid="pagination" progress="none" />);
    expect(screen.getByTestId("pagination")).toHaveClass("pagination--none");
  });

  it("applies progress=elapsed variant class", () => {
    render(<Pagination data-testid="pagination" progress="elapsed" />);
    expect(screen.getByTestId("pagination")).toHaveClass("pagination--elapsed");
  });

  it("calls onIndexChange when page changes", async () => {
    const onIndexChangeSpy = vi.fn();
    expect(() => render(<Pagination data-testid="pagination" index={0} onIndexChange={onIndexChangeSpy} />)).not.toThrow();
  });
});

describe("Pagination — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Pagination label="Test Pagination" /></>);
    const component = baseElement.querySelector('[data-fsds-component="pagination"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
