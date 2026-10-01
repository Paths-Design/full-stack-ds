/**
 * Pins the component-scoped brand override capability: a brand file's
 * `components.<Name>.<slot>` block must produce the exact CSS custom
 * property name the component's own `<Name>.tokens.json` sidecar declares
 * (--fsds-<cssPrefix>-<dot-path-with-dashes>), scoped under
 * `[data-brand="<id>"] .<cssPrefix>`, and land inside `@layer brand` so it
 * wins over the component's own `@layer components` default per the layer
 * order declared in generateLayerDeclaration.
 */
import { describe, expect, it } from "vitest";
import {
  componentNameToKebab,
  componentTokenPathToCSSVar,
  generateBrandLayerCSS,
  processBrandTokens,
  walkComponentBrandSubtree,
  type BrandId,
  type BrandOverrides,
  type CollectionContext,
} from "./global.js";

function freshContext(): CollectionContext {
  return { definedVars: new Set(), referencedVars: new Set() };
}

describe("componentNameToKebab", () => {
  it("lowercases a single-word component name", () => {
    expect(componentNameToKebab("Avatar")).toBe("avatar");
  });

  it("hyphenates multi-word PascalCase names", () => {
    expect(componentNameToKebab("ShowMore")).toBe("show-more");
    expect(componentNameToKebab("NavList")).toBe("nav-list");
    expect(componentNameToKebab("ProfileFlag")).toBe("profile-flag");
  });

  it("handles a leading acronym without an extra leading hyphen", () => {
    expect(componentNameToKebab("OTPInput")).toBe("otp-input");
  });
});

describe("componentTokenPathToCSSVar", () => {
  it("matches the exact slug a component's own tokens.json sidecar uses (ir.ts tokenSlug: dot-to-dash, no case change)", () => {
    expect(
      componentTokenPathToCSSVar([
        "avatar",
        "color",
        "background",
      ]),
    ).toBe("--fsds-avatar-color-background");
  });

  it("preserves camelCase segments verbatim (tokenSlug never lowercases mid-path)", () => {
    expect(
      componentTokenPathToCSSVar([
        "avatar",
        "typography",
        "fontWeight",
        "medium",
      ]),
    ).toBe("--fsds-avatar-typography-fontWeight-medium");
  });
});

describe("detached component parts and the unbranded default", () => {
  it("keeps public design addresses at the brand boundary so nearer consumer scopes can inherit", () => {
    const css = generateBrandLayerCSS(new Map([["default", {
      metadata: { name: "default", description: "Fixture", accent: "red" },
      lightVars: {}, darkVars: {},
      componentVars: new Map([["code-block", {
        light: { "--fsds-code-block-design-root-background-fill": "#ffffff" },
        dark: { "--fsds-code-block-design-root-background-fill": "#111111" },
      }]]),
    }]]));
    expect(css).toContain(':where(:root) {\n    --fsds-code-block-design-root-background-fill: #ffffff;');
    expect(css).toContain('[data-brand="default"] {');
    expect(css).not.toContain('.code-block {');
    expect(css).toContain(':where(.light, [data-theme="light"])');
    expect(css).toContain(':where(.dark, [data-theme="dark"])');
    expect(css).toContain('--fsds-code-block-design-root-background-fill: #111111;');
  });

  it("retains local token defaults without redeclaring inherited design addresses in any theme", () => {
    const css = generateBrandLayerCSS(new Map([["default", {
      metadata: { name: "default", description: "Fixture", accent: "red" },
      lightVars: {}, darkVars: {},
      componentVars: new Map([["card", {
        light: {
          "--fsds-card-design-root-shape-radius": "12px",
          "--fsds-card-size-padding-inset": "10px",
        },
        dark: {
          "--fsds-card-design-root-shape-radius": "18px",
          "--fsds-card-size-padding-inset": "14px",
        },
      }]]),
    }]]));
    expect(css).toContain('[data-brand="default"] {\n    --fsds-card-design-root-shape-radius: 12px;');
    const localBlocks = [...css.matchAll(/[^{}]+\.card\s*\{([^}]+)\}/g)];
    expect(localBlocks).toHaveLength(8);
    for (const [, declarations] of localBlocks) {
      expect(declarations).not.toContain("--fsds-card-design-");
      expect(declarations).toMatch(/--fsds-card-size-padding-inset: (10|14)px;/);
    }
  });
});

