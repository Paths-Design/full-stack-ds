// @generated:start imports
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import "../Card";
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

describe("Card — unit", () => {
  it("renders with default props", async () => {
    const { element } = await renderElement("fsds-card");
    expect(element).toBeInstanceOf(HTMLElement);
  });

  it("applies the base CSS class", async () => {
    const { stack } = await renderElement("fsds-card");
    expect(classTokens(stack)).toContain("card");
  });

  it("applies density=default variant class", async () => {
    const { stack } = await renderElement("fsds-card", { "density": "default" });
    expect(classTokens(stack)).toContain("card--default");
  });

  it("applies density=inset variant class", async () => {
    const { stack } = await renderElement("fsds-card", { "density": "inset" });
    expect(classTokens(stack)).toContain("card--inset");
  });
});

describe("Card — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { element } = await renderElement("fsds-card", { "aria-label": "Test Card" });
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
describe("Card — landmarks", () => {
  // A card's header and footer belong to the card, not the page: two cards
  // on one page must not contribute two banner/contentinfo landmarks.
  it("exposes no banner or contentinfo landmark for two cards with headers and footers", async () => {
    const container = document.createElement("div");
    container.innerHTML = ["First", "Second"]
      .map((label) => `<fsds-card aria-label="${label}"><fsds-card-header>${label}</fsds-card-header><fsds-card-content>Body</fsds-card-content><fsds-card-footer>Foot</fsds-card-footer></fsds-card>`)
      .join("");
    document.body.append(container);
    try {
      const hosts = Array.from(container.querySelectorAll<LitTestElement>("fsds-card, fsds-card-header, fsds-card-content, fsds-card-footer"));
      await Promise.all(hosts.map((host) => host.updateComplete));
      // Landmark-bearing elements may sit in any (nested) shadow root.
      const deepElements = (scope: Element | ShadowRoot): Element[] =>
        Array.from(scope.querySelectorAll("*")).flatMap((el) => [el, ...(el.shadowRoot ? deepElements(el.shadowRoot) : [])]);
      const all = deepElements(container);
      const headers = all.filter((el) => el.classList.contains("card__header"));
      const landmarks = all.filter((el) => el.matches("header, footer, [role='banner'], [role='contentinfo']"));
      expect(headers).toHaveLength(2);
      expect(landmarks).toHaveLength(0);
      const results = await axe(document.documentElement, { runOnly: ["landmark-no-duplicate-banner", "landmark-no-duplicate-contentinfo", "landmark-banner-is-top-level", "landmark-contentinfo-is-top-level"] });
      expect(results.violations.map((v) => v.id)).toEqual([]);
    } finally {
      container.remove();
    }
  });
});
// @custom:end
