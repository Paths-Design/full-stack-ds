// FIGMA-DIMENSIONAL-STATE-PLANNER-01
//
// A PURE planning layer. It consumes a generated Figma descriptor's dimensional
// state facts and emits a target-neutral Figma component-surface plan. It does
// NOT touch the Figma API, mutate the canvas, write component properties, create
// layers, or resolve tokens. Materialization is a separate, later slice that
// consumes this plan.
//
// The classification is driven by `values.length` and `category` (plus the
// structural facts `suppresses` / `a11y` / `derivesFrom`). It never branches on
// state-value NAMES — that is the lore the whole dimensional-states arc removed.
//
// Where a state cannot be faithfully lowered into a Figma control today, the
// planner emits an explicit RESIDUAL rather than guessing. Residuals are a
// first-class output: they name exactly which descriptor fact is still missing.

export type StateCategory =
  | "interaction"
  | "availability"
  | "selection"
  | "validation"
  | "data"
  | "visibility"
  | "motion"
  | "presentation";

// --- Planner input: a structural subset of a generated Figma descriptor. ---
// (Decoupled from the materializer's descriptor type, which lives in plugin.ts.)

/** Neutral state-surface effect — what the active state DOES (not Figma terms). */
export type StateEffect = "restyle" | "overlay" | "metadata" | "channel";

export interface PlannerStateDimension {
  category: StateCategory;
  values: string[];
  initial?: string;
  exclusive?: boolean;
  suppresses?: { categories?: StateCategory[]; names?: string[] };
  a11y?: { attribute: string; values?: Record<string, string | boolean> };
  derivesFrom?: Record<
    string,
    { selector?: string; attr?: string; channel?: string; prop?: string }
  >;
  /** Dimension-level effect fact. */
  effect?: StateEffect;
  /** Value-level effect override, keyed by dimension value (overrides `effect`). */
  valueEffects?: Record<string, StateEffect>;
}

export interface PlannerDescriptor {
  component: { name: string };
  states?: { dimensions?: Record<string, PlannerStateDimension> | null };
}

// --- Planner output: a target-neutral Figma realization plan. ---

export type DimensionLowering =
  /** Interaction-phase axis (pointer/focus). A variant/prototype axis, NOT a public component property. */
  | { kind: "interaction-axis"; activeValues: string[] }
  /** >=3 visual values -> a Figma variant axis. */
  | { kind: "variant-axis"; activeValues: string[] }
  /** 2 visual values, toggle-safe -> a Figma boolean component property. */
  | { kind: "boolean-property"; activeValue: string }
  /** Surfaced via a channel (data-state / aria-*), so omitted from Figma controls. */
  | { kind: "channel-bound"; channel: string; values: string[] }
  /** No Figma control surface (degenerate / informational). */
  | { kind: "metadata-only" };

export interface PlannedDimension {
  name: string;
  category: StateCategory;
  cardinality: number;
  activeValues: string[];
  initial?: string;
  lowering: DimensionLowering;
  /** Retained as plan metadata — NOT visual behavior. */
  a11y?: { attribute: string; values?: Record<string, string | boolean> };
}

export interface SuppressionRelation {
  sourceDimension: string;
  sourceValues: string[];
  suppressesCategories: StateCategory[];
  /** Dimensions in THIS component masked by the suppression. */
  suppressedDimensions: string[];
}

export type ResidualCode =
  /** A dimension value has no effect fact, so the lowering fell back to the
   *  category heuristic. Author effect/valueEffects to make it definitive. */
  | "effect-missing"
  /** A dimension's active values carry more than one distinct effect (e.g. some
   *  channel, some overlay); the precise per-value map is reported. */
  | "mixed-value-effects"
  /** A dimension has no active (non-initial) values to plan. */
  | "no-active-values";

export interface Residual {
  dimension: string;
  code: ResidualCode;
  reason: string;
  /** Structured detail: per-value effect map (mixed-value-effects) or the
   *  values lacking an effect fact (effect-missing). */
  detail?: Record<string, string> | string[];
}

export interface FigmaStatePlan {
  component: string;
  dimensions: PlannedDimension[];
  suppressions: SuppressionRelation[];
  residuals: Residual[];
}

// FALLBACK heuristic ONLY: categories whose active value typically restyles.
// Consulted solely when a dimension lacks an authored effect fact (and an
// effect-missing residual is emitted). Enriched dimensions never reach this.
const RESTYLE_CATEGORIES: ReadonlySet<StateCategory> = new Set([
  "availability",
  "validation",
  "selection",
]);

function activeValuesOf(dim: PlannerStateDimension): string[] {
  return dim.values.filter((v) => v !== dim.initial);
}

/** Dimension/value-level effect fact (valueEffects overrides effect). */
function effectOf(dim: PlannerStateDimension, value: string): StateEffect | null {
  return dim.valueEffects?.[value] ?? dim.effect ?? null;
}

/** Effect, treating a `derivesFrom.channel` as an implicit channel effect. */
function resolvedEffect(dim: PlannerStateDimension, value: string): StateEffect | null {
  const e = effectOf(dim, value);
  if (e) return e;
  return dim.derivesFrom?.[value]?.channel ? "channel" : null;
}

/**
 * Plan the Figma component-surface for one descriptor. Pure: same input → same
 * output, no side effects.
 */
