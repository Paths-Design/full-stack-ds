// @generated:start imports
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Select } from "../Select";

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

describe("Select — unit", () => {
  it("renders with default props", () => {
    render(<Select data-testid="select" open={true} />);
    expect(screen.getByTestId("select")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Select data-testid="select" open={true} />);
    expect(screen.getByTestId("select")).toHaveClass("select");
  });

  it("merges custom className", () => {
    render(<Select data-testid="select" className="custom" open={true} />);
    expect(screen.getByTestId("select")).toHaveClass("select", "custom");
  });

  it("applies size=sm variant class", () => {
    render(<Select data-testid="select" size="sm" open={true} />);
    expect(screen.getByTestId("select")).toHaveClass("select--sm");
  });

  it("applies size=md variant class", () => {
    render(<Select data-testid="select" size="md" open={true} />);
    expect(screen.getByTestId("select")).toHaveClass("select--md");
  });

  it("applies size=lg variant class", () => {
    render(<Select data-testid="select" size="lg" open={true} />);
    expect(screen.getByTestId("select")).toHaveClass("select--lg");
  });

  it("applies position=bottom variant class", () => {
    render(<Select data-testid="select" position="bottom" open={true} />);
    expect(screen.getByTestId("select")).toHaveClass("select--bottom");
  });

  it("applies position=top variant class", () => {
    render(<Select data-testid="select" position="top" open={true} />);
    expect(screen.getByTestId("select")).toHaveClass("select--top");
  });

  it("applies position=auto variant class", () => {
    render(<Select data-testid="select" position="auto" open={true} />);
    expect(screen.getByTestId("select")).toHaveClass("select--auto");
  });

  it("calls onChange when selection changes", async () => {
    const onChangeSpy = vi.fn();
    expect(() => render(<Select data-testid="select" value={""} onChange={onChangeSpy} open={true} />)).not.toThrow();
  });

  it("calls onOpenChange when open changes", async () => {
    const onOpenChangeSpy = vi.fn();
    expect(() => render(<Select data-testid="select" open={false} onOpenChange={onOpenChangeSpy} />)).not.toThrow();
  });

  it("closes on Escape key", () => {
    const onOpenChangeSpy = vi.fn();
    render(<Select data-testid="select" open={true} onOpenChange={onOpenChangeSpy} />);
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });
});

