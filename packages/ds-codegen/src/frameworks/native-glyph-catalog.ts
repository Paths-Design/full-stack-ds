import fs from "node:fs";
import path from "node:path";
import { ICON_GLYPH_PATH_ATTRS } from "./icon-glyph.js";

export type NativeGlyphPath = Record<string, string | number>;
export interface NativeGlyphVariant { viewBox: string; paths: NativeGlyphPath[] }
export type NativeGlyphCatalog = Record<string, { sizes: Record<string, NativeGlyphVariant> }>;

type SourceIcon = { name: string; variants: Record<string, NativeGlyphVariant> };

/** Project the authored iconography corpus once for every native engine.
 * The record carries paths, never a target-specific approximation or fallback. */
export function loadNativeGlyphCatalog(contractsRoot: string): NativeGlyphCatalog {
  const iconRoot = path.resolve(contractsRoot, "../ds-iconography/icons");
  const catalog: NativeGlyphCatalog = {};
  const pathKeys = new Set(ICON_GLYPH_PATH_ATTRS.map(attr => attr.recordKey));
  for (const entry of fs.readdirSync(iconRoot).sort()) {
    const file = path.join(iconRoot, entry, `${entry}.icon.json`);
    if (!fs.existsSync(file)) continue;
    const icon = JSON.parse(fs.readFileSync(file, "utf8")) as SourceIcon;
    if (!icon.name || !icon.variants || Object.hasOwn(catalog, icon.name)) throw new Error(`NATIVE_GLYPH_CATALOG_INVALID: ${file}`);
    const sizes: Record<string, NativeGlyphVariant> = {};
    for (const size of Object.keys(icon.variants).sort((a, b) => Number(a) - Number(b))) {
      const variant = icon.variants[size]!;
      if (!variant.viewBox || !Array.isArray(variant.paths) || !variant.paths.length) throw new Error(`NATIVE_GLYPH_CATALOG_INVALID: ${file}.${size}`);
      sizes[size] = {
        viewBox: variant.viewBox,
        paths: variant.paths.map(source => {
          const unknown = Object.keys(source).filter(key => !pathKeys.has(key));
          if (unknown.length || typeof source.d !== "string" || !source.d) throw new Error(`NATIVE_GLYPH_CATALOG_UNSUPPORTED_PATH: ${file}.${size}.${unknown.join(",")}`);
          return Object.fromEntries(ICON_GLYPH_PATH_ATTRS.filter(attr => source[attr.recordKey] !== undefined).map(attr => [attr.recordKey, source[attr.recordKey]!])) as NativeGlyphPath;
        }),
      };
    }
    catalog[icon.name] = { sizes };
  }
  if (!Object.keys(catalog).length) throw new Error(`NATIVE_GLYPH_CATALOG_EMPTY: ${iconRoot}`);
  return catalog;
}
