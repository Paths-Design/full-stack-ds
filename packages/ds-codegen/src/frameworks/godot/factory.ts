import fs from "node:fs";
import path from "node:path";
import type { FrameworkEmitter } from "../../emitter.js";
import type { ComponentIR, DomNodeIR } from "../../ir.js";
import { isBareRuleLeaf, isStaticContent } from "../native-emission-class.js";
import { isPartAnchoredSurface } from "../../semantics.js";
import { namedMessage, nodeTextSource } from "../native-messages.js";
import { godotActionPlan } from "./action-plan.js";
import { godotCompositePlan } from "./composite-plan.js";
const q = JSON.stringify;
const handled = new Set(["checked","defaultChecked","onChange","open","defaultOpen","onOpenChange","value","defaultValue","onValueChange","disabled","collapsible","type","orientation","activationMode","loop","unmountInactive","appearance","placement","closeOnEscape","closeOnOutsideClick","closeOnBlur"]);
// Explicit pilot exclusions are visible in the emitted capability receipt.
const excluded = new Set(["size", "name", "idBase"]);
const staticTextProps = new Set(["as", "variant", "size", "weight", "align", "transform", "truncate"]);
const ruleProps = new Set(["orientation", "decorative", "thickness", "title"]);
const textStyleProperties = new Set(["color", "font-size", "font-weight", "line-height", "letter-spacing"]);
const ruleStyleProperties = new Set(["border-top-color", "border-left-color", "border-top-width", "border-left-width", "margin-top", "margin-bottom", "margin-left", "margin-right"]);
function hasUnloweredStaticNodeFacts(node: DomNodeIR): boolean {
  return !!(node.activation || node.focusContainer || node.keyboardActions?.length || node.keyboardPanel || node.keyboardAnchor || node.content || node.componentRef || node.iteration || node.ifProp || node.ifSlot || node.cssVarBindings.length || node.iconGlyph || node.generatedIdSlug || node.idRefAttrs.length || Object.keys(node.attrs).length || Object.keys(node.propertyBindings).length || Object.keys(node.events).length);
}
function staticPlan(ir: ComponentIR) {
  const isRule = isBareRuleLeaf(ir);
  const isText = isStaticContent(ir) && ir.dom?.children.length === 1 && ir.dom.children[0]?.tag === "children";
  if (!isRule && !isText) return undefined;
  const root = ir.dom!;
  const child = isText ? root.children[0]! : undefined;
  const bindingKeys = Object.keys(root.bindings);
  const truncateBinding = root.bindings["data-truncate"];
  const supportedTruncate = truncateBinding?.kind === "conditional" && truncateBinding.condition.kind === "prop" && truncateBinding.condition.prop === "truncate" && truncateBinding.whenTrue.kind === "literal" && truncateBinding.whenTrue.value === "true" && truncateBinding.whenFalse.kind === "literal" && truncateBinding.whenFalse.value === "false";
  if (root.part !== "root" || hasUnloweredStaticNodeFacts(root) || (isText ? (bindingKeys.length !== 1 || !supportedTruncate || !child || hasUnloweredStaticNodeFacts(child) || Object.keys(child.bindings).length || child.children.length) : bindingKeys.length)) throw new Error(`GODOT_UNSUPPORTED_STATIC_ANATOMY: ${ir.name}`);
  const allowed = isRule ? ruleProps : staticTextProps;
  const allowedStyles = isRule ? ruleStyleProperties : textStyleProperties;
  for (const prop of ir.styledProps) if (!allowed.has(prop.name)) throw new Error(`GODOT_UNSUPPORTED_PROP: ${ir.name}.${prop.name}`);
  const rules = ir.nativeStyleRules?.rules ?? [];
  const styleRules = rules.filter(rule => rule.sourceKey !== "tokens" && rule.sourceKey !== "structure");
  if (styleRules.some(rule => rule.part !== "root" || rule.pseudo || rule.predicates.some(predicate => predicate.kind !== "variant"))) throw new Error(`GODOT_UNSUPPORTED_STATIC_SELECTOR: ${ir.name}`);
  const tokenValues = new Map(ir.tokenFacts.map(fact => [fact.name, fact.rawValue]));
  const styles = styleRules.map(rule => {
    const localTokens = new Map(rule.declarations.filter(decl => decl.property.includes(".")).map(decl => [decl.property, decl.value]));
    return {
      source: rule.sourceKey,
      predicates: rule.predicates,
      declarations: rule.declarations.filter(decl => !decl.platforms).filter(decl => allowedStyles.has(decl.property)).map(decl => ({ property: decl.property, value: decl.token ? localTokens.get(decl.token) ?? tokenValues.get(decl.token) ?? decl.value : decl.value, token: decl.token })),
    };
  }).filter(rule => rule.declarations.length);
  const unsupported = styleRules.flatMap(rule => rule.declarations.filter(decl => !decl.property.includes(".") && !decl.platforms && !allowedStyles.has(decl.property)).map(decl => `${rule.sourceKey}.${decl.property}`));
  if (unsupported.length) throw new Error(`GODOT_UNSUPPORTED_STATIC_STYLE: ${ir.name}.${unsupported.join(",")}`);
  const excludedSelectors = ir.nativeStyleRules?.unsupported.map(rule => rule.sourceKey) ?? [];
  if (excludedSelectors.length && !(isText && excludedSelectors.every(selector => selector === `.${ir.cssPrefix}[data-truncate="true"]`))) throw new Error(`GODOT_UNSUPPORTED_STATIC_SELECTOR: ${ir.name}.${excludedSelectors.join(",")}`);
  // Source fact: static content/rule anatomy plus native style declarations.
  // Applies by: passive shape. Remove each gap when its native consumer exists.
  const fidelityGaps = isText ? [
    "children.node-ref: content is String-only; retained inline node composition is not realized",
    "as: DOM element and heading semantics have no native mapping",
    "typography.font-family: SystemFont fallback does not preserve the authored Web font family",
    "typography.line-height: integer line_spacing approximates CSS line boxes",
    "typography.letter-spacing: integer glyph spacing rounds fractional tracking",
    "transform.capitalize: Godot String.capitalize word normalization differs from CSS text-transform",
  ] : [
    "decorative: semantic separator versus presentation has no native accessibility mapping",
    "layout: parent-constrained Godot container geometry is not CSS flow/flex layout parity",
  ];
  return { operation: isRule ? "rule" : "static-text", excluded: isText ? ["as"] : ["decorative"], fidelityGaps, styles };
}
export function godotPlan(ir: ComponentIR) {
  if (ir.motion.sequence) return godotSequencePlan(ir);
  const composite = godotCompositePlan(ir);
  if (composite) return composite;
  const action = godotActionPlan(ir);
  if (action) return action;
  const staticContent = staticPlan(ir);
  if (staticContent) return staticContent;
  for (const p of ir.styledProps) if (!handled.has(p.name) && !excluded.has(p.name)) throw new Error(`GODOT_UNSUPPORTED_PROP: ${ir.name}.${p.name}`);
  let operation: string;
  if (ir.surface) {
    if (!isPartAnchoredSurface(ir.surface) || ir.surface.modality !== "non-blocking" || ir.surface.openTriggers.join() !== "click") throw new Error(`GODOT_UNSUPPORTED_SURFACE: ${ir.name}`);
    operation = "surface";
  } else if (ir.formControl?.valueModel === "boolean") operation = "boolean";
  else if (ir.interaction?.triggers.length === 1 && ["select","toggle-item"].includes(ir.interaction.triggers[0]!.operation)) operation = ir.interaction.triggers[0]!.operation;
  else throw new Error(`GODOT_UNSUPPORTED_SHAPE: ${ir.name}`);
  const realized = new Set(["checked", "open", "value", "disabled", "collapsible", "onChange", "onValueChange", "onOpenChange"]);
  return { operation, excluded: ir.styledProps.filter(p => !realized.has(p.name) || (ir.formControl && p.name === "value")).map(p=>p.name) };
}
/** Source fact: normalized sequence, channel and label bindings.
 * Applies by: numeric sequence capability. Removable when: its IR is retired.
 * Native presentation is intentionally bounded while the target remains unadmitted.
 */
