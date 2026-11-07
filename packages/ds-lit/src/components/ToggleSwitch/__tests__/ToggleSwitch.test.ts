// @generated:start imports
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import "../ToggleSwitch";
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

describe("ToggleSwitch — unit", () => {
  it("renders with default props", async () => {
    const { element } = await renderElement("fsds-toggle-switch");
    expect(element).toBeInstanceOf(HTMLElement);
  });

  it("applies the base CSS class", async () => {
    const { element } = await renderElement("fsds-toggle-switch");
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("toggle-switch");
  });

  it("toggles the checked channel from the root click", async () => {
    const { element } = await renderElement("fsds-toggle-switch");
    const seen: boolean[] = [];
    (element as LitTestElement & { onChange?: (v: boolean) => void }).onChange = (v: boolean) => seen.push(v);
    await (element as LitTestElement).updateComplete;
    const host = element.shadowRoot?.querySelector(".toggle-switch") as HTMLElement;
    host.click();
    expect(seen).toEqual([true]);
  });

  it("applies size=small variant class", async () => {
    const { element } = await renderElement("fsds-toggle-switch", { "size": "small" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("toggle-switch--small");
  });

  it("applies size=medium variant class", async () => {
    const { element } = await renderElement("fsds-toggle-switch", { "size": "medium" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("toggle-switch--medium");
  });

  it("applies size=large variant class", async () => {
    const { element } = await renderElement("fsds-toggle-switch", { "size": "large" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("toggle-switch--large");
  });

  it("reflects checked=true after behavior.setChecked(true)", async () => {
    const { element } = await renderElement("fsds-toggle-switch");
    const el = element as LitTestElement & {
      behavior?: { setChecked?: (v: boolean) => void; checked?: boolean };
    };
    el.behavior?.setChecked?.(true);
    el.requestUpdate?.();
    await el.updateComplete;
    expect(el.behavior?.checked).toBe(true);
    const trueNode_aria_checked = element.shadowRoot?.querySelector('[aria-checked]');
    expect(trueNode_aria_checked?.getAttribute('aria-checked')).toBe("true");
  });

  it("reflects checked=false after behavior.setChecked(false)", async () => {
    const { element } = await renderElement("fsds-toggle-switch");
    const el = element as LitTestElement & {
      behavior?: { setChecked?: (v: boolean) => void; checked?: boolean };
    };
    el.behavior?.setChecked?.(true);
    el.requestUpdate?.();
    await el.updateComplete;
    el.behavior?.setChecked?.(false);
    el.requestUpdate?.();
    await el.updateComplete;
    expect(el.behavior?.checked).toBe(false);
    const falseNode_aria_checked = element.shadowRoot?.querySelector('[aria-checked]');
    expect(falseNode_aria_checked?.getAttribute('aria-checked')).toBe("false");
  });
});

describe("ToggleSwitch — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { element } = await renderElement("fsds-toggle-switch", { "ariaLabel": "Test ToggleSwitch" });
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
