import { judgeComposite } from "./projection.js";
import { compositeOutputDigest } from "./authority.js";
import type { Composite, CompositeInput, CompositeJudgment, CompositePart, QualifiedRelationResult } from "./projection.js";
import { carriedParts, carriedViews } from "./composite-artifacts.js";
import type { CarriedComposite, CarriedPart, CompositeArtifact, CompositeCarrier, CompositeMetricArtifact, Immutable, MetricScale } from "./composite-artifacts.js";

export interface CompositeIntent { kind: string; scale?: MetricScale }
const selectionSeal = Symbol("selected-composite");
export interface SelectedCompositeProgram {
  readonly [selectionSeal]: true;
  readonly carrier: Immutable<CompositeCarrier>;
  readonly intent: Immutable<CompositeIntent>;
}
const minted = new WeakSet<SelectedCompositeProgram>();
type NoSelection = { kind: "refused" | "unproven" | "unsupported" | "nothing-to-realize"; reason: string; judgment?: Immutable<CompositeJudgment> };
export type CompositeSelection = { kind: "selected"; program: SelectedCompositeProgram } | NoSelection;
function freeze<T>(value: T): Immutable<T> {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value as Immutable<T>;
}
const key = (pairs: QualifiedRelationResult["observations"][number]["key"]) => JSON.stringify([...pairs].sort((a, b) => a.field.localeCompare(b.field)));

/** Lift already qualified operands; dataset ids are local custody references. */
function carry(composite: Composite, datasets: CompositeCarrier["datasets"]): CarriedComposite | undefined {
  const ids = new Map<QualifiedRelationResult, string>();
  const part = (p: CompositePart): CarriedPart | undefined => {
    if (p.kind === "program") return undefined;
    if (p.kind === "composite") { const c = node(p.composite); return c && { kind: "composite", composite: c }; }
    let id = ids.get(p.result);
    if (!id) { id = `d${datasets.length}`; ids.set(p.result, id); datasets.push({ id, result: p.result }); }
    return { kind: "qualified", dataset: id, field: p.field, channel: p.channel };
  };
  const node = (c: Composite): CarriedComposite | undefined => {
    if (c.combinator === "embed") { const p = part(c.part); return p && { ...c, part: p }; }
    const parts = c.parts.map(part);
    if (parts.some(p => p === undefined)) return undefined;
    return { ...c, parts: parts as CarriedPart[] };
  };
  return node(composite);
}

/** Extra premises of one bounded metric format, read exclusively from custody. */
function metricPremise(carrier: CompositeCarrier, scale: MetricScale): NoSelection | undefined {
  const fail = (kind: NoSelection["kind"], reason: string): NoSelection => ({ kind, reason });
  if (!Number.isFinite(scale.origin) || !Number.isFinite(scale.unitsPerValue) || scale.unitsPerValue <= 0) return fail("unsupported", "metric scale must be finite and positive");
  if (carriedViews(carrier.composition).some(v => v.channel !== "position")) return fail("unsupported", "this metric format realizes position views only");
  const covered = new Set<CarriedPart>();
  let fault: NoSelection | undefined;
  let unit: string | undefined;
  const visit = (c: CarriedComposite, path: number[]) => {
    if ((c.combinator === "facet" && c.policy.position !== "shared") || (c.combinator === "layer" && c.sharing.position !== "shared")) {
      fault = fail("unsupported", "this metric format requires one declared shared position scale"); return;
    }
    const verdict = path.length === 0 ? carrier.judgment.verdict : carrier.judgment.parts.find(p => JSON.stringify(p.path) === JSON.stringify(path))?.verdict;
    if (c.combinator === "layer" && verdict?.kind === "retained") {
      for (const range of verdict.ranges ?? []) {
        const views = c.parts.filter(p => {
          if (p.kind !== "qualified" || !range.members.includes(p.field)) return false;
          const bounds = carrier.datasets.find(d => d.id === p.dataset)!.result.fieldFacts[p.field]?.bounds;
          return bounds?.lower === range.lower && bounds.upper === range.upper;
        });
        let endpoints: Map<string, string> | undefined;
        let relation: string | undefined;
        for (const view of views) {
          if (view.kind !== "qualified") continue;
          const q = carrier.datasets.find(d => d.id === view.dataset)!.result;
          if (relation !== undefined && relation !== q.relation) { fault = fail("unproven", "range:source-coherence is not established between distinct relations"); return; }
          relation = q.relation;
          const current = new Map(q.observations.map(o => [key(o.key), JSON.stringify([o.values[range.lower], o.values[range.upper]])]));
          if (endpoints && (current.size !== endpoints.size || [...current].some(([k, v]) => endpoints!.get(k) !== v))) { fault = fail("unproven", "range:endpoint-coherence is contradicted by the carried snapshots"); return; }
          endpoints = current;
          for (const field of [range.lower, range.upper, view.field]) {
            const decl = q.fields[field];
            if (decl?.transformation !== "ratio" && decl?.transformation !== "interval") { fault = fail("unsupported", `metric distance is not licensed for ${field}`); return; }
            const units = decl.unit?.units;
            if (!units || units.length !== 1 || decl.unit?.perRow) { fault = fail("unproven", `metric:unit-identified is missing for ${field}`); return; }
            if (unit !== undefined && unit !== units[0]) { fault = fail("unsupported", "metric unit conversion has no numerical mapping in this format"); return; }
            unit = units[0];
          }
          covered.add(view);
        }
      }
    }
    carriedParts(c).forEach((p, i) => { if (!fault && p.kind === "composite") visit(p.composite, [...path, i]); });
  };
  visit(carrier.composition, []);
  if (fault) return fault;
  if (carriedViews(carrier.composition).some(p => !covered.has(p))) return fail("unsupported", "metric format realizes only views covered by a carried bounded-range group");
  for (const d of carrier.datasets) for (const o of d.result.observations) for (const value of Object.values(o.values)) {
    if (typeof value !== "number") continue;
    const x = scale.origin + value * scale.unitsPerValue;
    if (!Number.isFinite(x) || (x - scale.origin) / scale.unitsPerValue !== value) return fail("unsupported", "metric scale cannot preserve these numeric values losslessly");
  }
  try { metricViewport(carrier, scale); } catch { return fail("unsupported", "metric viewport cannot preserve a finite shared extent"); }
  return undefined;
}

