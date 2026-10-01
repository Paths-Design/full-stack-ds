import { describe, expect, it } from "vitest";
import { RelationalStructure } from "./relation-model.js";
import { bindOperation, EXPERIMENT_TARGET, judgeComposite, lowerSelectedProgram, qualifyRelation, selectQualifiedProgram } from "./projection.js";
import type { Channel, Composite, CompositePart, Program, QualifiedProgram } from "./projection.js";

const declaration = () => RelationalStructure.parse({ relations: { samples: { grain: ["site", "day"], fields: {
  site: { transformation: "nominal" }, day: { transformation: "nominal" },
  lo: { transformation: "ratio" }, hi: { transformation: "ratio" },
  a: { transformation: "ratio", unit: { units: ["u"] }, bounds: { lower: "lo", upper: "hi" } },
  b: { transformation: "ratio", bounds: { lower: "lo", upper: "hi" } },
  label: { transformation: "nominal" },
} } } });
const rows = [{ site: "s", day: "d", lo: 0, hi: 20, a: 10, b: 12, label: "x" }];
const view = (result = qualifyRelation(declaration(), "samples", rows), field = "a", channel: Channel = "length"): CompositePart => ({ kind: "qualified", result, field, channel });
const layer = (...parts: CompositePart[]): Composite => ({ combinator: "layer", parts, sharing: {} });
const judge = (composite: Composite, structure = declaration(), inventory = EXPERIMENT_TARGET) => judgeComposite({ composite, structure, inventory }).verdict;

