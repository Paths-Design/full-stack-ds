// @generated:start imports
import { describe, it, expect, vi, afterEach } from "vitest";
import { axe } from "vitest-axe";
import "../Tooltip.js";

declare module "vitest" {
  interface Assertion<T> {
    // The positional T keeps this augmentation mergeable with vitest's
    // own Assertion<T = any> declaration (TS2428 fires on any rename);
    // the expected param references it so it is never an unused type param.
    toHaveNoViolations(expected?: T): void;
  }
}

/**
 * Settle Lit updates and microtasks. Custom elements queue work
 * through Promise.resolve().then(...) for context propagation,
 * so awaiting updateComplete alone is not enough.
 */
async function settle(el: Element): Promise<void> {
  await (el as Element & { updateComplete?: Promise<unknown> }).updateComplete;
  await Promise.resolve();
  await Promise.resolve();
}
// @generated:end

// @generated:start tests
interface MountOptions {
  defaultOpen?: boolean;
  open?: boolean;
  disabled?: boolean;
  closeOnEscape?: boolean;
  closeOnBlur?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, slot a <a href="#help"> as the consumer-rendered
   *  host. Otherwise the default-host <button> path is exercised. */
  withSlottedHost?: boolean;
}

async function mountTooltip(opts: MountOptions = {}): Promise<HTMLElement> {
  await Promise.all([
    customElements.whenDefined("fsds-tooltip"),
    customElements.whenDefined("fsds-tooltip-trigger"),
    customElements.whenDefined("fsds-tooltip-content"),
  ]);
  const root = document.createElement("fsds-tooltip") as HTMLElement;
  const props = root as unknown as Record<string, unknown>;
  if (opts.defaultOpen !== undefined) props.defaultOpen = opts.defaultOpen;
  if (opts.open !== undefined) props.open = opts.open;
  if (opts.disabled !== undefined) props.disabled = opts.disabled;
  if (opts.closeOnEscape !== undefined) props.closeOnEscape = opts.closeOnEscape;
  if (opts.closeOnBlur !== undefined) props.closeOnBlur = opts.closeOnBlur;
  if (opts.onOpenChange) props.onOpenChange = opts.onOpenChange;

  const trigger = document.createElement("fsds-tooltip-trigger") as HTMLElement;
  trigger.setAttribute("data-testid", "trigger-wrapper");
  if (opts.withSlottedHost) {
    const a = document.createElement("a");
    a.setAttribute("href", "#help");
    a.setAttribute("data-testid", "slotted-host");
    a.textContent = "Save";
    trigger.appendChild(a);
  }

  const content = document.createElement("fsds-tooltip-content") as HTMLElement;
  content.setAttribute("data-testid", "content");
  content.textContent = "Help text";

  root.appendChild(trigger);
  root.appendChild(content);
  document.body.appendChild(root);

  await settle(root);
  await settle(trigger);
  await settle(content);
  return root;
}

function getAnchor(root: HTMLElement, withSlottedHost: boolean): HTMLElement {
  if (withSlottedHost) {
    return root.querySelector("[data-testid='slotted-host']") as HTMLElement;
  }
  const trigger = root.querySelector("fsds-tooltip-trigger") as HTMLElement;
  return trigger.shadowRoot!.querySelector("button") as HTMLElement;
}

