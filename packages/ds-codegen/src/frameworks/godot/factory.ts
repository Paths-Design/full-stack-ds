import fs from "node:fs";
import path from "node:path";
import type { FrameworkEmitter } from "../../emitter.js";
import type { ComponentIR, DomNodeIR } from "../../ir.js";
import { isPartAnchoredSurface } from "../../semantics.js";
const q = JSON.stringify;
const handled = new Set(["checked","defaultChecked","onChange","open","defaultOpen","onOpenChange","value","defaultValue","onValueChange","disabled","collapsible","type","orientation","activationMode","loop","unmountInactive","appearance","placement","closeOnEscape","closeOnOutsideClick","closeOnBlur"]);
// Explicit pilot exclusions are visible in the emitted capability receipt.
const excluded = new Set(["size", "name", "idBase"]);
export function godotPlan(ir: ComponentIR) {
  if (ir.motion.sequence) return godotSequencePlan(ir);
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
  const variantProps = Object.keys(ir.variants);
  for (const p of ir.styledProps) if (!realized.has(p.name) && !variantProps.includes(p.name)) throw new Error(`GODOT_UNSUPPORTED_PROP: ${ir.name}.${p.name}`);
  const nodes: DomNodeIR[] = [];
  const walk = (node: DomNodeIR) => { nodes.push(node); if (!node.componentRef) node.children.forEach(walk); };
  if (ir.dom) walk(ir.dom);
  const owns = (node: DomNodeIR | undefined, part: string): boolean => !!node && (node.part === part || (!node.componentRef && node.children.some(child => owns(child, part))));
  for (const progress of sequence.progress) {
    const host = progress.effect === "elapsed-width" ? sequence.picker : sequence.next;
    if (!owns(nodes.find(node => node.part === host), progress.target.part)) throw new Error(`GODOT_UNSUPPORTED_PROGRESS_HOST: ${ir.name}.${progress.target.part}`);
  }
  const names = Object.fromEntries((["previous", "next"] as const).map(key => {
    const node = nodes.find(n => n.part === sequence[key]);
    const name = node?.attrs["aria-label"];
    if (!name || node?.bindings["aria-label"]) throw new Error(`GODOT_UNSUPPORTED_SEQUENCE_LABEL: ${ir.name}.${sequence[key]}`);
    return [key, name];
  }));
  return { operation: "sequence", excluded: variantProps, sequence, channel, nameProp, names };
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
      const config = { ...(isSequence ? plan : { operation: plan.operation }), defaults, theme_color: themeColor(ir) };
      const script = `${isSequence ? "" : "@tool\n"}class_name DS${ir.name}\nextends "res://addons/full_stack_ds/runtime/${isSequence ? "sequence" : "control"}.gd"\n\nfunc _init() -> void:\n\tconfiguration = JSON.parse_string(${q(JSON.stringify(config))})\n${isSequence ? "" : `\tlabel = ${q(ir.name)}\n`}`;
      const hex = themeColor(ir).slice(1);
      const rgb = [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).join(", ");
      return [
        { relativePath: `${ir.name}/${ir.name}.gd`, contents: script },
        { relativePath: `${ir.name}/${ir.name}.tscn`, contents: `[gd_scene load_steps=3 format=3]\n\n[ext_resource type="Script" path="res://addons/full_stack_ds/components/${ir.name}/${ir.name}.gd" id="1"]\n[ext_resource type="Theme" path="res://addons/full_stack_ds/components/${ir.name}/theme.tres" id="2"]\n\n[node name="${ir.name}" type="VBoxContainer"]\nscript = ExtResource("1")\ntheme = ExtResource("2")\n` },
        { relativePath: `${ir.name}/theme.tres`, contents: `[gd_resource type="Theme" format=3]\n\n[resource]\ndefault_font_size = 16\nButton/colors/font_color = Color(${rgb}, 1)\nLabel/colors/font_color = Color(${rgb}, 1)\n` },
        { relativePath: `${ir.name}/capabilities.json`, contents: JSON.stringify({ ...plan, theme: "unconditional foreground fallback only", otherStyling: "unsupported", excludedProps: plan.excluded, proof: "requires-runtime-witness" },null,2)+"\n" },
      ];
    },
    emitTests: () => [],
    emitBarrel: names => `extends RefCounted\nconst COMPONENTS = ${q(names.sort())}\n`,
  };
}
