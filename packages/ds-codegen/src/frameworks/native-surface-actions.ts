import type { ComponentIR, DomNodeIR, NormalizedChannelIR, ResolvedPropIR } from "../ir.js";
import { nodeTextSource, type NativeMessageRef } from "./native-messages.js";

export interface NativeCloseAction {
  node: DomNodeIR;
  label: NativeMessageRef;
  guard?: ResolvedPropIR;
  disabled: ResolvedPropIR[];
  references: DomNodeIR[];
  dimensions: Partial<Record<"width" | "height", { pixels: number; token?: string; designSlot?: string }>>;
}

/** Explicit referenced close chrome on a surface, selected by normalized activation. */
export function nativeCloseActions(ir: ComponentIR, channel: NormalizedChannelIR, platform: "ios" | "android"): NativeCloseAction[] {
  const actions: NativeCloseAction[] = [];
  const booleanProp = (name: string): ResolvedPropIR => {
    const prop = ir.styledProps.find(prop => prop.name === name && prop.type === "boolean");
    if (!prop) throw new Error(`Native close action requires declared boolean prop '${name}'`);
    return prop;
  };
  const visit = (node: DomNodeIR): void => {
    if (node.activation?.operation === "close" && node.activation.channel.name === channel.name && node.children.some(child => child.componentRef)) {
      const label = nodeTextSource(ir, node, "aria-label");
      if (node.tag !== "button" || label?.kind !== "message" || node.children.length !== 1 || node.children.some(child => !child.componentRef)) {
        throw new Error("Native referenced close actions require a button, catalog label and one referenced child");
      }
      const disabledNames = new Set<string>();
      if (node.activation.disabledProp) disabledNames.add(node.activation.disabledProp);
      const disabled = node.bindings.disabled;
      if (disabled) {
        if (disabled.kind !== "prop" || disabled.path?.length) throw new Error("Native close action disabled binding requires a boolean prop");
        disabledNames.add(disabled.prop);
      }
      const dimensions: NativeCloseAction["dimensions"] = {};
      for (const rule of ir.nativeStyleRules?.rules ?? []) {
        if (rule.part !== node.part || rule.pseudo) continue;
        for (const declaration of rule.declarations) {
          if (declaration.property !== "width" && declaration.property !== "height") continue;
          if (declaration.platforms && !declaration.platforms.includes(platform)) continue;
          if (rule.predicates.length) throw new Error("Native close action conditional dimensions have no admitted lowering");
          const pixels = /^(\d+(?:\.\d+)?)px$/.exec(declaration.value);
          if (!pixels) throw new Error(`Native close action ${declaration.property} requires an admitted pixel dimension`);
          dimensions[declaration.property] = { pixels: Number(pixels[1]), token: declaration.token, designSlot: declaration.designSlot };
        }
      }
      actions.push({ node, label: label.ref, guard: node.ifProp ? booleanProp(node.ifProp) : undefined, disabled: [...disabledNames].map(booleanProp), references: node.children, dimensions });
    }
    node.children.forEach(visit);
  };
  if (ir.dom) visit(ir.dom);
  return actions;
}
