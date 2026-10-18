import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { generateLitComponentSource } from "./component-source.js";

// ICON-CATALOG-RUNTIME-DELIVERY-01 — Lit lowering.
//
// An `iconGlyph` directive on an svg node renders that node's viewBox and
// <path> children from the `@full-stack-ds/iconography` catalog, looked up
// at runtime by the bound name/size props. This fixture mirrors the real
// Icon contract's dom shape (span root, svg child with iconGlyph +
// authored static attrs) so the suite proves the Lit emitter reproduces
// the same semantics as the React reference lowering
// (packages/ds-codegen/src/frameworks/react/component-source.ts).

const CONTRACT: ComponentContract = {
  name: "FixtureGlyph",
  layer: "primitive",
  cssPrefix: "fixture-glyph",
  anatomy: {
    parts: ["root"],
    dom: {
      tag: "span",
      part: "root",
      attrs: { "aria-hidden": "true" },
      children: [
        {
          tag: "svg",
          attrs: {
            fill: "none",
            xmlns: "http://www.w3.org/2000/svg",
          },
          iconGlyph: {
            nameFrom: "prop:name",
            sizeFrom: "prop:size",
            sizeHints: { sm: 16, md: 20, lg: 24, xl: 32 },
          },
        },
      ],
    },
  },
  props: {
    designed: {
      members: [
        {
          name: "name",
          propType: { kind: "string" },
          description: "Icon name",
          required: true,
        },
        {
          name: "size",
          propType: { kind: "enum", values: ["sm", "md", "lg", "xl"] },
          description: "Icon size",
          default: "md",
        },
      ],
    },
  },
};

const ir = buildComponentIR(CONTRACT);
const src = generateLitComponentSource(ir);

