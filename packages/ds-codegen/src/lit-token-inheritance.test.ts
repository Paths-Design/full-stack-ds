import { describe, expect, it } from "vitest";
import postcss, { type AnyNode } from "postcss";
import type { ComponentContract } from "./contract.js";
import { buildComponentIR } from "./ir.js";
import { emitCss, emitLitInlineCss, emitTokensCss } from "./css.js";
import { analyzeCssTokenConsumption } from "./css-token-consumption.js";
import { withLitTokenFallbacks } from "./lit-token-fallbacks.js";
import { allCorpusComponentNames, corpusIR } from "./frameworks/corpus-fixtures.js";

function fixture(prefix = "fixture") {
  const contract: ComponentContract = {
    name: "ShadowDefaultsFixture", cssPrefix: prefix, layer: "primitive",
    anatomy: { parts: ["root"], dom: { tag: "div", part: "root", children: [{ tag: "children" }] } },
    tokens: {
      [`${prefix}.padding`]: { resolvesTo: "core.spacing.size.04", fallback: "8px", layer: "core" },
      [`${prefix}.alias`]: { resolvesTo: `${prefix}.padding`, fallback: "9px", layer: "semantic" },
    },
    variants: { density: ["default", "compact"] },
    styles: {
      root: { padding: { resolvesTo: `${prefix}.alias`, fallback: "1px", platforms: ["web"] } },
      "--compact": { [`${prefix}.padding`]: { literal: "7px", platforms: ["web"] } },
    },
  };
  return buildComponentIR(contract);
}

function declarations(css: string) {
  const values: Array<{ selector: string; property: string; value: string }> = [];
  postcss.parse(css).walkDecls(declaration => {
    values.push({ selector: declaration.parent?.type === "rule" ? declaration.parent.selector : "",
      property: declaration.prop, value: declaration.value });
  });
  return values;
}