function getContentEl(root: HTMLElement): HTMLElement | null {
  // The content host element reflects open state by setting/removing
  // its own [data-tooltip-content] attribute (and id/role). When
  // closed the attribute is absent and the host renders nothing.
  // Queried from document (not root) because a portalled content host
  // relocates itself to document.body while open, escaping the root
  // subtree; document.querySelector still finds it either way.
  void root;
  const host = document.querySelector("fsds-tooltip-content") as HTMLElement | null;
  return host && host.hasAttribute("data-tooltip-content") ? host : null;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Tooltip — compound API surface (default-host)", () => {
  it("renders the trigger but not the content when closed", async () => {
    const root = await mountTooltip();
    expect(getAnchor(root, false)).toBeTruthy();
    expect(getContentEl(root)).toBeNull();
  });

  it("renders the content when defaultOpen=true", async () => {
    const root = await mountTooltip({ defaultOpen: true });
    const content = getContentEl(root);
    expect(content).toBeTruthy();
    expect(content?.getAttribute("role")).toBe("tooltip");
  });

  it("opens on pointerenter (hover) over the default <button>", async () => {
    const root = await mountTooltip();
    const anchor = getAnchor(root, false);
    anchor.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await settle(root);
    expect(getContentEl(root)).toBeTruthy();
  });

  it("opens on focus over the default <button>", async () => {
    const root = await mountTooltip();
    const anchor = getAnchor(root, false);
    anchor.dispatchEvent(new FocusEvent("focus"));
    await settle(root);
    expect(getContentEl(root)).toBeTruthy();
  });

  it("closes on pointerleave from the anchor (no grace path into content)", async () => {
    const root = await mountTooltip({ defaultOpen: true });
    const anchor = getAnchor(root, false);
    anchor.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, relatedTarget: document.body }));
    await settle(root);
    expect(getContentEl(root)).toBeNull();
  });

  it("closes on Escape", async () => {
    const root = await mountTooltip({ defaultOpen: true });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle(root);
    expect(getContentEl(root)).toBeNull();
  });

  it("closes on focus leaving the surface boundary (focusout)", async () => {
    // Boundary semantics: the substrate listens via focusout
    // (which bubbles, unlike blur) for focus leaving the anchor +
    // content surface. Focus moving from anchor to an outside node
    // dismisses; focus moving from anchor INTO content does not.
    const root = await mountTooltip({ defaultOpen: true });
    const anchor = getAnchor(root, false);
    anchor.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: document.body }));
    await settle(root);
    expect(getContentEl(root)).toBeNull();
  });

  it("wires aria-describedby from anchor to content when open", async () => {
    const root = await mountTooltip({ defaultOpen: true });
    const anchor = getAnchor(root, false);
    const content = getContentEl(root)!;
    const id = content.getAttribute("id");
    expect(id).toBeTruthy();
    expect(anchor.getAttribute("aria-describedby")).toBe(id);
  });

  it("does NOT set aria-describedby when closed", async () => {
    const root = await mountTooltip();
    const anchor = getAnchor(root, false);
    expect(anchor.getAttribute("aria-describedby")).toBeNull();
  });

  it("fires onOpenChange on uncontrolled open", async () => {
    const spy = vi.fn();
    const root = await mountTooltip({ onOpenChange: spy });
    const anchor = getAnchor(root, false);
    anchor.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await settle(root);
    expect(spy).toHaveBeenCalledWith(true);
  });

  it("respects disabled — pointerenter does not open", async () => {
    const root = await mountTooltip({ disabled: true });
    const anchor = getAnchor(root, false);
    anchor.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await settle(root);
    expect(getContentEl(root)).toBeNull();
  });

  it("disabled root does not fire onOpenChange on hover", async () => {
    const spy = vi.fn();
    const root = await mountTooltip({ disabled: true, onOpenChange: spy });
    const anchor = getAnchor(root, false);
    anchor.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await settle(root);
    expect(spy).not.toHaveBeenCalled();
  });

  it("controlled open prop overrides internal state", async () => {
    const root = await mountTooltip({ open: false });
    const anchor = getAnchor(root, false);
    anchor.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await settle(root);
    expect(getContentEl(root)).toBeNull();
    (root as unknown as Record<string, unknown>).open = true;
    await settle(root);
    expect(getContentEl(root)).toBeTruthy();
  });

  it("pointerleave INTO content does not close (grace path)", async () => {
    const root = await mountTooltip({ defaultOpen: true });
    const anchor = getAnchor(root, false);
    const content = getContentEl(root)!;
    anchor.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true, relatedTarget: content }));
    await settle(root);
    expect(getContentEl(root)).toBeTruthy();
  });

  it("closeOnEscape=false prevents Escape dismissal", async () => {
    const root = await mountTooltip({ defaultOpen: true, closeOnEscape: false });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle(root);
    expect(getContentEl(root)).toBeTruthy();
  });

  it("closeOnBlur=false prevents boundary-focusout dismissal", async () => {
    const root = await mountTooltip({ defaultOpen: true, closeOnBlur: false });
    const anchor = getAnchor(root, false);
    anchor.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: document.body }));
    await settle(root);
    expect(getContentEl(root)).toBeTruthy();
  });

  it("disconnecting the root removes document-level listeners", async () => {
    const spy = vi.fn();
    const root = await mountTooltip({ defaultOpen: true, onOpenChange: spy });
    root.remove();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("Tooltip — slot-based host adoption", () => {
  it("uses the slotted <a> as the trigger host (no nested default button is the anchor)", async () => {
    const root = await mountTooltip({ withSlottedHost: true });
    const anchor = getAnchor(root, true);
    expect(anchor.tagName).toBe("A");
    expect(anchor.hasAttribute("data-tooltip-trigger")).toBe(true);
  });

  it("slotted host opens on pointerenter", async () => {
    const root = await mountTooltip({ withSlottedHost: true });
    const anchor = getAnchor(root, true);
    anchor.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await settle(root);
    expect(getContentEl(root)).toBeTruthy();
  });

  it("slotted host opens on focus", async () => {
    const root = await mountTooltip({ withSlottedHost: true });
    const anchor = getAnchor(root, true);
    anchor.dispatchEvent(new FocusEvent("focus"));
    await settle(root);
    expect(getContentEl(root)).toBeTruthy();
  });

  it("slotted host receives aria-describedby when open", async () => {
    const root = await mountTooltip({ withSlottedHost: true, defaultOpen: true });
    const anchor = getAnchor(root, true);
    const content = getContentEl(root)!;
    expect(anchor.getAttribute("aria-describedby")).toBe(content.getAttribute("id"));
  });

  it("consumer event.preventDefault() suppresses the surface handler", async () => {
    const surfaceSpy = vi.fn();
    const root = await mountTooltip({ withSlottedHost: true, onOpenChange: surfaceSpy });
    const anchor = getAnchor(root, true);
    anchor.addEventListener("pointerenter", (e) => e.preventDefault());
    anchor.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, cancelable: true }));
    await settle(root);
    expect(surfaceSpy).not.toHaveBeenCalled();
    expect(getContentEl(root)).toBeNull();
  });

  it("removing the slotted host clears its ARIA + data marker", async () => {
    const root = await mountTooltip({ withSlottedHost: true, defaultOpen: true });
    const anchor = getAnchor(root, true);
    expect(anchor.hasAttribute("data-tooltip-trigger")).toBe(true);
    anchor.remove();
    await settle(root);
    // After removal, the previous anchor's marker was cleared by
    // TooltipTriggerElement's _updateAnchor before disconnecting it.
    expect(anchor.hasAttribute("data-tooltip-trigger")).toBe(false);
  });
});

