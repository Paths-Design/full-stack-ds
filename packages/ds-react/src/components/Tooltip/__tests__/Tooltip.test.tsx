// @generated:start imports
import { createRef } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Tooltip } from "../Tooltip";

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
function renderTooltip(props: Partial<React.ComponentProps<typeof Tooltip>> = {}) {
  return render(
    <Tooltip {...props}>
      <Tooltip.Trigger data-testid="trigger">Open</Tooltip.Trigger>
      <Tooltip.Content data-testid="content">Help text</Tooltip.Content>
    </Tooltip>,
  );
}

describe("Tooltip — compound API surface", () => {
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
      <Tooltip open={true}>
        <Tooltip.Trigger data-testid="trigger">Open</Tooltip.Trigger>
        <Tooltip.Content data-testid="content">Help text</Tooltip.Content>
      </Tooltip>,
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

describe("Tooltip — asChild adoption", () => {
  it("renders the adopted child as the actual host (no nested button)", () => {
    render(
      <Tooltip>
        <Tooltip.Trigger asChild>
          <a href="#help" data-testid="trigger">Help</a>
        </Tooltip.Trigger>
        <Tooltip.Content data-testid="content">Help text</Tooltip.Content>
      </Tooltip>,
    );
    const trigger = screen.getByTestId("trigger");
    expect(trigger.tagName).toBe("A");
    // No default <button> host was rendered alongside it.
    expect(trigger.parentElement?.querySelector("button")).toBeNull();
  });

  it("default-host behavior is unchanged when asChild is absent", () => {
    render(
      <Tooltip>
        <Tooltip.Trigger data-testid="trigger">Open</Tooltip.Trigger>
        <Tooltip.Content data-testid="content">Help text</Tooltip.Content>
      </Tooltip>,
    );
    expect(screen.getByTestId("trigger").tagName).toBe("BUTTON");
  });

  it("asChild opens on pointerenter over the adopted child", () => {
    render(
      <Tooltip>
        <Tooltip.Trigger asChild>
          <a href="#help" data-testid="trigger">Help</a>
        </Tooltip.Trigger>
        <Tooltip.Content data-testid="content">Help text</Tooltip.Content>
      </Tooltip>,
    );
    act(() => {
      fireEvent.pointerEnter(screen.getByTestId("trigger"));
    });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("asChild opens on focus over the adopted child", () => {
    render(
      <Tooltip>
        <Tooltip.Trigger asChild>
          <a href="#help" data-testid="trigger">Help</a>
        </Tooltip.Trigger>
        <Tooltip.Content data-testid="content">Help text</Tooltip.Content>
      </Tooltip>,
    );
    act(() => {
      fireEvent.focus(screen.getByTestId("trigger"));
    });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("asChild wires aria-describedby onto the adopted child when open", () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger asChild>
          <a href="#help" data-testid="trigger">Help</a>
        </Tooltip.Trigger>
        <Tooltip.Content data-testid="content">Help text</Tooltip.Content>
      </Tooltip>,
    );
    const trigger = screen.getByTestId("trigger");
    const content = screen.getByTestId("content");
    expect(trigger).toHaveAttribute("aria-describedby", content.getAttribute("id"));
  });

  it("asChild preserves the consumer's onPointerEnter handler", () => {
    const consumerSpy = vi.fn();
    const surfaceSpy = vi.fn();
    render(
      <Tooltip onOpenChange={surfaceSpy}>
        <Tooltip.Trigger asChild>
          <a href="#help" data-testid="trigger" onPointerEnter={consumerSpy}>
            Help
          </a>
        </Tooltip.Trigger>
        <Tooltip.Content data-testid="content">Help text</Tooltip.Content>
      </Tooltip>,
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
      <Tooltip>
        <Tooltip.Trigger asChild>
          <a href="#help" data-testid="trigger" onFocus={consumerSpy}>
            Help
          </a>
        </Tooltip.Trigger>
        <Tooltip.Content data-testid="content">Help text</Tooltip.Content>
      </Tooltip>,
    );
    act(() => {
      fireEvent.focus(screen.getByTestId("trigger"));
    });
    expect(consumerSpy).toHaveBeenCalled();
  });

  it("asChild — consumer event.preventDefault() suppresses the surface handler", () => {
    const surfaceSpy = vi.fn();
    render(
      <Tooltip onOpenChange={surfaceSpy}>
        <Tooltip.Trigger asChild>
          <a
            href="#help"
            data-testid="trigger"
            onPointerEnter={(e) => e.preventDefault()}
          >
            Help
          </a>
        </Tooltip.Trigger>
        <Tooltip.Content data-testid="content">Help text</Tooltip.Content>
      </Tooltip>,
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
      <Tooltip>
        <Tooltip.Trigger asChild>
          <a href="#help" data-testid="trigger" ref={consumerRef}>
            Help
          </a>
        </Tooltip.Trigger>
        <Tooltip.Content data-testid="content">Help text</Tooltip.Content>
      </Tooltip>,
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
        <Tooltip>
          <Tooltip.Trigger asChild>{null}</Tooltip.Trigger>
          <Tooltip.Content data-testid="content">Help text</Tooltip.Content>
        </Tooltip>,
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
        <Tooltip>
          <Tooltip.Trigger asChild>
            <a href="#a">A</a>
            <a href="#b">B</a>
          </Tooltip.Trigger>
          <Tooltip.Content data-testid="content">Help text</Tooltip.Content>
        </Tooltip>,
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
        <Tooltip>
          <Tooltip.Trigger asChild>Help text</Tooltip.Trigger>
          <Tooltip.Content data-testid="content">Help text</Tooltip.Content>
        </Tooltip>,
      ),
    ).toThrow();
    consoleErrorSpy.mockRestore();
  });

  it("asChild applies the data-tooltip-trigger marker to the adopted host", () => {
    render(
      <Tooltip>
        <Tooltip.Trigger asChild>
          <a href="#help" data-testid="trigger">Help</a>
        </Tooltip.Trigger>
        <Tooltip.Content data-testid="content">Help text</Tooltip.Content>
      </Tooltip>,
    );
    expect(screen.getByTestId("trigger")).toHaveAttribute("data-tooltip-trigger");
  });
});

describe("Tooltip — accessibility", () => {
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
});
// @generated:end

// @custom:start tests

// @custom:end