describe("Lit inherited component token defaults", () => {
  it("keeps base defaults private so inherited public slots reach the physical box", () => {
    const css = emitLitInlineCss(fixture());
    const values = declarations(css);
    expect(values).toContainEqual({ selector: ".fixture", property: "--_fsds-fixture-padding", value: "var(--fsds-core-spacing-size-04, 8px)" });
    expect(values).not.toContainEqual(expect.objectContaining({ selector: ".fixture", property: "--fsds-fixture-padding" }));
    expect(values).toContainEqual({ selector: ".fixture", property: "padding", value: "var(--fsds-fixture-alias, var(--_fsds-fixture-alias, 1px))" });
  });

  it("preserves inter-slot aliases and their property-level fallback branches", () => {
    const css = emitLitInlineCss(fixture());
    expect(declarations(css)).toContainEqual({ selector: ".fixture", property: "--_fsds-fixture-alias", value: "var(--fsds-fixture-padding, var(--_fsds-fixture-padding, 9px))" });
    expect(analyzeCssTokenConsumption([css]).cycles).toEqual([]);
  });

  it("keeps deliberate local modifier declarations public", () => {
    const values = declarations(emitLitInlineCss(fixture()));
    expect(values).toContainEqual({ selector: ".fixture--compact", property: "--fsds-fixture-padding", value: "7px" });
    expect(values).not.toContainEqual(expect.objectContaining({ selector: ".fixture--compact", property: "--_fsds-fixture-padding" }));
  });

  it("derives private carriers from the declared namespace without changing light-DOM artifacts", () => {
    const ir = fixture("renamed");
    const lightCss = emitCss(ir), lightTokens = emitTokensCss(ir);
    expect(lightTokens).toContain("--fsds-renamed-padding: var(--fsds-core-spacing-size-04, 8px)");
    expect(lightTokens).not.toContain("--_fsds-");
    expect(lightCss).toContain("padding: var(--fsds-renamed-alias, 1px)");
    expect(lightCss).not.toContain("--_fsds-");
    expect(emitLitInlineCss(ir)).toContain("--_fsds-renamed-padding");
    expect(emitLitInlineCss(ir)).not.toContain("--_fsds-fixture-");
  });

  it("includes valid Web-only style slots omitted from the native token scope projection", () => {
    const ir = buildComponentIR({ name: "WebSlot", cssPrefix: "web-slot", layer: "primitive",
      anatomy: { parts: ["root"] },
      styles: { root: {
        "webSlot.padding": { literal: "8px", platforms: ["web"] },
        padding: { resolvesTo: "webSlot.padding", fallback: "1px", platforms: ["web"] },
      } },
    });
    expect(ir.tokenScopes.flatMap(scope => scope.values).some(value => value.name === "webSlot.padding")).toBe(false);
    const values = declarations(emitLitInlineCss(ir));
    expect(values).toContainEqual({ selector: ".web-slot", property: "--_fsds-web-slot-padding", value: "8px" });
    expect(values).toContainEqual({ selector: ".web-slot", property: "padding", value: "var(--fsds-web-slot-padding, var(--_fsds-web-slot-padding, 1px))" });
  });

  it("keeps entry states out of the resting rules", () => {
    const ir = fixture();
    ir.cssBlocks.push({ selector: ".fixture", declarations: { opacity: "1" } },
      { selector: ".fixture", declarations: { opacity: "0" }, startingStyle: true });
    const css = emitLitInlineCss(ir);
    const rules = postcss.parse(css);
    const resting: string[] = [], entry: string[] = [];
    rules.walkDecls("opacity", declaration => {
      let parent: AnyNode | undefined = declaration.parent;
      while (parent && !(parent.type === "atrule" && parent.name === "starting-style")) parent = parent.parent;
      (parent ? entry : resting).push(declaration.value);
    });
    expect(resting).toEqual(["1"]);
    expect(entry).toEqual(["0"]);
  });

  it("supplies defaults to keyframe and entry-state reads without changing their public address", () => {
    const ir = fixture();
    ir.keyframes.push({ name: "fixture-entry", frames: [{ selector: "to", declarations: { padding: "var(--fsds-fixture-alias)" } }] });
    ir.cssBlocks.push({ selector: ".fixture", declarations: { padding: "var(--fsds-fixture-alias, 0px)" }, startingStyle: true });
    const values = declarations(emitLitInlineCss(ir));
    expect(values).toContainEqual({ selector: "to", property: "padding", value: "var(--fsds-fixture-alias, var(--_fsds-fixture-alias))" });
    expect(values).toContainEqual({ selector: ".fixture", property: "padding", value: "var(--fsds-fixture-alias, var(--_fsds-fixture-alias, 0px))" });
  });

  it("defines every private fallback reached throughout the generated corpus without adding cycles", () => {
    for (const name of allCorpusComponentNames()) {
      const analysis = analyzeCssTokenConsumption([emitLitInlineCss(corpusIR(name))]);
      expect(analysis.cycles, name + ": variable cycles").toEqual([]);
      const missing = [...analysis.consumed].filter(variable => variable.startsWith("--_fsds-") && !analysis.declarations.has(variable));
      expect(missing, name + ": missing private fallbacks").toEqual([]);
    }
  });

  for (const keyword of ["initial", "inherit", "unset", "revert", "revert-layer", "revert-rule", "/* reset */ INHERIT", String.raw`\69 nherit`]) {
    it(`keeps the property identity of the explicit ${keyword} cascade operation`, () => {
      const ir = fixture();
      ir.cssBlocks.find(block => block.selector === ".fixture")!.declarations["--fsds-fixture-padding"] = keyword;
      const css = emitLitInlineCss(ir);
      expect(css).toContain(`--fsds-fixture-padding: ${keyword};`);
      expect(declarations(css)).toContainEqual({ selector: ".fixture", property: "--fsds-fixture-padding", value: keyword.replace(/\/\*[\s\S]*?\*\//g, " ").trim() });
      expect(css).not.toContain("--_fsds-fixture-padding");
    });
  }
});

describe("Lit fallback reference syntax", () => {
  const defaults = new Map([["--a", "--private-a"], ["--b", "--private-b"]]);
  for (const [input, expected] of [
    ["var(--a)", "var(--a, var(--private-a))"],
    ["var(--a,)", "var(--a, var(--private-a,))"],
    ["calc(var(--a, var(--b, 1px)) + var(--global, 2px))", "calc(var(--a, var(--private-a, var(--b, var(--private-b, 1px)))) + var(--global, 2px))"],
    ['"var(--a)" /* var(--a) */ foovar(--a)', '"var(--a)" /* var(--a) */ foovar(--a)'],
    ["var(/* ) */ --a, var(--b))", "var(/* ) */ --a, var(--private-a, var(--b, var(--private-b))))"],
    [String.raw`v\61 r(--\61, 2px)`, String.raw`v\61 r(--\61, var(--private-a, 2px))`],
    ["λvar(--a) my-var(--a)", "λvar(--a) my-var(--a)"],
    ["var(--a", "var(--a"],
  ]) it(`preserves CSS syntax in ${input}`, () => {
    expect(withLitTokenFallbacks(input, defaults)).toBe(expected);
  });
});
