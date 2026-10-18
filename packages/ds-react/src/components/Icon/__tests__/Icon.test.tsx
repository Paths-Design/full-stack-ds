// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Icon } from "../Icon";

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

describe("Icon — unit", () => {
  it("renders with default props", () => {
    render(<Icon data-testid="icon" name={"placeholder"} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Icon data-testid="icon" name={"placeholder"} />);
    expect(screen.getByTestId("icon")).toHaveClass("icon");
  });

  it("merges custom className", () => {
    render(<Icon data-testid="icon" name={"placeholder"} className="custom" />);
    expect(screen.getByTestId("icon")).toHaveClass("icon", "custom");
  });

  it("applies size=sm variant class", () => {
    render(<Icon data-testid="icon" name={"placeholder"} size="sm" />);
    expect(screen.getByTestId("icon")).toHaveClass("icon--sm");
  });

  it("applies size=md variant class", () => {
    render(<Icon data-testid="icon" name={"placeholder"} size="md" />);
    expect(screen.getByTestId("icon")).toHaveClass("icon--md");
  });

  it("applies size=lg variant class", () => {
    render(<Icon data-testid="icon" name={"placeholder"} size="lg" />);
    expect(screen.getByTestId("icon")).toHaveClass("icon--lg");
  });

  it("applies size=xl variant class", () => {
    render(<Icon data-testid="icon" name={"placeholder"} size="xl" />);
    expect(screen.getByTestId("icon")).toHaveClass("icon--xl");
  });
});

describe("Icon — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Icon ariaLabel="Test Icon" decorative={false} name={"placeholder"} /></>);
    const component = baseElement.querySelector('[data-fsds-component="icon"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
describe("Icon — authored accessibility policy", () => {
  it("defaults an unlabeled icon to decorative presentation semantics", () => {
    render(<Icon data-testid="default-icon" name="check" />);

    const icon = screen.getByTestId("default-icon");
    expect(icon).toHaveAttribute("role", "presentation");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});

describe("Icon — catalog glyph rendering (ICON-CATALOG-RUNTIME-DELIVERY-01)", () => {
  it("renders the authored 16-grid check glyph at size=sm", () => {
    const { container } = render(<Icon name="check" size="sm" />);
    const svg = container.querySelector('svg[data-fsds-icon="check"]');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("viewBox")).toBe("0 0 16 16");
    expect(svg!.getAttribute("width")).toBe("16");
    expect(svg!.getAttribute("height")).toBe("16");
    const paths = svg!.querySelectorAll("path");
    expect(paths).toHaveLength(1);
    // the exact authored path data, not just element presence
    expect(paths[0].getAttribute("d")).toBe("M3.5 8.5L6.5 11.5L12.5 4.5");
    expect(paths[0].getAttribute("stroke")).toBe("currentColor");
    expect(paths[0].getAttribute("stroke-linecap")).toBe("round");
  });

  it("floor-selects the 16-grid variant at size=md but renders at 20px", () => {
    // md=20px has no authored variant; selection must pick the largest
    // authored size <= 20 (the 16 grid), while width/height honor the
    // requested 20px — viewBox scaling, never synthesized geometry.
    const { container } = render(<Icon name="check" size="md" />);
    const svg = container.querySelector('svg[data-fsds-icon="check"]');
    expect(svg!.getAttribute("viewBox")).toBe("0 0 16 16");
    expect(svg!.getAttribute("width")).toBe("20");
    expect(svg!.getAttribute("height")).toBe("20");
  });

  it("selects the authored 24-grid variant at size=lg", () => {
    const { container } = render(<Icon name="check" size="lg" />);
    const svg = container.querySelector('svg[data-fsds-icon="check"]');
    expect(svg!.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg!.getAttribute("width")).toBe("24");
    expect(svg!.querySelector("path")!.getAttribute("d")).toBe("M5 12.5L9.5 17L19 6.5");
  });

  it("renders every authored path of a multi-path glyph in order", () => {
    const { container } = render(<Icon name="triangle-alert" size="sm" />);
    const svg = container.querySelector('svg[data-fsds-icon="triangle-alert"]');
    const ds = [...svg!.querySelectorAll("path")].map((p) => p.getAttribute("d"));
    expect(ds).toEqual([
      "M8 2.25L14.5 13.25H1.5L8 2.25Z",
      "M8 6.5V9",
      "M8 11.25H8.01",
    ]);
  });

  it("renders no svg at all for an unknown icon name", () => {
    const { container } = render(<Icon data-testid="icon" name="does-not-exist" />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });
});
// @custom:end
