import { describe, expect, it } from "vitest";
import { processBrandTokens, walkComponentBrandSubtree, type CollectionContext } from "./global.js";
import { resolvesAgainstGraph } from "../runners/check-brand-refs.js";

const paths = new Set([
  "typography.font.family.exact",
  "core.typography.font.family.exact",
  "semantic.typography.font.family.exact",
  "core.typography.font.family.inter",
  "semantic.typography.font.family.inter",
  "semantic.typography.font.family.editorial",
  "core.spacing.unit",
]);
const cases = [
  ["typography.font.family.exact", "typography.font.family.exact"],
  ["typography.font.family.inter", "core.typography.font.family.inter"],
  ["core.typography.font.family.inter", "core.typography.font.family.inter"],
  ["semantic.typography.font.family.inter", "semantic.typography.font.family.inter"],
  ["typography.font.family.editorial", "semantic.typography.font.family.editorial"],
] as const;

for (const [name, walk, output] of [
  ["semantic", processBrandTokens, "--fsds-semantic-probe"],
  ["component", walkComponentBrandSubtree, "--fsds-probe"],
] as const) {
  describe(`${name} brand reference emission`, () => {
    it.each(cases)("emits accepted %s against its canonical declared path", (reference, canonical) => {
      const context: CollectionContext & { referencePaths: ReadonlySet<string> } = {
        definedVars: new Set(), referencedVars: new Set(), referencePaths: paths,
      };
      const light: Record<string, string> = {};
      const dark: Record<string, string> = {};
      expect(resolvesAgainstGraph(reference, paths)).toBe(true);
      walk({ probe: { $type: "fontFamily", $value: `{${reference}}`, $extensions: { "fsds.dark": `{${reference}}` } } }, [], context, light, dark);
      const variable = "--fsds-" + canonical.replaceAll(".", "-");
      expect(light).toEqual({ [output]: `var(${variable})` });
      expect(dark).toEqual({ [output]: `var(${variable})` });
      expect([...context.referencedVars]).toEqual([variable]);
    });

    it("keeps an unknown reference invalid instead of inventing a graph match", () => {
      const context: CollectionContext & { referencePaths: ReadonlySet<string> } = {
        definedVars: new Set(), referencedVars: new Set(), referencePaths: paths,
      };
      const light: Record<string, string> = {};
      const dark: Record<string, string> = {};
      expect(resolvesAgainstGraph("typography.font.family.missing", paths)).toBe(false);
      walk({ probe: { $type: "fontFamily", $value: "{typography.font.family.missing}" } }, [], context, light, dark);
      // The existing separate brand-reference gate owns rejection; formatting
      // an unknown path must not fabricate a valid core/semantic reference.
      expect(light[output]).toBe("var(--fsds-typography-font-family-missing)");
      expect([...context.referencedVars]).toEqual(["--fsds-typography-font-family-missing"]);
    });

    it("preserves canonical references through nested light and dark compositions", () => {
      const context: CollectionContext = { definedVars: new Set(), referencedVars: new Set(), referencePaths: paths };
      const light: Record<string, string> = {};
      const dark: Record<string, string> = {};
      const padding = { paddingTop: "{spacing.unit}", paddingRight: "{spacing.unit}", paddingBottom: "{spacing.unit}", paddingLeft: "{spacing.unit}" };
      walk({ probe: { $type: "composition", $value: padding, $extensions: { "fsds.dark": padding } } }, [], context, light, dark);
      expect(light[output]).toBe("var(--fsds-core-spacing-unit)");
      expect(dark).toEqual(light);
      expect([...context.referencedVars]).toEqual(["--fsds-core-spacing-unit"]);
    });

    it("normalizes references embedded in a font fallback string", () => {
      const context: CollectionContext = { definedVars: new Set(), referencedVars: new Set(), referencePaths: paths };
      const light: Record<string, string> = {};
      const dark: Record<string, string> = {};
      walk({ probe: { $type: "fontFamily", $value: "{typography.font.family.inter}, serif" } }, [], context, light, dark);
      expect(light[output]).toBe("var(--fsds-core-typography-font-family-inter), serif");
      expect([...context.referencedVars]).toEqual(["--fsds-core-typography-font-family-inter"]);
    });
  });
}
