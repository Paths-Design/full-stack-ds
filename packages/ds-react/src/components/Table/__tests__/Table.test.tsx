// @generated:start imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { Table, TableCaption, TableHead, TableBody, TableFooter, TableRow, TableHeaderCell, TableCell } from "../Table";

declare module "vitest" {
  interface Assertion<T> {
    // The positional T keeps this augmentation mergeable with vitest's
    // own Assertion<T = any> declaration (TS2428 fires on any rename);
    // the expected param references it so it is never an unused type param.
    toHaveNoViolations(expected?: T): void;
  }
}
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
    render(<Table data-testid="table"><tbody><tr><td>content</td></tr></tbody></Table>);
    expect(screen.getByTestId("table")).toBeInTheDocument();
  });

  it("applies the base CSS class", () => {
    render(<Table data-testid="table"><tbody><tr><td>content</td></tr></tbody></Table>);
    expect(screen.getByTestId("table")).toHaveClass("table");
  });

  it("merges custom className", () => {
    render(<Table data-testid="table" className="custom"><tbody><tr><td>content</td></tr></tbody></Table>);
    expect(screen.getByTestId("table")).toHaveClass("table", "custom");
  });
});

describe("Table — accessibility", () => {
  it("has no unexpected axe violations with default props", async () => {
    const { baseElement } = render(<><Table ariaLabel="Test Table"><tbody><tr><td>content</td></tr></tbody></Table></>);
    const component = baseElement.querySelector('[data-fsds-component="table"]');
    expect(component).not.toBeNull();
    const results = await axe(component!, componentAxeOptions) as unknown as { violations: Array<{ id: string }> };
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
// @generated:end

// @custom:start tests
//
// CODEGEN-TABLE-COMPOUND-PARTS-REALIZATION-01 — Layer 2 runtime DOM
// tests. Layer 1 (source-string) tests in
// packages/ds-codegen/src/frameworks/table-native-realization.test.ts
// assert the *emitted source* uses native tags. These tests render
// the composed Table tree and assert the *rendered DOM* matches the
// realized native mapping documented in the slice's recon doc.

describe("Table — runtime DOM realization", () => {
  it("renders a fully-composed native table tree", () => {
    const { container } = render(
      <Table ariaLabel="Orders">
        <TableCaption>Recent orders</TableCaption>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Total</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Paid</TableCell>
            <TableCell>$42.00</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>1 order</TableCell>
            <TableCell>$42.00</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    const wrapper = container.querySelector("div.table");
    expect(wrapper).not.toBeNull();
    const table = wrapper!.querySelector("table.table__container");
    expect(table).not.toBeNull();
    expect(table!.getAttribute("aria-label")).toBe("Orders");

    const caption = table!.querySelector("caption.table__caption");
    expect(caption?.textContent).toBe("Recent orders");

    const thead = table!.querySelector("thead.table__head");
    const tbody = table!.querySelector("tbody.table__body");
    const tfoot = table!.querySelector("tfoot.table__footer");
    expect(thead).not.toBeNull();
    expect(tbody).not.toBeNull();
    expect(tfoot).not.toBeNull();

    const headRows = thead!.querySelectorAll("tr.table__row");
    expect(headRows.length).toBe(1);
    const headerCells = headRows[0].querySelectorAll("th.table__headerCell");
    expect(headerCells.length).toBe(2);
    expect(headerCells[0].textContent).toBe("Status");

    const bodyRows = tbody!.querySelectorAll("tr.table__row");
    expect(bodyRows.length).toBe(1);
    const cells = bodyRows[0].querySelectorAll("td.table__cell");
    expect(cells.length).toBe(2);
    expect(cells[0].textContent).toBe("Paid");

    const footerRows = tfoot!.querySelectorAll("tr.table__row");
    expect(footerRows.length).toBe(1);
  });

  it("emits no .stack layout-primitive wrapper inside the rendered table", () => {
    const { container } = render(
      <Table ariaLabel="t">
        <TableBody>
          <TableRow>
            <TableCell>x</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const tableEl = container.querySelector("table.table__container");
    expect(tableEl).not.toBeNull();
    const stackElements = tableEl!.querySelectorAll(".stack");
    expect(stackElements.length).toBe(0);
  });
});

// CODEGEN-TABLE-CELL-ATTRIBUTES-01 / SHOWCASE-CONSUMPTION-03 A1 — the cell
// and header subcomponents own their <td>/<th>, so they must forward the HTML
// attributes a real data table needs (colSpan/rowSpan/scope) plus the global
// id/style. Without this, the TokensView token explorer (`<td colSpan={4}>`
// section rows, `<tr id>` :target anchoring) would be forced back to raw
// <table> markup. These assert the rendered DOM, not the emitted source.
describe("Table — cell attribute forwarding", () => {
  it("forwards colSpan + id + style onto the data cell, and id onto the row", () => {
    const { container } = render(
      <Table ariaLabel="Tokens">
        <TableBody>
          <TableRow id="row-anchor">
            <TableCell colSpan={4} id="cell-1" style={{ textAlign: "center" }}>
              Section header
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const row = container.querySelector("tr.table__row")!;
    expect(row.getAttribute("id")).toBe("row-anchor");

    const cell = container.querySelector("td.table__cell")! as HTMLTableCellElement;
    expect(cell.getAttribute("colspan")).toBe("4");
    expect(cell.getAttribute("id")).toBe("cell-1");
    expect(cell.style.textAlign).toBe("center");
  });

  it("forwards scope + colSpan + rowSpan onto the header cell", () => {
    const { container } = render(
      <Table ariaLabel="t">
        <TableHead>
          <TableRow>
            <TableHeaderCell scope="col" colSpan={2}>
              Grouped
            </TableHeaderCell>
            <TableHeaderCell scope="row" rowSpan={2}>
              Side
            </TableHeaderCell>
          </TableRow>
        </TableHead>
      </Table>,
    );
    const headers = container.querySelectorAll("th.table__headerCell");
    expect(headers.length).toBe(2);
    expect(headers[0].getAttribute("scope")).toBe("col");
    expect(headers[0].getAttribute("colspan")).toBe("2");
    expect(headers[1].getAttribute("scope")).toBe("row");
    expect(headers[1].getAttribute("rowspan")).toBe("2");
  });

  it("omits unset cell attributes from the DOM (no empty colspan/id pollution)", () => {
    const { container } = render(
      <Table ariaLabel="t">
        <TableBody>
          <TableRow>
            <TableCell>plain</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const cell = container.querySelector("td.table__cell")!;
    expect(cell.hasAttribute("colspan")).toBe(false);
    expect(cell.hasAttribute("rowspan")).toBe(false);
    expect(cell.hasAttribute("id")).toBe(false);
    expect(cell.hasAttribute("style")).toBe(false);
    expect(container.querySelector("tr.table__row")!.hasAttribute("id")).toBe(false);
  });
});
// @custom:end
