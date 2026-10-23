/**
 * Barrel file generator for the `@full-stack-ds/lit` package.
 *
 * Lit custom elements are imported from `.js` paths (ESM convention).
 * Each export re-exports the `${Name}Element` class. Compound parts
 * (e.g. `ModalHeaderElement`, `ModalBodyElement`) are co-emitted into
 * the parent's root `.ts` file; the barrel scans that file for any
 * additional `export class XxxElement` declarations and re-exports
 * them as named exports.
 */
import fs from "node:fs";
import path from "node:path";

const COMPOUND_EXPORT_RE = /^export class (\w+Element)/gm;

export function generateLitBarrel(
  componentNames: string[],
  componentsRoot?: string,
): string {
  const lines: string[] = [];
  for (const n of [...componentNames].sort()) {
    const exports: string[] = [`${n}Element`];

    if (componentsRoot) {
      const filePath = path.join(componentsRoot, n, `${n}.ts`);
      if (fs.existsSync(filePath)) {
        const contents = fs.readFileSync(filePath, "utf8");
        const found = new Set<string>();
        for (const m of contents.matchAll(COMPOUND_EXPORT_RE)) {
          found.add(m[1]);
        }
        for (const cls of [...found].sort()) {
          if (cls !== `${n}Element`) exports.push(cls);
        }
      }
    }

    lines.push(`export { ${exports.join(", ")} } from "./${n}/${n}.js";`);
    lines.push(`export type * from "./${n}/${n}.js";`);
  }
  return lines.join("\n") + "\n";
}