describe("analytical boundary falsifiers", () => {
  it("distinguishes missing evidence, empty population, missing binding and duplicate identity", () => {
    const absent = qualifyRelation(declaration(), "samples");
    const empty = qualifyRelation(declaration(), "samples", []);
    expect(absent.judgment.standing).toBe("unproven");
    expect(selectQualifiedProgram(absent, { kind: "readback" }).kind).toBe("unproven");
    expect(empty.judgment.standing).toBe("qualified");
    expect(selectQualifiedProgram(empty, { kind: "readback" }).kind).toBe("nothing-to-realize");
    const incomplete = qualifyRelation(declaration(), "samples", [{ ...rows[0], site: undefined }]);
    expect(incomplete.judgment.standing).toBe("unproven");
    expect(incomplete.observations[0]!.key.some(k => k.field === "site")).toBe(false);
    const duplicate = qualifyRelation(declaration(), "samples", [...rows, ...rows]);
    expect(duplicate.judgment.standing).toBe("contradicted");
    expect(judge(layer(view(duplicate))).kind).toBe("refused");
  });

  it("preserves key types and compares grain bindings independently of field order", () => {
    const structure = declaration();
    const reverse = declaration();
    (reverse.relations.samples!.grain as string[]).reverse();
    const q = qualifyRelation(structure, "samples", rows);
    expect(judge(layer(view(q), view(qualifyRelation(reverse, "samples", rows), "b", "luminance"))).kind).toBe("retained");
    const numeric = qualifyRelation(structure, "samples", [{ ...rows[0], site: 1 }]);
    const textual = qualifyRelation(structure, "samples", [{ ...rows[0], site: "1" }]);
    expect(judge(layer(view(numeric), view(textual, "b", "luminance"))).kind).toBe("refused");
  });

  it("consumes snapshotted field authority, checks channel capability, and detaches output", () => {
    const structure = declaration();
    const q = qualifyRelation(structure, "samples", rows);
    (structure.relations.samples!.grain as string[]).push("a");
    structure.relations.samples!.fields!.a!.transformation = "nominal";
    structure.relations.samples!.fields!.a!.unit!.units![0] = "other";
    structure.relations.samples!.fields!.a!.bounds!.lower = "b";
    expect(q.grain).toEqual(["site", "day"]);
    const reading = judge(layer(view(q)), structure);
    expect(reading.kind).toBe("retained");
    if (reading.kind !== "retained") throw new Error("carried reading missing");
    expect(reading.transformations.length).toBe("ratio");
    expect(reading.units.length).toEqual({ units: ["u"] });
    expect(q.fieldFacts.a!.bounds).toEqual({ lower: "lo", upper: "hi" });
    expect(judge(layer(view(q, "a", "hue"))).kind).toBe("refused");
    expect(judge(layer(view(q, "a", "angle"))).kind).toBe("unproven");
    const proportion = declaration();
    proportion.relations.samples!.fields!.a!.proportion = true;
    expect(judge(layer(view(qualifyRelation(proportion, "samples", rows), "a", "angle"))).kind).toBe("unproven");
    expect(judge(layer(view(q)), declaration(), { ...EXPERIMENT_TARGET, channels: [] }).kind).toBe("unsupported");
    const selected = selectQualifiedProgram(q, { kind: "readback" });
    expect(selected.kind).toBe("selected");
    if (selected.kind !== "selected") throw new Error("selection missing");
    const artifact = lowerSelectedProgram(selected.program);
    (artifact.observations[0]!.values as Record<string, number | string>).a = 999;
    expect(q.observations[0]!.values.a).toBe(10);
    expect(Object.isFrozen(q.observations[0]!.values)).toBe(true);
    expect(() => lowerSelectedProgram({ result: q, intent: { kind: "unsupported" } } as QualifiedProgram)).toThrow(/selected/);
  });

  it("checks every transformation on a channel independently of operand order", () => {
    const q = qualifyRelation(declaration(), "samples", rows);
    const parts = [view(q, "a", "text"), view(q, "label", "text")];
    const host: Program = { coordinate: "cartesian", dimension: "position", measure: "length", baseline: "zero", task: "magnitude-comparison", claims: [], operation: bindOperation(declaration(), { relation: "samples", field: "a", op: "sum", along: ["day"] }) };
    const normalized: unknown[] = [];
    for (const ordered of [parts, [...parts].reverse()]) {
      const inner: Composite = { combinator: "facet", parts: ordered, partition: "site", policy: { text: "free" } };
      const reading = judge(inner);
      expect(reading.kind).toBe("retained");
      if (reading.kind !== "retained") throw new Error("mixed reading missing");
      expect(reading.transformationRequirements.text).toEqual(["nominal", "ratio"]);
      expect(reading.transformations.text).toBeUndefined();
      normalized.push(reading);
      expect(judge({ combinator: "embed", host, budget: ["length"], cellBaseline: "zero", part: { kind: "composite", composite: inner } }).kind).toBe("refused");
    }
    expect(normalized[0]).toEqual(normalized[1]);
  });

  it("cannot launder a magnitude task through a nested layer at a truncated baseline", () => {
    const host: Program = { coordinate: "cartesian", dimension: "position", measure: "length", baseline: "zero", task: "magnitude-comparison", claims: [], operation: bindOperation(declaration(), { relation: "samples", field: "a", op: "sum", along: ["day"] }) };
    const atomic: CompositePart = { kind: "program", program: host };
    for (const part of [atomic, { kind: "composite", composite: layer(atomic) } as CompositePart]) {
      const verdict = judge({ combinator: "embed", host, budget: ["position"], cellBaseline: "truncated", part });
      expect(verdict.kind).toBe("refused");
      if (verdict.kind === "refused") {
        expect(verdict.causes).toContain("REL_EMBED_TASK_EXCEEDS_CHANNEL_BUDGET");
        expect(verdict.detail).toContain("ratio-comparability");
      }
    }
  });

  it("surfaces contradiction ahead of missing evidence regardless of operand order", () => {
    const gap = view(qualifyRelation(declaration(), "samples", [{ ...rows[0], a: "unknown" }]));
    const violation = view(qualifyRelation(declaration(), "samples", [{ ...rows[0], a: 99 }]));
    for (const parts of [[gap, violation], [violation, gap]]) {
      const result = judgeComposite({ structure: declaration(), inventory: EXPERIMENT_TARGET, composite: layer(...parts) });
      expect(result.verdict.kind).toBe("refused");
      expect(result.parts.map(p => p.verdict.kind).sort()).toEqual(["refused", "unproven"]);
    }
  });
});
