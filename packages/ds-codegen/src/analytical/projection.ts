/**
 * The bounded stage-3 experiment (REL-PROJECTION-EXPERIMENT-01).
 *
 * THE QUESTION, from the doctrine's stage-3 precommit: given ONE fixed
 * analytical authority — relation, derivation and task held fixed — does the
 * system independently enumerate at least two STRUCTURALLY DIFFERENT lawful
 * projection programs, with shared claims identifiable, losses explicit, and
 * non-empty target-specific residue, with no form name participating in the
 * derivation?
 *
 * This module is an ENUMERATOR, not a catalogue. It never asks "is this form
 * legal". It builds the candidate space as the PRODUCT of the declared
 * projection choices — coordinate space x the channel each task-bearing
 * variable is assigned to — and then filters that product by channel capacity
 * and by the invariants the declared task must preserve. Anything a human would
 * call a chart is downstream of that filter and is never an input to it
 * (invariant 1: no form name below L4).
 *
 * The experiment runs against a basis whose stage-2 ratification is OPEN, and
 * that is a recorded sequencing decision, not an oversight: see the spec's
 * entry record. Nothing here ratifies a coordinate, and a successful result is
 * NOT retrospective proof that any coordinate in the representation is
 * necessary.
 *
 * A program is a POINT in the product space, so it is a claim-bearing object in
 * its own right. The claims it actually induces are DERIVED from its
 * assignments, baseline and structure by `inducedClaims`; the `claims` field is
 * only what an author says about it. Two observers below read those two things
 * apart, because an observer that reads the declaration is the false pass this
 * experiment exists to rule out.
 */
import fs from "node:fs";
import path from "node:path";
import { RelationalStructure as RelationalStructureSchema } from "./relation-model.js";
import type { AggregateOp, FieldDecl, RelationDecl, RelationalStructure, TemporalityDecl, Transformation, UnitDecl } from "./relation-model.js";
import type { GraphResult } from "./graph-projection.js";
import { judge } from "./engines.js";
import { codesOf, termsOf } from "./judgment.js";
import { COMPOSITION_DIAG, DIAG, OBLIGATION, QUALIFIED_DIAG } from "./codes.js";
import { CONTRACTS_DIR, loadOracle } from "./necessity.js";

/* ------------------------------------------------------------------ types */

export type CoordinateSpace =
  | "cartesian"
  | "polar"
  | "tabular"
  | "lane"
  | "geographic"
  | "containment"
  | "non-metric";

export type Channel =
  | "position"
  | "length"
  | "area"
  | "angle"
  | "hue"
  | "luminance"
  | "shape"
  | "texture"
  | "connection"
  | "containment"
  | "order"
  | "text";

export type Task =
  | "magnitude-comparison"
  | "composition"
  | "distribution"
  | "change-over-time"
  | "correlation"
  | "ranking"
  | "topology"
  | "flow"
  | "lookup-rollup"
  | "trend";

/** The invariant a projection serving the task must preserve. */
export type Claim =
  | "ratio-comparability"
  | "difference-comparability"
  | "value-recoverable"
  | "partition-membership"
  | "aggregate-magnitude"
  /** The incidence of a graph is carried, so a topology task can be served by it. */
  | "incidence-recoverable"
  /**
   * A facet's panels can be read against each other. This is the claim a
   * `shared` scale policy asserts and a `free` policy trades away for
   * resolution, and it is the ONLY thing the two policies differ by.
   */
  | "cross-panel-comparability";

export type BaselineDecl = "zero" | "truncated";

/**
 * The analytical operation a projection DISPLAYS, carried as a bound object.
 *
 * A topology alone does not say which analysis it shows. The same coordinate and
 * channel assignment can display a sum taken over one dimension, a sum taken
 * over another, or the raw observations; those are different analytical claims
 * with the same picture. Binding the operation is what lets a consumer recover
 * the displayed values and an observer check them, instead of a later consumer
 * choosing the analysis or a claim label standing in for it.
 */
export type BoundOperation = {
  relation: string;
  field: string;
  op: AggregateOp;
  /** The dimensions the aggregate is taken OVER. */
  along: string[];
  /** The grain of the RESULT: the declared grain minus `along`. */
  resultGrain: string[];
};

/** A supplied row of the population a consumer is exercised over. */
export type Row = Record<string, number | string>;

export type GroupValue = { key: string; value: number };
export type OperationResult = { grain: string[]; groups: GroupValue[]; total: number };

/** The admitted assertion, carried into the projection boundary. */
export type AggregateAssertionDecl = { relation: string; field: string; op: AggregateOp; along?: readonly string[] };

export function bindOperation(structure: RelationalStructure, assertion: AggregateAssertionDecl): BoundOperation {
  const rel = structure.relations[assertion.relation];
  if (!rel) throw new Error(`the bound operation names relation ${assertion.relation}, which the structure does not declare`);
  const grain = Array.isArray(rel.grain) ? [...rel.grain] : [];
  if (grain.length === 0) throw new Error("the bound operation needs a declared grain: without it the result grain is not established");
  const along = [...(assertion.along ?? [])].sort();
  const resultGrain = grain.filter((g) => !along.includes(g)).sort();
  if (resultGrain.length === 0) throw new Error("the operation sums over every grain column, so it has no result grain to display");
  return { relation: assertion.relation, field: assertion.field, op: assertion.op, along, resultGrain };
}

/**
 * Whether an operation is one this experiment can carry, judged against the
 * relation the operation NAMES — the name included, because an operation for a
 * different relation is not the admitted one however well its grain equation
 * happens to fit.
 *
 * Three-valued, because the doctrine's grain rule is: an UNKNOWN grain is a
 * value and makes grain-dependent judgments unproven, it does not block. A
 * declaration that contradicts the operation is refused; a premise that is
 * missing is carried.
 */
export type OperationAdmission =
  | { kind: "admitted"; facts: ResultFacts }
  | { kind: "unproven"; obligation: string; reason: string };

/** The assertion an operation makes, in the analytical grammar's own terms. */
export const assertionFor = (op: BoundOperation): AggregateAssertionDecl & { kind: "aggregate" } => ({
  kind: "aggregate",
  relation: op.relation,
  field: op.field,
  op: op.op,
  ...(op.along.length > 0 ? { along: [...op.along] } : {}),
});

/**
 * SEMANTIC ADMISSION runs the EXISTING analytical authority over the exact
 * assertion the operation makes. Structural resolution answers "does this
 * operation resolve against the structure"; it does not answer "do the declared
 * facts forbid it", and a structural pass must never stand in for that judgment:
 * a cross-date sum over a measure declared non-additive along date resolves
 * perfectly and is still a lie the corpus can name.
 */
export type OperationJudgment =
  | { kind: "admitted"; facts: ResultFacts }
  | { kind: "refused"; causes: string[]; reason: string }
  | { kind: "unproven"; obligation: string; reason: string };

/**
 * The same judgment, returned rather than thrown. A COMPOSITE has to report WHY
 * a part is not retained and carry the part's own cause, and a cause read back
 * out of an exception message would be a second, lossier definition of the same
 * decision. `admitOperation` is this function plus the throw, so there is one
 * rule and one place it is written.
 */
export function judgeOperation(structure: RelationalStructure, op: BoundOperation, evidence?: unknown): OperationJudgment {
  const refuse = (reason: string): OperationJudgment => ({ kind: "refused", causes: [], reason });
  const illegal = (causes: string[], reason: string): OperationJudgment => ({ kind: "refused", causes, reason });
  if (op.op !== "sum") return refuse(`the executable contract is sum, and this operation names ${op.op}`);
  const rel = structure.relations[op.relation];
  if (!rel) return refuse(`the operation names relation ${op.relation}, which the structure does not declare`);
  if (!Array.isArray(rel.grain)) {
    return { kind: "unproven", obligation: "grain:declared", reason: `${op.relation} declares no grain, so the result grain is not established` };
  }
  const grain = [...rel.grain];
  if (grain.length === 0) return { kind: "unproven", obligation: "grain:declared", reason: `${op.relation} declares an empty grain` };
  const field = rel.fields?.[op.field];
  if (!field) return refuse(`the operation aggregates ${op.relation}.${op.field}, which the relation does not declare`);
  const stray = op.along.filter((a) => !grain.includes(a));
  if (stray.length > 0) return refuse(`the operation sums over ${stray.join(", ")}, which the declared grain does not contain`);
  const expected = grain.filter((g) => !op.along.includes(g)).sort();
  if (JSON.stringify(expected) !== JSON.stringify([...op.resultGrain].sort())) {
    return refuse(`the result grain [${op.resultGrain.join(", ")}] is not the declared grain minus the summed-over dimensions [${expected.join(", ")}]`);
  }
  if (op.resultGrain.length === 0) return refuse("the operation has no result grain to display");
  if (op.resultGrain.length !== 1) return refuse(`the bounded experiment projects a single result-grain column, and this operation produces ${op.resultGrain.length}`);
  const groupField = rel.fields?.[op.resultGrain[0]];
  if (!groupField) return refuse(`the result grain names ${op.resultGrain[0]}, which ${op.relation} does not declare as a field`);

  // The judgment, from the same engine that judges the corpus. An ILLEGAL
  // operation is refused with the corpus's own causes; an UNPROVEN one is
  // carried, because a missing premise is not a contradiction.
  const judgment = judge(structure, [assertionFor(op) as never], evidence as never);
  if (judgment.status === "illegal") {
    const causes = codesOf(judgment);
    return illegal(causes, `the analytical rules forbid it: ${causes.join(", ") || "no diagnostic named"}`);
  }
  if (judgment.status === "unproven") {
    const terms = termsOf(judgment);
    return { kind: "unproven", obligation: terms[0] ?? "unknown", reason: `the analytical rules leave this operation unproven (${terms.join(", ") || "no obligation named"})` };
  }
  return { kind: "admitted", facts: resultFactsOf(op, rel, field, groupField) };
}

export function admitOperation(structure: RelationalStructure, op: BoundOperation, evidence?: unknown): OperationAdmission {
  const j = judgeOperation(structure, op, evidence);
  if (j.kind === "refused") throw new Error(`the admitted operation is refused: ${j.reason}`);
  return j;
}

/** The result of an admitted operation, as facts the projection filters on. */
function resultFactsOf(op: BoundOperation, rel: RelationDecl, field: FieldDecl, groupField: FieldDecl): ResultFacts {
  return {
    sourceRelation: op.relation,
    sourceGrain: rel.grain,
    resultGrain: [...op.resultGrain],
    // The projection assigns the RESULT's own columns, never a source column the
    // operation aggregated away.
    dimension: {
      field: op.resultGrain[0],
      transformation: groupField.transformation,
      key: groupField.key === true,
      cyclic: groupField.cyclic === true,
      ...(groupField.unit ? { unit: groupField.unit } : {}),
      // Carried only where declared. A field with no temporality contributes no
      // temporal fact, and nothing downstream may read a default out of its
      // absence.
      ...(groupField.temporality ? { temporality: groupField.temporality } : {}),
    },
    measure: {
      field: resultFieldName(op),
      transformation: field.transformation,
      additivityKind: field.additivity?.kind,
      nonAdditiveAlong: field.additivity?.kind === "semi-additive" ? field.additivity.nonAdditiveAlong : [],
      cyclic: field.cyclic === true,
      ...(field.unit ? { unit: field.unit } : {}),
      ...(field.temporality ? { temporality: field.temporality } : {}),
    },
  };
}

/** The name the aggregate result carries, since it is not a declared column. */
export const resultFieldName = (op: BoundOperation): string => `${op.op}(${op.field})`;

