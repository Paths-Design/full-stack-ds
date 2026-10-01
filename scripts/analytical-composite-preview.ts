import type { Plugin } from "vite";
import { RelationalStructure } from "../packages/ds-codegen/src/analytical/relation-model.js";
import { bindOperation, EXPERIMENT_TARGET, qualifyRelation } from "../packages/ds-codegen/src/analytical/projection.js";
import type { CompositeInput, LayerComposite } from "../packages/ds-codegen/src/analytical/projection.js";
import { lowerSelectedComposite, selectCompositeProgram, selectCompositeRealization } from "../packages/ds-codegen/src/analytical/composite-selection.js";
import type { CompositeReadbackArtifact, CompositeMetricArtifact } from "../packages/ds-codegen/src/analytical/composite-artifacts.js";

export interface CompositeWitness {
  name: string; status: string; reason?: string;
  metricStatus?: string; metricReason?: string;
  readback?: CompositeReadbackArtifact; metric?: CompositeMetricArtifact;
}
// Repo-owned consumer witnesses, separate from the frozen analytical corpus.
function request(names: string[], population: Array<Array<string | number>>): CompositeInput {
  const [site, day, lo, hi, a, b, label] = names;
  const quantity = { transformation: "ratio", unit: { units: ["u"] } };
  const structure = RelationalStructure.parse({ relations: { observations: { grain: [site, day], fields: {
    [site]: { transformation: "nominal" }, [day]: { transformation: "interval", temporality: { kind: "interval" } },
    [lo]: quantity, [hi]: quantity, [a]: { ...quantity, bounds: { lower: lo, upper: hi } },
    [b]: { ...quantity, bounds: { lower: lo, upper: hi } }, [label]: { transformation: "nominal" },
  } } } });
  const rows = population.map(values => Object.fromEntries(names.map((field, i) => [field, values[i]])));
  const q = qualifyRelation(structure, "observations", rows);
  const host = { coordinate: "cartesian" as const, dimension: "position" as const, measure: "length" as const,
    baseline: "zero" as const, task: "magnitude-comparison" as const, claims: [],
    operation: bindOperation(structure, { relation: "observations", field: a, op: "sum", along: [day] }) };
  return { structure, inventory: EXPERIMENT_TARGET, composite: { combinator: "embed", host, budget: ["position"], cellBaseline: "zero", part: { kind: "composite", composite: {
    combinator: "facet", partition: site, policy: { position: "shared" }, parts: [{ kind: "composite", composite: {
      combinator: "layer", sharing: { position: "shared" }, parts: [a, b].map(field => ({ kind: "qualified", result: q, field, channel: "position" })),
    } }],
  } } } };
}
/** Expanded consumer witnesses traverse the real qualification/selection path. */
export function expandedCompositeInputs(): Array<{ name: string; input: CompositeInput }> {
  const names = ["site", "day", "lo", "hi", "a", "b", "label"];
  const population = [[1, 1, 0, 10, 2, 8, "small"], ["1", 1, 0, 10, 3, 7, "typed"]];
  const layer = (input: CompositeInput): LayerComposite => {
    const c = input.composite;
    if (c.combinator !== "embed" || c.part.kind !== "composite" || c.part.composite.combinator !== "facet") throw new Error("witness topology");
    const p = c.part.composite.parts[0];
    if (p.kind !== "composite" || p.composite.combinator !== "layer") throw new Error("witness layer");
    return p.composite;
  };
  const different = request(names, population);
  const other = request(["site", "day", "floor", "roof", "c", "d", "label"], [[1, 1, 0, 100, 20, 8, "large"], ["1", 1, 0, 100, 30, 7, "typed large"]]);
  layer(different).parts.push(...layer(other).parts);
  const snapshots = request(names, population);
  const second = request(names, [["1", 1, 0, 10, 5, 6, "snapshot two"], [1, 1, 0, 10, 4, 6, "snapshot two"]]);
  layer(snapshots).parts.push(...layer(second).parts);
  const twoRanges = request(names, population);
  const structure = RelationalStructure.parse({ relations: { observations: { ...twoRanges.structure.relations.observations,
    fields: { ...twoRanges.structure.relations.observations.fields, ...other.structure.relations.observations.fields },
  } } });
  const q = qualifyRelation(structure, "observations", population.map(([site, day, lo, hi, a, b, label]) => ({ site, day, lo, hi, a, b, label, floor: 0, roof: 100, c: 20, d: b })));
  layer(twoRanges).parts = ["a", "b", "c", "d"].map(field => ({ kind: "qualified", result: q, field, channel: "position" }));
  const nested = request(names, population);
  nested.composite = { combinator: "facet", partition: "day", policy: { position: "shared" }, parts: [{ kind: "composite", composite: different.composite }] };
  const bare = request(names, population);
  bare.composite = layer(bare);
  const free = request(names, population);
  if (free.composite.combinator !== "embed" || free.composite.part.kind !== "composite" || free.composite.part.composite.combinator !== "facet") throw new Error("facet");
  free.composite = { ...free.composite.part.composite, policy: { position: "free" } };
  const conflict = request(names, population);
  layer(conflict).parts.push(...layer(request(names, [[1, 1, 0, 11, 4, 6, "conflict"], ["1", 1, 0, 11, 5, 6, "conflict"]])).parts);
  return [
    { name: "Two ranges", input: twoRanges }, { name: "Different endpoints", input: different },
    { name: "Distinct snapshots", input: snapshots }, { name: "Nested sharing", input: nested },
    { name: "Bare layer", input: bare }, { name: "Free scale readback", input: free },
    { name: "Conflicting endpoint readback", input: conflict },
  ];
}
function witness(name: string, input: CompositeInput, kind = "readback"): CompositeWitness {
  const selected = selectCompositeProgram(input, { kind });
  if (selected.kind !== "selected") return { name, status: selected.kind, reason: selected.reason };
  const readback = lowerSelectedComposite(selected.program);
  if (readback.kind !== "composite-readback") throw new Error("readback format lost");
  const metric = selectCompositeRealization(selected.program, { kind: "metric" });
  if (metric.kind !== "selected") return { name, status: "selected", readback, metricStatus: metric.kind, metricReason: metric.reason };
  if (selected.program.carrier !== metric.program.carrier) throw new Error("consumer outputs lost common custody");
  const geometry = lowerSelectedComposite(metric.program);
  if (readback.kind !== "composite-readback" || geometry.kind !== "composite-metric") throw new Error("consumer output format lost");
  return { name, status: "selected", readback, metric: geometry, metricStatus: "selected" };
}
export function compositeWitnesses(): CompositeWitness[] {
  const names = ["site", "day", "lo", "hi", "a", "b", "label"];
  const rows = [[1, 1, 5, 20, 10, 12, "first"], [1, 2, 6, 21, 11, 14, "second"], ["1", 1, 4, 19, 9, 13, "third"]];
  return [
    witness("Bounded observations", request(names, rows)),
    witness("Renamed and reordered", request(["zone", "epoch", "floor", "roof", "first_value", "other_value", "caption"], [...rows].reverse())),
    ...expandedCompositeInputs().map(({ name, input }) => witness(name, input)),
    witness("Contradicted bounds", request(names, [[1, 1, 5, 20, 99, 12, "outside"]])),
    witness("Unresolved quantity", request(names, [[1, 1, 5, 20, "unknown", 12, "missing"]])),
    witness("Unsupported format", request(names, rows), "unknown"),
    witness("Empty population", request(names, [])),
  ];
}
export default function analyticalCompositePreview(): Plugin {
  const id = "virtual:fsds/analytical-composite";
  return { name: "fsds-analytical-composite", resolveId: value => value === id ? `\0${id}` : undefined,
    load: value => value === `\0${id}` ? `export default ${JSON.stringify(compositeWitnesses())};` : undefined,
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        for (const [module, info] of Object.entries(output.modules)) {
          if (info.renderedLength > 0 && /\/analytical\/(projection|relation-model|relation-engine|authority|composite-selection)\.[jt]s$/.test(module)) {
            this.error(`Node analytical module entered the browser bundle: ${module}`);
          }
        }
      }
    },
  };
}
