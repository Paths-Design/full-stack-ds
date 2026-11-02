import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FrameworkEmitter } from "../../emitter.js";
import type { ComponentIR, DomNodeIR, PropTypeIR } from "../../ir.js";
import { isBareRuleLeaf, isStaticContent } from "../native-emission-class.js";
import { isPartAnchoredSurface } from "../../semantics.js";
import { namedMessage, nodeTextSource } from "../native-messages.js";
import { godotActionPlan } from "./action-plan.js";
import { classifyProp, loadBoundary } from "./boundary.js";
import { godotControlStyles } from "./control-styles.js";
import { godotAccessibilityFacts } from "./accessibility-facts.js";
import { anatomyFiles, surfaceFiles } from "./plan-emission.js";
import { godotSurfacePlan } from "./surface-plan.js";
import { godotAnatomyPlan } from "./walker.js";
import type { GodotAnatomyPlan, GodotSurfacePlan } from "./plan-types.js";
import { godotCompositePlan } from "./composite-plan.js";
import { godotGlyphPlan } from "./glyph-plan.js";
import { godotGlyphCatalog } from "./glyph-catalog.js";
import { godotFormPlan, godotFormFiles } from "./form-plan.js";
import { collectIconGlyphNodes } from "../icon-glyph.js";
import { nativeLoopVisualPlan } from "../native-loop-visual.js";
import { loadTargetRegistryConfigV1 } from "../../target-packs/config.js";
const q = JSON.stringify;
const handled = new Set(["checked","defaultChecked","onChange","open","defaultOpen","onOpenChange","value","defaultValue","onValueChange","disabled","collapsible","type","orientation","activationMode","loop","unmountInactive","appearance","placement","closeOnEscape","closeOnOutsideClick","closeOnBlur"]);
// Explicit pilot exclusions are visible in the emitted capability receipt.
const excluded = new Set(["size", "name", "idBase"]);
const staticTextProps = new Set(["as", "variant", "size", "weight", "align", "transform", "truncate"]);
const ruleProps = new Set(["orientation", "decorative", "thickness", "title"]);
const textStyleProperties = new Set(["color", "font-size", "font-weight", "line-height", "letter-spacing"]);
const ruleStyleProperties = new Set(["border-top-color", "border-left-color", "border-top-width", "border-left-width", "margin-top", "margin-bottom", "margin-left", "margin-right"]);
interface ItemButtonRef { ref: string; part: string; attrs: Record<string, string | number | boolean> }
function staticRefValue(value: string, propType: PropTypeIR | undefined, where: string): string | number | boolean {
  const kind = propType?.kind;
  if (kind === "boolean") {
    if (value !== "true" && value !== "false") throw new Error(`GODOT_UNSUPPORTED_REF: ${where} needs a boolean literal`);
    return value === "true";
  }
  if (kind === "number") {
    const parsed = Number(value);
    if (!value.trim() || !Number.isFinite(parsed)) throw new Error(`GODOT_UNSUPPORTED_REF: ${where} needs a finite numeric literal`);
    return parsed;
  }
  if (kind === "enum" && !propType.values.includes(value))
    throw new Error(`GODOT_UNSUPPORTED_REF: ${where} has an invalid enum literal`);
  if (kind && kind !== "string" && kind !== "enum") throw new Error(`GODOT_UNSUPPORTED_REF: ${where} has unsupported literal type ${kind}`);
  return value;
}
/** Static component instances under an item trigger are carried as native
 * children. The IR owns the target prop mapping; the runtime owns mounting. */
