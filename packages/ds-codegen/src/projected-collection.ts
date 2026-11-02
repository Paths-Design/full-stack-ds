import type { ComponentIR, CssBlockIR, CssVarBindingIR, DomNodeIR } from "./ir.js";

export function projectedCollections(ir: ComponentIR): DomNodeIR[] {
  const found: DomNodeIR[] = [];
  const visit = (node: DomNodeIR): void => {
    if (node.projectedCollection) found.push(node);
    node.children.forEach(visit);
  };
  if (ir.dom) visit(ir.dom);
  return found;
}

/** Only the normalized collection's own carrier may accompany a bounded native omission. */
export function isOwnedProjectedCollectionCssBinding(node: DomNodeIR, binding: CssVarBindingIR): boolean {
  const collection = node.projectedCollection;
  if (!collection || binding.varName !== collection.cssVariable || binding.format !== "decorative-content" ||
      binding.value.kind !== "prop" || collection.separator.kind !== "prop" ||
      binding.value.prop !== collection.separator.prop) return false;
  const actual = binding.value.path ?? [];
  const expected = collection.separator.path ?? [];
  return actual.length === expected.length && actual.every((segment, index) => segment === expected[index]);
}

/** Literal decorative text has an empty accessibility alternative; empty text creates no box. */
export function decorativeContentHelperSource(ir: ComponentIR): string {
  if (!projectedCollections(ir).length) return "";
  return String.raw`

function fsdsDecorativeContent(value: unknown): string {
  const text = String(value ?? "");
  return text === "" ? "none" : '"' + Array.from(text, character => "\\" + character.codePointAt(0)!.toString(16) + " ").join("") + '" / ""';
}`;
}

export function cssVariableValue(value: string | null, binding: CssVarBindingIR): string | null {
  return value === null || binding.format !== "decorative-content" ? value : `fsdsDecorativeContent(${value})`;
}

/** Web realization: direct items and Lit-assigned items share decoration and empty alternative text. */
export function projectedCollectionCssBlocks(ir: ComponentIR): CssBlockIR[] {
  return projectedCollections(ir).flatMap(node => {
    const collection = node.projectedCollection!;
    const selector = node === ir.dom ? `.${ir.cssPrefix}` : `.${ir.cssPrefix}__${node.part}`;
    const gap = ir.cssBlocks.find(block => block.selector === selector)?.declarations.gap ?? "0";
    const declarations = {
      content: `var(${collection.cssVariable}, none)`,
      "white-space": "pre-wrap",
      "margin-inline-end": gap,
    };
    return [
      { selector: `${selector} > :not(slot):nth-child(n + 2 of :not([hidden]))::before`, declarations },
      { selector: `${selector} > slot::slotted(:nth-child(n + 2 of :not([hidden])))::before`, declarations },
    ];
  });
}
