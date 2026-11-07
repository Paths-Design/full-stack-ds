// @generated:start imports
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import "../List";
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

describe("List — unit", () => {
  it("renders with default props", async () => {
    const { element } = await renderElement("fsds-list");
    expect(element).toBeInstanceOf(HTMLElement);
  });

  it("applies the base CSS class", async () => {
    const { element } = await renderElement("fsds-list");
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list");
  });

  it("applies as=ul variant class", async () => {
    const { element } = await renderElement("fsds-list", { "as": "ul" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--ul");
  });

  it("applies as=ol variant class", async () => {
    const { element } = await renderElement("fsds-list", { "as": "ol" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--ol");
  });

  it("applies as=dl variant class", async () => {
    const { element } = await renderElement("fsds-list", { "as": "dl" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--dl");
  });

  it("applies variant=default variant class", async () => {
    const { element } = await renderElement("fsds-list", { "variant": "default" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--variant-default");
  });

  it("applies variant=unstyled variant class", async () => {
    const { element } = await renderElement("fsds-list", { "variant": "unstyled" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--variant-unstyled");
  });

  it("applies variant=inline variant class", async () => {
    const { element } = await renderElement("fsds-list", { "variant": "inline" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--variant-inline");
  });

  it("applies variant=divided variant class", async () => {
    const { element } = await renderElement("fsds-list", { "variant": "divided" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--variant-divided");
  });

  it("applies variant=spaced variant class", async () => {
    const { element } = await renderElement("fsds-list", { "variant": "spaced" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--variant-spaced");
  });

  it("applies marker=default variant class", async () => {
    const { element } = await renderElement("fsds-list", { "marker": "default" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--marker-default");
  });

  it("applies marker=none variant class", async () => {
    const { element } = await renderElement("fsds-list", { "marker": "none" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--marker-none");
  });

  it("applies marker=disc variant class", async () => {
    const { element } = await renderElement("fsds-list", { "marker": "disc" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--marker-disc");
  });

  it("applies marker=circle variant class", async () => {
    const { element } = await renderElement("fsds-list", { "marker": "circle" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--marker-circle");
  });

  it("applies marker=square variant class", async () => {
    const { element } = await renderElement("fsds-list", { "marker": "square" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--marker-square");
  });

  it("applies marker=decimal variant class", async () => {
    const { element } = await renderElement("fsds-list", { "marker": "decimal" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--marker-decimal");
  });

  it("applies marker=alpha variant class", async () => {
    const { element } = await renderElement("fsds-list", { "marker": "alpha" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--marker-alpha");
  });

  it("applies marker=roman variant class", async () => {
    const { element } = await renderElement("fsds-list", { "marker": "roman" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--marker-roman");
  });

  it("applies spacing=none variant class", async () => {
    const { element } = await renderElement("fsds-list", { "spacing": "none" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--spacing-none");
  });

  it("applies spacing=sm variant class", async () => {
    const { element } = await renderElement("fsds-list", { "spacing": "sm" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--spacing-sm");
  });

  it("applies spacing=md variant class", async () => {
    const { element } = await renderElement("fsds-list", { "spacing": "md" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--spacing-md");
  });

  it("applies spacing=lg variant class", async () => {
    const { element } = await renderElement("fsds-list", { "spacing": "lg" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--spacing-lg");
  });

  it("applies size=sm variant class", async () => {
    const { element } = await renderElement("fsds-list", { "size": "sm" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--size-sm");
  });

  it("applies size=md variant class", async () => {
    const { element } = await renderElement("fsds-list", { "size": "md" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--size-md");
  });

  it("applies size=lg variant class", async () => {
    const { element } = await renderElement("fsds-list", { "size": "lg" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("list--size-lg");
  });
});

describe("List — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { element } = await renderElement("fsds-list", { "aria-label": "Test List" }, [{"html":"<li>content</li>"}]);
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
