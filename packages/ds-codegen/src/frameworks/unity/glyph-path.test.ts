import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadNativeGlyphCatalog } from "../native-glyph-catalog.js";
import { parseGlyphCommands, projectGlyphPath } from "./glyph-path.js";

describe("Unity authored glyph path projection", () => {
  it("normalizes relative and repeated SVG commands without losing endpoints", () => {
    expect(parseGlyphCommands("M1 2 3 4h5v-2l-1 3z")).toEqual([
      { kind: "M", x: 1, y: 2 }, { kind: "L", x: 3, y: 4 },
      { kind: "L", x: 8, y: 4 }, { kind: "L", x: 8, y: 2 },
      { kind: "L", x: 7, y: 5 }, { kind: "Z" },
    ]);
  });
  it("projects sweep arcs to finite cubics with correct endpoints", () => {
    const down = parseGlyphCommands("M10 0A10 10 0 0 1 0 10");
    expect(down).toHaveLength(3);
    expect(down[1]).toMatchObject({ kind: "C", x1: 10 });
    expect(down[1]!.kind === "C" && down[1]!.y1 > 0).toBe(true);
    expect(down[2]).toMatchObject({ kind: "C", x: 0, y: 10, y2: 10 });
    const up = parseGlyphCommands("M10 0A10 10 0 0 0 0 -10");
    expect(up[1]!.kind === "C" && up[1]!.y1 < 0).toBe(true);
    expect(up[2]).toMatchObject({ kind: "C", x: 0, y: -10 });
  });
  it("corrects undersized radii and collapses zero-radius arcs to lines", () => {
    expect(parseGlyphCommands("M0 0A1 1 0 0 1 10 0").at(-1)).toMatchObject({ kind: "C", x: 10, y: 0 });
    expect(parseGlyphCommands("M0 0A0 1 0 0 1 10 0")).toEqual([
      { kind: "M", x: 0, y: 0 }, { kind: "L", x: 10, y: 0 },
    ]);
  });
  it("splits dashes while retaining original fill geometry", () => {
    const plan = projectGlyphPath({ d: "M0 0H10M0 2H5", fill: "currentColor",
      stroke: "currentColor", strokeDasharray: "2 1" });
    expect(plan.fillCommands).toHaveLength(4);
    expect(plan.strokeCommands).toEqual([
      { kind: "M", x: 0, y: 0 }, { kind: "L", x: 2, y: 0 },
      { kind: "M", x: 3, y: 0 }, { kind: "L", x: 5, y: 0 },
      { kind: "M", x: 6, y: 0 }, { kind: "L", x: 8, y: 0 },
      { kind: "M", x: 9, y: 0 }, { kind: "L", x: 10, y: 0 },
      { kind: "M", x: 0, y: 2 }, { kind: "L", x: 2, y: 2 },
      { kind: "M", x: 3, y: 2 }, { kind: "L", x: 5, y: 2 },
    ]);
  });
  it.each([
    "", "L0 0", "M0", "M0 0L1", "M0 0C1 1 2 2 3 3",
    "M0 0A1 1 0 2 0 1 1", "M0 0L1e309 0", "M0 0@",
  ])("refuses malformed or unsupported SVG data %j", source => {
    expect(() => parseGlyphCommands(source)).toThrow(/UNITY_GLYPH_PATH_UNSUPPORTED/);
  });
  it.each([
    { clipRule: "evenodd" }, { fill: "red" }, { strokeWidth: -1 },
    { strokeLineCap: "triangle" }, { strokeDasharray: "0 2" },
    { strokeDasharray: "-1 2" }, { strokeDasharray: "nope" },
  ])("refuses path facts the renderer cannot carry %j", attributes => {
    const input = Object.fromEntries(Object.entries(attributes).filter(([, value]) => value !== undefined)) as Record<string, string | number>;
    expect(() => projectGlyphPath({ d: "M0 0H10", ...input }))
      .toThrow(/UNITY_GLYPH_PATH_UNSUPPORTED/);
  });
  it("refuses closed dashed subpaths whose seam cannot be preserved", () => {
    expect(() => projectGlyphPath({ d: "M0 0H10Z", strokeDasharray: "2 1" }))
      .toThrow(/closed dashed subpath/);
  });
  it("projects every authored path, including both dashed placeholder paths", () => {
    const catalog = loadNativeGlyphCatalog(path.resolve(__dirname, "../../../../ds-contracts"));
    const plans = Object.values(catalog).flatMap(icon =>
      Object.values(icon.sizes).flatMap(variant => variant.paths.map(project => projectGlyphPath(project))));
    expect(plans.length).toBeGreaterThan(80);
    expect([...new Set(plans.flatMap(plan => plan.fillCommands.map(command => command.kind)))].sort())
      .toEqual(["C", "L", "M", "Z"]);
    expect(plans.every(plan => plan.stroke && !plan.fill)).toBe(true);
    const placeholder = catalog.placeholder!.sizes["17"]!.paths.map(project => projectGlyphPath(project));
    expect(placeholder).toHaveLength(2);
    expect(placeholder.every(plan => plan.strokeCommands.every(command => command.kind === "M" || command.kind === "L"))).toBe(true);
  });
});