describe("walkComponentBrandSubtree", () => {
  it("collects a nested override into the exact slot var, using $value when there is no fsds.light extension", () => {
    const light: Record<string, string> = {};
    const dark: Record<string, string> = {};
    walkComponentBrandSubtree(
      {
        color: {
          background: {
            default: { $type: "color", $value: "#00c853" },
          },
        },
      },
      ["button"],
      freshContext(),
      light,
      dark,
    );
    expect(light).toEqual({
      "--fsds-button-color-background-default": "#00c853",
    });
    expect(dark).toEqual({});
  });

  it("prefers fsds.light/fsds.dark extensions over the bare $value", () => {
    const light: Record<string, string> = {};
    const dark: Record<string, string> = {};
    walkComponentBrandSubtree(
      {
        color: {
          background: {
            default: {
              $type: "color",
              $value: "#000000",
              $extensions: {
                "fsds.light": "#00c853",
                "fsds.dark": "#00e676",
              },
            },
          },
        },
      },
      ["button"],
      freshContext(),
      light,
      dark,
    );
    expect(light["--fsds-button-color-background-default"]).toBe("#00c853");
    expect(dark["--fsds-button-color-background-default"]).toBe("#00e676");
  });

  it("resolves a {core.path} reference to a var() call, not a literal string", () => {
    const light: Record<string, string> = {};
    const dark: Record<string, string> = {};
    walkComponentBrandSubtree(
      {
        color: {
          background: {
            default: { $type: "color", $value: "{color.palette.green.500}" },
          },
        },
      },
      ["button"],
      freshContext(),
      light,
      dark,
    );
    expect(light["--fsds-button-color-background-default"]).toBe(
      "var(--fsds-core-color-palette-green-500)",
    );
  });

  it("skips $-prefixed metadata keys while recursing", () => {
    const light: Record<string, string> = {};
    const dark: Record<string, string> = {};
    walkComponentBrandSubtree(
      {
        $description: "not a token",
        color: { background: { default: { $type: "color", $value: "#fff" } } },
      },
      ["button"],
      freshContext(),
      light,
      dark,
    );
    expect(Object.keys(light)).toEqual([
      "--fsds-button-color-background-default",
    ]);
  });
});

describe("processBrandTokens reserved 'components' key", () => {
  it("does not walk a top-level 'components' key into the semantic layer", () => {
    const light: Record<string, string> = {};
    const dark: Record<string, string> = {};
    processBrandTokens(
      {
        $brand: { name: "test", description: "test" },
        components: {
          Button: {
            color: { background: { default: { $type: "color", $value: "#000" } } },
          },
        },
        color: {
          foreground: { accent: { $type: "color", $value: "#111111" } },
        },
      },
      [],
      freshContext(),
      light,
      dark,
    );
    // The real semantic override is present...
    expect(light["--fsds-semantic-color-foreground-accent"]).toBe("#111111");
    // ...but nothing derived from "components" leaked into the semantic set.
    for (const key of Object.keys(light)) {
      expect(key).not.toContain("semantic-components");
    }
  });

  it("does not skip a genuinely nested key literally named 'components' below the root", () => {
    // Guards the depth === 0 condition: only the ROOT "components" key is
    // reserved. A brand author who (oddly) nested a semantic group named
    // "components" one level down must not have it silently dropped.
    const light: Record<string, string> = {};
    const dark: Record<string, string> = {};
    processBrandTokens(
      {
        color: {
          components: {
            accent: { $type: "color", $value: "#222222" },
          },
        },
      },
      [],
      freshContext(),
      light,
      dark,
    );
    expect(light["--fsds-semantic-color-components-accent"]).toBe("#222222");
  });
});