describe("Tooltip — accessibility", () => {
  it("has no unexpected axe violations when closed", async () => {
    const root = await mountTooltip({ withSlottedHost: true });
    const results = (await axe(root)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it("has no unexpected axe violations when open", async () => {
    const root = await mountTooltip({ withSlottedHost: true, defaultOpen: true });
    const results = (await axe(root)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

describe("Tooltip — anchored positioning", () => {
  it("applies fixed positioning and a data-placement attribute to the content host when open", async () => {
    const root = await mountTooltip({ defaultOpen: true });
    const content = getContentEl(root)!;
    expect(content).toBeTruthy();
    expect(content.style.position).toBe("fixed");
    expect(content.hasAttribute("data-placement")).toBe(true);
  });

  it("does not carry positioning styles or data-placement when closed", async () => {
    const root = await mountTooltip();
    const host = root.querySelector("fsds-tooltip-content") as HTMLElement;
    expect(host.hasAttribute("data-placement")).toBe(false);
  });
});

describe("Tooltip — content portal (FEAT-ANCHORED-SURFACE-XFW-01)", () => {
  it("relocates the content host to document.body while open", async () => {
    const root = await mountTooltip({ defaultOpen: true });
    const portaled = document.body.querySelector("fsds-tooltip-content[data-tooltip-content]") as HTMLElement | null;
    expect(portaled).toBeTruthy();
    expect(portaled?.parentElement).toBe(document.body);
    expect(root.contains(portaled)).toBe(false);
  });

  it("restores the content host to its original position when closed", async () => {
    // Queried from document.body (not root.querySelector) — a
    // portalled content host is a SIBLING of root at the body level,
    // not a descendant, so root.querySelector would never find it.
    const root = await mountTooltip({ defaultOpen: true });
    const contentHost = document.body.querySelector("fsds-tooltip-content") as HTMLElement;
    expect(contentHost).toBeTruthy();
    expect(contentHost.parentElement).toBe(document.body);

    (root as unknown as Record<string, unknown>).open = false;
    await settle(root);
    await settle(contentHost);

    expect(contentHost.parentElement).toBe(root);
    // Not a DIRECT child of body anymore — root itself lives under
    // body in this fixture, so document.body.contains() would be
    // trivially true either way; parentElement identity above is
    // the load-bearing assertion.
    expect(Array.from(document.body.children)).not.toContain(contentHost);
  });
});
// @generated:end

// @custom:start tests

// @custom:end
