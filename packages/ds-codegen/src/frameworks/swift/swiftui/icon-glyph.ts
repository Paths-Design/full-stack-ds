/**
 * Generated glyph catalog emission — reads the iconography corpus
 * (the .icon.json files under packages/ds-iconography/icons) and emits
 * Sources/DsSwiftUI/Glyphs/GlyphCatalog.swift: one data table (name →
 * variants with viewBox + stroke paths) plus the `glyph(named:size:)`
 * registry every iconGlyph-bearing surface composes. The catalog is a
 * SHARED SUBSTRATE, like FsdsTheme — Alert/Status/Badge icon parts will
 * lower through the same registry by iconGlyph fact, not by emitting
 * their own glyph copies.
 *
 * Size policy: the catalog authors 16/24 grids; the contract's size
 * hints (e.g. sm:16 md:20 lg:24 xl:32) frame the rendered glyph — the
 * nearest authored grid renders, GlyphIcon scales to the frame (the
 * web targets' ICON_GLYPH_SIZE_HINTS analog).
 */
import fs from "node:fs";
import path from "node:path";
import type { GeneratedFile } from "../../../emitter.js";

interface IconPathSpec {
  d: string;
  strokeWidth?: number;
}

interface IconVariantSpec {
  name: string;
  width: number;
  height: number;
  viewBox: string;
  paths: IconPathSpec[];
}

interface IconSpec {
  name: string;
  decorativeDefault: boolean;
  variants: Record<string, IconVariantSpec>;
}

function loadIconCatalog(): IconSpec[] {
  const repoRoot = process.cwd();
  const iconsDir = path.resolve(repoRoot, "packages", "ds-iconography", "icons");
  if (!fs.existsSync(iconsDir)) return [];
  const specs: IconSpec[] = [];
  for (const entry of fs.readdirSync(iconsDir).sort()) {
    const file = path.join(iconsDir, entry, `${entry}.icon.json`);
    if (!fs.existsSync(file)) continue;
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as {
      name?: string;
      semantics?: { decorativeDefault?: boolean };
      variants?: Record<string, IconVariantSpec>;
    };
    if (!raw.name || !raw.variants) continue;
    specs.push({
      name: raw.name,
      decorativeDefault: raw.semantics?.decorativeDefault ?? true,
      variants: raw.variants,
    });
  }
  return specs;
}

