#!/usr/bin/env node
// Preserve import order so primitive layer declarations precede component rules.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "src");
const seen = new Set();
function inline(file) {
  if (seen.has(file)) return "";
  const name = relative(source, file);
  if (name.startsWith("..")) throw new Error(`Stylesheet escapes source: ${name}`);
  seen.add(file);
  return `/* ${name} */\n` + readFileSync(file, "utf8").split("\n").map((line) => {
    const match = /^\s*@import\s+["'](\.[^"']+)["']\s*;\s*$/.exec(line);
    if (match) return inline(resolve(dirname(file), match[1]));
    if (/^\s*@import/.test(line)) throw new Error(`Unsupported CSS import in ${name}: ${line}`);
    return line;
  }).join("\n");
}
const cssFiles = (directory) => readdirSync(directory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
  .map((entry) => join(directory, entry.name)).sort();
const chunks = [];
for (const entry of readdirSync(join(source, "components"), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isDirectory()) continue;
  for (const file of cssFiles(join(source, "components", entry.name))) {
    if (!file.endsWith(".tokens.css")) chunks.push(inline(file));
  }
}
for (const file of cssFiles(join(source, "primitives"))) chunks.push(inline(file));
if (!seen.size) throw new Error("No Angular stylesheets found");
mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "angular.css"), `/* Generated Angular consumer styles. */\n${chunks.join("\n")}\n`);
writeFileSync(join(root, "dist", "angular.css.d.ts"), "// Side-effect stylesheet import.\nexport {};\n");
console.log(`Angular styles: ${seen.size} source stylesheets -> dist/angular.css`);
