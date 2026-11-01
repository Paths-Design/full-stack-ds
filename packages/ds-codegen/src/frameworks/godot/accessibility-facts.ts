/**
 * Accessibility facts shared by the Godot plan shapes.
 *
 * Godot exposes accessible name/description/live plus controls/labeled-by/
 * described-by node relations — and no accessible role — so every shape projects
 * the same normalized facts and the boundary classifies what has no carrier.
 *
 * A relation is only projected when both of its ends are parts the shape hosts;
 * otherwise it is a named omission, never a silent drop.
 */
import type { ComponentIR } from "../../ir.js";

export interface GodotAccessibilityFacts {
  relationships?: { from: string; to: string; attribute: string }[];
  stateAria?: { category: string; attribute: string; values: Record<string, string | boolean> }[];
  labeling?: string[];
  role?: string;
}

export function godotAccessibilityFacts(ir: ComponentIR, hostedParts: ReadonlySet<string>): GodotAccessibilityFacts {
  const relationships = (ir.behavior.relationships ?? [])
    .filter(relation => typeof relation === "object" && relation && typeof relation.from === "string" && typeof relation.to === "string" && typeof relation.attribute === "string")
    .filter(relation => hostedParts.has(relation.from) && hostedParts.has(relation.to))
    .map(relation => ({ from: relation.from, to: relation.to, attribute: relation.attribute }));
  const stateAria = Object.entries(ir.states.dimensions ?? {})
    .filter(([, dimension]) => dimension?.a11y?.attribute)
    .map(([category, dimension]) => ({ category, attribute: dimension.a11y!.attribute, values: dimension.a11y!.values ?? {} }));
  const labeling = ir.root.labeling ?? [];
  const role = ir.root.rootRole;
  if (!relationships.length && !stateAria.length && !labeling.length && !role) return {};
  return {
    ...(relationships.length ? { relationships } : {}),
    ...(stateAria.length ? { stateAria } : {}),
    ...(labeling.length ? { labeling } : {}),
    ...(role ? { role } : {}),
  };
}
