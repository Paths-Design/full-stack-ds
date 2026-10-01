// @generated:start imports
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import "../Pagination";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Pagination — unit", () => {
  it("renders with default props", async () => {
    const { element } = await renderElement("fsds-pagination");
    expect(element).toBeInstanceOf(HTMLElement);
  });

  it("applies the base CSS class", async () => {
    const { element } = await renderElement("fsds-pagination");
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("pagination");
  });

  it("applies presentation=indicators variant class", async () => {
    const { element } = await renderElement("fsds-pagination", { "presentation": "indicators" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("pagination--indicators");
  });

  it("applies presentation=pages variant class", async () => {
    const { element } = await renderElement("fsds-pagination", { "presentation": "pages" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("pagination--pages");
  });

  it("applies progress=none variant class", async () => {
    const { element } = await renderElement("fsds-pagination", { "progress": "none" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("pagination--none");
  });

  it("applies progress=elapsed variant class", async () => {
    const { element } = await renderElement("fsds-pagination", { "progress": "elapsed" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("pagination--elapsed");
  });
});

describe("Pagination — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { element } = await renderElement("fsds-pagination", { "label": "Test Pagination" });
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
