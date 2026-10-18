/**
 * React behavioral tests for the Anchored Presence Surface family.
 *
 * Replaces the legacy class-token-only test plan with assertions against
 * actual surface state and ARIA wiring. Tests cover:
 *   - hover on trigger opens content
 *   - focus on trigger opens content
 *   - pointer-leave on trigger closes content
 *   - blur on trigger closes content
 *   - Escape closes content
 *   - aria-describedby on trigger references the content's id when open
 *   - disabled prop suppresses open
 *   - onOpenChange fires on uncontrolled open
 */
import type { ComponentIR } from "../../ir.js";
import { isPartAnchoredSurface } from "../../semantics.js";

export function generateReactSurfaceTest(ir: ComponentIR): string {
  const surface = ir.surface;
  if (!surface) {
    throw new Error(
      `generateReactSurfaceTest called on ${ir.name} without ir.surface`,
    );
  }
  if (!isPartAnchoredSurface(surface)) {
    throw new Error(
      `React surface test emitter expected an anchored-presence kind (got "${surface.kind}"). ` +
        `Declare part attachment with anchored positioning when its substrate is ready.`,
    );
  }
  // Test-body shape is kind-specific (Tooltip's hover/focus contract
  // vs Popover's click contract). Each kind has its own scaffold
  // function; dispatch on kind here. Body emission is realization,
  // not policy — the policy already said "this kind belongs in the
  // anchored family." Adding a new anchored kind without a scaffold
  // function here would fall through to the tooltip-shaped tests,
  // which is wrong but loud.
  if (surface.kind === "popover") {
    return emitPopoverScaffoldTests(ir);
  }
  return emitTooltipTests(ir);
}

/**
 * Minimal Popover test scaffold emitted by atom B. Asserts the
 * Popover-specific contract shape (click toggles, aria-controls +
 * aria-expanded, asChild adoption, accessibility) without the full
 * behavioral coverage matrix. Atom C extends this with the deep
 * behavioral suite (focus boundary, outside-click, controlled
 * override, disabled, etc.) inside the @custom block.
 */
