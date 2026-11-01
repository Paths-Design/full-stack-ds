import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const WEB = ["react", "vue", "svelte", "angular", "lit"];
const imports = framework => 'import "@full-stack-ds/tokens/tokens.css";\n' + (framework === "lit" ? "" : `import "@full-stack-ds/${framework}/styles.css";\n`);
const react = `${imports("react")}
import * as React from "react";
import { createRoot } from "react-dom/client";
import { Button, Icon, Links, type LinkActivationEvent, useFsdsMessages, Table, TableCaption, TableHead, TableBody, TableFooter, TableRow, TableHeaderCell, TableCell } from "@full-stack-ds/react";
import { FsdsMessagesProvider } from "@full-stack-ds/react/primitives";
function App() {
  const [count, setCount] = React.useState(0);
  const [disabled, setDisabled] = React.useState(false);
  const [tableCount, setTableCount] = React.useState(0);
  const [sort, setSort] = React.useState<"ascending" | "descending">("ascending");
  const [responsive, setResponsive] = React.useState<boolean | undefined>();
  const [contentLabel, setContentLabel] = React.useState<string | undefined>();
  const [linkDisabled, setLinkDisabled] = React.useState<boolean | undefined>();
  const [cancelLink, setCancelLink] = React.useState(false);
  const [linkEvents, setLinkEvents] = React.useState<object[]>([]);
  const activateLink = (event: LinkActivationEvent) => {
    const before = event.defaultPrevented;
    if (cancelLink) event.preventDefault();
    setLinkEvents(value => [...value, { hash: location.hash, before, after: event.defaultPrevented }]);
  };
  const messages = useFsdsMessages("ReleaseProbe", { label: "Untranslated" });
  return React.createElement("main", null,
    React.createElement(Button, { variant: "primary", size: "large", ariaLabel: "Packed action", disabled, onClick: () => setCount(value => value + 1) }, "Packed action"),
    React.createElement(Icon, { name: "alarm", size: "lg", decorative: false, ariaLabel: "Packed alarm" }),
    React.createElement("button", { id: "toggle-disabled", onClick: () => setDisabled(value => !value) }, "Toggle disabled"),
    React.createElement("output", { id: "click-count" }, String(count)),
    React.createElement("output", { id: "translated-message" }, messages.label),
    React.createElement("output", { id: "table-count" }, String(tableCount)),
    React.createElement("section", { id: "link-consumer", lang: "ar", dir: "rtl" },
      React.createElement("button", { id: "toggle-link-disabled", onClick: () => setLinkDisabled(value => !value) }, "Toggle link disabled"),
      React.createElement("button", { id: "toggle-link-cancel", onClick: () => setCancelLink(value => !value) }, "Toggle link cancellation"),
      React.createElement("output", { id: "link-events" }, JSON.stringify(linkEvents)),
      React.createElement("button", { id: "before-link" }, "Before link"),
      React.createElement(Links, { href: "#packed-destination", target: "_self", rel: "noopener noreferrer", disabled: linkDisabled, onClick: activateLink }, React.createElement("span", { id: "link-child" }, "الانتقال إلى الطلبات — Prêt")),
      React.createElement("div", { id: "initial-disabled-link" }, React.createElement(Links, { href: "#initial-disabled", disabled: true, onClick: activateLink }, "Indisponible")),
      React.createElement("div", { id: "blank-link" }, React.createElement(Links, { href: "#packed-new-target", target: "_blank", rel: "noopener noreferrer" }, "Nouvel onglet"))),
    React.createElement("button", { id: "responsive-default", onClick: () => setResponsive(undefined) }, "Default viewport"),
    React.createElement("button", { id: "responsive-true", onClick: () => setResponsive(true) }, "Enable viewport"),
    React.createElement("button", { id: "responsive-false", onClick: () => setResponsive(false) }, "Disable viewport"),
    React.createElement("button", { id: "label-viewport", onClick: () => setContentLabel("Contenu du tableau") }, "French viewport label"),
    React.createElement("button", { id: "before-table" }, "Before table viewport"),
    React.createElement("section", { id: "table-viewport" }, React.createElement(Table, { ariaLabel: "Packed table", responsive, contentLabel },
      React.createElement(TableCaption, null, "Orders"),
      React.createElement(TableHead, null,
        React.createElement(TableRow, null, React.createElement(TableHeaderCell, { id: "header-group", colSpan: 2, style: { minWidth: "800px" } }, "Workspace")),
        React.createElement(TableRow, null,
          React.createElement(TableHeaderCell, { id: "header-team", headers: "header-group", scope: "col" }, "Team"),
          React.createElement(TableHeaderCell, { id: "header-seats", headers: "header-group", scope: "col", abbr: "Pl.", ariaSort: sort, lang: "fr", dir: "ltr", title: "Nombre de places" }, React.createElement("button", { id: "toggle-sort", "aria-label": "Trier par places", onClick: () => setSort(value => value === "ascending" ? "descending" : "ascending") }, "Places")))),
      React.createElement(TableBody, null, React.createElement(TableRow, null,
        React.createElement(TableHeaderCell, { id: "row-team-a", headers: "header-group header-team", scope: "row" }, "Team A"),
        React.createElement(TableCell, { headers: "header-group header-seats row-team-a", lang: "ar", dir: "rtl", title: "المقاعد" }, "١٢ ", React.createElement("button", { onClick: () => setTableCount(value => value + 1) }, "تعديل")))),
      React.createElement(TableFooter, null, React.createElement(TableRow, null, React.createElement(TableCell, { colSpan: 2 }, "One team"))))));
}
createRoot(document.getElementById("app")!).render(React.createElement(FsdsMessagesProvider, { messages: { ReleaseProbe: { label: "Prêt à publier" } } }, React.createElement(App)));
`;
const vue = `${imports("vue")}
import { createApp, h, ref } from "vue";
import { Button, Icon, Links, type LinkActivationEvent, Table, TableCaption, TableHead, TableBody, TableFooter, TableRow, TableHeaderCell, TableCell } from "@full-stack-ds/vue";
createApp({ setup() {
  const count = ref(0);
  const disabled = ref(false);
  const tableCount = ref(0);
  const sort = ref<"ascending" | "descending">("ascending");
  const responsive = ref<boolean | undefined>();
  const contentLabel = ref<string | undefined>();
  const linkDisabled = ref<boolean | undefined>();
  const cancelLink = ref(false);
  const linkEvents = ref<object[]>([]);
  const activateLink = (event: LinkActivationEvent) => {
    const before = event.defaultPrevented;
    if (cancelLink.value) event.preventDefault();
    linkEvents.value.push({ hash: location.hash, before, after: event.defaultPrevented });
  };
  return () => h("main", null, [
    h(Button, { variant: "primary", size: "large", ariaLabel: "Packed action", disabled: disabled.value, onClick: () => { count.value += 1; } }, { default: () => "Packed action" }),
    h(Icon, { name: "alarm", size: "lg", decorative: false, ariaLabel: "Packed alarm" }),
    h("button", { id: "toggle-disabled", onClick: () => { disabled.value = !disabled.value; } }, "Toggle disabled"),
    h("output", { id: "click-count" }, String(count.value)),
    h("output", { id: "table-count" }, String(tableCount.value)),
    h("section", { id: "link-consumer", lang: "ar", dir: "rtl" }, [
      h("button", { id: "toggle-link-disabled", onClick: () => { linkDisabled.value = !linkDisabled.value; } }, "Toggle link disabled"),
      h("button", { id: "toggle-link-cancel", onClick: () => { cancelLink.value = !cancelLink.value; } }, "Toggle link cancellation"),
      h("output", { id: "link-events" }, JSON.stringify(linkEvents.value)),
      h("button", { id: "before-link" }, "Before link"),
      h(Links, { href: "#packed-destination", target: "_self", rel: "noopener noreferrer", disabled: linkDisabled.value, onClick: activateLink }, { default: () => h("span", { id: "link-child" }, "الانتقال إلى الطلبات — Prêt") }),
      h("div", { id: "initial-disabled-link" }, [h(Links, { href: "#initial-disabled", disabled: true, onClick: activateLink }, { default: () => "Indisponible" })]),
      h("div", { id: "blank-link" }, [h(Links, { href: "#packed-new-target", target: "_blank", rel: "noopener noreferrer" }, { default: () => "Nouvel onglet" })]),
    ]),
    h("button", { id: "responsive-default", onClick: () => { responsive.value = undefined; } }, "Default viewport"),
    h("button", { id: "responsive-true", onClick: () => { responsive.value = true; } }, "Enable viewport"),
    h("button", { id: "responsive-false", onClick: () => { responsive.value = false; } }, "Disable viewport"),
    h("button", { id: "label-viewport", onClick: () => { contentLabel.value = "Contenu du tableau"; } }, "French viewport label"),
    h("button", { id: "before-table" }, "Before table viewport"),
    h("section", { id: "table-viewport" }, [h(Table, { ariaLabel: "Packed table", responsive: responsive.value, contentLabel: contentLabel.value }, { default: () => [
      h(TableCaption, null, { default: () => "Orders" }),
      h(TableHead, null, { default: () => [
        h(TableRow, null, { default: () => h(TableHeaderCell, { id: "header-group", colSpan: 2, style: "min-width:800px" }, { default: () => "Workspace" }) }),
        h(TableRow, null, { default: () => [
          h(TableHeaderCell, { id: "header-team", headers: "header-group", scope: "col" }, { default: () => "Team" }),
          h(TableHeaderCell, { id: "header-seats", headers: "header-group", scope: "col", abbr: "Pl.", ariaSort: sort.value, lang: "fr", dir: "ltr", title: "Nombre de places" }, { default: () => h("button", { id: "toggle-sort", "aria-label": "Trier par places", onClick: () => { sort.value = sort.value === "ascending" ? "descending" : "ascending"; } }, "Places") }),
        ] }),
      ] }),
      h(TableBody, null, { default: () => h(TableRow, null, { default: () => [
        h(TableHeaderCell, { id: "row-team-a", headers: "header-group header-team", scope: "row" }, { default: () => "Team A" }),
        h(TableCell, { headers: "header-group header-seats row-team-a", lang: "ar", dir: "rtl", title: "المقاعد" }, { default: () => ["١٢ ", h("button", { onClick: () => { tableCount.value += 1; } }, "تعديل")] }),
      ] }) }),
      h(TableFooter, null, { default: () => h(TableRow, null, { default: () => h(TableCell, { colSpan: 2 }, { default: () => "One team" }) }) }),
    ] })]),
  ]);
} }).mount("#app");
`;
const svelteApp = `<script lang="ts">
  import { Button, Icon, Links, type LinkActivationEvent, Table, TableCaption, TableHead, TableBody, TableFooter, TableRow, TableHeaderCell, TableCell } from "@full-stack-ds/svelte";
  let count = $state(0);
  let disabled = $state(false);
  let tableCount = $state(0);
  let sort = $state<"ascending" | "descending">("ascending");
  let responsive = $state<boolean | undefined>();
  let contentLabel = $state<string | undefined>();
  let linkDisabled = $state<boolean | undefined>();
  let cancelLink = $state(false);
  let linkEvents = $state<object[]>([]);
  const activateLink = (event: LinkActivationEvent) => {
    const before = event.defaultPrevented;
    if (cancelLink) event.preventDefault();
    linkEvents.push({ hash: location.hash, before, after: event.defaultPrevented });
  };
</script>
<main>
  <Button variant="primary" size="large" ariaLabel="Packed action" {disabled} onClick={() => { count += 1; }}>Packed action</Button>
  <Icon name="alarm" size="lg" decorative={false} ariaLabel="Packed alarm" />
  <button id="toggle-disabled" onclick={() => { disabled = !disabled; }}>Toggle disabled</button>
  <output id="click-count">{count}</output>
  <output id="table-count">{tableCount}</output>
  <section id="link-consumer" lang="ar" dir="rtl">
    <button id="toggle-link-disabled" onclick={() => { linkDisabled = !linkDisabled; }}>Toggle link disabled</button>
    <button id="toggle-link-cancel" onclick={() => { cancelLink = !cancelLink; }}>Toggle link cancellation</button>
    <output id="link-events">{JSON.stringify(linkEvents)}</output>
    <button id="before-link">Before link</button>
    <Links href="#packed-destination" target="_self" rel="noopener noreferrer" disabled={linkDisabled} onClick={activateLink}><span id="link-child">الانتقال إلى الطلبات — Prêt</span></Links>
    <div id="initial-disabled-link"><Links href="#initial-disabled" disabled={true} onClick={activateLink}>Indisponible</Links></div>
    <div id="blank-link"><Links href="#packed-new-target" target="_blank" rel="noopener noreferrer">Nouvel onglet</Links></div>
  </section>
  <button id="responsive-default" onclick={() => { responsive = undefined; }}>Default viewport</button>
  <button id="responsive-true" onclick={() => { responsive = true; }}>Enable viewport</button>
  <button id="responsive-false" onclick={() => { responsive = false; }}>Disable viewport</button>
  <button id="label-viewport" onclick={() => { contentLabel = "Contenu du tableau"; }}>French viewport label</button>
  <button id="before-table">Before table viewport</button>
  <section id="table-viewport"><Table ariaLabel="Packed table" {responsive} {contentLabel}>
    <TableCaption>Orders</TableCaption>
    <TableHead>
      <TableRow><TableHeaderCell id="header-group" colSpan={2} style="min-width:800px">Workspace</TableHeaderCell></TableRow>
      <TableRow>
        <TableHeaderCell id="header-team" headers="header-group" scope="col">Team</TableHeaderCell>
        <TableHeaderCell id="header-seats" headers="header-group" scope="col" abbr="Pl." ariaSort={sort} lang="fr" dir="ltr" title="Nombre de places"><button id="toggle-sort" aria-label="Trier par places" onclick={() => { sort = sort === "ascending" ? "descending" : "ascending"; }}>Places</button></TableHeaderCell>
      </TableRow>
    </TableHead>
    <TableBody><TableRow>
      <TableHeaderCell id="row-team-a" headers="header-group header-team" scope="row">Team A</TableHeaderCell>
      <TableCell headers="header-group header-seats row-team-a" lang="ar" dir="rtl" title="المقاعد">١٢ <button onclick={() => { tableCount += 1; }}>تعديل</button></TableCell>
    </TableRow></TableBody>
    <TableFooter><TableRow><TableCell colSpan={2}>One team</TableCell></TableRow></TableFooter>
  </Table></section>
</main>
`;
const angular = `${imports("angular")}
import { Component, enableProdMode, provideZonelessChangeDetection, signal } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { ButtonComponent, IconComponent, LinksComponent, type LinkActivationEvent, TableComponent, TableCaptionComponent, TableHeadComponent, TableBodyComponent, TableFooterComponent, TableRowComponent, TableHeaderCellComponent, TableCellComponent } from "@full-stack-ds/angular";
@Component({ selector: "packed-consumer", standalone: true, imports: [ButtonComponent, IconComponent, LinksComponent, TableComponent, TableCaptionComponent, TableHeadComponent, TableBodyComponent, TableFooterComponent, TableRowComponent, TableHeaderCellComponent, TableCellComponent], template: \`
  <main>
    <fsds-button variant="primary" size="large" ariaLabel="Packed action" [disabled]="disabled()" [onClick]="activate">Packed action</fsds-button>
    <fsds-icon name="alarm" size="lg" [decorative]="false" ariaLabel="Packed alarm" />
    <button id="toggle-disabled" (click)="disabled.set(!disabled())">Toggle disabled</button>
    <output id="click-count">{{ count() }}</output>
    <output id="table-count">{{ tableCount() }}</output>
    <section id="link-consumer" lang="ar" dir="rtl">
      <button id="toggle-link-disabled" (click)="linkDisabled.set(!linkDisabled())">Toggle link disabled</button>
      <button id="toggle-link-cancel" (click)="cancelLink.set(!cancelLink())">Toggle link cancellation</button>
      <output id="link-events">{{ linkEventsJSON() }}</output>
      <button id="before-link">Before link</button>
      <fsds-links href="#packed-destination" target="_self" rel="noopener noreferrer" [disabled]="linkDisabled()" [onClick]="activateLink"><span id="link-child">الانتقال إلى الطلبات — Prêt</span></fsds-links>
      <div id="initial-disabled-link"><fsds-links href="#initial-disabled" [disabled]="true" [onClick]="activateLink">Indisponible</fsds-links></div>
      <div id="blank-link"><fsds-links href="#packed-new-target" target="_blank" rel="noopener noreferrer">Nouvel onglet</fsds-links></div>
    </section>
    <button id="responsive-default" (click)="responsive.set(undefined)">Default viewport</button>
    <button id="responsive-true" (click)="responsive.set(true)">Enable viewport</button>
    <button id="responsive-false" (click)="responsive.set(false)">Disable viewport</button>
    <button id="label-viewport" (click)="contentLabel.set('Contenu du tableau')">French viewport label</button>
    <button id="before-table">Before table viewport</button>
    <section id="table-viewport"><fsds-table ariaLabel="Packed table" [responsive]="responsive()" [contentLabel]="contentLabel()">
      <caption fsdsTableCaption>Orders</caption>
      <thead fsdsTableHead>
        <tr fsdsTableRow><th fsdsTableHeaderCell id="header-group" colspan="2" style="min-width:800px">Workspace</th></tr>
        <tr fsdsTableRow>
          <th fsdsTableHeaderCell id="header-team" headers="header-group" scope="col">Team</th>
          <th fsdsTableHeaderCell id="header-seats" headers="header-group" scope="col" abbr="Pl." [attr.aria-sort]="sort()" lang="fr" dir="ltr" title="Nombre de places"><button id="toggle-sort" aria-label="Trier par places" (click)="toggleSort()">Places</button></th>
        </tr>
      </thead>
      <tbody fsdsTableBody><tr fsdsTableRow>
        <th fsdsTableHeaderCell id="row-team-a" headers="header-group header-team" scope="row">Team A</th>
        <td fsdsTableCell headers="header-group header-seats row-team-a" lang="ar" dir="rtl" title="المقاعد">١٢ <button (click)="editTable()">تعديل</button></td>
      </tr></tbody>
      <tfoot fsdsTableFooter><tr fsdsTableRow><td fsdsTableCell colspan="2">One team</td></tr></tfoot>
    </fsds-table></section>
  </main>\` })
class PackedConsumer {
  readonly count = signal(0);
  readonly disabled = signal(false);
  readonly tableCount = signal(0);
  readonly sort = signal<"ascending" | "descending">("ascending");
  readonly responsive = signal<boolean | undefined>(undefined);
  readonly contentLabel = signal<string | undefined>(undefined);
  readonly linkDisabled = signal<boolean | undefined>(undefined);
  readonly cancelLink = signal(false);
  readonly linkEvents = signal<object[]>([]);
  readonly linkEventsJSON = () => JSON.stringify(this.linkEvents());
  readonly activateLink = (event: LinkActivationEvent) => {
    const before = event.defaultPrevented;
    if (this.cancelLink()) event.preventDefault();
    this.linkEvents.update(value => [...value, { hash: location.hash, before, after: event.defaultPrevented }]);
  };
  readonly toggleSort = () => this.sort.update(value => value === "ascending" ? "descending" : "ascending");
  readonly editTable = () => this.tableCount.update(value => value + 1);
  readonly activate = () => this.count.update(value => value + 1);
}
enableProdMode();
bootstrapApplication(PackedConsumer, { providers: [provideZonelessChangeDetection()] }).catch(error => { console.error(error); throw error; });
`;
const lit = `${imports("lit")}
import { ButtonElement, IconElement, LinksElement, type LinkActivationEvent, StackElement as RootStack, TableElement, tableCaption, tableHead, tableBody, tableFooter, tableRow, tableHeaderCell, tableCell } from "@full-stack-ds/lit";
import { StackElement } from "@full-stack-ds/lit/primitives";
if (StackElement !== RootStack) throw new Error("Public entries have different Stack constructors");
const stack = new StackElement();
stack.id = "packed-stack";
const button = new ButtonElement();
Object.assign(button, { variant: "primary", size: "large", ariaLabel: "Packed action", disabled: false, textContent: "Packed action" });
const icon = new IconElement();
Object.assign(icon, { name: "alarm", size: "lg", decorative: false, ariaLabel: "Packed alarm" });
const count = document.createElement("output");
count.id = "click-count";
count.textContent = "0";
button.onClick = () => { count.textContent = String(Number(count.textContent) + 1); };
const toggle = document.createElement("button");
toggle.id = "toggle-disabled";
toggle.textContent = "Toggle disabled";
toggle.onclick = () => { button.disabled = !button.disabled; };
stack.textContent = "Packed stack";
document.getElementById("app")!.append(stack, button, icon, toggle, count);
const linkConsumer = document.createElement("section");
Object.assign(linkConsumer, { id: "link-consumer", lang: "ar", dir: "rtl" });
const link = new LinksElement();
Object.assign(link, { href: "#packed-destination", target: "_self", rel: "noopener noreferrer" });
const linkChild = document.createElement("span");
linkChild.id = "link-child";
linkChild.textContent = "الانتقال إلى الطلبات — Prêt";
link.append(linkChild);
let cancelLink = false;
const linkEvents: object[] = [];
const linkOutput = document.createElement("output");
linkOutput.id = "link-events";
linkOutput.textContent = "[]";
const activateLink = (event: LinkActivationEvent) => {
  const before = event.defaultPrevented;
  if (cancelLink) event.preventDefault();
  linkEvents.push({ hash: location.hash, before, after: event.defaultPrevented });
  linkOutput.textContent = JSON.stringify(linkEvents);
};
link.onClick = activateLink;
const initialDisabled = document.createElement("div");
initialDisabled.id = "initial-disabled-link";
const unavailableLink = new LinksElement();
Object.assign(unavailableLink, { href: "#initial-disabled", disabled: true, onClick: activateLink, textContent: "Indisponible" });
initialDisabled.append(unavailableLink);
const blank = document.createElement("div");
blank.id = "blank-link";
const blankLink = new LinksElement();
Object.assign(blankLink, { href: "#packed-new-target", target: "_blank", rel: "noopener noreferrer", textContent: "Nouvel onglet" });
blank.append(blankLink);
const linkControls = ([
  ["toggle-link-disabled", "Toggle link disabled", () => { link.disabled = !link.disabled; }],
  ["toggle-link-cancel", "Toggle link cancellation", () => { cancelLink = !cancelLink; }],
  ["before-link", "Before link", () => {}],
] as const).map(([id, text, activate]) => {
  const control = document.createElement("button"); control.id = id; control.textContent = text; control.onclick = activate; return control;
});
linkConsumer.append(linkControls[0], linkControls[1], linkOutput, linkControls[2], link, initialDisabled, blank);
document.getElementById("app")!.append(linkConsumer);
const table = new TableElement();
table.ariaLabel = "Packed table";
table.style.setProperty("--fsds-core-spacing-size-03", "11px");
const tableCount = document.createElement("output");
tableCount.id = "table-count";
tableCount.textContent = "0";
const edit = document.createElement("button");
edit.textContent = "تعديل";
edit.onclick = () => { tableCount.textContent = String(Number(tableCount.textContent) + 1); };
let sort: "ascending" | "descending" = "ascending";
const toggleSort = document.createElement("button");
toggleSort.id = "toggle-sort";
toggleSort.textContent = "Places";
toggleSort.setAttribute("aria-label", "Trier par places");
const renderTable = () => [
  tableCaption("Orders"),
  tableHead([
    tableRow(tableHeaderCell("Workspace", { id: "header-group", colSpan: 2, style: "min-width:800px" })),
    tableRow([tableHeaderCell("Team", { id: "header-team", headers: "header-group", scope: "col" }), tableHeaderCell(toggleSort, { id: "header-seats", headers: "header-group", scope: "col", abbr: "Pl.", ariaSort: sort, lang: "fr", dir: "ltr", title: "Nombre de places" })]),
  ]),
  tableBody(tableRow([tableHeaderCell("Team A", { id: "row-team-a", headers: "header-group header-team", scope: "row" }), tableCell(["١٢ ", edit], { headers: "header-group header-seats row-team-a", lang: "ar", dir: "rtl", title: "المقاعد" })])),
  tableFooter(tableRow(tableCell("One team", { colSpan: 2 }))),
];
table.renderContent = renderTable;
toggleSort.onclick = () => { sort = sort === "ascending" ? "descending" : "ascending"; table.renderContent = () => renderTable(); };
const viewport = document.createElement("section");
viewport.id = "table-viewport";
viewport.append(table);
const controls = ([
  ["responsive-default", "Default viewport", () => { table.responsive = undefined; }],
  ["responsive-true", "Enable viewport", () => { table.responsive = true; }],
  ["responsive-false", "Disable viewport", () => { table.responsive = false; }],
  ["label-viewport", "French viewport label", () => { table.contentLabel = "Contenu du tableau"; }],
  ["before-table", "Before table viewport", () => {}],
] as const).map(([id, text, activate]) => {
  const control = document.createElement("button"); control.id = id; control.textContent = text; control.onclick = activate; return control;
});
document.getElementById("app")!.append(...controls, viewport, tableCount);
`;

