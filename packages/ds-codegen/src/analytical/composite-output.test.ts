import { describe, expect, it } from "vitest";
import { RelationalStructure } from "./relation-model.js";
import { bindOperation, EXPERIMENT_TARGET, qualifyRelation } from "./projection.js";
import type { CompositeInput, Program } from "./projection.js";
import { decodeCompositeMetric, decodeCompositeReadback } from "./composite-artifacts.js";
import { lowerSelectedComposite, projectComposite, selectCompositeProgram, selectCompositeRealization } from "./composite-selection.js";
import type { SelectedCompositeProgram } from "./composite-selection.js";
import { COMPOSITE_OUTPUT_BASIS, digestOf } from "./authority.js";

const quantity = () => ({ transformation: "ratio" as const, unit: { units: ["u"] } });
const declaration = () => RelationalStructure.parse({ relations: { samples: { grain: ["site", "day"], fields: {
  site: { transformation: "nominal" }, day: { transformation: "interval", temporality: { kind: "interval" } },
  lo: quantity(), hi: quantity(), a: { ...quantity(), bounds: { lower: "lo", upper: "hi" } },
  b: { ...quantity(), bounds: { lower: "lo", upper: "hi" } }, label: { transformation: "nominal" },
} } } });
const rows = () => [
  { site: "s1", day: 1, lo: 5, hi: 20, a: 10, b: 12, label: "first" },
  { site: "s1", day: 2, lo: 6, hi: 21, a: 11, b: 14, label: "second" },
  { site: "s2", day: 1, lo: 4, hi: 19, a: 9, b: 13, label: "third" },
];
const names = { relation: "samples", site: "site", day: "day", a: "a", b: "b" };
function request(structure = declaration(), population: Array<Record<string, unknown>> = rows(), n = names): CompositeInput {
  const q = qualifyRelation(structure, n.relation, population);
  const host: Program = { coordinate: "cartesian", dimension: "position", measure: "length", baseline: "zero", task: "magnitude-comparison", claims: [], operation: bindOperation(structure, { relation: n.relation, field: n.a, op: "sum", along: [n.day] }) };
  return { structure, inventory: EXPERIMENT_TARGET, composite: { combinator: "embed", host, budget: ["position"], cellBaseline: "zero", part: { kind: "composite", composite: {
    combinator: "facet", partition: n.site, policy: { position: "shared" }, parts: [{ kind: "composite", composite: {
      combinator: "layer", sharing: { position: "shared" }, parts: [
        { kind: "qualified", result: q, field: n.a, channel: "position" },
        { kind: "qualified", result: q, field: n.b, channel: "position" },
      ],
    } }],
  } } } };
}
function outputs(input = request()) {
  const selected = selectCompositeProgram(input, { kind: "readback" });
  if (selected.kind !== "selected") throw new Error("carrier missing");
  const metricSelection = selectCompositeRealization(selected.program, { kind: "metric" });
  if (metricSelection.kind !== "selected") throw new Error(`metric selection missing: ${JSON.stringify(metricSelection)}`);
  expect(metricSelection.program.carrier).toBe(selected.program.carrier);
  const readback = lowerSelectedComposite(selected.program);
  const metric = lowerSelectedComposite(metricSelection.program);
  if (readback.kind !== "composite-readback" || metric.kind !== "composite-metric") throw new Error(`outputs missing: ${JSON.stringify([readback, metric])}`);
  return { readback, metric };
}
const wire = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe("selected analytical carrier and output custody", () => {
  it("derives finite shared extent from participating endpoints alone", () => {
    expect(outputs().metric.viewport).toEqual({ x: 3.75, width: 42.5 });
    const structure = declaration();
    structure.relations.samples!.fields!.unused = quantity();
    const input = request(structure, rows().map(row => ({ ...row, unused: 10000 })));
    expect(outputs(input).metric.viewport).toEqual({ x: 3.75, width: 42.5 });
    const overflow = request(declaration(), [{ ...rows()[0], lo: -4e307, hi: 4e307, a: 0, b: 1 }]);
    const selected = selectCompositeProgram(overflow, { kind: "metric", scale: { origin: 0, unitsPerValue: 2 } });
    expect(selected.kind).toBe("unsupported");
    if (selected.kind !== "unsupported") throw new Error("overflow must not render");
    expect(selected.reason).toContain("finite shared extent");
    expect(selectCompositeProgram(overflow, { kind: "readback" }).kind).toBe("selected");
    const svgOverflow = request(declaration(), [{ ...rows()[0], lo: 1e40, hi: 2e40, a: 1.5e40, b: 1.8e40 }]);
    expect(selectCompositeProgram(svgOverflow, { kind: "metric" }).kind).toBe("unsupported");
    expect(selectCompositeProgram(svgOverflow, { kind: "readback" }).kind).toBe("selected");
  });

  it("snapshots meaning, deduplicates shared authority and detaches produced output", () => {
    const input = request();
    const selected = selectCompositeProgram(input, { kind: "readback" });
    if (selected.kind !== "selected") throw new Error("selection missing");
    const before = wire(selected.program.carrier);
    input.structure.relations.samples!.fields!.a!.transformation = "nominal";
    if (input.composite.combinator === "embed") input.composite.cellBaseline = "truncated";
    expect(wire(selected.program.carrier)).toEqual(before);
    expect(selectCompositeRealization(selected.program, { kind: "metric" }).kind).toBe("selected");
    expect(before.datasets).toHaveLength(1);
    expect(Object.isFrozen(selected.program.carrier.datasets[0]!.result.observations[0]!.values)).toBe(true);
    const output = lowerSelectedComposite(selected.program);
    if (output.kind !== "composite-readback") throw new Error("wrong output");
    (output.carrier.datasets[0]!.result.observations[0]!.values as Record<string, number | string>).a = 999;
    expect(selected.program.carrier.datasets[0]!.result.observations[0]!.values.a).toBe(10);
  });

  it("recovers complete meaning independently from serialized readback and metric output", () => {
    const { readback, metric } = outputs();
    const a = decodeCompositeReadback(wire(readback));
    const b = decodeCompositeMetric(wire(metric));
    expect(b).toEqual(a);
    expect(a.datasets[0]!.result.observations.map(o => o.values.a)).toEqual([10, 11, 9]);
    expect(a.datasets[0]!.result.observations.map(o => o.values.label)).toEqual(["first", "second", "third"]);
    expect(metric.carrier.datasets[0]!.result.observations[0]!.positions.a).toBe(20);
    expect(metric.carrier.datasets[0]!.result.observations[0]).not.toHaveProperty("values");
    expect(a.datasets[0]!.result.fieldFacts.a!.bounds).toEqual({ lower: "lo", upper: "hi" });
    expect(a.datasets[0]!.result.fields.a!.unit).toEqual({ units: ["u"] });
    expect(a.authority).toEqual({ name: "compositeOutputBasis", digest: digestOf(COMPOSITE_OUTPUT_BASIS) });
    expect(a.judgment.verdict.kind).toBe("retained");
    if (a.judgment.verdict.kind !== "retained") throw new Error("standing lost");
    expect(a.judgment.verdict.panels!.map(p => [p.value, p.keys.length])).toEqual([["s1", 2], ["s2", 1]]);
    expect(a.judgment.verdict.panels![0]!.ranges).toEqual([{ lower: "lo", upper: "hi", members: ["a", "b"] }]);
  });

  it("produces no artifact on unsupported, contradicted, unresolved or empty paths", () => {
    expect(projectComposite(request(), { kind: "unknown" }).kind).toBe("unsupported");
    expect(projectComposite(request(declaration(), [{ ...rows()[0], a: 99 }]), { kind: "readback" }).kind).toBe("refused");
    const refused = selectCompositeProgram(request(declaration(), [{ ...rows()[0], a: 99 }]), { kind: "readback" });
    if (refused.kind !== "refused") throw new Error("refusal missing");
    expect(refused.judgment!.parts.filter(p => p.path.length === 3).map(p => p.verdict.kind)).toEqual(["refused", "refused"]);
    expect(projectComposite(request(declaration(), [{ ...rows()[0], a: "unknown" }]), { kind: "readback" }).kind).toBe("unproven");
    expect(projectComposite(request(declaration(), []), { kind: "readback" }).kind).toBe("nothing-to-realize");
    expect(() => lowerSelectedComposite({ carrier: outputs().readback.carrier, intent: { kind: "metric" } } as unknown as SelectedCompositeProgram)).toThrow(/selected/);
    expect(() => lowerSelectedComposite({ carrier: outputs().readback.carrier, intent: { kind: "readback" } } as unknown as SelectedCompositeProgram)).toThrow(/minted/);
  });

  it("does not coalesce contradictory endpoint snapshots into one metric range", () => {
    const input = request();
    if (input.composite.combinator !== "embed" || input.composite.part.kind !== "composite") throw new Error("shape");
    const facet = input.composite.part.composite;
    if (facet.combinator !== "facet" || facet.parts[0]!.kind !== "composite") throw new Error("shape");
    const layer = facet.parts[0]!.composite;
    if (layer.combinator !== "layer" || layer.parts[1]!.kind !== "qualified") throw new Error("shape");
    layer.parts[1]!.result = qualifyRelation(input.structure, "samples", rows().map(r => ({ ...r, lo: 100, hi: 200, a: 120, b: 180 })));
    const selected = selectCompositeProgram(input, { kind: "metric" });
    expect(selected.kind).toBe("unproven");
    if (selected.kind === "unproven") expect(selected.reason).toContain("endpoint-coherence");
    expect(projectComposite(input, { kind: "readback" }).kind).toBe("composite-readback");
    layer.parts[1]!.result = qualifyRelation(input.structure, "samples", rows().reverse());
    expect(selectCompositeProgram(input, { kind: "metric" }).kind).toBe("selected");
    const output = outputs(input);
    expect(decodeCompositeMetric(wire(output.metric))).toEqual(decodeCompositeReadback(wire(output.readback)));
  });

  it("requires metric quantity/unit authority and a genuinely lossless scale", () => {
    const free = request();
    if (free.composite.combinator !== "embed" || free.composite.part.kind !== "composite" || free.composite.part.composite.combinator !== "facet") throw new Error("shape");
    free.composite.part.composite.policy.position = "free";
    expect(projectComposite(free, { kind: "metric" }).kind).toBe("unsupported");
    expect(projectComposite(free, { kind: "readback" }).kind).toBe("composite-readback");
    const nominal = declaration(); nominal.relations.samples!.fields!.lo!.transformation = "nominal";
    expect(projectComposite(request(nominal), { kind: "metric" }).kind).toBe("unsupported");
    const missing = declaration(); delete missing.relations.samples!.fields!.lo!.unit;
    expect(projectComposite(request(missing), { kind: "metric" }).kind).toBe("unproven");
    const other = declaration(); other.relations.samples!.fields!.lo!.unit!.units = ["other"];
    expect(projectComposite(request(other), { kind: "metric" }).kind).toBe("unsupported");
    for (const scale of [{ origin: 0, unitsPerValue: 0 }, { origin: 1e300, unitsPerValue: 2 }]) {
      expect(projectComposite(request(), { kind: "metric", scale }).kind).toBe("unsupported");
    }
  });

  it("refuses unknown wire versions and malformed arithmetic instead of manufacturing values", () => {
    const { readback, metric } = outputs();
    const unknown = wire(readback);
    (unknown.carrier as { version: number }).version = 2;
    expect(() => decodeCompositeReadback(unknown)).toThrow(/version/);
    const bad = wire(metric);
    (bad.carrier.datasets[0]!.result.observations[0]!.positions as Record<string, unknown>).a = null;
    expect(() => decodeCompositeMetric(bad)).toThrow(/coordinate/);
    bad.scale.unitsPerValue = 0;
    expect(() => decodeCompositeMetric(bad)).toThrow(/scale/);
  });

  it("observes five distinct output mutations instead of agreement on totals", () => {
    const { readback, metric } = outputs();
    const baseline = decodeCompositeMetric(metric);
    const changed = wire(metric); changed.carrier.datasets[0]!.result.observations[0]!.positions.a += 2;
    expect(decodeCompositeMetric(changed).datasets[0]!.result.observations[0]!.values.a).toBe(11);
    const moved = wire(metric); moved.carrier.datasets[0]!.result.observations[0]!.key[0]!.value = "another";
    expect(decodeCompositeMetric(moved).datasets[0]!.result.observations.map(o => o.values.a)).toEqual([10, 11, 9]);
    expect(decodeCompositeMetric(moved)).not.toEqual(baseline);
    for (const mutation of ["range", "panel", "standing"]) {
      const output = wire(readback);
      if (output.carrier.judgment.verdict.kind !== "retained") throw new Error("standing");
      if (mutation === "range") output.carrier.judgment.verdict.panels![0]!.ranges[0]!.members = ["a"];
      if (mutation === "panel") output.carrier.judgment.verdict.panels![0]!.value = "another";
      if (mutation === "standing") output.carrier.datasets[0]!.result.judgment.standing = "contradicted";
      expect(decodeCompositeReadback(output)).not.toEqual(decodeCompositeReadback(readback));
    }
  });

  it("preserves renamed declarations and reorders by identity without any adapter change", () => {
    const map: Record<string, string> = { site: "zone", day: "epoch", lo: "floor", hi: "roof", a: "first_value", b: "other_value", label: "caption" };
    const original = declaration().relations.samples!;
    const renamed = RelationalStructure.parse({ relations: { telemetry: { ...original, grain: ["zone", "epoch"], fields: Object.fromEntries(Object.entries(original.fields!).map(([k, v]) => [map[k], { ...v, ...(v.bounds ? { bounds: { lower: map[v.bounds.lower], upper: map[v.bounds.upper] } } : {}) }])) } } });
    const population = rows().reverse().map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [map[k], v])));
    const output = outputs(request(renamed, population, { relation: "telemetry", site: "zone", day: "epoch", a: "first_value", b: "other_value" }));
    expect(decodeCompositeMetric(wire(output.metric))).toEqual(decodeCompositeReadback(wire(output.readback)));
    expect(decodeCompositeMetric(output.metric).datasets[0]!.result.observations.map(o => o.values.first_value)).toEqual([9, 11, 10]);
  });
});
