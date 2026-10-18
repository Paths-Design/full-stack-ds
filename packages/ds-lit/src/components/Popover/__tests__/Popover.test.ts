// @generated:start imports
import { describe, it, expect, vi, afterEach } from "vitest";
import { axe } from "vitest-axe";
import "../Popover.js";

declare module "vitest" {
  interface Assertion<T> {
    // The positional T keeps this augmentation mergeable with vitest's
    // own Assertion<T = any> declaration (TS2428 fires on any rename);
    // the expected param references it so it is never an unused type param.
    toHaveNoViolations(expected?: T): void;
  }
}

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
  closeOnOutsideClick?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, slot an <a href="#open"> as the consumer-rendered
   *  host. Otherwise the default-host <button> path is exercised. */
  withSlottedHost?: boolean;
}

async function mountPopover(opts: MountOptions = {}): Promise<HTMLElement> {
  await Promise.all([
    customElements.whenDefined("fsds-popover"),
    customElements.whenDefined("fsds-popover-trigger"),
    customElements.whenDefined("fsds-popover-content"),
  ]);
  const root = document.createElement("fsds-popover") as HTMLElement;
  const props = root as unknown as Record<string, unknown>;
  if (opts.defaultOpen !== undefined) props.defaultOpen = opts.defaultOpen;
  if (opts.open !== undefined) props.open = opts.open;
  if (opts.disabled !== undefined) props.disabled = opts.disabled;
  if (opts.closeOnEscape !== undefined) props.closeOnEscape = opts.closeOnEscape;
  if (opts.closeOnBlur !== undefined) props.closeOnBlur = opts.closeOnBlur;
  if (opts.closeOnOutsideClick !== undefined) props.closeOnOutsideClick = opts.closeOnOutsideClick;
  if (opts.onOpenChange) props.onOpenChange = opts.onOpenChange;

  const trigger = document.createElement("fsds-popover-trigger") as HTMLElement;
  trigger.setAttribute("data-testid", "trigger-wrapper");
  if (opts.withSlottedHost) {
    const a = document.createElement("a");
    a.setAttribute("href", "#open");
    a.setAttribute("data-testid", "slotted-host");
    a.textContent = "Open";
    trigger.appendChild(a);
  }

  const content = document.createElement("fsds-popover-content") as HTMLElement;
  content.setAttribute("data-testid", "content");
  content.textContent = "Body";

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
  const trigger = root.querySelector("fsds-popover-trigger") as HTMLElement;
  return trigger.shadowRoot!.querySelector("button") as HTMLElement;
}

