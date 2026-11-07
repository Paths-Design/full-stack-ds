// @generated:start imports
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import "../Checkbox";
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

describe("Checkbox — unit", () => {
  it("renders with default props", async () => {
    const { element } = await renderElement("fsds-checkbox");
    expect(element).toBeInstanceOf(HTMLElement);
  });

  it("applies the base CSS class", async () => {
    const { element } = await renderElement("fsds-checkbox");
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("checkbox");
  });

  it("applies size=sm variant class", async () => {
    const { element } = await renderElement("fsds-checkbox", { "size": "sm" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("checkbox--sm");
  });

  it("applies size=md variant class", async () => {
    const { element } = await renderElement("fsds-checkbox", { "size": "md" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("checkbox--md");
  });

  it("applies size=lg variant class", async () => {
    const { element } = await renderElement("fsds-checkbox", { "size": "lg" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("checkbox--lg");
  });

  it("reflects checked=true after behavior.setChecked(true)", async () => {
    const { element } = await renderElement("fsds-checkbox");
    const el = element as LitTestElement & {
      behavior?: { setChecked?: (v: boolean) => void; checked?: boolean };
    };
    el.behavior?.setChecked?.(true);
    el.requestUpdate?.();
    await el.updateComplete;
    expect(el.behavior?.checked).toBe(true);
  });

  it("sets .indeterminate as a DOM property (not an attribute) and lowers aria-checked to mixed", async () => {
    const { element } = await renderElement("fsds-checkbox", { "indeterminate": true });
    const el = element.shadowRoot?.querySelector(".checkbox__input") as HTMLInputElement;
    expect(el.indeterminate).toBe(true);
    expect(el.getAttribute("aria-checked")).toBe("mixed");
  });

  it("re-applies .indeterminate when the property changes from true to false, and aria-checked reflects checked state again", async () => {
    const { element } = await renderElement("fsds-checkbox", { "indeterminate": true });
    const el = element.shadowRoot?.querySelector(".checkbox__input") as HTMLInputElement;
    expect(el.indeterminate).toBe(true);
    (element as unknown as Record<string, boolean>)["indeterminate"] = false;
    (element as LitTestElement).requestUpdate?.();
    await (element as LitTestElement).updateComplete;
    expect(el.indeterminate).toBe(false);
    expect(el.getAttribute("aria-checked")).toBe("false");
  });
});

describe("Checkbox — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { element } = await renderElement("fsds-checkbox", { "ariaLabel": "Test Checkbox" });
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
