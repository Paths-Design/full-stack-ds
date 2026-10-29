import type { ComponentIR, DomNodeIR } from "../../ir.js";
import { isProjectedChildrenAction } from "../native-emission-class.js";

const ACTION_PROPERTIES = new Set([
  "background-color", "color", "border-color", "border-width", "border-radius",
  "font-size", "font-weight", "padding-block-start", "padding-block-end",
  "padding-inline-start", "padding-inline-end", "min-height", "min-width",
]);
const WEB_ONLY_PROPS = new Set(["type", "ariaExpanded", "ariaPressed"]);
const BASE_ONLY_PROPERTIES = new Set(["font-size", "font-weight", "min-height", "min-width"]);
const FOCUS_PROPERTIES = new Set(["color", "border-color", "border-width", "border-radius"]);

function boundProp(node: DomNodeIR, attribute: string): string | undefined {
  const binding = node.bindings[attribute];
  return binding?.kind === "prop" && !binding.path?.length ? binding.prop : undefined;
}

export function godotActionPlan(ir: ComponentIR) {
  if (!isProjectedChildrenAction(ir)) return undefined;
  const root = ir.dom!;
  const click = root.events.click;
  const actionProp = click?.kind === "prop" && !click.path?.length ? click.prop : undefined;
  const disabledProp = boundProp(root, "disabled");
  const loadingProp = boundProp(root, "aria-busy");
  const labelProp = boundProp(root, "aria-label");
  const contentHost = root.children.find(node => node.children.some(child => child.tag === "children"));
  const loadingDecoration = root.children.find(node => node.componentRef && node.ifProp === loadingProp);
  const rootBindings = new Set(["type", "disabled", "aria-label", "aria-expanded", "aria-pressed", "aria-busy"]);
  const rootSupported = Object.keys(root.attrs).length === 0 &&
    Object.keys(root.propertyBindings).length === 0 && root.cssVarBindings.length === 0 &&
    Object.keys(root.events).every(event => event === "click") &&
    Object.keys(root.bindings).every(binding => rootBindings.has(binding));
  const contentSupported = contentHost && contentHost.children.length === 1 &&
    contentHost.children[0]?.tag === "children" &&
    !contentHost.ifProp && !contentHost.ifSlot && !contentHost.componentRef &&
    Object.keys(contentHost.attrs).length === 0 && Object.keys(contentHost.bindings).length === 0 &&
    Object.keys(contentHost.propertyBindings).length === 0 && Object.keys(contentHost.events).length === 0;
  const decorationSupported = loadingDecoration && loadingDecoration.children.length === 0 &&
    !loadingDecoration.ifNegated && Object.keys(loadingDecoration.events).length === 0 &&
    Object.keys(loadingDecoration.attrs).every(attribute => attribute === "size");
  if (!actionProp || !disabledProp || !loadingProp || !rootSupported || !contentSupported ||
      !decorationSupported || root.children.length !== 2) {
    throw new Error(`GODOT_UNSUPPORTED_ACTION_ANATOMY: ${ir.name}`);
  }
  const admitted = new Set([...Object.keys(ir.variants), actionProp, disabledProp, loadingProp, labelProp, "title"]);
  for (const prop of ir.styledProps) {
    if (!admitted.has(prop.name) && !WEB_ONLY_PROPS.has(prop.name)) {
      throw new Error(`GODOT_UNSUPPORTED_PROP: ${ir.name}.${prop.name}`);
    }
  }
  for (const [name, expectedType] of [[disabledProp, "boolean"], [loadingProp, "boolean"], [labelProp, "string"], ["title", "string"]] as const) {
    const expression = ir.styledProps.find(prop => prop.name === name)?.defaultExpr;
    if (expression === undefined) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(expression); } catch { throw new Error(`GODOT_UNSUPPORTED_ACTION_DEFAULT: ${ir.name}.${name}`); }
    if (typeof parsed !== expectedType) throw new Error(`GODOT_UNSUPPORTED_ACTION_DEFAULT: ${ir.name}.${name}`);
  }
  const styleRules = ir.nativeStyleRules;
  if (!styleRules) throw new Error(`GODOT_UNSUPPORTED_ACTION_STYLE: ${ir.name}`);
  const omissions = styleRules.unsupported.map(rule => `${rule.sourceKey}: ${rule.reason}`);
  omissions.push("default children: string content only; native Control composition is not lowered");
  const styles = [];
  for (const rule of styleRules.rules) {
    const statePredicates = rule.predicates.filter(predicate => predicate.kind !== "variant");
    const selectorSupported = statePredicates.length <= 1 && statePredicates.every(predicate =>
      ["hover", "active", "focus", "disabled"].includes(predicate.kind) &&
      (!predicate.ownerPart || predicate.ownerPart === "root") &&
      (predicate.kind !== "disabled" || predicate.value === true)
    );
    const declarations = rule.declarations.filter(declaration => {
      if (declaration.platforms && !declaration.platforms.includes("godot")) {
        if (declaration.property.includes(".") || ACTION_PROPERTIES.has(declaration.property)) {
          omissions.push(`${rule.sourceKey}.${declaration.property}: platform ${declaration.platforms.join(",")} only`);
        }
        return false;
      }
      if (declaration.property.includes(".")) return true;
      if (ACTION_PROPERTIES.has(declaration.property)) {
        if (statePredicates.length && BASE_ONLY_PROPERTIES.has(declaration.property)) {
          omissions.push(`${rule.sourceKey}.${declaration.property}: native state typography and geometry are not lowered`);
          return false;
        }
        if (statePredicates.some(predicate => predicate.kind === "focus") && !FOCUS_PROPERTIES.has(declaration.property)) {
          omissions.push(`${rule.sourceKey}.${declaration.property}: focus overlay does not lower this property`);
          return false;
        }
        return true;
      }
      omissions.push(`${rule.sourceKey}.${declaration.property}: no Godot action style mapping`);
      return false;
    });
    if (declarations.length === 0) continue;
    if (rule.part !== "root" || rule.pseudo || !selectorSupported || rule.predicates.some(predicate =>
      predicate.kind === "variant" && !Object.keys(ir.variants).includes(predicate.axis)
    )) {
      omissions.push(`${rule.sourceKey}: unsupported action selector`);
      continue;
    }
    styles.push({
      source: rule.sourceKey,
      predicates: rule.predicates,
      declarations: declarations.map(declaration => ({
        property: declaration.property,
        value: declaration.value,
        ...(declaration.token ? { token: declaration.token } : {}),
        ...(declaration.designSlot ? { designSlot: declaration.designSlot } : {}),
      })),
    });
  }
  return {
    operation: "action" as const,
    props: { action: actionProp, disabled: disabledProp, loading: loadingProp, label: labelProp, title: "title" },
    axes: Object.keys(ir.variants),
    styles,
    excluded: ir.styledProps.filter(prop => WEB_ONLY_PROPS.has(prop.name)).map(prop => prop.name),
    omissions,
    loadingAffordance: "indeterminate-progress" as const,
    contentProjection: "string" as const,
  };
}
