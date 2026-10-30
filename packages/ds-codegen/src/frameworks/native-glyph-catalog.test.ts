import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadNativeGlyphCatalog } from "./native-glyph-catalog.js";

function withIcons(icons: { folder: string; name: string; path?: Record<string, unknown> }[], check: (contractsRoot: string) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fsds-native-glyph-"));
  const contractsRoot = path.join(root, "ds-contracts");
  fs.mkdirSync(contractsRoot);
  try {
    for (const icon of icons) {
      const dir = path.join(root, "ds-iconography/icons", icon.folder);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${icon.folder}.icon.json`), JSON.stringify({
        name: icon.name,
        variants: { "16": { viewBox: "0 0 16 16", paths: [icon.path ?? { d: "M1 1L15 15", fill: "none", stroke: "currentColor" }] } },
      }));
    }
    check(contractsRoot);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe("shared native glyph catalog", () => {
  it("rejects an authored path attribute that either engine would silently lose", () => {
    withIcons([{ folder: "Probe", name: "probe", path: { d: "M1 1L15 15", stroke: "currentColor", filter: "url(#blur)" } }], root => {
      expect(() => loadNativeGlyphCatalog(root)).toThrow(/NATIVE_GLYPH_CATALOG_UNSUPPORTED_PATH:.*filter/);
    });
  });

  it("rejects duplicate canonical names before target serialization", () => {
    withIcons([{ folder: "One", name: "same" }, { folder: "Two", name: "same" }], root => {
      expect(() => loadNativeGlyphCatalog(root)).toThrow(/NATIVE_GLYPH_CATALOG_INVALID/);
    });
  });
});
