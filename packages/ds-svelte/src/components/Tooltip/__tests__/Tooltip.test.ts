// @generated:start imports
import { describe, expect, it, vi, afterEach } from "vitest";
import type { Component } from "svelte";
import { tick } from "svelte";
import { render, fireEvent } from "@testing-library/svelte";
import { axe } from "vitest-axe";
import TooltipFixture from "./TooltipFixture.svelte";

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
function mountDefault(props: Record<string, unknown> = {}) {
  return render(TooltipFixture as unknown as Component<Record<string, unknown>>, { props });
}

// Portaled content nodes (use:portal) are appended to document.body and
// are not cleaned up by testing-library's unmount in this package; reset
// so each test's content query resolves only its own mount.
afterEach(() => {
  document.body.innerHTML = "";
});

describe("Tooltip — compound API surface", () => {
  it("renders the trigger but not the content when closed", async () => {
    const { container } = mountDefault();
    await tick();
    expect(container.querySelector("[data-testid='trigger']")).toBeTruthy();
    expect(document.body.querySelector("[data-testid='content']")).toBeNull();
  });

  it("renders the content when defaultOpen={true}", async () => {
    mountDefault({ defaultOpen: true });
    await tick();
    const content = document.body.querySelector("[data-testid='content']");
    expect(content).toBeTruthy();
    expect(content?.getAttribute("role")).toBe("tooltip");
  });

  it("opens on pointerenter (hover) over the trigger", async () => {
    const { container } = mountDefault();
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.pointerEnter(trigger);
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("opens on focus over the trigger", async () => {
    const { container } = mountDefault();
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.focus(trigger);
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("closes on pointerleave from the trigger (no grace path into content)", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    trigger.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, relatedTarget: document.body }));
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeNull();
  });

  it("closes on Escape", async () => {
    mountDefault({ defaultOpen: true });
    await tick();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeNull();
  });

  it("closes on focus leaving the surface boundary (focusout)", async () => {
    // Boundary semantics: the substrate listens via focusout
    // (which bubbles, unlike blur) for focus leaving the anchor +
    // content surface. Focus moving from anchor to an outside node
    // dismisses; focus moving from anchor INTO content does not.
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    trigger.dispatchEvent(
      new FocusEvent("focusout", {
        bubbles: true,
        relatedTarget: document.body,
      }),
    );
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeNull();
  });

  it("wires aria-describedby from trigger to content when open", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    const content = document.body.querySelector("[data-testid='content']")!;
    const id = content.getAttribute("id");
    expect(id).toBeTruthy();
    expect(trigger.getAttribute("aria-describedby")).toBe(id);
  });

  it("does NOT set aria-describedby when closed", async () => {
    const { container } = mountDefault();
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    expect(trigger.getAttribute("aria-describedby")).toBeNull();
  });

  it("fires onOpenChange on uncontrolled open", async () => {
    const spy = vi.fn();
    const { container } = mountDefault({ onOpenChange: spy });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.pointerEnter(trigger);
    await tick();
    expect(spy).toHaveBeenCalledWith(true);
  });

  it("respects disabled — pointerenter does not open", async () => {
    const { container } = mountDefault({ disabled: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.pointerEnter(trigger);
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeNull();
  });

  it("disabled root does not fire onOpenChange on hover", async () => {
    const spy = vi.fn();
    const { container } = mountDefault({ disabled: true, onOpenChange: spy });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.pointerEnter(trigger);
    await tick();
    expect(spy).not.toHaveBeenCalled();
  });

  it("controlled open prop overrides internal state", async () => {
    const { container, rerender } = mountDefault({ open: false });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.pointerEnter(trigger);
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeNull();
    await rerender({ open: true });
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("pointerleave INTO content does not close (grace path)", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    const content = document.body.querySelector("[data-testid='content']")!;
    trigger.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, relatedTarget: content }));
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("closeOnEscape={false} prevents Escape dismissal", async () => {
    mountDefault({ defaultOpen: true, closeOnEscape: false });
    await tick();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("closeOnBlur={false} prevents boundary-focusout dismissal", async () => {
    const { container } = mountDefault({ defaultOpen: true, closeOnBlur: false });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    trigger.dispatchEvent(
      new FocusEvent("focusout", {
        bubbles: true,
        relatedTarget: document.body,
      }),
    );
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("unmount removes document-level listeners", async () => {
    const spy = vi.fn();
    const { unmount } = mountDefault({ defaultOpen: true, onOpenChange: spy });
    await tick();
    unmount();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("Tooltip — snippet host adoption", () => {
  it("renders the adopted child as the actual host (no nested button)", async () => {
    const { container } = mountDefault({ asChild: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    expect(trigger.tagName).toBe("A");
    expect(container.querySelector("button")).toBeNull();
  });

  it("asChild opens on pointerenter over the adopted child", async () => {
    const { container } = mountDefault({ asChild: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.pointerEnter(trigger);
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("asChild opens on focus over the adopted child", async () => {
    const { container } = mountDefault({ asChild: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.focus(trigger);
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("asChild wires aria-describedby onto the adopted child when open", async () => {
    const { container } = mountDefault({ asChild: true, defaultOpen: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    const content = document.body.querySelector("[data-testid='content']")!;
    expect(trigger.getAttribute("aria-describedby")).toBe(content.getAttribute("id"));
  });

  it("asChild applies data-tooltip-trigger marker on the adopted host", async () => {
    const { container } = mountDefault({ asChild: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    expect(trigger.hasAttribute("data-tooltip-trigger")).toBe(true);
  });

  it("asChild preserves the consumer's onpointerenter handler when composed manually", async () => {
    const consumerSpy = vi.fn();
    const surfaceSpy = vi.fn();
    const { container } = mountDefault({
      asChild: true,
      onOpenChange: surfaceSpy,
      consumerOnPointerEnter: consumerSpy,
    });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.pointerEnter(trigger);
    await tick();
    expect(consumerSpy).toHaveBeenCalled();
    expect(surfaceSpy).toHaveBeenCalledWith(true);
  });

  it("asChild — consumer event.preventDefault() suppresses the surface handler", async () => {
    const consumerSpy = vi.fn();
    const surfaceSpy = vi.fn();
    const { container } = mountDefault({
      asChild: true,
      onOpenChange: surfaceSpy,
      consumerOnPointerEnter: consumerSpy,
      consumerPreventsDefault: true,
    });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    // `pointerenter` is not cancellable per the DOM spec, so we have
    // to construct a cancellable event manually. Dispatching it on the
    // adopted element exercises the consumer's onpointerenter handler
    // and the substrate's defaultPrevented check.
    trigger.dispatchEvent(new PointerEvent("pointerenter", { bubbles: false, cancelable: true }));
    await tick();
    expect(consumerSpy).toHaveBeenCalled();
    expect(surfaceSpy).not.toHaveBeenCalled();
    expect(document.body.querySelector("[data-testid='content']")).toBeNull();
  });
});

describe("Tooltip — accessibility", () => {
  it("has no unexpected axe violations when closed", async () => {
    const { container } = mountDefault();
    await tick();
    const results = (await axe(container)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it("has no unexpected axe violations when open", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    const results = (await axe(container)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
