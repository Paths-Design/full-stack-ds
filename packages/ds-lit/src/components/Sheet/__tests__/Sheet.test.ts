// @generated:start imports
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import "../Sheet";
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

describe("Sheet — unit", () => {
  it("renders with default props", async () => {
    const { element } = await renderElement("fsds-sheet");
    expect(element).toBeInstanceOf(HTMLElement);
  });

  it("applies the base CSS class", async () => {
    const { element } = await renderElement("fsds-sheet", { "open": true });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("sheet");
  });

  it("applies side=top variant class", async () => {
    const { element } = await renderElement("fsds-sheet", { "open": true, "side": "top" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("sheet--top");
  });

  it("applies side=right variant class", async () => {
    const { element } = await renderElement("fsds-sheet", { "open": true, "side": "right" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("sheet--right");
  });

  it("applies side=bottom variant class", async () => {
    const { element } = await renderElement("fsds-sheet", { "open": true, "side": "bottom" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("sheet--bottom");
  });

  it("applies side=left variant class", async () => {
    const { element } = await renderElement("fsds-sheet", { "open": true, "side": "left" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("sheet--left");
  });

  it("closes on Escape key", async () => {
    const onOpenChangeSpy = vi.fn();
    const { element } = await renderElement("fsds-sheet", { "open": true });
    (element as unknown as Record<string, unknown>)["onOpenChange"] = onOpenChangeSpy;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });

  it("closes on overlay click", async () => {
    const onOpenChangeSpy = vi.fn();
    const { element } = await renderElement("fsds-sheet", { "open": true });
    (element as unknown as Record<string, unknown>)["onOpenChange"] = onOpenChangeSpy;
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });

  it("reflects openness=true after behavior.setOpenness(true)", async () => {
    const { element } = await renderElement("fsds-sheet");
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
    const { element } = await renderElement("fsds-sheet");
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

describe("Sheet — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { element } = await renderElement("fsds-sheet", { "open": true }, [{"slotName":"title","html":"<span>Test Sheet title</span>"},{"slotName":"description","html":"<span>Test Sheet description</span>"},{"html":"<span>content</span>"}]);
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

// @custom:end
