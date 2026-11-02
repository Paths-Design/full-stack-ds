/** Native Godot form hosts selected by normalized form and binding facts. */
import type { GeneratedFile } from "../../emitter.js";
import type { ComponentIR } from "../../ir.js";
import { nativeFormPlan, type NativeFormPlan } from "../native-form-plan.js";

export interface GodotFormPlan {
  operation: NativeFormPlan["kind"];
  form: NativeFormPlan;
  colors: Record<string, string>;
  excluded: string[];
  omissions: string[];
}

function styleOmissions(ir: ComponentIR, form: NativeFormPlan): string[] {
  const omitted: string[] = [];
  for (const rule of ir.nativeStyleRules?.rules ?? []) {
    if (rule.sourceKey === "tokens" || rule.sourceKey === "structure") continue;
    const hover = rule.predicates.some(predicate => predicate.kind === "hover" || predicate.kind === "active");
    for (const declaration of rule.declarations) {
      if (declaration.property.includes(".")) continue;
      const colorPaint = form.kind === "text-input"
        ? ["background-color", "color", "border-color"].includes(declaration.property) && !hover
        : declaration.property === "color" && rule.predicates.length === 0;
      if (!colorPaint) omitted.push(`style ${rule.sourceKey}/${declaration.property}: no native form paint carrier`);
    }
  }
  for (const unsupported of ir.nativeStyleRules?.unsupported ?? []) {
    omitted.push(`style ${unsupported.sourceKey}: ${unsupported.reason}`);
  }
  return omitted;
}

function color(ir: ComponentIR, property: string, state: "base" | "invalid" | "focus" | "disabled"): string | undefined {
  const rules = ir.nativeStyleRules?.rules ?? [];
  for (const rule of rules) {
    const predicates = rule.predicates;
    const selected = state === "base" ? predicates.length === 0 && rule.sourceKey !== "tokens" :
      state === "invalid" ? predicates.some(p => p.kind === "variant" && p.axis === "invalid" && p.value === "true") :
      state === "focus" ? predicates.some(p => p.kind === "focus") && !predicates.some(p => p.kind === "variant" && p.axis === "invalid") :
      predicates.some(p => p.kind === "disabled" || (p.kind === "variant" && p.axis === "disabled" && p.value === "true"));
    if (!selected) continue;
    const value = rule.declarations.find(d => d.property === property)?.value;
    if (value && /^#[0-9a-f]{6}$/i.test(value)) return value;
  }
  return undefined;
}

function tokenColor(ir: ComponentIR, property: string): string | undefined {
  for (const rule of ir.nativeStyleRules?.rules ?? []) {
    const value = rule.declarations.find(d => d.property === property)?.value;
    if (value && /^#[0-9a-f]{6}$/i.test(value)) return value;
  }
  return undefined;
}

export function godotFormPlan(ir: ComponentIR): GodotFormPlan | undefined {
  const form = nativeFormPlan(ir);
  if (!form) return undefined;
  if (form.kind === "associated-label") {
    const foreground = color(ir, "color", "base") ?? tokenColor(ir, "label.color.text");
    if (!foreground) throw new Error(`GODOT_FORM_STYLE: ${ir.name} has no label foreground source`);
    return {
      operation: form.kind, form, colors: { foreground },
      excluded: form.formProp ? [form.formProp] : [],
      omissions: ["HTML form ownership is not projected", "screen-reader label association requires separate proof", ...styleOmissions(ir, form)],
    };
  }
  const background = color(ir, "background-color", "base");
  const foreground = color(ir, "color", "base");
  const border = color(ir, "border-color", "base");
  const invalid = color(ir, "border-color", "invalid");
  if (!background || !foreground || !border || !invalid) {
    throw new Error(`GODOT_FORM_STYLE: ${ir.name} lacks a source-bearing base or invalid color`);
  }
  const optional = {
    placeholder: tokenColor(ir, "input.color.text.placeholder"),
    focus: color(ir, "border-color", "focus"),
    disabledBackground: color(ir, "background-color", "disabled"),
    disabledForeground: color(ir, "color", "disabled"),
    disabledBorder: color(ir, "border-color", "disabled"),
  };
  const colors = { background, foreground, border, invalid,
    ...Object.fromEntries(Object.entries(optional).filter((entry): entry is [string, string] => entry[1] !== undefined)) };
  return {
    operation: form.kind, form, colors,
    excluded: [form.typeProp, form.nameProp, form.requiredProp, form.ariaLabelProp, form.ariaLabelledbyProp].filter((value): value is string => !!value),
    omissions: [
      ...[form.typeProp, form.nameProp, form.requiredProp].filter((value): value is string => !!value)
        .map(prop => `${prop}: HTML form submission or validation has no native projection`),
      ...[form.ariaLabelProp, form.ariaLabelledbyProp].filter((value): value is string => !!value)
        .map(prop => `${prop}: assistive-technology naming relation is not projected`),
      ...styleOmissions(ir, form),
    ],
  };
}

export function godotFormFiles(ir: ComponentIR, plan: GodotFormPlan): GeneratedFile[] {
  const text = plan.form.kind === "text-input";
  const config = { operation: plan.operation, form: plan.form, colors: plan.colors, excludedProps: plan.excluded,
    omissions: plan.omissions, theme: "source-bearing native form colors", proof: "requires-runtime-witness" };
  const runtime = text ? "text_input" : "associated_label";
  const host = text ? "LineEdit" : "Label";
  const script = `@tool\nclass_name DS${ir.name}\nextends "res://addons/full_stack_ds/runtime/${runtime}.gd"\n\nfunc _init() -> void:\n\tconfiguration = JSON.parse_string(${JSON.stringify(JSON.stringify(config))})\n`;
  const scene = `[gd_scene load_steps=3 format=3]\n\n[ext_resource type="Script" path="res://addons/full_stack_ds/components/${ir.name}/${ir.name}.gd" id="1"]\n[ext_resource type="Theme" path="res://addons/full_stack_ds/components/${ir.name}/theme.tres" id="2"]\n\n[node name=${JSON.stringify(ir.name)} type=${JSON.stringify(host)}]\nscript = ExtResource("1")\ntheme = ExtResource("2")\n`;
  const foreground = plan.colors.foreground;
  const rgb = [1, 3, 5].map(start => parseInt(foreground.slice(start, start + 2), 16) / 255).join(", ");
  const theme = `[gd_resource type="Theme" format=3]\n\n[resource]\ndefault_font_size = 16\n${host}/colors/font_color = Color(${rgb}, 1)\n`;
  return [
    { relativePath: `${ir.name}/${ir.name}.gd`, contents: script },
    { relativePath: `${ir.name}/${ir.name}.tscn`, contents: scene },
    { relativePath: `${ir.name}/theme.tres`, contents: theme },
    { relativePath: `${ir.name}/capabilities.json`, contents: `${JSON.stringify(config, null, 2)}\n` },
  ];
}
