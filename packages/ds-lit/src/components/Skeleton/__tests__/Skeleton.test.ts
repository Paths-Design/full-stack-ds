// @generated:start imports
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import "../Skeleton";
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

describe("Skeleton — unit", () => {
  it("renders with default props", async () => {
    const { element } = await renderElement("fsds-skeleton");
    expect(element).toBeInstanceOf(HTMLElement);
  });

  it("applies the base CSS class", async () => {
    const { element } = await renderElement("fsds-skeleton");
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("skeleton");
  });

  it("applies variant=block variant class", async () => {
    const { element } = await renderElement("fsds-skeleton", { "variant": "block" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("skeleton--block");
  });

  it("applies variant=text variant class", async () => {
    const { element } = await renderElement("fsds-skeleton", { "variant": "text" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("skeleton--text");
  });

  it("applies variant=avatar variant class", async () => {
    const { element } = await renderElement("fsds-skeleton", { "variant": "avatar" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("skeleton--avatar");
  });

  it("applies variant=media variant class", async () => {
    const { element } = await renderElement("fsds-skeleton", { "variant": "media" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("skeleton--media");
  });

  it("applies variant=dataviz variant class", async () => {
    const { element } = await renderElement("fsds-skeleton", { "variant": "dataviz" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("skeleton--dataviz");
  });

  it("applies variant=actions variant class", async () => {
    const { element } = await renderElement("fsds-skeleton", { "variant": "actions" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("skeleton--actions");
  });

  it("applies animate=shimmer variant class", async () => {
    const { element } = await renderElement("fsds-skeleton", { "animate": "shimmer" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("skeleton--shimmer");
  });

  it("applies animate=wipe variant class", async () => {
    const { element } = await renderElement("fsds-skeleton", { "animate": "wipe" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("skeleton--wipe");
  });

  it("applies animate=pulse variant class", async () => {
    const { element } = await renderElement("fsds-skeleton", { "animate": "pulse" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("skeleton--pulse");
  });

  it("applies animate=none variant class", async () => {
    const { element } = await renderElement("fsds-skeleton", { "animate": "none" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("skeleton--none");
  });

  it("applies density=compact variant class", async () => {
    const { element } = await renderElement("fsds-skeleton", { "density": "compact" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("skeleton--compact");
  });

  it("applies density=regular variant class", async () => {
    const { element } = await renderElement("fsds-skeleton", { "density": "regular" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("skeleton--regular");
  });

  it("applies density=spacious variant class", async () => {
    const { element } = await renderElement("fsds-skeleton", { "density": "spacious" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("skeleton--spacious");
  });
});

describe("Skeleton — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { element } = await renderElement("fsds-skeleton", { "decorative": false, "ariaLabel": "Test Skeleton" });
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
describe("Skeleton — FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01: undefined decorative resolves to the contract default (true)", () => {
  it("matches react's a11y output for an explicitly-undefined decorative prop", async () => {
    // Contract default for `decorative` is `true`. A `@property()
    // decorative?: boolean = true` class-field default only applies once,
    // at construction — simulate a consumer explicitly clobbering it back
    // to `undefined` post-construction and assert role/aria-busy/
    // aria-hidden still resolve as if `decorative` were `true` (matching
    // react's parameter-default resolution for the same input), not the
    // announced (`decorative: false`) state.
    const element = document.createElement("fsds-skeleton") as HTMLElement & {
      decorative?: boolean;
      updateComplete?: Promise<unknown>;
      requestUpdate?: () => void;
    };
    document.body.append(element);
    await customElements.whenDefined("fsds-skeleton");
    element.decorative = undefined;
    element.requestUpdate?.();
    await element.updateComplete;

    const root = element.shadowRoot!.firstElementChild!;
    expect(root.getAttribute("role")).toBe("presentation");
    expect(root.getAttribute("aria-busy")).toBe("false");
    expect(root.getAttribute("aria-hidden")).toBe("true");
  });
});
// @custom:end