/** Structural identity of two bindings. A binding is a claim, so it compares by value. */
export function matchesAdmitted(program: BoundOperation, admitted: BoundOperation): boolean {
  const same = (a: readonly string[], b: readonly string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  return (
    program.relation === admitted.relation &&
    program.field === admitted.field &&
    program.op === admitted.op &&
    same(program.along, admitted.along) &&
    same(program.resultGrain, admitted.resultGrain)
  );
}

/**
 * The operation evaluated over a supplied population. This is the INDEPENDENT
 * side of every consumer check: expected values come from here, never from the
 * classification function that decides whether a candidate is admitted.
 */
export function evaluateOperation(op: BoundOperation, rows: readonly Row[]): OperationResult {
  // The executable contract is NARROWED, not quietly widened: an aggregate this
  // evaluator cannot perform is refused. Reading `op` for grouping while
  // ignoring `op.op` would execute every named aggregate as a sum.
  if (op.op !== "sum") throw new Error(`the bounded evaluator performs sum, and this operation names ${op.op}`);
  const sums = new Map<string, number>();
  for (const row of rows) {
    const key = op.resultGrain.map((g) => String(row[g] ?? "")).join("|");
    const v = row[op.field];
    if (typeof v !== "number") throw new Error(`a supplied row does not carry a numeric ${op.field}`);
    sums.set(key, (sums.get(key) ?? 0) + v);
  }
  const groups = [...sums.entries()].map(([key, value]) => ({ key, value })).sort((x, y) => x.key.localeCompare(y.key));
  return { grain: op.resultGrain, groups, total: groups.reduce((n, g) => n + g.value, 0) };
}

/** A program is a point in the projection product space. */
export type Program = {
  coordinate: CoordinateSpace;
  dimension: Channel;
  measure: Channel;
  baseline: BaselineDecl;
  task: Task;
  /** What the author SAYS it preserves. Never the thing the observer reads. */
  claims: Claim[];
  /** The admitted operation this program displays. A program without one is not retained. */
  operation: BoundOperation;
};

export type Refusal = { program: Program; cause: string; detail: string };
export type Undecided = { program: Program; obligation: string; detail: string };

export type Enumeration = {
  /**
   * How the product was disposed of, so a closure statement names its
   * POST-EXCLUSION population rather than implying every triple was judged:
   * `considered` is every coordinate/channel/channel triple the inventory can
   * host, `excluded` are the ones a channel has no slot for at all, and
   * `disposed` is considered minus excluded - the set the three arrays below
   * partition.
   */
  /**
   * The support decision taken before any candidate existed. REQUIRED, so a
   * consumer cannot read `retained`/`refused` without the disposition the run
   * was made under being present in the same object.
   */
  support: SupportDecision;
  population: { considered: number; excluded: number; disposed: number };
  retained: Program[];
  refused: Refusal[];
  undecided: Undecided[];
};

export type TargetInventory = {
  id: string;
  channels: readonly Channel[];
  spaces: readonly CoordinateSpace[];
};

/**
 * The facts the projection rules are allowed to read, derived from the ADMITTED
 * operation and the relation it names. `dimension` and `measure` are columns of
 * the RESULT: the group key the operation produced and the aggregate itself.
 * Reading source columns here would let the projection assign a field the
 * operation already aggregated away.
 */
export type ResultFacts = {
  sourceRelation: string;
  sourceGrain: unknown;
  resultGrain: string[];
  dimension: {
    field: string;
    transformation: Transformation;
    key: boolean;
    cyclic: boolean;
    unit?: UnitDecl;
    /**
     * The declared temporal kind of the RESULT's group column, carried from the
     * field declaration. TRANSPORT, not interpretation: an `interval` kind here
     * says the observation extends over its period; it does not say the consumer
     * can obtain an extent or a duration, and an absent declaration stays absent
     * rather than defaulting to an instant.
     */
    temporality?: TemporalityDecl;
  };
  measure: {
    field: string;
    transformation: Transformation;
    additivityKind?: string;
    nonAdditiveAlong: string[];
    cyclic: boolean;
    /**
     * The unit the SOURCE field declares. It rides on the facts because a
     * composite that shares a scale has to decide commensurability, and that is
     * decided by declared units rather than by dimension. Absent means the
     * declaration does not carry the fact, which leaves commensurability
     * unproven rather than false.
     */
    unit?: UnitDecl;
    /** The measure field's declared temporal kind, carried on the same terms as the dimension's. */
    temporality?: TemporalityDecl;
  };
};

/* --------------------------------------------------- capacities and tasks */

type Capacity = {
  /** Transformations the channel may carry at all. */
  carries: readonly Transformation[];
  /** Angle is licensed only by a cyclic scale or a declared whole. */
  requiresCyclicOrWhole?: boolean;
  /** Position and length make a ratio claim only over a declared zero baseline. */
  zeroBaselineForRatio?: boolean;
  /** A channel that keeps the value readable makes no positional claim. */
  valueReadback?: boolean;
  /** Coordinate spaces that can host the channel. */
  spaces: readonly CoordinateSpace[];
};

/**
 * Channel capacities as TYPE RULES, distinct from perceptual effectiveness
 * ranking: "hue cannot carry order" is a licensing fact, "position is read more
 * accurately than area" is a preference. Only the first is enforced here.
 */
export const CAPACITY: Record<Channel, Capacity> = {
  position: { carries: ["nominal", "ordinal", "interval", "ratio"], zeroBaselineForRatio: true, spaces: ["cartesian", "polar", "lane", "geographic"] },
  length: { carries: ["ratio"], zeroBaselineForRatio: true, spaces: ["cartesian", "polar", "lane"] },
  area: { carries: ["ratio"], spaces: ["cartesian", "geographic"] },
  angle: { carries: ["ordinal", "interval", "ratio"], requiresCyclicOrWhole: true, spaces: ["polar"] },
  hue: { carries: ["nominal"], spaces: ["cartesian", "polar", "tabular", "lane", "geographic", "non-metric"] },
  luminance: { carries: ["ordinal", "ratio"], spaces: ["tabular", "cartesian", "geographic"] },
  shape: { carries: ["nominal"], spaces: ["cartesian", "polar", "non-metric"] },
  texture: { carries: ["nominal"], spaces: ["cartesian", "polar", "tabular", "non-metric"] },
  connection: { carries: ["nominal"], spaces: ["non-metric", "cartesian"] },
  containment: { carries: ["nominal", "ordinal"], spaces: ["containment"] },
  order: { carries: ["ordinal"], spaces: ["tabular", "lane"] },
  text: { carries: ["nominal", "ordinal", "interval", "ratio"], valueReadback: true, spaces: ["tabular", "cartesian", "lane", "containment"] },
};

/**
 * The invariants each task must preserve, from the doctrine's task table. The
 * eight entries this experiment does not implement are marked rather than
 * silently absent, so their absence is a recorded obligation and not a gap
 * that reads as "no preconditions".
 */
export const TASK_INVARIANTS: Record<Task, { requires: Claim[] } | { notEnumerated: string }> = {
  "magnitude-comparison": { requires: ["ratio-comparability"] },
  composition: { requires: ["partition-membership", "aggregate-magnitude"] },
  distribution: { notEnumerated: "invariant:declared-closure" },
  "change-over-time": { notEnumerated: "invariant:interpolation-policy" },
  correlation: { notEnumerated: "invariant:position-non-meaningful" },
  ranking: { notEnumerated: "invariant:shared-ordering" },
  topology: { requires: ["incidence-recoverable"] },
  flow: { notEnumerated: "invariant:conservation" },
  "lookup-rollup": { notEnumerated: "invariant:structure-preserved" },
  trend: { notEnumerated: "invariant:position-non-meaningful" },
};

/* ------------------------------------------------------- result-kind support */

/**
 * WHICH ANALYTICAL RESULT KIND IS BEING PROJECTED.
 *
 * The task table is shared, and that is a trap: `topology` carries a `requires`
 * entry because the GRAPH path implements it, and reading that entry as "the
 * relation path implements topology too, its candidates just fail the
 * requirement" turns absent implementation into an analytical judgment. Support
 * is therefore decided per (result kind, task) and never inferred from the task
 * table alone.
 */
export type ResultKind = "relation" | "graph";

export const RESULT_KINDS: readonly ResultKind[] = ["relation", "graph"];

/**
 * The tasks each result kind actually implements. This is the ONLY place that
 * answers "can this path enumerate this question", and it is consulted BEFORE
 * any candidate exists.
 */
export const IMPLEMENTED_TASKS: Record<ResultKind, readonly Task[]> = {
  relation: ["magnitude-comparison", "composition"],
  graph: ["topology"],
};

/**
 * The support decision. The SUPPORTED arm carries the task's requirements, so a
 * caller that has a supported decision cannot reach for the task table again and
 * find an entry that says the task is not enumerated — the two cannot disagree.
 */
export type SupportDecision =
  | { supported: true; resultKind: ResultKind; task: Task; requires: readonly Claim[] }
  | { supported: false; resultKind: ResultKind; task: Task; obligation: string; detail: string };

/**
 * Decide support at the REQUEST BOUNDARY. It reads the result kind and the task
 * and nothing else — in particular it does not read the inventory, so an
 * inventory that hosts no candidate cannot turn an unsupported request into an
 * ordinary empty result.
 */
export function projectionSupport(resultKind: ResultKind, task: Task): SupportDecision {
  if (IMPLEMENTED_TASKS[resultKind].includes(task)) {
    const spec = TASK_INVARIANTS[task];
    /* c8 ignore next */
    if ("notEnumerated" in spec) throw new Error(`${resultKind} claims to implement ${task}, and the task table says it is not enumerated`);
    return { supported: true, resultKind, task, requires: spec.requires };
  }
  const spec = TASK_INVARIANTS[task];
  // A task the table does not enumerate already names what would have to be
  // built. A task it DOES enumerate is one this kind does not reach; naming the
  // pair is the honest obligation, and it is not a diagnostic cause.
  const obligation = "notEnumerated" in spec ? spec.notEnumerated : `invariant:${task}-on-${resultKind}`;
  return {
    supported: false,
    resultKind,
    task,
    obligation,
    detail: `the ${resultKind}-valued path does not implement the ${task} task, so this request has no candidate space; absent implementation is not a judgment that the declared facts forbid every answer`,
  };
}

/* ------------------------------------------------------------------ facts */

/* ------------------------------------------------------- induced claims */

/**
 * The claims a program ACTUALLY makes, read off its own structure rather than
 * off what its author says. This is the function the strong observer uses, and
 * the reason a mutation to a claim-bearing choice is detectable even when the
 * declared explanation is left untouched.
 */
export function inducedClaims(p: Program, facts: ResultFacts): Claim[] {
  const out = new Set<Claim>(channelClaims(p.measure, p.baseline, facts));
  // The dimension carries the identity of each case the measure is read against.
  out.add("partition-membership");
  return [...out].sort();
}

/**
 * The claims ONE channel induces for a measure, at a declared baseline. Factored
 * out of `inducedClaims` so the cell budget in `embed` asks the SAME question of
 * a channel it has not built a program around, instead of carrying a second copy
 * of the capacity table's consequences.
 */
export function channelClaims(channel: Channel, baseline: BaselineDecl, facts: ResultFacts): Claim[] {
  const out: Claim[] = [];
  const cap = CAPACITY[channel];
  const t = facts.measure.transformation;

  if (cap.valueReadback) {
    // The value itself is recoverable, so no positional magnitude is claimed...
    out.push("value-recoverable");
    // ...and a readable RATIO value supports an exact comparison. This is the
    // doctrine's lore-oracle argument, and it is why the tabular projection is a
    // PEER of the visual one rather than a degraded one. Nothing here is
    // ratio-comparable without the scale that makes a ratio a ratio.
    if (t === "ratio") out.push("ratio-comparability");
  } else if (channel === "length" || channel === "position") {
    out.push("aggregate-magnitude");
    if (t === "ratio") out.push(baseline === "zero" ? "ratio-comparability" : "difference-comparability");
    else if (t === "interval") out.push("difference-comparability");
    // An ordinal measure on a metric channel induces neither: differences of an
    // ordinal are as meaningless as its mean, so nothing comparable is claimed.
  } else if (channel === "area") {
    out.push("aggregate-magnitude");
    if (t === "ratio") out.push("ratio-comparability");
  } else if (channel === "luminance" || channel === "angle") {
    out.push("aggregate-magnitude");
    if (t === "interval" || t === "ratio") out.push("difference-comparability");
  }

  return out;
}

/**
 * The claims ONE channel induces for a measure of THIS transformation, at a
 * declared baseline. `channelClaims` is the single authority for the
 * capacity-to-claim consequences and reads only `facts.measure.transformation`
 * for its verdict; this factor lets the COMPOSITE budget path ask the same
 * question of a channel the reading carries without inventing the rest of a
 * program's facts. A test pins the two agree over full facts across channels,
 * transformations and baselines, so the narrowing cannot drift silently.
 */
const channelClaimsForTransformation = (channel: Channel, baseline: BaselineDecl, transformation: Transformation): Claim[] =>
  channelClaims(channel, baseline, { measure: { transformation } } as ResultFacts);

/* ------------------------------------------------------------ enumeration */

export type EnumerationInput = {
  /**
   * The structure the operation is asserted of. The enumerator derives the facts
   * it filters on from THIS and the admitted operation, so a caller cannot pair
   * an operation with unrelated facts describing another relation or a field the
   * operation already aggregated away.
   */
  structure: RelationalStructure;
  /** The admitted operation. It is validated against `structure` before any candidate exists. */
  admitted: BoundOperation;
  task: Task;
  inventory: TargetInventory;
  /**
   * Which RESULT-grain column the composition invariant partitions over.
   * OMITTING IT IS A MISSING PREMISE, not a default: an absent partition leaves
   * the candidates undecided rather than taking the branch a favorable
   * completion would have taken.
   */
  partitionDimension?: string;
};

/**
 * A capacity failure is one of two different things, and they are not
 * interchangeable. Where the doctrine NAMES the illegality - an interval on
 * area, order on hue, a sequential ramp on a nominal scale, angle off a
 * non-cyclic field - the candidate is REFUSED under that catalogue cause.
 * Where the channel simply has no slot for the scale, the triple is not a
 * candidate in this space at all and is EXCLUDED: reporting a cause for it
 * would invent an illegality the corpus does not name.
 */
type CapacityVerdict = { cause: string; detail: string } | "excluded" | undefined;

const capacityVerdict = (channel: Channel, t: Transformation, facts: ResultFacts, role: "dimension" | "measure"): CapacityVerdict => {
  if (channel === "area" && t !== "ratio") return { cause: "REL_AREA_INTERVAL_SCALE", detail: `area carries ratio only, and this field is ${t}` };
  if (channel === "hue" && t !== "nominal") return { cause: "REL_HUE_CARRIES_ORDER", detail: `hue is nominal-capacity, and this field is ${t}` };
  if (channel === "luminance" && t === "nominal") return { cause: "REL_SEQUENTIAL_ON_NOMINAL", detail: "a sequential ramp implies an order the nominal scale does not have" };
  if (channel === "angle") {
    const licensed = role === "measure" ? facts.measure.cyclic : facts.dimension.cyclic;
    if (!CAPACITY.angle.carries.includes(t)) return "excluded";
    if (!licensed) return { cause: "REL_CYCLIC_ANGLE_NONCYCLIC", detail: "angle is licensed by a cyclic scale or a declared whole, and this field is neither" };
    return undefined;
  }
  if (!CAPACITY[channel].carries.includes(t)) return "excluded";
  return undefined;
};

/**
 * The product space, filtered. Every (coordinate, dimension channel, measure
 * channel) triple the target inventory can host is a candidate; a candidate is
 * RETAINED when every precondition for the declared task is discharged from the
 * basis, REFUSED with a catalogue cause when one is violated, and UNDECIDED
 * with an obligation when a premise the candidate needs is not established.
 */
export function enumerate(input: EnumerationInput): Enumeration {
  const { task, inventory } = input;
  // Throws when the operation contradicts the relation, so a mismatched or
  // absent operation cannot enter through unrelated facts; returns `unproven`
  // when the premise is merely missing.
  const admission = admitOperation(input.structure, input.admitted);
  // A DECLARED partition must be a column of the RESULT. Naming a source column
  // the operation summed away, or a name that exists nowhere, is an invalid
  // binding: it is refused here rather than slipping past the additivity check
  // into the favorable branch.
  const bindingFault = admission.kind === "admitted" ? partitionBindingFault(admission.facts, input.partitionDimension) : undefined;
  if (bindingFault) throw new Error(bindingFault);
  // SUPPORT IS DECIDED FIRST. An unimplemented task returns its own disposition
  // with an empty population and NO refusals: a refusal carries an analytical
  // cause, and there is no rule to name for a rule that was never written.
  const support = projectionSupport("relation", task);
  if (!support.supported) {
    return { support, population: { considered: 0, excluded: 0, disposed: 0 }, retained: [], refused: [], undecided: [] };
  }
  const spec = { requires: support.requires };
  const retained: Program[] = [];
  const refused: Refusal[] = [];
  const undecided: Undecided[] = [];
  let considered = 0;
  let excluded = 0;

  for (const coordinate of inventory.spaces) {
    for (const dimensionChannel of inventory.channels) {
      for (const measureChannel of inventory.channels) {
        if (!CAPACITY[dimensionChannel].spaces.includes(coordinate)) continue;
        if (!CAPACITY[measureChannel].spaces.includes(coordinate)) continue;
        if (dimensionChannel === measureChannel) continue;
        considered += 1;
        // Stamped from the ADMITTED operation: a candidate cannot carry a
        // different one, so the identity guarantee is a construction property
        // rather than a per-candidate check that could be bypassed.
        const p: Program = { coordinate, dimension: dimensionChannel, measure: measureChannel, baseline: "zero", task, claims: [], operation: input.admitted };

        // A missing premise is CARRIED, never resolved to a favorable branch.
        if (admission.kind === "unproven") {
          undecided.push({ program: p, obligation: admission.obligation, detail: `${admission.reason}, so the grain of the result it displays is not established` });
          continue;
        }
        const facts = admission.facts;

        const dimVerdict = capacityVerdict(dimensionChannel, facts.dimension.transformation, facts, "dimension");
        if (dimVerdict === "excluded") { excluded += 1; continue; }
        if (dimVerdict) {
          refused.push({ program: p, cause: dimVerdict.cause, detail: dimVerdict.detail });
          continue;
        }
        if (facts.dimension.key && dimensionChannel !== "position") {
          refused.push({ program: p, cause: "REL_KEY_ENCODED_TO_CHANNEL", detail: "a key may never be encoded to a non-positional channel" });
          continue;
        }
        const measVerdict = capacityVerdict(measureChannel, facts.measure.transformation, facts, "measure");
        if (measVerdict === "excluded") { excluded += 1; continue; }
        if (measVerdict) {
          refused.push({ program: p, cause: measVerdict.cause, detail: measVerdict.detail });
          continue;
        }

        // THE BINDING IS A PREMISE. A program that does not carry the admitted
        // operation does not say which analysis it displays, so it is not
        // retained: the result grain it would show is unestablished, and
        // `grain:declared` is the corpus's own obligation for exactly that.
        // Composition requires additivity over the partition dimension, and the
        // partition is a DECISION-RELEVANT input. An omitted one is a missing
        // premise and is carried, never resolved by the branch a favorable
        // completion would have taken; a contradiction that IS established is
        // refused under the corpus's own cause.
        if (task === "composition") {
          const kind = facts.measure.additivityKind;
          if (!input.partitionDimension) {
            undecided.push({
              program: p,
              obligation: "invariant:exhaustive",
              detail: "the composition declares no partition dimension, so which partition its parts must exhaust is not established",
            });
            continue;
          }
          if (kind === "non-additive") {
            refused.push({
              program: p,
              cause: "REL_ADDITIVITY_SUM_SEMIADDITIVE",
              detail: "the measure is declared non-additive, so no partition of it is summable",
            });
            continue;
          }
          if (kind === "ratio-measure") {
            refused.push({
              program: p,
              cause: "REL_RATIO_MEASURE_AVERAGED",
              detail: `a rate must re-derive from its numerator and denominator at ${input.partitionDimension}, and a composition of it averages instead`,
            });
            continue;
          }
          if (kind === "semi-additive" && facts.measure.nonAdditiveAlong.includes(input.partitionDimension)) {
            refused.push({
              program: p,
              cause: "REL_ADDITIVITY_SUM_SEMIADDITIVE",
              detail: `the measure is declared non-additive along ${input.partitionDimension}, and a composition partitions over it`,
            });
            continue;
          }
        }

        const induced = inducedClaims(candidate(p, p.baseline), facts);
        if (!spec.requires.every((c) => induced.includes(c))) {
          refused.push({
            program: p,
            cause: "REL_BASELINE_RATIO_CLAIM",
            detail: `the declared task requires ${spec.requires.join(", ")} and this program induces ${induced.join(", ") || "nothing"}`,
          });
          continue;
        }

        // A candidate whose induced claims assert an aggregate magnitude needs
        // the grain to be declared; without it the aggregate is undecided.
        retained.push(p);
      }
    }
  }
  return {
    support,
    population: { considered, excluded, disposed: considered - excluded },
    retained: sortPrograms(retained),
    refused: sortRefusals(refused),
    undecided: sortUndecided(undecided),
  };
}

const candidate = (p: Program, baseline: BaselineDecl): Program => ({ ...p, baseline });
const keyOf = (p: Program) => `${p.coordinate}|${p.dimension}|${p.measure}|${p.baseline}|${p.task}`;
const sortPrograms = (xs: Program[]) => [...xs].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
const sortRefusals = (xs: Refusal[]) => [...xs].sort((a, b) => (keyOf(a.program) + a.cause).localeCompare(keyOf(b.program) + b.cause));
const sortUndecided = (xs: Undecided[]) => [...xs].sort((a, b) => (keyOf(a.program) + a.obligation).localeCompare(keyOf(b.program) + b.obligation));

/* -------------------------------------------------- the graph-valued result */

/**
 * A program over a GRAPH-VALUED result. Distinct from `Program`, which displays
 * one relation's aggregate: a graph program assigns channels to the NODE
 * population and to the INCIDENCE, and it makes no magnitude claim at all.
 *
 * The result travels with the program, and the enumerator receives it as a
 * denoted `GraphResult` — never a `GraphBinding`. That is the M1 exit criterion
 * made structural: a layer that never sees the binding cannot re-resolve a
 * relation name, re-select a population, or consult a second declaration.
 */
export type GraphProgram = {
  coordinate: CoordinateSpace;
  /** How node identity is carried. */
  nodes: Channel;
  /** How the incidence is carried. */
  edges: Channel;
  task: Task;
  graph: GraphResult;
  claims: Claim[];
};

export type GraphRefusal = { program: GraphProgram; cause: string; detail: string };
export type GraphEnumeration = {
  support: SupportDecision;
  population: { considered: number; excluded: number; disposed: number };
  retained: GraphProgram[];
  refused: GraphRefusal[];
};

export type GraphEnumerationInput = {
  /** The DENOTED graph. No binding, no relation name, no rows. */
  graph: GraphResult;
  task: Task;
  inventory: TargetInventory;
};

/** What a graph program actually claims, read off its own assignments. */
export function inducedGraphClaims(p: GraphProgram): Claim[] {
  const out = new Set<Claim>();
  if (p.edges === "connection") out.add("incidence-recoverable");
  if (p.nodes === "position" || CAPACITY[p.nodes].valueReadback) out.add("partition-membership");
  return [...out].sort();
}

const graphKeyOf = (p: GraphProgram) => `${p.coordinate}|${p.nodes}|${p.edges}|${p.task}`;

/**
 * Enumerate graph programs from the graph-valued result.
 *
 * THE DOMAIN RESTRICTION IS EXPLICIT. A topology projection must not make a
 * positional claim, so a coordinate other than `non-metric` is EXCLUDED rather
 * than refused: it is not an illegal program, it is outside the declared domain
 * of this enumeration. The population counters make that visible instead of
 * letting it read as "no lawful projection exists".
 */
export function enumerateGraph(input: GraphEnumerationInput): GraphEnumeration {
  const { graph, task, inventory } = input;
  const support = projectionSupport("graph", task);
  if (!support.supported) {
    return { support, population: { considered: 0, excluded: 0, disposed: 0 }, retained: [], refused: [] };
  }
  const spec = { requires: support.requires };
  const retained: GraphProgram[] = [];
  const refused: GraphRefusal[] = [];
  let considered = 0;
  let excluded = 0;

  for (const coordinate of inventory.spaces) {
    for (const nodes of inventory.channels) {
      for (const edges of inventory.channels) {
        if (nodes === edges) continue;
        considered += 1;
        // A coordinate that positions its marks asserts a positional claim a
        // topology projection must not make.
        if (coordinate !== "non-metric") {
          excluded += 1;
          continue;
        }
        if (!CAPACITY[nodes].spaces.includes(coordinate) || !CAPACITY[edges].spaces.includes(coordinate)) {
          excluded += 1;
          continue;
        }
        const p: GraphProgram = { coordinate, nodes, edges, task, graph, claims: [] };
        const claims = inducedGraphClaims(p);
        const missing = spec.requires.filter((c) => !claims.includes(c));
        const program: GraphProgram = { ...p, claims };
        if (missing.length > 0) {
          refused.push({
            program,
            cause: "REL_TASK_UNDERSTATED_ENCODING_CLAIM",
            detail: `the declared task requires ${spec.requires.join(", ")} and this program induces ${claims.join(", ") || "nothing"}`,
          });
          continue;
        }
        retained.push(program);
      }
    }
  }
  return {
    support,
    population: { considered, excluded, disposed: considered - excluded },
    retained: [...retained].sort((a, b) => graphKeyOf(a).localeCompare(graphKeyOf(b))),
    refused: [...refused].sort((a, b) => (graphKeyOf(a.program) + a.cause).localeCompare(graphKeyOf(b.program) + b.cause)),
  };
}

/**
 * THE INDEPENDENTLY DERIVED LAWFUL SET FOR THE RELATION PATH.
 *
 * Reasoned from the capacity table, the task requirement and the RESULT facts,
 * and it does NOT call `enumerate`. The reasoning, in full:
 *
 *  - the dimension is the result's group column and the measure is the
 *    aggregate, so each must be carried by a channel that admits its
 *    transformation;
 *  - the coordinate must host BOTH channels, and the two channels must differ;
 *  - the declared task's required claims must be induced by the assignment —
 *    for magnitude comparison that is `ratio-comparability`, which a readback
 *    channel supplies for a ratio-scaled field, and a length/position/area
 *    channel supplies from the ratio scale over a declared zero baseline.
 *
 * A candidate the implementation never generates therefore appears as a MISSING
 * MEMBER rather than as a smaller count that still looks self-consistent.
 *
 * WHAT IT RECEIVES DECIDES WHAT IT CAN COVER. It now takes the declared
 * partition and derives the composition conditions and the key-channel
 * restriction itself, so `composition` is inside its scope for the regimes those
 * conditions describe. The shared premises are named in
 * `RELATION_REFERENCE_NON_CLAIMS`, and what is still NOT covered is named there
 * too rather than implied by a passing comparison.
 */
/**
 * WHETHER THE DECLARED PARTITION IDENTIFIES A PARTITION OF THIS RESULT.
 *
 * CARRYING THE SPELLING OF A PREMISE DOES NOT ESTABLISH ITS APPLICABILITY. A
 * complete request includes the bindings that give its premises meaning: `item`
 * names a column the operation SUMMED AWAY, and a name identifying no column at
 * all is not a partition of anything this result can be divided by. Both
 * consumers call THIS, so neither can accept a request the other rejects.
 */
export function partitionBindingFault(facts: ResultFacts, partitionDimension: string | undefined): string | undefined {
  if (partitionDimension === undefined) return undefined;
  if (facts.resultGrain.includes(partitionDimension)) return undefined;
  return `the declared composition partition ${partitionDimension} is not a column of the result [${facts.resultGrain.join(", ")}]; a projection of the result cannot partition by it`;
}

/**
 * WHETHER THE RESULT'S MEASURE ADMITS SUMMATION OVER THE DECLARED PARTITION.
 *
 * Derived from the DECLARATION here rather than read off the enumerator, and
 * stated in the declaration's own terms: a measure declared non-additive has no
 * summable partition at all; a rate must re-derive from its numerator and
 * denominator rather than being averaged; and a measure that is not additive
 * ALONG the partition cannot be summed over it. An omitted partition is a
 * missing premise, which is not the same as a partition that does not work.
 */
export type PartitionAdmission =
  | { kind: "admitted" }
  | { kind: "refused"; cause: string; detail: string }
  | { kind: "unproven"; obligation: string; detail: string };

export function partitionAdmitsSummation(facts: ResultFacts, partitionDimension: string | undefined): PartitionAdmission {
  if (partitionDimension === undefined) {
    return {
      kind: "unproven",
      obligation: "invariant:exhaustive",
      detail: "the composition declares no partition dimension, so which partition its parts must exhaust is not established",
    };
  }
  const kind = facts.measure.additivityKind;
  if (kind === "non-additive") {
    return { kind: "refused", cause: "REL_ADDITIVITY_SUM_SEMIADDITIVE", detail: "the measure is declared non-additive, so no partition of it is summable" };
  }
  if (kind === "ratio-measure") {
    return {
      kind: "refused",
      cause: "REL_RATIO_MEASURE_AVERAGED",
      detail: `a rate must re-derive from its numerator and denominator at ${partitionDimension}, and a composition of it averages instead`,
    };
  }
  if (kind === "semi-additive" && facts.measure.nonAdditiveAlong.includes(partitionDimension)) {
    return {
      kind: "refused",
      cause: "REL_ADDITIVITY_SUM_SEMIADDITIVE",
      detail: `the measure is declared non-additive along ${partitionDimension}, and a composition partitions over it`,
    };
  }
  return { kind: "admitted" };
}

export function lawfulRelationPrograms(
  facts: ResultFacts,
  task: Task,
  inventory: TargetInventory,
  /**
   * The declared partition. THE COMPOSITION TASK TURNS ON IT, so a derivation
   * that does not receive one is not a reference for composition however well it
   * agrees on magnitude comparison.
   */
  partitionDimension?: string,
): Array<{ coordinate: CoordinateSpace; dimension: Channel; measure: Channel }> {
  // AN UNIMPLEMENTED TASK HAS NO LAWFUL SET, and returning the empty set would
  // say it has one and that it is empty. This derivation is a boundary too.
  const support = projectionSupport("relation", task);
  if (!support.supported) throw new Error(`lawfulRelationPrograms was asked for the ${task} task on the relation path, which does not implement it`);
  const spec = { requires: support.requires };
  if (task === "composition") {
    const admission = partitionAdmitsSummation(facts, partitionDimension);
    if (admission.kind !== "admitted") return [];
  }
  const out: Array<{ coordinate: CoordinateSpace; dimension: Channel; measure: Channel }> = [];
  for (const coordinate of inventory.spaces) {
    for (const dimension of inventory.channels) {
      for (const measure of inventory.channels) {
        if (dimension === measure) continue;
        if (!CAPACITY[dimension].spaces.includes(coordinate)) continue;
        if (!CAPACITY[measure].spaces.includes(coordinate)) continue;
        if (!CAPACITY[dimension].carries.includes(facts.dimension.transformation)) continue;
        if (!CAPACITY[measure].carries.includes(facts.measure.transformation)) continue;
        // The cyclic licence applies to WHICHEVER role the angle channel carries,
        // and the dimension needs it too: `polar|angle|length` is refused because
        // the result's group column is not cyclic, not because the measure is not.
        if (CAPACITY[measure].requiresCyclicOrWhole && !facts.measure.cyclic) continue;
        if (CAPACITY[dimension].requiresCyclicOrWhole && !facts.dimension.cyclic) continue;
        // A KEY IS NOT A CATEGORY. A key column carries identity, so encoding it
        // to anything but a positional channel is refused — and the reference
        // has to know that, or it expects a member the enumerator will not make.
        if (facts.dimension.key && dimension !== "position") continue;
        const p: Program = { coordinate, dimension, measure, baseline: "zero", task, claims: [], operation: { relation: "", field: "", op: "sum", along: [], resultGrain: [] } };
        const induced = inducedClaims(p, facts);
        if (!spec.requires.every((c) => induced.includes(c))) continue;
        out.push({ coordinate, dimension, measure });
      }
    }
  }
  return out.sort((a, b) => `${a.coordinate}|${a.dimension}|${a.measure}`.localeCompare(`${b.coordinate}|${b.dimension}|${b.measure}`));
}

/** The retained set as comparable membership, so a control names programs and not a count. */
export const relationMembership = (e: Enumeration) => e.retained.map((p) => `${p.coordinate}|${p.dimension}|${p.measure}`).sort();

/**
 * THE PREMISES A RELATION PROGRAM MUST SATISFY, reported one by one.
 *
 * An empty list means this checker CERTIFIED the program. A non-empty list says
 * which premise it could not establish — and that is the whole point of the
 * structured form: a bare `false` means "not certified", NOT "analytically
 * illegal". The engine's own judgment is the only thing that says illegal, and
 * absent implementation is neither. A consumer that needs to tell those apart
 * keeps this list, the `SupportDecision` and the admission result; collapsing
 * them into one Boolean is the mistake this shape exists to prevent.
 */
/**
 * THE SINGLE-CANDIDATE CLASSIFIER. Both the enumerator and the composer must
 * consume THIS, over the same request, so that "passed a smaller helper" can
 * never upgrade a program the enumeration would withhold.
 *
 * `partitionDimension` is the composition partition. It is a TASK-RELEVANT
 * premise: it is supplied to the enumeration separately, a later reader cannot
 * recover it from the program, and re-reading the source grain does not
 * reconstruct the analytical choice that was made.
 */
export type AtomicClassification =
  | { kind: "retained"; unmet: [] }
  | { kind: "refused"; cause: string; detail: string; unmet: string[] }
  | { kind: "unproven"; obligation: string; detail: string; unmet: string[] };

export function classifyAtomicProgram(
  p: Program,
  facts: ResultFacts,
  task: Task,
  inventory: TargetInventory,
  partitionDimension?: string,
): AtomicClassification {
  const unmet = relationProgramUncertified(p, facts, task, inventory, partitionDimension);
  if (unmet.length === 0) return { kind: "retained", unmet: [] };
  // A DECLARED CONTRADICTION IS A REFUSAL, NOT AN OBLIGATION. The composition
  // conditions are the ones the doctrine states as causes, and a program they
  // contradict must be refused rather than carried — otherwise the composer
  // would treat "the facts forbid it" as "a premise is missing".
  if (task === "composition") {
    const admission = partitionAdmitsSummation(facts, partitionDimension);
    if (admission.kind === "refused") return { kind: "refused", cause: admission.cause, detail: admission.detail, unmet };
    if (admission.kind === "unproven") return { kind: "unproven", obligation: admission.obligation, detail: admission.detail, unmet };
  }
  if (facts.dimension.key && p.dimension !== "position") {
    return { kind: "refused", cause: "REL_KEY_ENCODED_TO_CHANNEL", detail: "a key may never be encoded to a non-positional channel", unmet };
  }
  return { kind: "unproven", obligation: "part:uncertified", detail: `the program is not one this classifier can certify: ${unmet.join("; ")}`, unmet };
}

export function relationProgramUncertified(
  p: Program,
  facts: ResultFacts,
  task: Task,
  inventory: TargetInventory,
  /**
   * The declared composition partition. Without it this classifier answers a
   * SMALLER question than the enumerator does, and an empty answer would read
   * as permission.
   */
  partitionDimension?: string,
): string[] {
  const unmet: string[] = [];
  // THE DECLARED TASK AND THE QUERIED TASK MUST AGREE. A program carries its own
  // task, and a checker handed a different one would certify a question the
  // program does not ask — the graph helper was corrected for exactly this, and
  // the relation helper certified `cartesian|position|length` while the program
  // declared `topology`.
  if (p.task !== task) {
    unmet.push(`the program declares the ${p.task} task and this check is about ${task}`);
  }
  const support = projectionSupport("relation", task);
  if (!support.supported) {
    unmet.push(`the relation path does not implement the ${task} task (${support.obligation})`);
    return unmet;
  }
  if (!inventory.spaces.includes(p.coordinate)) unmet.push(`${p.coordinate} is not a coordinate of this inventory`);
  if (!inventory.channels.includes(p.dimension)) unmet.push(`${p.dimension} is not a channel of this inventory`);
  if (!inventory.channels.includes(p.measure)) unmet.push(`${p.measure} is not a channel of this inventory`);
  if (p.dimension === p.measure) unmet.push("the dimension and the measure are the same channel");
  if (task === "composition") {
    const admission = partitionAdmitsSummation(facts, partitionDimension);
    if (admission.kind === "refused") unmet.push(`${admission.cause}: ${admission.detail}`);
    if (admission.kind === "unproven") unmet.push(`${admission.obligation}: ${admission.detail}`);
  }
  if (facts.dimension.key && p.dimension !== "position") {
    unmet.push("REL_KEY_ENCODED_TO_CHANNEL: a key may never be encoded to a non-positional channel");
  }
  if (!CAPACITY[p.dimension].spaces.includes(p.coordinate)) unmet.push(`${p.coordinate} does not host the ${p.dimension} channel`);
  if (!CAPACITY[p.measure].spaces.includes(p.coordinate)) unmet.push(`${p.coordinate} does not host the ${p.measure} channel`);
  if (!CAPACITY[p.dimension].carries.includes(facts.dimension.transformation)) {
    unmet.push(`the ${p.dimension} channel does not carry a ${facts.dimension.transformation} dimension`);
  }
  if (!CAPACITY[p.measure].carries.includes(facts.measure.transformation)) {
    unmet.push(`the ${p.measure} channel does not carry a ${facts.measure.transformation} measure`);
  }
  if (CAPACITY[p.dimension].requiresCyclicOrWhole && !facts.dimension.cyclic) {
    unmet.push(`the ${p.dimension} channel is licensed only by a cyclic or whole dimension and this result's group column is neither`);
  }
  if (CAPACITY[p.measure].requiresCyclicOrWhole && !facts.measure.cyclic) {
    unmet.push(`the ${p.measure} channel is licensed only by a cyclic or whole measure and this result's aggregate is neither`);
  }
  const induced = inducedClaims(p, facts);
  for (const claim of support.requires) {
    if (!induced.includes(claim)) {
      unmet.push(`the ${task} task requires ${claim} and this assignment induces ${induced.join(", ") || "nothing"}`);
    }
  }
  return unmet;
}

/** The Boolean face of `relationProgramUncertified`: certified, or not. */
export function relationProgramIsSound(p: Program, facts: ResultFacts, task: Task, inventory: TargetInventory): boolean {
  return relationProgramUncertified(p, facts, task, inventory).length === 0;
}

/**
 * WHAT THE RETAINED RELATION PROOF DOES AND DOES NOT ESTABLISH.
 *
 * Stated rather than left to the helper signature, because a signature that
 * accepts any `Task` reads as a general oracle and this one is not.
 */
export const RELATION_REFERENCE_NON_CLAIMS: readonly string[] = [
  "SHARED AXIOM: the additivity conditions and the key-channel restriction are stated in this reference AND implemented in the enumerator. That duplication is deliberate — calling the enumerator would destroy the comparison — but it means agreement is evidence that both state the same law, never that the law is the right one.",
  "STILL NOT COVERED: the reference does not reproduce the capacity table's channel-specific causes (`REL_AREA_INTERVAL_SCALE`, `REL_HUE_CARRIES_ORDER`, `REL_SEQUENTIAL_ON_NOMINAL`). Those three narrow the CHANNELS a field may occupy, and `CAPACITY[channel].carries` already excludes the same candidates, so MEMBERSHIP agrees — but a refusal's CAUSE does not, and that is a real difference this reference does not check.",
  "SHARED PREMISE: the capacity table and the task table are axioms on BOTH sides. Agreement between the reference and the enumerator is evidence about candidate construction and assessment WITHIN those tables, and never about the tables themselves.",
  "SHARED PREMISE: the reference calls the production `inducedClaims`. It therefore cannot expose an error that the claim function and the enumerator make together, so every claim-bearing distinction the bounded proof rests on needs an independently justified expectation of its own.",
  "DERIVED, not shared: the membership set is constructed without calling `enumerate`, so a candidate the generator omits appears as a MISSING MEMBER rather than as a smaller count that still looks self-consistent.",
  "IMPLEMENTATION SUPPORT AND VERIFICATION COVERAGE ARE DIFFERENT QUESTIONS. `projectionSupport` says whether a path implements a task; it does not say whether this reference assesses it, and the first does not imply the second.",
  "A program this reference excludes is NOT thereby analytically illegal. `relationProgramUncertified` names the premises that were not established; only the analytical engine's own judgment names a contradiction.",
  "ALIAS INDEPENDENCE IS NOT IDENTIFIER RENAMING. Renaming a declaration and rebinding the operation shows the reference does not dispatch on spelling; it does not show that an aliasing surface exists or that aliases are generated from the enumerator.",
];

/* ------------------------------- M2: soundness, completeness, sensitivity */

/**
 * THE INDEPENDENTLY DERIVED LAWFUL SET.
 *
 * Written from the capacity table and the stated domain restriction by direct
 * reasoning, and it does NOT call `enumerateGraph`. That is the point: a
 * completeness check against the implementation's own output is a tautology, so
 * the expectation is derived here and the enumerator is required to agree. A
 * candidate the implementation never generates shows up as a missing member
 * rather than as a smaller number that still looks self-consistent.
 *
 * The reasoning, in full:
 *  - the domain restriction admits only coordinates that make no positional
 *    claim, so `non-metric` is the only coordinate in scope;
 *  - both channels must be hosted by that coordinate;
 *  - the node channel and the edge channel must differ;
 *  - the edge channel must be `connection`, because that is the only channel
 *    that induces the incidence claim a topology task requires.
 */
export function lawfulGraphTopologies(inventory: TargetInventory): Array<{ coordinate: CoordinateSpace; nodes: Channel; edges: Channel }> {
  const out: Array<{ coordinate: CoordinateSpace; nodes: Channel; edges: Channel }> = [];
  const coordinate: CoordinateSpace = "non-metric";
  if (!inventory.spaces.includes(coordinate)) return out;
  for (const nodes of inventory.channels) {
    if (!inventory.channels.includes("connection")) continue;
    if (nodes === "connection") continue;
    if (!CAPACITY[nodes].spaces.includes(coordinate)) continue;
    if (!CAPACITY.connection.spaces.includes(coordinate)) continue;
    out.push({ coordinate, nodes, edges: "connection" });
  }
  return out.sort((a, b) => `${a.nodes}`.localeCompare(`${b.nodes}`));
}

/** The premises a retained graph candidate must satisfy. */
export function graphCandidateIsSound(p: GraphProgram, inventory: TargetInventory): boolean {
  const support = projectionSupport("graph", p.task);
  if (!support.supported) return false;
  return (
    // THE DECLARED TASK IS PART OF THE PREMISE, and it is read through the SAME
    // support decision the enumerator uses. Without it the helper answers "is
    // this a topology-shaped program" while being read as "is this program
    // sound", and a program re-labelled `magnitude-comparison` still passes on
    // the strength of the connection channel it happens to carry.
    support.requires.every((c) => inducedGraphClaims(p).includes(c)) &&
    inventory.spaces.includes(p.coordinate) &&
    inventory.channels.includes(p.nodes) &&
    inventory.channels.includes(p.edges) &&
    p.nodes !== p.edges &&
    p.coordinate === "non-metric" &&
    CAPACITY[p.nodes].spaces.includes(p.coordinate) &&
    CAPACITY[p.edges].spaces.includes(p.coordinate)
  );
}

/** The retained set as comparable membership, so a control names candidates and not a count. */
export const graphMembership = (e: GraphEnumeration) => e.retained.map((p) => `${p.coordinate}|${p.nodes}|${p.edges}`).sort();

/* ------------------------------------------------------------- observers */

/**
 * Reads what the program SAYS about itself. This is the observer the experiment
 * must not accept: it reports success from the certificate rather than from the
 * thing certified.
 */
export function declarationObserver(p: Program): { ok: boolean; read: Claim[] } {
  const spec = TASK_INVARIANTS[p.task];
  if ("notEnumerated" in spec) return { ok: false, read: p.claims };
  return { ok: spec.requires.every((c) => p.claims.includes(c)), read: [...p.claims].sort() };
}

/** Derives the claims from the program's own choices and checks those. */
export function programObserver(p: Program, facts: ResultFacts): { ok: boolean; induced: Claim[]; missing: Claim[] } {
  const spec = TASK_INVARIANTS[p.task];
  if ("notEnumerated" in spec) return { ok: false, induced: [], missing: [] };
  const induced = inducedClaims(p, facts);
  return { ok: spec.requires.every((c) => induced.includes(c)), induced, missing: spec.requires.filter((c) => !induced.includes(c)) };
}

/* --------------------------------------------------------- representations */

/**
 * TWO PRODUCED REPRESENTATIONS of one evaluated result, and a decoder for each.
 *
 * The boundary that matters: a decoder receives ONLY the representation it
 * decodes. It is given neither the supplied rows nor `evaluateOperation`, so it
 * cannot reconstruct the expected answer instead of observing what the
 * projection produced. A second evaluation of the same operation is not
 * evidence that a distinct representation preserved it.
 */
export type ReadbackOutput = { kind: "readback"; entries: GroupValue[] };
export type MetricOutput = {
  kind: "metric";
  scale: { unitsPerValue: number; baseline: BaselineDecl };
  entries: Array<{ key: string; extent: number }>;
};
export type ProjectionOutputs = { readback: ReadbackOutput; metric: MetricOutput };

/** Produces both representations from ONE evaluated result. */
export function produce(result: OperationResult, unitsPerValue: number, baseline: BaselineDecl = "zero"): ProjectionOutputs {
  if (!(unitsPerValue > 0)) throw new Error(`a metric representation needs a positive declared scale, and this one is ${unitsPerValue}`);
  return {
    readback: { kind: "readback", entries: result.groups.map((g) => ({ key: g.key, value: g.value })) },
    metric: {
      kind: "metric",
      scale: { unitsPerValue, baseline },
      entries: result.groups.map((g) => ({ key: g.key, extent: g.value * unitsPerValue })),
    },
  };
}

/** Recovers group/values from the READBACK output ALONE. */
export function decodeReadback(o: ReadbackOutput): GroupValue[] {
  return o.entries.map((e) => ({ key: e.key, value: e.value }));
}

/** Recovers group/values from the METRIC output and its DECLARED SCALE alone. */
export function decodeMetric(o: MetricOutput): GroupValue[] {
  return o.entries.map((e) => ({ key: e.key, value: e.extent / o.scale.unitsPerValue }));
}

/** Dispatch by representation kind. Takes the output and nothing else. */
export function recover(o: ReadbackOutput | MetricOutput): GroupValue[] {
  return o.kind === "readback" ? decodeReadback(o) : decodeMetric(o);
}

const totalOf = (gs: readonly GroupValue[]) => gs.reduce((n, g) => n + g.value, 0);
/** Moves every value under the NEXT group's key, so the total is unchanged. */
const shiftKeys = (entries: GroupValue[]): GroupValue[] =>
  entries.length < 2 ? entries : entries.map((e, i) => ({ key: entries[(i + 1) % entries.length].key, value: e.value }));

/**
 * LOWERING: a RETAINED PROGRAM determines which representation is produced.
 *
 * This is the connection that was missing. `produce` can build both
 * representations from any result, so on its own it demonstrates an encoding
 * helper and nothing about projection: with no candidate retained there would
 * still be two outputs. `lower` consumes an actual program, and the program's
 * measure channel decides the representation — or refuses to produce one.
 */
export type Lowered =
  | { kind: "readback"; program: Program; output: ReadbackOutput }
  | { kind: "metric"; program: Program; output: MetricOutput }
  | { kind: "unrealized"; program: Program; reason: string };

/**
 * THE DECLARED SUPPORT OF THIS LOWERER, and the reason it is a declaration
 * rather than an artefact of which program the runner happened to pick.
 *
 * The experiment witnesses exactly two realizations. Branching on readback
 * capability alone would accept TEN of the twelve retained programs into the
 * generic metric producer, so "the remaining programs stay unrealized" would be
 * a property of the example selection and not of the code. Every pair outside
 * this list returns `unrealized`.
 */
export const LOWERING_SUPPORT: ReadonlyArray<{ coordinate: CoordinateSpace; dimension: Channel; measure: Channel; representation: "readback" | "metric" }> = [
  { coordinate: "cartesian", dimension: "position", measure: "text", representation: "readback" },
  { coordinate: "cartesian", dimension: "position", measure: "area", representation: "metric" },
];

export function lower(program: Program, evaluated: OperationResult, unitsPerValue = METRIC_UNITS_PER_VALUE): Lowered {
  const supported = LOWERING_SUPPORT.find((s) => s.coordinate === program.coordinate && s.dimension === program.dimension && s.measure === program.measure);
  if (!supported) {
    return { kind: "unrealized", program, reason: `no lowering is declared for ${program.coordinate}|${program.dimension}|${program.measure}` };
  }
  if (supported.representation === "readback") {
    return { kind: "readback", program, output: produce(evaluated, unitsPerValue).readback };
  }
  if (program.baseline !== "zero") {
    return { kind: "unrealized", program, reason: "a metric representation needs a declared zero baseline" };
  }
  if (!(unitsPerValue > 0)) {
    return { kind: "unrealized", program, reason: `a metric representation needs a positive declared scale, and it was ${unitsPerValue}` };
  }
  return { kind: "metric", program, output: produce(evaluated, unitsPerValue).metric };
}

export type LoweringRun = {
  /** How many candidates the inventory retained. */
  considered: number;
  /** The outputs actually produced, by program. */
  realized: Array<{ program: string; representation: "readback" | "metric" }>;
  /** Every retained program the lowerer declines, with its reason. */
  unrealized: Array<{ program: string; reason: string }>;
};

/**
 * THE ORCHESTRATION THE EXPERIMENT RUNS: select candidates under an inventory,
 * then lower what was selected. It exists so that "no candidate" and "no
 * produced output" are ONE executed observation rather than two facts asserted
 * side by side, and so that a caller records what the run produced instead of
 * a verdict about it.
 */
export function selectAndLower(input: {
  structure: RelationalStructure;
  admitted: BoundOperation;
  task: Task;
  inventory: TargetInventory;
  rows: readonly Row[];
  unitsPerValue?: number;
}): LoweringRun {
  const evaluated = evaluateOperation(input.admitted, input.rows);
  const enumeration = enumerate({ structure: input.structure, admitted: input.admitted, task: input.task, inventory: input.inventory });
  const realized: LoweringRun["realized"] = [];
  const unrealized: LoweringRun["unrealized"] = [];
  for (const p of enumeration.retained) {
    const lowered = lower(p, evaluated, input.unitsPerValue ?? METRIC_UNITS_PER_VALUE);
    const key = `${p.coordinate}|${p.dimension}|${p.measure}`;
    if (lowered.kind === "unrealized") unrealized.push({ program: key, reason: lowered.reason });
    else realized.push({ program: key, representation: lowered.kind });
  }
  return { considered: enumeration.retained.length, realized, unrealized };
}

/** The report for ONE program. The representation is the program's, not a choice made here. */
export type PreservationReport = {
  program: string;
  representation: "readback" | "metric";
  result: GroupValue[];
  recovered: GroupValue[];
  preserved: boolean;
  scale: MetricOutput["scale"] | null;
  /** The representation-appropriate mutation, applied to the PRODUCED output. */
  mutated: { kind: "extent" | "key-binding"; recovered: GroupValue[]; preserved: boolean; totalUnchanged: boolean };
};

/**
 * Evaluates the admitted operation ONCE, lowers it through the GIVEN program,
 * and recovers from the produced output. The mutation then moves the OUTPUT, not
 * the operation.
 */
export function preservationReport(
  program: Program,
  admitted: BoundOperation,
  rows: readonly Row[],
  unitsPerValue = METRIC_UNITS_PER_VALUE,
): PreservationReport | { program: string; unrealized: string } {
  const evaluated = evaluateOperation(admitted, rows);
  const lowered = lower(program, evaluated, unitsPerValue);
  if (lowered.kind === "unrealized") return { program: `${program.coordinate}|${program.dimension}|${program.measure}`, unrealized: lowered.reason };
  const recovered = recover(lowered.output);
  const mutatedValues =
    lowered.kind === "metric"
      ? recover({ ...lowered.output, entries: lowered.output.entries.map((e, i) => (i === 0 ? { ...e, extent: e.extent + 1 } : e)) })
      : recover({ ...lowered.output, entries: shiftKeys(lowered.output.entries) });
  return {
    program: `${program.coordinate}|${program.dimension}|${program.measure}`,
    representation: lowered.kind,
    result: evaluated.groups,
    recovered,
    preserved: sameGroups(recovered, evaluated.groups),
    scale: lowered.kind === "metric" ? lowered.output.scale : null,
    mutated: {
      kind: lowered.kind === "metric" ? "extent" : "key-binding",
      recovered: mutatedValues,
      preserved: sameGroups(mutatedValues, evaluated.groups),
      totalUnchanged: totalOf(mutatedValues) === totalOf(evaluated.groups),
    },
  };
}

export const reportKey = (p: Program) => `${p.coordinate}|${p.dimension}|${p.measure}`;

/* -------------------------------------------------------------- consumers */

/**
 * A consumer recovers the bound operation's values through ONE topology. Its
 * expected side is `evaluateOperation` over the supplied population; its
 * recovered side comes from the program. A consumer that agreed with a
 * classification function about a label would have demonstrated nothing, so the
 * comparison here is over VALUES.
 */
export type ConsumerReport = {
  channel: Channel;
  ok: boolean;
  /** What the consumer recovered through this topology. */
  recovered: GroupValue[];
  /** What the admitted operation evaluates to, independently of the topology. */
  expected: GroupValue[];
  reason?: string;
};

const sameGroups = (a: readonly GroupValue[], b: readonly GroupValue[]) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The readback consumer: every group's key and its exact value, readable.
 * It declines a topology that is not a readback channel, and it refuses a
 * program whose binding does not match the admitted operation BEFORE evaluating
 * it, so a coinciding-values mutation is caught structurally as well.
 */
export function readbackConsumer(program: Program, admitted: BoundOperation, rows: readonly Row[]): ConsumerReport {
  const expected = evaluateOperation(admitted, rows).groups;
  if (!matchesAdmitted(program.operation, admitted)) {
    return { channel: "text", ok: false, recovered: evaluateOperation(program.operation, rows).groups, expected, reason: "binding-mismatch" };
  }
  if (!CAPACITY[program.measure].valueReadback) return { channel: "text", ok: false, recovered: [], expected, reason: "not-a-readback-channel" };
  const recovered = evaluateOperation(program.operation, rows).groups;
  return { channel: "text", ok: sameGroups(recovered, expected), recovered, expected, ...(sameGroups(recovered, expected) ? {} : { reason: "value-disagreement" }) };
}

/**
 * The metric consumer: the same groups as magnitudes on a length channel over a
 * declared zero baseline. It declines a topology that makes no positional
 * magnitude claim, so the two consumers are structurally different rather than
 * two spellings of one.
 */
export function metricConsumer(program: Program, admitted: BoundOperation, rows: readonly Row[]): ConsumerReport {
  const expected = evaluateOperation(admitted, rows).groups;
  if (!matchesAdmitted(program.operation, admitted)) {
    return { channel: program.measure, ok: false, recovered: evaluateOperation(program.operation, rows).groups, expected, reason: "binding-mismatch" };
  }
  if (CAPACITY[program.measure].valueReadback) return { channel: program.measure, ok: false, recovered: [], expected, reason: "not-a-metric-channel" };
  if (program.baseline !== "zero") return { channel: program.measure, ok: false, recovered: [], expected, reason: "no-declared-zero-baseline" };
  const recovered = evaluateOperation(program.operation, rows).groups;
  return { channel: program.measure, ok: sameGroups(recovered, expected), recovered, expected, ...(sameGroups(recovered, expected) ? {} : { reason: "value-disagreement" }) };
}

/**
 * The observer, extended from the program to its BINDING: it derives which
 * consumer the topology licenses, runs it, and requires the values it recovered
 * to equal the admitted operation's own evaluation. It never reads `claims`.
 */
export function bindingObserver(
  program: Program,
  admitted: BoundOperation,
  rows: readonly Row[],
): { ok: boolean; channel: Channel | "none"; recovered: GroupValue[]; expected: GroupValue[]; reason?: string } {
  const report = CAPACITY[program.measure].valueReadback ? readbackConsumer(program, admitted, rows) : metricConsumer(program, admitted, rows);
  const channel = report.channel;
  if (!report.ok) return { ok: false, channel, recovered: report.recovered, expected: report.expected, reason: report.reason };
  return { ok: true, channel, recovered: report.recovered, expected: report.expected };
}

/** The declared metric scale: two extent units per unit of value. */
export const METRIC_UNITS_PER_VALUE = 2;

/** The supplied population the consumers are exercised over. */
export const CONSUMER_POPULATION: readonly Row[] = [
  { product: "A", date: "day1", on_hand: 10, reserved: 1 },
  { product: "B", date: "day1", on_hand: 20, reserved: 2 },
  { product: "A", date: "day2", on_hand: 100, reserved: 3 },
  { product: "B", date: "day2", on_hand: 5, reserved: 4 },
];

/* ------------------------------------------------ precommitted predictions */

/**
 * Recorded BEFORE the enumerator was run over the frozen basis, as the doctrine
 * requires: the anti-lookup falsifier precommits SET DELTAS, not directions.
 * The run below reports the ACTUAL delta beside each of these.
 *
 * PROCEDURAL NON-CLAIM (the holdout carries the same one): that these lines were
 * written first is a property of how they were authored, and a later reader
 * cannot prove it from these bytes. What the repository can check is that the
 * reported delta equals the recorded expectation.
 */
export const PRECOMMITTED = {
  "ratio->ordinal": {
    mustRemove: "every retained program whose measure assignment requires ratio capacity",
    mustPreserve: "the nominal/ordinal-compatible alternatives, namely the value-readback programs",
  },
  "declared->unknown": {
    mustRemove: "every program whose admissibility inspects grain",
    mustPreserve: "every program whose admissibility does not inspect grain",
    mustCarry: "grain:declared as an obligation",
  },
  "non-cyclic->cyclic": {
    mustAdd: "at least one cyclic-capable assignment if the target inventory provides one",
    mustNotRemove: "unrelated cartesian/tabular lawful assignments",
  },
  "irrelevant-perturbation": {
    mustEqual: "the normalized retained set, byte-identical after a declared field no candidate assigns and no task reads is added",
  },
} as const;

export type ControlReport = {
  control: string;
  expected: string;
  actual: string;
  /** The general requirement the control states, which may hold vacuously. */
  requirementMet: boolean;
  /**
   * A CONCRETE prediction the precommit made that this run REFUTED. Refuted is
   * not vacuous: the general requirement can have an empty applicable set while
   * the named members of that set were wrong, and collapsing the two would
   * discard what the run taught.
   */
  predictionRefuted: boolean;
  /** What the run taught where a prediction was refuted. */
  correction?: string;
  ok: boolean;
};

/* ------------------------------------------------------------ the object */

/** The frozen basis named in the entry record. */
export const BASIS_FIXTURE = "FX_N_STOCK_SUM_ALONG_PRODUCT";
export const BASIS = {
  relation: "stock",
  /** The field the admitted operation aggregates. */
  measure: "on_hand",
  /** The result-grain column the operation produces and the projection assigns. */
  resultGrain: "date",
  /** The column the operation sums OVER. */
  summedOver: "product",
} as const;

/** The target the experiment enumerates against. */
export const EXPERIMENT_TARGET: TargetInventory = {
  id: "svg-dom",
  channels: ["position", "length", "area", "angle", "hue", "luminance", "shape", "texture", "connection", "containment", "order", "text"],
  spaces: ["cartesian", "polar", "tabular", "lane", "geographic", "containment", "non-metric"],
};

export type ExperimentResult = {
  basis: string;
  /** The admitted operation every retained program displays. */
  binding: BoundOperation;
  /** What the product space did, so a closure names its post-exclusion set. */
  population: { considered: number; excluded: number; disposed: number };
  consumers: {
    readback: ConsumerReport;
    metric: ConsumerReport;
    /** The same population under the aggregation direction the declaration forbids. */
    forbiddenDirection: { operation: BoundOperation; result: OperationResult; readbackRejects: boolean };
  };
  bindingMutation: { mutated: BoundOperation; readback: ConsumerReport; rejectedBeforeConsumption: boolean; valueDisagreement: boolean };
  /** Recovery observed per PROGRAM: the program decides which representation is produced. */
  preservation: {
    readback: PreservationReport | { program: string; unrealized: string };
    metric: PreservationReport | { program: string; unrealized: string };
  };
  /** The decisive control: what the orchestration PRODUCES, not what it counted. */
  loweringControls: {
    emptyInventory: LoweringRun;
    fullInventory: LoweringRun;
    metricWithoutBaseline: string | null;
  };
  /** The facts the enumerator filtered on, derived from the operation and the relation it names. */
  resultFacts: ResultFacts;
  consumed: Record<string, unknown>;
  retained: Program[];
  refused: Refusal[];
  undecided: Undecided[];
  distinctAfterFixedAuthority: number;
  /** What the retained set SHARES, and what each member gives up to be lawful. */
  claims: {
    shared: Claim[];
    union: Claim[];
    perProgram: Array<{ program: string; induced: Claim[]; loss: Claim[] }>;
  };
  residue: { projectionLevel: string; realizationLevel: string };
  controls: ControlReport[];
  observer: { declared: boolean; derived: boolean; mutated: Program; inducedAfterMutation: Claim[] };
};

const withMeasure = (s: RelationalStructure, t: Transformation): RelationalStructure => {
  const rel = s.relations[BASIS.relation];
  return {
    ...s,
    relations: { ...s.relations, [BASIS.relation]: { ...rel, fields: { ...rel.fields, [BASIS.measure]: { ...rel.fields[BASIS.measure], transformation: t } } } },
  };
};
/**
 * The cyclic control needs its two sides to differ in ONE fact. A cyclic field
 * decodes to ordinal + cyclic (stage-1.5), so a nominal field cannot simply
 * gain cyclicity without also changing transformation - and that second move
 * would remove every nominal-only channel for a reason that has nothing to do
 * with cyclicity. Both sides of this control therefore sit on the ORDINAL
 * dimension, and the only difference between them is the cyclic claim itself.
 */
const withDimensionOrdinal = (s: RelationalStructure): RelationalStructure => {
  const rel = s.relations[BASIS.relation];
  const { cyclic: _drop, ...rest } = rel.fields[BASIS.resultGrain];
  return { ...s, relations: { ...s.relations, [BASIS.relation]: { ...rel, fields: { ...rel.fields, [BASIS.resultGrain]: { ...rest, transformation: "ordinal" } } } } };
};
const withCyclicDimension = (s: RelationalStructure): RelationalStructure => {
  const rel = s.relations[BASIS.relation];
  return { ...s, relations: { ...s.relations, [BASIS.relation]: { ...rel, fields: { ...rel.fields, [BASIS.resultGrain]: { ...rel.fields[BASIS.resultGrain], cyclic: true } } } } };
};

const withUnknownGrain = (s: RelationalStructure): RelationalStructure => {
  const rel = s.relations[BASIS.relation];
  return { ...s, relations: { ...s.relations, [BASIS.relation]: { ...rel, grain: "unknown" } } };
};

/**
 * An IRRELEVANT semantic perturbation: the relation gains a declared field that
 * no candidate assigns and no declared task reads. The normalized retained set
 * must not move. This is the control without which an implementation that hashes
 * its input into a different template set passes every relevant-perturbation
 * test.
 */
const withIrrelevantField = (s: RelationalStructure): RelationalStructure => {
  const rel = s.relations[BASIS.relation];
  return {
    ...s,
    relations: { ...s.relations, [BASIS.relation]: { ...rel, fields: { ...rel.fields, warehouse: { transformation: "nominal" as const } } } },
  };
};

const retainedKeys = (e: Enumeration) => e.retained.map(keyOf);
const legal = (s: RelationalStructure, what: string): RelationalStructure => {
  const r = RelationalStructureSchema.safeParse(s);
  if (!r.success) throw new Error(`perturbation ${what} is not a legal declaration: ${JSON.stringify(r.error.issues[0])}`);
  return s;
};

export function runExperiment(): ExperimentResult {
  const fixture = loadOracle().fixtures.get(BASIS_FIXTURE);
  if (!fixture) throw new Error(`basis fixture ${BASIS_FIXTURE} is not in the corpus`);
  const base = legal(fixture.structure as RelationalStructure, "basis");

  // The operation the entry record cited: the fixture's OWN admitted assertion,
  // bound once and carried through every candidate.
  const aggregate = fixture.assertions.find((a) => a.kind === "aggregate");
  if (!aggregate) throw new Error(`basis fixture ${BASIS_FIXTURE} carries no aggregate assertion to bind`);
  const admitted = bindOperation(base, aggregate as AggregateAssertionDecl);
  const admission = admitOperation(base, admitted);
  if (admission.kind !== "admitted") throw new Error(`the basis operation is not admitted: ${admission.reason}`);
  const facts = admission.facts;

  const run = (s: RelationalStructure, task: Task = "magnitude-comparison", partition?: string) =>
    enumerate({ structure: s, admitted, task, inventory: EXPERIMENT_TARGET, partitionDimension: partition });
  /**
   * A perturbation can now be REFUSED at admission, because the operation is
   * judged before any candidate exists. That is an outcome to report, not a
   * crash: a control whose perturbed analysis the rules forbid has no candidate
   * set to compare, and saying so is the honest result.
   */
  const tryRun = (s: RelationalStructure, task: Task = "magnitude-comparison"): { ok: true; e: Enumeration } | { ok: false; refused: string } => {
    try {
      return { ok: true, e: run(s, task) };
    } catch (err) {
      return { ok: false, refused: (err as Error).message };
    }
  };

  const baseline = run(base);
  const ordinalAttempt = tryRun(legal(withMeasure(base, "ordinal"), "ratio->ordinal"));
  const unknownGrain = run(legal(withUnknownGrain(base), "declared->unknown"));
  const cyclicBaseline = run(legal(withDimensionOrdinal(base), "cyclic-control-baseline"));
  const cyclic = run(legal(withCyclicDimension(legal(withDimensionOrdinal(base), "cyclic-control-baseline")), "non-cyclic->cyclic"));
  const irrelevant = run(legal(withIrrelevantField(base), "irrelevant-field"));
  // A target whose inventory does not provide `hue`: a narrowing that is real
  // and target-specific, unlike a scale move on an interval dimension.
  const NARROWED_CHANNEL: Channel = "text";
  const narrowInventory: TargetInventory = { ...EXPERIMENT_TARGET, channels: EXPERIMENT_TARGET.channels.filter((c) => c !== NARROWED_CHANNEL) };
  const narrowedEnum = enumerate({ structure: base, admitted, task: "magnitude-comparison", inventory: narrowInventory, partitionDimension: BASIS.resultGrain });
  const narrowed = {
    removed: baseline.retained.filter((p) => !narrowedEnum.retained.some((q) => keyOf(q) === keyOf(p))),
    kept: narrowedEnum.retained,
  };

  const baseKeys = retainedKeys(baseline);
  const ordinalKeys = ordinalAttempt.ok ? retainedKeys(ordinalAttempt.e) : [];
  const removedByOrdinal = ordinalAttempt.ok ? baseKeys.filter((k) => !ordinalKeys.includes(k)) : baseKeys;
  const keptByOrdinal = ordinalAttempt.ok ? baseKeys.filter((k) => ordinalKeys.includes(k)) : [];
  // "Requires ratio capacity" means the program's TASK-BEARING CLAIM rests on
  // the measure's ratio scale - not that its measure channel is literally a
  // metric one. A readable value gets its ratio comparability from the scale
  // too, so it is removed for the same reason and by the same fact.
  const ratioDependent = !ordinalAttempt.ok || removedByOrdinal.every((k) => {
    const p = baseline.retained.find((cand) => keyOf(cand) === k);
    return p !== undefined && inducedClaims(p, facts).includes("ratio-comparability");
  });

  const controls: ControlReport[] = [
    {
      control: "ratio->ordinal",
      expected: `${PRECOMMITTED["ratio->ordinal"].mustRemove}; preserve ${PRECOMMITTED["ratio->ordinal"].mustPreserve}`,
      actual:
        ordinalAttempt.ok
          ? `enumerated: removed ${removedByOrdinal.length} of ${baseKeys.length}, preserved ${keptByOrdinal.length}`
          : `REFUSED AT ADMISSION before any candidate exists: ${ordinalAttempt.refused}`,
      requirementMet: !ordinalAttempt.ok || (removedByOrdinal.length === baseKeys.length && ratioDependent),
      predictionRefuted: true,
      correction:
        ordinalAttempt.ok
          ? "The precommit named the value-readback programs as the alternatives a ratio->ordinal move must preserve. None survived."
          : "SUPERSEDED BY SEMANTIC ADMISSION, and this is the stronger result. The precommit named the value-readback programs as the alternatives a ratio->ordinal move must preserve; summing an ordinal measure is itself an analysis the rules forbid, so the perturbed operation is now refused BEFORE any candidate exists and there is no candidate set in which a readback program could survive. The control is not weakened: the narrower claim it tested is unreachable because admission rejects the premise first.",
      ok: false,
    },
    {
      control: "declared->unknown",
      expected: `${PRECOMMITTED["declared->unknown"].mustRemove}; ${PRECOMMITTED["declared->unknown"].mustPreserve}; carry ${PRECOMMITTED["declared->unknown"].mustCarry}`,
      actual: `retained ${retainedKeys(unknownGrain).length} of ${baseKeys.length}, undecided ${unknownGrain.undecided.length} of ${unknownGrain.population.considered} considered carrying ${[...new Set(unknownGrain.undecided.map((u) => u.obligation))].join(", ") || "nothing"} — with the operation bound, EVERY topology depends on the result grain, and because the facts that would decide a channel exclusion are the missing ones, the whole considered population is carried rather than excluded`,
      requirementMet:
        retainedKeys(unknownGrain).length < baseKeys.length &&
        unknownGrain.undecided.length > 0 &&
        unknownGrain.undecided.every((u) => u.obligation === "grain:declared"),
      predictionRefuted: true,
      correction:
        "The precommit treated the value-readback family as not inspecting grain, and that was true only of a program carrying no grain-bearing content. A BOUND program names a result grain, so an unknown grain leaves that grain unestablished in every topology: the removal is universal, not selective. This is a consequence of the missing binding the predecessor result was corrected for, and it is recorded as a refutation rather than absorbed.",
      ok: false,
    },
    {
      control: "non-cyclic->cyclic",
      expected: `${PRECOMMITTED["non-cyclic->cyclic"].mustAdd}; ${PRECOMMITTED["non-cyclic->cyclic"].mustNotRemove} (both sides sit on the ORDINAL dimension, so the cyclic claim is the only fact that differs)`,
      actual: `added ${retainedKeys(cyclic).filter((k) => !retainedKeys(cyclicBaseline).includes(k)).length} cyclic-capable assignment(s), removed ${retainedKeys(cyclicBaseline).filter((k) => !retainedKeys(cyclic).includes(k)).length}`,
      requirementMet:
        retainedKeys(cyclic).length > retainedKeys(cyclicBaseline).length &&
        retainedKeys(cyclicBaseline).every((k) => retainedKeys(cyclic).includes(k)) &&
        cyclic.retained.some((p) => p.dimension === "angle" || p.measure === "angle"),
      predictionRefuted: false,
      ok: true,
    },
    {
      control: "targeted-narrowing",
      expected:
        `a capability SOME candidates need and others do not must remove exactly those, so narrowing is targeted rather than blanket. The target's channel inventory is the doctrine's own mechanism for this, so the perturbation removes ${NARROWED_CHANNEL} from the inventory.`,
      actual: `inventory minus ${NARROWED_CHANNEL}: removed ${narrowed.removed.length}, preserved ${narrowed.kept.length}`,
      requirementMet: narrowed.removed.length > 0 && narrowed.kept.length > 0,
      predictionRefuted: false,
      ok:
        narrowed.removed.length > 0 &&
        narrowed.kept.length > 0 &&
        narrowed.removed.every((p) => p.dimension === NARROWED_CHANNEL || p.measure === NARROWED_CHANNEL) &&
        narrowed.kept.every((p) => p.dimension !== NARROWED_CHANNEL && p.measure !== NARROWED_CHANNEL),
      correction:
        "REPLACED, and the reason is recorded rather than hidden. This control used to perturb the DIMENSION's scale nominal->ordinal and call the result a narrowing. Under result facts the dimension is the result's own group column, whose scale is interval, and no scale in the lattice is narrower than interval for this purpose - so that perturbation narrows nothing and the control no longer measured what it claimed. Removing a CHANNEL from the target inventory is a narrowing that is both real and target-specific.",
    },
    {
      control: "irrelevant-perturbation",
      expected: PRECOMMITTED["irrelevant-perturbation"].mustEqual,
      actual: `${JSON.stringify(retainedKeys(irrelevant)) === JSON.stringify(baseKeys) ? "identical" : "MOVED"} (${baseKeys.length} programs)`,
      requirementMet: JSON.stringify(retainedKeys(irrelevant)) === JSON.stringify(baseKeys),
      predictionRefuted: false,
      ok: JSON.stringify(retainedKeys(irrelevant)) === JSON.stringify(baseKeys),
    },
  ];

  // The observer control: mutate one CLAIM-BEARING choice - the baseline - and
  // leave the declared explanation untouched. The declaration reader still
  // passes; the program reader must not.
  const lawful = baseline.retained.find((p) => p.measure === "length") ?? baseline.retained[0];
  const mutated: Program = { ...lawful, baseline: "truncated", claims: [...lawful.claims] };
  const observer = {
    declared: declarationObserver({ ...mutated, claims: ["ratio-comparability"] }).ok,
    derived: programObserver(mutated, facts).ok,
    mutated,
    inducedAfterMutation: inducedClaims(mutated, facts),
  };

  const distinct = new Set(baseKeys.map((k) => k.split("|").slice(0, 3).join("|"))).size;

  // Shared claims are the INTERSECTION over the retained set; a loss is a claim
  // another lawful program of the same authority carries and this one does not.
  const perProgramClaims = baseline.retained.map((p) => ({ program: keyOf(p), induced: inducedClaims(p, facts) }));
  const union = [...new Set(perProgramClaims.flatMap((c) => c.induced))].sort();
  const shared = union.filter((c) => perProgramClaims.every((x) => x.induced.includes(c)));

  // Two structurally different programs over the SAME bound operation: one
  // readback, one metric. Their expected side is the operation, not a label.
  const supportedProgram = (representation: "readback" | "metric") => {
    const decl = LOWERING_SUPPORT.find((d) => d.representation === representation)!;
    const found = baseline.retained.find((p) => p.coordinate === decl.coordinate && p.dimension === decl.dimension && p.measure === decl.measure && p.baseline === "zero");
    if (!found) throw new Error(`no retained program realizes the declared ${representation} support`);
    return found;
  };
  const readbackProgram = supportedProgram("readback");
  const metricProgram = supportedProgram("metric");
  const readback = readbackConsumer(readbackProgram, admitted, CONSUMER_POPULATION);
  const metric = metricConsumer(metricProgram, admitted, CONSUMER_POPULATION);

  // The direction the semi-additivity declaration forbids, over the same
  // population: the discriminator is the VALUES, not the topology.
  const forbidden: BoundOperation = { ...admitted, along: ["date"], resultGrain: ["product"] };
  const forbiddenDirection = {
    operation: forbidden,
    result: evaluateOperation(forbidden, CONSUMER_POPULATION),
    readbackRejects: readbackConsumer(readbackProgram, forbidden, CONSUMER_POPULATION).ok === false,
  };

  // The binding mutation: one claim-bearing part of the operation moves while
  // the program's declared explanation does not.
  const mutatedBinding: BoundOperation = { ...admitted, field: "reserved" };
  const mutatedProgram: Program = { ...readbackProgram, operation: mutatedBinding };
  const mutationReport = readbackConsumer(mutatedProgram, admitted, CONSUMER_POPULATION);

  return {
    basis: BASIS_FIXTURE,
    binding: admitted,
    resultFacts: facts,
    preservation: {
      readback: preservationReport(readbackProgram, admitted, CONSUMER_POPULATION, METRIC_UNITS_PER_VALUE),
      metric: preservationReport(metricProgram, admitted, CONSUMER_POPULATION, METRIC_UNITS_PER_VALUE),
    },
    population: baseline.population,
    loweringControls: {
      emptyInventory: selectAndLower({ structure: base, admitted, task: "magnitude-comparison", inventory: { ...EXPERIMENT_TARGET, channels: [] }, rows: CONSUMER_POPULATION }),
      fullInventory: selectAndLower({ structure: base, admitted, task: "magnitude-comparison", inventory: EXPERIMENT_TARGET, rows: CONSUMER_POPULATION }),
      metricWithoutBaseline: (() => {
        const evaluated = evaluateOperation(admitted, CONSUMER_POPULATION);
        const lowered = lower({ ...metricProgram, baseline: "truncated" }, evaluated, METRIC_UNITS_PER_VALUE);
        return lowered.kind === "unrealized" ? lowered.reason : null;
      })(),
    },
    consumers: { readback, metric, forbiddenDirection },
    bindingMutation: {
      mutated: mutatedBinding,
      readback: mutationReport,
      rejectedBeforeConsumption: mutationReport.reason === "binding-mismatch",
      valueDisagreement: !sameGroups(mutationReport.recovered, mutationReport.expected),
    },
    consumed: {
      relation: BASIS.relation,
      grain: facts.sourceGrain,
      dimension: facts.dimension,
      measure: facts.measure,
      task: "magnitude-comparison",
      binding: `${admitted.op}(${admitted.relation}.${admitted.field}) over [${admitted.along.join(", ")}] -> grain [${admitted.resultGrain.join(", ")}]`,
      target: EXPERIMENT_TARGET.id,
      inventoryChannels: EXPERIMENT_TARGET.channels.length,
      inventorySpaces: EXPERIMENT_TARGET.spaces.length,
    },
    retained: baseline.retained,
    refused: baseline.refused,
    undecided: baseline.undecided,
    distinctAfterFixedAuthority: distinct,
    claims: {
      shared,
      union,
      perProgram: perProgramClaims.map((c) => ({ ...c, loss: union.filter((u) => !c.induced.includes(u)) })),
    },
    residue: {
      projectionLevel:
        "coordinate space, channel assignment and baseline are consumed by the projection and are NOT carried by the relation: two lawful programs of one authority differ here with no change to the analytical object",
      realizationLevel:
        "NOT measured here. Focus affordances, label placement, text wrapping, collision handling, animation and substrate mechanics are stage-5 residue; this experiment claims nothing about them.",
    },
    controls,
    observer,
  };
}

/**
 * The composition probe. The partition is now a column of the RESULT the
 * operation produced, which is the only kind of column a projection of that
 * result can partition.
 *
 * WHAT THIS CHANGED, and why it is a finding rather than a regression: with
 * source facts the probe could partition over `product` and call that a lawful
 * completion. But `product` is exactly the dimension the admitted operation
 * SUMS OVER, so it is not a column of the result at all — partitioning a
 * projection of the result by it was an artifact of filtering on source facts.
 * At this result grain there is no lawful composition of a measure the
 * declaration calls non-additive along the very dimension the result is keyed
 * by, so the declared case refuses and the omitted case is carried.
 */
export function compositionProbe(): {
  declared: { partition: string; retained: number; refused: number; causes: string[] };
  omitted: { retained: number; refused: number; undecided: number; obligations: string[] };
  lawfulCompletion: { exists: boolean; reason: string };
} {
  const fixture = loadOracle().fixtures.get(BASIS_FIXTURE)!;
  const base = fixture.structure as RelationalStructure;
  const aggregate = fixture.assertions.find((a) => a.kind === "aggregate")!;
  const admitted = bindOperation(base, aggregate as AggregateAssertionDecl);
  const run = (partitionDimension?: string) =>
    enumerate({ structure: base, admitted, task: "composition", inventory: EXPERIMENT_TARGET, partitionDimension });
  const declared = run(BASIS.resultGrain);
  const omitted = run(undefined);
  return {
    declared: {
      partition: BASIS.resultGrain,
      retained: declared.retained.length,
      refused: declared.refused.length,
      causes: [...new Set(declared.refused.map((r) => r.cause))].sort(),
    },
    omitted: {
      retained: omitted.retained.length,
      refused: omitted.refused.length,
      undecided: omitted.undecided.length,
      obligations: [...new Set(omitted.undecided.map((u) => u.obligation))].sort(),
    },
    lawfulCompletion: {
      exists: false,
      reason: `the result is keyed by ${BASIS.resultGrain} and the measure is declared non-additive along it, so every declared partition of this result is the forbidden aggregation`,
    },
  };
}

/** The composition premise over a measure whose KIND, not its dimension set, contradicts it. */
export function compositionKindProbe(): Record<string, { retained: number; refused: number; causes: string[]; refusedAtAdmission?: string }> {
  const fixture = loadOracle().fixtures.get(BASIS_FIXTURE)!;
  const base = fixture.structure as RelationalStructure;
  const aggregate = fixture.assertions.find((a) => a.kind === "aggregate")!;
  const admitted = bindOperation(base, aggregate as AggregateAssertionDecl);
  const out: Record<string, { retained: number; refused: number; causes: string[]; refusedAtAdmission?: string }> = {};
  for (const kind of ["non-additive", "ratio-measure"] as const) {
    const rel = base.relations[BASIS.relation];
    const mutated = legal(
      { ...base, relations: { ...base.relations, [BASIS.relation]: { ...rel, fields: { ...rel.fields, [BASIS.measure]: { ...rel.fields[BASIS.measure], additivity: { kind } } } } } },
      `additivity ${kind}`,
    );
    try {
      const e = enumerate({ structure: mutated, admitted, task: "composition", inventory: EXPERIMENT_TARGET, partitionDimension: BASIS.resultGrain });
      out[kind] = { retained: e.retained.length, refused: e.refused.length, causes: [...new Set(e.refused.map((r) => r.cause))].sort() };
    } catch (err) {
      // The perturbed MEASURE can make the operation itself illegal - a sum over
      // a ratio-measure is averaged rather than re-derived - in which case there
      // is no composition to probe and the refusal is the result.
      out[kind] = { retained: 0, refused: 0, causes: [], refusedAtAdmission: (err as Error).message };
    }
  }
  return out;
}

/* ---------------------------------------------------------------- ledger */

export const LEDGER = path.join(CONTRACTS_DIR, "analytical-fixtures/projection-experiment.json");

export const NON_CLAIMS = [
  "This result is CONDITIONAL on the basis named above and holds only for the declared candidate universe. It does not close stage 2, complete stage 3, establish rendered or navigational behaviour, or settle the cross-substrate thesis, which the doctrine places at stages 4 and 6.",
  "Passing the precommitted controls is evidence against particular template-selection explanations. It is NOT proof that a more elaborate lookup implementation could not mimic this finite test set; generalization is pressured later by unfamiliar recombinations, not declared here.",
  "The stage-2 subtraction stays open at its existing unresolved count. No coordinate is adjudicated, ratified or retired by this experiment.",
  "Only two of the doctrine's ten tasks have their preconditions implemented; the other eight are recorded in TASK_INVARIANTS with the invariant they would need, and no candidate is admitted for them.",
  "The precommit's third distinctness limb names projection FAMILY (visual / tabular / textual / navigational) beside coordinate space and channel assignment. This experiment has no separate family axis: the coordinate space stands in for it, so two programs both in `tabular` are not told apart by family. The distinctness count is therefore over coordinate, channel and baseline, and a family-level claim is NOT established here.",
  "A program is a projection TOPOLOGY - coordinate, the channel each task-bearing variable is assigned to, and the baseline - not an encoded artifact. Marks, scales, axes, label placement and emission are downstream of it and are not enumerated, so nothing here establishes that any program can be realized.",
  "Residue is enumerated per target family at stage 5; this experiment retains the realization-specific residue it observes but does not claim the stage-5 enumeration.",
  "THE PREDECESSOR'S ALL-PASS INTERPRETATION IS CORRECTED HERE. Topology enumeration is established; the attribution of established analytical preservation and loss to a topology whose analytical operation was unbound was an overclaim. That binding now travels with every program and is checked by value, but the correction itself stands as the record of what the earlier result did not establish.",
  "The general same-task preservation requirement can have an EMPTY applicable set, and that is not the same thing as a concrete prediction being confirmed. The predecessor precommit named the value-readback programs as the alternatives to preserve; none survived, so that prediction was REFUTED. The targeted-narrowing control added alongside it is subsequent evidence that some narrowing is selective, not retrospective confirmation.",
  "A consumer recovers the bound operation's values through one topology over ONE supplied population. That establishes the binding controls what is displayed for that population; it is not a general theorem about the topology, and it says nothing about rendered output, which does not exist.",
  "The two consumers differ in topology and in how the value is carried; both recover the same numbers because the same operation is bound. That is the shared analytical proposition, and it is established for the declared population only.",
  "WHAT THE OBSERVERS DO NOT CHECK, reproduced on the merged code and recorded rather than repaired. They check the BINDING and the claims derived from the program; they do not check the topology's own admissibility and they do not consult grain status. A program whose coordinate cannot host its measure channel under the module's OWN capacity table (non-metric hosting area) is rejected by the enumerator and still accepted by BOTH observers; and a program asserting an aggregate magnitude under an unknown grain is left undecided by the enumerator and still accepted by BOTH observers. A3 and A4 therefore establish that the observer reads the program rather than its certificate and that it detects a changed analytical BINDING; they do NOT establish complete admissibility checking.",
];

export function ledgerOf(r: ExperimentResult): Record<string, unknown> {
  return {
    $comment:
      "The bounded stage-3 experiment (REL-PROJECTION-EXPERIMENT-01). Retained as the actual normalized candidate SETS with their consumed inputs and their per-candidate reason, not as counts. Regenerate with `tsx packages/ds-codegen/src/analytical/projection.ts --record`; `projection.test.ts` fails when this file and a fresh computation disagree.",
    question:
      "Given one fixed analytical authority - relation, derivation and task - does the system independently enumerate at least two structurally different lawful projection programs, with shared claims identifiable, losses explicit and non-empty residue, with no form name participating?",
    basis: {
      fixture: r.basis,
      identification: "declared grain [product, date]; product nominal (dimension); date interval/instant (partition dimension, not assigned by any retained candidate); on_hand ratio, semi-additive with nonAdditiveAlong [date] (measure)",
      admissionEvidence: "the live engine's canonical judgment for this fixture is `admissible` with zero diagnostics and zero obligations; the basis is admitted on evidence, not on provisional status",
    },
    consumed: r.consumed,
    precommitted: PRECOMMITTED,
    retained: r.retained,
    refused: r.refused,
    undecided: r.undecided,
    distinctAfterFixedAuthority: r.distinctAfterFixedAuthority,
    population: r.population,
    binding: r.binding,
    resultFacts: r.resultFacts,
    preservation: r.preservation,
    loweringControls: r.loweringControls,
    consumers: r.consumers,
    bindingMutation: r.bindingMutation,
    correctedAccount: {
      semanticAdmission:
        "REPAIRED, and it is the finding this slice exists for. Structural resolution - aggregate support, relation and field resolution, the grain equation, the single-result-column rule - answered whether the operation RESOLVES, not whether the declared facts FORBID it, so `sum(stock.on_hand) over [date] -> grain [product]` was admitted, enumerated and PRESERVED perfectly while contradicting `nonAdditiveAlong: [date]`. The operation is now judged by the same engine that judges the corpus: an illegal one is REFUSED with the corpus's own causes, an unproven one is carried. A perfect round trip is not an admission result, and the two are now tested separately.",
      partitionMembership:
        "REPAIRED at the same boundary. A declared composition partition naming a source column the operation summed away (`product`), or a name that exists nowhere, was retaining candidates because the composition branch checked absence and additivity but never membership in the result grain. It is now refused as an invalid binding.",
      singleEvaluation:
        "REPAIRED. preservationReport called evaluateOperation twice - once for the result and once to feed produce - which contradicted the single-evaluation claim. It evaluates once and lowers that result.",
      programDeterminedOutput:
        "NEW, and it is the connection the earlier result lacked. produce() can build both representations from any result, so on its own it demonstrated an encoding helper: with an EMPTY channel inventory, enumeration retained nothing and the standalone report still produced both outputs. `lower` consumes an actual RETAINED PROGRAM, and the program's measure channel decides which representation is produced or refuses to produce one. The decisive controls: an empty inventory retains 0 candidates and therefore yields no output, and clearing the baseline a metric program needs makes lowering unrealized.",
      arityClaim:
        "NARROWED. `Function.length === 1` is a signature fact, not a proof of the information boundary: a one-argument function can still read a captured variable or call a module-level evaluator. No such behaviour was found in the decoder bodies, and the support for decoder independence is the isolated execution in a context containing the representation but neither the evaluator nor the rows.",
      operationIdentity:
        "CORRECTED UPWARD IN FORM AND DOWNWARD IN CLAIM. The guarantee that a candidate carries the admitted operation is now a CONSTRUCTION property - every candidate is stamped from the validated operation, so it cannot carry another - and the boundary validates that operation against the relation it NAMES before any candidate exists. What that does not do is check a caller-supplied operation against some independently established admitted one: the enumerator has no such second authority, so an operation for a different analysis is refused only if it contradicts the relation.",
      representationRecovery:
        "This is what the earlier consumers did NOT establish. Both sides called `evaluateOperation`, so nothing representation-dependent lay between them: agreement showed the binding and channel guards admit one shared evaluation, not that a value survived text or metric encoding. Recovery is now observed through two PRODUCED representations whose decoders receive neither the rows nor the evaluator, and the metric decoder recovers from extents and the DECLARED SCALE alone.",
      aggregateDispatch:
        "REPAIRED. `evaluateOperation` read `op.resultGrain` for grouping while ignoring `op.op`, so mean, min and count all executed as sum, and matching mean descriptors on both sides returned ok while returning sums. The executable contract is now narrowed to sum and every other aggregate name is REFUSED rather than executed.",
      metricChannelLabel:
        "REPAIRED. `metricConsumer` reported the channel as `length` for every non-readback success, including the area program the runner actually selected. It now reports the channel it consumed.",
      readbackPrediction: "REFUTED. The precommit named the value-readback programs as the alternatives a ratio->ordinal move must preserve. Ten existed and none survived: magnitude comparison requires ratio comparability, and a readable ordinal value does not supply it. The general same-task preservation requirement therefore had an EMPTY applicable set for this task, but that does not retroactively confirm the concrete prediction, which was wrong.",
      grainPrediction: "ALSO REFUTED, and the refutation is a consequence of the missing binding this slice corrects. The precommit treated the value-readback family as not inspecting grain; that was true only of a program carrying no grain-bearing content. A bound program names a result grain, so an unknown grain leaves that grain unestablished in EVERY topology. Two of the four precommitted metamorphic controls therefore carry refuted concrete predictions rather than confirmed ones, and the controls array reports requirementMet and predictionRefuted separately so the general requirement is not confused with the concrete one.",
      closurePopulation: "The closure statement is about the POST-EXCLUSION population: considered minus excluded. Triples a channel has no slot for are not judgments, and they are counted rather than implied.",
      lossLabels: "A `loss` here is an absent property NAME, not a measured information loss. It does not distinguish a lost analytical proposition from the absence of a perceptual encoding, and this experiment does not measure the former.",
      residue: "Realization-level residue remains UNMEASURED; the projection-level variation below is observed projection variation and does not satisfy the residue clause.",
      observerLimits:
        "REPRODUCED AND PINNED, not repaired. Neither observer checks the topology against the capacity table, and neither consults grain status: a non-metric coordinate hosting an area measure is rejected by the enumerator and accepted by both observers, and an aggregate magnitude under an unknown grain is undecided in the enumerator and accepted by both observers. What the observers establish is bounded to reading the program instead of its certificate and detecting a changed ANALYTICAL BINDING.",
    },
    sharedClaims: r.claims.shared,
    claimUnion: r.claims.union,
    perProgramClaims: r.claims.perProgram,
    residue: r.residue,
    controls: r.controls,
    observerControl: r.observer,
    compositionProbe: compositionProbe(),
    compositionKindProbe: compositionKindProbe(),
    nonClaims: NON_CLAIMS,
  };
}

export function recordLedger(): string {
  fs.writeFileSync(LEDGER, `${JSON.stringify(ledgerOf(runExperiment()), null, 2)}\n`);
  return LEDGER;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (invokedDirectly && process.argv.includes("--record")) {
  console.log(`projection: recorded ${recordLedger()}`);
}

/* ------------------------------------------------------------ composition */

/**
 * THE PROJECTION COMBINATORS, AND THE RULE EACH ONE IS TYPED BY.
 *
 * The doctrine's invariant 13 is the whole design: a composite is admitted or
 * rejected by its parts and the rule written for its combinator, never by a
 * special case for the composite. `judgeComposite` therefore runs the PARTS
 * FIRST and returns a part's own verdict before any combinator rule is reached.
 * That ordering is what makes "a refused composite carries the part's cause
 * verbatim" structural rather than a promise, and it is why no code below asks
 * what kind of composite it is holding.
 *
 * The two scale scopes are deliberately NOT flattened. A `layer`'s shared scale
 * relates projections WITHIN one coordinate space; a `facet`'s scale policy
 * relates the panels a partition produces, each of which is its own coordinate
 * space. They constrain different pairs of projections, so a free facet policy
 * does not contradict a shared layer scale and vice versa.
 */
export type Combinator = "layer" | "facet" | "embed";

/**
 * A FACET's scale policy for a channel. Both values are legal and they are not a
 * validity enum: `shared` asserts cross-panel comparability and `free` trades it
 * away for resolution. What is ill-typed is declaring neither.
 */
export type ScalePolicy = "shared" | "free";

/**
 * A LAYER's declaration for a channel two or more of its parts read. The layer is
 * one coordinate space, so `shared` is the only value that can hold; `unshared` is
 * EXPRESSIBLE anyway, because the doctrine names an unshared positional scale in
 * one space as the dual-axis illegality, and a declaration that cannot be written
 * cannot be refused by name — it would collapse into the undeclared case.
 */
export type ScaleSharing = "shared" | "unshared";

/**
 * THE PREMISES AN ATOMIC OPERAND'S JUDGMENT DEPENDS ON. They travel WITH the
 * operand: the partition is supplied to the enumeration separately, and a later
 * reader that is handed only the program cannot reconstruct it.
 */
export type AtomicRequest = { partitionDimension?: string };

/**
 * A QUALIFIED OPERAND: one field view of an ALREADY-QUALIFIED relational
 * population, presented on one declared channel. The operand carries the
 * qualified result itself — the ONE object, never the rows — so what the
 * combinator rule sees is the structured source-grain observations the
 * qualification produced, with their standing already attached.
 */
export type QualifiedPart = {
  kind: "qualified";
  result: QualifiedRelationResult;
  /** The admitted field this view presents. A spelling declared by the relation, nothing more. */
  field: string;
  /** The channel the view presents the field on, from the fixed channel vocabulary. */
  channel: Channel;
};

export type CompositePart =
  | { kind: "program"; program: Program; request?: AtomicRequest }
  | { kind: "composite"; composite: Composite }
  | QualifiedPart;

/**
 * The source-grain identity a qualified operand brings to composition: the
 * normalized structured key of every observation it carries, SORTED, so the
 * set can be compared as a set. Co-registration is set identity over these —
 * never row order, never index, never cardinality, never field spelling.
 *
 * The identity also carries the presented view's own declared facts: the field
 * spelling and — where the qualification carried one — its bounds topology
 * ({lower, upper} endpoint field names, already validated at the
 * qualification boundary). These are what a layer may DERIVE from; the rule
 * never reopens the declaration behind a carried result.
 */
export type QualifiedOperandIdentity = {
  keys: readonly string[];
  field: string;
  bounds?: { lower: string; upper: string };
};

/**
 * A bounded-range group DERIVED at composition from the operands' carried
 * bounds facts. It states what the declarations state — the shared endpoint
 * pair and the bounded member fields — and nothing stronger: no start/end
 * roles, no traversal order, no direction. `members` is canonically SORTED;
 * its order is an artifact of comparison, never a semantic claim.
 */
export interface DerivedBoundedRange {
  lower: string;
  upper: string;
  members: readonly string[];
}

/** The canonical comparable form of one structured grain binding. */
const normalizedKey = (key: QualifiedRelationResult["observations"][number]["key"]): string =>
  JSON.stringify([...key].sort((a, b) => a.field.localeCompare(b.field)));

/**
 * The SHARED source-grain population a composite's operands carry: the sorted
 * normalized keys for set identity, and the per-observation structured
 * bindings a facet needs to resolve a partition coordinate. It travels upward
 * through `mergeReadings` only when every operand carries one and they agree —
 * a partition is bound against THIS and nothing else, never against rows or
 * the relation declaration.
 */
export type QualifiedOperandPopulation = {
  keys: readonly string[];
  bindings: ReadonlyArray<ReadonlyArray<{ field: string; value: string | number }>>;
};

/**
 * A panel DERIVED by a facet's partition binding: the carried value of the
 * partition coordinate and the observations that belong to it (normalized
 * structured keys, sorted). Membership says which observations belong
 * together; it says nothing about traversal order. `ranges` is the inner
 * composite's derived structure, carried UNRECONSTRUCTED into the panel.
 */
export interface DerivedFacetPanel {
  value: string | number;
  keys: readonly string[];
  ranges: readonly DerivedBoundedRange[];
}

export type LayerComposite = {
  combinator: "layer";
  parts: CompositePart[];
  /** Declared per channel. Required exactly for the channels two or more parts read. */
  sharing: Partial<Record<Channel, ScaleSharing>>;
};

export type FacetComposite = {
  combinator: "facet";
  parts: CompositePart[];
  /**
   * The source-grain coordinate the projection repeats over. For operands that
   * carry a shared qualified population it is ADJUDICATED: every carried
   * binding must resolve it, and the resulting panel membership is exposed on
   * the verdict. For the aggregate family, which carries no source-grain
   * population, it stays carried and unadjudicated — see COMPOSITION_NON_CLAIMS.
   */
  partition: string;
  /** Declared per channel the parts read. Both values are legal; they differ by a claim. */
  policy: Partial<Record<Channel, ScalePolicy>>;
};

export type EmbedComposite = {
  combinator: "embed";
  /** The host projection whose cell holds the embedded one. */
  host: Program;
  /** The channels the CELL can carry. Not a coordinate space: a cell is a budget. */
  budget: readonly Channel[];
  /** The baseline regime the cell offers on those channels. */
  cellBaseline: BaselineDecl;
  part: CompositePart;
};

export type Composite = LayerComposite | FacetComposite | EmbedComposite;

/**
 * What a part of a composite presents to the combinator above it. `file` is the
 * unit the declaration carries; `profile` is how the part's channels stand
 * across ITS OWN sub-projections, which is what lets a layer notice that an
 * operand has no single scale to share.
 */
export type PartReading = {
  kind: "retained";
  channels: Channel[];
  units: Partial<Record<Channel, UnitDecl>>;
  /** What each channel carries for this part, so a shared scale knows whether it is a quantity. */
  transformations: Partial<Record<Channel, Transformation>>;
  transformationRequirements: Partial<Record<Channel, Transformation[]>>;
  taskRequirements: Array<{ task: Task; transformation: Transformation }>;
  /**
   * Channels where two or more of the part's OWN sub-projections declare units
   * that are ESTABLISHED to be incompatible. This is the fact a summary may not
   * throw away: collapsing it to one representative unit would let a parent
   * treat kilograms and seconds as one scale.
   */
  unitConflict: Channel[];
  /** Channels where a sub-projection's declaration does not carry the unit, so commensurability is NOT ESTABLISHED. */
  unitUnestablished: Channel[];
  /**
   * How the channel stands across the part's OWN sub-projections. An atomic
   * projection is one coordinate space and always presents `shared`; a facet
   * presents what its policy declared. This is what lets a parent layer notice
   * that an operand has no single scale to share.
   */
  profile: Partial<Record<Channel, ScalePolicy>>;
  claims: Claim[];
  tasks: Task[];
  /** Present for an atomic part only: what `embed` needs to type a cell budget. */
  probe?: { coordinate: CoordinateSpace; baseline: BaselineDecl; task: Task; facts: ResultFacts };
  /** Present for a qualified operand only: the structured source-grain identity it brings to composition. */
  identity?: QualifiedOperandIdentity;
  /**
   * The shared source-grain population, present when every operand of a
   * composite carries one and they agree. This is what a facet binds its
   * `partition` against; it is carried, never re-derived from rows.
   */
  population?: QualifiedOperandPopulation;
  /**
   * Present on a layer's retained verdict: the bounded-range groups the layer
   * DERIVED from its direct qualified operands' carried bounds facts. A group
   * exists only where two or more distinct member fields share one declared
   * (lower, upper) pair. These do not silently merge into a parent's summary
   * through `mergeReadings`; a combinator that needs them reads its operand's
   * carried groups explicitly — as the facet does when it binds them into its
   * panels — so a derived fact is never attributed to a rule that did not
   * derive it.
   */
  ranges?: readonly DerivedBoundedRange[];
  /** Present on a facet's retained verdict: the panels the partition binding derived from the carried population. */
  panels?: readonly DerivedFacetPanel[];
};

/**
 * WHICH OPERAND a composite's fault is attributed to. `combinator` means the
 * composite's own rule fired; `host` and `part` name the two operands an `embed`
 * declares. They are kept apart because "the cell has no standing" and "what the
 * cell holds has no standing" are different repairs.
 */
export type OperandRole = "part" | "host" | "combinator";

export type CompositeRefusal = { kind: "refused"; causes: string[]; from: OperandRole; detail: string };
export type CompositeObligation = { kind: "unproven"; obligation: string; from: OperandRole; detail: string };
/**
 * A part asking a question this path does not implement. This is its OWN arm,
 * not an obligation and not a refusal: absent implementation is neither a
 * missing premise nor a contradiction, and folding it into either is the
 * collapse the support decision exists to prevent.
 */
export type CompositeUnsupported = {
  kind: "unsupported";
  resultKind: ResultKind;
  task?: Task;
  obligation: string;
  detail: string;
  from: OperandRole;
};

/** What a PART can be. A part has no combinator of its own; a composite does. */
export type PartVerdict = PartReading | CompositeUnsupported | CompositeRefusal | CompositeObligation;

export type CompositeVerdict = (PartReading & { combinator: Combinator }) | CompositeUnsupported | CompositeRefusal | CompositeObligation;

/**
 * The composite's own disposition AND every part disposition reached in the
 * tree, each at the path that produced it. The record is not a convenience: a
 * composite holding parts in several different states must report ALL of them,
 * so that the aggregate verdict is a conclusion drawn from the origins rather
 * than a summary that replaces them.
 */
export type CompositeJudgment = {
  verdict: CompositeVerdict;
  /**
   * Every operand reached in the tree, at its own path. An `embed`'s HOST is at
   * `"host"` and its embedded projection at `0`, so the two are never confused
   * for one another.
   */
  parts: Array<{ path: Array<number | "host">; verdict: PartVerdict }>;
};

export type CompositeInput = {
  structure: RelationalStructure;
  inventory: TargetInventory;
  composite: Composite;
  evidence?: unknown;
};

/**
 * What a composite does not claim. Stated here rather than left to inference,
 * because each of these is a place a reader could otherwise assume more than the
 * rule establishes.
 */
export const COMPOSITION_NON_CLAIMS: readonly string[] = [
  "The cell budget is a CHANNEL budget, declared rather than measured. The experiment does not type the cell's coordinate space, so a budget channel is not required to be hostable by the host projection's own space.",
  "The facet's partition is ADJUDICATED for operands that carry a shared qualified population: it must resolve against the carried source-grain bindings, and the derived panel membership is exposed on the verdict. For the aggregate family, which carries no source-grain population, it remains carried and unadjudicated — no doctrine cause names a partition a projection cannot repeat over, and inventing one there would be inventing vocabulary.",
  "A layer adds no claim of its own. It requires that the parts' shared channels be commensurable over one space; what that buys is the parts' own claims holding on one scale, not a further claim the parts did not make.",
  "Commensurability is decided by DECLARED units and declared conversions. A unit the declaration does not carry leaves the judgment unproven; it is never treated as commensurable by default, and dimension is never consulted.",
  "The commensurability question is put only where two or more parts read a shared channel as a QUANTITY. A shared nominal or ordinal channel carries identity, and this experiment does not adjudicate what it means for two parts to share one; it neither refuses it nor claims it commensurable.",
  "`cross-panel-comparability` is this layer's own claim name. The doctrine states that a facet's scale policy trade IS a claim; the name is L4's, and it is earned by a separating case rather than asserted: a shared policy induces it, a free policy withholds it, and every other claim is identical between the two.",
  "A layer adds no claim that its parts did not already make, and this experiment does not claim that the claim vocabulary is complete.",
  "An embed reads its HOST for STANDING and not for its channels: a retained host establishes that the cell is a lawful projection, and the embed still presents the cell's channels upward. This experiment does not type a host frame inside a composite.",
  "The host is not required to be a tabular projection. The doctrine describes an embedded projection as the value of a cell in a tabular projection, and no cause names a host of the wrong coordinate, so inventing one here would be inventing vocabulary.",
  "`enumerate` enumerates ATOMIC projections. Composites are JUDGED by `judgeComposite` and are not enumerated as candidates, so this slice establishes that a composite's legality follows from its parts and the combinator, not that the lawful composite space is enumerable.",
  "Co-registration between qualified operands is SET IDENTITY over structured source-grain keys, measured on the carried qualified results: it is not row order, not index, not cardinality, not field spelling, and not relation identity. The reordered-lawful and equal-cardinality/different-key controls exist to kill the positional implementations of exactly this.",
  "The layer rule consumes the qualified operand's carried result; it never reopens rows and never re-runs qualification, so correspondence between operands is established by carried identity at the composition boundary and by nothing else.",
  "A layer mixing a qualified operand with an aggregate program operand is outside this boundary and throws. Absent typing is neither a refusal nor a premise, and inventing a cross-family correspondence would be the claim-bearing decision this rule exists to keep analytical.",
  "The co-registration rule adds no claim of its own: equal structured key sets establish that the operands refer to the same observations, not that their joint presentation carries any further analytical property.",
  "The bounded-range group is DERIVED from the operands' carried bounds facts at composition time; it states lower, upper and bounded members and nothing stronger. It does not name start/end roles, increasing/decreasing direction, or traversal order, and the sorted member order is canonical, never semantic.",
  "Range membership is decided by the declared (lower, upper) endpoint PAIR alone: sharing one endpoint, sharing a population, or sharing a relation groups nothing.",
  "A derived range does not silently merge into a parent's summary through `mergeReadings`: a combinator that needs its operand's groups reads them explicitly and binds them, as the facet does into its panels. A layer mixing a qualified operand with any other operand family was already refused before derivation could run.",
  "A facet panel's membership is a statement about which observations belong together, never about traversal order: partition is not ordering, and the canonical sort of member keys inside a panel is an artifact of comparison.",
  "A facet never reopens source rows or the relation declaration to discover panel membership: the population it partitions is the carried source-grain binding set, and disagreement between its operands' populations refuses before any panel exists.",
  "The composite budget check asks, per presented channel, whether SOME budget channel can host that channel's carried transformation. It does NOT adjudicate channel MULTIPLICITY — two presented channels may share one host channel in this rule — because no separating case in this slice distinguishes 'the cell has one slot' from 'the cell has enough slots'; that distinction would need its own evidence.",
  "The composite branch reads only the facts a composite reading carries: channels and their transformations. A licence that would need a fact the reading does not carry (scale cyclicity for a cyclic-or-whole channel) leaves the premise unproven rather than defaulting, and the narrower claim-induction path is pinned against the atomic path's full-facts result.",
];

const refusedComposition = (causes: string[], from: OperandRole, detail: string): CompositeRefusal => ({
  kind: "refused",
  causes,
  from,
  detail,
});

const unprovenComposition = (obligation: string, from: OperandRole, detail: string): CompositeObligation => ({
  kind: "unproven",
  obligation,
  from,
  detail,
});

/**
 * Whether two declared units are commensurable: three-valued, because a
 * declaration that does not carry the fact is a missing premise and not a
 * contradiction. `perRow` is the schema's own statement that the observation,
 * not the declaration, decides — so it too is unproven here.
 */
export function unitsCommensurable(a: UnitDecl | undefined, b: UnitDecl | undefined): "yes" | "no" | "unknown" {
  if (!a || !b) return "unknown";
  if (a.perRow === true || b.perRow === true) return "unknown";
  const au = a.units ?? [];
  const bu = b.units ?? [];
  if (au.length === 0 || bu.length === 0) return "unknown";
  const ac = a.conversions ?? [];
  const bc = b.conversions ?? [];
  const shares = au.some((u) => bu.includes(u) || bc.includes(u)) || bu.some((u) => ac.includes(u));
  return shares ? "yes" : "no";
}

/** Read an ATOMIC part. Composite parts are recursed by `judgeCompositeAt`. */
function readPart(part: Extract<CompositePart, { kind: "program" }>, input: CompositeInput): PartVerdict {
  const { program } = part;
  // SUPPORT IS DECIDED FIRST, before the task table is read and before the
  // operation is judged. Consulting `TASK_INVARIANTS` first is what made an
  // unimplemented task an `unproven`, and that let "we did not build this" read
  // as "this premise is missing".
  const support = projectionSupport("relation", program.task);
  if (!support.supported) {
    return { kind: "unsupported", resultKind: "relation", task: program.task, obligation: support.obligation, detail: support.detail, from: "part" };
  }
  const judgment = judgeOperation(input.structure, program.operation, input.evidence);
  if (judgment.kind === "refused") return refusedComposition(judgment.causes, "part", judgment.reason);
  if (judgment.kind === "unproven") return unprovenComposition(judgment.obligation, "part", judgment.reason);
  const facts = judgment.facts;
  // AN INAPPLICABLE REQUEST IS NOT A JUDGMENT, so it is not a verdict either:
  // both consumers refuse it the same way. Accepting it here while the enumerator
  // throws is the drift this boundary exists to remove.
  const bindingFault = partitionBindingFault(facts, part.request?.partitionDimension);
  if (bindingFault) throw new Error(bindingFault);
  const classification = classifyAtomicProgram(program, facts, program.task, input.inventory, part.request?.partitionDimension);
  if (classification.kind === "refused") return refusedComposition([classification.cause], "part", classification.detail);
  if (classification.kind === "unproven") return unprovenComposition(classification.obligation, "part", classification.detail);
  const channels = [program.dimension, program.measure].sort();
  const units: Partial<Record<Channel, UnitDecl>> = {};
  const transformations: Partial<Record<Channel, Transformation>> = {};
  if (facts.dimension.unit) units[program.dimension] = facts.dimension.unit;
  if (facts.measure.unit) units[program.measure] = facts.measure.unit;
  transformations[program.dimension] = facts.dimension.transformation;
  transformations[program.measure] = facts.measure.transformation;
  const transformationRequirements: PartReading["transformationRequirements"] = {};
  for (const [ch, transformation] of [[program.dimension, facts.dimension.transformation], [program.measure, facts.measure.transformation]] as const) {
    transformationRequirements[ch] = [...new Set([...(transformationRequirements[ch] ?? []), transformation])].sort();
  }
  for (const ch of channels) if (transformationRequirements[ch]!.length > 1) delete transformations[ch];
  // An atomic projection IS one coordinate space, so each of its channels
  // presents exactly one scale. That is what a parent layer reads.
  const profile: Partial<Record<Channel, ScalePolicy>> = {};
  for (const ch of channels) profile[ch] = "shared";
  return {
    kind: "retained",
    channels,
    units,
    transformations,
    transformationRequirements,
    taskRequirements: [{ task: program.task, transformation: facts.measure.transformation }],
    unitConflict: [],
    unitUnestablished: [],
    profile,
    claims: inducedClaims(program, facts),
    tasks: [program.task],
    probe: { coordinate: program.coordinate, baseline: program.baseline, task: program.task, facts },
  };
}

/**
 * Read a QUALIFIED operand. The operand's standing is ITS OWN verdict, reached
 * before any combinator rule runs: a contradicted result refuses here with the
 * operand's own cause and the violated observations' structured keys named; an
 * unproven result leaves the composite unproven with the operand's own
 * obligation. Composition cannot erase or summarize an operand's standing —
 * it can only inherit it. A qualified result reads to a retained channel view
 * whose identity is the SORTED SET of normalized structured keys, and whose
 * unit and transformation come from the qualification's SNAPSHOT of the
 * presented field — never from the rows, which are not part of a qualified
 * result and would make correspondence re-derivable rather than carried.
 */
function readQualifiedPart(part: QualifiedPart, input: CompositeInput): PartVerdict {
  const { result, field, channel } = part;
  const fields = result.fields;
  if (!(field in fields) || result.grain.includes(field)) {
    throw new Error(`readQualifiedPart: the operand presents ${result.relation}.${field}, which the relation does not declare as a non-grain field — an inapplicable request, not a judgment`);
  }
  if (result.judgment.standing === "contradicted") {
    const where = result.judgment.boundsViolations.map((v) => JSON.stringify(v.key)).join("; ");
    return refusedComposition(
      [...(result.judgment.boundsViolations.length ? [QUALIFIED_DIAG.BOUNDS_ROW_VIOLATED] : []), ...(result.identity.duplicates.length ? [DIAG.GRAIN_FANOUT] : [])],
      "part",
      `the qualified operand ${result.relation} carries bounds contradictions at ${where || "none"} and duplicated complete grain bindings at observations [${result.identity.duplicates.join(", ")}]; composition cannot erase them`,
    );
  }
  if (result.judgment.standing === "unproven") {
    const where = result.judgment.evidenceGaps.map((g) => `${JSON.stringify(g.key)} (${g.participant} unreadable)`).join("; ");
    return unprovenComposition(
      result.identity.population === "missing" || result.identity.gaps.length ? OBLIGATION.GRAIN_DECLARED : OBLIGATION.BOUNDS_ROW_CONSISTENT,
      "part",
      `the qualified operand ${result.relation} has ${result.identity.population} population evidence, grain gaps ${JSON.stringify(result.identity.gaps)}, and bounds gaps ${where || "none"}; the composite cannot be more decided than its operand`,
    );
  }
  const decl = fields[field] ?? {};
  if (!input.inventory.channels.includes(channel)) {
    return { kind: "unsupported", resultKind: "relation", obligation: "target:channel-available", from: "part", detail: `the target ${input.inventory.id} does not supply ${channel}` };
  }
  if (!decl.transformation || !CAPACITY[channel].carries.includes(decl.transformation)) {
    return refusedComposition(["REL_CHANNEL_TRANSFORMATION_UNSUPPORTED"], "part", `${channel} cannot carry the declared ${decl.transformation ?? "unknown"} transformation of ${field}`);
  }
  if (CAPACITY[channel].requiresCyclicOrWhole && !decl.cyclic) {
    return unprovenComposition("channel:cyclic-or-whole", "part", `${channel} needs a carried cyclic-or-whole licence for ${field}`);
  }
  const channels = [channel];
  const units: Partial<Record<Channel, UnitDecl>> = {};
  const transformations: Partial<Record<Channel, Transformation>> = {};
  const profile: Partial<Record<Channel, ScalePolicy>> = {};
  if (decl.unit) units[channel] = decl.unit as UnitDecl;
  if (decl.transformation) transformations[channel] = decl.transformation as Transformation;
  // A qualified operand IS one view, so its channel presents one scale — the
  // same statement an atomic projection makes, and what a parent layer reads.
  profile[channel] = "shared";
  return {
    kind: "retained",
    channels,
    units,
    transformations,
    transformationRequirements: { [channel]: [decl.transformation] },
    taskRequirements: [],
    unitConflict: [],
    unitUnestablished: [],
    profile,
    claims: [],
    tasks: [],
    identity: {
      keys: result.observations.map((o) => normalizedKey(o.key)).sort(),
      field,
      // The bounds topology AS THE QUALIFICATION CARRIED IT — declared
      // endpoint names, already reference-validated at the qualification
      // boundary. The layer may derive from this; it never re-reads the
      // declaration behind a carried result.
      bounds: result.fieldFacts[field]?.bounds ? { ...result.fieldFacts[field]!.bounds } : undefined,
    },
    // The POPULATION the operand carries: the same structured bindings the
    // qualification produced, per observation, so a facet can resolve a
    // partition coordinate without ever touching rows.
    population: {
      keys: result.observations.map((o) => normalizedKey(o.key)).sort(),
      bindings: result.observations.map((o) => o.key.map((pair) => ({ field: pair.field, value: pair.value }))),
    },
  };
}

function mergeReadings(parts: PartReading[]): PartReading {
  const channels = [...new Set(parts.flatMap((p) => p.channels))].sort();
  const units: Partial<Record<Channel, UnitDecl>> = {};
  const transformations: Partial<Record<Channel, Transformation>> = {};
  const transformationRequirements: Partial<Record<Channel, Transformation[]>> = {};
  const profile: Partial<Record<Channel, ScalePolicy>> = {};
  const claims = new Set<Claim>();
  const tasks = new Set<Task>();
  const unitConflict = new Set<Channel>();
  const unitUnestablished = new Set<Channel>();
  for (const p of parts) {
    for (const ch of p.channels) {
      // A REPRESENTATIVE UNIT IS KEPT FOR CONVENIENCE ONLY. What a parent must
      // decide on is whether the operands AGREE, and that is decided over every
      // declaration rather than over whichever one was met first.
      if (p.units[ch] && !units[ch]) units[ch] = p.units[ch];
      transformationRequirements[ch] = [...new Set([...(transformationRequirements[ch] ?? []), ...(p.transformationRequirements[ch] ?? [])])].sort();
      profile[ch] = profile[ch] === "free" || p.profile[ch] === "free" ? "free" : "shared";
      // A part that is itself conflicted infects the summary.
      if (p.unitConflict.includes(ch)) unitConflict.add(ch);
      if (p.unitUnestablished.includes(ch)) unitUnestablished.add(ch);
    }
    p.claims.forEach((c) => claims.add(c));
    p.tasks.forEach((t) => tasks.add(t));
  }
  for (const ch of channels) {
    if (transformationRequirements[ch]?.length === 1) transformations[ch] = transformationRequirements[ch]![0];
    const users = parts.filter((p) => p.channels.includes(ch));
    if (users.length < 2) continue;
    // Only a shared QUANTITATIVE scale has a unit to commensurate.
    const declared = users.map((p) => p.units[ch]);
    const metric = users.filter((p) => {
      return p.transformationRequirements[ch]?.some(tr => tr === "interval" || tr === "ratio");
    });
    if (metric.length < 2) continue;
    void declared;
    // EVERY RELEVANT PAIR, not every participant against the first. Establishment
    // needs the universal condition — all pairs compatible — while refutation
    // needs ONE applicable witness, and an unrelated missing declaration cannot
    // undo a contradiction that was already observed. Comparing each participant
    // with `metric[0]` made a known kg/seconds incompatibility vanish whenever an
    // undeclared panel happened to be ordered first.
    let incompatible = false;
    let unknown = false;
    for (let i = 0; i < metric.length; i++) {
      for (let j = i + 1; j < metric.length; j++) {
        const verdict = unitsCommensurable(metric[i]!.units[ch], metric[j]!.units[ch]);
        if (verdict === "no") incompatible = true;
        else if (verdict === "unknown") unknown = true;
      }
    }
    if (incompatible) {
      unitConflict.add(ch);
      unitUnestablished.delete(ch);
    } else if (unknown && !unitConflict.has(ch)) {
      unitUnestablished.add(ch);
    }
  }
  // A SHARED POPULATION travels upward only when it is genuinely shared: every
  // operand must carry one AND they must agree on the key set. Anything less
  // means no single population travels, and a parent that needs one (a facet)
  // refuses rather than choosing among candidates.
  const populations = parts.map((p) => p.population).filter((p): p is QualifiedOperandPopulation => p !== undefined);
  let population: QualifiedOperandPopulation | undefined;
  if (populations.length > 0 && populations.length === parts.length) {
    const first = populations[0]!;
    const firstKeys = JSON.stringify(first.keys);
    if (populations.every((p) => JSON.stringify(p.keys) === firstKeys)) population = first;
  }
  return {
    kind: "retained",
    channels,
    units,
    transformations,
    transformationRequirements,
    taskRequirements: parts.flatMap(p => p.taskRequirements),
    unitConflict: [...unitConflict].sort(),
    unitUnestablished: [...unitUnestablished].sort(),
    profile,
    claims: [...claims].sort(),
    tasks: [...tasks].sort(),
    population,
  };
}

/**
 * `layer` — several projections over ONE coordinate space with shared scales.
 *
 * The rule reads the parts and the declaration and nothing else. A channel two
 * parts both read is one scale over that one space, so the layer must declare it
 * shared: declaring it unshared IS the dual-axis illegality, and declaring
 * nothing does not make it unshared, because marks in one space imply one scale.
 * A channel only one part reads shares nothing, so a declaration there is inert.
 *
 * SOURCE-GRAIN CO-REGISTRATION is decided first, for layers carrying qualified
 * operands: the operands may share one coordinate space only when the
 * observations they refer to are the SAME observations — equal structured
 * source-grain key SETS. Row order, index and cardinality decide nothing; the
 * sets are compared as sets. An equal-cardinality mismatch is an observed
 * unregistration (refused); a difference in extent leaves which observation
 * corresponds to which unresolved, and the population premise stays explicit
 * (unproven) rather than silently intersecting the operands. Every illegality
 * wins over any outstanding premise, the same order `deriveStatus` uses.
 */
function judgeLayer(c: LayerComposite, parts: PartReading[]): CompositeVerdict {
  // The comparison is over the identity the operands CARRIED — the qualified
  // result's own structured keys. No operand's rows are reopened and no
  // qualification is re-run: correspondence is carried, not reconstructed.
  // (Family homogeneity — no qualified operand beside a program or
  // sub-composite — is enforced before the parts are read.)
  const identified = parts.map((p, i) => ({ i, identity: p.identity })).filter((x): x is { i: number; identity: QualifiedOperandIdentity } => x.identity !== undefined);
  if (identified.length > 0) {
    let unregistered: { a: number; b: number; onlyA: string[]; onlyB: string[] } | undefined;
    let unmatched: { a: number; b: number; onlyA: string[]; onlyB: string[] } | undefined;
    for (let i = 0; i < identified.length; i++) {
      for (let j = i + 1; j < identified.length; j++) {
        const ka = identified[i]!.identity.keys;
        const kb = identified[j]!.identity.keys;
        const onlyA = ka.filter((k) => !kb.includes(k));
        const onlyB = kb.filter((k) => !ka.includes(k));
        if (onlyA.length === 0 && onlyB.length === 0) continue;
        const record = { a: identified[i]!.i, b: identified[j]!.i, onlyA, onlyB };
        // Equal cardinality with differing keys is an OBSERVED mismatch; a
        // difference in extent is an unresolved population premise. An
        // illegality, once observed, is not demoted by a missing premise.
        if (ka.length === kb.length) unregistered ??= record;
        else unmatched ??= record;
      }
    }
    if (unregistered) {
      return refusedComposition(
        [COMPOSITION_DIAG.LAYER_OPERANDS_UNCOREGISTERED],
        "combinator",
        `operands ${unregistered.a} and ${unregistered.b} claim one population at equal cardinality, but their structured source-grain key sets differ — keys only the first carries: [${unregistered.onlyA.join(", ")}], keys only the second carries: [${unregistered.onlyB.join(", ")}]`,
      );
    }
    if (unmatched) {
      return unprovenComposition(
        "grain:coregistered",
        "combinator",
        `operands ${unmatched.a} and ${unmatched.b} do not carry the same observations — keys only the first carries: [${unmatched.onlyA.join(", ")}], keys only the second carries: [${unmatched.onlyB.join(", ")}] — so which observation corresponds to which is unresolved; the population premise is explicit, not silently intersected`,
      );
    }
  }
  // BOUNDED-RANGE DERIVATION, after co-registration has held: among the
  // qualified operands, members group by the (lower, upper) endpoint pair
  // their CARRIED bounds facts declare. The topology — not the population, not
  // the observation count, not the spelling — determines membership: sharing a
  // lower alone is not a group, and a group exists only where two or more
  // DISTINCT member fields share one pair. The group states what the
  // declarations state — lower, upper, members — and nothing stronger: no
  // start/end roles, no traversal order, no direction. Member order is the
  // canonical sort, an artifact of comparison, never a semantic claim.
  const rangeGroups = new Map<string, { lower: string; upper: string; members: Set<string> }>();
  for (const p of parts) {
    const id = p.identity;
    if (!id?.bounds) continue;
    const pairKey = JSON.stringify([id.bounds.lower, id.bounds.upper]);
    const group = rangeGroups.get(pairKey) ?? { lower: id.bounds.lower, upper: id.bounds.upper, members: new Set<string>() };
    group.members.add(id.field);
    rangeGroups.set(pairKey, group);
  }
  const ranges: DerivedBoundedRange[] = [...rangeGroups.values()]
    .filter((g) => g.members.size >= 2)
    .map((g) => ({ lower: g.lower, upper: g.upper, members: [...g.members].sort() }))
    .sort((a, b) => (a.lower === b.lower ? a.upper.localeCompare(b.upper) : a.lower.localeCompare(b.lower)));
  const merged = mergeReadings(parts);
  for (const ch of merged.channels) {
    const users = parts.filter((p) => p.channels.includes(ch));
    if (users.length < 2) continue;
    const declared = c.sharing[ch];
    if (declared !== "shared") {
      return refusedComposition(
        ["REL_LAYER_SCALE_UNSHARED"],
        "combinator",
        `the parts share ${ch} over one coordinate space and the layer declares ${declared ? `it ${declared}` : "no sharing for it"}; marks in one space imply one scale`,
      );
    }
    // AN OPERAND WHOSE OWN SUB-PROJECTIONS DISAGREE HAS NO SINGLE SCALE either,
    // and picking one of its units as representative would let kilograms and
    // seconds pass as commensurable through the summary.
    const conflicted = users.find((p) => p.unitConflict.includes(ch));
    if (conflicted) {
      return refusedComposition(
        ["REL_UNIT_INCOMMENSURABLE_SHARED_SCALE"],
        "combinator",
        `the layer shares ${ch}, and an operand's own sub-projections declare units that are not convertible, so it has no single scale to share`,
      );
    }
    const unestablishedIn = users.find((p) => p.unitUnestablished.includes(ch));
    if (unestablishedIn) {
      return unprovenComposition(
        "unit:commensurable",
        "combinator",
        `the layer shares ${ch}, and an operand's own sub-projections leave its unit unestablished, so the shared scale is not established`,
      );
    }
    // A part that exposes the channel free is a sub-composite whose own
    // sub-projections are separately scaled, so there is no one scale to share.
    const free = users.find((p) => p.profile[ch] === "free");
    if (free) {
      return refusedComposition(
        ["REL_LAYER_SCALE_UNSHARED"],
        "combinator",
        `the layer shares ${ch} and an operand exposes it free, so the layer has no single scale over one coordinate space`,
      );
    }
    // DIMENSIONAL ANALYSIS IS A QUESTION ABOUT QUANTITY. A shared nominal
    // channel carries the identity of each case, not a magnitude, so it has no
    // unit to commensurate and asking for one would refuse every lawful layer
    // whose parts share a label channel — which is most of them. The question is
    // put only where at least two parts read the channel as a quantity.
    const quantitative = users.filter((p) => {
      const transformation = p.transformations[ch];
      return transformation === "interval" || transformation === "ratio";
    });
    if (quantitative.length < 2) continue;
    const verdicts = quantitative.map((p) => unitsCommensurable(quantitative[0]!.units[ch], p.units[ch]));
    if (verdicts.includes("no")) {
      return refusedComposition(
        ["REL_UNIT_INCOMMENSURABLE_SHARED_SCALE"],
        "combinator",
        `the parts share the ${ch} scale and their declared units are not convertible, so dimensional analysis fails across it`,
      );
    }
    if (verdicts.includes("unknown")) {
      return unprovenComposition(
        "unit:commensurable",
        "combinator",
        `the parts share the ${ch} scale and a part's declaration does not carry the unit, so commensurability across it is not established`,
      );
    }
  }
  return { ...merged, combinator: "layer", ranges };
}

/**
 * `facet` — repeat a projection over a partition with a declared scale policy.
 *
 * Both policies are legal and they are not a validity enum: `shared` asserts
 * cross-panel comparability and `free` trades it for resolution. What is
 * ill-typed is declaring NEITHER, because the trade is a claim.
 *
 * The rule deliberately does not read the parts' own profiles. A facet's policy
 * governs ACROSS panels; a part's profile governs WITHIN one. Consulting the
 * parts here would make a facet of a shared-scale layer look contradictory when
 * it is not.
 */
function judgeFacet(c: FacetComposite, parts: PartReading[]): CompositeVerdict {
  const merged = mergeReadings(parts);
  // PARTITION BINDING, before any scale question: when the operands carry a
  // shared source-grain population, the declared partition must resolve to a
  // coordinate those CARRIED bindings bind on every observation, and the
  // resulting panel membership is exposed on the verdict. An unresolvable
  // partition refuses before panels exist — a supplied-or-absent row value
  // never authorizes the reference. Operands carrying no population (the
  // aggregate family) keep the partition carried and unadjudicated.
  let panels: DerivedFacetPanel[] | undefined;
  const carrying = parts.filter((p) => p.population !== undefined);
  if (carrying.length > 0) {
    if (carrying.length !== parts.length) {
      throw new Error("judgeFacet: a facet mixing population-carrying operands with operands that carry no source-grain population is not typed by this boundary — an inapplicable request, not a judgment");
    }
    if (merged.population === undefined) {
      return refusedComposition(
        [COMPOSITION_DIAG.FACET_PARTITION_UNBOUND],
        "combinator",
        `the facet partitions one population, and its operands carry different source-grain populations, so there is no single population to partition`,
      );
    }
    const bindings = merged.population.bindings;
    const unresolved = bindings.filter((b) => !b.some((pair) => pair.field === c.partition));
    if (unresolved.length > 0) {
      return refusedComposition(
        [COMPOSITION_DIAG.FACET_PARTITION_UNBOUND],
        "combinator",
        `the facet partitions by ${c.partition}, which the carried source-grain bindings do not bind on ${unresolved.length} of ${bindings.length} observations; a partition coordinate must be CARRIED, and a supplied-or-absent row value cannot authorize it`,
      );
    }
    const byValue = new Map<string | number, string[]>();
    for (const b of bindings) {
      const value = b.find((pair) => pair.field === c.partition)!.value;
      const keys = byValue.get(value) ?? [];
      keys.push(normalizedKey(b));
      byValue.set(value, keys);
    }
    // The inner composite's derived structure is CARRIED into each panel, not
    // reconstructed and not re-derived: the facet reads its operand's groups.
    const inner = parts.flatMap((p) => p.ranges ?? []);
    const ranges = inner.filter((r, i) => inner.findIndex((x) => JSON.stringify(x) === JSON.stringify(r)) === i);
    panels = [...byValue.entries()]
      .sort(([a], [b]) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
      .map(([value, keys]) => ({ value, keys: [...keys].sort(), ranges }));
  }
  const profile: Partial<Record<Channel, ScalePolicy>> = {};
  let anyShared = false;
  for (const ch of merged.channels) {
    const declared = c.policy[ch];
    if (declared !== "shared" && declared !== "free") {
      return refusedComposition(
        ["REL_FACET_SCALE_POLICY_UNDECLARED"],
        "combinator",
        `the panels read ${ch} and the facet declares no scale policy for it; cross-facet comparability is a claim, and leaving the policy undeclared is ill-typed`,
      );
    }
    profile[ch] = declared;
    if (declared === "shared") {
      // A SHARED POLICY IS A COMPARABILITY CLAIM, and it cannot hold over
      // operands whose declared units are established to be incompatible.
      if (merged.unitConflict.includes(ch)) {
        return refusedComposition(
          ["REL_UNIT_INCOMMENSURABLE_SHARED_SCALE"],
          "combinator",
          `the facet declares ${ch} shared across panels, and the panels' declared units are not convertible, so the comparability it claims does not hold`,
        );
      }
      if (merged.unitUnestablished.includes(ch)) {
        return unprovenComposition(
          "unit:commensurable",
          "combinator",
          `the facet declares ${ch} shared across panels, and a panel's declaration does not carry the unit, so cross-panel comparability is not established`,
        );
      }
      anyShared = true;
    }
  }
  const claims = new Set(merged.claims);
  if (anyShared) claims.add("cross-panel-comparability");
  return { ...merged, combinator: "facet", profile, claims: [...claims].sort(), panels };
}

/**
 * `embed` — a projection as the value of a cell in a tabular projection.
 *
 * The embedded projection is typed against the cell's CHANNEL BUDGET. The
 * question is whether the budget can induce the claims the declared task
 * requires, asked of the same capacity table every other rule reads: a cell with
 * position but a truncated baseline induces difference comparability and not
 * ratio comparability, so it cannot serve a magnitude comparison however
 * convenient the arithmetic would be.
 */
function judgeEmbed(c: EmbedComposite, part: PartReading, host: PartReading | undefined): CompositeVerdict {
  if (!part.probe) {
    // COMPOSITE BRANCH: the budget is typed against the COMPLETE outward
    // reading, never against one atomic descendant. Every channel the
    // composite presents must be hostable at its carried transformation by
    // SOME budget channel; a presented channel whose only host needs a fact
    // the reading does not carry (a cyclic-or-whole licence with no carried
    // cyclicity) leaves the premise UNPROVEN rather than defaulting, and a
    // presented channel no budget channel can host refuses with the same
    // budget rule the atomic path uses. Nothing is re-read: the reading's own
    // channels, transformations, claims, ranges, panels and population travel
    // through the verdict untouched.
    const presented = part.channels.flatMap(ch => (part.transformationRequirements[ch] ?? []).map(transformation => ({ ch, transformation })));
    const unhostable: string[] = [];
    const unlicensed: string[] = [];
    const inCell = new Set<Claim>();
    for (const { ch, transformation } of presented) {
      const hosts = c.budget.filter((b) => CAPACITY[b].carries.includes(transformation));
      if (hosts.length === 0) {
        unhostable.push(`${ch}:${transformation}`);
        continue;
      }
      const licensed = hosts.filter((b) => !CAPACITY[b].requiresCyclicOrWhole);
      if (licensed.length === 0) {
        unlicensed.push(`${ch}:${transformation}`);
        continue;
      }
      for (const b of licensed) for (const claim of channelClaimsForTransformation(b, c.cellBaseline, transformation)) inCell.add(claim);
    }
    if (unhostable.length > 0) {
      return refusedComposition(
        ["REL_EMBED_TASK_EXCEEDS_CHANNEL_BUDGET"],
        "combinator",
        `the cell budget [${[...c.budget].join(", ")}] at a ${c.cellBaseline} baseline cannot host the channel(s) the composite presents as ${unhostable.join(", ")}; every presented channel must be hosted, not one descendant's`,
      );
    }
    if (unlicensed.length > 0) {
      return unprovenComposition(
        "budget:channel-licence",
        "combinator",
        `the cell budget [${[...c.budget].join(", ")}] offers only cyclic-or-whole channels for the composite's presented ${unlicensed.join(", ")}, and the reading carries no cyclicity, so the licence is not established`,
      );
    }
    for (const requirement of part.taskRequirements) {
      const spec = TASK_INVARIANTS[requirement.task];
      if ("notEnumerated" in spec) return unprovenComposition(spec.notEnumerated, "part", `the ${requirement.task} task is not enumerated`);
      const claims = c.budget.filter(ch => CAPACITY[ch].carries.includes(requirement.transformation) && !CAPACITY[ch].requiresCyclicOrWhole)
        .flatMap(ch => channelClaimsForTransformation(ch, c.cellBaseline, requirement.transformation));
      const missing = spec.requires.filter(claim => !claims.includes(claim));
      if (missing.length) return refusedComposition(["REL_EMBED_TASK_EXCEEDS_CHANNEL_BUDGET"], "combinator", `the cell cannot discharge ${requirement.task}: ${missing.join(", ")}`);
    }
    if (!host) {
      return unprovenComposition("host:standing", "host", "the embed reached its rule with no retained host reading, which is a defect in this checker rather than in the declaration");
    }
    return { ...part, combinator: "embed", claims: [...new Set([...part.claims, ...inCell])].sort() };
  }
  const spec = TASK_INVARIANTS[part.probe.task];
  if ("notEnumerated" in spec) {
    return unprovenComposition(spec.notEnumerated, "part", `the embedded part declares the ${part.probe.task} task, which this experiment does not enumerate`);
  }
  const inCell = new Set<Claim>();
  for (const ch of c.budget) {
    if (!CAPACITY[ch].carries.includes(part.probe.facts.measure.transformation)) continue;
    if (CAPACITY[ch].requiresCyclicOrWhole && !part.probe.facts.measure.cyclic) continue;
    for (const claim of channelClaims(ch, c.cellBaseline, part.probe.facts)) inCell.add(claim);
  }
  const missing = spec.requires.filter((claim) => !inCell.has(claim));
  if (missing.length > 0) {
    return refusedComposition(
      ["REL_EMBED_TASK_EXCEEDS_CHANNEL_BUDGET"],
      "combinator",
      `the cell budget [${[...c.budget].join(", ")}] at a ${c.cellBaseline} baseline induces ${[...inCell].sort().join(", ") || "nothing"}, and the ${part.probe.task} task requires ${missing.join(", ")}`,
    );
  }
  // The host's STANDING is a premise; its channels are not merged into the
  // embed's. The cell is what the composite presents upward, and this experiment
  // does not type a host frame inside a composite — see COMPOSITION_NON_CLAIMS.
  if (!host) {
    return unprovenComposition("host:standing", "host", "the embed reached its rule with no retained host reading, which is a defect in this checker rather than in the declaration");
  }
  return { ...part, combinator: "embed", claims: [...new Set([...part.claims, ...inCell])].sort() };
}

/**
 * Judge a composite. The parts run first, so a part's own verdict — including its
 * own cause — reaches the caller before any combinator rule has had a chance to
 * replace it with a composite-shaped one.
 */
export function judgeComposite(input: CompositeInput): CompositeJudgment {
  return judgeCompositeAt(input, []);
}

function judgeCompositeAt(input: CompositeInput, path: Array<number | "host">): CompositeJudgment {
  const { composite } = input;
  const parts = composite.combinator === "embed" ? [composite.part] : composite.parts;
  // A LAYER'S OPERAND FAMILY is decided before any part is read. Qualified
  // operands carry source-grain identity; aggregate programs and sub-composites
  // do not, so a layer mixing them would have to INVENT the correspondence
  // between its operands — the claim-bearing decision this boundary exists to
  // keep analytical. An inapplicable request is not a judgment.
  if (composite.combinator === "layer") {
    const kinds = new Set(parts.map((p) => p.kind));
    if (kinds.has("qualified") && kinds.size > 1) {
      throw new Error("judgeLayer: a layer mixing a qualified operand with an aggregate program operand is not typed by this boundary; co-registration is decided between qualified operands — an inapplicable request, not a judgment");
    }
  }
  const readings: PartReading[] = [];
  const record: Array<{ path: Array<number | "host">; verdict: PartVerdict }> = [];
  let fault: CompositeVerdict | undefined;
  // THE HOST IS AN OPERAND, and it is read FIRST: a cell must have standing
  // before what it holds can be typed against it. It is kept OUT of `readings`,
  // which carries the parts a combinator rule folds together, so the embedded
  // projection stays the reading the embed rule sees.
  let hostReading: PartReading | undefined;
  if (composite.combinator === "embed") {
    const hostVerdict = readPart({ kind: "program", program: composite.host }, input);
    record.push({ path: [...path, "host"], verdict: hostVerdict });
    if (hostVerdict.kind === "retained") {
      hostReading = hostVerdict;
    } else {
      fault = { ...hostVerdict, from: "host" };
    }
  }

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const here = [...path, i];
    let verdict: PartVerdict;
    if (part.kind === "composite") {
      const inner = judgeCompositeAt({ ...input, composite: part.composite }, here);
      // The inner tree's origins are carried out, not summarised away.
      record.push(...inner.parts);
      verdict = inner.verdict;
    } else if (part.kind === "qualified") {
      verdict = readQualifiedPart(part, input);
    } else {
      verdict = readPart(part, input);
    }
    record.push({ path: here, verdict });

    if (verdict.kind === "retained") {
      readings.push(verdict);
      continue;
    }
    // EVERY PART IS READ, even after one has faulted, so a composite holding
    // several faults reports all of them. The most severe becomes the composite's
    // own verdict, and the rest stay visible in `parts` rather than vanishing.
    const severity = { retained: 0, unsupported: 1, unproven: 2, refused: 3 };
    const candidate = { ...verdict, from: "part" as const };
    if (!fault || severity[verdict.kind] > severity[fault.kind] || (severity[verdict.kind] === severity[fault.kind] && JSON.stringify(candidate) < JSON.stringify(fault))) {
      // ATTRIBUTION IS RE-STATED AT EACH LEVEL, deliberately. `from` answers "was
      // this composite refused by its own combinator rule, or did a part arrive
      // already faulted?" — the question the compositional invariant turns on.
      // Propagating a nested verdict's own `from` unchanged would make an outer
      // composite appear to have refused by a rule it does not have, while
      // propagating its cause unchanged keeps the fault named where it occurred.
      fault = candidate;
    }
  }

  if (fault) return { verdict: fault, parts: record };
  const verdict =
    composite.combinator === "layer"
      ? judgeLayer(composite, readings)
      : composite.combinator === "facet"
        ? judgeFacet(composite, readings)
        : judgeEmbed(composite, readings[0]!, hostReading);
  return { verdict, parts: record };
}

/** A composite's claims, sorted, for a control that names them rather than counting. */
export const compositeClaimSet = (v: CompositeVerdict): string[] => (v.kind === "retained" ? v.claims : []);

/** The channels a composite presents, sorted. */
export const compositeChannels = (v: CompositeVerdict): string[] => (v.kind === "retained" ? v.channels : []);

/* --------------------------------------- the catalogue of names, GENERATED */

/**
 * WHAT A NAME ASSERTS ABOUT A PROJECTION.
 *
 * The doctrine is exact about this: requesting a form is an assertion of its
 * preconditions, and the catalogue is generated from the projection space and
 * the pack — it is never a source of truth. So the pack declares REGIONS, and
 * what a name actually names is computed from the live enumeration.
 */
export type FormRegion = { coordinate?: CoordinateSpace; dimension?: Channel; measure?: Channel };

/** A name and the region it asserts. Vocabulary, and it lives in the pack. */
export type FormDeclaration = { name: string; colloquial: string; asserts: FormRegion };

export type CatalogueEntry = { name: string; colloquial: string; asserts: FormRegion; programs: string[] };

/**
 * A name whose region selected nothing here. Kept as its OWN result rather than
 * dropped, because an assertion that cannot be discharged is a thing to report:
 * the system discharges a form's preconditions, fails and names the
 * precondition, or reports the premise it cannot yet decide.
 */
export type CatalogueUnsatisfied = {
  name: string;
  colloquial: string;
  asserts: FormRegion;
  /**
   * WHY nothing was retained, in the enumeration's OWN terms. These permit the
   * same empty result and require different next actions: supply evidence,
   * implement support, or change an analytically invalid request.
   */
  reason: "unsupported" | "not-in-space" | "no-retained-match";
  detail: string;
  /** The enumeration's support decision for a request outside its supported family. */
  support?: SupportDecision;
  /** Refused candidates whose point satisfies the region, each with the cause it carried. */
  refused: Array<{ program: string; cause: string }>;
  /** Undecided candidates whose point satisfies the region, each with the obligation it carried. */
  undecided: Array<{ program: string; obligation: string }>;
};

export type AliasCatalogue = { entries: CatalogueEntry[]; unsatisfied: CatalogueUnsatisfied[] };

export const FORM_REGIONS_FILE = "analytical-pack/form-regions.json";

export function loadFormDeclarations(contractsDir: string = CONTRACTS_DIR): FormDeclaration[] {
  const parsed = JSON.parse(fs.readFileSync(path.join(contractsDir, FORM_REGIONS_FILE), "utf-8")) as { regions?: FormDeclaration[] };
  if (!Array.isArray(parsed.regions)) throw new Error(`${FORM_REGIONS_FILE} declares no regions array`);
  return parsed.regions;
}

/** Whether a program's point satisfies every constraint the region states. */
export const regionMatches = (region: FormRegion, p: { coordinate: CoordinateSpace; dimension: Channel; measure: Channel }): boolean =>
  (region.coordinate === undefined || region.coordinate === p.coordinate) &&
  (region.dimension === undefined || region.dimension === p.dimension) &&
  (region.measure === undefined || region.measure === p.measure);

/**
 * Whether ANY point the inventory can host satisfies the region, ignoring the
 * basis entirely. This is what separates "not a projection this target has" from
 * "a projection this target has and this result does not license" — two
 * different failures that a single `unsatisfied` list would conflate.
 */
function regionIsInSpace(region: FormRegion, inventory: TargetInventory): boolean {
  for (const coordinate of inventory.spaces) {
    for (const dimension of inventory.channels) {
      for (const measure of inventory.channels) {
        if (dimension === measure) continue;
        if (!regionMatches(region, { coordinate, dimension, measure })) continue;
        if (!CAPACITY[dimension].spaces.includes(coordinate)) continue;
        if (!CAPACITY[measure].spaces.includes(coordinate)) continue;
        return true;
      }
    }
  }
  return false;
}

/**
 * Generate the catalogue FROM an enumeration and the pack's declared regions.
 *
 * The enumeration is an INPUT, which is the structural reason a name cannot
 * admit, refuse or undecide a program: there is no path from this function back
 * into the search, and an entry exists only because the search already retained
 * the program it names. A region that selects nothing becomes an unsatisfied
 * assertion with the reason, never an entry.
 */
export function generateAliasCatalogue(
  declarations: readonly FormDeclaration[],
  e: Enumeration,
  inventory: TargetInventory,
): AliasCatalogue {
  const retained = e.retained.map((p) => ({ coordinate: p.coordinate, dimension: p.dimension, measure: p.measure, key: `${p.coordinate}|${p.dimension}|${p.measure}` }));
  const entries: CatalogueEntry[] = [];
  const unsatisfied: CatalogueUnsatisfied[] = [];
  for (const d of [...declarations].sort((a, b) => a.name.localeCompare(b.name))) {
    const programs = retained.filter((p) => regionMatches(d.asserts, p)).map((p) => p.key).sort();
    if (programs.length > 0) {
      entries.push({ name: d.name, colloquial: d.colloquial, asserts: d.asserts, programs });
      continue;
    }
    // THE ENUMERATION'S OWN EVIDENCE, NOT A MANUFACTURED LABEL. A region holding
    // BOTH refused and undecided candidates keeps both, because a consumer's next
    // action differs between them and choosing whichever came first would lose
    // the distinction the enumeration already made.
    const matches = (q: { coordinate: CoordinateSpace; dimension: Channel; measure: Channel }) => regionMatches(d.asserts, q);
    const refused = e.refused.filter((r) => matches(r.program)).map((r) => ({ program: `${r.program.coordinate}|${r.program.dimension}|${r.program.measure}`, cause: r.cause }));
    const undecided = e.undecided.filter((u) => matches(u.program)).map((u) => ({ program: `${u.program.coordinate}|${u.program.dimension}|${u.program.measure}`, obligation: u.obligation }));
    const inSpace = regionIsInSpace(d.asserts, inventory);
    if (!e.support.supported) {
      unsatisfied.push({
        name: d.name,
        colloquial: d.colloquial,
        asserts: d.asserts,
        reason: "unsupported",
        detail: `the ${e.support.resultKind}-valued path does not implement the ${e.support.task} task, so no candidate space was searched`,
        support: e.support,
        refused,
        undecided,
      });
      continue;
    }
    unsatisfied.push({
      name: d.name,
      colloquial: d.colloquial,
      asserts: d.asserts,
      reason: inSpace ? "no-retained-match" : "not-in-space",
      detail: inSpace
        ? refused.length + undecided.length > 0
          ? `the inventory can host this region; no candidate over this result was retained, and the enumeration's own dispositions for it are carried here`
          : "the inventory can host this region, and no candidate over this result matched it at all"
        : "the inventory hosts no such point at all: no coordinate it offers hosts both channels with those transformations",
      refused,
      undecided,
    });
  }
  return { entries, unsatisfied };
}

/** The catalogue for an enumeration, read from the pack's declared regions. */
export function catalogueFor(e: Enumeration, inventory: TargetInventory, contractsDir: string = CONTRACTS_DIR): AliasCatalogue {
  return generateAliasCatalogue(loadFormDeclarations(contractsDir), e, inventory);
}

/**
 * THE NAMES A HUMAN WOULD REACH FOR, and why this module does not contain them.
 * A form name lives in the governed pack and reaches a reader only through the
 * generated catalogue above, so invariant 1 is enforced structurally: there is
 * no literal here to check, because there is no literal here.
 */
export const CATALOGUE_NON_CLAIMS: readonly string[] = [
  "The catalogue is generated PER ENUMERATION. A name is in it because the search retained a program matching its region over THIS result, so a name absent here is not absent in general.",
  "A region that states a subset of coordinate, dimension and measure constrains only what it states; the catalogue does not claim a region is the smallest one naming those programs.",
  "Generation establishes that every entry names a retained program and that no entry is read back into the search. It does not establish that the declared regions are the RIGHT regions, or that the vocabulary is complete.",
  "An unsatisfied name is a report about the pack's assertion and this result together. It is not a judgment that the asserted projection is unlawful in general.",
];

/**
 * WHAT THE CORPUS-PROBE AND OHLC RUNS DO NOT ESTABLISH.
 *
 * These exist because the first reading of those runs inverted the experiment:
 * it took results obtained by asking an EASIER question and treated them as
 * evidence about the harder one. A scope boundary limits what a run establishes;
 * it does not establish what the substrate is allowed to express.
 */
export const OHLC_PROBE_NON_CLAIMS: readonly string[] = [
  "A SUCCESSFUL EXECUTION OF A TRANSFORMED QUESTION IS NOT A SUCCESSFUL EXPRESSION OF THE ORIGINAL QUESTION. Binding `sum` over each measure asks five familiar scalar questions; it is not evidence that OHLC's defining relationships survive projection or composition.",
  "The five measures are NOT shown to be a co-registered object. Co-registration is a relationship between quantities belonging to one identified observation, and asking each field an independent scalar question cannot establish it. Independently valid scalar fields are not a valid joint object.",
  "The corpus-probe census is an EXECUTION-BOUNDARY census. It reports which fixtures reach the entry point and why the others do not. It is not evidence that any fixture's characteristic analytical structure survives: a successful hierarchy sum is not evidence that parent-child structure survives, and a successful count-field sum is not evidence that unequal-bin density or interval closure survives.",
  "The result carrier TRANSPORTS `temporality.kind` but does not interpret it. An `interval` kind on the facts says the observation extends over its grain; it does NOT establish that a consumer can obtain an extent or a duration, and `transformation: \"interval\"` never stood for temporal support. A field declaring no temporality contributes no temporal fact, and no default may be read out of that absence.",
  "SERIES IDENTITY IS NOT SHOWN TO SURVIVE. The shipped fixture holds one symbol across two periods, so summing across symbols happens to preserve each numeric value there. On that population the loss of series identity is invisible; it does not make aggregation meaning-preserving for the source-grain question.",
  "The bounds relationship (`low <= {open, close} <= high`) is NOT expressed. The fixture declares the fields but the assertion grammar does not bind a cross-field expression, and field names cannot supply the rule without becoming hidden domain knowledge. A derived direction comparison is likewise unexpressed.",
  "The bounded evaluator's restriction to `sum` is an IMPLEMENTATION scope boundary, not an architectural invariant. Adding `min` or `count` is not the next step merely because the fixture runner refuses those assertions; they arrive when a preserved analytical question requires them.",
  "`partitionAdmitsSummation` answers an ADDITIVITY question. Naming a partition dimension and establishing additivity do not establish that the actual parts are exhaustive and mutually exclusive, and the two premises must not be described as discharged by one helper.",
];


/* ---------------------------------------------------------------------------
 * THE QUALIFIED RELATION RESULT — a source-grain analytical object
 *
 * The aggregate result contract defines its output by subtracting `along` from
 * the source grain, so it cannot carry the joint `(symbol, period)` association
 * that a row-local declared relationship governs. The graph-valued result set
 * the precedent: when the analytical object is not an aggregate relation, give
 * it the codomain it actually requires.
 *
 * The qualified result carries:
 *   - the source relation identity and its DECLARED grain — each grain member
 *     must name a field the relation declares; an undeclared member is a
 *     malformed declaration refused at this boundary, because a key built from
 *     `row[missing] ?? ""` would manufacture a binding out of an absence;
 *   - observations keyed STRUCTURALLY by the complete grain (field + value
 *     pairs, never a concatenated string);
 *   - only the fields the declared relationships admit for this request;
 *   - the declared field facts (bounds, temporality) needed downstream;
 *   - a POPULATION-SCOPED, THREE-VALUED judgment (see `QualifiedStanding`):
 *     readable falsifications are named per observation; an unreadable
 *     participating value leaves the relationship UNEVALUATED — a named
 *     evidence gap, never an admission; and no observation's fact implicates
 *     another observation, another field, or the task.
 *
 * REALIZATION IS SEPARATED FROM QUALIFICATION: a qualified result is a lawful
 * analytical object on its own. Realizing it requires a SELECTED program from
 * the family's declared lowering set, and the artifact is produced only by
 * lowering that selection (`selectQualifiedProgram` →
 * `lowerSelectedProgram`). Selection is a fact about the request and the
 * declared lowerings — never about how many observations a result carries.
 * ------------------------------------------------------------------------- */

export interface QualifiedObservation {
  /** The structured grain binding: one field + value pair per declared grain column. */
  key: ReadonlyArray<{ field: string; value: string | number }>;
  /** The values of the fields this request admits, keyed by field name. */
  values: Readonly<Record<string, number | string>>;
}

export interface QualifiedFieldFacts {
  bounds?: { lower: string; upper: string };
  temporality?: { kind: string };
}

/**
 * The three-valued qualification standing, evidence-classed like the corpus
 * judge's admissible / illegal / unproven — but this is the QUALIFIED result
 * family's own vocabulary, not the corpus judgment:
 *
 *   - `qualified`    — every applicable declared relationship was evaluated
 *                      over readable evidence and none falsified;
 *   - `contradicted` — at least one readable observation falsifies an
 *                      applicable declared relationship
 *                      (`QUALIFIED_DIAG.BOUNDS_ROW_VIOLATED`);
 *   - `unproven`     — at least one applicable declared relationship could not
 *                      be evaluated: a participating value was unreadable.
 *                      Missing evidence is not contradiction, and it is not
 *                      admission either — the unresolved premise is preserved
 *                      as a named gap.
 *
 * The summary standing is scoped to the relation + supplied population pair;
 * the facts that compose it stay attached to their own observations, so a
 * later task can decide whether a contradiction is relevant to the claim it
 * proposes.
 */
export type QualifiedStanding = "qualified" | "contradicted" | "unproven";

export interface QualifiedBoundsViolation {
  code: typeof QUALIFIED_DIAG.BOUNDS_ROW_VIOLATED;
  /** The violated relationship: `relation.field`. */
  subject: string;
  field: string;
  lower: string;
  upper: string;
  /** The index into `observations` of the falsifying entry. */
  observation: number;
  /** The structured grain binding of the falsifying observation. */
  key: ReadonlyArray<{ field: string; value: string | number }>;
}

/**
 * One unevaluated relationship: a participating value the bounds judgment
 * needed was unreadable, so the relationship neither holds nor is violated ON
 * THIS OBSERVATION. This is the missing-evidence fact that keeps an unreadable
 * population from being observationally equivalent to a verified one.
 */
export interface QualifiedEvidenceGap {
  /** The unevaluated relationship: `relation.field`. */
  subject: string;
  /** The participating field whose value was unreadable: the bounded field or one of its declared endpoints. */
  participant: string;
  /** The index into `observations` of the observation carrying the gap. */
  observation: number;
  /** The structured grain binding of that observation. */
  key: ReadonlyArray<{ field: string; value: string | number }>;
}

export interface QualifiedRelationResult {
  relation: string;
  grain: readonly string[];
  fields: Readonly<Record<string, FieldDecl>>;
  identity: { population: "supplied" | "missing"; gaps: Array<{ observation: number; field: string }>; duplicates: number[] };
  observations: readonly QualifiedObservation[];
  fieldFacts: Readonly<Record<string, QualifiedFieldFacts>>;
  judgment: {
    /** Population-scoped summary: `contradicted` if any observation falsifies, else `unproven` if any relationship went unevaluated, else `qualified`. */
    standing: QualifiedStanding;
    /** The contradicted facts, each attached to its own observation. */
    boundsViolations: readonly QualifiedBoundsViolation[];
    /** The unproven facts, each attached to its own observation. */
    evidenceGaps: readonly QualifiedEvidenceGap[];
  };
}

/** Qualification owns its snapshot; no source or output alias can revise it. */
function freezeQualified<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freezeQualified);
    Object.freeze(value);
  }
  return value;
}

