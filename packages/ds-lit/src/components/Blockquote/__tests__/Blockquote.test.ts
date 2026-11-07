// @generated:start imports
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import "../Blockquote";
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

describe("Blockquote — unit", () => {
  it("renders with default props", async () => {
    const { element } = await renderElement("fsds-blockquote");
    expect(element).toBeInstanceOf(HTMLElement);
  });

  it("applies the base CSS class", async () => {
    const { element } = await renderElement("fsds-blockquote");
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("blockquote");
  });

  it("applies variant=default variant class", async () => {
    const { element } = await renderElement("fsds-blockquote", { "variant": "default" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("blockquote--default");
  });

  it("applies variant=bordered variant class", async () => {
    const { element } = await renderElement("fsds-blockquote", { "variant": "bordered" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("blockquote--bordered");
  });

  it("applies variant=highlighted variant class", async () => {
    const { element } = await renderElement("fsds-blockquote", { "variant": "highlighted" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("blockquote--highlighted");
  });

  it("applies size=sm variant class", async () => {
    const { element } = await renderElement("fsds-blockquote", { "size": "sm" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("blockquote--sm");
  });

  it("applies size=md variant class", async () => {
    const { element } = await renderElement("fsds-blockquote", { "size": "md" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("blockquote--md");
  });

  it("applies size=lg variant class", async () => {
    const { element } = await renderElement("fsds-blockquote", { "size": "lg" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("blockquote--lg");
  });
});

describe("Blockquote — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { element } = await renderElement("fsds-blockquote", {}, [{"html":"<span>content</span>"}]);
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
it("updates and omits citation metadata on the shadow quotation element", async () => {
  const quote = "التصميم — 日本語 — “quoted”";
  const rendered = await renderElement("fsds-blockquote", {}, [{ html: `<span lang="ar" dir="rtl">${quote}</span>` }]);
  const element = rendered.element as LitTestElement & { cite?: string };
  const quotation = element.shadowRoot!.querySelector("blockquote");
  expect(quotation).not.toBeNull();
  for (const cite of [undefined, "https://example.test/مصدر?edition=2&lang=ar", "/sources/日本語#quote", "", undefined]) {
    element.cite = cite;
    await element.updateComplete;
    expect(element.shadowRoot!.querySelector("blockquote")).toBe(quotation);
    expect(quotation!.getAttribute("cite")).toBe(cite ?? null);
    expect(element.textContent).toBe(quote);
    expect(quotation!.querySelector("a, button, [tabindex]")).toBeNull();
  }
  element.remove();
});
// @custom:end
