import { nativeTableAttrsFor, TABLE_COMPOSITION_TAGS, type ComponentIR, type DomNodeIR } from "../../ir.js";

// HTML table insertion modes exclude slot elements. Cells and captions accept
// flow content, so their ordinary slots must remain slots.
const RESTRICTED_INSERTION_TAGS = new Set(["table", "thead", "tbody", "tfoot", "tr"]);

export function requiresNativeTemplateContent(parentTag: string | undefined): boolean {
  return parentTag !== undefined && RESTRICTED_INSERTION_TAGS.has(parentTag);
}

export function hasNativeTemplateContent(node: DomNodeIR | undefined): boolean {
  return node !== undefined && node.children.some(child =>
    ((child.tag === "children" || child.tag === "slot") && requiresNativeTemplateContent(node.tag)) || hasNativeTemplateContent(child),
  );
}

export function nativeTemplateHelperNames(ir: ComponentIR): string[] {
  const prefix = ir.name[0].toLowerCase() + ir.name.slice(1);
  return ir.compoundParts
    .filter(part => part.nativeTag && TABLE_COMPOSITION_TAGS.has(part.nativeTag))
    .map(part => prefix + part.name[0].toUpperCase() + part.name.slice(1));
}

/** Native tags and forwarded attributes come from the existing part IR. */
export function generateNativeTemplateHelpers(ir: ComponentIR): string {
  const parts = ir.compoundParts.filter(part => part.nativeTag && TABLE_COMPOSITION_TAGS.has(part.nativeTag));
  if (parts.length === 0) return "";
  const helperNames = nativeTemplateHelperNames(ir);
  const baseType = `${ir.name}PartAttributes`;
  const lines = [
    `export interface ${baseType} {`,
    `  class?: string;`,
    `  "data-testid"?: string;`,
    `  id?: string;`,
    `  style?: string;`,
    `}`, ``,
  ];
  parts.forEach((part, index) => {
    const attrs = nativeTableAttrsFor(part.nativeTag);
    const specificAttrs = attrs.filter(attr => attr !== "id" && attr !== "style");
    const typeName = `${ir.name}${part.name[0].toUpperCase() + part.name.slice(1)}Attributes`;
    if (specificAttrs.length === 0) {
      lines.push(`export type ${typeName} = ${baseType};`, ``);
    } else {
      lines.push(`export interface ${typeName} extends ${baseType} {`);
      for (const attr of specificAttrs) {
        lines.push(`  ${attr}?: ${attr === "scope" ? '"col" | "row" | "colgroup" | "rowgroup"' : "number"};`);
      }
      lines.push(`}`, ``);
    }
    lines.push(`export function ${helperNames[index]}(content: unknown, attrs: ${typeName} = {}): TemplateResult {`);
    const bindings = [
      `class=\${[${JSON.stringify(`${ir.classRecipe.base}__${part.name}`)}, attrs.class].filter(Boolean).join(" ")}`,
      `data-testid=\${ifDefined(attrs["data-testid"])}`,
      ...attrs.map(attr => `${attr.toLowerCase()}=\${ifDefined(attrs.${attr})}`),
    ];
    lines.push(`  return html\`<${part.nativeTag} ${bindings.join(" ")}>\${content}</${part.nativeTag}>\`;`, `}`, ``);
  });
  return lines.join("\n");
}