/**
 * Qualify one relation over one supplied population at the DECLARED grain.
 *
 * Every declared non-grain field is admitted; the declared relationships
 * (bounds, temporality) travel as field facts; the judgment is scoped to the
 * supplied population — readable falsifications are named per observation, an
 * unreadable participating value leaves its relationship unevaluated as a
 * named evidence gap under an `unproven` standing (never an admission), and no
 * observation\\'s fact implicates another\\'s.
 */
export function qualifyRelation(
  structure: RelationalStructure,
  relationName: string,
  population?: ReadonlyArray<Record<string, unknown>>,
): QualifiedRelationResult {
  const rel = structure.relations[relationName];
  if (!rel) throw new Error(`qualify: relation ${relationName} is not declared by the structure`);
  if (!Array.isArray(rel.grain) || rel.grain.length === 0) throw new Error(`qualify: relation ${relationName} declares no grain, so no source-grain observation can be keyed`);
  const grain = [...rel.grain];
  const fields = (rel.fields ?? {}) as Record<string, Record<string, unknown>>;
  // RESOLUTION PRECEDES OBSERVATION, grain edition: a grain member naming no
  // declared field would silently build keys from `row[g] ?? ""` — a binding
  // manufactured out of an absence. A supplied value cannot authorize an
  // undeclared reference, so the declaration is refused before any
  // observation or judgment exists.
  for (const g of grain) {
    if (!(g in fields)) {
      throw new Error(`the grain of ${relationName} names ${g}, which the relation does not declare; the declaration is malformed and no qualified result is manufactured for it`);
    }
  }
  const admitted = Object.keys(fields).filter((f) => !grain.includes(f));

  const identity: QualifiedRelationResult["identity"] = { population: population === undefined ? "missing" : "supplied", gaps: [], duplicates: [] };
  const seen = new Set<string>();
  const observations: QualifiedObservation[] = [];
  if (population) {
    for (const row of population) {
      const key: Array<{ field: string; value: string | number }> = [];
      for (const field of grain) {
        const value = row[field];
        if (typeof value === "string" || (typeof value === "number" && Number.isFinite(value))) key.push({ field, value });
        else identity.gaps.push({ observation: observations.length, field });
      }
      if (key.length === grain.length) {
        const normalized = normalizedKey(key);
        if (seen.has(normalized)) identity.duplicates.push(observations.length);
        seen.add(normalized);
      }
      const values: Record<string, number | string> = {};
      for (const f of admitted) {
        const raw = row[f];
        if (typeof raw === "string" || (typeof raw === "number" && Number.isFinite(raw))) values[f] = raw;
      }
      observations.push({ key, values });
    }
  }

  // RESOLUTION PRECEDES OBSERVATION, bounds edition: a bound naming no declared
  // sibling field is a malformed declaration, refused before any observation or
  // judgment exists.
  for (const [name, decl] of Object.entries(fields)) {
    const b = (decl as Record<string, unknown>).bounds as { lower: string; upper: string } | undefined;
    if (!b) continue;
    for (const [slot, endpoint] of [["lower", b.lower], ["upper", b.upper]] as const) {
      if (!(endpoint in fields)) {
        throw new Error(`the bounds declaration on ${relationName}.${name} names ${endpoint} at bounds.${slot}, which the relation does not declare; the declaration is malformed and no qualified result is manufactured for it`);
      }
    }
  }

  const fieldFacts: Record<string, QualifiedFieldFacts> = {};
  for (const [name, decl] of Object.entries(fields)) {
    const facts: QualifiedFieldFacts = {};
    const b = (decl as Record<string, unknown>).bounds as { lower: string; upper: string } | undefined;
    if (b) facts.bounds = { lower: String(b.lower), upper: String(b.upper) };
    const tp = (decl as Record<string, unknown>).temporality as { kind: string } | undefined;
    if (tp) facts.temporality = { kind: String(tp.kind) };
    if (Object.keys(facts).length > 0) fieldFacts[name] = facts;
  }

  // THE BOUNDS JUDGMENT: three-valued, per observation, per relationship.
  // A readable falsification is a violation. An unreadable PARTICIPATING value
  // (the bounded field or one of its endpoints) leaves THIS relationship
  // unevaluated on THIS observation — a named evidence gap, not an admission
  // and not a contradiction. One observation's fact never implicates another's.
  const boundsViolations: QualifiedBoundsViolation[] = [];
  const evidenceGaps: QualifiedEvidenceGap[] = [];
  for (const [fieldName, facts] of Object.entries(fieldFacts)) {
    if (!facts.bounds) continue;
    const { lower, upper } = facts.bounds;
    const subject = `${relationName}.${fieldName}`;
    observations.forEach((obs, idx) => {
      const participants: ReadonlyArray<readonly [string, unknown]> = [
        [fieldName, obs.values[fieldName]],
        [lower, obs.values[lower]],
        [upper, obs.values[upper]],
      ];
      let unreadable = false;
      for (const [participant, raw] of participants) {
        if (typeof raw !== "number" || !Number.isFinite(raw)) {
          unreadable = true;
          evidenceGaps.push({ subject, participant, observation: idx, key: obs.key });
        }
      }
      if (unreadable) return;
      const v = obs.values[fieldName] as number;
      const lo = obs.values[lower] as number;
      const up = obs.values[upper] as number;
      if (!(lo <= v && v <= up)) {
        boundsViolations.push({
          code: QUALIFIED_DIAG.BOUNDS_ROW_VIOLATED,
          subject,
          field: fieldName, lower, upper,
          observation: idx,
          key: obs.key,
        });
      }
    });
  }

  const standing: QualifiedStanding =
    boundsViolations.length > 0 || identity.duplicates.length > 0 ? "contradicted" :
      evidenceGaps.length > 0 || identity.gaps.length > 0 || identity.population === "missing" ? "unproven" : "qualified";

  return freezeQualified({
    relation: relationName,
    grain,
    fields: structuredClone(rel.fields ?? {}) as Record<string, FieldDecl>,
    identity,
    observations,
    fieldFacts,
    judgment: { standing, boundsViolations, evidenceGaps },
  });
}

