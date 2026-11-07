// @generated:start imports
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import "../Select";
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

describe("Select — unit", () => {
  it("renders with default props", async () => {
    const { element } = await renderElement("fsds-select");
    expect(element).toBeInstanceOf(HTMLElement);
  });

  it("applies the base CSS class", async () => {
    const { element } = await renderElement("fsds-select", { "open": true });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("select");
  });

  it("toggles the open channel from the trigger click", async () => {
    const { element } = await renderElement("fsds-select");
    const seen: boolean[] = [];
    (element as LitTestElement & { onOpenChange?: (v: boolean) => void }).onOpenChange = (v: boolean) => seen.push(v);
    await (element as LitTestElement).updateComplete;
    const host = element.shadowRoot?.querySelector(".select__trigger") as HTMLElement;
    host.click();
    expect(seen).toEqual([false]);
  });

  it("applies size=sm variant class", async () => {
    const { element } = await renderElement("fsds-select", { "open": true, "size": "sm" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("select--sm");
  });

  it("applies size=md variant class", async () => {
    const { element } = await renderElement("fsds-select", { "open": true, "size": "md" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("select--md");
  });

  it("applies size=lg variant class", async () => {
    const { element } = await renderElement("fsds-select", { "open": true, "size": "lg" });
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("select--lg");
  });

  it("closes on Escape key", async () => {
    const onOpenChangeSpy = vi.fn();
    const { element } = await renderElement("fsds-select", { "open": true });
    (element as unknown as Record<string, unknown>)["onOpenChange"] = onOpenChangeSpy;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(onOpenChangeSpy).toHaveBeenCalledWith(false);
  });

  it("reflects open=true after behavior.setOpen(true)", async () => {
    const { element } = await renderElement("fsds-select");
    const el = element as LitTestElement & {
      behavior?: { setOpen?: (v: boolean) => void; open?: boolean };
    };
    el.behavior?.setOpen?.(true);
    el.requestUpdate?.();
    await el.updateComplete;
    expect(el.behavior?.open).toBe(true);
    // Guarded subtree should now be rendered (codegen marker).
    expect(element.shadowRoot?.querySelector('[data-fsds-channel-renders="open"]')).not.toBeNull();
    const trueNode_aria_expanded = element.shadowRoot?.querySelector('[aria-expanded]');
    expect(trueNode_aria_expanded?.getAttribute('aria-expanded')).toBe("true");
  });

  it("reflects open=false after behavior.setOpen(false)", async () => {
    const { element } = await renderElement("fsds-select");
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
    const falseNode_aria_expanded = element.shadowRoot?.querySelector('[aria-expanded]');
    expect(falseNode_aria_expanded?.getAttribute('aria-expanded')).toBe("false");
  });
});

describe("Select — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { element } = await renderElement("fsds-select", { "triggerLabel": "Test Select", "open": true });
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

describe("Select — keyboard realization (FEAT-A11Y-COMPOSITE-KEYBOARD-01)", () => {
  const pressKey = (element: Element, key: string): void => {
    element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  };
  // jsdom fires requestAnimationFrame on a ~16ms timer; the open handler
  // lands focus inside it, so the focus assertions wait past that window.
  const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 50));

  interface SelectTestElement extends LitTestElement {
    onChange?: (value: string | string[]) => void;
  }

  /** Focus inside a shadow root: document.activeElement stops at the host. */
  const innerActive = (host: HTMLElement): Element | null =>
    host.shadowRoot?.activeElement ?? null;

  const openElement = async (
    setup?: (el: SelectTestElement) => void,
  ): Promise<HTMLElement> => {
    const { element } = await renderElement("fsds-select", { open: true });
    const el = element as SelectTestElement;
    setup?.(el);
    el.requestUpdate?.();
    await el.updateComplete;
    return element;
  };

  it("ArrowDown on the closed trigger opens the panel and moves focus into the listbox", async () => {
    const { element } = await renderElement("fsds-select");
    const trigger = element.shadowRoot?.querySelector(".select__trigger") as HTMLElement;
    pressKey(trigger, "ArrowDown");
    await settle();
    const listbox = element.shadowRoot?.querySelector('[role="listbox"]') as HTMLElement;
    expect(listbox).toBeTruthy();
    // Non-searchable Select: the search-input initial focus falls back to
    // the first option — focus must land inside the panel either way.
    expect(listbox.contains(innerActive(element))).toBe(true);
  });

  it("roving hosts are programmatically focusable but out of tab order", async () => {
    const element = await openElement();
    const listbox = element.shadowRoot?.querySelector('[role="listbox"]') as HTMLElement;
    expect(listbox.getAttribute("tabindex")).toBe("-1");
    for (const option of element.shadowRoot?.querySelectorAll('[role="option"]') ?? []) {
      expect((option as HTMLElement).getAttribute("tabindex")).toBe("-1");
    }
  });

  it("ArrowDown/ArrowUp on the listbox rove DOM focus through the options", async () => {
    const element = await openElement();
    const listbox = element.shadowRoot?.querySelector('[role="listbox"]') as HTMLElement;
    const options = [...(element.shadowRoot?.querySelectorAll('[role="option"]') ?? [])] as HTMLElement[];
    options[0].focus();
    pressKey(listbox, "ArrowDown");
    expect(innerActive(element)).toBe(options[1]);
    pressKey(listbox, "ArrowDown");
    expect(innerActive(element)).toBe(options[2]);
    pressKey(listbox, "ArrowUp");
    expect(innerActive(element)).toBe(options[1]);
  });

  it("ArrowUp from the first option wraps to the last; Home/End jump to the extremes", async () => {
    const element = await openElement();
    const listbox = element.shadowRoot?.querySelector('[role="listbox"]') as HTMLElement;
    const options = [...(element.shadowRoot?.querySelectorAll('[role="option"]') ?? [])] as HTMLElement[];
    options[0].focus();
    pressKey(listbox, "ArrowUp");
    expect(innerActive(element)).toBe(options[2]);
    pressKey(listbox, "Home");
    expect(innerActive(element)).toBe(options[0]);
    pressKey(listbox, "End");
    expect(innerActive(element)).toBe(options[2]);
  });

  it("Enter on an option commits that option's value", async () => {
    const changes: unknown[] = [];
    const element = await openElement((el) => {
      el.onChange = (v) => changes.push(v);
    });
    const option = element.shadowRoot?.querySelectorAll('[role="option"]')[1] as HTMLElement;
    pressKey(option, "Enter"); // Beta
    expect(changes).toEqual(["beta"]);
  });

  it("Enter adds an absent option's value in multiple mode (controlled)", async () => {
    const changes: unknown[] = [];
    const element = await openElement((el) => {
      (el as unknown as Record<string, unknown>)["multiple"] = true;
      (el as unknown as Record<string, unknown>)["value"] = ["alpha"];
      el.onChange = (v) => changes.push(v);
    });
    const option = element.shadowRoot?.querySelectorAll('[role="option"]')[2] as HTMLElement;
    pressKey(option, "Enter"); // Gamma absent → add
    expect(changes).toEqual([["alpha", "gamma"]]);
  });

  it("Enter removes a present option's value in multiple mode (controlled)", async () => {
    const changes: unknown[] = [];
    const element = await openElement((el) => {
      (el as unknown as Record<string, unknown>)["multiple"] = true;
      (el as unknown as Record<string, unknown>)["value"] = ["alpha", "gamma"];
      el.onChange = (v) => changes.push(v);
    });
    const option = element.shadowRoot?.querySelectorAll('[role="option"]')[0] as HTMLElement;
    pressKey(option, "Enter"); // Alpha present → remove
    expect(changes).toEqual([["gamma"]]);
  });
});

// @custom:end