function itemButtonRefs(ir: ComponentIR): ItemButtonRef[] {
  const trigger = ir.interaction?.triggers[0]?.part.name;
  const refs: ItemButtonRef[] = [];
  const visit = (node: DomNodeIR, underTrigger: boolean): void => {
    const inside = underTrigger || node.part === trigger;
    if (node.componentRef) {
      if (!inside || !node.part || node.children.length || node.ifProp || node.ifSlot || node.iteration ||
          Object.keys(node.bindings).length || Object.keys(node.events).length || Object.keys(node.propertyBindings).length ||
          node.componentInstance?.attrs.some(attr => attr.kind !== "prop"))
        throw new Error(`GODOT_UNSUPPORTED_REF: ${ir.name} ${node.componentRef} has unlowered placement or facts`);
      if (node.componentInstance && (node.componentInstance.ref !== node.componentRef || !node.componentInstance.targetGlyph))
        throw new Error(`GODOT_UNSUPPORTED_REF: ${ir.name} ${node.componentRef} has no admitted glyph mount capability`);
      const attrs = node.componentInstance?.attrs ?? Object.entries(node.attrs).map(([sourceAttr, value]) => ({ sourceAttr, targetProp: sourceAttr, value, kind: "prop" as const }));
      refs.push({ ref: node.componentRef, part: node.part, attrs: Object.fromEntries(attrs.map(attr => [attr.targetProp!, staticRefValue(attr.value, "propType" in attr ? attr.propType : undefined, `${ir.name}.${node.componentRef}.${attr.targetProp}`)])) });
      return;
    }
    node.children.forEach(child => visit(child, inside));
  };
  if (ir.dom) visit(ir.dom, false);
  return refs;
}
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
  // The narrow static shape is a single text leaf or a bare rule. Anything else
  // declines so the generic anatomy path can lower it with named omissions,
  // rather than refusing a component the corpus declares.
  if (root.part !== "root" || hasUnloweredStaticNodeFacts(root) || (isText ? (bindingKeys.length !== 1 || !supportedTruncate || !child || hasUnloweredStaticNodeFacts(child) || Object.keys(child.bindings).length || child.children.length) : bindingKeys.length)) return undefined;
  const allowed = isRule ? ruleProps : staticTextProps;
  const allowedStyles = isRule ? ruleStyleProperties : textStyleProperties;
  for (const prop of ir.styledProps) if (!allowed.has(prop.name)) return undefined;
  const rules = ir.nativeStyleRules?.rules ?? [];
  const styleRules = rules.filter(rule => rule.sourceKey !== "tokens" && rule.sourceKey !== "structure");
  if (styleRules.some(rule => rule.part !== "root" || rule.pseudo || rule.predicates.some(predicate => predicate.kind !== "variant"))) return undefined;
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
  if (unsupported.length) return undefined;
  const excludedSelectors = ir.nativeStyleRules?.unsupported.map(rule => rule.sourceKey) ?? [];
  if (excludedSelectors.length && !(isText && excludedSelectors.every(selector => selector === `.${ir.cssPrefix}[data-truncate="true"]`))) return undefined;
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
/**
 * Props this bounded shape declines. A decline is a ledgered decision, read from
 * the committed support boundary, never a silent drop: the receipt names the
 * rule and the reason. A fact the boundary says this target lowers cannot be
 * excluded here — that would be a planner/ledger disagreement, so it fails
 * generation instead of shipping a receipt the ledger contradicts.
 */
function propBoundary(ir: ComponentIR): { excluded: string[]; omissions: string[] } {
  const boundary = loadBoundary();
  const excludedProps: string[] = [];
  const omissions: string[] = [];
  for (const prop of ir.styledProps) {
    if (handled.has(prop.name) || excluded.has(prop.name)) continue;
    const classified = classifyProp(boundary, prop.name);
    if (classified.catchAll) throw new Error(`GODOT_UNCLASSIFIED_PROP: ${ir.name}.${prop.name}`);
    // A shape may legitimately decline a fact the target lowers somewhere else
    // (the ledger is per-target, the plan is per-shape). The decline is receipted
    // with its rule; the capability audit records the planner/ledger variance
    // for review instead of treating it as a silent drop.
    excludedProps.push(prop.name);
    omissions.push(`${prop.name}: ${classified.reason ?? classified.disposition} (boundary ${classified.rule})`);
  }
  return { excluded: excludedProps, omissions };
}

/**
 * Disclosure facts the shared control runtime can act on: focus strategy,
 * normalized dismissal triggers (with their gating props and defaults), portal
 * layering, surface modality and the structural ARIA state the DOM binds.
 *
 * Source fact: `behavior.focus` / `behavior.dismissal` / `behavior.portal` /
 * `surface` plus the `aria-expanded` / `aria-controls` bindings the anatomy
 * carries. Applies by: control and surface shapes. Nothing here inspects a
 * component name — every field is read from normalized IR.
 */
