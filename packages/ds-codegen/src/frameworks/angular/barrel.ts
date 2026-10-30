/**
 * Barrel file generator for the `@full-stack-ds/angular` package.
 *
 * Angular standalone components are exported by class name with a
 * `Component` suffix (e.g. `ButtonComponent`), matching Angular conventions.
 * Compound parts (e.g. `ModalHeaderComponent`, `ModalBodyComponent`) are
 * co-emitted into the parent's `.component.ts` file; the barrel scans
 * that file for any additional `export class XxxComponent` declarations
 * and re-exports them as named exports.
 */
import fs from "node:fs";
import path from "node:path";

const COMPOUND_EXPORT_RE = /^export class (\w+Component)/gm;

export function generateAngularBarrel(
  componentNames: string[],
  componentsRoot?: string,
): string {
  const lines: string[] = [];
  for (const n of [...componentNames].sort()) {
    const exports: string[] = [`${n}Component`];

    if (componentsRoot) {
      const filePath = path.join(componentsRoot, n, `${n}.component.ts`);
      if (fs.existsSync(filePath)) {
        const contents = fs.readFileSync(filePath, "utf8");
        const found = new Set<string>();
        for (const m of contents.matchAll(COMPOUND_EXPORT_RE)) {
          found.add(m[1]);
        }
        for (const cls of [...found].sort()) {
          if (cls !== `${n}Component`) exports.push(cls);
        }
      }
    }

    lines.push(
      `export { ${exports.join(", ")} } from "./${n}/${n}.component.js";`,
    );
    lines.push(`export type * from "./${n}/${n}.component.js";`);
  }
  return lines.join("\n") + "\n";
}