export function planFigmaStateSurface(
  descriptor: PlannerDescriptor,
): FigmaStatePlan {
  const component = descriptor.component.name;
  const dims = descriptor.states?.dimensions ?? {};
  const dimNames = Object.keys(dims); // stable: object key insertion order

  const planned: PlannedDimension[] = [];
  const suppressions: SuppressionRelation[] = [];
  const residuals: Residual[] = [];

  for (const name of dimNames) {
    const dim = dims[name];
    const active = activeValuesOf(dim);
    const cardinality = dim.values.length;

    // Partition active values into channel-driven vs visual, using effect facts
    // (effect/valueEffects === "channel") plus the existing derivesFrom.channel.
    const channelValues: string[] = [];
    const visualValues: string[] = [];
    let channel: string | null = null;
    for (const v of active) {
      if (resolvedEffect(dim, v) === "channel") {
        channelValues.push(v);
        channel = channel ?? dim.derivesFrom?.[v]?.channel ?? name;
      } else {
        visualValues.push(v);
      }
    }

    let lowering: DimensionLowering;

    if (active.length === 0) {
      lowering = { kind: "metadata-only" };
      residuals.push({
        dimension: name,
        code: "no-active-values",
        reason: `${name} has only its initial value; nothing to lower into a Figma control.`,
      });
    } else if (channelValues.length === active.length) {
      // Fully channel-driven (e.g. Dialog openness) -> not a Figma control.
      lowering = { kind: "channel-bound", channel: channel!, values: channelValues };
    } else if (dim.category === "interaction") {
      // Interaction phase (pointer/focus). Separate axes so hover+focus is
      // representable while values within one axis stay mutually exclusive.
      lowering = { kind: "interaction-axis", activeValues: active };
    } else {
      // Visual classification driven by effect FACTS (not category heuristics).
      lowering = classifyVisualByEffect(dim, visualValues);
      const residual = effectResidual(dim, name, active);
      if (residual) residuals.push(residual);
    }

    planned.push({
      name,
      category: dim.category,
      cardinality,
      activeValues: active,
      initial: dim.initial,
      lowering,
      a11y: dim.a11y,
    });

    // Suppression is a cross-dimension RELATION, resolved against this
    // component's dimensions — never a layer deletion. Only the categories the
    // dimension declares (interaction, in practice) are suppressed; semantic
    // dimensions (selection/openness/loading/validation) are never collateral.
    if (dim.suppresses?.categories?.length || dim.suppresses?.names?.length) {
      const cats = dim.suppresses.categories ?? [];
      const names = dim.suppresses.names ?? [];
      for (const target of names) {
        if (!Object.prototype.hasOwnProperty.call(dims, target)) {
          throw new Error(`[STATE_SUPPRESSION_UNKNOWN_DIMENSION] ${component}.${name}: ${target}`);
        }
      }
      const suppressedDimensions = dimNames.filter(
        (other) => other !== name && (cats.includes(dims[other].category) || names.includes(other)),
      );
      suppressions.push({
        sourceDimension: name,
        sourceValues: active,
        suppressesCategories: cats,
        suppressedDimensions,
      });
    }
  }

  return { component, dimensions: planned, suppressions, residuals };
}

/**
 * Classify a dimension's VISUAL (non-channel) values into a Figma lowering from
 * authored effect facts: restyle -> variant axis; overlay -> boolean (when 2
 * effective values); metadata -> metadata-only. When the effect fact is missing,
 * fall back to the category heuristic (flagged via an effect-missing residual).
 * Never branches on value names.
 */
function classifyVisualByEffect(
  dim: PlannerStateDimension,
  visualValues: string[],
): DimensionLowering {
  if (visualValues.length === 0) return { kind: "metadata-only" };
  const effects = visualValues.map((v) => effectOf(dim, v));
  const effectiveVisual = visualValues.length + (dim.initial !== undefined ? 1 : 0);

  if (effects.some((e) => e == null)) {
    return fallbackHeuristic(dim, visualValues, effectiveVisual);
  }
  if (effects.every((e) => e === "metadata")) return { kind: "metadata-only" };
  if (effects.every((e) => e === "overlay") && effectiveVisual <= 2) {
    return { kind: "boolean-property", activeValue: visualValues[0] };
  }
  // restyle, >=3 values, or mixed visual effects -> a variant axis (faithful).
  return { kind: "variant-axis", activeValues: visualValues };
}

/** Category heuristic — consulted ONLY when an effect fact is missing. */
function fallbackHeuristic(
  dim: PlannerStateDimension,
  visualValues: string[],
  effectiveVisual: number,
): DimensionLowering {
  if (effectiveVisual >= 3) return { kind: "variant-axis", activeValues: visualValues };
  if (RESTYLE_CATEGORIES.has(dim.category) || dim.a11y) {
    return { kind: "variant-axis", activeValues: visualValues };
  }
  return { kind: "boolean-property", activeValue: visualValues[0] };
}

/**
 * Compute the residual for a visual/mixed dimension from its effect facts:
 * effect-missing when a value lacks a fact (lowering fell back to the heuristic);
 * mixed-value-effects when active values carry >1 distinct effect (precise map).
 */
function effectResidual(
  dim: PlannerStateDimension,
  name: string,
  active: string[],
): Residual | null {
  const map: Record<string, string> = {};
  const missing: string[] = [];
  for (const v of active) {
    const e = resolvedEffect(dim, v);
    if (e == null) missing.push(v);
    else map[v] = e;
  }
  if (missing.length > 0) {
    return {
      dimension: name,
      code: "effect-missing",
      reason: `${name} lacks an effect fact for: ${missing.join(", ")}. Lowered via the category heuristic; author effect/valueEffects to make it definitive.`,
      detail: missing,
    };
  }
  const distinct = new Set(Object.values(map));
  if (distinct.size > 1) {
    const pairs = Object.entries(map)
      .map(([v, e]) => `${v}=${e}`)
      .join(", ");
    return {
      dimension: name,
      code: "mixed-value-effects",
      reason: `${name} has heterogeneous value effects: ${pairs}. Overlay value(s) lower to a control; channel/metadata values are omitted.`,
      detail: map,
    };
  }
  return null;
}