describe("Select — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Select triggerLabel="Test Select" open={true} /></>);
    const component = baseElement.querySelector('[data-fsds-component="select"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
// FEAT-BINDING-CALL-WITH-ARG-01: the option-click wire
// `channel:selection.onChange(iter:item.value)` must invoke onChange with the
// clicked option's value — proving the call-with-argument setter form lowers
// to a live per-item write (not the pre-fix self-assignment no-op).
// fireEvent is imported by the keyboard-realization block below; a second
// import is a tsc duplicate-identifier error (esbuild merges duplicates, so
// vitest alone never caught it).

describe("Select — trigger naming", () => {
  it("has a useful default name and honors the consumer override", () => {
    const { rerender } = render(<Select aria-label="Fruit" />);
    expect(
      screen.getByRole("button", { name: "Select an option" }),
    ).toBeInTheDocument();

    rerender(<Select aria-label="Fruit" triggerLabel="Choose a fruit" />);
    expect(
      screen.getByRole("button", { name: "Choose a fruit" }),
    ).toBeInTheDocument();
  });
});

describe("Select — option selection (FEAT-BINDING-CALL-WITH-ARG-01)", () => {
  const OPTIONS = [
    { value: "alpha", label: "Alpha" },
    { value: "beta", label: "Beta" },
    { value: "gamma", label: "Gamma" },
  ];

  it("clicking option N calls onChange with that option's value", () => {
    const onChange = vi.fn();
    render(
      <Select
        aria-label="Fruit"
        open={true}
        value={""}
        onChange={onChange}
        options={OPTIONS}
      />,
    );
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);

    fireEvent.click(options[2]); // Gamma
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("gamma");

    fireEvent.click(options[0]); // Alpha
    expect(onChange).toHaveBeenLastCalledWith("alpha");
  });

  it("does not fire a self-write: clicking passes the ITEM value, not the current selection", () => {
    // Falsification of the pre-fix no-op: with selection already "beta",
    // clicking "alpha" must report "alpha", never the standing "beta".
    const onChange = vi.fn();
    render(
      <Select
        aria-label="Fruit"
        open={true}
        value={"beta"}
        onChange={onChange}
        options={OPTIONS}
      />,
    );
    fireEvent.click(screen.getAllByRole("option")[0]); // Alpha
    expect(onChange).toHaveBeenCalledWith("alpha");
    expect(onChange).not.toHaveBeenCalledWith("beta");
  });
});

// FEAT-CHANNEL-UPDATE-OPERATIONS-01: the option-click wire is now
// `toggleMembership(iter:item.value, prop:multiple)`. Single mode keeps
// replace (proven above); multiple mode toggles array membership. Pins the
// A3 behavioral claim for React.
describe("Select — multiple-mode toggle (channelUpdate toggleMembership)", () => {
  const OPTIONS = [
    { value: "alpha", label: "Alpha" },
    { value: "beta", label: "Beta" },
    { value: "gamma", label: "Gamma" },
  ];

  it("in multiple mode, clicking an ABSENT option ADDS it to the array", () => {
    const onChange = vi.fn();
    render(
      <Select
        aria-label="Fruit"
        multiple
        open={true}
        value={["alpha"]}
        onChange={onChange}
        options={OPTIONS}
      />,
    );
    fireEvent.click(screen.getAllByRole("option")[2]); // Gamma
    expect(onChange).toHaveBeenLastCalledWith(["alpha", "gamma"]);
  });

  it("in multiple mode, clicking a PRESENT option REMOVES it from the array", () => {
    const onChange = vi.fn();
    render(
      <Select
        aria-label="Fruit"
        multiple
        open={true}
        value={["alpha", "beta"]}
        onChange={onChange}
        options={OPTIONS}
      />,
    );
    fireEvent.click(screen.getAllByRole("option")[0]); // Alpha (present)
    expect(onChange).toHaveBeenLastCalledWith(["beta"]);
  });

  it("in multiple mode, a scalar current value is coerced to an array before toggling", () => {
    // Falsification: if the toggle wrote a raw string it would throw / produce
    // a wrong shape. A standing scalar "beta" + clicking "gamma" must yield the
    // two-element array.
    const onChange = vi.fn();
    render(
      <Select
        aria-label="Fruit"
        multiple
        open={true}
        value={"beta" as unknown as string[]}
        onChange={onChange}
        options={OPTIONS}
      />,
    );
    fireEvent.click(screen.getAllByRole("option")[2]); // Gamma
    expect(onChange).toHaveBeenLastCalledWith(["beta", "gamma"]);
  });

  it("single mode is unchanged: clicking replaces with the scalar value", () => {
    // Regression guard on the mode dispatch — without `multiple`, the wire must
    // still take the `!modeGate` replace branch, not toggle.
    const onChange = vi.fn();
    render(
      <Select
        aria-label="Fruit"
        open={true}
        value={"alpha"}
        onChange={onChange}
        options={OPTIONS}
      />,
    );
    fireEvent.click(screen.getAllByRole("option")[1]); // Beta
    expect(onChange).toHaveBeenLastCalledWith("beta");
  });
});
// FEAT-A11Y-COMPOSITE-KEYBOARD-01: the realized keyboard actions — dispatch
// each contract-declared key and assert the DOM response (AC A3, React
// target). Trigger ArrowDown opens with focus landing in the listbox; the
// listbox host roves DOM focus over the options with wrap; option Enter
// commits exactly what the option's click commits.
import { fireEvent, waitFor } from "@testing-library/react";

describe("Select — keyboard realization (FEAT-A11Y-COMPOSITE-KEYBOARD-01)", () => {
  const OPTIONS = [
    { value: "alpha", label: "Alpha" },
    { value: "beta", label: "Beta" },
    { value: "gamma", label: "Gamma" },
  ];

  const renderOpen = (props: Record<string, unknown> = {}) =>
    render(
      <Select
        aria-label="Fruit"
        open={true}
        options={OPTIONS}
        {...props}
      />,
    );

  it("ArrowDown on the closed trigger opens the panel and moves focus into the listbox", async () => {
    const onOpenChange = vi.fn();
    render(<Select aria-label="Fruit" onOpenChange={onOpenChange} options={OPTIONS} />);
    const trigger = screen.getByRole("button", { name: "Select an option" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(onOpenChange).toHaveBeenCalledWith(true);
    await waitFor(() => {
      const listbox = screen.getByRole("listbox");
      expect(listbox.contains(document.activeElement)).toBe(true);
    });
  });

  it("roving hosts are programmatically focusable but out of tab order", () => {
    renderOpen();
    expect(screen.getByRole("listbox")).toHaveAttribute("tabindex", "-1");
    for (const option of screen.getAllByRole("option")) {
      expect(option).toHaveAttribute("tabindex", "-1");
    }
  });

  it("ArrowDown/ArrowUp on the listbox rove DOM focus through the options", () => {
    renderOpen();
    const [alpha, beta, gamma] = screen.getAllByRole("option");
    alpha.focus();
    const listbox = screen.getByRole("listbox");
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(document.activeElement).toBe(beta);
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(document.activeElement).toBe(gamma);
    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(document.activeElement).toBe(beta);
  });

  it("ArrowUp from the first option wraps to the last; Home/End jump to the extremes", () => {
    renderOpen();
    const options = screen.getAllByRole("option");
    options[0].focus();
    const listbox = screen.getByRole("listbox");
    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(document.activeElement).toBe(options[options.length - 1]);
    fireEvent.keyDown(listbox, { key: "Home" });
    expect(document.activeElement).toBe(options[0]);
    fireEvent.keyDown(listbox, { key: "End" });
    expect(document.activeElement).toBe(options[options.length - 1]);
  });

  it("Enter on an option commits its value and honors single-selection dismissal", () => {
    const onChange = vi.fn();
    const onOpenChange = vi.fn();
    renderOpen({ value: "", onChange, onOpenChange });
    const options = screen.getAllByRole("option");
    fireEvent.keyDown(options[2], { key: "Enter" }); // Gamma
    expect(onChange).toHaveBeenLastCalledWith("gamma");
    // The selection dismissal policy applies to keyboard and pointer commits.
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Enter adds an absent option's value in multiple mode (controlled)", () => {
    const onChange = vi.fn();
    renderOpen({ multiple: true, value: ["alpha"], onChange });
    fireEvent.keyDown(screen.getAllByRole("option")[2], { key: "Enter" }); // Gamma absent → add
    expect(onChange).toHaveBeenLastCalledWith(["alpha", "gamma"]);
  });

  it("Enter removes a present option's value in multiple mode (controlled)", () => {
    const onChange = vi.fn();
    renderOpen({ multiple: true, value: ["alpha", "gamma"], onChange });
    fireEvent.keyDown(screen.getAllByRole("option")[0], { key: "Enter" }); // Alpha present → remove
    expect(onChange).toHaveBeenLastCalledWith(["gamma"]);
  });
});
// @custom:end
