// @generated:start imports
import { describe, expect, it, vi, afterEach } from "vitest";
import type { Component } from "svelte";
import { tick } from "svelte";
import { render, fireEvent } from "@testing-library/svelte";
import { axe } from "vitest-axe";
import PopoverFixture from "./PopoverFixture.svelte";

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
  return render(PopoverFixture as unknown as Component<Record<string, unknown>>, { props });
}

// Portaled content nodes (use:portal) are appended to document.body and
// are not cleaned up by testing-library's unmount in this package; reset
// so each test's content query resolves only its own mount.
afterEach(() => {
  document.body.innerHTML = "";
});

describe("Popover — compound API surface", () => {
  it("renders the trigger but not the content when closed", async () => {
    const { container } = mountDefault();
    await tick();
    expect(container.querySelector("[data-testid='trigger']")).toBeTruthy();
    expect(document.body.querySelector("[data-testid='content']")).toBeNull();
  });

  it("renders the content when defaultOpen={true}", async () => {
    mountDefault({ defaultOpen: true });
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("opens on click of the trigger", async () => {
    const { container } = mountDefault();
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.click(trigger);
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("toggles closed on a second click of the trigger", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.click(trigger);
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

  it("closes on outside-click", async () => {
    mountDefault({ defaultOpen: true });
    await tick();
    document.body.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true }),
    );
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeNull();
  });

  it("click on content does not count as outside-click", async () => {
    mountDefault({ defaultOpen: true });
    await tick();
    const content = document.body.querySelector("[data-testid='content']")!;
    content.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("wires aria-controls + aria-expanded on the trigger", async () => {
    const { container } = mountDefault({ defaultOpen: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    const content = document.body.querySelector("[data-testid='content']")!;
    const id = content.getAttribute("id");
    expect(id).toBeTruthy();
    expect(trigger.getAttribute("aria-controls")).toBe(id);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("aria-expanded reflects closed state", async () => {
    const { container } = mountDefault();
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("fires onOpenChange on uncontrolled open", async () => {
    const spy = vi.fn();
    const { container } = mountDefault({ onOpenChange: spy });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.click(trigger);
    await tick();
    expect(spy).toHaveBeenCalledWith(true);
  });

  it("respects disabled — click does not open", async () => {
    const { container } = mountDefault({ disabled: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.click(trigger);
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeNull();
  });

  it("closeOnEscape={false} prevents Escape dismissal", async () => {
    mountDefault({ defaultOpen: true, closeOnEscape: false });
    await tick();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("closeOnOutsideClick={false} prevents outside-click dismissal", async () => {
    mountDefault({ defaultOpen: true, closeOnOutsideClick: false });
    await tick();
    document.body.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true }),
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

describe("Popover — snippet host adoption", () => {
  it("renders the adopted child as the actual host (no nested button)", async () => {
    const { container } = mountDefault({ asChild: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    expect(trigger.tagName).toBe("A");
  });

  it("asChild opens on click over the adopted child", async () => {
    const { container } = mountDefault({ asChild: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.click(trigger);
    await tick();
    expect(document.body.querySelector("[data-testid='content']")).toBeTruthy();
  });

  it("asChild applies the data-popover-trigger marker to the adopted host", async () => {
    const { container } = mountDefault({ asChild: true });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    expect(trigger.hasAttribute("data-popover-trigger")).toBe(true);
  });

  it("consumer-handler composition: consumer onclick runs alongside substrate", async () => {
    const spy = vi.fn();
    const onOpenChange = vi.fn();
    const { container } = mountDefault({
      asChild: true,
      consumerOnClick: spy,
      onOpenChange,
    });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.click(trigger);
    await tick();
    expect(spy).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("consumer preventDefault opts out of substrate open", async () => {
    const onOpenChange = vi.fn();
    const { container } = mountDefault({
      asChild: true,
      consumerPreventsDefault: true,
      onOpenChange,
    });
    await tick();
    const trigger = container.querySelector("[data-testid='trigger']")!;
    await fireEvent.click(trigger);
    await tick();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe("Popover — accessibility", () => {
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