describe("ICON-CATALOG-RUNTIME-DELIVERY-01: Lit iconGlyph lowering", () => {
  it("imports resolveIcon from the committed iconography package root", () => {
    expect(src).toContain(
      `import { resolveIcon } from "@full-stack-ds/iconography";`,
    );
  });

  it("imports the svg tagged template from lit alongside html/css/nothing", () => {
    expect(src).toMatch(/import \{[^}]*\bsvg\b[^}]*\} from 'lit';/);
    // CODEGEN-EMIT-LINT-HYGIENE-01: the glyph null-guard renders `nothing`
    // on its false branch, so the conditional `nothing` import must be
    // present for this body.
    expect(src).toMatch(/import \{[^}]*\bnothing\b[^}]*\} from 'lit';/);
  });

  it("imports the ifDefined directive for optional path attributes", () => {
    expect(src).toContain(
      `import { ifDefined } from 'lit/directives/if-defined.js';`,
    );
  });

  it("declares a module-scope size-hints const from the contract's sizeHints", () => {
    expect(src).toContain(
      `const ICON_GLYPH_SIZE_HINTS: Record<string, number> = { "sm": 16, "md": 20, "lg": 24, "xl": 32 };`,
    );
  });

  it("resolves the catalog record from render()-local consts", () => {
    // FIX-UNDEFINED-PROP-ACCESSOR-DEFAULTING-01: falls back to the
    // contract's declared default ("md") rather than "" — a class-field
    // initializer only applies once at construction, so an explicit
    // `undefined` assignment later must still resolve via the accessor's
    // `?? default`, not silently miss the hints map.
    expect(src).toContain(
      `const iconGlyphPx = ICON_GLYPH_SIZE_HINTS[(this.size ?? "md")];`,
    );
    expect(src).toContain(
      `const iconGlyph = resolveIcon(this.name, iconGlyphPx ?? Number.NaN);`,
    );
  });

  it("null-guards the svg with the resolved glyph record via the svg tagged template", () => {
    expect(src).toMatch(/\$\{iconGlyph \? svg`/);
    // The guard's false branch must render nothing, matching the
    // `if:"children"` guard's `nothing` idiom elsewhere in this file.
    expect(src).toMatch(/\$\{iconGlyph \? svg`[\s\S]*?` : nothing\}/);
  });

  it("preserves authored static attrs and adds the catalog-derived attrs", () => {
    expect(src).toContain(`fill="none"`);
    expect(src).toContain(`xmlns="http://www.w3.org/2000/svg"`);
    expect(src).toContain(`data-fsds-icon=\${iconGlyph.name}`);
    expect(src).toContain(`viewBox=\${iconGlyph.viewBox}`);
    expect(src).toContain(
      `width=\${iconGlyphPx ?? iconGlyph.size}`,
    );
    expect(src).toContain(
      `height=\${iconGlyphPx ?? iconGlyph.size}`,
    );
  });

  it("maps each glyph path record to a <path> via the svg tagged template", () => {
    expect(src).toMatch(
      /\$\{iconGlyph\.paths\.map\(\(glyphPath\) => svg`<path /,
    );
  });

  it("lowers every ICON_GLYPH_PATH_ATTRS entry to its kebab svg attribute, wrapped in ifDefined", () => {
    expect(src).toContain(`d=\${ifDefined(glyphPath.d)}`);
    expect(src).toContain(`fill=\${ifDefined(glyphPath.fill)}`);
    expect(src).toContain(`stroke=\${ifDefined(glyphPath.stroke)}`);
    expect(src).toContain(`stroke-width=\${ifDefined(glyphPath.strokeWidth)}`);
    expect(src).toContain(
      `stroke-linecap=\${ifDefined(glyphPath.strokeLineCap)}`,
    );
    expect(src).toContain(
      `stroke-linejoin=\${ifDefined(glyphPath.strokeLineJoin)}`,
    );
    expect(src).toContain(
      `stroke-dasharray=\${ifDefined(glyphPath.strokeDasharray)}`,
    );
    expect(src).toContain(`fill-rule=\${ifDefined(glyphPath.fillRule)}`);
    expect(src).toContain(`clip-rule=\${ifDefined(glyphPath.clipRule)}`);
  });

  it("does not emit camelCase record-key spellings as svg attribute names", () => {
    // Guards against a future regression that hands `recordKey` (camelCase
    // contract vocabulary) to the template instead of `svgAttr` (kebab).
    expect(src).not.toMatch(/strokeWidth=\$\{ifDefined/);
    expect(src).not.toMatch(/strokeLineCap=\$\{ifDefined/);
  });
});

describe("ICON-CATALOG-RUNTIME-DELIVERY-01: Lit opt-in import injection", () => {
  it("does NOT import resolveIcon, svg, or ifDefined when no iconGlyph node exists", () => {
    const plainContract: ComponentContract = {
      name: "FixturePlainGlyph",
      layer: "primitive",
      cssPrefix: "fixture-plain-glyph",
      anatomy: {
        parts: ["root"],
        dom: { tag: "div", part: "root" },
      },
      props: { styled: { members: [{ name: "label", type: "string" }] } },
    };
    const plainSrc = generateLitComponentSource(buildComponentIR(plainContract));
    expect(plainSrc).not.toContain("@full-stack-ds/iconography");
    expect(plainSrc).not.toMatch(/import \{[^}]*\bsvg\b[^}]*\} from 'lit';/);
    expect(plainSrc).not.toContain("lit/directives/if-defined.js");
    // CODEGEN-EMIT-LINT-HYGIENE-01: no conditional hole in this body → the
    // `nothing` sentinel import must be omitted (unused-import finding).
    expect(plainSrc).not.toMatch(/import \{[^}]*\bnothing\b[^}]*\} from 'lit';/);
    // The always-needed lit imports stay.
    expect(plainSrc).toMatch(/import \{ LitElement, html, css(, svg)?(, type PropertyValues)? \} from 'lit';/);
  });

  it("does NOT declare a size-hints const when the glyph has no sizeHints", () => {
    const noHintsContract: ComponentContract = {
      name: "FixtureGlyphNoHints",
      layer: "primitive",
      cssPrefix: "fixture-glyph-no-hints",
      anatomy: {
        parts: ["root"],
        dom: {
          tag: "svg",
          part: "root",
          attrs: { fill: "none" },
          iconGlyph: { nameFrom: "prop:name" },
        },
      },
      props: {
        designed: {
          members: [
            {
              name: "name",
              propType: { kind: "string" },
              description: "Icon name",
              required: true,
            },
          ],
        },
      },
    };
    const noHintsSrc = generateLitComponentSource(
      buildComponentIR(noHintsContract),
    );
    expect(noHintsSrc).not.toContain("ICON_GLYPH_SIZE_HINTS");
    expect(noHintsSrc).toContain(
      `const iconGlyph = resolveIcon(this.name, Number.NaN);`,
    );
  });
});
