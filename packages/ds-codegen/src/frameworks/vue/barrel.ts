/**
 * Barrel file generator for the `@full-stack-ds/vue` package.
 *
 * Vue SFCs are imported with explicit `.vue` suffixes (Vite convention).
 * Compound parts (e.g. `ModalHeader.vue`, `ModalBody.vue`) live alongside
 * their parent SFC; this generator scans each component directory for any
 * additional `.vue` files and emits explicit named exports for them so
 * `import { Modal, ModalHeader } from "@full-stack-ds/vue"` resolves.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

type ComponentExport = { name: string; file: string; stylesheet?: string };

function exportedTypes(source: string): string[] {
  const names: string[] = [];
  for (const script of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const parsed = ts.createSourceFile("component.ts", script[2], ts.ScriptTarget.Latest, true);
    for (const statement of parsed.statements) {
      if ((ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement))
        && statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        names.push(statement.name.text);
      }
    }
  }
  return names;
}

export function generateVueBarrel(componentNames: string[], componentsRoot?: string): string {
  const entries: ComponentExport[] = [];
  for (const name of [...componentNames].sort()) {
    entries.push({ name, file: `./${name}/${name}.vue`, stylesheet: `./${name}/${name}.css` });
    if (!componentsRoot) continue;
    const directory = path.join(componentsRoot, name);
    if (!fs.existsSync(directory)) continue;
    for (const file of fs.readdirSync(directory).filter(file => file.endsWith(".vue") && file !== `${name}.vue`).sort()) {
      entries.push({ name: file.replace(/\.vue$/, ""), file: `./${name}/${file}` });
    }
  }
  const typeSources = new Map<string, string>();
  if (componentsRoot) {
    for (const entry of entries) {
      const file = path.resolve(componentsRoot, entry.file);
      if (!fs.existsSync(file)) continue;
      for (const name of exportedTypes(fs.readFileSync(file, "utf8"))) {
        const previous = typeSources.get(name);
        if (previous && previous !== entry.file) throw new Error(`Ambiguous public type ${name}: ${previous}, ${entry.file}`);
        typeSources.set(name, entry.file);
      }
    }
  }
  const lines: string[] = [];
  for (const { name, file, stylesheet } of entries) {
    if (stylesheet) lines.push(`import "${stylesheet}";`);
    const typeSource = typeSources.get(name);
    if (typeSource) {
      lines.push(`import __Fsds${name} from "${file}";`, `export const ${name}: typeof import("${file}").default = __Fsds${name};`, `export type ${name} = import("${typeSource}").${name};`);
    } else lines.push(`export { default as ${name} } from "${file}";`);
    lines.push(`export type * from "${file}";`, `export type ${name}Props = InstanceType<typeof import("${file}").default>["$props"];`);
  }
  return lines.join("\n") + "\n";
}
