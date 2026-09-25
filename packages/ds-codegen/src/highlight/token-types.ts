import type { ComponentIR, HighlightTransformIR } from "../ir.js";

/** Resolve supplied-token contract types without assuming a component name. */
export function highlightTokenTypes(ir: ComponentIR, transform: HighlightTransformIR): { tokenName: string; kindName: string } {
  const prop = ir.styledProps.find((candidate) => candidate.name === transform.tokensProp);
  if (prop?.propType.kind !== "array" || prop.propType.items.kind !== "ref") {
    throw new Error(`${ir.name}: highlight tokens require an array of a defined token type`);
  }
  const tokenName = prop.propType.items.to;
  const alias = ir.definedTypes[tokenName];
  const kindName = alias?.kind === "alias" ? alias.alias?.match(/\bkind:\s*([A-Za-z_][A-Za-z0-9_]*)/)?.[1] : undefined;
  if (!kindName || ir.definedTypes[kindName]?.kind !== "union") {
    throw new Error(`${ir.name}: highlight token kind requires a defined union`);
  }
  return { tokenName, kindName };
}
