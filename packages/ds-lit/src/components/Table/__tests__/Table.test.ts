// @generated:start imports
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import "../Table";
// @generated:end

// @generated:start tests
const componentAxeOptions = {
  rules: {
    // `region` asks whether all page content is landmark-contained.
    // These tests scan one component subtree, not a complete page.
    region: { enabled: false },
  },
};

describe("Table — unit", () => {
  it("renders with default props", async () => {
    const { element } = await renderElement("fsds-table");
    expect(element).toBeInstanceOf(HTMLElement);
  });

  it("applies the base CSS class", async () => {
    const { element } = await renderElement("fsds-table");
    const root = element.shadowRoot?.firstElementChild ?? element;
    expect(classTokens(root)).toContain("table");
  });
});

describe("Table — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { element } = await renderElement("fsds-table", { "ariaLabel": "Test Table" }, [{"html":"<tbody><tr><td>content</td></tr></tbody>"}]);
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
import { html } from "lit";
import { TableElement, tableCaption, tableHead, tableBody, tableFooter, tableRow, tableHeaderCell, tableCell } from "../Table";

describe("Table — native template composition", () => {
  it("keeps sections rows cells and forwarded attributes inside its native table", async () => {
    const host = new TableElement();
    host.ariaLabel = "Orders";
    host.renderContent = () => [
      tableCaption("Orders"),
      tableHead(tableRow(tableHeaderCell("Team", { scope: "col", colSpan: 2 }))),
      tableBody(tableRow([tableHeaderCell("Team A", { scope: "row", rowSpan: 1 }), tableCell("12", { id: "seats", style: "color: red" })], { class: "consumer-row", "data-testid": "team-a" })),
      tableFooter(tableRow(tableCell("Total", { colSpan: 2 }))),
    ];
    document.body.append(host);
    try {
      await host.updateComplete;
      const table = host.shadowRoot!.querySelector("table")!;
      expect(table.parentElement!.className).toBe("table");
      expect(table.getAttribute("aria-label")).toBe("Orders");
      expect(table.rows.length).toBe(3);
      expect(Array.from(table.rows, row => row.cells.length)).toEqual([1, 2, 1]);
      expect(table.caption!.textContent).toBe("Orders");
      expect(table.tHead!.rows[0].cells[0].scope).toBe("col");
      expect(table.tBodies[0].rows[0].cells[0].scope).toBe("row");
      expect(table.tFoot!.rows[0].cells[0].colSpan).toBe(2);
      expect(table.querySelector("#seats")!.getAttribute("style")).toBe("color: red");
      expect(table.querySelector('[data-testid="team-a"]')!.className).toBe("table__row consumer-row");
      expect(table.querySelectorAll("slot")).toHaveLength(0);
      expect(host.childElementCount).toBe(0);
    } finally { host.remove(); }
  });

  it("updates native content and delivers a cell button event once", async () => {
    const host = new TableElement();
    let clicks = 0;
    host.renderContent = () => tableBody(tableRow(tableCell(html`<button @click=${() => { clicks++; }}>Edit</button>`)));
    document.body.append(host);
    try {
      await host.updateComplete;
      host.shadowRoot!.querySelector("button")!.click();
      expect(clicks).toBe(1);
      host.renderContent = () => tableBody(tableRow(tableCell("Replacement")));
      await host.updateComplete;
      const table = host.shadowRoot!.querySelector("table")!;
      expect(table.rows.length).toBe(1);
      expect(table.rows[0].cells[0].textContent).toBe("Replacement");
      expect(table.querySelector("button")).toBeNull();
    } finally { host.remove(); }
  });

  it("escapes text and attribute strings in native helpers", async () => {
    const host = new TableElement();
    const text = '<img src="x" onerror="alert(1)">';
    const id = 'cell" onfocus="alert(1)';
    host.renderContent = () => tableBody(tableRow(tableCell(text, { id })));
    document.body.append(host);
    try {
      await host.updateComplete;
      const cell = host.shadowRoot!.querySelector("td")!;
      expect(cell.textContent).toBe(text);
      expect(cell.id).toBe(id);
      expect(cell.getAttribute("onfocus")).toBeNull();
      expect(cell.querySelector("img")).toBeNull();
    } finally { host.remove(); }
  });
});
// @custom:end
