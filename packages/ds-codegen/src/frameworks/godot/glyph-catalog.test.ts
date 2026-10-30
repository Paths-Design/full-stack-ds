import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { godotGlyphCatalog } from "./glyph-catalog.js";
import { ICON_GLYPH_PATH_ATTRS } from "../icon-glyph.js";

const contractsRoot = path.resolve(__dirname, "../../../../ds-contracts");

describe("Godot glyph catalog", () => {
  it("projects every authored icon variant and every path attribute in stable bytes", () => {
    const first = godotGlyphCatalog({ contractsRoot });
    const second = godotGlyphCatalog({ contractsRoot });
    expect(first.relativePath).toBe("addons/full_stack_ds/runtime/glyph_catalog.json");
    expect(second.contents).toBe(first.contents);
    const output = JSON.parse(first.contents) as Record<string, { sizes: Record<string, { viewBox: string; paths: Record<string, unknown>[] }> }>;
    const root = path.resolve(contractsRoot, "../ds-iconography/icons");
    const sourceFiles = fs.readdirSync(root).map(entry => path.join(root, entry, `${entry}.icon.json`)).filter(file => fs.existsSync(file));
    expect(Object.keys(output)).toHaveLength(sourceFiles.length);
    for (const file of sourceFiles) {
      const source = JSON.parse(fs.readFileSync(file, "utf8")) as { name: string; variants: Record<string, { viewBox: string; paths: Record<string, unknown>[] }> };
      expect(Object.keys(output[source.name]!.sizes).sort()).toEqual(Object.keys(source.variants).sort());
      for (const [size, variant] of Object.entries(source.variants)) {
        expect(output[source.name]!.sizes[size]!.viewBox).toBe(variant.viewBox);
        expect(output[source.name]!.sizes[size]!.paths).toEqual(variant.paths.map(glyphPath => Object.fromEntries(
          ICON_GLYPH_PATH_ATTRS.filter(attr => glyphPath[attr.recordKey] !== undefined).map(attr => [attr.recordKey, glyphPath[attr.recordKey]]),
        )));
      }
    }
  });
});