describe("generateBrandLayerCSS component-scoped output", () => {
  function makeBrand(
    componentVars: Map<string, { light: Record<string, string>; dark: Record<string, string> }>,
  ): Map<BrandId, BrandOverrides> {
    const brands = new Map<BrandId, BrandOverrides>();
    brands.set("streaming" as BrandId, {
      metadata: { name: "streaming", description: "test", accent: "green" },
      lightVars: { "--fsds-semantic-color-foreground-accent": "#1ed760" },
      darkVars: {},
      componentVars,
    });
    return brands;
  }

  it("emits a [data-brand] .<component> block with the component's exact slot var", () => {
    const componentVars = new Map([
      [
        "button",
        {
          light: { "--fsds-button-color-background-default": "#1ed760" },
          dark: {},
        },
      ],
    ]);
    const css = generateBrandLayerCSS(makeBrand(componentVars));

    expect(css).toContain(
      '[data-brand="streaming"] .button {\n    --fsds-button-color-background-default: #1ed760;\n  }',
    );
    // The whole thing is still inside the @layer brand wrapper.
    expect(css.startsWith("@layer brand {")).toBe(true);
  });

  it("emits a dark-mode component block only when dark overrides are present", () => {
    const componentVars = new Map([
      [
        "button",
        {
          light: { "--fsds-button-color-background-default": "#1ed760" },
          dark: { "--fsds-button-color-background-default": "#17b34e" },
        },
      ],
    ]);
    const css = generateBrandLayerCSS(makeBrand(componentVars));

    expect(css).toContain(
      '.dark[data-brand="streaming"] .button, [data-theme="dark"][data-brand="streaming"] .button {',
    );
    expect(css).toContain("--fsds-button-color-background-default: #17b34e;");
  });

  it("does not emit an empty component block when a brand declares no component overrides", () => {
    const css = generateBrandLayerCSS(makeBrand(new Map()));
    expect(css).not.toContain(".button {");
  });

  it("emits an explicit .light[data-brand] block with higher specificity than the @media dark block, so an explicit light override beats an OS dark preference", () => {
    // Regression pin: without this block, the bare `[data-brand] .button`
    // default and the `@media (prefers-color-scheme: dark)` block both have
    // specificity (0,2,0) — a tie the cascade breaks by source order, so the
    // later @media block always won even when the page explicitly forced
    // light mode. Confirmed live in a real browser (OS dark + forced
    // .light): Avatar's component-scoped background resolved to the dark
    // value until this `.light[data-brand]` block (specificity (0,3,0),
    // matching formatBrandBlock's semantic-layer equivalent) was added.
    // jsdom does not implement cascade-layer/specificity resolution, so
    // this test pins the compensating rule's presence and exact selector
    // text — not the resolved cascade outcome, which only a real browser
    // can prove.
    const componentVars = new Map([
      [
        "button",
        {
          light: { "--fsds-button-color-background-default": "#1ed760" },
          dark: { "--fsds-button-color-background-default": "#17b34e" },
        },
      ],
    ]);
    const css = generateBrandLayerCSS(makeBrand(componentVars));

    expect(css).toContain(
      '.light[data-brand="streaming"] .button, [data-theme="light"][data-brand="streaming"] .button {\n    --fsds-button-color-background-default: #1ed760;\n  }',
    );
  });

  it("does not emit a .light component block when the brand has no dark override for that component (nothing for it to out-specificity)", () => {
    const componentVars = new Map([
      [
        "button",
        { light: { "--fsds-button-color-background-default": "#1ed760" }, dark: {} },
      ],
    ]);
    const css = generateBrandLayerCSS(makeBrand(componentVars));
    expect(css).not.toContain('.light[data-brand="streaming"] .button');
  });
});
