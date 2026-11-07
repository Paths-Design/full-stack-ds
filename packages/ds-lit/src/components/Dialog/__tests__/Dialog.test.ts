// @generated:start imports
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import "../Dialog";
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

describe("Dialog — unit", () => {
  it("renders with default props", async () => {
    const { element } = await renderElement("fsds-dialog");
    expect(element).toBeInstanceOf(HTMLElement);
  });

  it("applies the base CSS class", async () => {
    const { element } = await renderElement("fsds-dialog", { "open": true });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("dialog");
  });

  it("applies size=sm variant class", async () => {
    const { element } = await renderElement("fsds-dialog", { "open": true, "size": "sm" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("dialog--sm");
  });

  it("applies size=md variant class", async () => {
    const { element } = await renderElement("fsds-dialog", { "open": true, "size": "md" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("dialog--md");
  });

  it("applies size=lg variant class", async () => {
    const { element } = await renderElement("fsds-dialog", { "open": true, "size": "lg" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("dialog--lg");
  });

  it("applies size=xl variant class", async () => {
    const { element } = await renderElement("fsds-dialog", { "open": true, "size": "xl" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("dialog--xl");
  });

  it("applies size=full variant class", async () => {
    const { element } = await renderElement("fsds-dialog", { "open": true, "size": "full" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("dialog--full");
  });

  it("closes on Escape key", async () => {
    const onOpenChangeSpy = vi.fn();
    const { element } = await renderElement("fsds-dialog", { "open": true });
    (element as unknown as Record<string, unknown>)["onOpenChange"] = onOpenChangeSpy;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });

  it("closes on overlay click", async () => {
    const onOpenChangeSpy = vi.fn();
    const { element } = await renderElement("fsds-dialog", { "open": true });
    (element as unknown as Record<string, unknown>)["onOpenChange"] = onOpenChangeSpy;
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });

  it("reflects openness=true after behavior.setOpenness(true)", async () => {
    const { element } = await renderElement("fsds-dialog");
    const el = element as LitTestElement & {
      behavior?: { setOpenness?: (v: boolean) => void; openness?: boolean };
    };
    el.behavior?.setOpenness?.(true);
    el.requestUpdate?.();
    await el.updateComplete;
    expect(el.behavior?.openness).toBe(true);
    // Guarded subtree should now be rendered (codegen marker).
    expect(element.shadowRoot?.querySelector('[data-fsds-channel-renders="openness"]')).not.toBeNull();
  });

  it("reflects openness=false after behavior.setOpenness(false)", async () => {
    const { element } = await renderElement("fsds-dialog");
    const el = element as LitTestElement & {
      behavior?: { setOpenness?: (v: boolean) => void; openness?: boolean };
    };
    el.behavior?.setOpenness?.(true);
    el.requestUpdate?.();
    await el.updateComplete;
    el.behavior?.setOpenness?.(false);
    el.requestUpdate?.();
    await el.updateComplete;
    expect(el.behavior?.openness).toBe(false);
    // Guarded subtree should be torn down after the channel flips false.
    expect(element.shadowRoot?.querySelector('[data-fsds-channel-renders="openness"]')).toBeNull();
  });
});

describe("Dialog — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { element } = await renderElement("fsds-dialog", { "open": true }, [{"slotName":"title","html":"<span>Test Dialog title</span>"},{"html":"<span>content</span>"}]);
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
describe("Dialog — portal (FEAT-PORTAL-MECHANISM-CROSS-FRAMEWORK-01)", () => {
  it("relocates the host element to document.body, escaping an ancestor stacking context", async () => {
    // A transform/overflow ancestor creates a stacking context that would clip
    // a merely-fixed dialog. The Lit element moves its own host (keeping its
    // shadow root and styles) to document.body so the fixed layer escapes it.
    const ancestor = document.createElement("div");
    ancestor.style.transform = "translateZ(0)";
    ancestor.style.overflow = "hidden";
    document.body.append(ancestor);

    const element = document.createElement("fsds-dialog") as HTMLElement & {
      open?: boolean;
      updateComplete?: Promise<unknown>;
    };
    element.open = true;
    ancestor.append(element);
    await customElements.whenDefined("fsds-dialog");
    await element.updateComplete;

    // Load-bearing: connectedCallback moved the host out of the transform
    // ancestor and onto document.body. The shadow root (and its scoped styles)
    // travels with the host, so styling survives the relocation.
    expect(element.parentElement).toBe(document.body);
    expect(ancestor.contains(element)).toBe(false);
    expect(element.shadowRoot?.querySelector(".dialog")).not.toBeNull();

    element.remove();
    ancestor.remove();
  });
});


// @custom:end