/** Extent belongs to the selected shared scope, never a browser-local range fit. */
function metricViewport(carrier: CompositeCarrier, scale: MetricScale): CompositeMetricArtifact["viewport"] {
  const endpoints = carriedViews(carrier.composition).flatMap(view => {
    const q = carrier.datasets.find(d => d.id === view.dataset)!.result;
    const bounds = q.fieldFacts[view.field]!.bounds!;
    return q.observations.flatMap(o => [bounds.lower, bounds.upper].map(f => {
      const value = o.values[f];
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("required endpoint unavailable");
      return scale.origin + value * scale.unitsPerValue;
    }));
  });
  const minimum = Math.min(...endpoints), maximum = Math.max(...endpoints);
  const span = Math.max(maximum - minimum, 1), pad = span / 8;
  const viewport = { x: minimum - pad, width: span + 2 * pad };
  if (![viewport.x, viewport.width, maximum].every(value => Number.isFinite(value) && Number.isFinite(Math.fround(value))) || Math.fround(viewport.width) <= 0) throw new Error("invalid SVG viewport");
  return viewport;
}

export function selectCompositeProgram(input: CompositeInput, requested: CompositeIntent): CompositeSelection {
  if (requested.kind !== "readback" && requested.kind !== "metric") return { kind: "unsupported", reason: `no composite lowering for ${requested.kind}` };
  const snapshot = structuredClone(input);
  const judgment = judgeComposite(snapshot);
  if (judgment.verdict.kind !== "retained") return { kind: judgment.verdict.kind, reason: judgment.verdict.detail, judgment: freeze(judgment) };
  const datasets: CompositeCarrier["datasets"] = [];
  const composition = carry(snapshot.composite, datasets);
  if (!composition) return { kind: "unsupported", reason: "this output family carries qualified leaves only; atomic host standing is retained but host framing is not realized" };
  if (datasets.every(d => d.result.observations.length === 0)) return { kind: "nothing-to-realize", reason: "the carried populations are explicitly empty", judgment: freeze(judgment) };
  const carrier = freeze<CompositeCarrier>({ version: 1, authority: { name: "compositeOutputBasis", digest: compositeOutputDigest() }, composition, datasets, judgment });
  return selectCarried(carrier, requested);
}

function selectCarried(carrier: Immutable<CompositeCarrier>, requested: CompositeIntent): CompositeSelection {
  if (requested.kind !== "readback" && requested.kind !== "metric") return { kind: "unsupported", reason: `no composite lowering for ${requested.kind}` };
  const intent = structuredClone(requested);
  if (intent.kind === "metric") {
    intent.scale ??= { origin: 0, unitsPerValue: 2 };
    const fault = metricPremise(carrier as CompositeCarrier, intent.scale);
    if (fault) return { ...fault, judgment: carrier.judgment };
  }
  const program: SelectedCompositeProgram = { [selectionSeal]: true, carrier, intent: freeze(intent) };
  freeze(program); minted.add(program);
  return { kind: "selected", program };
}

/** Select another format from the SAME authority, without re-judging sources. */
export function selectCompositeRealization(selected: SelectedCompositeProgram, intent: CompositeIntent): CompositeSelection {
  if (!minted.has(selected)) throw new Error("selectCompositeRealization requires a minted selected program");
  return selectCarried(selected.carrier, intent);
}

export function lowerSelectedComposite(program: SelectedCompositeProgram): CompositeArtifact {
  if (!minted.has(program)) throw new Error("lowerSelectedComposite requires a minted selected program");
  const carrier = structuredClone(program.carrier) as CompositeCarrier;
  if (program.intent.kind === "readback") return { kind: "composite-readback", carrier };
  const scale = { ...program.intent.scale! };
  const encoded: CompositeMetricArtifact["carrier"] = { ...carrier, datasets: carrier.datasets.map(({ id, result }) => ({ id, result: {
    ...result, observations: result.observations.map(({ key, values }) => {
      const positions: Record<string, number> = {}; const text: Record<string, string> = {};
      for (const [field, value] of Object.entries(values)) {
        if (typeof value === "number") positions[field] = scale.origin + value * scale.unitsPerValue;
        else text[field] = value;
      }
      return { key, text, positions };
    }),
  } })) };
  return { kind: "composite-metric", carrier: encoded, scale, viewport: metricViewport(carrier, scale) };
}
export function projectComposite(input: CompositeInput, intent: CompositeIntent): CompositeSelection | CompositeArtifact {
  const selection = selectCompositeProgram(input, intent);
  return selection.kind === "selected" ? lowerSelectedComposite(selection.program) : selection;
}
