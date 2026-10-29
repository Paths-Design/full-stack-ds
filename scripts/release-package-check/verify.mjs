#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { assertReleasePayload } from "./payload.mjs";
import { verifyBrowsers } from "./browser.mjs";
import { runtimeFixture } from "./runtime.mjs";
import { verifyNativeBundles } from "./native.mjs";
import { nativeCases, webCases } from "../public-types-consumer/fixtures.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const evidence = realpathSync(mkdtempSync(join(tmpdir(), "fsds-release-packages-")));
const artifacts = join(evidence, "tarballs");
const consumer = join(evidence, "consumer");
mkdirSync(artifacts);
mkdirSync(consumer);
console.log("Release package evidence: " + evidence);
function run(label, command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  writeFileSync(join(evidence, label + ".log"), `command: ${command} ${args.join(" ")}\ncwd: ${cwd}\nexit: ${result.status}\nstdout:\n${result.stdout ?? ""}\nstderr:\n${result.stderr ?? ""}`);
  if (result.error) throw result.error;
  assert.equal(result.status, 0, label + " failed; inspect " + evidence);
  return result.stdout;
}

// Pack runs each package's prepack build before checking its emitted payload.
const names = ["iconography", "tokens", "react", "vue", "svelte", "angular", "lit", "react-native"];
const sources = Object.fromEntries(names.map(name => [name, JSON.parse(readFileSync(join(repo, `packages/ds-${name}/package.json`), "utf8"))]));
const licenseText = readFileSync(join(repo, "LICENSE"), "utf8");
const noticeText = readFileSync(join(repo, "THIRD_PARTY_NOTICES"), "utf8");
const ledger = JSON.parse(readFileSync(join(repo, "packages/ds-iconography/emission-ledger.json"), "utf8"));
const iconOutputs = new Map(ledger.rows.flatMap(row => row.attachments.map(item => [item.relPath.replace("packages/ds-iconography/", ""), item.ref])));
const iconInputs = [...new Set(ledger.rows.flatMap(row => row.observation_members.filter(item => item.role === "contract").map(item => item.relPath.replace("packages/ds-iconography/", ""))))];
const tarballs = [];
const payloads = [];
for (const name of names) {
  const source = sources[name];
  const directory = join(repo, `packages/ds-${name}`);
  run("pack-" + name, "pnpm", ["pack", "--pack-destination", artifacts], directory);
  const tarball = join(artifacts, source.name.replace(/^@/, "").replaceAll("/", "-") + "-" + source.version + ".tgz");
  assert.ok(existsSync(tarball), "Missing " + tarball);
  tarballs.push(tarball);
  const listing = run("list-" + name, "tar", ["-tzf", tarball], consumer).trimEnd().split("\n");
  const details = run("entries-" + name, "tar", ["-tvzf", tarball], consumer).trimEnd().split("\n");
  assert.equal(details.length, listing.length, "Archive listing must preserve every entry");
  assert.equal(new Set(listing).size, listing.length, "Duplicate archive entries are forbidden");
  listing.forEach((entry, i) => {
    assert.match(entry, /^package\/[A-Za-z0-9_./@-]+$/, "Unexpected archive path");
    assert.ok(!entry.split("/").some(part => part === "." || part === ".."), "Archive traversal forbidden");
    assert.ok(details[i].startsWith("-") || details[i].startsWith("d"), "Archive links and special files are forbidden");
  });
  const unpacked = join(evidence, "unpacked-" + name);
  mkdirSync(unpacked);
  run("extract-" + name, "tar", ["-xzf", tarball, "-C", unpacked], consumer);
  const files = new Map(listing.filter((_, i) => details[i].startsWith("-")).map(entry => [entry.slice(8), readFileSync(join(unpacked, entry))]));
  const manifest = JSON.parse(files.get("package.json").toString("utf8"));
  const expected = {
    name: source.name, version: source.version, directory: `packages/ds-${name}`, licenseText,
    ...(name === "tokens" ? {} : { noticeText }),
    dependencies: name === "tokens" || name === "iconography" ? {} : { "@full-stack-ds/iconography": sources.iconography.version },
    requiredExports: Object.keys(source.exports),
    requiredFiles: name === "iconography" ? [...iconOutputs.keys(), ...iconInputs] : [],
    wildcardWitnesses: name === "iconography" ? {
      "./icons/*": iconInputs.map(path => path.slice(6)),
      "./generated/*": [...iconOutputs.keys()].filter(path => path.startsWith("generated/")).map(path => path.slice(10)),
    } : {},
  };
  const checked = assertReleasePayload({ manifest, files, expected });
  if (name === "iconography") for (const [path, hash] of iconOutputs) assert.equal("sha256:" + createHash("sha256").update(files.get(path)).digest("hex"), hash, "Packed icon output differs from committed ledger: " + path);
  payloads.push({ ...checked, sha256: createHash("sha256").update(readFileSync(tarball)).digest("hex"), files: [...files.keys()].sort() });
  console.log(name + ": packed exports, notices, and file inventory verified");
}
writeFileSync(join(evidence, "payloads.json"), JSON.stringify(payloads, null, 2));
writeFileSync(join(consumer, "package.json"), JSON.stringify({ name: "release-packages-consumer", private: true, version: "1.0.0", type: "module" }));
run("install", "npm", ["install", "--ignore-scripts", "--legacy-peer-deps", "--offline", "--package-lock=false", "--no-audit", "--no-fund", "--cache", join(evidence, "npm-cache"), ...tarballs], consumer);
for (const name of names) {
  const installed = join(consumer, "node_modules/@full-stack-ds", name);
  assert.equal(realpathSync(installed), installed, name + " must be installed from tarball");
}
const peers = [
  ["react", "react"], ["react-dom", "react"], ["@types/react", "react"], ["@types/react-dom", "react"],
  ["vue", "vue"], ["svelte", "svelte"], ["lit", "lit"],
  ["@angular/core", "angular"], ["@angular/common", "angular"], ["rxjs", "angular"],
  ["react-native", "react-native"], ["react-native-svg", "react-native"],
];
for (const [name, framework] of peers) {
  const resolver = createRequire(join(repo, `packages/ds-${framework}/package.json`));
  const source = resolver.resolve.paths(name)?.map(directory => join(directory, name)).find(directory => existsSync(join(directory, "package.json")) && JSON.parse(readFileSync(join(directory, "package.json"), "utf8")).name === name);
  assert.ok(source, "Missing pinned peer " + name);
  const destination = join(consumer, "node_modules", name);
  mkdirSync(dirname(destination), { recursive: true });
  symlinkSync(realpathSync(source), destination, "dir");
}