export function generateGlyphCatalogFile(): GeneratedFile | null {
  const icons = loadIconCatalog();
  if (icons.length === 0) return null;
  const lines: string[] = [];
  lines.push("import SwiftUI");
  lines.push("");
  lines.push("// @generated:start catalog");
  lines.push(
    `/// FSDS glyph catalog, generated from packages/ds-iconography (29+ ` +
      `icons, closed M/L/H/V/A/Z vocabulary). Rendered through the ` +
      `hand-maintained SVGPath runtime; strokes inherit foregroundStyle ` +
      `(the currentColor analog).`,
  );
  lines.push(`public enum GlyphCatalog {`);
  lines.push(`    public struct GlyphVariant: Sendable {`);
  lines.push(`        public let viewBox: CGFloat`);
  lines.push(`        public let paths: [GlyphStroke]`);
  lines.push(`    }`);
  lines.push("");
  lines.push(`    public struct GlyphStroke: Sendable {`);
  lines.push(`        public let d: String`);
  lines.push(`        public let width: CGFloat`);
  lines.push(`    }`);
  lines.push("");
  lines.push(`    public static let variants: [String: [Int: GlyphVariant]] = [`);
  for (const icon of icons) {
    lines.push(`        "${icon.name}": [`);
    for (const [key, variant] of Object.entries(icon.variants)) {
      lines.push(`            ${key}: GlyphVariant(`);
      const vb = variant.viewBox.split(" ").map(Number);
      lines.push(`                viewBox: ${vb[2]},`);
      lines.push(`                paths: [`);
      for (const p of variant.paths) {
        lines.push(`                    GlyphStroke(d: ${swiftLiteral(p.d)}, width: ${p.strokeWidth ?? 1.5}),`);
      }
      lines.push(`                ]`);
      lines.push(`            ),`);
    }
    lines.push(`        ],`);
  }
  lines.push(`    ]`);
  lines.push("");
  lines.push(`    /// Decorative-by-default flags from the catalog semantics.`);
  lines.push(`    public static let decorativeDefaults: Set<String> = [`);
  for (const icon of icons.filter((i) => i.decorativeDefault)) {
    lines.push(`        "${icon.name}",`);
  }
  lines.push(`    ]`);
  lines.push("");
  lines.push(`    /// Registry lookup every iconGlyph surface composes: the nearest`);
  lines.push(`    /// authored grid ≤ the requested size renders and scales to frame.`);
  lines.push(`    @ViewBuilder`);
  lines.push(`    public static func glyph(named name: String, size: CGFloat) -> some View {`);
  lines.push(`        if let byGrid = variants[name], !byGrid.isEmpty {`);
  lines.push(`            let grids = byGrid.keys.sorted()`);
  lines.push(`            let grid = grids.last(where: { CGFloat($0) <= size }) ?? grids[0]`);
  lines.push(`            if let variant = byGrid[grid] {`);
  lines.push(`                GlyphRenderer(variant: variant, frame: size)`);
  lines.push(`            } else {`);
  lines.push(`                unknown(name: name, size: size)`);
  lines.push(`            }`);
  lines.push(`        } else {`);
  lines.push(`            // Unknown name: surface it through accessibility rather`);
  lines.push(`            // than silently rendering nothing.`);
  lines.push(`            unknown(name: name, size: size)`);
  lines.push(`        }`);
  lines.push(`    }`);
  lines.push("");
  lines.push(`    private static func unknown(name: String, size: CGFloat) -> some View {`);
  lines.push(`        UnknownGlyph(name: name, frame: size)`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push("");
  lines.push(`private struct GlyphRenderer: View {`);
  lines.push(`    let variant: GlyphCatalog.GlyphVariant`);
  lines.push(`    let frame: CGFloat`);
  lines.push(`    var body: some View {`);
  lines.push(`        GeometryReader { geo in`);
  lines.push(`            let scale = min(geo.size.width, geo.size.height) / variant.viewBox`);
  lines.push(`            ZStack {`);
  lines.push(`                ForEach(variant.paths.indices, id: \\.self) { i in`);
  lines.push(`                    SVGPath.parse(variant.paths[i].d)`);
  lines.push(`                        .stroke(style: StrokeStyle(`);
  lines.push(`                            lineWidth: variant.paths[i].width * scale,`);
  lines.push(`                            lineCap: .round, lineJoin: .round))`);
  lines.push(`                }`);
  lines.push(`            }`);
  lines.push(`            .scaleEffect(scale, anchor: .topLeading)`);
  lines.push(`            .frame(width: variant.viewBox, height: variant.viewBox, alignment: .topLeading)`);
  lines.push(`        }`);
  lines.push(`        .frame(width: frame, height: frame)`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push("");
  lines.push(`private struct UnknownGlyph: View {`);
  lines.push(`    let name: String`);
  lines.push(`    let frame: CGFloat`);
  lines.push(`    var body: some View {`);
  lines.push(`        RoundedRectangle(cornerRadius: 2)`);
  lines.push(`            .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [2, 2]))`);
  lines.push(`            .frame(width: frame, height: frame)`);
  lines.push(`            .accessibilityLabel("unknown fsds icon: \\(name)")`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push("// @generated:end");
  return {
    relativePath: "../Glyphs/GlyphCatalog.swift",
    contents: lines.join("\n") + "\n",
  };
}

/**
 * Swift single-line string literal. Escapes backslashes and quotes, and every
 * control character (a raw line break would end the literal mid-string).
 */
export function swiftLiteral(value: string): string {
  const escaped = value.replace(/[\\"\u0000-\u001f\u007f]/g, (ch) => {
    switch (ch) {
      case "\\": return "\\\\";
      case '"': return '\\"';
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\t": return "\\t";
      case "\0": return "\\0";
      default: return `\\u{${ch.charCodeAt(0).toString(16)}}`;
    }
  });
  return `"${escaped}"`;
}
