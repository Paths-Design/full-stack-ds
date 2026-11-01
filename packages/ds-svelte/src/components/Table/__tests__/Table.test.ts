// @generated:start imports
import { describe, expect, it } from "vitest";
import { createRawSnippet, type Component } from "svelte";
import { render } from "@testing-library/svelte";
import { axe } from "vitest-axe";
import Table from "../Table.svelte";
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
  it("renders with default props", () => {
    const { container } = render(Table as unknown as Component<Record<string, unknown>>, { props: {} });
    expect(container.firstElementChild).toBeTruthy();
  });

  it("applies the base CSS class", () => {
    const { container } = render(Table as unknown as Component<Record<string, unknown>>, { props: {} });
    expect(container.firstElementChild?.className).toContain("table");
  });

  it("merges custom class", () => {
    const { container } = render(Table as unknown as Component<Record<string, unknown>>, { props: { "class": "custom" } });
    expect(container.firstElementChild?.className).toContain("table");
    expect(container.firstElementChild?.className).toContain("custom");
  });
});

describe("Table — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { container } = render(Table as unknown as Component<Record<string, unknown>>, { props: { "contentLabel": "Test Table", "children": createRawSnippet(() => ({ render: () => "<tbody><tr><td>content</td></tr></tbody>" })) } });
    const results = await axe(container, componentAxeOptions);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
import TableBody from "../TableBody.svelte";
import TableCaption from "../TableCaption.svelte";
import TableCell from "../TableCell.svelte";
import TableFooter from "../TableFooter.svelte";
import TableHead from "../TableHead.svelte";
import TableRow from "../TableRow.svelte";

describe("Table — compound parts", () => {
  it("mounts TableBody with tag and base class", () => {
    const { container } = render(TableBody as Component, {
      props: { "data-testid": "table-tablebody" },
    });
    const root = container.querySelector('[data-testid="table-tablebody"]');
    expect(root).toBeTruthy();
    expect(root!.tagName.toLowerCase()).toBe("tbody");
    expect(root!.className.split(/\s+/)).toContain("table__body");
  });

  it("mounts TableCaption with tag and base class", () => {
    const { container } = render(TableCaption as Component, {
      props: { "data-testid": "table-tablecaption" },
    });
    const root = container.querySelector('[data-testid="table-tablecaption"]');
    expect(root).toBeTruthy();
    expect(root!.tagName.toLowerCase()).toBe("caption");
    expect(root!.className.split(/\s+/)).toContain("table__caption");
  });

  it("mounts TableCell with tag and base class", () => {
    const { container } = render(TableCell as Component, {
      props: { "data-testid": "table-tablecell" },
    });
    const root = container.querySelector('[data-testid="table-tablecell"]');
    expect(root).toBeTruthy();
    expect(root!.tagName.toLowerCase()).toBe("td");
    expect(root!.className.split(/\s+/)).toContain("table__cell");
  });

  it("mounts TableFooter with tag and base class", () => {
    const { container } = render(TableFooter as Component, {
      props: { "data-testid": "table-tablefooter" },
    });
    const root = container.querySelector('[data-testid="table-tablefooter"]');
    expect(root).toBeTruthy();
    expect(root!.tagName.toLowerCase()).toBe("tfoot");
    expect(root!.className.split(/\s+/)).toContain("table__footer");
  });

  it("mounts TableHead with tag and base class", () => {
    const { container } = render(TableHead as Component, {
      props: { "data-testid": "table-tablehead" },
    });
    const root = container.querySelector('[data-testid="table-tablehead"]');
    expect(root).toBeTruthy();
    expect(root!.tagName.toLowerCase()).toBe("thead");
    expect(root!.className.split(/\s+/)).toContain("table__head");
  });

  it("mounts TableRow with tag and base class", () => {
    const { container } = render(TableRow as Component, {
      props: { "data-testid": "table-tablerow" },
    });
    const root = container.querySelector('[data-testid="table-tablerow"]');
    expect(root).toBeTruthy();
    expect(root!.tagName.toLowerCase()).toBe("tr");
    expect(root!.className.split(/\s+/)).toContain("table__row");
  });
});

import TableHeaderCell from "../TableHeaderCell.svelte";

// SHOWCASE-CONSUMPTION-03 A1 — the Svelte cell/header SFCs own their <td>/<th>,
// so they must forward the HTML attributes a real data table needs.
describe("Table — cell attribute forwarding", () => {
  it("TableCell forwards colspan/id/style onto the <td>", () => {
    const { container } = render(
      TableCell as unknown as Component<Record<string, unknown>>,
      { props: { colSpan: 4, id: "cell-1", style: "text-align: center" } },
    );
    const td = container.querySelector("td")!;
    expect(td).not.toBeNull();
    expect(td.getAttribute("colspan")).toBe("4");
    expect(td.getAttribute("id")).toBe("cell-1");
    expect(td.getAttribute("style") ?? "").toContain("text-align");
  });

  it("TableHeaderCell forwards scope/rowspan onto the <th>", () => {
    const { container } = render(
      TableHeaderCell as unknown as Component<Record<string, unknown>>,
      { props: { scope: "col", rowSpan: 2 } },
    );
    const th = container.querySelector("th")!;
    expect(th.getAttribute("scope")).toBe("col");
    expect(th.getAttribute("rowspan")).toBe("2");
  });

  it("omits unset attributes (no empty colspan/id)", () => {
    const { container } = render(
      TableCell as unknown as Component<Record<string, unknown>>,
      { props: {} },
    );
    const td = container.querySelector("td")!;
    expect(td.hasAttribute("colspan")).toBe(false);
    expect(td.hasAttribute("id")).toBe(false);
  });
});
// @custom:end