function getContentEl(root: HTMLElement): HTMLElement | null {
  // Queried from document (not root) because a portalled content host
  // relocates itself to document.body while open, escaping the root
  // subtree; document.querySelector still finds it either way.
  void root;
  const host = document.querySelector("fsds-popover-content") as HTMLElement | null;
  return host && host.hasAttribute("data-popover-content") ? host : null;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Popover — compound API surface (default-host)", () => {
  it("renders the trigger but not the content when closed", async () => {
    const root = await mountPopover();
    expect(getAnchor(root, false)).toBeTruthy();
    expect(getContentEl(root)).toBeNull();
  });

  it("renders the content when defaultOpen=true", async () => {
    const root = await mountPopover({ defaultOpen: true });
    const content = getContentEl(root);
    expect(content).toBeTruthy();
  });

  it("opens on click of the default <button>", async () => {
    const root = await mountPopover();
    const anchor = getAnchor(root, false);
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle(root);
    expect(getContentEl(root)).toBeTruthy();
  });

  it("toggles closed on a second click of the default <button>", async () => {
    const root = await mountPopover({ defaultOpen: true });
    const anchor = getAnchor(root, false);
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle(root);
    expect(getContentEl(root)).toBeNull();
  });

  it("closes on Escape", async () => {
    const root = await mountPopover({ defaultOpen: true });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle(root);
    expect(getContentEl(root)).toBeNull();
  });

  it("closes on outside-click", async () => {
    const root = await mountPopover({ defaultOpen: true });
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await settle(root);
    expect(getContentEl(root)).toBeNull();
  });

  it("click on content does not count as outside-click", async () => {
    const root = await mountPopover({ defaultOpen: true });
    const content = getContentEl(root)!;
    content.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await settle(root);
    expect(getContentEl(root)).toBeTruthy();
  });

  it("wires aria-controls + aria-expanded on the anchor when open", async () => {
    const root = await mountPopover({ defaultOpen: true });
    const anchor = getAnchor(root, false);
    const content = getContentEl(root)!;
    const id = content.getAttribute("id");
    expect(id).toBeTruthy();
    expect(anchor.getAttribute("aria-controls")).toBe(id);
    expect(anchor.getAttribute("aria-expanded")).toBe("true");
  });

  it("aria-expanded reflects closed state", async () => {
    const root = await mountPopover();
    const anchor = getAnchor(root, false);
    expect(anchor.getAttribute("aria-expanded")).toBe("false");
  });

  it("fires onOpenChange on uncontrolled open", async () => {
    const spy = vi.fn();
    const root = await mountPopover({ onOpenChange: spy });
    const anchor = getAnchor(root, false);
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle(root);
    expect(spy).toHaveBeenCalledWith(true);
  });

  it("respects disabled — click does not open", async () => {
    const root = await mountPopover({ disabled: true });
    const anchor = getAnchor(root, false);
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle(root);
    expect(getContentEl(root)).toBeNull();
  });

  it("controlled open prop overrides internal state", async () => {
    const root = await mountPopover({ open: false });
    const anchor = getAnchor(root, false);
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle(root);
    expect(getContentEl(root)).toBeNull();
    (root as unknown as Record<string, unknown>).open = true;
    await settle(root);
    expect(getContentEl(root)).toBeTruthy();
  });

  it("closeOnEscape=false prevents Escape dismissal", async () => {
    const root = await mountPopover({ defaultOpen: true, closeOnEscape: false });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle(root);
    expect(getContentEl(root)).toBeTruthy();
  });

  it("closeOnOutsideClick=false prevents outside-click dismissal", async () => {
    const root = await mountPopover({ defaultOpen: true, closeOnOutsideClick: false });
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await settle(root);
    expect(getContentEl(root)).toBeTruthy();
  });

  it("disconnecting the root removes document-level listeners", async () => {
    const spy = vi.fn();
    const root = await mountPopover({ defaultOpen: true, onOpenChange: spy });
    root.remove();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("Popover — slot-based host adoption", () => {
  it("captures the slotted <a> as the anchor", async () => {
    const root = await mountPopover({ withSlottedHost: true });
    const anchor = getAnchor(root, true);
    expect(anchor.tagName).toBe("A");
    expect(anchor.hasAttribute("data-popover-trigger")).toBe(true);
  });

  it("click on the slotted anchor opens the popover", async () => {
    const root = await mountPopover({ withSlottedHost: true });
    const anchor = getAnchor(root, true);
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await settle(root);
    expect(getContentEl(root)).toBeTruthy();
  });

  it("aria-controls + aria-expanded wire to the slotted anchor when open", async () => {
    const root = await mountPopover({ withSlottedHost: true, defaultOpen: true });
    const anchor = getAnchor(root, true);
    const content = getContentEl(root)!;
    const id = content.getAttribute("id");
    expect(id).toBeTruthy();
    expect(anchor.getAttribute("aria-controls")).toBe(id);
    expect(anchor.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("Popover — accessibility", () => {
  it("has no unexpected axe violations when closed", async () => {
    const root = await mountPopover({ withSlottedHost: true });
    const results = (await axe(root)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it("has no unexpected axe violations when open", async () => {
    const root = await mountPopover({ withSlottedHost: true, defaultOpen: true });
    const results = (await axe(root)) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

describe("Popover — anchored positioning", () => {
  it("applies fixed positioning and a data-placement attribute to the content host when open", async () => {
    const root = await mountPopover({ defaultOpen: true });
    const content = getContentEl(root)!;
    expect(content).toBeTruthy();
    expect(content.style.position).toBe("fixed");
    expect(content.hasAttribute("data-placement")).toBe(true);
  });

  it("does not carry positioning styles or data-placement when closed", async () => {
    const root = await mountPopover();
    const host = root.querySelector("fsds-popover-content") as HTMLElement;
    expect(host.hasAttribute("data-placement")).toBe(false);
  });
});

describe("Popover — content portal (FEAT-ANCHORED-SURFACE-XFW-01)", () => {
  it("relocates the content host to document.body while open", async () => {
    const root = await mountPopover({ defaultOpen: true });
    const portaled = document.body.querySelector("fsds-popover-content[data-popover-content]") as HTMLElement | null;
    expect(portaled).toBeTruthy();
    expect(portaled?.parentElement).toBe(document.body);
    expect(root.contains(portaled)).toBe(false);
  });

  it("restores the content host to its original position when closed", async () => {
    // Queried from document.body (not root.querySelector) — a
    // portalled content host is a SIBLING of root at the body level,
    // not a descendant, so root.querySelector would never find it.
    const root = await mountPopover({ defaultOpen: true });
    const contentHost = document.body.querySelector("fsds-popover-content") as HTMLElement;
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