function disclosureFacts(ir: ComponentIR) {
  const focus = ir.behavior.focus;
  const portal = ir.behavior.portal;
  const bindings: Record<string, string> = {};
  const walk = (node: { bindings?: Record<string, { kind: string; prop?: string }>; children?: unknown[] }): void => {
    for (const [attr, binding] of Object.entries(node.bindings ?? {})) {
      if (!["aria-expanded", "aria-controls", "aria-selected", "aria-haspopup"].includes(attr)) continue;
      if (binding.kind === "prop" && binding.prop) bindings[attr] = binding.prop;
    }
    for (const child of (node.children ?? []) as typeof node[]) walk(child);
  };
  if (ir.dom) walk(ir.dom as never);
  return {
    ...(focus ? { focus: {
      strategy: focus.strategy ?? "auto",
      orientation: focus.orientation ?? "both",
      wrap: focus.wrap === true,
      ...(focus.initialFocus ? { initialFocus: focus.initialFocus } : {}),
      ...(focus.returnFocus ? { returnFocus: focus.returnFocus } : {}),
    } } : {}),
    dismissal: ir.behavior.normalizedDismissalTriggers.map(trigger => ({
      event: trigger.event,
      ...(trigger.enabledByProp ? { enabledByProp: trigger.enabledByProp } : {}),
      defaultEnabled: trigger.defaultEnabled,
    })),
    ...(portal ? { portal: { enabled: portal.enabled === true, ...(portal.layering ? { layering: portal.layering } : {}) } } : {}),
    ...(ir.surface ? { modality: ir.surface.modality, surfaceKind: ir.surface.kind } : {}),
    ...(Object.keys(bindings).length ? { ariaBindings: bindings } : {}),
  };
}

