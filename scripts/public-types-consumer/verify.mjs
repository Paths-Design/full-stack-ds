#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { nativeCases, webCases } from "./fixtures.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const evidence = realpathSync(mkdtempSync(join(tmpdir(), "fsds-public-types-")));
const artifacts = join(evidence, "tarballs");
const consumer = join(evidence, "consumer");
mkdirSync(artifacts);
mkdirSync(consumer);
console.log("Public type consumer evidence: " + evidence);
function run(label, command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", maxBuffer: 30 * 1024 * 1024 });
  writeFileSync(join(evidence, label + ".log"), "command: " + command + " " + args.join(" ") + "\ncwd: " + cwd + "\nexit: " + result.status + "\nstdout:\n" + (result.stdout ?? "") + "\nstderr:\n" + (result.stderr ?? ""));
  if (result.error) throw result.error;
  assert.equal(result.status, 0, label + " failed; inspect " + evidence + "/" + label + ".log");
  console.log(label + ": exit 0");
}
const names = ["react", "vue", "svelte", "angular", "lit", "react-native"];
for (const name of names.filter((value) => value !== "react-native")) run("build-" + name, "pnpm", ["--filter", "@full-stack-ds/" + name, "run", "build"], repo);
const tarballs = [];
for (const name of [...names, "iconography"]) {
  const directory = join(repo, "packages", "ds-" + name);
  run("pack-" + name, "pnpm", ["pack", "--pack-destination", artifacts], directory);
  const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
  const tarball = join(artifacts, manifest.name.replace(/^@/, "").replaceAll("/", "-") + "-" + manifest.version + ".tgz");
  assert.ok(existsSync(tarball), "Missing " + tarball);
  tarballs.push(tarball);
}
writeFileSync(join(consumer, "package.json"), JSON.stringify({ name: "public-types-consumer", private: true, version: "1.0.0", type: "module" }));
run("install", "npm", ["install", "--ignore-scripts", "--legacy-peer-deps", "--offline", "--package-lock=false", "--no-audit", "--no-fund", "--cache", join(evidence, "npm-cache"), ...tarballs], consumer);
for (const name of [...names, "iconography"]) {
  const installed = join(consumer, "node_modules/@full-stack-ds", name);
  assert.equal(realpathSync(installed), installed, name + " must be installed from tarball, not linked");
}
const resolvers = Object.fromEntries(names.map((name) => [name, createRequire(join(repo, "packages", "ds-" + name, "package.json"))]));
const rootRequire = createRequire(join(repo, "package.json"));
const peers = [
  ["react", resolvers.react], ["@types/react", resolvers.react], ["@types/react-dom", rootRequire],
  ["vue", resolvers.vue], ["svelte", resolvers.svelte], ["lit", resolvers.lit],
  ["@angular/core", resolvers.angular], ["@angular/common", resolvers.angular], ["rxjs", resolvers.angular],
  ["react-native", resolvers["react-native"]], ["react-native-svg", resolvers["react-native"]],
];
for (const [name, resolver] of peers) {
  const destination = join(consumer, "node_modules", name);
  mkdirSync(dirname(destination), { recursive: true });
  const source = resolver.resolve.paths(name)?.map(directory => join(directory, name))
    .find(directory => existsSync(join(directory, "package.json")) && JSON.parse(readFileSync(join(directory, "package.json"), "utf8")).name === name);
  assert.ok(source, "Missing pinned peer " + name);
  symlinkSync(realpathSync(source), destination, "dir");
}
const modes = [
  { id: "bundler", extension: "ts", module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler },
  { id: "nodenext-esm", extension: "mts", module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext },
  { id: "nodenext-cjs", extension: "cts", module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext },
];
let checks = 0;
function checkCase(group, mode, fixture) {
  const label = [group, mode.id, fixture.name].join("-");
  const file = join(consumer, label + "." + mode.extension);
  writeFileSync(file, fixture.source);
  const options = { noEmit: true, strict: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, types: [], module: mode.module, moduleResolution: mode.moduleResolution };
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([file], options));
  const messages = diagnostics.map((diagnostic) => ({ code: diagnostic.code, file: diagnostic.file?.fileName, start: diagnostic.start, message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n") }));
  writeFileSync(join(evidence, label + ".json"), JSON.stringify(messages, null, 2));
  if (fixture.error) {
    const allowed = Array.isArray(fixture.error) ? fixture.error : [fixture.error];
    assert.equal(diagnostics.length, fixture.count ?? 1, label + ": unexpected diagnostic count " + JSON.stringify(messages));
    assert.ok(diagnostics.every((diagnostic) => allowed.includes(diagnostic.code)), label + ": wrong diagnostic: " + JSON.stringify(messages));
    assert.ok(messages.some((diagnostic) => diagnostic.message.includes(fixture.fragment)), label + ": missing intended diagnostic coordinate");
  } else {
    assert.deepEqual(messages, [], label + ": valid public imports must compile");
  }
  checks += 1;
  console.log(label + ": " + (fixture.error ? "rejected TS" + fixture.error : "accepted"));
}
for (const mode of modes) for (const fixture of webCases) checkCase("web", mode, fixture);
for (const fixture of nativeCases) checkCase("native", modes[0], fixture);
console.log("Public type consumer verified: " + checks + " compiler cases; evidence " + evidence);
