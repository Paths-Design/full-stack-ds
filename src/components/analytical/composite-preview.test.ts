import { describe, expect, it } from "vitest";
import { selectCompositeProgram, selectCompositeRealization, lowerSelectedComposite } from "../../../packages/ds-codegen/src/analytical/composite-selection.js";
import { decodeCompositeMetric } from "../../../packages/ds-codegen/src/analytical/composite-artifacts.js";
const wire = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

describe("expanded production qualification and selection", () => {
  it("admits distinct ranges, snapshots and nesting while retaining format-specific refusals", async () => {
    const { expandedCompositeInputs } = await import("../../../scripts/analytical-composite-preview.js");
    const results = expandedCompositeInputs().map(({ name, input }) => {
      const readback = selectCompositeProgram(input, { kind: "readback" });
      expect(readback.kind, name).toBe("selected");
      if (readback.kind !== "selected") throw new Error(name);
      const metric = selectCompositeRealization(readback.program, { kind: "metric" });
      if (metric.kind === "selected") {
        expect(metric.program.carrier).toBe(readback.program.carrier);
        const artifact = lowerSelectedComposite(metric.program);
        if (artifact.kind !== "composite-metric") throw new Error(name);
        expect(decodeCompositeMetric(wire(artifact))).toEqual(readback.program.carrier);
      }
      return [name, metric.kind, readback.program.carrier.datasets.length];
    });
    expect(results).toEqual([
      ["Two ranges", "selected", 1], ["Different endpoints", "selected", 2],
      ["Distinct snapshots", "selected", 2], ["Nested sharing", "selected", 2],
      ["Bare layer", "selected", 1], ["Free scale readback", "unsupported", 1],
      ["Conflicting endpoint readback", "unproven", 2],
    ]);
  });
});
