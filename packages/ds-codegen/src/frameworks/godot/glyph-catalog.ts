import fs from "node:fs";
import path from "node:path";
import type { EmitOptions, GeneratedFile } from "../../emitter.js";
import { ICON_GLYPH_PATH_ATTRS } from "../icon-glyph.js";

type SourcePath = Record<string, string | number>;
type SourceVariant = { viewBox: string; paths: SourcePath[] };
type SourceIcon = { name: string; variants: Record<string, SourceVariant> };

/** Package-level data shared by every Godot iconGlyph host. The iconography
 * contracts, rather than a component's name or a hand-authored subset, own it. */
export function godotGlyphCatalog(opts: Pick<EmitOptions, "contractsRoot">): GeneratedFile {
  const iconRoot = path.resolve(opts.contractsRoot, "../ds-iconography/icons");
  const catalog: Record<string, { sizes: Record<string, SourceVariant> }> = {};
  const pathKeys = new Set(ICON_GLYPH_PATH_ATTRS.map(attr => attr.recordKey));
  for (const entry of fs.readdirSync(iconRoot).sort()) {
    const file = path.join(iconRoot, entry, `${entry}.icon.json`);
    if (!fs.existsSync(file)) continue;
    const icon = JSON.parse(fs.readFileSync(file, "utf8")) as SourceIcon;
    if (!icon.name || !icon.variants || Object.hasOwn(catalog, icon.name)) throw new Error(`GODOT_GLYPH_CATALOG_INVALID: ${file}`);
    const sizes: Record<string, SourceVariant> = {};
    for (const size of Object.keys(icon.variants).sort((a, b) => Number(a) - Number(b))) {
      const variant = icon.variants[size]!;
      if (!variant.viewBox || !Array.isArray(variant.paths) || !variant.paths.length) throw new Error(`GODOT_GLYPH_CATALOG_INVALID: ${file}.${size}`);
      sizes[size] = {
        viewBox: variant.viewBox,
        paths: variant.paths.map(source => {
          const unknown = Object.keys(source).filter(key => !pathKeys.has(key));
          if (unknown.length || typeof source.d !== "string" || !source.d) throw new Error(`GODOT_GLYPH_CATALOG_UNSUPPORTED_PATH: ${file}.${size}.${unknown.join(",")}`);
          return Object.fromEntries(ICON_GLYPH_PATH_ATTRS.filter(attr => source[attr.recordKey] !== undefined).map(attr => [attr.recordKey, source[attr.recordKey]!])) as SourcePath;
        }),
      };
    }
    catalog[icon.name] = { sizes };
  }
  if (!Object.keys(catalog).length) throw new Error(`GODOT_GLYPH_CATALOG_EMPTY: ${iconRoot}`);
  return { relativePath: "addons/full_stack_ds/runtime/glyph_catalog.json", contents: `${JSON.stringify(catalog, null, 2)}\n` };
}