/**
 * What a consumer asks the qualified-result family to realize. The family
 * declares its lowering set explicitly (`DECLARED_QUALIFIED_LOWERINGS`); a
 * request outside it is unsupported — not an error in the result, and not a
 * silent fallback to some other lowering. `readback` is the one declared
 * intent today.
 */
export interface QualifiedIntent {
  kind: string;
}

/**
 * The declared lowering set of the qualified-result family. SELECTION IS A
 * DECLARED-LOWERING FACT: support comes from this set and the request, never
 * from how many observations a result happens to carry. A zero-observation
 * result is a lawful result with no instance to realize; a populated result
 * matched to an undeclared intent is lawful but unsupported. Both distinctions
 * are observable, and neither is derived from `observations.length`.
 */
const DECLARED_QUALIFIED_LOWERINGS: readonly string[] = ["readback"];

/**
 * The selected program: the ONE qualified result this slice will realize,
 * bound to the intent it was selected for. It is constructible only by
 * selection, so no lowering entry point can accept an unselected request — and
 * the lowering never reconstructs the result or re-reads source rows. It
 * cannot: the rows are not part of a qualified result.
 */
const qualifiedSelection = Symbol("qualified-selection");
export interface QualifiedProgram {
  readonly [qualifiedSelection]: true;
  readonly result: QualifiedRelationResult;
  readonly intent: QualifiedIntent;
}

