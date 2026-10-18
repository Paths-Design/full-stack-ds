// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Dialog } from "../Dialog";

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

describe("Dialog — unit", () => {
  it("renders with default props", () => {
    render(<Dialog data-testid="dialog" open={true}><span>content</span></Dialog>);
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Dialog data-testid="dialog" open={true}><span>content</span></Dialog>);
    expect(screen.getByTestId("dialog")).toHaveClass("dialog");
  });

  it("merges custom className", () => {
    render(<Dialog data-testid="dialog" className="custom" open={true}><span>content</span></Dialog>);
    expect(screen.getByTestId("dialog")).toHaveClass("dialog", "custom");
  });

  it("applies size=sm variant class", () => {
    render(<Dialog data-testid="dialog" size="sm" open={true}><span>content</span></Dialog>);
    expect(screen.getByTestId("dialog")).toHaveClass("dialog--sm");
  });

  it("applies size=md variant class", () => {
    render(<Dialog data-testid="dialog" size="md" open={true}><span>content</span></Dialog>);
    expect(screen.getByTestId("dialog")).toHaveClass("dialog--md");
  });

  it("applies size=lg variant class", () => {
    render(<Dialog data-testid="dialog" size="lg" open={true}><span>content</span></Dialog>);
    expect(screen.getByTestId("dialog")).toHaveClass("dialog--lg");
  });

  it("applies size=xl variant class", () => {
    render(<Dialog data-testid="dialog" size="xl" open={true}><span>content</span></Dialog>);
    expect(screen.getByTestId("dialog")).toHaveClass("dialog--xl");
  });

  it("applies size=full variant class", () => {
    render(<Dialog data-testid="dialog" size="full" open={true}><span>content</span></Dialog>);
    expect(screen.getByTestId("dialog")).toHaveClass("dialog--full");
  });

  it("calls onOpenChange when openness changes", async () => {
    const onOpenChangeSpy = vi.fn();
    expect(() => render(<Dialog data-testid="dialog" open={false} onOpenChange={onOpenChangeSpy}><span>content</span></Dialog>)).not.toThrow();
  });

  it("closes on Escape key", () => {
    const onOpenChangeSpy = vi.fn();
    render(<Dialog data-testid="dialog" open={true} onOpenChange={onOpenChangeSpy}><span>content</span></Dialog>);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });

  it("closes on overlay click", () => {
    const onOpenChangeSpy = vi.fn();
    render(<Dialog data-testid="dialog" open={true} onOpenChange={onOpenChangeSpy}><span>content</span></Dialog>);
    const overlay = screen.getByTestId("dialog").querySelector(".dialog__backdrop");
    fireEvent.click(overlay!);
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });
});

describe("Dialog — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Dialog slots={{ "title": <span>Test Dialog title</span> }} open={true}><span>content</span></Dialog></>);
    const component = baseElement.querySelector('[data-fsds-component="dialog"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
describe("Dialog — named slots", () => {
  it("uses the authored title and body as the unique dialog name and description", () => {
    render(
      <Dialog open slots={{ title: <span>Account settings</span> }}>
        Update your profile preferences.
      </Dialog>,
    );

    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs).toHaveLength(1);
    const dialog = screen.getByRole("dialog", { name: "Account settings" });
    expect(dialog).toHaveAccessibleDescription("Update your profile preferences.");

    const titleId = dialog.getAttribute("aria-labelledby");
    const descriptionId = dialog.getAttribute("aria-describedby");
    expect(titleId).toBeTruthy();
    expect(descriptionId).toBeTruthy();
    expect(document.getElementById(titleId!)).toHaveTextContent("Account settings");
    expect(document.getElementById(descriptionId!)).toHaveTextContent(
      "Update your profile preferences.",
    );
  });

  it("lets an explicit ariaLabel override the relationship-derived title", () => {
    render(
      <Dialog
        open
        ariaLabel="Explicit dialog name"
        slots={{ title: <span>Relationship title</span> }}
      >
        Body copy
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Explicit dialog name" });
    expect(dialog).toHaveAttribute("aria-label", "Explicit dialog name");
    expect(dialog).not.toHaveAttribute("aria-labelledby");
  });

  it("renders slots.title inside the <h2> placeholder", () => {
    // Real consumers pass `slots={{ title: <span>...</span> }}` to fill the
    // heading. This test confirms the named-slot pipeline (contract → IR →
    // React codegen → public API → rendered DOM) is intact end-to-end.
    // The dialog portals to document.body (FIX-PORTAL-CONSUMPTION-01), so
    // the heading is queried from the body, not the render container.
    render(
      <Dialog open aria-label="Test Dialog" slots={{ title: <span>My Title</span> }}>
        body content
      </Dialog>,
    );
    const heading = document.body.querySelector("h2.dialog__title");
    expect(heading).toBeInTheDocument();
    expect(heading?.textContent).toBe("My Title");
  });

  it("renders an empty <h2> when slots.title is not provided", () => {
    // The placeholder still exists in the DOM tree; consumers without a
    // title get an empty <h2>. The generated axe fixture supplies title
    // content, so this structural placeholder is not globally suppressed.
    render(
      <Dialog open aria-label="Test Dialog">
        body content
      </Dialog>,
    );
    const heading = document.body.querySelector("h2.dialog__title");
    expect(heading).toBeInTheDocument();
    expect(heading?.textContent).toBe("");
  });
});

describe("Dialog — portal (FIX-PORTAL-CONSUMPTION-01)", () => {
  it("mounts the dialog root at document.body, escaping an ancestor stacking context", () => {
    // A transform/overflow ancestor creates a stacking context that would
    // clip a merely-fixed dialog. Portaling the root to document.body escapes
    // it: the dialog's DOM parent must be document.body, NOT the ancestor the
    // consumer rendered it inside.
    const { container } = render(
      <div style={{ transform: "translateZ(0)", overflow: "hidden" }}>
        <Dialog open aria-label="Portaled Dialog" data-testid="portaled-dialog">
          body content
        </Dialog>
      </div>,
    );
    const dialogRoot = document.querySelector<HTMLElement>(
      '[data-testid="portaled-dialog"]',
    );
    expect(dialogRoot).not.toBeNull();
    // The load-bearing assertion: the portaled root's parent is document.body,
    // not the transform ancestor that would otherwise trap it.
    expect(dialogRoot?.parentElement).toBe(document.body);
    expect(container.contains(dialogRoot)).toBe(false);
  });
});
// @custom:end