export function godotSequencePlan(ir: ComponentIR) {
  const sequence = ir.motion.sequence!;
  const channel = ir.behavior.normalizedChannels.find(c => c.name === sequence.channel)!;
  const label = ir.dom?.bindings["aria-label"];
  if (label && (label.kind !== "prop" || label.path?.length)) throw new Error(`GODOT_UNSUPPORTED_SEQUENCE_LABEL: ${ir.name}`);
  const nameProp = label?.kind === "prop" ? label.prop : undefined;
  const realized = new Set([channel.valueProp, channel.defaultValueProp, channel.changeHandlerProp, sequence.itemsProp, sequence.timing.durationProp, sequence.timing.autoPlayProp, nameProp]);
  const presentationProps = new Set(sequence.progress.flatMap(binding => binding.when ? [binding.when.axis] : []));
  const variantProps = Object.keys(ir.variants).filter(prop => !presentationProps.has(prop));
  presentationProps.forEach(prop => realized.add(prop));
  for (const p of ir.styledProps) if (!realized.has(p.name) && !variantProps.includes(p.name)) throw new Error(`GODOT_UNSUPPORTED_PROP: ${ir.name}.${p.name}`);
  const nodes: DomNodeIR[] = [];
  const walk = (node: DomNodeIR) => { nodes.push(node); if (!node.componentRef) node.children.forEach(walk); };
  if (ir.dom) walk(ir.dom);
  if (sequence.composition !== "resolved") throw new Error(`GODOT_UNRESOLVED_SEQUENCE: ${ir.name}`);
  for (const [index, progress] of sequence.progress.entries()) {
    const host = progress.effect === "elapsed-width" ? "picker" : "next";
    if (sequence.progressHosts[index] !== host) throw new Error(`GODOT_UNSUPPORTED_PROGRESS_HOST: ${ir.name}.${progress.target.part}`);
  }
  // The pilot has no message catalog: a message-bound name renders its
  // contract default (named non-claim in docs/architecture/localization.md).
  const names = Object.fromEntries((["previous", "next"] as const).map(key => {
    const node = nodes.find(n => n.part === sequence[key]);
    const source = nodeTextSource(ir, node, "aria-label");
    const name = source?.kind === "message" && source.ref.params.length === 0
      ? source.ref.message.defaultMessage
      : source ? undefined : node?.attrs["aria-label"];
    if (!name) throw new Error(`GODOT_UNSUPPORTED_SEQUENCE_LABEL: ${ir.name}.${sequence[key]}`);
    return [key, name];
  }));
  // sequence.labels name messages; the pilot runtime reads them as display
  // text, so the configuration carries each one's contract default instead.
  const labels = Object.fromEntries((["start", "stop", "item", "position"] as const).map(slot =>
    [slot, namedMessage(ir, sequence.labels[slot]).defaultMessage]));
  return { operation: "sequence", excluded: variantProps, sequence: { ...sequence, labels }, channel, nameProp, names };
}
export function themeColor(ir: ComponentIR): string {
  // Project an authored foreground fallback through normalized CSS/token facts.
  // No component-name dispatch and no interpretation of raw contract fields.
  for (const block of ir.cssBlocks) {
    if (/[[:]/.test(block.selector)) continue;
    const color = block.declarations.color;
    if (!color) continue;
    if (/^#[0-9a-f]{6}$/i.test(color)) return color;
    for (const fact of ir.tokenFacts) if (color.includes(fact.cssVar) && fact.rawValue && /^#[0-9a-f]{6}$/i.test(fact.rawValue)) return fact.rawValue;
  }
  return "#141414";
}
export function createGodotEmitter(): FrameworkEmitter {
  return {
    id: "godot",
    discoverComponentIds: root => fs.existsSync(root) ? fs.readdirSync(root).filter(n => fs.existsSync(path.join(root,n,`${n}.gd`))).sort() : [],
    emitComponent(ir) {
      const plan = godotPlan(ir);
      const defaults = Object.fromEntries(ir.styledProps.filter(p=>p.defaultExpr !== undefined).map(p=>[p.name,p.defaultExpr]));
      const isSequence = plan.operation === "sequence";
      const isStatic = plan.operation === "rule" || plan.operation === "static-text";
      const isAction = plan.operation === "action";
      const isComposite = plan.operation === "composite";
      const compositePlan = isComposite ? plan as NonNullable<ReturnType<typeof godotCompositePlan>> : undefined;
      const config = { ...(isSequence || isStatic || isAction || isComposite ? plan : { operation: plan.operation }), defaults, theme_color: themeColor(ir) };
      const script = `${isSequence ? "" : "@tool\n"}class_name DS${ir.name}\nextends "res://addons/full_stack_ds/runtime/${isSequence ? "sequence" : isStatic ? "static_content" : isAction ? "action" : isComposite ? "composite" : "control"}.gd"\n\nfunc _init() -> void:\n\tconfiguration = JSON.parse_string(${q(JSON.stringify(config))})\n${isAction ? "\tapply_config_defaults()\n" : ""}${isSequence || isStatic || isAction || isComposite ? "" : `\tlabel = ${q(ir.name)}\n`}`;
      const hex = themeColor(ir).slice(1);
      const rgb = [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).join(", ");
      const compositeNodes = compositePlan ? `\n[node name="Chrome" type="PanelContainer" parent="."]\nlayout_mode=2\n\n[node name="Body" type="${compositePlan.layout === "inline" ? "HBoxContainer" : "VBoxContainer"}" parent="Chrome"]\nlayout_mode=2\n${compositePlan.parts.map(part => `\n[node name="Part_${part}" type="PanelContainer" parent="Chrome/Body"]\nlayout_mode=2\n\n[node name="Slot" type="VBoxContainer" parent="Chrome/Body/Part_${part}"]\nlayout_mode=2\n`).join("")}` : "";
      return [
        { relativePath: `${ir.name}/${ir.name}.gd`, contents: script },
        { relativePath: `${ir.name}/${ir.name}.tscn`, contents: `[gd_scene load_steps=3 format=3]\n\n[ext_resource type="Script" path="res://addons/full_stack_ds/components/${ir.name}/${ir.name}.gd" id="1"]\n[ext_resource type="Theme" path="res://addons/full_stack_ds/components/${ir.name}/theme.tres" id="2"]\n\n[node name="${ir.name}" type="VBoxContainer"]\nscript = ExtResource("1")\ntheme = ExtResource("2")\n${compositeNodes}` },
        { relativePath: `${ir.name}/theme.tres`, contents: `[gd_resource type="Theme" format=3]\n\n[resource]\ndefault_font_size = 16\nButton/colors/font_color = Color(${rgb}, 1)\nLabel/colors/font_color = Color(${rgb}, 1)\n` },
        { relativePath: `${ir.name}/capabilities.json`, contents: JSON.stringify({ ...plan, theme: isStatic ? "source-bearing static style subset" : isAction ? "source-bearing native action style subset" : isComposite ? "source-bearing native composite style subset" : "unconditional foreground fallback only", otherStyling: isStatic ? "unlisted declarations fail generation; font metrics and letter spacing are target approximations" : isAction ? "unsupported declarations and selectors are listed in omissions; Godot font metrics and loading progress are target approximations" : isComposite ? "omissions list unsupported selectors and declarations; part text inheritance and motion are unproven" : "unsupported", excludedProps: plan.excluded, proof: "requires-runtime-witness" },null,2)+"\n" },
      ];
    },
    emitTests: () => [],
    emitBarrel: names => `extends RefCounted\nconst COMPONENTS = ${q(names.sort())}\n`,
  };
}