const selectedQualifiedPrograms = new WeakSet<QualifiedProgram>();

export type QualifiedProgramSelection =
  | { kind: "selected"; program: QualifiedProgram }
  | { kind: "unsupported"; reason: string }
  | { kind: "unproven"; reason: string }
  | { kind: "nothing-to-realize"; reason: string };

/**
 * Select the program for one qualified result under one request:
 *
 *   - the request names no declared lowering → `unsupported` (a lawful result
 *     this family realizes nothing for);
 *   - the request is declared and the result carries no observations →
 *     `nothing-to-realize` (no instance exists);
 *   - otherwise → `selected`, carrying the program the lowering consumes.
 */
export function selectQualifiedProgram(q: QualifiedRelationResult, intent: QualifiedIntent): QualifiedProgramSelection {
  if (!DECLARED_QUALIFIED_LOWERINGS.includes(intent.kind)) {
    return { kind: "unsupported", reason: `the qualified-result family declares no lowering for the requested ${intent.kind} intent; the qualified relation ${q.relation} is lawful but unsupported for it` };
  }
  if (q.identity.population === "missing") return { kind: "unproven", reason: `the relation ${q.relation} has no supplied population` };
  if (q.observations.length === 0) {
    return { kind: "nothing-to-realize", reason: `the qualified relation ${q.relation} carries no observations, so there is no instance to realize` };
  }
  const program = Object.freeze({ [qualifiedSelection]: true as const, result: q, intent: Object.freeze({ ...intent }) });
  selectedQualifiedPrograms.add(program);
  return { kind: "selected", program };
}

