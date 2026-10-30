import type { ComponentIR, DomNodeIR } from "../../ir.js";
import { collectIconGlyphNodes } from "../icon-glyph.js";

export interface GodotGlyphPlan {
  operation: "glyph";
  nameProp: string;
  sizeProp: string;
  decorativeProp: string;
  labelProp: string;
  svgFill: string;
  sizeHints: Record<string, number>;
  sizeStyles: Record<string, { width: string; height: string }>;
  excluded: string[];
}

const literal = (node: { kind: string; value?: string } | undefined, value: string): boolean => node?.kind === "literal" && node.value === value;
function unsupported(name: string, reason: string): never { throw new Error(`GODOT_UNSUPPORTED_GLYPH: ${name}: ${reason}`); }
function hasUnloweredNodeFact(node: DomNodeIR): boolean {
  return !!(node.nativeTextChannel || node.nativeRadioChannel || node.activation || node.focusContainer || node.keyboardActions?.length ||
    node.keyboardPanel || node.keyboardAnchor || node.componentInstance || node.slotName || node.ifNegated ||
    node.generatedIdSlug || node.idRefAttrs.length);
}

/** A single glyph-bearing passive wrapper. Every emitted knob is traced to a
 * binding or style fact; authored facts this path cannot render reject it. */
export function godotGlyphPlan(ir: ComponentIR): GodotGlyphPlan | undefined {
  const entries = collectIconGlyphNodes(ir.dom);
  if (!entries.length) return undefined;
  const root = ir.dom;
  if (!root || entries.length !== 1 || root.children.length !== 1 || root.children[0] !== entries[0]!.node) unsupported(ir.name, "expected one direct glyph child");
  if (ir.behavior.normalizedChannels.length || ir.interaction || ir.formControl || ir.surface || ir.compoundParts.length || ir.motion.sequence) unsupported(ir.name, "interactive or compound anatomy");
  const glyphNode = entries[0]!.node;
  if (hasUnloweredNodeFact(root) || hasUnloweredNodeFact(glyphNode) || glyphNode.part ||
      root.content || root.componentRef || root.iteration || root.ifProp || root.ifSlot ||
      Object.keys(root.attrs).length || Object.keys(root.events).length || Object.keys(root.propertyBindings).length || root.cssVarBindings.length ||
      glyphNode.content || glyphNode.componentRef || glyphNode.children.length || glyphNode.iteration || glyphNode.ifProp || glyphNode.ifSlot ||
      Object.keys(glyphNode.bindings).length || Object.keys(glyphNode.events).length || Object.keys(glyphNode.propertyBindings).length || glyphNode.cssVarBindings.length) unsupported(ir.name, "unlowered anatomy fact");
  if (root.tag !== "span" || glyphNode.tag !== "svg" || Object.keys(root.bindings).sort().join() !== "aria-hidden,aria-label,role" ||
      Object.keys(glyphNode.attrs).sort().join() !== "fill,xmlns" || glyphNode.attrs.fill !== "none" || glyphNode.attrs.xmlns !== "http://www.w3.org/2000/svg") unsupported(ir.name, "unsupported host or SVG vocabulary");
  const role = root.bindings.role;
  const hidden = root.bindings["aria-hidden"];
  const label = root.bindings["aria-label"];
  if (role?.kind !== "conditional" || hidden?.kind !== "conditional" || label?.kind !== "prop") unsupported(ir.name, "accessibility bindings do not describe decorative/image semantics");
  const roleCondition = role.condition;
  const hiddenCondition = hidden.condition;
  if (roleCondition.kind !== "prop" || hiddenCondition.kind !== "prop" || roleCondition.prop !== hiddenCondition.prop ||
      !literal(role.whenTrue, "presentation") || !literal(role.whenFalse, "img") ||
      !literal(hidden.whenTrue, "true") || !literal(hidden.whenFalse, "false")) unsupported(ir.name, "accessibility bindings do not describe decorative/image semantics");
  const glyph = entries[0]!.glyph;
  const sizeHints = glyph.sizeHints;
  const sizePropName = glyph.sizePropName;
  if (!sizeHints || !sizePropName) unsupported(ir.name, "named size hints are required");
  if (glyph.nameFrom.kind !== "prop" || glyph.nameFrom.prop !== glyph.namePropName ||
      glyph.sizeFrom?.kind !== "prop" || glyph.sizeFrom.prop !== sizePropName) unsupported(ir.name, "glyph prop bindings disagree with normalized names");
  const nameProp = ir.styledProps.find(prop => prop.name === glyph.namePropName);
  const sizeProp = ir.styledProps.find(prop => prop.name === sizePropName);
  const decorativeProp = ir.styledProps.find(prop => prop.name === roleCondition.prop);
  const labelProp = ir.styledProps.find(prop => prop.name === label.prop);
  if (!nameProp || nameProp.propType.kind !== "string" || !sizeProp || sizeProp.propType.kind !== "enum" ||
      !decorativeProp || decorativeProp.propType.kind !== "boolean" || !labelProp || labelProp.propType.kind !== "string") unsupported(ir.name, "bound prop types are unsupported");
  const sizeValues = sizeProp.propType.values;
  if (ir.styledProps.length !== 4 || !sizeValues.every(value => Object.hasOwn(sizeHints, value)) ||
      Object.keys(sizeHints).length !== sizeValues.length) unsupported(ir.name, "unbound prop or size hint");
  const sizeDefault = sizeProp.defaultExpr === undefined ? undefined : JSON.parse(sizeProp.defaultExpr) as unknown;
  const decorativeDefault = decorativeProp.defaultExpr === undefined ? undefined : JSON.parse(decorativeProp.defaultExpr) as unknown;
  const nameDefault = nameProp.defaultExpr === undefined ? undefined : JSON.parse(nameProp.defaultExpr) as unknown;
  const labelDefault = labelProp.defaultExpr === undefined ? undefined : JSON.parse(labelProp.defaultExpr) as unknown;
  if (sizeDefault !== undefined && (typeof sizeDefault !== "string" || !sizeValues.includes(sizeDefault))) unsupported(ir.name, "invalid size default");
  if (decorativeDefault !== undefined && typeof decorativeDefault !== "boolean") unsupported(ir.name, "invalid decorative default");
  if (nameDefault !== undefined && typeof nameDefault !== "string") unsupported(ir.name, "invalid glyph name default");
  if (labelDefault !== undefined && typeof labelDefault !== "string") unsupported(ir.name, "invalid glyph label default");
  const tokenValues = new Map(ir.tokenFacts.map(fact => [fact.name, fact.rawValue]));
  if (ir.nativeStyleRules?.unsupported.length) unsupported(ir.name, "unsupported native style selector");
  const sizeStyles: GodotGlyphPlan["sizeStyles"] = {};
  for (const rule of ir.nativeStyleRules?.rules ?? []) {
    if (rule.sourceKey === "tokens" || rule.sourceKey === "structure") continue;
    const applicable = rule.declarations.filter(decl => !decl.platforms || decl.platforms.includes("godot"));
    const variants = rule.predicates;
    const variant = variants.length === 1 && variants[0]!.kind === "variant" && variants[0]!.axis === sizeProp.name ? variants[0]! : undefined;
    if (!variant || rule.part !== (root.part ?? "root") || rule.pseudo) {
      if (applicable.length) unsupported(ir.name, `unsupported style selector ${rule.sourceKey}`);
      continue;
    }
    const localTokens = new Map(applicable.filter(decl => decl.property.includes(".")).map(decl => [decl.property, decl.value]));
    const declarations = Object.fromEntries(applicable.filter(decl => !decl.property.includes(".")).map(decl => [decl.property, decl.token ? localTokens.get(decl.token) ?? tokenValues.get(decl.token) ?? decl.value : decl.value]));
    if (Object.keys(declarations).sort().join() !== "height,width") unsupported(ir.name, `unsupported style declaration ${rule.sourceKey}`);
    if (!/^\d+(?:\.\d+)?px$/.test(declarations.width) || !/^\d+(?:\.\d+)?px$/.test(declarations.height)) unsupported(ir.name, `unsupported glyph dimension ${rule.sourceKey}`);
    if (Number.parseFloat(declarations.width) !== Number.parseFloat(declarations.height)) unsupported(ir.name, `non-square glyph dimension ${rule.sourceKey}`);
    sizeStyles[variant.value] = { width: declarations.width, height: declarations.height };
  }
  if (Object.keys(sizeStyles).sort().join() !== sizeValues.slice().sort().join()) unsupported(ir.name, "missing size style carrier");
  return { operation: "glyph", nameProp: nameProp.name, sizeProp: sizeProp.name, decorativeProp: decorativeProp.name, labelProp: labelProp.name, svgFill: glyphNode.attrs.fill,
    sizeHints, sizeStyles, excluded: [] };
}
