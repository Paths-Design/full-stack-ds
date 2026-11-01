import { describe, expect, it } from "vitest";
import { collectValidPaths, resolveBrandReference } from "./brand-reference.js";

describe("canonical brand reference paths", () => {
  it("prefers exact paths over both implicit roots and core over semantic", () => {
    const paths = new Set(["tone", "core.tone", "semantic.tone", "core.spacing", "semantic.spacing", "semantic.label"]);
    expect(resolveBrandReference("tone", paths)).toBe("tone");
    expect(resolveBrandReference("spacing", paths)).toBe("core.spacing");
    expect(resolveBrandReference("label", paths)).toBe("semantic.label");
    expect(resolveBrandReference("semantic.tone", paths)).toBe("semantic.tone");
    expect(resolveBrandReference("missing", paths)).toBeUndefined();
  });

  it("shares real token leaf identity without admitting group or composite fields", () => {
    const graph = { core: { $type: "fontFamily", family: { inter: { $value: ["Inter", "sans-serif"] } }, composite: { $value: { size: 12 } }, $extensions: { hidden: { $value: 1 } } } };
    const paths = collectValidPaths(graph);
    expect([...paths]).toEqual(["core.family.inter", "core.composite"]);
    expect(resolveBrandReference("family.inter", paths)).toBe("core.family.inter");
    expect(resolveBrandReference("family", paths)).toBeUndefined();
    expect(resolveBrandReference("composite.size", paths)).toBeUndefined();
    expect(resolveBrandReference("hidden", paths)).toBeUndefined();
    expect([...collectValidPaths(null)]).toEqual([]);
    expect([...collectValidPaths([])]).toEqual([]);
  });
});
