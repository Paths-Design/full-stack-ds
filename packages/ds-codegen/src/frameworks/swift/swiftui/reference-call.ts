import type { DomNodeIR } from "../../../ir.js";
import { swiftExportName, swiftCaseRef } from "./component-source.js";
import { swiftLiteral } from "./icon-glyph.js";

/** Bounded native glyph-reference vocabulary; unsupported facts must be admitted explicitly. */
export function swiftSurfaceReference(node: DomNodeIR): string {
  if (!node.componentRef || node.children.length || Object.keys(node.bindings).length || node.ifProp) {
    throw new Error("Swift surface references require unconditional literal leaf props");
  }
  const args = Object.entries(node.attrs).map(([name, value]) => {
    if (name === "name") return `name: ${swiftLiteral(value)}`;
    if (name === "size") return `size: .${swiftCaseRef(value)}`;
    throw new Error(`Swift surface reference prop '${name}' has no admitted lowering`);
  });
  const name = node.componentRef.split(".").pop()!;
  return `DsSwiftUI.${swiftExportName(name)}(${args.join(", ")})`;
}
