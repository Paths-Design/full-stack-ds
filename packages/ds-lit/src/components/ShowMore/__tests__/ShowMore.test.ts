// @generated:start imports
import { afterEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import "../ShowMore";
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

describe("ShowMore — unit", () => {
  it("renders with default props", async () => {
    const { element } = await renderElement("fsds-show-more");
    expect(element).toBeInstanceOf(HTMLElement);
  });

  it("applies the base CSS class", async () => {
    const { element } = await renderElement("fsds-show-more");
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("show-more");
  });

  it("toggles the expanded channel from the trigger click", async () => {
    const { element } = await renderElement("fsds-show-more");
    const seen: boolean[] = [];
    (element as LitTestElement & { onExpandedChange?: (v: boolean) => void }).onExpandedChange = (v: boolean) => seen.push(v);
    await (element as LitTestElement).updateComplete;
    const host = element.shadowRoot?.querySelector(".show-more__trigger") as HTMLElement;
    host.click();
    expect(seen).toEqual([true]);
  });

  it("reflects expanded=true after behavior.setExpanded(true)", async () => {
    const { element } = await renderElement("fsds-show-more");
    const el = element as LitTestElement & {
      behavior?: { setExpanded?: (v: boolean) => void; expanded?: boolean };
    };
    el.behavior?.setExpanded?.(true);
    el.requestUpdate?.();
    await el.updateComplete;
    expect(el.behavior?.expanded).toBe(true);
    const trueNode_aria_expanded = element.shadowRoot?.querySelector('[aria-expanded]');
    expect(trueNode_aria_expanded?.getAttribute('aria-expanded')).toBe("true");
  });

  it("reflects expanded=false after behavior.setExpanded(false)", async () => {
    const { element } = await renderElement("fsds-show-more");
    const el = element as LitTestElement & {
      behavior?: { setExpanded?: (v: boolean) => void; expanded?: boolean };
    };
    el.behavior?.setExpanded?.(true);
    el.requestUpdate?.();
    await el.updateComplete;
    el.behavior?.setExpanded?.(false);
    el.requestUpdate?.();
    await el.updateComplete;
    expect(el.behavior?.expanded).toBe(false);
    const falseNode_aria_expanded = element.shadowRoot?.querySelector('[aria-expanded]');
    expect(falseNode_aria_expanded?.getAttribute('aria-expanded')).toBe("false");
  });
});

describe("ShowMore — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { element } = await renderElement("fsds-show-more", {}, [{"html":"<span>content</span>"}]);
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
describe("ShowMore — channel lifecycle", () => {
  it("honors a default set before first render and does not reapply it", async () => {
    const element = document.createElement("fsds-show-more") as LitTestElement & { defaultExpanded: boolean };
    element.defaultExpanded = true;
    document.body.append(element);
    await element.updateComplete;
    const trigger = element.shadowRoot!.querySelector("button")!;
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    trigger.click();
    await element.updateComplete;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    element.defaultExpanded = false;
    await element.updateComplete;
    element.defaultExpanded = true;
    await element.updateComplete;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("notifies once and follows every controlled update without committing locally", async () => {
    const element = document.createElement("fsds-show-more") as LitTestElement & { expanded: boolean; onExpandedChange: (next: boolean) => void };
    const seen: boolean[] = [];
    element.onExpandedChange = next => seen.push(next);
    element.expanded = false;
    document.body.append(element);
    for (const expanded of [false, true, false]) {
      element.expanded = expanded;
      await element.updateComplete;
      const trigger = element.shadowRoot!.querySelector("button")!;
      expect(trigger.getAttribute("aria-expanded")).toBe(String(expanded));
      trigger.click();
      await element.updateComplete;
      expect(trigger.getAttribute("aria-expanded")).toBe(String(expanded));
    }
    expect(seen).toEqual([true, false, true]);
  });
});

// @custom:end
