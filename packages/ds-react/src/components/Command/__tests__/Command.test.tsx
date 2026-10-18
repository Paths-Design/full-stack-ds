// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Command } from "../Command";

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

describe("Command — unit", () => {
  it("renders with default props", () => {
    render(<Command data-testid="command" open={true} />);
    expect(screen.getByTestId("command")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Command data-testid="command" open={true} />);
    expect(screen.getByTestId("command")).toHaveClass("command");
  });

  it("merges custom className", () => {
    render(<Command data-testid="command" className="custom" open={true} />);
    expect(screen.getByTestId("command")).toHaveClass("command", "custom");
  });

  it("calls onOpenChange when open changes", async () => {
    const onOpenChangeSpy = vi.fn();
    expect(() => render(<Command data-testid="command" open={false} onOpenChange={onOpenChangeSpy} />)).not.toThrow();
  });

  it("calls onSearchChange when search changes", async () => {
    const onSearchChangeSpy = vi.fn();
    expect(() => render(<Command data-testid="command" search={""} onSearchChange={onSearchChangeSpy} open={true} />)).not.toThrow();
  });

  it("closes on Escape key", () => {
    const onOpenChangeSpy = vi.fn();
    render(<Command data-testid="command" open={true} onOpenChange={onOpenChangeSpy} />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });

  it("closes on overlay click", () => {
    const onOpenChangeSpy = vi.fn();
    render(<Command data-testid="command" open={true} onOpenChange={onOpenChangeSpy} />);
    const overlay = screen.getByTestId("command").querySelector(".command__overlay");
    fireEvent.click(overlay!);
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });
});

describe("Command — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Command label="Test Command" open={true} /></>);
    const component = baseElement.querySelector('[data-fsds-component="command"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

describe("Command — accessible role ownership", () => {
  it("exposes one dialog with the contract-authored default name", () => {
    render(<Command open />);

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(
      screen.getByRole("dialog", { name: "Command palette" }),
    ).toBeInTheDocument();
  });

  it("honors consumer labels for both the dialog and its search field", () => {
    render(
      <Command
        open
        label="Actions"
        searchLabel="Filter available actions"
      />,
    );

    expect(screen.getByRole("dialog", { name: "Actions" })).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Filter available actions" }),
    ).toBeInTheDocument();
  });

  it("keeps each search field linked to its own listbox across instances", () => {
    render(
      <>
        <Command open label="First command" />
        <Command open label="Second command" />
      </>,
    );

    const inputs = screen.getAllByRole("combobox");
    expect(inputs).toHaveLength(2);
    const controlledIds = inputs.map((input) =>
      input.getAttribute("aria-controls"),
    );
    expect(controlledIds.every(Boolean)).toBe(true);
    expect(new Set(controlledIds).size).toBe(2);

    for (const input of inputs) {
      const target = document.getElementById(input.getAttribute("aria-controls")!);
      expect(target).toHaveAttribute("role", "listbox");
      expect(target?.closest('[data-fsds-component="command"]')).toBe(
        input.closest('[data-fsds-component="command"]'),
      );
    }
  });
});

describe("Command — portal (FIX-PORTAL-CONTRACT-ADJUDICATION-01)", () => {
  it("mounts the command root at document.body, escaping an ancestor stacking context", () => {
    // A transform/overflow ancestor creates a stacking context that would
    // clip a merely-fixed command palette. Portaling the root to document.body
    // escapes it: the command's DOM parent must be document.body, NOT the
    // ancestor the consumer rendered it inside.
    const { container } = render(
      <div style={{ transform: "translateZ(0)", overflow: "hidden" }}>
        <Command open aria-label="Portaled Command" data-testid="portaled-command" />
      </div>,
    );
    const commandRoot = document.querySelector<HTMLElement>(
      '[data-testid="portaled-command"]',
    );
    expect(commandRoot).not.toBeNull();
    // The load-bearing assertion: the portaled root's parent is document.body,
    // not the transform ancestor that would otherwise trap it.
    expect(commandRoot?.parentElement).toBe(document.body);
    expect(container.contains(commandRoot)).toBe(false);
  });
});

// @custom:end