export function godotPlan(ir: ComponentIR) {
  if (ir.motion.sequence) return godotSequencePlan(ir);
  const loopVisual = nativeLoopVisualPlan(ir);
  if (loopVisual) return loopVisual;
  const glyph = godotGlyphPlan(ir);
  if (glyph) return glyph;
  const composite = godotCompositePlan(ir);
  if (composite) return composite;
  const action = godotActionPlan(ir);
  if (action) return action;
  const form = godotFormPlan(ir);
  if (form) return form;
  const staticContent = staticPlan(ir);
  if (staticContent) return staticContent;
  // A wider surface dispatches ahead of the generic shape so an overlay keeps
  // its presence semantics instead of being lowered as anonymous content. The
  // narrow part-anchored non-blocking click surface declines here and continues
  // on the control path below.
  if (ir.surface) {
    const wideSurface = godotSurfacePlan(ir);
    if (wideSurface) return wideSurface;
  }
  // Generic anatomy is the fallback that lets the corpus-wide admission set be
  // emitted: it lowers arbitrary part trees and names every fact it cannot
  // represent in the receipt rather than refusing the component.
  const anatomy = godotAnatomyPlan(ir);
  if (anatomy) {
    // The generic shape is the one place that could swallow anything, so its
    // exclusions are checked against the boundary on the way out: a family the
    // boundary never adjudicated, or one it says this target lowers, must not
    // become an anonymous exclusion.
    const boundary = loadBoundary();
    for (const name of anatomy.excluded) {
      const classified = classifyProp(boundary, name);
      if (classified.catchAll) throw new Error(`GODOT_UNCLASSIFIED_PROP: ${ir.name}.${name}`);
    }
    return anatomy;
  }
  // Shape first, then the prop boundary: a component the shape cannot represent
  // is a shape refusal, while a component the shape does represent must account
  // for every prop the boundary says this target lowers.
  let operation: string;
  if (ir.surface) {
    if (!isPartAnchoredSurface(ir.surface) || ir.surface.modality !== "non-blocking" || ir.surface.openTriggers.join() !== "click") throw new Error(`GODOT_UNSUPPORTED_SURFACE: ${ir.name}`);
    operation = "surface";
  } else if (ir.formControl?.valueModel === "boolean") operation = "boolean";
  else if (ir.interaction?.triggers.length === 1 && ["select","toggle-item"].includes(ir.interaction.triggers[0]!.operation)) operation = ir.interaction.triggers[0]!.operation;
  else throw new Error(`GODOT_UNSUPPORTED_SHAPE: ${ir.name}`);
  const boundary = propBoundary(ir);
  const realized = new Set(["checked", "open", "value", "disabled", "collapsible", "onChange", "onValueChange", "onOpenChange"]);
  const refs = itemButtonRefs(ir);
  if (refs.length && !["select", "toggle-item"].includes(operation)) throw new Error(`GODOT_UNSUPPORTED_REF: ${ir.name} has no item button host`);
  const excludedProps = ir.styledProps.filter(p => !realized.has(p.name) || (ir.formControl && p.name === "value")).map(p => p.name);
  for (const name of boundary.excluded) if (!excludedProps.includes(name)) excludedProps.push(name);
  const disclosure = disclosureFacts(ir);
  const accessibility = godotAccessibilityFacts(ir, new Set(["root", "trigger", "summary", "tab", "button", "content", "panel", "region", "body"]));
  const styleProjection = godotControlStyles(ir);
  const omissions = [...boundary.omissions, ...styleProjection.omissions];
  return {
    operation,
    excluded: excludedProps,
    ...(omissions.length ? { omissions } : {}),
    ...(refs.length ? { itemButtonRefs: refs } : {}),
    ...(Object.keys(disclosure).length ? { disclosure } : {}),
    ...(Object.keys(accessibility).length ? { accessibility } : {}),
    ...(styleProjection.focusRing ? { focusRing: styleProjection.focusRing } : {}),
    ...(styleProjection.styles.length ? { styles: styleProjection.styles } : {}),
  };
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
/** Declared default expressions by prop name, for the runtime configuration. */
function declaredDefaults(ir: ComponentIR): Record<string, string> {
  return Object.fromEntries(ir.styledProps
    .filter((prop): prop is typeof prop & { defaultExpr: string } => prop.defaultExpr !== undefined)
    .map(prop => [prop.name, prop.defaultExpr]));
}

export function createGodotEmitter(): FrameworkEmitter {
  return {
    id: "godot",
    discoverComponentIds: root => fs.existsSync(root) ? fs.readdirSync(root).filter(n => fs.existsSync(path.join(root,n,`${n}.gd`))).sort() : [],
    emitComponent(ir, opts) {
      const plan = godotPlan(ir);
      if (plan.operation === "text-input" || plan.operation === "associated-label")
        return godotFormFiles(ir, plan as NonNullable<ReturnType<typeof godotFormPlan>>);
      if (plan.operation === "surface" && "anchor" in plan)
        return surfaceFiles(ir, plan as GodotSurfacePlan, themeColor(ir), declaredDefaults(ir));
      if (plan.operation === "anatomy")
        return anatomyFiles(ir, plan as GodotAnatomyPlan, themeColor(ir), declaredDefaults(ir));
      const controlRefs = "itemButtonRefs" in plan ? plan.itemButtonRefs ?? [] : [];
      if (controlRefs.length) {
        const workspaceRoot = opts.contractsRoot ? path.resolve(opts.contractsRoot, "../..") : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
        const declared = loadTargetRegistryConfigV1(workspaceRoot).config.targets.find(target => target.id === "godot")?.components ?? [];
        for (const ref of controlRefs)
          if (!declared.includes(ref.ref)) throw new Error(`GODOT_UNSUPPORTED_REF: ${ir.name} references unadmitted ${ref.ref}`);
      }
      const defaults = Object.fromEntries(ir.styledProps.filter(p=>p.defaultExpr !== undefined).map(p=>[p.name,p.defaultExpr]));
      const isSequence = plan.operation === "sequence";
      const isStatic = plan.operation === "rule" || plan.operation === "static-text";
      const isAction = plan.operation === "action";
      const isComposite = plan.operation === "composite";
      const isGlyph = plan.operation === "glyph";
      const isLoopVisual = plan.operation === "loop-visual";
      const compositePlan = isComposite ? plan as NonNullable<ReturnType<typeof godotCompositePlan>> : undefined;
      // The bounded control shape carries the facts its runtime acts on: the
      // operation, the item-trigger references and the disclosure facts (focus
      // strategy, dismissal triggers + gates, portal layering, surface modality
      // and the structural ARIA bindings). The receipt keeps the full plan.
      const disclosure = "disclosure" in plan ? (plan as { disclosure?: Record<string, unknown> }).disclosure : undefined;
      const controlStyles = "styles" in plan ? (plan as { styles?: unknown[] }).styles : undefined;
      const controlConfig = {
        operation: plan.operation,
        ...(controlRefs.length ? { itemButtonRefs: controlRefs } : {}),
        ...(disclosure && Object.keys(disclosure).length ? { disclosure } : {}),
        ...("accessibility" in plan && plan.accessibility ? { accessibility: plan.accessibility } : {}),
        ...("focusRing" in plan && plan.focusRing ? { focusRing: plan.focusRing } : {}),
        ...(controlStyles && controlStyles.length ? { styles: controlStyles } : {}),
      };
      const config = { ...(isSequence || isStatic || isAction || isComposite || isGlyph || isLoopVisual ? plan : controlConfig), defaults, theme_color: themeColor(ir) };
      const script = `${isSequence ? "" : "@tool\n"}class_name DS${ir.name}\nextends "res://addons/full_stack_ds/runtime/${isSequence ? "sequence" : isStatic ? "static_content" : isAction ? "action" : isComposite ? "composite" : isGlyph ? "glyph" : isLoopVisual ? "loop_visual" : "control"}.gd"\n\nfunc _init() -> void:\n\tconfiguration = JSON.parse_string(${q(JSON.stringify(config))})\n${isAction ? "\tapply_config_defaults()\n" : ""}${isSequence || isStatic || isAction || isComposite || isGlyph || isLoopVisual ? "" : `\tlabel = ${q(ir.name)}\n`}`;
      const hex = themeColor(ir).slice(1);
      const rgb = [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).join(", ");
      const compositeNodes = compositePlan ? `\n[node name="Chrome" type="PanelContainer" parent="."]\nlayout_mode=2\n\n[node name="Body" type="${compositePlan.layout === "inline" ? "HBoxContainer" : "VBoxContainer"}" parent="Chrome"]\nlayout_mode=2\n${compositePlan.parts.map(part => `\n[node name="Part_${part}" type="PanelContainer" parent="Chrome/Body"]\nlayout_mode=2\n\n[node name="Slot" type="VBoxContainer" parent="Chrome/Body/Part_${part}"]\nlayout_mode=2\n`).join("")}` : "";
      // Receipt totality: every prop the shape declines is named in the receipt,
      // not only listed in `excludedProps`. The bounded shapes predate the
      // boundary, so their omissions are derived here; the newer shapes already
      // carry a curated list and this only appends what they missed.
      const excludedNames = Array.isArray((plan as { excluded?: string[] }).excluded) ? (plan as { excluded?: string[] }).excluded! : [];
      const namedOmissions = Array.isArray((plan as { omissions?: string[] }).omissions) ? [...(plan as { omissions?: string[] }).omissions!] : [];
      for (const prop of excludedNames) {
        if (namedOmissions.some(line => line === prop || line.startsWith(`${prop}:`) || line.startsWith(`${prop} `))) continue;
        namedOmissions.push(`${prop}: declined by the ${plan.operation} shape; no native realization on this target`);
      }
      return [
        { relativePath: `${ir.name}/${ir.name}.gd`, contents: script },
        { relativePath: `${ir.name}/${ir.name}.tscn`, contents: `[gd_scene load_steps=${isGlyph ? 2 : 3} format=3]\n\n[ext_resource type="Script" path="res://addons/full_stack_ds/components/${ir.name}/${ir.name}.gd" id="1"]\n${isGlyph ? "" : `[ext_resource type="Theme" path="res://addons/full_stack_ds/components/${ir.name}/theme.tres" id="2"]\n`}\n[node name="${ir.name}" type="VBoxContainer"]\nscript = ExtResource("1")\n${isGlyph ? "" : `theme = ExtResource("2")\n`}${compositeNodes}` },
        { relativePath: `${ir.name}/theme.tres`, contents: `[gd_resource type="Theme" format=3]\n\n[resource]\ndefault_font_size = 16\nButton/colors/font_color = Color(${rgb}, 1)\nLabel/colors/font_color = Color(${rgb}, 1)\n` },
        { relativePath: `${ir.name}/capabilities.json`, contents: JSON.stringify({ ...plan, theme: isGlyph ? "inherited Label font_color at render time" : isStatic ? "source-bearing static style subset" : isAction ? "source-bearing native action style subset" : isComposite ? "source-bearing native composite style subset" : isLoopVisual ? "authored ring colors and size/thickness carriers" : "unconditional foreground fallback only", otherStyling: isGlyph ? "contract size tokens and authored iconography SVG; screen-reader exposure requires separate proof" : isStatic ? "unlisted declarations fail generation; font metrics and letter spacing are target approximations" : isAction ? "unsupported declarations and selectors are listed in omissions; Godot font metrics and loading progress are target approximations" : isComposite ? "omissions list unsupported selectors and declarations; part text inheritance and motion are unproven" : isLoopVisual ? "arc rasterization approximates CSS border-top geometry; inline, delay, accessibility and OS preference remain unproved" : "unsupported", excludedProps: plan.excluded, ...(namedOmissions.length ? { omissions: namedOmissions } : {}), proof: "requires-runtime-witness" },null,2)+"\n" },
      ];
    },
    emitTests: () => [],
    emitTargetAssets: (irs, opts) => irs.some(ir => collectIconGlyphNodes(ir.dom).length) ? [godotGlyphCatalog(opts)] : [],
    emitBarrel: names => `extends RefCounted\nconst COMPONENTS = ${q(names.sort())}\n`,
  };
}
