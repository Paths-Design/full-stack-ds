/**
 * Plan shapes shared by the Godot emitter's bounded-shape planners.
 *
 * The Godot planner dispatches on IR facts, never on component identity: a
 * shape planner inspects `ComponentIR` and either returns a plan or declines
 * (`undefined`) so the next planner in the chain gets a chance. Refusals are
 * typed (`GODOT_UNSUPPORTED_*`) and only raised for facts no admitted planner
 * can represent honestly.
 *
 * A plan may not silently drop a contract fact. Anything the target does not
 * lower is named twice: once in `excluded` (the prop axis receipt) and once in
 * `omissions` (the human-readable non-claim). `boundary.ts` decides whether a
 * plan is allowed to exclude a given fact at all; a planner that returns a plan
 * for a fact the support boundary marks `lowered` is a discipline bug and the
 * capability audit reports it.
 */

/** One node in a generated Godot scene tree, flattened so emission stays a
 * pure string projection. `parent` uses Godot's scene syntax ("." is the root
 * node, "Chrome/Body" is a nested host). */
export interface GodotSceneNode {
  /** Node name inside the generated `.tscn`. */
  name: string;
  /** Godot class instantiated for this node. */
  type: string;
  /** Parent node path, or "." for a direct child of the scene root. */
  parent: string;
  /** Contract part this node hosts, when it is a named part host. */
  part?: string;
  /** Literal display text the node starts with, when the contract pins one. */
  text?: string;
}

/** A projected native style declaration, mirroring the composite plan shape so
 * the runtime can resolve the same way across shapes. */
export interface GodotStyleDeclaration {
  property: string;
  value: string;
  token?: string;
  designSlot?: string;
}

export interface GodotStyleRule {
  source: string;
  part: string;
  predicates: unknown[];
  declarations: GodotStyleDeclaration[];
}

/**
 * Generic anatomy plan: a component whose IR carries an arbitrary DOM/part tree
 * that is not one of the specialised bounded shapes (static text/rule, action,
 * composite, glyph, sequence, checkbox-style control).
 *
 * `sceneNodes` are the *named* nodes only. Anonymous wrapper elements are
 * flattened into the nearest named ancestor so a consumer never sees generated
 * ids that the contract does not declare.
 */
export interface GodotAnatomyPlan {
  operation: "anatomy";
  /** Root node class for the generated scene. */
  rootType: string;
  /** Named nodes, root children first; emission preserves this order. */
  sceneNodes: GodotSceneNode[];
  /** Contract part names hosted by the scene, in contract order. */
  parts: string[];
  /** Part whose children accept consumer children, when the contract declares one. */
  contentPart?: string;
  /** Projected native style rules, resolved by the shared runtime. */
  styles: GodotStyleRule[];
  /** Props projected into the control configuration rather than the scene. */
  projectedProps: string[];
  /** Prop axis receipt: props this shape does not realize. */
  excluded: string[];
  /** Focus outlines projected from `:focus-visible` rules onto part hosts. */
  focusRings?: { part: string; width: number; color: string; offset: number }[];
  /** Named non-claims; never empty when the plan diverges from the contract. */
  omissions: string[];
}

/**
 * Anchored/overlay surface plan. The existing control shape only admitted a
 * part-anchored, non-blocking, click-opened surface; this plan carries the
 * wider families (blocking modals, transient toasts, inline command centres,
 * non-anchored tooltips) with their unrealized semantics named in `omissions`.
 */
export interface GodotSurfacePlan {
  operation: "surface";
  /** Root node class for the generated scene; the `surface.gd` runtime base
   * must be compatible with it. Defaults to "PanelContainer". */
  rootType?: string;
  /** What the surface is anchored to; `none` for viewport-level overlays. */
  anchor: "part" | "none";
  /** Modality the contract declares, so the receipt cannot misreport it. */
  modality: string;
  /** Triggers the contract declares. */
  openTriggers: string[];
  /** Prop axis receipt: props this shape does not realize. */
  excluded: string[];
  /** Named non-claims (focus trap, dismissal, stacking, animation, ...). */
  omissions: string[];
}