function emitPopoverScaffoldTests(ir: ComponentIR): string {
  const name = ir.name;
  const cssPrefix = ir.cssPrefix;
  const importsBody = [
    `import { createRef } from "react";`,
    `import { describe, it, expect, vi } from "vitest";`,
    `import { render, screen, fireEvent, act } from "@testing-library/react";`,
    `import { axe } from "vitest-axe";`,
    `import { ${name} } from "../${name}";`,
    ``,
    `declare module "vitest" {`,
    `  interface Assertion<T> {`,
    `    // The positional T keeps this augmentation mergeable with vitest's`,
    `    // own Assertion<T = any> declaration (TS2428 fires on any rename);`,
    `    // the expected param references it so it is never an unused type param.`,
    `    toHaveNoViolations(expected?: T): void;`,
    `  }`,
    `}`,
  ].join("\n");

  const testsBody = `function renderPopover(props: Partial<React.ComponentProps<typeof ${name}>> = {}) {
  return render(
    <${name} {...props}>
      <${name}.Trigger data-testid="trigger">Open</${name}.Trigger>
      <${name}.Content data-testid="content">
        <button data-testid="content-button">action</button>
      </${name}.Content>
    </${name}>,
  );
}

describe("${name} — compound API surface", () => {
  it("renders the trigger but not the content when closed", () => {
    renderPopover();
    expect(screen.getByTestId("trigger")).toBeInTheDocument();
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("renders the content when defaultOpen={true}", () => {
    renderPopover({ defaultOpen: true });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("opens on click of the trigger", () => {
    renderPopover();
    const trigger = screen.getByTestId("trigger");
    act(() => {
      fireEvent.click(trigger);
    });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("toggles closed on a second click of the trigger", () => {
    renderPopover({ defaultOpen: true });
    const trigger = screen.getByTestId("trigger");
    act(() => {
      fireEvent.click(trigger);
    });
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("closes on Escape", () => {
    renderPopover({ defaultOpen: true });
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("wires aria-controls + aria-expanded on the trigger", () => {
    renderPopover({ defaultOpen: true });
    const trigger = screen.getByTestId("trigger");
    const content = screen.getByTestId("content");
    const id = content.getAttribute("id");
    expect(id).toBeTruthy();
    expect(trigger).toHaveAttribute("aria-controls", id);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("aria-expanded reflects closed state", () => {
    renderPopover();
    const trigger = screen.getByTestId("trigger");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("fires onOpenChange on uncontrolled open", () => {
    const spy = vi.fn();
    renderPopover({ onOpenChange: spy });
    act(() => {
      fireEvent.click(screen.getByTestId("trigger"));
    });
    expect(spy).toHaveBeenCalledWith(true);
  });

  it("respects disabled — click does not open", () => {
    renderPopover({ disabled: true });
    act(() => {
      fireEvent.click(screen.getByTestId("trigger"));
    });
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("unmount removes document-level listeners (no setOpen after unmount)", () => {
    const spy = vi.fn();
    const { unmount } = renderPopover({ defaultOpen: true, onOpenChange: spy });
    unmount();
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("${name} — asChild adoption", () => {
  it("renders the adopted child as the actual host (no nested button)", () => {
    render(
      <${name}>
        <${name}.Trigger asChild>
          <a href="#open" data-testid="trigger">Open</a>
        </${name}.Trigger>
        <${name}.Content data-testid="content">Body</${name}.Content>
      </${name}>,
    );
    const trigger = screen.getByTestId("trigger");
    expect(trigger.tagName).toBe("A");
    expect(trigger.parentElement?.querySelector("button")).toBeNull();
  });

  it("default-host behavior is unchanged when asChild is absent", () => {
    renderPopover();
    expect(screen.getByTestId("trigger").tagName).toBe("BUTTON");
  });

  it("asChild opens on click over the adopted child", () => {
    render(
      <${name}>
        <${name}.Trigger asChild>
          <a href="#open" data-testid="trigger">Open</a>
        </${name}.Trigger>
        <${name}.Content data-testid="content">Body</${name}.Content>
      </${name}>,
    );
    act(() => {
      fireEvent.click(screen.getByTestId("trigger"));
    });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("asChild — consumer event.preventDefault() suppresses the surface handler", () => {
    const surfaceSpy = vi.fn();
    render(
      <${name} onOpenChange={surfaceSpy}>
        <${name}.Trigger asChild>
          <a
            href="#open"
            data-testid="trigger"
            onClick={(e) => e.preventDefault()}
          >
            Open
          </a>
        </${name}.Trigger>
        <${name}.Content data-testid="content">Body</${name}.Content>
      </${name}>,
    );
    act(() => {
      fireEvent.click(screen.getByTestId("trigger"));
    });
    expect(surfaceSpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("asChild forwards the consumer's ref to the adopted DOM node", () => {
    const consumerRef = createRef<HTMLAnchorElement>();
    render(
      <${name}>
        <${name}.Trigger asChild>
          <a href="#open" data-testid="trigger" ref={consumerRef}>Open</a>
        </${name}.Trigger>
        <${name}.Content data-testid="content">Body</${name}.Content>
      </${name}>,
    );
    expect(consumerRef.current).not.toBeNull();
    expect(consumerRef.current?.tagName).toBe("A");
  });

  it("asChild applies the data-${cssPrefix}-trigger marker to the adopted host", () => {
    render(
      <${name}>
        <${name}.Trigger asChild>
          <a href="#open" data-testid="trigger">Open</a>
        </${name}.Trigger>
        <${name}.Content data-testid="content">Body</${name}.Content>
      </${name}>,
    );
    expect(screen.getByTestId("trigger")).toHaveAttribute("data-${cssPrefix}-trigger");
  });
});

describe("${name} — accessibility", () => {
  it("has no unexpected axe violations when closed", async () => {
    const { container } = renderPopover();
    const results = (await axe(container)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it("has no unexpected axe violations when open", async () => {
    const { container } = renderPopover({ defaultOpen: true });
    const results = (await axe(container)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});`;

  return [
    `// @generated:start imports`,
    importsBody,
    `// @generated:end`,
    ``,
    `// @generated:start tests`,
    testsBody,
    `// @generated:end`,
    ``,
    `// @custom:start tests`,
    ``,
    `// @custom:end`,
    ``,
  ].join("\n");
}

