// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Skeleton } from "../Skeleton";

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

describe("Skeleton — unit", () => {
  it("renders with default props", () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("skeleton");
  });

  it("merges custom className", () => {
    render(<Skeleton data-testid="skeleton" className="custom" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("skeleton", "custom");
  });

  it("applies variant=block variant class", () => {
    render(<Skeleton data-testid="skeleton" variant="block" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("skeleton--block");
  });

  it("applies variant=text variant class", () => {
    render(<Skeleton data-testid="skeleton" variant="text" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("skeleton--text");
  });

  it("applies variant=avatar variant class", () => {
    render(<Skeleton data-testid="skeleton" variant="avatar" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("skeleton--avatar");
  });

  it("applies variant=media variant class", () => {
    render(<Skeleton data-testid="skeleton" variant="media" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("skeleton--media");
  });

  it("applies variant=dataviz variant class", () => {
    render(<Skeleton data-testid="skeleton" variant="dataviz" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("skeleton--dataviz");
  });

  it("applies variant=actions variant class", () => {
    render(<Skeleton data-testid="skeleton" variant="actions" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("skeleton--actions");
  });

  it("applies animate=shimmer variant class", () => {
    render(<Skeleton data-testid="skeleton" animate="shimmer" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("skeleton--shimmer");
  });

  it("applies animate=wipe variant class", () => {
    render(<Skeleton data-testid="skeleton" animate="wipe" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("skeleton--wipe");
  });

  it("applies animate=pulse variant class", () => {
    render(<Skeleton data-testid="skeleton" animate="pulse" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("skeleton--pulse");
  });

  it("applies animate=none variant class", () => {
    render(<Skeleton data-testid="skeleton" animate="none" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("skeleton--none");
  });

  it("applies density=compact variant class", () => {
    render(<Skeleton data-testid="skeleton" density="compact" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("skeleton--compact");
  });

  it("applies density=regular variant class", () => {
    render(<Skeleton data-testid="skeleton" density="regular" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("skeleton--regular");
  });

  it("applies density=spacious variant class", () => {
    render(<Skeleton data-testid="skeleton" density="spacious" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("skeleton--spacious");
  });
});

describe("Skeleton — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Skeleton ariaLabel="Test Skeleton" decorative={false} /></>);
    const component = baseElement.querySelector('[data-fsds-component="skeleton"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
describe("Skeleton — decorative semantics", () => {
  it("hides decorative skeletons from assistive tech by default", () => {
    render(<Skeleton data-testid="skeleton" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveAttribute("role", "presentation");
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(skeleton).toHaveAttribute("aria-busy", "false");
  });

  it("announces non-decorative loading placeholders as status", () => {
    render(<Skeleton data-testid="skeleton" decorative={false} ariaLabel="Loading profile" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveAttribute("role", "status");
    expect(skeleton).toHaveAttribute("aria-hidden", "false");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton).toHaveAttribute("aria-label", "Loading profile");
  });
});

// @custom:end
