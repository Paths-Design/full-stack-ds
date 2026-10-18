// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Sheet } from "../Sheet";

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

describe("Sheet — unit", () => {
  it("renders with default props", () => {
    render(<Sheet data-testid="sheet" open={true}><span>content</span></Sheet>);
    expect(screen.getByTestId("sheet")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Sheet data-testid="sheet" open={true}><span>content</span></Sheet>);
    expect(screen.getByTestId("sheet")).toHaveClass("sheet");
  });

  it("merges custom className", () => {
    render(<Sheet data-testid="sheet" className="custom" open={true}><span>content</span></Sheet>);
    expect(screen.getByTestId("sheet")).toHaveClass("sheet", "custom");
  });

  it("applies side=top variant class", () => {
    render(<Sheet data-testid="sheet" side="top" open={true}><span>content</span></Sheet>);
    expect(screen.getByTestId("sheet")).toHaveClass("sheet--top");
  });

  it("applies side=right variant class", () => {
    render(<Sheet data-testid="sheet" side="right" open={true}><span>content</span></Sheet>);
    expect(screen.getByTestId("sheet")).toHaveClass("sheet--right");
  });

  it("applies side=bottom variant class", () => {
    render(<Sheet data-testid="sheet" side="bottom" open={true}><span>content</span></Sheet>);
    expect(screen.getByTestId("sheet")).toHaveClass("sheet--bottom");
  });

  it("applies side=left variant class", () => {
    render(<Sheet data-testid="sheet" side="left" open={true}><span>content</span></Sheet>);
    expect(screen.getByTestId("sheet")).toHaveClass("sheet--left");
  });

  it("calls onOpenChange when openness changes", async () => {
    const onOpenChangeSpy = vi.fn();
    expect(() => render(<Sheet data-testid="sheet" open={false} onOpenChange={onOpenChangeSpy}><span>content</span></Sheet>)).not.toThrow();
  });

  it("closes on Escape key", () => {
    const onOpenChangeSpy = vi.fn();
    render(<Sheet data-testid="sheet" open={true} onOpenChange={onOpenChangeSpy}><span>content</span></Sheet>);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });

  it("closes on overlay click", () => {
    const onOpenChangeSpy = vi.fn();
    render(<Sheet data-testid="sheet" open={true} onOpenChange={onOpenChangeSpy}><span>content</span></Sheet>);
    const overlay = screen.getByTestId("sheet").querySelector(".sheet__overlay");
    fireEvent.click(overlay!);
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });
});

describe("Sheet — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Sheet slots={{ "title": <span>Test Sheet title</span>, "description": <span>Test Sheet description</span> }} open={true}><span>content</span></Sheet></>);
    const component = baseElement.querySelector('[data-fsds-component="sheet"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

describe("Sheet — accessible relationship ownership", () => {
  it("uses authored title and description on the single dialog owner", () => {
    render(
      <Sheet
        open
        slots={{
          title: <span>Filter results</span>,
          description: <span>Narrow the visible records.</span>,
        }}
      >
        Filter controls
      </Sheet>,
    );

    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs).toHaveLength(1);
    const dialog = screen.getByRole("dialog", { name: "Filter results" });
    expect(dialog).toHaveAccessibleDescription("Narrow the visible records.");

    const titleId = dialog.getAttribute("aria-labelledby");
    const descriptionId = dialog.getAttribute("aria-describedby");
    expect(document.getElementById(titleId!)).toHaveTextContent("Filter results");
    expect(document.getElementById(descriptionId!)).toHaveTextContent(
      "Narrow the visible records.",
    );
  });

  it("lets an explicit ariaLabel override the relationship-derived title", () => {
    render(
      <Sheet
        open
        ariaLabel="Explicit sheet name"
        slots={{ title: <span>Relationship title</span> }}
      >
        Sheet body
      </Sheet>,
    );

    const dialog = screen.getByRole("dialog", { name: "Explicit sheet name" });
    expect(dialog).toHaveAttribute("aria-label", "Explicit sheet name");
    expect(dialog).not.toHaveAttribute("aria-labelledby");
  });
});

// @custom:end