const css = ["tokens/tokens.css", "react/styles.css", "react/primitives/styles.css", "vue/styles.css", "svelte/styles.css", "angular/styles.css"];
const valid = css.map(path => `import "@full-stack-ds/${path}";`).join("\n") + '\nimport tokens from "@full-stack-ds/tokens/generated/resolved.tokens.json" with { type: "json" };\nconst value: string = tokens.core.color.datavis.viridis["1"].$value;\nvoid value;\n';
for (const mode of ["Bundler", "NodeNext"]) for (const invalid of [false, true]) {
  const label = "styles-json-" + mode + (invalid ? "-invalid" : "-valid");
  const file = join(consumer, label + ".mts");
  writeFileSync(file, valid + (invalid ? 'import "@full-stack-ds/react/not-a-real-stylesheet.css";\n' : ""));
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([file], { noEmit: true, strict: true, skipLibCheck: false, noUncheckedSideEffectImports: true, resolveJsonModule: true, types: [], target: ts.ScriptTarget.ES2022, module: mode === "Bundler" ? ts.ModuleKind.ESNext : ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind[mode] }));
  const messages = diagnostics.map(diagnostic => ({ code: diagnostic.code, message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n") }));
  writeFileSync(join(evidence, label + ".json"), JSON.stringify(messages, null, 2));
  if (invalid) {
    assert.equal(messages.length, 1, label);
    assert.equal(messages[0].code, 2882, label);
    assert.match(messages[0].message, /not-a-real-stylesheet/);
  } else assert.deepEqual(messages, [], label);
  console.log(label + ": " + (invalid ? "rejected intended TS2882" : "accepted"));
}
// Reuse the public API contract against these exact eight installed tarballs.
const modes = [
  { id: "bundler", extension: "ts", module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler },
  { id: "nodenext-esm", extension: "mts", module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext },
  { id: "nodenext-cjs", extension: "cts", module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext },
];
function checkPublicTypes(group, mode, fixture) {
  const label = [group, mode.id, fixture.name].join("-");
  const file = join(consumer, label + "." + mode.extension);
  writeFileSync(file, fixture.source);
  // Native declarations use the native ES library, without browser DOM globals.
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([file], { noEmit: true, strict: true, skipLibCheck: false, ...(group === "native" ? { lib: ["lib.es2022.d.ts"] } : {}), target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, types: [], module: mode.module, moduleResolution: mode.moduleResolution }));
  const messages = diagnostics.map(diagnostic => ({ code: diagnostic.code, file: diagnostic.file?.fileName, start: diagnostic.start, message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n") }));
  writeFileSync(join(evidence, label + ".json"), JSON.stringify(messages, null, 2));
  if (fixture.error) {
    const allowed = Array.isArray(fixture.error) ? fixture.error : [fixture.error];
    assert.equal(messages.length, fixture.count ?? 1, label + ": diagnostic count");
    assert.ok(messages.every(message => allowed.includes(message.code)), label + ": wrong diagnostic " + JSON.stringify(messages));
    assert.ok(messages.some(message => message.message.includes(fixture.fragment)), label + ": missing intended coordinate");
  } else assert.deepEqual(messages, [], label);
  console.log(label + ": " + (fixture.error ? "rejected intended public type error" : "accepted"));
}
for (const mode of modes) for (const fixture of webCases) checkPublicTypes("web", mode, fixture);
for (const fixture of nativeCases) checkPublicTypes("native", modes[0], fixture);

// Framework-specific compilation follows the Node entry checks.
for (const format of ["esm", "cjs"]) {
  const file = "runtime-" + format + ".mjs";
  writeFileSync(join(consumer, file), runtimeFixture(format));
  run("runtime-" + format, process.execPath, [file], consumer);
}
await verifyBrowsers({ repo, consumer, evidence });
await verifyNativeBundles({ repo, consumer, evidence });
console.log("Release payload verified against pinned local peers; no registry publication or native-device qualification: " + evidence);
