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
import { Button, Icon, useFsdsMessages } from "@full-stack-ds/react";
import { FsdsMessagesProvider } from "@full-stack-ds/react/primitives";
function App() {
  const [count, setCount] = React.useState(0);
  const [disabled, setDisabled] = React.useState(false);
  const messages = useFsdsMessages("ReleaseProbe", { label: "Untranslated" });
  return React.createElement("main", null,
    React.createElement(Button, { variant: "primary", size: "large", ariaLabel: "Packed action", disabled, onClick: () => setCount(value => value + 1) }, "Packed action"),
    React.createElement(Icon, { name: "alarm", size: "lg", decorative: false, ariaLabel: "Packed alarm" }),
    React.createElement("button", { id: "toggle-disabled", onClick: () => setDisabled(value => !value) }, "Toggle disabled"),
    React.createElement("output", { id: "click-count" }, String(count)),
    React.createElement("output", { id: "translated-message" }, messages.label));
}
createRoot(document.getElementById("app")!).render(React.createElement(FsdsMessagesProvider, { messages: { ReleaseProbe: { label: "Prêt à publier" } } }, React.createElement(App)));
`;
const vue = `${imports("vue")}
import { createApp, h, ref } from "vue";
import { Button, Icon } from "@full-stack-ds/vue";
createApp({ setup() {
  const count = ref(0);
  const disabled = ref(false);
  return () => h("main", null, [
    h(Button, { variant: "primary", size: "large", ariaLabel: "Packed action", disabled: disabled.value, onClick: () => { count.value += 1; } }, { default: () => "Packed action" }),
    h(Icon, { name: "alarm", size: "lg", decorative: false, ariaLabel: "Packed alarm" }),
    h("button", { id: "toggle-disabled", onClick: () => { disabled.value = !disabled.value; } }, "Toggle disabled"),
    h("output", { id: "click-count" }, String(count.value)),
  ]);
} }).mount("#app");
`;
const svelteApp = `<script lang="ts">
  import { Button, Icon } from "@full-stack-ds/svelte";
  let count = $state(0);
  let disabled = $state(false);
</script>
<main>
  <Button variant="primary" size="large" ariaLabel="Packed action" {disabled} onClick={() => { count += 1; }}>Packed action</Button>
  <Icon name="alarm" size="lg" decorative={false} ariaLabel="Packed alarm" />
  <button id="toggle-disabled" onclick={() => { disabled = !disabled; }}>Toggle disabled</button>
  <output id="click-count">{count}</output>
</main>
`;
const angular = `${imports("angular")}
import { Component, enableProdMode, provideZonelessChangeDetection, signal } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { ButtonComponent, IconComponent } from "@full-stack-ds/angular";
@Component({ selector: "packed-consumer", standalone: true, imports: [ButtonComponent, IconComponent], template: \`
  <main>
    <fsds-button variant="primary" size="large" ariaLabel="Packed action" [disabled]="disabled()" [onClick]="activate">Packed action</fsds-button>
    <fsds-icon name="alarm" size="lg" [decorative]="false" ariaLabel="Packed alarm" />
    <button id="toggle-disabled" (click)="disabled.set(!disabled())">Toggle disabled</button>
    <output id="click-count">{{ count() }}</output>
  </main>\` })
class PackedConsumer {
  readonly count = signal(0);
  readonly disabled = signal(false);
  readonly activate = () => this.count.update(value => value + 1);
}
enableProdMode();
bootstrapApplication(PackedConsumer, { providers: [provideZonelessChangeDetection()] }).catch(error => { console.error(error); throw error; });
`;
const lit = `${imports("lit")}
import { ButtonElement, IconElement, StackElement as RootStack, TableElement, tableCaption, tableHead, tableBody, tableFooter, tableRow, tableHeaderCell, tableCell } from "@full-stack-ds/lit";
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
const table = new TableElement();
table.ariaLabel = "Packed table";
table.style.setProperty("--fsds-core-spacing-size-03", "11px");
const tableCount = document.createElement("output");
tableCount.id = "table-count";
tableCount.textContent = "0";
const edit = document.createElement("button");
edit.textContent = "Packed table action";
edit.onclick = () => { tableCount.textContent = String(Number(tableCount.textContent) + 1); };
table.renderContent = () => [
  tableCaption("Orders"),
  tableHead(tableRow([tableHeaderCell("Team", { scope: "col" }), tableHeaderCell("Seats", { scope: "col" })])),
  tableBody(tableRow([tableHeaderCell("Team A", { scope: "row" }), tableCell(edit)])),
  tableFooter(tableRow(tableCell("One team", { colSpan: 2 }))),
];
document.getElementById("app")!.append(table, tableCount);
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
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>Installed ${framework} consumer</title><style>:root { --fsds-button-design-root-background-fill: rgb(18, 52, 86); } body { margin: 32px; }</style></head>
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
          const table = page.getByRole("table", { name: "Packed table", exact: true });
          await expect(table.getByRole("columnheader")).toHaveText(["Team", "Seats"]);
          await expect(table.getByRole("rowheader")).toHaveText("Team A");
          observation.table = await table.evaluate(element => ({
            rows: element.rows.length,
            cells: Array.from(element.rows, row => row.cells.length),
            padding: getComputedStyle(element.tBodies[0].rows[0].cells[1]).paddingLeft,
            span: element.tFoot.rows[0].cells[0].colSpan,
          }));
          assert.deepEqual(observation.table, { rows: 3, cells: [2, 2, 1], padding: "11px", span: 2 });
          await table.getByRole("button", { name: "Packed table action" }).focus();
          await page.keyboard.press("Enter");
          await expect(page.locator("#table-count")).toHaveText("1");
        }
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
        console.log(`Installed ${framework}: Button, Icon, tokens and styles verified`);
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
