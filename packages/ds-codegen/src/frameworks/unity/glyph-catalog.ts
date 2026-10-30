import type { EmitOptions, GeneratedFile } from "../../emitter.js";
import { loadNativeGlyphCatalog } from "../native-glyph-catalog.js";
import { projectGlyphPath, type GlyphCommand } from "./glyph-path.js";

const quote = (value: string): string => JSON.stringify(value);
const scalar = (value: number): string => {
  if (!Number.isFinite(value)) throw new Error("UNITY_GLYPH_CATALOG_INVALID: non-finite scalar");
  return String(Object.is(value, -0) ? 0 : value) + "f";
};
const vector = (x: number, y: number): string => "new Vector2(" + scalar(x) + ", " + scalar(y) + ")";
function command(value: GlyphCommand): string {
  if (value.kind === "Z") return "new GlyphCommand(GlyphCommandKind.Close)";
  if (value.kind === "M" || value.kind === "L")
    return "new GlyphCommand(GlyphCommandKind." + (value.kind === "M" ? "Move" : "Line") + ", " + vector(value.x, value.y) + ")";
  if (value.kind !== "C") throw new Error("UNITY_GLYPH_CATALOG_INVALID: command");
  return "new GlyphCommand(GlyphCommandKind.Cubic, " +
    vector(value.x1, value.y1) + ", " + vector(value.x2, value.y2) + ", " + vector(value.x, value.y) + ")";
}
const commands = (values: GlyphCommand[]): string =>
  "new GlyphCommand[] { " + values.map(command).join(", ") + " }";
const enumValue = (value: string): string => value[0]!.toUpperCase() + value.slice(1);

/** Generated C# data carries every authored variant and path, with no icon-name branch. */
export function unityGlyphCatalog(opts: Pick<EmitOptions, "contractsRoot">): GeneratedFile {
  const catalog = loadNativeGlyphCatalog(opts.contractsRoot);
  const entries = Object.entries(catalog).map(([name, icon]) => {
    const sizes = Object.entries(icon.sizes).sort(([a], [b]) => Number(a) - Number(b));
    const variants = sizes.map(([grid, variant]) => {
      const box = variant.viewBox.trim().split(/[\s,]+/).map(Number);
      if (box.length !== 4 || box.some(n => !Number.isFinite(n)) || box[2]! <= 0 || box[3]! <= 0)
        throw new Error("UNITY_GLYPH_CATALOG_INVALID: " + name + "." + grid + " viewBox");
      const paths = variant.paths.map(source => {
        const path = projectGlyphPath(source);
        return "new GlyphPath(" + [
          String(path.fill).toLowerCase(), String(path.stroke).toLowerCase(), scalar(path.strokeWidth),
          "LineCap." + enumValue(path.lineCap), "LineJoin." + enumValue(path.lineJoin),
          "FillRule." + (path.fillRule === "evenodd" ? "OddEven" : "NonZero"),
          commands(path.fillCommands), commands(path.strokeCommands),
        ].join(", ") + ")";
      });
      return "new GlyphVariant(new Rect(" + box.map(scalar).join(", ") +
        "), new GlyphPath[] { " + paths.join(", ") + " })";
    });
    return "            { " + quote(name) + ", new GlyphSet(new int[] { " +
      sizes.map(([grid]) => {
        const number = Number(grid);
        if (!Number.isSafeInteger(number) || number <= 0) throw new Error("UNITY_GLYPH_CATALOG_INVALID: " + name + "." + grid + " grid");
        return String(number);
      }).join(", ") + " }, new GlyphVariant[] { " + variants.join(", ") + " }) },";
  });
  const contents = [
    "// Generated from the authored iconography catalog. Regenerate with pnpm run generate:unity.",
    "using System;",
    "using System.Collections.Generic;",
    "using UnityEngine;",
    "using UnityEngine.UIElements;",
    "",
    "namespace FullStackDS",
    "{",
    "    public static class GlyphCatalog",
    "    {",
    "        private sealed class GlyphSet",
    "        {",
    "            public readonly int[] Grids;",
    "            public readonly GlyphVariant[] Variants;",
    "            public GlyphSet(int[] grids, GlyphVariant[] variants) { Grids = grids; Variants = variants; }",
    "        }",
    "        private static readonly Dictionary<string, GlyphSet> Data = new Dictionary<string, GlyphSet>(StringComparer.Ordinal)",
    "        {",
    ...entries,
    "        };",
    "        public static bool TryGet(string name, float frameSize, out GlyphVariant variant)",
    "        {",
    "            variant = null;",
    "            if (string.IsNullOrEmpty(name) || !Data.TryGetValue(name, out var set)) return false;",
    "            var selected = 0;",
    "            for (var i = 0; i < set.Grids.Length; i++)",
    "                if (set.Grids[i] <= frameSize) selected = i;",
    "            variant = set.Variants[selected];",
    "            return true;",
    "        }",
    "    }",
    "}",
    "",
  ].join("\n");
  return { relativePath: "Runtime/GlyphCatalog.generated.cs", contents };
}