/** The produced readback artifact: the qualified result's content, carried. */
export interface QualifiedReadbackArtifact {
  kind: "readback";
  relation: string;
  grain: readonly string[];
  fields: QualifiedRelationResult["fields"];
  identity: QualifiedRelationResult["identity"];
  observations: QualifiedRelationResult["observations"];
  fieldFacts: QualifiedRelationResult["fieldFacts"];
  judgment: QualifiedRelationResult["judgment"];
}

/**
 * Lower a SELECTED program into a detached readback artifact. The opaque type
 * and mint registry require selection, including for callers that cast types.
 * The artifact carries the judgment — a truthful readback of problematic data
 * is not a certification that the bounds hold; the consumer sees the standing
 * and the scoped diagnostics alongside the data.
 */
export function lowerSelectedProgram(program: QualifiedProgram): QualifiedReadbackArtifact {
  if (!selectedQualifiedPrograms.has(program)) throw new Error("lowerSelectedProgram requires a program minted by selected qualification");
  const q = program.result;
  return structuredClone({ kind: "readback", relation: q.relation, grain: q.grain, fields: q.fields, identity: q.identity, observations: q.observations, fieldFacts: q.fieldFacts, judgment: q.judgment });
}

/**
 * The orchestration entry: selection, then — only on a selection — lowering.
 * An unsupported request and an empty population return their selection kinds;
 * no artifact exists on those paths.
 */
