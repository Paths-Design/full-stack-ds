// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Card, CardHeader, CardContent, CardFooter } from "../Card";

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

describe("Card — unit", () => {
  it("renders with default props", () => {
    render(<Card data-testid="card">content</Card>);
    expect(screen.getByTestId("card")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Card data-testid="card">content</Card>);
    expect(screen.getByTestId("card")).toHaveClass("card");
  });

  it("merges custom className", () => {
    render(<Card data-testid="card" className="custom">content</Card>);
    expect(screen.getByTestId("card")).toHaveClass("card", "custom");
  });

  it("has the correct ARIA role", () => {
    render(<Card data-testid="card">content</Card>);
    expect(screen.getByTestId("card")).toHaveAttribute("role", "group");
  });

  it("applies density=default variant class", () => {
    render(<Card data-testid="card" density="default">content</Card>);
    expect(screen.getByTestId("card")).toHaveClass("card--default");
  });

  it("applies density=inset variant class", () => {
    render(<Card data-testid="card" density="inset">content</Card>);
    expect(screen.getByTestId("card")).toHaveClass("card--inset");
  });
});

describe("Card — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Card aria-label="Test Card">content</Card></>);
    const component = baseElement.querySelector('[data-fsds-component="card"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
describe("Card — interactive affordance", () => {
  it("applies the interactive modifier only when requested", () => {
    render(
      <>
        <Card data-testid="static-card">Static</Card>
        <Card data-testid="interactive-card" interactive>
          Interactive
        </Card>
      </>,
    );

    expect(screen.getByTestId("static-card")).not.toHaveClass("card--interactive");
    expect(screen.getByTestId("interactive-card")).toHaveClass("card--interactive");
  });
});

describe("Card — landmarks", () => {
  // A card's header and footer belong to the card, not the page: two cards
  // on one page must not contribute two banner/contentinfo landmarks.
  it("exposes no banner or contentinfo landmark for two cards with headers and footers", async () => {
    const { container } = render(
      <>
        <Card aria-label="First"><CardHeader>One</CardHeader><CardContent>Body</CardContent><CardFooter>Foot</CardFooter></Card>
        <Card aria-label="Second"><CardHeader>Two</CardHeader><CardContent>Body</CardContent><CardFooter>Foot</CardFooter></Card>
      </>,
    );
    expect(container.querySelectorAll(".card__header")).toHaveLength(2);
    expect(container.querySelectorAll("header, footer, [role='banner'], [role='contentinfo']")).toHaveLength(0);
    const results = await axe(document.documentElement, { runOnly: ["landmark-no-duplicate-banner", "landmark-no-duplicate-contentinfo", "landmark-banner-is-top-level", "landmark-contentinfo-is-top-level"] }) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

// @custom:end
