#!/usr/bin/env node
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const DECLARATION = /\.d\.(ts|mts|cts)$/;
const within = (directory, file) => {
  const distance = relative(directory, file);
  return distance === "" || (!isAbsolute(distance) && distance !== ".." && !distance.startsWith(`..${sep}`));
};

export function normalizePackageDeclarations(packageDirectory) {
  const root = realpathSync(resolve(packageDirectory));
  const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const entries = new Set();
  function addEntry(value) {
    const file = realpathSync(resolve(root, value));
    if (!within(root, file) || !DECLARATION.test(file)) throw new Error(`Invalid declaration entry: ${value}`);
    entries.add(file);
  }
  function visitExports(node) {
    if (!node || typeof node !== "object") return;
    for (const [condition, value] of Object.entries(node)) {
      if (condition === "types" && typeof value === "string") addEntry(value);
      else visitExports(value);
    }
  }
  visitExports(manifest.exports);
  if (typeof manifest.types === "string") addEntry(manifest.types);
  if (!entries.size) throw new Error(`No declaration exports in ${manifest.name}`);
  const outputDirectories = [...entries].map(dirname);
  const visited = new Set();
  const changes = new Map();
  const queue = [...entries];
  const options = { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler };
  while (queue.length) {
    const file = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);
    const source = readFileSync(file, "utf8");
    const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const edits = [];
    function rewrite(literal) {
      const specifier = literal.text;
      if (!specifier.startsWith(".")) return;
      const found = ts.resolveModuleName(specifier, file, options, ts.sys).resolvedModule;
      if (!found) throw new Error(`Unresolved declaration ${specifier} from ${relative(root, file)}`);
      const destination = realpathSync(found.resolvedFileName);
      if (!DECLARATION.test(destination) || !outputDirectories.some((directory) => within(directory, destination))) {
        throw new Error(`Declaration ${specifier} escapes emitted output from ${relative(root, file)}`);
      }
      queue.push(destination);
      const suffix = { ts: ".js", mts: ".mjs", cts: ".cjs" }[DECLARATION.exec(destination)[1]];
      const runtimeName = destination.replace(DECLARATION, suffix);
      let normalized = relative(dirname(file), runtimeName).split(sep).join("/");
      if (!normalized.startsWith(".")) normalized = `./${normalized}`;
      if (normalized !== specifier) edits.push({ start: literal.getStart(parsed), end: literal.getEnd(), text: JSON.stringify(normalized) });
    }
    function visit(node) {
      if (ts.isImportDeclaration(node) && !node.importClause && ts.isStringLiteral(node.moduleSpecifier) && extname(node.moduleSpecifier.text) === ".css") {
        edits.push({ start: node.getStart(parsed), end: node.getEnd(), text: "" });
        return;
      }
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) rewrite(node.moduleSpecifier);
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) rewrite(node.argument.literal);
      if (ts.isExternalModuleReference(node) && ts.isStringLiteral(node.expression)) rewrite(node.expression);
      if (ts.isModuleDeclaration(node) && ts.isStringLiteral(node.name)) rewrite(node.name);
      ts.forEachChild(node, visit);
    }
    visit(parsed);
    let normalized = source;
    for (const edit of edits.sort((a, b) => b.start - a.start)) normalized = normalized.slice(0, edit.start) + edit.text + normalized.slice(edit.end);
    if (normalized !== source) changes.set(file, normalized);
  }
  for (const [file, contents] of changes) writeFileSync(file, contents);
  return { package: manifest.name, declarations: visited.size, changed: changes.size };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(normalizePackageDeclarations(process.argv[2] ?? process.cwd())));
}

