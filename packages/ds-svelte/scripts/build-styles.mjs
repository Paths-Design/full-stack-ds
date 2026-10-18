#!/usr/bin/env node
/**
 * Build dist/svelte.css — the concatenated consumer stylesheet for
 * @full-stack-ds/svelte, exposed as the package's "./styles.css" export.
 *
 * Why this exists: every generated Svelte component ships its styles as a
 * sibling .css file (BEM part classes, no Svelte style scoping), but the
 * package export map admitted only "." and "./primitives" — a consumer
 * could not load component styles through the package boundary at all.
 * The Vue package ships the equivalent surface as dist/vue.css via its
 * "./styles.css" export. The motion-lab Svelte example lane surfaced this
 * gap; this script promotes the fix at the packaging layer only: no
 * generated-file changes, no codegen changes.
 *
 * Concatenation rules:
 * - Relative `@import` lines are resolved by inlining the imported file at
 *   that position, first-occurrence-wins — matching CSS @import semantics
 *   and preserving each stylesheet's intended cascade/layer order. (A flat
 *   alphabetical concat would declare component layers before the
 *   primitive layers they are designed to override.)
 * - Anything else that looks like an @import throws: a non-relative or
 *   media/layer-qualified import has no inlining semantics here, and a
 *   silently wrong cascade is worse than a loud build failure.
 * - Entry order: every non-token component stylesheet (sorted), then any
 *   primitive stylesheet not already pulled in by an import.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(pkgRoot, "src");
const distDir = join(pkgRoot, "dist");

const PLAIN_RELATIVE_IMPORT = /^\s*@import\s+["'](\.[^"']+)["']\s*;\s*$/;

const seen = new Set();

const inline = (file) => {
  const key = relative(srcRoot, file);
  if (seen.has(key)) return null;
  seen.add(key);
  const lines = readFileSync(file, "utf8").split("\n");
  const out = [`/* ${key} */`];
  for (const line of lines) {
    const match = PLAIN_RELATIVE_IMPORT.exec(line);
    if (!match) {
      if (/^\s*@import/.test(line)) {
        throw new Error(
          `build-styles: unsupported @import form in ${key}: ${line.trim()}` +
            " (only plain relative imports can be inlined)",
        );
      }
      out.push(line);
      continue;
    }
    const target = resolve(dirname(file), match[1]);
    const inlined = inline(target);
    if (inlined) out.push(inlined);
  }
  return out.join("\n").trimEnd();
};

const listCss = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
    .map((entry) => join(dir, entry.name))
    .sort();

const componentDir = join(srcRoot, "components");
const primitiveDir = join(srcRoot, "primitives");
const chunks = [];
for (const component of readdirSync(componentDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!component.isDirectory()) continue;
  for (const file of listCss(join(componentDir, component.name))) {
    if (file.endsWith(".tokens.css")) continue; // pulled in by its component stylesheet's own import
    const body = inline(file);
    if (body) chunks.push(body);
  }
}
for (const file of listCss(primitiveDir)) {
  const body = inline(file);
  if (body) chunks.push(body);
}
if (chunks.length === 0) throw new Error("build-styles: no component styles found under src/ — nothing to concatenate.");

mkdirSync(distDir, { recursive: true });
const banner = [
  "/* @full-stack-ds/svelte styles",
  " * Concatenated from generated component styles by scripts/build-styles.mjs.",
  " * Do not edit dist output — regenerate with `pnpm --filter @full-stack-ds/svelte build`.",
  " */",
].join("\n");
writeFileSync(join(distDir, "svelte.css"), `${banner}\n${chunks.join("\n\n")}\n`);
console.log(`build-styles: wrote dist/svelte.css from ${seen.size} stylesheets`);
