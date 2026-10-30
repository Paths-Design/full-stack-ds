import { html, render } from "lit";
import { repeat } from "lit/directives/repeat.js";
import { TableElement, tableCaption, tableHead, tableBody, tableFooter, tableRow, tableHeaderCell, tableCell } from "../../packages/ds-lit/src/index";

const activate = () => { document.body.dataset.activations = String(Number(document.body.dataset.activations ?? "0") + 1); };
const content = (ids = ["a", "b"]) => html`
  <caption>Orders</caption>
  <thead><tr><th scope="col">Team</th><th scope="col">Seats</th></tr></thead>
  <tbody>
    ${repeat(ids, id => id, id => html`<tr><th scope="row">Team ${id.toUpperCase()}</th><td>${id === "a" ? html`<button @click=${activate}>Edit A</button>` : "12"}</td></tr>`)}
  </tbody>
  <tfoot><tr><td colspan="2">${ids.length} teams</td></tr></tfoot>
`;

let probeRoot: ShadowRoot;
const probeTemplate = (ids: string[]) => html`<table aria-label="Orders">${content(ids)}</table>`;
export function updateTemplateProbe(ids: string[]) { render(probeTemplate(ids), probeRoot); }

function mountHost(host: HTMLElement) {
  const before = document.createElement("button");
  before.textContent = "Before table";
  Object.assign(before.style, { position: "absolute", top: "16px", left: "16px" });
  document.querySelector("#root")!.replaceChildren(before, host);
}

/** A grammar probe for direct Lit template insertion, not a library implementation. */
export function mountTemplateProbe() {
  const host = document.createElement("div");
  const shadow = host.attachShadow({ mode: "open" });
  probeRoot = shadow;
  updateTemplateProbe(["a", "b"]);
  mountHost(host);
  return host;
}

let mounted: TableElement;

function libraryContent(ids: string[]) {
  return [
    tableCaption("Orders"),
    tableHead(tableRow([tableHeaderCell("Team", { scope: "col" }), tableHeaderCell("Seats", { scope: "col" })])),
    tableBody(repeat(ids, id => id, id => tableRow([
      tableHeaderCell(`Team ${id.toUpperCase()}`, { scope: "row", rowSpan: 1 }),
      tableCell(id === "a" ? html`<button @click=${activate}>Edit A</button>` : "12", { style: "background-color: rgb(238, 245, 255)" }),
    ], { id: `row-${id}`, class: "consumer-row", "data-testid": `row-${id}` }))),
    tableFooter(tableRow(tableCell(`${ids.length} teams`, { colSpan: 2 }))),
  ];
}

export async function updateLibrary(ids: string[]) {
  mounted.renderContent = () => libraryContent(ids);
  await mounted.updateComplete;
}

export async function mountLibrary() {
  const table = new TableElement();
  table.ariaLabel = "Orders";
  table.style.setProperty("--fsds-core-spacing-size-03", "13px");
  table.renderContent = () => libraryContent(["a", "b"]);
  mountHost(table);
  await table.updateComplete;
  mounted = table;
  return table;
}