export function projectQualifiedRelation(q: QualifiedRelationResult, intent: QualifiedIntent = { kind: "readback" }): QualifiedProgramSelection | QualifiedReadbackArtifact {
  const selection = selectQualifiedProgram(q, intent);
  return selection.kind === "selected" ? lowerSelectedProgram(selection.program) : selection;
}

/** What the output-only decoder recovers from the artifact alone. */
export interface DecodedQualifiedReadback {
  relation: string;
  grain: readonly string[];
  observations: ReadonlyArray<{ key: ReadonlyArray<{ field: string; value: string | number }>; values: Readonly<Record<string, number | string>> }>;
  /** The declared bounds relationships, by field: what a contradiction would violate. */
  boundsFacts: Readonly<Record<string, { lower: string; upper: string }>>;
  /** The declared temporalities, by field: carried, not interpreted. */
  temporalityFacts: Readonly<Record<string, { kind: string }>>;
  standing: QualifiedStanding;
  /** Indices of the observations carrying a bounds violation. */
  contradicted: readonly number[];
  /** Indices of the observations carrying an evidence gap. */
  unproven: readonly number[];
}

/**
 * Recover the analytical content from the produced artifact ALONE — no rows,
 * no evaluator, no qualified-result reference. The recovery is SUBSTANTIVE:
 * structured grain bindings, admitted values, the declared relationship facts
 * a claim needs, and the standing with its per-observation scope. Mutating an
 * association or the standing in the artifact therefore alters what a consumer
 * recovers — the decoder reads the artifact; it does not re-derive it.
 */
export function decodeQualifiedReadback(artifact: QualifiedReadbackArtifact): DecodedQualifiedReadback {
  const boundsFacts: Record<string, { lower: string; upper: string }> = {};
  const temporalityFacts: Record<string, { kind: string }> = {};
  for (const [name, facts] of Object.entries(artifact.fieldFacts)) {
    if (facts.bounds) boundsFacts[name] = { ...facts.bounds };
    if (facts.temporality) temporalityFacts[name] = { ...facts.temporality };
  }
  return {
    relation: artifact.relation,
    grain: [...artifact.grain],
    observations: artifact.observations.map((o) => ({ key: o.key.map((k) => ({ ...k })), values: { ...o.values } })),
    boundsFacts,
    temporalityFacts,
    standing: artifact.judgment.standing,
    contradicted: [...new Set([...artifact.judgment.boundsViolations.map(v => v.observation), ...artifact.identity.duplicates])].sort((a, b) => a - b),
    unproven: [...new Set([...artifact.judgment.evidenceGaps.map(g => g.observation), ...artifact.identity.gaps.map(g => g.observation)])].sort((a, b) => a - b),
  };
}