function emitTooltipTests(ir: ComponentIR): string {
  const name = ir.name;
  const cssPrefix = ir.cssPrefix;
  const importsBody = [
    `import { createRef } from "react";`,
    `import { describe, it, expect, vi } from "vitest";`,
    `import { render, screen, fireEvent, act } from "@testing-library/react";`,
    `import { axe } from "vitest-axe";`,
    `import { ${name} } from "../${name}";`,
    ``,
    `declare module "vitest" {`,
    `  interface Assertion<T> {`,
    `    // The positional T keeps this augmentation mergeable with vitest's`,
    `    // own Assertion<T = any> declaration (TS2428 fires on any rename);`,
    `    // the expected param references it so it is never an unused type param.`,
    `    toHaveNoViolations(expected?: T): void;`,
    `  }`,
    `}`,
  ].join("\n");

  const testsBody = `function renderTooltip(props: Partial<React.ComponentProps<typeof ${name}>> = {}) {
  return render(
    <${name} {...props}>
      <${name}.Trigger data-testid="trigger">Open</${name}.Trigger>
      <${name}.Content data-testid="content">Help text</${name}.Content>
    </${name}>,
  );
}

describe("${name} — compound API surface", () => {
  it("renders the trigger but not the content when closed", () => {
    renderTooltip();
    expect(screen.getByTestId("trigger")).toBeInTheDocument();
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("renders the content when defaultOpen={true}", () => {
    renderTooltip({ defaultOpen: true });
    expect(screen.getByTestId("content")).toBeInTheDocument();
    expect(screen.getByTestId("content")).toHaveAttribute("role", "tooltip");
  });

  it("opens on pointerenter (hover) over the trigger", () => {
    renderTooltip();
    const trigger = screen.getByTestId("trigger");
    act(() => {
      fireEvent.pointerEnter(trigger);
    });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("opens on focus over the trigger", () => {
    renderTooltip();
    const trigger = screen.getByTestId("trigger");
    act(() => {
      fireEvent.focus(trigger);
    });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("closes on pointerleave from the trigger (no grace path into content)", () => {
    renderTooltip({ defaultOpen: true });
    const trigger = screen.getByTestId("trigger");
    act(() => {
      fireEvent.pointerLeave(trigger, { relatedTarget: document.body });
    });
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("closes on Escape", () => {
    renderTooltip({ defaultOpen: true });
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("closes on blur from the trigger", () => {
    renderTooltip({ defaultOpen: true });
    const trigger = screen.getByTestId("trigger");
    act(() => {
      fireEvent.blur(trigger, { relatedTarget: document.body });
    });
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("wires aria-describedby from trigger to content when open", () => {
    renderTooltip({ defaultOpen: true });
    const trigger = screen.getByTestId("trigger");
    const content = screen.getByTestId("content");
    const id = content.getAttribute("id");
    expect(id).toBeTruthy();
    expect(trigger).toHaveAttribute("aria-describedby", id);
  });

  it("does NOT set aria-describedby when closed", () => {
    renderTooltip();
    const trigger = screen.getByTestId("trigger");
    expect(trigger).not.toHaveAttribute("aria-describedby");
  });

  it("fires onOpenChange on uncontrolled open", () => {
    const spy = vi.fn();
    renderTooltip({ onOpenChange: spy });
    const trigger = screen.getByTestId("trigger");
    act(() => {
      fireEvent.pointerEnter(trigger);
    });
    expect(spy).toHaveBeenCalledWith(true);
  });

  it("respects disabled — pointerenter does not open", () => {
    renderTooltip({ disabled: true });
    const trigger = screen.getByTestId("trigger");
    act(() => {
      fireEvent.pointerEnter(trigger);
    });
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("disabled root still respects onOpenChange not firing on hover", () => {
    const spy = vi.fn();
    renderTooltip({ disabled: true, onOpenChange: spy });
    const trigger = screen.getByTestId("trigger");
    act(() => {
      fireEvent.pointerEnter(trigger);
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("controlled open prop overrides internal state", () => {
    const { rerender } = renderTooltip({ open: false });
    const trigger = screen.getByTestId("trigger");
    act(() => {
      fireEvent.pointerEnter(trigger);
    });
    expect(screen.queryByTestId("content")).toBeNull();
    rerender(
      <${name} open={true}>
        <${name}.Trigger data-testid="trigger">Open</${name}.Trigger>
        <${name}.Content data-testid="content">Help text</${name}.Content>
      </${name}>,
    );
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("pointerleave INTO content does not close (grace path)", () => {
    renderTooltip({ defaultOpen: true });
    const trigger = screen.getByTestId("trigger");
    const content = screen.getByTestId("content");
    act(() => {
      fireEvent.pointerLeave(trigger, { relatedTarget: content });
    });
    // Surface should stay open because the pointer moved into the content.
    expect(screen.queryByTestId("content")).toBeInTheDocument();
  });

  it("closeOnEscape={false} prevents Escape dismissal", () => {
    renderTooltip({ defaultOpen: true, closeOnEscape: false });
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByTestId("content")).toBeInTheDocument();
  });

  it("closeOnBlur={false} prevents blur dismissal", () => {
    renderTooltip({ defaultOpen: true, closeOnBlur: false });
    const trigger = screen.getByTestId("trigger");
    act(() => {
      fireEvent.blur(trigger, { relatedTarget: document.body });
    });
    expect(screen.queryByTestId("content")).toBeInTheDocument();
  });

  it("unmount removes document-level listeners (no setOpen after unmount)", () => {
    const spy = vi.fn();
    const { unmount } = renderTooltip({ defaultOpen: true, onOpenChange: spy });
    unmount();
    // Document-level Escape listener should be torn down; firing it now
    // must not invoke setOpen on the unmounted instance.
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("${name} — asChild adoption", () => {
  it("renders the adopted child as the actual host (no nested button)", () => {
    render(
      <${name}>
        <${name}.Trigger asChild>
          <a href="#help" data-testid="trigger">Help</a>
        </${name}.Trigger>
        <${name}.Content data-testid="content">Help text</${name}.Content>
      </${name}>,
    );
    const trigger = screen.getByTestId("trigger");
    expect(trigger.tagName).toBe("A");
    // No default <button> host was rendered alongside it.
    expect(trigger.parentElement?.querySelector("button")).toBeNull();
  });

  it("default-host behavior is unchanged when asChild is absent", () => {
    render(
      <${name}>
        <${name}.Trigger data-testid="trigger">Open</${name}.Trigger>
        <${name}.Content data-testid="content">Help text</${name}.Content>
      </${name}>,
    );
    expect(screen.getByTestId("trigger").tagName).toBe("BUTTON");
  });

  it("asChild opens on pointerenter over the adopted child", () => {
    render(
      <${name}>
        <${name}.Trigger asChild>
          <a href="#help" data-testid="trigger">Help</a>
        </${name}.Trigger>
        <${name}.Content data-testid="content">Help text</${name}.Content>
      </${name}>,
    );
    act(() => {
      fireEvent.pointerEnter(screen.getByTestId("trigger"));
    });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("asChild opens on focus over the adopted child", () => {
    render(
      <${name}>
        <${name}.Trigger asChild>
          <a href="#help" data-testid="trigger">Help</a>
        </${name}.Trigger>
        <${name}.Content data-testid="content">Help text</${name}.Content>
      </${name}>,
    );
    act(() => {
      fireEvent.focus(screen.getByTestId("trigger"));
    });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("asChild wires aria-describedby onto the adopted child when open", () => {
    render(
      <${name} defaultOpen>
        <${name}.Trigger asChild>
          <a href="#help" data-testid="trigger">Help</a>
        </${name}.Trigger>
        <${name}.Content data-testid="content">Help text</${name}.Content>
      </${name}>,
    );
    const trigger = screen.getByTestId("trigger");
    const content = screen.getByTestId("content");
    expect(trigger).toHaveAttribute("aria-describedby", content.getAttribute("id"));
  });

  it("asChild preserves the consumer's onPointerEnter handler", () => {
    const consumerSpy = vi.fn();
    const surfaceSpy = vi.fn();
    render(
      <${name} onOpenChange={surfaceSpy}>
        <${name}.Trigger asChild>
          <a href="#help" data-testid="trigger" onPointerEnter={consumerSpy}>
            Help
          </a>
        </${name}.Trigger>
        <${name}.Content data-testid="content">Help text</${name}.Content>
      </${name}>,
    );
    act(() => {
      fireEvent.pointerEnter(screen.getByTestId("trigger"));
    });
    expect(consumerSpy).toHaveBeenCalled();
    expect(surfaceSpy).toHaveBeenCalledWith(true);
  });

  it("asChild preserves the consumer's onFocus handler", () => {
    const consumerSpy = vi.fn();
    render(
      <${name}>
        <${name}.Trigger asChild>
          <a href="#help" data-testid="trigger" onFocus={consumerSpy}>
            Help
          </a>
        </${name}.Trigger>
        <${name}.Content data-testid="content">Help text</${name}.Content>
      </${name}>,
    );
    act(() => {
      fireEvent.focus(screen.getByTestId("trigger"));
    });
    expect(consumerSpy).toHaveBeenCalled();
  });

  it("asChild — consumer event.preventDefault() suppresses the surface handler", () => {
    const surfaceSpy = vi.fn();
    render(
      <${name} onOpenChange={surfaceSpy}>
        <${name}.Trigger asChild>
          <a
            href="#help"
            data-testid="trigger"
            onPointerEnter={(e) => e.preventDefault()}
          >
            Help
          </a>
        </${name}.Trigger>
        <${name}.Content data-testid="content">Help text</${name}.Content>
      </${name}>,
    );
    act(() => {
      fireEvent.pointerEnter(screen.getByTestId("trigger"));
    });
    expect(surfaceSpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("asChild forwards the consumer's ref to the adopted DOM node", () => {
    const consumerRef = createRef<HTMLAnchorElement>();
    render(
      <${name}>
        <${name}.Trigger asChild>
          <a href="#help" data-testid="trigger" ref={consumerRef}>
            Help
          </a>
        </${name}.Trigger>
        <${name}.Content data-testid="content">Help text</${name}.Content>
      </${name}>,
    );
    expect(consumerRef.current).not.toBeNull();
    expect(consumerRef.current?.tagName).toBe("A");
  });

  it("asChild throws when no child is provided", () => {
    // React.Children.only logs an internal error and rethrows; we
    // catch the throw at render time.
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() =>
      render(
        <${name}>
          <${name}.Trigger asChild>{null}</${name}.Trigger>
          <${name}.Content data-testid="content">Help text</${name}.Content>
        </${name}>,
      ),
    ).toThrow();
    consoleErrorSpy.mockRestore();
  });

  it("asChild throws when multiple children are provided", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() =>
      render(
        <${name}>
          <${name}.Trigger asChild>
            <a href="#a">A</a>
            <a href="#b">B</a>
          </${name}.Trigger>
          <${name}.Content data-testid="content">Help text</${name}.Content>
        </${name}>,
      ),
    ).toThrow();
    consoleErrorSpy.mockRestore();
  });

  it("asChild throws when child is a string (not a valid element)", () => {
    // React.Children.only rejects strings up front; we don't need to
    // reach our own isValidElement guard. Either message is acceptable
    // as long as render() throws loudly.
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() =>
      render(
        <${name}>
          <${name}.Trigger asChild>Help text</${name}.Trigger>
          <${name}.Content data-testid="content">Help text</${name}.Content>
        </${name}>,
      ),
    ).toThrow();
    consoleErrorSpy.mockRestore();
  });

  it("asChild applies the data-${cssPrefix}-trigger marker to the adopted host", () => {
    render(
      <${name}>
        <${name}.Trigger asChild>
          <a href="#help" data-testid="trigger">Help</a>
        </${name}.Trigger>
        <${name}.Content data-testid="content">Help text</${name}.Content>
      </${name}>,
    );
    expect(screen.getByTestId("trigger")).toHaveAttribute("data-${cssPrefix}-trigger");
  });
});

describe("${name} — accessibility", () => {
  it("has no unexpected axe violations when closed", async () => {
    const { container } = renderTooltip();
    const results = (await axe(container)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it("has no unexpected axe violations when open", async () => {
    const { container } = renderTooltip({ defaultOpen: true });
    const results = (await axe(container)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});`;

  return [
    `// @generated:start imports`,
    importsBody,
    `// @generated:end`,
    ``,
    `// @generated:start tests`,
    testsBody,
    `// @generated:end`,
    ``,
    `// @custom:start tests`,
    ``,
    `// @custom:end`,
    ``,
  ].join("\n");
}
