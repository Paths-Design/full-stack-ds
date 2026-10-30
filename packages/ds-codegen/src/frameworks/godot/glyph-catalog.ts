import type { EmitOptions, GeneratedFile } from "../../emitter.js";
import { loadNativeGlyphCatalog } from "../native-glyph-catalog.js";

/** Package-level data shared by every Godot iconGlyph host. The iconography
 * contracts, rather than a component's name or a hand-authored subset, own it. */
export function godotGlyphCatalog(opts: Pick<EmitOptions, "contractsRoot">): GeneratedFile {
  const catalog = loadNativeGlyphCatalog(opts.contractsRoot);
  return { relativePath: "addons/full_stack_ds/runtime/glyph_catalog.json", contents: `${JSON.stringify(catalog, null, 2)}\n` };
}
