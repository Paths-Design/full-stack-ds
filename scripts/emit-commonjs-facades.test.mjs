import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { emitCommonjsFacades } from "./emit-commonjs-facades.mjs";

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "fsds-module-facades-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, "dist/primitives"), { recursive: true });
  const manifest = { type: "module", exports: {
    ".": { import: "./dist/index.js", require: "./dist/index.cjs" },
    "./primitives": { import: "./dist/primitives/index.js", require: "./dist/primitives/index.cjs" },
    "./styles.css": { types: "./types/styles.d.ts", default: "./dist/index.css" },
  } };
  writeFileSync(join(directory, "dist/index.js"), "export const state = { count: 0 };\n");
  writeFileSync(join(directory, "dist/primitives/index.js"), 'export { state } from "../index.js";\n');
  writeFileSync(join(directory, "dist/index.cjs"), "stale runtime");
  const save = () => writeFileSync(join(directory, "package.json"), JSON.stringify(manifest));
  save();
  return { directory, manifest, save };
}

for (const first of ["esm", "cjs"]) test(`preserves state and named-export identity with ${first} loaded first`, async t => {
  const { directory } = fixture(t);
  const paths = emitCommonjsFacades(directory);
  assert.deepEqual(paths, [join(directory, "dist/index.cjs"), join(directory, "dist/primitives/index.cjs")]);
  assert.equal(readFileSync(paths[1], "utf8"), '"use strict";\n// Node >=22.19: share the canonical ESM implementation.\nmodule.exports = require("./index.js");\n');
  const require = createRequire(join(directory, "package.json"));
  const load = async (format, primitive) => format === "esm"
    ? import(pathToFileURL(join(directory, primitive ? "dist/primitives/index.js" : "dist/index.js")).href)
    : require(primitive ? "./dist/primitives/index.cjs" : "./dist/index.cjs");
  const initial = await load(first, false);
  initial.state.count = 17;
  for (const format of ["esm", "cjs"]) for (const primitive of [false, true]) {
    const loaded = await load(format, primitive);
    assert.equal(loaded.state, initial.state);
    assert.equal(loaded.state.count, 17);
  }
});

for (const [name, mutate, message] of [
  ["non-module package", m => { m.type = "commonjs"; }, /module package/],
  ["missing paired target", m => { delete m.exports["./primitives"].require; }, /concrete package-relative require/],
  ["escaping target", m => { m.exports["./primitives"].require = "./dist/../escape.cjs"; }, /concrete package-relative require/],
  ["wildcard target", m => { m.exports["./primitives"].require = "./dist/*.cjs"; }, /concrete package-relative require/],
  ["missing ESM output", m => { m.exports["./primitives"].import = "./dist/missing.js"; }, /ESM implementation is missing/],
  ["duplicate output", m => { m.exports["./primitives"].require = m.exports["."].require; }, /duplicate CommonJS destination/],
  ["no paired entries", m => { delete m.exports["."]; delete m.exports["./primitives"]; }, /No paired/],
]) test(`rejects ${name} before changing an existing facade`, t => {
  const { directory, manifest, save } = fixture(t);
  mutate(manifest); save();
  assert.throws(() => emitCommonjsFacades(directory), message);
  assert.equal(readFileSync(join(directory, "dist/index.cjs"), "utf8"), "stale runtime");
});
