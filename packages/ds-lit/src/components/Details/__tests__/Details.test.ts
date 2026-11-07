// @generated:start imports
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import "../Details";
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

const requiredProps = { "summary": "placeholder" };

describe("Details — unit", () => {
  it("renders with default props", async () => {
    const { element } = await renderElement("fsds-details");
    expect(element).toBeInstanceOf(HTMLElement);
  });

  it("applies the base CSS class", async () => {
    const { element } = await renderElement("fsds-details", { "open": true });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("details");
  });

  it("toggles the open channel from the summary click", async () => {
    const { element } = await renderElement("fsds-details");
    const seen: boolean[] = [];
    (element as LitTestElement & { onOpenChange?: (v: boolean) => void }).onOpenChange = (v: boolean) => seen.push(v);
    await (element as LitTestElement).updateComplete;
    const host = element.shadowRoot?.querySelector(".details__summary") as HTMLElement;
    host.click();
    expect(seen).toEqual([true]);
  });

  it("applies variant=default variant class", async () => {
    const { element } = await renderElement("fsds-details", { "open": true, "variant": "default" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("details--default");
  });

  it("applies variant=inline variant class", async () => {
    const { element } = await renderElement("fsds-details", { "open": true, "variant": "inline" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("details--inline");
  });

  it("applies variant=compact variant class", async () => {
    const { element } = await renderElement("fsds-details", { "open": true, "variant": "compact" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("details--compact");
  });

  it("applies icon=left variant class", async () => {
    const { element } = await renderElement("fsds-details", { "open": true, "icon": "left" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("details--left");
  });

  it("applies icon=right variant class", async () => {
    const { element } = await renderElement("fsds-details", { "open": true, "icon": "right" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("details--right");
  });

  it("applies icon=none variant class", async () => {
    const { element } = await renderElement("fsds-details", { "open": true, "icon": "none" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("details--none");
  });

  it("reflects open=true after behavior.setOpen(true)", async () => {
    const { element } = await renderElement("fsds-details");
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
    const { element } = await renderElement("fsds-details");
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

describe("Details — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { element } = await renderElement("fsds-details", { "summary": "placeholder", "aria-label": "Test Details", "open": true }, [{"html":"<span>content</span>"}]);
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
  await customElements.whenDefined(tagName);
  const element = document.createElement(tagName) as LitTestElement;
  for (const fixture of content) {
    const template = document.createElement("template");
    template.innerHTML = fixture.html;
    const child = template.content.firstElementChild as HTMLElement | null;
    if (child && fixture.slotName) child.slot = fixture.slotName;
    element.append(template.content.cloneNode(true));
  }
  for (const [key, value] of Object.entries({ ...requiredProps, ...props })) {
    (element as unknown as Record<string, unknown>)[key] = value;
    if (typeof value === "boolean") {
      if (value) element.setAttribute(key, "");
    } else {
      element.setAttribute(key, String(value));
    }
  }
  const container = document.createElement("div");
  container.append(element);
  renderedContainers.add(container);
  document.body.append(container);
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
