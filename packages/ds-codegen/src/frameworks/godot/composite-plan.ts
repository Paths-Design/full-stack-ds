import { isContentTransform, type ComponentIR } from "../../ir.js";
import { isCompoundPartComposer, isIconDecoratedContent } from "../native-emission-class.js";

const PAINTED_PROPERTIES = new Set([
  "background-color", "border-color", "border-width", "border-radius",
  "padding", "padding-block", "padding-inline", "gap", "min-height",
  "color", "font-size", "font-weight",
]);

/** Source fact: compound parts or one projected content region beside an icon part.
 * Applies by: passive native composition. Removable when the IR composition classes retire.
 * A part host is serialized in the generated scene; changing a style never reconstructs it.
 */
export function godotCompositePlan(ir: ComponentIR) {
  const compound = isCompoundPartComposer(ir);
  const decorated = isIconDecoratedContent(ir);
  if (!compound && !decorated) return undefined;
  const parts = compound
    ? ir.compoundParts.map(part => part.name)
    : ir.dom!.children.filter(node => node.part).map(node => node.part!);
  if (parts.length < 2 || new Set(parts).size !== parts.length) {
    throw new Error(`GODOT_UNSUPPORTED_COMPOSITE_PARTS: ${ir.name}`);
  }
  let projectedProp: string | undefined;
  if (decorated) {
    const root = ir.dom!;
    const icon = root.children.find(node => node.part === "icon");
    const content = root.children.find(node => node.part === "content");
    if (root.children.length !== 2 || !icon || isContentTransform(icon.content) || icon.content?.kind !== "prop" ||
        icon.ifProp !== icon.content.prop ||
        !content || content.children.length !== 1 || content.children[0]?.tag !== "children") {
      throw new Error(`GODOT_UNSUPPORTED_COMPOSITE_ANATOMY: ${ir.name}`);
    }
    projectedProp = icon.content.prop;
    const iconType = ir.styledProps.find(prop => prop.name === projectedProp)?.type;
    if (iconType !== "ReactNode") throw new Error(`GODOT_UNSUPPORTED_COMPOSITE_ICON: ${ir.name}`);
    const hasExtraFacts = (node: typeof root) => Boolean(node.activation || node.focusContainer || node.keyboardActions?.length ||
      node.keyboardPanel || node.keyboardAnchor || node.componentRef || node.iteration || node.ifSlot ||
      node.cssVarBindings.length || node.iconGlyph || node.generatedIdSlug || node.idRefAttrs.length ||
      Object.keys(node.bindings).length || Object.keys(node.propertyBindings).length || Object.keys(node.events).length);
    if (hasExtraFacts(root) || hasExtraFacts(icon) || hasExtraFacts(content) ||
        root.content || root.ifProp || root.ifNegated || Object.keys(root.attrs).length ||
        icon.ifNegated || icon.children.length || Object.keys(icon.attrs).some(attr => attr !== "aria-hidden") ||
        icon.attrs["aria-hidden"] !== "true" || content.content || content.ifProp || content.ifNegated ||
        Object.keys(content.attrs).length || hasExtraFacts(content.children[0]!) ||
        Object.keys(content.children[0]!.attrs).length || content.children[0]!.content ||
        content.children[0]!.children.length || content.children[0]!.ifProp || content.children[0]!.ifNegated) {
      throw new Error(`GODOT_UNSUPPORTED_COMPOSITE_ANATOMY: ${ir.name}`);
    }
  }
  const admitted = new Set([
    ...Object.keys(ir.variants),
    ...ir.classRecipe.booleanModifiers.map(modifier => modifier.propName),
    ...(projectedProp ? [projectedProp] : []),
  ]);
  const excluded = ir.styledProps.filter(prop => !admitted.has(prop.name)).map(prop => prop.name);
  const native = ir.nativeStyleRules;
  if (!native) throw new Error(`GODOT_UNSUPPORTED_COMPOSITE_STYLE: ${ir.name}`);
  const omissions = native.unsupported.map(rule => `${rule.sourceKey}: ${rule.reason}`);
  omissions.push(...excluded.map(prop => `${prop}: no executable native composition fact`));
  if (ir.root.explicitRole || ir.root.labeling.length) {
    omissions.push("root accessibility role and labeling: native projection unverified");
  }
  omissions.push(...ir.compoundParts.filter(part => part.details?.interactive || part.details?.focusable)
    .map(part => `${part.name}: native part activation and focus semantics unlowered`));
  const styles = [];
  for (const rule of native.rules) {
    const selectorSupported = !rule.pseudo && parts.concat("root").includes(rule.part) &&
      rule.predicates.every(predicate => predicate.kind === "variant" ||
        (predicate.kind === "hover" && (!predicate.ownerPart || predicate.ownerPart === "root")));
    if (!selectorSupported) {
      omissions.push(`${rule.sourceKey}: unsupported composite selector`);
      continue;
    }
    const declarations = [];
    for (const declaration of rule.declarations) {
      if (declaration.platforms && !declaration.platforms.includes("godot")) {
        omissions.push(`${rule.sourceKey}.${declaration.property}: platform ${declaration.platforms.join(",")} only`);
        continue;
      }
      if (!declaration.property.includes(".") && !PAINTED_PROPERTIES.has(declaration.property)) {
        omissions.push(`${rule.sourceKey}.${declaration.property}: no Godot composite style mapping`);
        continue;
      }
      declarations.push({ property: declaration.property, value: declaration.value,
        ...(declaration.token ? { token: declaration.token } : {}),
        ...(declaration.designSlot ? { designSlot: declaration.designSlot } : {}) });
    }
    if (declarations.length) styles.push({ source: rule.sourceKey, part: rule.part, predicates: rule.predicates, declarations });
  }
  if (decorated) {
    omissions.push("icon: consumer content is composed into the icon part; no default glyph is synthesized");
  }
  return {
    operation: "composite" as const,
    layout: compound ? "column" as const : "inline" as const,
    parts,
    contentPart: decorated ? "content" : undefined,
    axes: Object.keys(ir.variants),
    styles,
    excluded,
    omissions,
  };
}
