import type { ComponentIR, DomNodeIR } from "../../ir.js";
import { collectIconGlyphNodes } from "../icon-glyph.js";

export interface UnityGlyphPlan {
  node: DomNodeIR;
  nameProp: string;
  sizeProp: string | undefined;
  sizeHints: Record<string, number>;
}

/** A passive glyph host is selected by normalized anatomy, never identity. */
export function unityGlyphPlan(ir: ComponentIR, lowering?: { behavior: string }): UnityGlyphPlan | undefined {
  if (lowering !== undefined && lowering.behavior !== "Passive") return undefined;
  const entries = collectIconGlyphNodes(ir.dom);
  if (!entries.length) return undefined;
  const fail = (reason: string): never => { throw new Error(`UNITY_UNSUPPORTED_GLYPH: ${ir.name}: ${reason}`); };
  const root = ir.dom;
  if (!root || entries.length !== 1 || root.children.length !== 1 || root.children[0] !== entries[0]!.node || ir.compoundParts.length)
    return fail("expected one direct glyph child on a passive host");
  const node = entries[0]!.node;
  if (node.part || node.children.length || node.componentRef || node.content || node.iteration || node.ifProp || node.ifSlot ||
      Object.keys(node.bindings).length || Object.keys(node.propertyBindings).length || Object.keys(node.events).length || node.cssVarBindings.length)
    return fail("glyph node carries unlowered anatomy");
  if (Object.keys(node.attrs).sort().join() !== "fill,xmlns" || node.attrs.fill !== "none" || node.attrs.xmlns !== "http://www.w3.org/2000/svg")
    return fail("SVG attributes exceed the supported glyph vocabulary");
  if (Object.keys(root.bindings).some(key => key !== "role" && !key.startsWith("aria-")))
    return fail("host carries an unlowered binding");
  const glyph = entries[0]!.glyph;
  const name = ir.styledProps.find(prop => prop.name === glyph.namePropName);
  const size = glyph.sizePropName ? ir.styledProps.find(prop => prop.name === glyph.sizePropName) : undefined;
  const hints = glyph.sizeHints;
  if (!name || name.propType.kind !== "string" || !hints)
    return fail("name or size binding is not backed by a typed prop and size hints");
  if (glyph.sizePropName) {
    if (!size || size.propType.kind !== "enum" || size.propType.values.some(value => !Object.prototype.hasOwnProperty.call(hints, value)))
      return fail("name or size binding is not backed by a typed prop and size hints");
    if (Object.keys(hints).length !== size.propType.values.length)
      return fail("size hints and enum values disagree");
  }
  if (ir.interaction || ir.formControl || ir.surface || ir.behavior.normalizedChannels.length)
    return fail("interactive glyph host");
  return { node, nameProp: name.name, sizeProp: size?.name, sizeHints: hints };
}
