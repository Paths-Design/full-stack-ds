// @generated:start imports
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import "../Toast";
// @generated:end

// @generated:start tests
const renderedContainers = new Set<HTMLElement>();
afterEach(() => {
  for (const container of renderedContainers) container.remove();
  renderedContainers.clear();
});

const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Toast — unit", () => {
  it("renders with default props", async () => {
    const { element } = await renderElement("fsds-toast");
    expect(element).toBeInstanceOf(HTMLElement);
  });

  it("applies the base CSS class", async () => {
    const { element } = await renderElement("fsds-toast", { "open": true });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("toast");
  });

  it("applies variant=info variant class", async () => {
    const { element } = await renderElement("fsds-toast", { "open": true, "variant": "info" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("toast--info");
  });

  it("applies variant=success variant class", async () => {
    const { element } = await renderElement("fsds-toast", { "open": true, "variant": "success" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("toast--success");
  });

  it("applies variant=warning variant class", async () => {
    const { element } = await renderElement("fsds-toast", { "open": true, "variant": "warning" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("toast--warning");
  });

  it("applies variant=error variant class", async () => {
    const { element } = await renderElement("fsds-toast", { "open": true, "variant": "error" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("toast--error");
  });

  it("applies politeness=polite variant class", async () => {
    const { element } = await renderElement("fsds-toast", { "open": true, "politeness": "polite" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("toast--polite");
  });

  it("applies politeness=assertive variant class", async () => {
    const { element } = await renderElement("fsds-toast", { "open": true, "politeness": "assertive" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("toast--assertive");
  });

  it("closes on Escape key", async () => {
    const onOpenChangeSpy = vi.fn();
    const { element } = await renderElement("fsds-toast", { "open": true });
    (element as unknown as Record<string, unknown>)["onOpenChange"] = onOpenChangeSpy;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });

  it("reflects open=true after behavior.setOpen(true)", async () => {
    const { element } = await renderElement("fsds-toast");
    const el = element as LitTestElement & {
      behavior?: { setOpen?: (v: boolean) => void; open?: boolean };
    };
    el.behavior?.setOpen?.(true);
    el.requestUpdate?.();
    await el.updateComplete;
    expect(el.behavior?.open).toBe(true);
    // Guarded subtree should now be rendered (codegen marker).
    expect(element.shadowRoot?.querySelector('[data-fsds-channel-renders="open"]')).not.toBeNull();
  });

  it("reflects open=false after behavior.setOpen(false)", async () => {
    const { element } = await renderElement("fsds-toast");
    const el = element as LitTestElement & {
      behavior?: { setOpen?: (v: boolean) => void; open?: boolean };
    };
    el.behavior?.setOpen?.(true);
    el.requestUpdate?.();
    await el.updateComplete;
    el.behavior?.setOpen?.(false);
    el.requestUpdate?.();
    await el.updateComplete;
    expect(el.behavior?.open).toBe(false);
    // Guarded subtree should be torn down after the channel flips false.
    expect(element.shadowRoot?.querySelector('[data-fsds-channel-renders="open"]')).toBeNull();
  });
});

describe("Toast — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { element } = await renderElement("fsds-toast", { "aria-label": "Test Toast", "open": true }, [{"html":"<span>content</span>"}]);
    const results = await axe(element, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

interface RenderedElement {
  element: HTMLElement;
  stack: Element | null | undefined;
}

interface LitTestElement extends HTMLElement {
  updateComplete?: Promise<unknown>;
  requestUpdate?: () => void;
}

interface AccessibilityContent {
  slotName?: string;
  html: string;
}

function classTokens(element: Element | null | undefined): string[] {
  return (element?.className ?? "").split(/\s+/).filter(Boolean);
}

async function renderElement(tagName: string, props: Record<string, unknown> = {}, content: AccessibilityContent[] = []): Promise<RenderedElement> {
  const element = document.createElement(tagName) as LitTestElement;
  for (const fixture of content) {
    const template = document.createElement("template");
    template.innerHTML = fixture.html;
    const child = template.content.firstElementChild as HTMLElement | null;
    if (child && fixture.slotName) child.slot = fixture.slotName;
    element.append(template.content.cloneNode(true));
  }
  const container = document.createElement("div");
  container.append(element);
  renderedContainers.add(container);
  document.body.append(container);
  await customElements.whenDefined(tagName);
  for (const [key, value] of Object.entries(props)) {
    (element as unknown as Record<string, unknown>)[key] = value;
    if (typeof value === "boolean") {
      if (value) element.setAttribute(key, "");
    } else {
      element.setAttribute(key, String(value));
    }
  }
  element.requestUpdate?.();
  await element.updateComplete;
  // Named slots can schedule one follow-up render via slotchange.
  await Promise.resolve();
  await element.updateComplete;
  return { element, stack: element.shadowRoot?.querySelector("fsds-stack") };
}
// @generated:end

// @custom:start tests

describe("Toast — action slot presence (SlotPresenceController)", () => {
  it("wraps a light-DOM action child present at mount in exactly one .toast__action, with the slot assigning that child", async () => {
    const { element } = await renderElement("fsds-toast", { open: true }, [
      { html: '<button slot="action">Undo</button>' },
    ]);
    const actionButton = element.querySelector('[slot="action"]');
    const wrappers = element.shadowRoot?.querySelectorAll(".toast__action");
    expect(wrappers?.length).toBe(1);
    const slot = element.shadowRoot?.querySelector('slot[name="action"]') as HTMLSlotElement | null | undefined;
    expect(slot?.assignedElements()).toContain(actionButton);
  });

  it("renders no .toast__action wrapper when mounted with no action child", async () => {
    const { element } = await renderElement("fsds-toast", { open: true });
    expect(element.shadowRoot?.querySelector(".toast__action")).toBeNull();
  });

  it("adds .toast__action when an action child is appended post-mount, and removes it when the child is removed", async () => {
    const { element } = await renderElement("fsds-toast", { open: true });
    const el = element as LitTestElement;
    expect(element.shadowRoot?.querySelector(".toast__action")).toBeNull();

    const actionButton = document.createElement("button");
    actionButton.slot = "action";
    actionButton.textContent = "Undo";
    element.append(actionButton);
    // SlotPresenceController learns of the new child via MutationObserver,
    // which schedules its callback as a microtask after the current task.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
    expect(element.shadowRoot?.querySelector(".toast__action")).not.toBeNull();

    actionButton.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
    expect(element.shadowRoot?.querySelector(".toast__action")).toBeNull();
  });
});

describe("Toast — live-region roles", () => {
  it("marks the root as a labeled, polite-by-default live region", async () => {
    const { element } = await renderElement("fsds-toast", { open: true });
    const region = element.shadowRoot?.querySelector(".toast");
    expect(region?.getAttribute("role")).toBe("region");
    expect(region?.getAttribute("aria-label")).toBe("Notifications");
    expect(region?.getAttribute("aria-live")).toBe("polite");
  });

  it("sets aria-live to assertive when politeness=assertive", async () => {
    const { element } = await renderElement("fsds-toast", { open: true, politeness: "assertive" });
    expect(element.shadowRoot?.querySelector(".toast")?.getAttribute("aria-live")).toBe("assertive");
  });

  it("marks the toast item with role=status", async () => {
    const { element } = await renderElement("fsds-toast", { open: true });
    expect(element.shadowRoot?.querySelector(".toast__item")?.getAttribute("role")).toBe("status");
  });

  it("never uses role=alert anywhere in the shadow root", async () => {
    const { element } = await renderElement("fsds-toast", { open: true });
    expect(element.shadowRoot?.querySelector('[role="alert"]')).toBeNull();
  });
});

// @custom:end