/** FSDS packages are installed tarballs; external tools/peers use the pinned store. */
export async function verifyBrowsers({ repo, consumer, evidence }) {
  const rootRequire = createRequire(join(repo, "package.json"));
  const angularRequire = createRequire(join(repo, "packages/ds-angular/package.json"));
  const svelteRequire = createRequire(join(repo, "packages/ds-svelte/package.json"));
  const compilerRoot = dirname(angularRequire.resolve("@angular/compiler-cli/package.json"));
  const compilerRequire = createRequire(join(compilerRoot, "package.json"));
  const { build, preview } = await import(pathToFileURL(rootRequire.resolve("vite")).href);
  const { svelte } = await import(pathToFileURL(svelteRequire.resolve("@sveltejs/vite-plugin-svelte")).href);
  const { chromium, expect } = rootRequire("@playwright/test");
  const { transformAsync } = compilerRequire("@babel/core");
  const { default: linker } = await import(pathToFileURL(angularRequire.resolve("@angular/compiler-cli/linker/babel")).href);
  const peerEvidence = [];
  for (const [name, resolver] of [["@angular/platform-browser", angularRequire], ["tslib", compilerRequire]]) {
    const source = realpathSync(dirname(resolver.resolve(name + "/package.json")));
    const destination = join(consumer, "node_modules", name);
    mkdirSync(dirname(destination), { recursive: true });
    if (!existsSync(destination)) symlinkSync(source, destination, "dir");
    assert.equal(realpathSync(destination), source);
  }
  for (const name of ["react", "react-dom", "vue", "svelte", "lit", "@angular/core", "@angular/common", "@angular/platform-browser", "rxjs", "tslib"]) {
    const directory = realpathSync(join(consumer, "node_modules", name));
    peerEvidence.push({ name, directory, version: JSON.parse(readFileSync(join(directory, "package.json"), "utf8")).version });
  }
  writeFileSync(join(evidence, "browser-peers.json"), JSON.stringify(peerEvidence, null, 2));
  const browserRoot = join(consumer, "browser");
  const write = (file, contents) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, contents); };
  for (const framework of WEB) write(join(browserRoot, framework, "index.html"), `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>Installed ${framework} consumer</title><style>:root { --fsds-button-design-root-background-fill: rgb(18, 52, 86); } body { margin: 32px; } [data-fsds-component="table"] { --fsds-core-spacing-size-03: 11px; } #table-viewport { width: 240px; max-width: 100%; }</style></head>
<body>${framework === "angular" ? "<packed-consumer></packed-consumer>" : '<div id="app"></div>'}<script type="module" src="${framework === "angular" ? "./compiled/main.js" : "./main.ts"}"></script></body></html>`);
  for (const [name, source] of Object.entries({ react, vue, lit })) write(join(browserRoot, name, "main.ts"), source);
  write(join(browserRoot, "svelte/App.svelte"), svelteApp);
  write(join(browserRoot, "svelte/main.ts"), imports("svelte") + 'import { mount } from "svelte";\nimport App from "./App.svelte";\nmount(App, { target: document.getElementById("app")! });\n');
  const angularRoot = join(browserRoot, "angular");
  write(join(angularRoot, "src/main.ts"), angular);
  write(join(angularRoot, "tsconfig.json"), JSON.stringify({
    compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "Bundler", strict: true, skipLibCheck: true, noUncheckedSideEffectImports: true, experimentalDecorators: true, useDefineForClassFields: false, types: [], rootDir: "src", outDir: "compiled", ignoreDeprecations: "6.0" },
    angularCompilerOptions: { strictTemplates: true, strictInjectionParameters: true, strictInputAccessModifiers: true, compilationMode: "full" },
    files: ["src/main.ts"],
  }, null, 2));
  const compiler = join(compilerRoot, "bundles/src/bin/ngc.js");
  const args = [compiler, "-p", join(angularRoot, "tsconfig.json")];
  const compiled = spawnSync(process.execPath, args, { cwd: angularRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  writeFileSync(join(evidence, "browser-angular-aot.log"), `command: ${process.execPath} ${args.join(" ")}\ncwd: ${angularRoot}\nexit: ${compiled.status}\n${compiled.stdout ?? ""}\n${compiled.stderr ?? ""}`);
  if (compiled.error) throw compiled.error;
  assert.equal(compiled.status, 0, "Installed Angular consumer must compile with full AOT");
  const installedRequire = createRequire(join(consumer, "package.json"));
  const { resolveIcon } = await import(pathToFileURL(installedRequire.resolve("@full-stack-ds/iconography")).href);
  const expectedIcon = resolveIcon("alarm", 24);
  assert.ok(expectedIcon && expectedIcon.paths.length > 0);
  const tokenCSS = readFileSync(installedRequire.resolve("@full-stack-ds/tokens/tokens.css"), "utf8");
  const expectedToken = tokenCSS.match(/--fsds-core-color-datavis-viridis-1:\s*([^;]+);/)?.[1].trim();
  assert.equal(expectedToken, "#440154");
  let linkedModules = 0;
  const outputs = await build({
    configFile: false, root: browserRoot, logLevel: "warn",
    plugins: [svelte({ configFile: false }), { name: "installed-angular-standard-linker", enforce: "pre",
      async transform(code, id) {
        if (!/\.[cm]?js$/.test(id) || !code.includes("ɵɵngDeclare")) return null;
        const result = await transformAsync(code, { filename: id, configFile: false, babelrc: false, plugins: [[linker, { linkerJitMode: false }]] });
        assert.ok(result?.code, "Angular linker produced no code for " + id);
        linkedModules += 1;
        return { code: result.code, map: null };
      },
    }],
    resolve: { dedupe: ["react", "react-dom", "vue", "svelte", "lit", "@angular/core", "@angular/common", "@angular/platform-browser", "rxjs"] },
    build: { outDir: "dist", emptyOutDir: true, minify: true, sourcemap: true, write: true,
      rollupOptions: { input: Object.fromEntries(WEB.map(name => [name, join(browserRoot, name, "index.html")])) },
    },
  });
  assert.ok(linkedModules > 0, "Angular partial declarations must pass through the linker");
  const moduleIDs = new Set();
  for (const output of Array.isArray(outputs) ? outputs : [outputs]) for (const chunk of output.output) {
    if (chunk.type !== "chunk") continue;
    assert.ok(!chunk.code.includes("ɵɵngDeclare"), "Unlinked partial declaration in browser bundle");
    for (const id of Object.keys(chunk.modules)) {
      moduleIDs.add(id);
      assert.ok(!id.includes("/@angular/compiler/"), "Browser bundle contains Angular JIT compiler");
      assert.ok(!/\/packages\/ds-(?:react|vue|svelte|angular|lit|tokens|iconography)\//.test(id), "Workspace FSDS implementation reached bundle: " + id);
      if (id.includes("/node_modules/@full-stack-ds/")) assert.ok(id.startsWith(consumer + "/node_modules/@full-stack-ds/"), "FSDS module escaped installed consumer: " + id);
    }
  }
  writeFileSync(join(evidence, "browser-bundle-modules.json"), JSON.stringify({ linkedModules, modules: [...moduleIDs].sort() }, null, 2));
  const port = Number(process.env.FSDS_RELEASE_PACKAGE_PORT ?? 5194);
  const server = await preview({ configFile: false, root: browserRoot, logLevel: "warn", build: { outDir: "dist" }, preview: { host: "127.0.0.1", port, strictPort: true } });
  let browser;
  const observations = [];
  try {
    browser = await chromium.launch();
    for (const framework of WEB) {
      const page = await browser.newPage();
      const failures = [];
      const observation = { framework };
      page.on("pageerror", error => failures.push("pageerror: " + error.message));
      page.on("console", message => { if (message.type() === "error") failures.push("console: " + message.text()); });
      page.on("requestfailed", request => failures.push(`request: ${request.url()}: ${request.failure()?.errorText}`));
      page.on("response", response => { if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`); });
      try {
        await page.goto(`http://127.0.0.1:${port}/${framework}/`, { waitUntil: "networkidle" });
        const button = page.getByRole("button", { name: "Packed action", exact: true });
        const count = page.locator("#click-count");
        const toggle = page.locator("#toggle-disabled");
        await expect(button).toBeVisible();
        await expect(count).toHaveText("0");
        if (framework === "react") await expect(page.locator("#translated-message")).toHaveText("Prêt à publier");
        if (framework === "lit") {
          await expect(page.locator("#packed-stack")).toBeVisible();
          assert.equal(await page.locator("#packed-stack").evaluate(element => getComputedStyle(element).display), "flex");
        }
        const link = page.getByRole("link", { name: "الانتقال إلى الطلبات — Prêt", exact: true });
        const linkChild = page.locator("#link-child");
        const pointerActivateDisabled = async target => {
          await target.scrollIntoViewIfNeeded();
          const bounds = await target.boundingBox();
          assert.ok(bounds && bounds.width > 0 && bounds.height > 0, framework + ": disabled pointer scenario must have a visible hit target");
          // Locator.click's enabled check rejects aria-disabled; use actual mouse input.
          await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        };
        const linkEvents = () => page.locator("#link-events").evaluate(element => JSON.parse(element.textContent));
        const linkHash = () => page.evaluate(() => location.hash);
        const clearLinkHash = () => page.evaluate(() => history.replaceState(null, "", location.pathname + location.search));
        const settleLinkInput = () => page.evaluate(() => new Promise(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
        const settleLinkStyle = () => link.evaluate(async element => {
          await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {})));
        });
        const linkFacts = element => {
          const style = getComputedStyle(element);
          return {
            tag: element.tagName, hrefPresent: element.hasAttribute("href"), href: element.getAttribute("href"),
            target: element.getAttribute("target"), rel: element.getAttribute("rel"),
            disabled: element.getAttribute("aria-disabled"), role: element.getAttribute("role"), tabIndex: element.tabIndex,
            direction: style.direction, pointerEvents: style.pointerEvents, color: style.color,
            outlineWidth: style.outlineWidth, outlineStyle: style.outlineStyle,
            focused: element.getRootNode().activeElement === element,
          };
        };
        const focusLinkByTab = async () => {
          await page.locator("#before-link").focus();
          await page.keyboard.press("Tab");
          assert.equal(await link.evaluate(element => element.getRootNode().activeElement === element), true, framework + ": real Tab must reach the inner anchor, including Shadow DOM");
          const facts = await link.evaluate(linkFacts);
          assert.ok(parseFloat(facts.outlineWidth) > 0, framework + ": keyboard focus must have a visible computed outline width");
          assert.equal(facts.outlineStyle, "solid", framework + ": keyboard focus must use the packed focus token rather than a browser default auto outline");
          return facts;
        };
        await expect(link).toBeVisible();
        await expect(linkChild).toHaveText("الانتقال إلى الطلبات — Prêt");
        const linkBefore = await link.elementHandle();
        assert.ok(linkBefore);
        observation.links = { initial: await link.evaluate(linkFacts), transitions: [], activation: [] };
        assert.equal(observation.links.initial.tag, "A");
        assert.equal(observation.links.initial.hrefPresent, true, framework + ": undefined disabled must preserve the actual href attribute");
        assert.equal(observation.links.initial.href, "#packed-destination");
        assert.equal(observation.links.initial.target, "_self");
        assert.equal(observation.links.initial.rel, "noopener noreferrer");
        assert.equal(observation.links.initial.direction, "rtl");
        assert.notEqual(observation.links.initial.disabled, "true");
        const initialDisabledLink = page.locator("#initial-disabled-link").getByRole("link", { name: "Indisponible", exact: true });
        observation.links.initialDisabled = await initialDisabledLink.evaluate(linkFacts);
        assert.equal(observation.links.initialDisabled.hrefPresent, false, framework + ": initially disabled links must omit href rather than blank it");
        assert.equal(observation.links.initialDisabled.disabled, "true");
        assert.equal(observation.links.initialDisabled.role, "link");
        assert.equal(observation.links.initialDisabled.tabIndex, 0);
        await pointerActivateDisabled(initialDisabledLink);
        await initialDisabledLink.focus();
        await page.keyboard.press("Enter");
        await settleLinkInput();
        assert.deepEqual(await linkEvents(), [], framework + ": initially disabled pointer and Enter must not invoke the consumer");
        assert.equal(await linkHash(), "", framework + ": initially disabled pointer and Enter must not navigate");
        Object.assign(observation.links.initialDisabled, { callbackCount: 0, hash: await linkHash() });
        const blankLink = page.locator("#blank-link").getByRole("link", { name: "Nouvel onglet", exact: true });
        observation.links.newTarget = await blankLink.evaluate(linkFacts);
        assert.equal(observation.links.newTarget.href, "#packed-new-target");
        assert.equal(observation.links.newTarget.target, "_blank");
        assert.equal(observation.links.newTarget.rel, "noopener noreferrer");
        // A real new-target activation retains the browser's native navigation path.
        const [popup] = await Promise.all([page.context().waitForEvent("page"), blankLink.click()]);
        try {
          await popup.waitForURL(url => url.hash === "#packed-new-target");
          observation.links.newTarget.popupURL = popup.url();
          assert.equal(await linkHash(), "");
        } finally { await popup.close(); }
        await page.locator("#toggle-link-cancel").click();
        await linkChild.click();
        await expect.poll(linkEvents).toEqual([{ hash: "", before: false, after: true }]);
        assert.equal(await linkHash(), "", framework + ": nested pointer callback cancellation must prevent native navigation");
        observation.links.activation.push({ input: "pointer", cancelled: true, callbacks: await linkEvents(), hash: await linkHash() });
        observation.links.enabledFocus = await focusLinkByTab();
        await page.keyboard.press("Enter");
        await expect.poll(linkEvents).toEqual([{ hash: "", before: false, after: true }, { hash: "", before: false, after: true }]);
        assert.equal(await linkHash(), "", framework + ": Enter callback cancellation must prevent native navigation");
        observation.links.activation.push({ input: "Enter", cancelled: true, callbacks: await linkEvents(), hash: await linkHash() });
        await page.mouse.move(0, 0);
        await page.locator("#toggle-link-disabled").click();
        await expect(link).toHaveAttribute("aria-disabled", "true");
        await expect(link).not.toHaveAttribute("href");
        await settleLinkStyle();
        const disabledFacts = await link.evaluate(linkFacts);
        assert.equal(disabledFacts.hrefPresent, false);
        assert.equal(disabledFacts.role, "link");
        assert.equal(disabledFacts.tabIndex, 0);
        assert.equal(disabledFacts.pointerEvents, "auto", framework + ": disabled links remain hit-testable for discovery");
        assert.equal(await link.evaluate((element, previous) => element === previous, linkBefore), true);
        observation.links.transitions.push({ state: "disabled", sameAnchor: true, ...disabledFacts });
        await pointerActivateDisabled(linkChild);
        await settleLinkInput();
        assert.equal((await linkEvents()).length, 2, framework + ": disabled nested pointer activation must not invoke the consumer");
        assert.equal(await linkHash(), "", framework + ": disabled nested pointer activation must not navigate");
        await page.mouse.move(0, 0);
        observation.links.disabledFocus = await focusLinkByTab();
        const linkSession = await page.context().newCDPSession(page);
        const linkAX = await linkSession.send("Accessibility.getFullAXTree");
        writeFileSync(join(evidence, `browser-links-${framework}-disabled-AX.json`), JSON.stringify(linkAX, null, 2));
        const disabledAXLink = linkAX.nodes.find(node => !node.ignored && node.role?.value === "link" && node.name?.value === "الانتقال إلى الطلبات — Prêt");
        assert.ok(disabledAXLink, framework + ": localized disabled link must remain in the accessibility tree");
        observation.links.disabledAX = Object.fromEntries((disabledAXLink.properties ?? []).map(property => [property.name, property.value?.value]));
        assert.equal(observation.links.disabledAX.disabled, true, framework + ": the focused link must expose disabled state");
        assert.equal(observation.links.disabledAX.focused, true, framework + ": keyboard focus must reach the accessible link");
        await linkSession.detach();
        await page.keyboard.press("Enter");
        await settleLinkInput();
        assert.equal((await linkEvents()).length, 2, framework + ": disabled Enter must not invoke the consumer");
        assert.equal(await linkHash(), "", framework + ": disabled Enter must not navigate");
        observation.links.activation.push({ input: "disabled pointer and Enter", callbacks: await linkEvents(), callbackCount: 2, hash: await linkHash() });
        await linkChild.hover();
        await settleLinkStyle();
        observation.links.disabledHover = await link.evaluate(linkFacts);
        assert.equal(observation.links.disabledHover.color, disabledFacts.color, framework + ": disabled hover must suppress pointer color changes");
        assert.equal(observation.links.disabledHover.outlineWidth, observation.links.disabledFocus.outlineWidth, framework + ": disabled hover must preserve keyboard focus outline width");
        assert.equal(observation.links.disabledHover.outlineStyle, "solid", framework + ": disabled hover must preserve the packed keyboard focus outline");
        await page.screenshot({ path: join(evidence, `packed-links-${framework}-disabled-focus.png`), fullPage: true });
        await page.locator("#toggle-link-disabled").click();
        await page.locator("#toggle-link-cancel").click();
        await expect(link).toHaveAttribute("href", "#packed-destination");
        assert.notEqual(await link.getAttribute("aria-disabled"), "true");
        assert.equal(await link.evaluate((element, previous) => element === previous, linkBefore), true);
        observation.links.transitions.push({ state: "reenabled", sameAnchor: true, ...await link.evaluate(linkFacts) });
        await linkChild.click();
        await expect.poll(linkHash).toBe("#packed-destination");
        await expect.poll(linkEvents).toEqual([{ hash: "", before: false, after: true }, { hash: "", before: false, after: true }, { hash: "", before: false, after: false }]);
        observation.links.activation.push({ input: "pointer", cancelled: false, callbacks: await linkEvents(), hash: await linkHash() });
        await clearLinkHash();
        await focusLinkByTab();
        await page.keyboard.press("Enter");
        await expect.poll(linkHash).toBe("#packed-destination");
        await expect.poll(linkEvents).toEqual([{ hash: "", before: false, after: true }, { hash: "", before: false, after: true }, { hash: "", before: false, after: false }, { hash: "", before: false, after: false }]);
        observation.links.activation.push({ input: "Enter", cancelled: false, callbacks: await linkEvents(), hash: await linkHash() });
        assert.equal(await link.evaluate((element, previous) => element === previous, linkBefore), true);
        await linkBefore.dispose();
        await clearLinkHash();
        const table = page.getByRole("table", { name: "Packed table", exact: true });
        await expect(table.getByRole("columnheader")).toHaveText(["Workspace", "Team", "Places"]);
        await expect(table.getByRole("rowheader")).toHaveText("Team A");
        observation.table = await table.evaluate(element => {
          const header = element.querySelector("#header-seats");
          const cell = element.querySelector("td[headers]");
          return {
            rows: element.rows.length,
            cells: Array.from(element.rows, row => row.cells.length),
            padding: getComputedStyle(cell).paddingLeft,
            span: element.tFoot.rows[0].cells[0].colSpan,
            header: { headers: header.headers, abbr: header.abbr, lang: header.lang, dir: header.dir, title: header.title, sort: header.getAttribute("aria-sort") },
            cell: { headers: cell.headers, lang: cell.lang, dir: cell.dir, title: cell.title, direction: getComputedStyle(cell).direction },
            referencesResolve: cell.headers.split(/\s+/).every(id => element.querySelector("#" + CSS.escape(id))?.tagName === "TH"),
          };
        });
        assert.deepEqual(observation.table, {
          rows: 4, cells: [1, 2, 2, 1], padding: "11px", span: 2,
          header: { headers: "header-group", abbr: "Pl.", lang: "fr", dir: "ltr", title: "Nombre de places", sort: "ascending" },
          cell: { headers: "header-group header-seats row-team-a", lang: "ar", dir: "rtl", title: "المقاعد", direction: "rtl" },
          referencesResolve: true,
        });
        const header = table.locator("#header-seats");
        const headerBefore = await header.elementHandle();
        assert.ok(headerBefore);
        await page.locator("#toggle-sort").click();
        await expect(header).toHaveAttribute("aria-sort", "descending");
        await expect(page.locator("#toggle-sort")).toBeFocused();
        observation.table.sameHeaderAfterUpdate = await header.evaluate((element, previous) => element === previous, headerBefore);
        assert.equal(observation.table.sameHeaderAfterUpdate, true);
        await headerBefore.dispose();
        await expect(table.locator("[aria-sort]")).toHaveCount(1);
        const session = await page.context().newCDPSession(page);
        const ax = await session.send("Accessibility.getFullAXTree");
        writeFileSync(join(evidence, `browser-table-${framework}-AX.json`), JSON.stringify(ax, null, 2));
        const axTable = ax.nodes.find(node => !node.ignored && node.role?.value === "table" && node.name?.value === "Packed table");
        assert.ok(axTable, framework + ": native table must appear in Chromium accessibility tree");
        const axById = new Map(ax.nodes.map(node => [node.nodeId, node]));
        const descendants = ax.nodes.filter(node => {
          let parent = node.parentId;
          while (parent) {
            if (parent === axTable.nodeId) return !node.ignored;
            parent = axById.get(parent)?.parentId;
          }
          return false;
        });
        assert.equal(descendants.filter(node => node.role?.value === "row").length, 4);
        assert.equal(descendants.filter(node => node.role?.value === "columnheader").length, 3);
        assert.equal(descendants.filter(node => node.role?.value === "rowheader").length, 1);
        await table.getByRole("button", { name: "تعديل", exact: true }).focus();
        await page.keyboard.press("Enter");
        await expect(page.locator("#table-count")).toHaveText("1");
        const viewport = page.getByRole("region", { name: "Table content", exact: true });
        const tableBefore = await table.elementHandle();
        const cellBefore = await table.locator("td[headers]").elementHandle();
        assert.ok(tableBefore && cellBefore);
        const viewportFacts = () => viewport.evaluate(element => ({
          policy: element.getAttribute("data-responsive"),
          overflow: getComputedStyle(element).overflowX,
          direction: getComputedStyle(element).direction,
          tabIndex: element.tabIndex,
          width: element.clientWidth,
          scrollWidth: element.scrollWidth,
          scrollLeft: element.scrollLeft,
        }));
        observation.viewport = { policies: [], keyboard: [] };
        for (const [control, enabled] of [["responsive-default", true], ["responsive-true", true], ["responsive-false", false], ["responsive-true", true], ["responsive-default", true]]) {
          await page.locator("#" + control).click();
          await expect(viewport).toHaveAttribute("data-responsive", String(enabled));
          await viewport.evaluate(element => { element.scrollLeft = 120; });
          const facts = await viewportFacts();
          assert.equal(facts.overflow, enabled ? "auto" : "visible");
          assert.equal(facts.tabIndex, enabled ? 0 : -1);
          assert.ok(facts.width >= 200 && facts.width <= 250, "Viewport must remain bounded by the consumer");
          assert.ok(facts.scrollWidth > facts.width + 400, "Fixture must actually overflow");
          assert.equal(facts.scrollLeft > 0, enabled, "Policy must control actual scrolling");
          assert.equal(await table.evaluate((element, previous) => element === previous, tableBefore), true);
          assert.equal(await table.locator("td[headers]").evaluate((element, previous) => element === previous, cellBefore), true);
          observation.viewport.policies.push({ control, ...facts, sameTable: true, sameCell: true });
          if (!enabled) {
            await page.locator("#before-table").focus();
            await page.keyboard.press("Tab");
            await expect(viewport).not.toBeFocused();
          }
        }
        const revealedAction = table.getByRole("button", { name: "تعديل", exact: true });
        const actionVisibility = async () => {
          const [viewportBounds, contentBounds] = await Promise.all([viewport.boundingBox(), revealedAction.boundingBox()]);
          assert.ok(viewportBounds && contentBounds && contentBounds.width > 0 && contentBounds.height > 0);
          return {
            name: "تعديل",
            left: contentBounds.x - viewportBounds.x,
            right: contentBounds.x + contentBounds.width - viewportBounds.x,
            top: contentBounds.y - viewportBounds.y,
            bottom: contentBounds.y + contentBounds.height - viewportBounds.y,
            viewportWidth: viewportBounds.width,
            viewportHeight: viewportBounds.height,
            fullyVisible: contentBounds.x >= viewportBounds.x - 0.5 && contentBounds.x + contentBounds.width <= viewportBounds.x + viewportBounds.width + 0.5 && contentBounds.y >= viewportBounds.y - 0.5 && contentBounds.y + contentBounds.height <= viewportBounds.y + viewportBounds.height + 0.5,
          };
        };
        for (const direction of ["ltr", "rtl"]) {
          await page.locator("#table-viewport").evaluate((element, value) => { element.dir = value; }, direction);
          await viewport.evaluate(element => { element.scrollLeft = 0; });
          await page.locator("#before-table").focus();
          await page.keyboard.press("Tab");
          await expect(viewport).toBeFocused();
          const contentBefore = await actionVisibility();
          assert.equal(contentBefore.fullyVisible, false, "The keyboard scenario must begin with clipped cell content");
          await page.screenshot({ path: join(evidence, `packed-table-${framework}-${direction}-initial.png`), fullPage: true });
          let arrowSteps = 0;
          while (arrowSteps < 40 && !(await actionVisibility()).fullyVisible) {
            await viewport.evaluate(element => {
              element.setAttribute("data-release-scroll-state", "pending");
              element.addEventListener("scrollend", () => element.setAttribute("data-release-scroll-state", "idle"), { once: true });
            });
            await page.keyboard.press(direction === "ltr" ? "ArrowRight" : "ArrowLeft", { delay: 10 });
            await expect(viewport).toHaveAttribute("data-release-scroll-state", "idle");
            arrowSteps += 1;
          }
          await expect.poll(async () => Math.abs((await viewportFacts()).scrollLeft)).toBeGreaterThan(0);
          const keyboardFacts = { ...await viewportFacts(), arrowSteps, contentBefore, contentAfter: await actionVisibility() };
          observation.viewport.keyboard.push(keyboardFacts);
          await page.screenshot({ path: join(evidence, `packed-table-${framework}-${direction}-after-keys.png`), fullPage: true });
          await expect.poll(async () => {
            keyboardFacts.contentAfter = await actionVisibility();
            keyboardFacts.scrollLeft = (await viewportFacts()).scrollLeft;
            return keyboardFacts.contentAfter.fullyVisible;
          }).toBe(true);
          await expect(viewport).toBeFocused();
          const facts = await viewportFacts();
          assert.equal(facts.direction, direction);
          assert.equal(Math.sign(facts.scrollLeft), direction === "ltr" ? 1 : -1);
          await page.screenshot({ path: join(evidence, `packed-table-${framework}-${direction}.png`), fullPage: true });
        }
        await page.locator("#label-viewport").click();
        await expect(page.getByRole("region", { name: "Contenu du tableau", exact: true })).toBeVisible();
        observation.viewport.localizedName = "Contenu du tableau";
        await tableBefore.dispose();
        await cellBefore.dispose();
        await page.mouse.move(0, 0);
        observation.buttonStyle = await button.evaluate(element => { const style = getComputedStyle(element); return { display: style.display, background: style.backgroundColor, minHeight: style.minHeight }; });
        assert.deepEqual(observation.buttonStyle, { display: "inline-flex", background: "rgb(18, 52, 86)", minHeight: "48px" });
        observation.token = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--fsds-core-color-datavis-viridis-1").trim());
        assert.equal(observation.token, expectedToken, framework + ": installed tokens must reach document");
        const icon = page.getByRole("img", { name: "Packed alarm", exact: true });
        await expect(icon).toBeVisible();
        const svg = icon.locator('svg[data-fsds-icon="alarm"]');
        await expect(svg).toHaveCount(1);
        observation.icon = await svg.evaluate(element => ({ viewBox: element.getAttribute("viewBox"), width: element.getAttribute("width"), height: element.getAttribute("height"), paths: [...element.querySelectorAll("path")].map(path => path.getAttribute("d")) }));
        assert.deepEqual(observation.icon, { viewBox: expectedIcon.viewBox, width: "24", height: "24", paths: expectedIcon.paths.map(path => path.d) });
        await button.click();
        await expect(count).toHaveText("1");
        await toggle.click();
        await expect(button).toBeDisabled();
        await button.evaluate(element => element.click());
        await page.evaluate(() => new Promise(resolveFrame => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
        await expect(count).toHaveText("1");
        await toggle.click();
        await expect(button).toBeEnabled();
        await button.click();
        await expect(count).toHaveText("2");
        observation.activation = { enabledCounts: [0, 1, 2], disabledCount: 1 };
        await page.screenshot({ path: join(evidence, `packed-${framework}.png`), fullPage: true });
        assert.deepEqual(failures, [], framework + ": browser failures");
        observation.passed = true;
        observations.push(observation);
        console.log(`Installed ${framework}: Button, Icon, Links activation/focus/navigation, Table metadata, tokens and styles verified`);
      } catch (error) { observation.error = error.stack ?? String(error); throw error; }
      finally { observation.failures = failures; writeFileSync(join(evidence, `browser-${framework}.json`), JSON.stringify(observation, null, 2)); await page.close(); }
    }
  } finally {
    await browser?.close();
    await new Promise((resolveClose, reject) => server.httpServer.close(error => error ? reject(error) : resolveClose()));
  }
  assert.equal(observations.length, WEB.length);
  return observations;
}
