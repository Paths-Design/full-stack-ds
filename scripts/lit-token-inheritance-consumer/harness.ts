import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildComponentIR } from "../../packages/ds-codegen/src/ir.js";
import { emitLitInlineCss } from "../../packages/ds-codegen/src/css.js";

export async function prepareLitTokenConsumer() {
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const evidence = realpathSync(mkdtempSync(join(tmpdir(), "fsds-lit-token-inheritance-")));
  const artifacts = join(evidence, "tarballs"), consumer = join(evidence, "consumer");
  mkdirSync(artifacts); mkdirSync(consumer);
  console.log("Lit token evidence: " + evidence);
  const run = (label: string, command: string, args: string[], cwd: string) => {
    const result = spawnSync(command, args, { cwd, encoding: "utf8", maxBuffer: 30 * 1024 * 1024 });
    writeFileSync(join(evidence, label + ".log"), `command: ${command} ${args.join(" ")}\ncwd: ${cwd}\nexit: ${result.status}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
    if (result.error) throw result.error;
    assert.equal(result.status, 0, label + ": inspect " + evidence);
  };
  const payloads: Array<{ name: string; sha256: string }> = [], tarballs: string[] = [];
  for (const name of ["iconography", "tokens", "lit"]) {
    const directory = join(repo, "packages/ds-" + name);
    const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
    run("pack-" + name, "pnpm", ["pack", "--pack-destination", artifacts], directory);
    const tarball = join(artifacts, manifest.name.replace(/^@/, "").replace("/", "-") + "-" + manifest.version + ".tgz");
    assert.ok(existsSync(tarball)); tarballs.push(tarball);
    payloads.push({ name: manifest.name, sha256: createHash("sha256").update(readFileSync(tarball)).digest("hex") });
  }
  writeFileSync(join(consumer, "package.json"), JSON.stringify({ name: "lit-token-consumer", private: true, type: "module" }));
  run("install", "npm", ["install", "--offline", "--ignore-scripts", "--legacy-peer-deps", "--package-lock=false", "--no-audit", "--no-fund", "--cache", join(evidence, "npm-cache"), ...tarballs], consumer);
  for (const name of ["iconography", "tokens", "lit"]) {
    const directory = join(consumer, "node_modules/@full-stack-ds", name);
    assert.equal(realpathSync(directory), directory, "FSDS package must be a real tarball install");
  }
  const peerRequire = createRequire(join(repo, "packages/ds-lit/package.json"));
  const peer = peerRequire.resolve.paths("lit")!.map(path => join(path, "lit")).find(path => existsSync(join(path, "package.json")));
  assert.ok(peer);
  symlinkSync(realpathSync(peer), join(consumer, "node_modules/lit"), "dir");
  const rootRequire = createRequire(join(repo, "package.json"));
  const { build, preview } = await import(pathToFileURL(rootRequire.resolve("vite")).href);
  const html = (entry: string) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Installed Lit token consumers</title><style>body{margin:16px;font:16px Arial,sans-serif}#proof{width:240px}#proof>h1{font-size:20px}#syntax-host{display:block;margin-top:16px}</style></head><body><section id="proof"><h1>اختبار الرموز</h1></section><script type="module" src="./${entry}"></script></body></html>`;
  writeFileSync(join(consumer, "index.html"), html("main.ts"));
  writeFileSync(join(consumer, "bare.html"), html("bare.ts"));
  writeFileSync(join(consumer, "main.ts"), 'import "@full-stack-ds/tokens/tokens.css";\nimport "./app.ts";\n');
  writeFileSync(join(consumer, "bare.ts"), 'import "./app.ts";\n');
  const synthetic = buildComponentIR({ name: "SyntaxProbe", cssPrefix: "syntax-probe", layer: "primitive",
    anatomy: { parts: ["root", "child"] }, variants: { density: ["default", "compact"] },
    tokens: {
      "syntaxProbe.base": { resolvesTo: "core.spacing.size.04", fallback: "8px", layer: "core" },
      "syntaxProbe.alias": { resolvesTo: "syntaxProbe.base", fallback: "9px", layer: "semantic" },
    },
    styles: {
      root: { padding: { resolvesTo: "syntaxProbe.alias", fallback: "1px", platforms: ["web"] } },
      child: { padding: { resolvesTo: "syntaxProbe.alias", fallback: "2px", platforms: ["web"] } },
      "--compact": { "syntaxProbe.base": { literal: "7px", platforms: ["web"] } },
    },
  });
  writeFileSync(join(consumer, "synthetic.css"), emitLitInlineCss(synthetic));
  writeFileSync(join(consumer, "app.ts"), String.raw`
import { CardElement, ButtonElement } from "@full-stack-ds/lit";
import syntaxCss from "./synthetic.css?raw";
const wrapper = document.getElementById("proof")!;
const outer = new CardElement(), inner = new CardElement(), button = new ButtonElement();
outer.id = "card-outer"; inner.id = "card-inner"; button.id = "action-host";
outer.density = "inset"; inner.density = "inset";
const body = document.createElement("p"); body.textContent = "بطاقة خارجية — 日本語";
const nested = document.createElement("p"); nested.textContent = "بطاقة داخلية";
inner.append(nested); outer.append(body, inner);
const mark = document.createElement("span"), label = document.createElement("span");
mark.textContent = "✓"; mark.setAttribute("aria-hidden", "true"); label.textContent = "حفظ";
mark.id = "action-mark"; label.id = "action-label";
button.append(mark, label); button.ariaLabel = "حفظ";
let clicks = 0; button.onClick = () => { clicks += 1; };
const before = document.createElement("a"), after = document.createElement("a");
before.id = "before-action"; before.href = "#before"; before.textContent = "قبل";
after.id = "after-action"; after.href = "#after"; after.textContent = "بعد";
wrapper.append(outer, before, button, after);
class SyntaxProbe extends HTMLElement {
  constructor() {
    super(); const shadow = this.attachShadow({mode:"open"});
    const style = document.createElement("style"); style.textContent = syntaxCss;
    const root = document.createElement("div"), child = document.createElement("div");
    root.className = "syntax-probe"; root.id = "syntax-box"; root.append("CSS scope probe");
    child.className = "syntax-probe__child"; child.id = "syntax-child"; child.textContent = "Alias scope";
    root.append(child); shadow.append(style, root);
  }
}
customElements.define("fsds-syntax-probe", SyntaxProbe);
const syntax = new SyntaxProbe(); syntax.id = "syntax-host"; wrapper.append(syntax);
const settle = async () => { await Promise.all([outer.updateComplete, inner.updateComplete, button.updateComplete]); await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); };
await settle();
outer.shadowRoot!.querySelector(".card")!.id = "outer-box";
inner.shadowRoot!.querySelector(".card")!.id = "inner-box";
button.shadowRoot!.querySelector("button")!.id = "action-box";
Object.assign(window, { fsdsLitTokenProof: { outer, inner, button, wrapper, syntax, settle, clicks: () => clicks } });
document.body.dataset.ready = "true";
`);
  const outputs = await build({ configFile: false, root: consumer, logLevel: "warn", resolve: { dedupe: ["lit"] },
    build: { outDir: "dist", emptyOutDir: true, minify: true, sourcemap: true, rollupOptions: { input: { main: join(consumer, "index.html"), bare: join(consumer, "bare.html") } } },
  });
  const modules = new Set<string>();
  for (const output of Array.isArray(outputs) ? outputs : [outputs]) for (const chunk of output.output) {
    if (chunk.type !== "chunk") continue;
    for (const id of Object.keys(chunk.modules)) {
      assert.ok(!id.includes("/packages/ds-lit/src/"), "Workspace component reached packed consumer");
      if (id.includes("/node_modules/@full-stack-ds/")) assert.ok(id.startsWith(join(consumer, "node_modules/@full-stack-ds/")));
      modules.add(id);
    }
  }
  writeFileSync(join(evidence, "inputs.json"), JSON.stringify({ revision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim(), dirty: execFileSync("git", ["status", "--porcelain"], { cwd: repo, encoding: "utf8" }), node: process.version, payloads, peer: { path: realpathSync(peer), version: JSON.parse(readFileSync(join(peer, "package.json"), "utf8")).version }, modules: [...modules].sort() }, null, 2));
  const port = Number(process.env.FSDS_LIT_TOKEN_PORT ?? 5197);
  const server = await preview({ configFile: false, root: consumer, build: { outDir: "dist" }, logLevel: "warn", preview: { host: "127.0.0.1", port, strictPort: true } });
  return { evidence, url: "http://127.0.0.1:" + port, close: () => new Promise<void>((resolve, reject) => server.httpServer.close((error?: Error) => error ? reject(error) : resolve())) };
}
