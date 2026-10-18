// @generated:start imports
import { createRef } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Popover } from "../Popover";

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
function renderPopover(props: Partial<React.ComponentProps<typeof Popover>> = {}) {
  return render(
    <Popover {...props}>
      <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
      <Popover.Content data-testid="content">
        <button data-testid="content-button">action</button>
      </Popover.Content>
    </Popover>,
  );
}

describe("Popover — compound API surface", () => {
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

describe("Popover — asChild adoption", () => {
  it("renders the adopted child as the actual host (no nested button)", () => {
    render(
      <Popover>
        <Popover.Trigger asChild>
          <a href="#open" data-testid="trigger">Open</a>
        </Popover.Trigger>
        <Popover.Content data-testid="content">Body</Popover.Content>
      </Popover>,
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
      <Popover>
        <Popover.Trigger asChild>
          <a href="#open" data-testid="trigger">Open</a>
        </Popover.Trigger>
        <Popover.Content data-testid="content">Body</Popover.Content>
      </Popover>,
    );
    act(() => {
      fireEvent.click(screen.getByTestId("trigger"));
    });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("asChild — consumer event.preventDefault() suppresses the surface handler", () => {
    const surfaceSpy = vi.fn();
    render(
      <Popover onOpenChange={surfaceSpy}>
        <Popover.Trigger asChild>
          <a
            href="#open"
            data-testid="trigger"
            onClick={(e) => e.preventDefault()}
          >
            Open
          </a>
        </Popover.Trigger>
        <Popover.Content data-testid="content">Body</Popover.Content>
      </Popover>,
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
      <Popover>
        <Popover.Trigger asChild>
          <a href="#open" data-testid="trigger" ref={consumerRef}>Open</a>
        </Popover.Trigger>
        <Popover.Content data-testid="content">Body</Popover.Content>
      </Popover>,
    );
    expect(consumerRef.current).not.toBeNull();
    expect(consumerRef.current?.tagName).toBe("A");
  });

  it("asChild applies the data-popover-trigger marker to the adopted host", () => {
    render(
      <Popover>
        <Popover.Trigger asChild>
          <a href="#open" data-testid="trigger">Open</a>
        </Popover.Trigger>
        <Popover.Content data-testid="content">Body</Popover.Content>
      </Popover>,
    );
    expect(screen.getByTestId("trigger")).toHaveAttribute("data-popover-trigger");
  });
});

describe("Popover — accessibility", () => {
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
});
// @generated:end

// @custom:start tests
// Atom C: behavioral coverage that proves the substrate generalization
// from atom A (boundary-focusout) works end-to-end for Popover, plus
// asserts the surface contract semantics that are specific to the
// interactive-content + click-driven family (controlled-open, outside-
// click, click-inside-content preservation, consumer handler
// composition). These tests live in the @custom block because they
// are Popover-shape behaviors rather than kind-agnostic scaffolding;
// adding them to the generator would make it carry every kind's
// idiosyncrasies prematurely.

describe("Popover — controlled mode", () => {
  it("open prop overrides internal state (uncontrolled click does not change rendered DOM)", () => {
    const { rerender } = render(
      <Popover open={false}>
        <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
        <Popover.Content data-testid="content">Body</Popover.Content>
      </Popover>,
    );
    const trigger = screen.getByTestId("trigger");
    act(() => {
      fireEvent.click(trigger);
    });
    // Controlled open=false: substrate ignored the click and content
    // stays unrendered.
    expect(screen.queryByTestId("content")).toBeNull();

    rerender(
      <Popover open={true}>
        <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
        <Popover.Content data-testid="content">Body</Popover.Content>
      </Popover>,
    );
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("controlled open=true: clicking trigger fires onOpenChange but DOM is consumer-driven", () => {
    const spy = vi.fn();
    render(
      <Popover open={true} onOpenChange={spy}>
        <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
        <Popover.Content data-testid="content">Body</Popover.Content>
      </Popover>,
    );
    act(() => {
      fireEvent.click(screen.getByTestId("trigger"));
    });
    // Substrate's click toggle dispatched onOpenChange(false) (toggle
    // of current open=true). Consumer didn't update prop, so content
    // stays mounted — this is the standard controlled-component
    // contract.
    expect(spy).toHaveBeenCalledWith(false);
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });
});

describe("Popover — outside-click dismissal", () => {
  it("closes on mousedown outside the anchor and content", () => {
    render(
      <div>
        <button data-testid="outside">outside</button>
        <Popover defaultOpen>
          <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
          <Popover.Content data-testid="content">Body</Popover.Content>
        </Popover>
      </div>,
    );
    const outside = screen.getByTestId("outside");
    act(() => {
      fireEvent.mouseDown(outside);
    });
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("does NOT close on mousedown on the trigger", () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
        <Popover.Content data-testid="content">Body</Popover.Content>
      </Popover>,
    );
    act(() => {
      fireEvent.mouseDown(screen.getByTestId("trigger"));
    });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("does NOT close on mousedown inside the content", () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
        <Popover.Content data-testid="content">
          <button data-testid="content-button">action</button>
        </Popover.Content>
      </Popover>,
    );
    act(() => {
      fireEvent.mouseDown(screen.getByTestId("content-button"));
    });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("closeOnOutsideClick={false} prevents outside-click dismissal", () => {
    render(
      <div>
        <button data-testid="outside">outside</button>
        <Popover defaultOpen closeOnOutsideClick={false}>
          <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
          <Popover.Content data-testid="content">Body</Popover.Content>
        </Popover>
      </div>,
    );
    act(() => {
      fireEvent.mouseDown(screen.getByTestId("outside"));
    });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });
});

describe("Popover — boundary focus dismissal (atom A substrate)", () => {
  // The substrate listens via `focusout` on both anchor and content
  // nodes and uses `relatedTarget ∈ anchor ∪ content` as the
  // boundary predicate. These tests dispatch native FocusEvents so
  // we hit the substrate path directly. jsdom's testing-library
  // fireEvent.blur also fires focusout (verified via a probe in
  // atom A's substrate test file), but going through the native
  // event is unambiguous.
  function dispatchFocusOut(from: HTMLElement, to: EventTarget | null): void {
    from.dispatchEvent(
      new FocusEvent("focusout", {
        bubbles: true,
        cancelable: false,
        relatedTarget: to as EventTarget,
      }),
    );
  }

  it("stays open when focus moves trigger → content (boundary stays inside surface)", () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
        <Popover.Content data-testid="content">
          <button data-testid="content-button">action</button>
        </Popover.Content>
      </Popover>,
    );
    const trigger = screen.getByTestId("trigger");
    const inside = screen.getByTestId("content-button");
    act(() => {
      dispatchFocusOut(trigger, inside);
    });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("stays open when focus moves content → trigger", () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
        <Popover.Content data-testid="content">
          <button data-testid="content-button">action</button>
        </Popover.Content>
      </Popover>,
    );
    const trigger = screen.getByTestId("trigger");
    const inside = screen.getByTestId("content-button");
    act(() => {
      dispatchFocusOut(inside, trigger);
    });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("stays open when focus moves within content (descendant → descendant)", () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
        <Popover.Content data-testid="content">
          <button data-testid="content-button-a">A</button>
          <button data-testid="content-button-b">B</button>
        </Popover.Content>
      </Popover>,
    );
    const a = screen.getByTestId("content-button-a");
    const b = screen.getByTestId("content-button-b");
    act(() => {
      dispatchFocusOut(a, b);
    });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("closes when focus moves content → outside the surface", () => {
    render(
      <div>
        <button data-testid="outside">outside</button>
        <Popover defaultOpen>
          <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
          <Popover.Content data-testid="content">
            <button data-testid="content-button">action</button>
          </Popover.Content>
        </Popover>
      </div>,
    );
    const inside = screen.getByTestId("content-button");
    const outside = screen.getByTestId("outside");
    act(() => {
      dispatchFocusOut(inside, outside);
    });
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("closes when focus moves trigger → outside", () => {
    render(
      <div>
        <button data-testid="outside">outside</button>
        <Popover defaultOpen>
          <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
          <Popover.Content data-testid="content">Body</Popover.Content>
        </Popover>
      </div>,
    );
    const trigger = screen.getByTestId("trigger");
    const outside = screen.getByTestId("outside");
    act(() => {
      dispatchFocusOut(trigger, outside);
    });
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("closeOnBlur={false} prevents boundary-blur dismissal", () => {
    render(
      <div>
        <button data-testid="outside">outside</button>
        <Popover defaultOpen closeOnBlur={false}>
          <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
          <Popover.Content data-testid="content">Body</Popover.Content>
        </Popover>
      </div>,
    );
    const trigger = screen.getByTestId("trigger");
    const outside = screen.getByTestId("outside");
    act(() => {
      dispatchFocusOut(trigger, outside);
    });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });
});

describe("Popover — closeOn* prop wiring", () => {
  it("closeOnEscape={false} prevents Escape dismissal", () => {
    render(
      <Popover defaultOpen closeOnEscape={false}>
        <Popover.Trigger data-testid="trigger">Open</Popover.Trigger>
        <Popover.Content data-testid="content">Body</Popover.Content>
      </Popover>,
    );
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });
});

describe("Popover — consumer handler preservation (asChild path)", () => {
  it("preserves the consumer's onClick alongside the surface handler", () => {
    const consumerSpy = vi.fn();
    const surfaceSpy = vi.fn();
    render(
      <Popover onOpenChange={surfaceSpy}>
        <Popover.Trigger asChild>
          <a href="#open" data-testid="trigger" onClick={consumerSpy}>
            Open
          </a>
        </Popover.Trigger>
        <Popover.Content data-testid="content">Body</Popover.Content>
      </Popover>,
    );
    act(() => {
      fireEvent.click(screen.getByTestId("trigger"));
    });
    expect(consumerSpy).toHaveBeenCalled();
    expect(surfaceSpy).toHaveBeenCalledWith(true);
  });

  it("consumer onClick that does NOT preventDefault still lets surface open", () => {
    const consumerSpy = vi.fn();
    render(
      <Popover>
        <Popover.Trigger asChild>
          <a href="#open" data-testid="trigger" onClick={consumerSpy}>
            Open
          </a>
        </Popover.Trigger>
        <Popover.Content data-testid="content">Body</Popover.Content>
      </Popover>,
    );
    act(() => {
      fireEvent.click(screen.getByTestId("trigger"));
    });
    expect(consumerSpy).toHaveBeenCalled();
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("asChild path applies aria-controls + aria-expanded onto the adopted host", () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger asChild>
          <a href="#open" data-testid="trigger">Open</a>
        </Popover.Trigger>
        <Popover.Content data-testid="content">Body</Popover.Content>
      </Popover>,
    );
    const trigger = screen.getByTestId("trigger");
    const content = screen.getByTestId("content");
    expect(trigger).toHaveAttribute("aria-controls", content.getAttribute("id"));
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
// @custom:end
