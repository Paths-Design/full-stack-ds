/**
 * File projection for the wide Godot plan shapes.
 *
 * The bounded shapes (static content, action, composite, glyph, sequence,
 * control) each grew their projection inline in `factory.ts`. The generic
 * anatomy shape and the wider surface shape are additive: they take a plan
 * object and project it to the same four generated artifacts — script, scene,
 * theme, capability receipt — so the emitter keeps one output contract even as
 * the admitted set grows.
 *
 * Nothing here inspects IR facts. Emission is a pure function of the plan, so a
 * planner change is reviewable on its own and the scene text cannot diverge
 * from what the receipt claims.
 */
import type { GeneratedFile } from "../../emitter.js";
import type { ComponentIR } from "../../ir.js";
import type { GodotAnatomyPlan, GodotSceneNode, GodotSurfacePlan } from "./plan-types.js";

const q = JSON.stringify;

/** Godot scene syntax for one node line. `parent="."` means the scene root. */
function nodeLine(node: GodotSceneNode): string {
  return `\n[node name=${q(node.name)} type=${q(node.type)} parent=${q(node.parent)}]` +
    (node.text === undefined ? "" : `\ntext = ${q(node.text)}`);
}

function themeResource(color: string): string {
  const hex = color.slice(1);
  const rgb = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).join(", ");
  return `[gd_resource type="Theme" format=3]\n\n[resource]\ndefault_font_size = 16\nButton/colors/font_color = Color(${rgb}, 1)\nLabel/colors/font_color = Color(${rgb}, 1)\n`;
}

function sceneShell(ir: ComponentIR, rootType: string, nodes: GodotSceneNode[]): string {
  return `[gd_scene load_steps=3 format=3]\n\n` +
    `[ext_resource type="Script" path="res://addons/full_stack_ds/components/${ir.name}/${ir.name}.gd" id="1"]\n` +
    `[ext_resource type="Theme" path="res://addons/full_stack_ds/components/${ir.name}/theme.tres" id="2"]\n\n` +
    `[node name=${q(ir.name)} type=${q(rootType)}]\nscript = ExtResource("1")\ntheme = ExtResource("2")\n` +
    nodes.map(nodeLine).join("");
}

function scriptShell(ir: ComponentIR, runtime: string, configuration: unknown): string {
  return `@tool\nclass_name DS${ir.name}\nextends "res://addons/full_stack_ds/runtime/${runtime}.gd"\n\n` +
    `func _init() -> void:\n\tconfiguration = JSON.parse_string(${q(JSON.stringify(configuration))})\n`;
}

function capabilityFile(relativePath: string, payload: object): GeneratedFile {
  return { relativePath, contents: `${JSON.stringify(payload, null, 2)}\n` };
}

/**
 * Generic anatomy projection: one named node per scene node, the part hosts the
 * contract declares, and a receipt that names every excluded prop and every
 * unrealized semantic the planner could not lower.
 */
export function anatomyFiles(ir: ComponentIR, plan: GodotAnatomyPlan, color: string, defaults: Record<string, string> = {}): GeneratedFile[] {
  const rootType = plan.rootType;
  const configuration = {
    operation: plan.operation,
    parts: plan.parts,
    ...(plan.contentPart ? { contentPart: plan.contentPart } : {}),
    styles: plan.styles,
    projectedProps: plan.projectedProps,
    defaults,
    ...(plan.excluded.length ? { excludedProps: plan.excluded } : {}),
    omissions: plan.omissions,
    theme: "source-bearing anatomy style subset",
    otherStyling: "unmapped declarations and selectors are named in omissions; scene geometry is not CSS layout parity",
    proof: "requires-runtime-witness",
  };
  return [
    { relativePath: `${ir.name}/${ir.name}.gd`, contents: scriptShell(ir, "anatomy", configuration) },
    { relativePath: `${ir.name}/${ir.name}.tscn`, contents: sceneShell(ir, rootType, plan.sceneNodes) },
    { relativePath: `${ir.name}/theme.tres`, contents: themeResource(color) },
    capabilityFile(`${ir.name}/capabilities.json`, configuration),
  ];
}

/**
 * Wider surface projection: the shared overlay runtime plus a receipt naming the
 * modality, anchor and dismissal semantics this target does not realize.
 */
export function surfaceFiles(ir: ComponentIR, plan: GodotSurfacePlan, color: string, defaults: Record<string, string> = {}): GeneratedFile[] {
  const rootType = plan.rootType ?? "PanelContainer";
  const configuration = {
    operation: plan.operation,
    anchor: plan.anchor,
    modality: plan.modality,
    openTriggers: plan.openTriggers,
    defaults,
    ...(plan.excluded.length ? { excludedProps: plan.excluded } : {}),
    omissions: plan.omissions,
    theme: "source-bearing surface style subset",
    otherStyling: "unmapped declarations and selectors are named in omissions; overlay stacking is not CSS layout parity",
    proof: "requires-runtime-witness",
  };
  return [
    { relativePath: `${ir.name}/${ir.name}.gd`, contents: scriptShell(ir, "surface", configuration) },
    {
      relativePath: `${ir.name}/${ir.name}.tscn`,
      contents: `[gd_scene load_steps=3 format=3]\n\n` +
        `[ext_resource type="Script" path="res://addons/full_stack_ds/components/${ir.name}/${ir.name}.gd" id="1"]\n` +
        `[ext_resource type="Theme" path="res://addons/full_stack_ds/components/${ir.name}/theme.tres" id="2"]\n\n` +
        `[node name=${q(ir.name)} type=${q(rootType)}]\nscript = ExtResource("1")\ntheme = ExtResource("2")\n`,
    },
    { relativePath: `${ir.name}/theme.tres`, contents: themeResource(color) },
    capabilityFile(`${ir.name}/capabilities.json`, configuration),
  ];
}
