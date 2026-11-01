import { describe, expect, it } from "vitest";
import { parseTokenCss, resolveTokenScalar, type TokenLookup } from "./token-sources.js";

const light = '.light,[data-theme="light"]';
const dark = '.dark,[data-theme="dark"]';
const branded = (mode: string) => `.${mode}[data-brand="probe"],.${mode} [data-brand="probe"],[data-theme="${mode}"][data-brand="probe"],[data-theme="${mode}"] [data-brand="probe"]`;

describe("Unity token source CSS", () => {
  it("retains base alias edges, explicit themes and default-brand declarations", () => {
    const parsed = parseTokenCss(`
      @layer core, semantic, components, theme, brand, density;
      @layer core { :root { --fsds-a: var(--fsds-b); --fsds-b: 1px; } }
      @layer semantic { :root { --fsds-result: var(--fsds-a); } }
      @layer theme {
        ${light} { --fsds-b: 2px; }
        ${dark} { --fsds-b: 3px; }
        @media (prefers-color-scheme: dark) { :root { --fsds-b: 3px; } ${light} { --fsds-b: 2px; } }
      }
      @layer brand {
        :where(:root) { --fsds-default: 4px; }
        :where(${dark}) { --fsds-default: 5px; }
        [data-brand="probe"] { --fsds-b: 6px; }
        ${branded("light")} { --fsds-b: 6px; }
        ${branded("dark")} { --fsds-default: 7px; }
        @media (prefers-color-scheme: dark) {
          [data-brand="probe"] { --fsds-default: 7px; }
          :where(:root) { --fsds-default: 5px; }
          :where(${light}) { --fsds-default: 4px; }
        }
      }
    `);
    expect([...parsed.base.light]).toEqual([["--fsds-a", "var(--fsds-b)"], ["--fsds-b", "2px"], ["--fsds-result", "var(--fsds-a)"]]);
    expect(parsed.base.dark.get("--fsds-b")).toBe("3px");
    expect([...parsed.defaults.light]).toEqual([["--fsds-default", "4px"]]);
    expect([...parsed.defaults.dark]).toEqual([["--fsds-default", "5px"]]);
    expect(parsed.brands.map(brand => brand.id)).toEqual(["probe"]);
    expect([...parsed.brands[0]!.light]).toEqual([["--fsds-b", "6px"]]);
    expect([...parsed.brands[0]!.dark]).toEqual([["--fsds-default", "7px"]]);
  });

  it("keeps quoted delimiters and comments inside values intact", () => {
    const parsed = parseTokenCss('@layer core { /* syntax */ :root { --fsds-family: "A; {} /* literal */"; --fsds-color: rgba(1, 2, 3, .5); } }');
    expect(parsed.base.light.get("--fsds-family")).toBe('"A; {} /* literal */"');
    expect(parsed.base.light.get("--fsds-color")).toBe("rgba(1, 2, 3, .5)");
  });

  it("checks component-local repetitions against their root source", () => {
    const css = `@layer brand {
      [data-brand="probe"] { --fsds-component-token: 2px; }
      [data-brand="probe"] .component { --fsds-component-token: 2px; }
      .light[data-brand="probe"] .component,[data-theme="light"][data-brand="probe"] .component { --fsds-component-token: 2px; }
    }`;
    expect(parseTokenCss(css).brands[0]!.light.get("--fsds-component-token")).toBe("2px");
    expect(() => parseTokenCss(css.replace('.component { --fsds-component-token: 2px;', '.component { --fsds-component-token: 3px;'))).toThrow(/divergent duplicate/);
  });

  it.each([
    '@layer core { :root { --fsds-x: var(--x; } }',
    '@layer core { :root { --fsds-x: "unterminated; } }',
    '@layer core { :root { --fsds-x: 1px; ',
    '@layer core { :root { --fsds-x: 1px !important; } }',
    '@layer core { body { --fsds-x: 1px; } }',
    '@layer other { :root { --fsds-x: 1px; } }',
    '@layer theme { .dark { --fsds-x: 1px; } }',
    '@layer core { :root { --fsds-x: 1px; --fsds-x: 2px; } }',
    '@layer brand { #unexpected { --fsds-x: 1px; } }',
    '@layer brand { @supports (color: red) { :root { --fsds-x: 1px; } } }',
    `@layer brand { [data-brand="probe"] { --fsds-x: 1px; } ${branded("light")} { --fsds-x: 2px; } }`,
    `@layer theme { ${dark} { --fsds-x: 1px; } @media (prefers-color-scheme: dark) { :root { --fsds-x: 2px; } } }`,
    '@layer brand { :where(:root) { --fsds-x: 1px; } } @layer core { :root { --fsds-x: 2px; } }',
  ])("refuses source grammar or precedence it cannot preserve: %s", css => {
    expect(() => parseTokenCss(css)).toThrow(/UNITY_USS_TOKEN_CSS_UNSUPPORTED/);
  });
});

describe("Unity token scalar resolution", () => {
  const values = new Map([
    ["--fsds-literal", "2px"], ["--fsds-alias", "var(--fsds-literal)"],
    ["--fsds-cycle-a", "var(--fsds-cycle-b)"], ["--fsds-cycle-b", "var(--fsds-cycle-a)"],
    ["--fsds-shadow", "0 2px 4px #000"],
  ]);
  const lookup: TokenLookup = name => name === "--fsds-structured" ? { kind: "unsupported" }
    : values.has(name) ? { kind: "value", value: values.get(name)! } : { kind: "missing" };
  const scalar = (value: string): string | undefined => /^\d+px$/.test(value) ? value : undefined;

  it.each(["2px", "var(--fsds-alias)", "var(--absent, 2px)", "var(--absent, var(--also-absent, 2px))"])('resolves supported literals and truly missing fallbacks: %s', value => {
    expect(resolveTokenScalar(value, lookup, scalar)).toEqual({ kind: "scalar", value: "2px" });
  });

  it("retains missing status when no fallback exists", () => {
    expect(resolveTokenScalar("var(--absent)", lookup, scalar)).toEqual({ kind: "missing" });
  });

  it.each(["var(--fsds-shadow, 2px)", "var(--fsds-structured, 2px)", "var(--fsds-cycle-a, 2px)", "var(--fsds-literal))", "var(--fsds-literal", "var()", "var(--absent, var(", "var(--fsds-literal) 2px"])("refuses unsupported or malformed values without false fallback: %s", value => {
    expect(resolveTokenScalar(value, lookup, scalar)).toEqual({ kind: "unsupported" });
  });
});
