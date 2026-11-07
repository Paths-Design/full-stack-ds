// @generated:start imports
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import "../Icon";
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

const requiredProps = { "name": "placeholder" };

describe("Icon — unit", () => {
  it("renders with default props", async () => {
    const { element } = await renderElement("fsds-icon");
    expect(element).toBeInstanceOf(HTMLElement);
  });

  it("applies the base CSS class", async () => {
    const { element } = await renderElement("fsds-icon");
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("icon");
  });

  it("applies size=sm variant class", async () => {
    const { element } = await renderElement("fsds-icon", { "size": "sm" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("icon--sm");
  });

  it("applies size=md variant class", async () => {
    const { element } = await renderElement("fsds-icon", { "size": "md" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("icon--md");
  });

  it("applies size=lg variant class", async () => {
    const { element } = await renderElement("fsds-icon", { "size": "lg" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("icon--lg");
  });

  it("applies size=xl variant class", async () => {
    const { element } = await renderElement("fsds-icon", { "size": "xl" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("icon--xl");
  });
});

describe("Icon — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { element } = await renderElement("fsds-icon", { "name": "placeholder", "decorative": false, "ariaLabel": "Test Icon" });
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
describe("Icon — catalog glyph rendering (ICON-CATALOG-RUNTIME-DELIVERY-01)", () => {
  async function renderIcon(props: Record<string, string>) {
    const { element } = await renderElement("fsds-icon", props);
    return element.shadowRoot!;
  }

  it("renders the authored 16-grid check glyph at size=sm", async () => {
    const root = await renderIcon({ name: "check", size: "sm" });
    const svg = root.querySelector('svg[data-fsds-icon="check"]');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("viewBox")).toBe("0 0 16 16");
    expect(svg!.getAttribute("width")).toBe("16");
    const paths = svg!.querySelectorAll("path");
    expect(paths).toHaveLength(1);
    // the exact authored path data, not just element presence
    expect(paths[0].getAttribute("d")).toBe("M3.5 8.5L6.5 11.5L12.5 4.5");
    expect(paths[0].getAttribute("stroke-linecap")).toBe("round");
  });

  it("floor-selects the 16-grid variant at size=md but renders at 20px", async () => {
    const root = await renderIcon({ name: "check", size: "md" });
    const svg = root.querySelector('svg[data-fsds-icon="check"]');
    expect(svg!.getAttribute("viewBox")).toBe("0 0 16 16");
    expect(svg!.getAttribute("width")).toBe("20");
  });

  it("selects the authored 24-grid variant at size=lg", async () => {
    const root = await renderIcon({ name: "check", size: "lg" });
    const svg = root.querySelector('svg[data-fsds-icon="check"]');
    expect(svg!.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg!.querySelector("path")!.getAttribute("d")).toBe("M5 12.5L9.5 17L19 6.5");
  });

  it("renders no svg at all for an unknown icon name", async () => {
    const root = await renderIcon({ name: "does-not-exist" });
    expect(root.querySelector("svg")).toBeNull();
  });
});

describe("Icon — FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01: undefined size resolves to contract default", () => {
  it("an explicitly-undefined size falls back to the md hint (20px), not the natural SVG size", async () => {
    // A `@property() size?: T = "md"` class-field default only applies
    // once, at construction. Simulate a consumer setting `size` back to
    // `undefined` post-construction (e.g. a controlled prop update) and
    // assert the rendered width still resolves via the md hint — proving
    // the accessor re-applies the contract default on every read, not
    // just at construction.
    const element = document.createElement("fsds-icon") as HTMLElement & {
      size?: string;
      name?: string;
      updateComplete?: Promise<unknown>;
      requestUpdate?: () => void;
    };
    document.body.append(element);
    await customElements.whenDefined("fsds-icon");
    element.name = "check";
    element.requestUpdate?.();
    await element.updateComplete;
    // Explicitly clobber to undefined post-construction.
    element.size = undefined;
    element.requestUpdate?.();
    await element.updateComplete;

    const svg = element.shadowRoot!.querySelector('svg[data-fsds-icon="check"]');
    expect(svg).not.toBeNull();
    // md's authored glyph is 16-grid but renders at the md hint, 20px —
    // matching react's parameter-default resolution for the same input.
    expect(svg!.getAttribute("width")).toBe("20");
    expect(svg!.getAttribute("height")).toBe("20");
  });
});
// @custom:end
