import { describe, expect, it } from "vitest";
import { corpusIR } from "../corpus-fixtures.js";
import { generateLitComponentSource } from "./component-source.js";
import { templateExpressionCode } from "./template-expressions.js";

describe("templateExpressionCode", () => {
  it("keeps hole code and drops markup, quoted strings and nested template text", () => {
    const body = '<tr role="row" data-x=${row}>${items.map((item) => html`<td role="row">${item.label + "row"}</td>`)}</tr>';
    const code = templateExpressionCode(body);
    expect(code).toMatch(/\brow\b/);
    expect(code).toContain("items.map((item) => ");
    expect(code).toContain("item.label + ");
    // Markup and the string literal "row" contribute nothing.
    expect(code.match(/\brow\b/g)).toHaveLength(1);
  });

  it("finds no reference when a word appears only in markup", () => {
    expect(templateExpressionCode('<tr role="row">${week.key}</tr>')).not.toMatch(/\brow\b/);
  });

  it("balances object-literal braces inside a hole", () => {
    expect(templateExpressionCode("${styleMap({ width: px })} ${row}")).toMatch(/\brow\b/);
  });
});

describe("CODEGEN-EMIT-LINT-HYGIENE-01: Lit iteration parameters", () => {
  it("drops an index parameter whose name appears only in markup (Calendar's week row)", () => {
    const src = generateLitComponentSource(corpusIR("Calendar"));
    expect(src).toContain("(this.dateGrid.state.weeks ?? []).map((week) => html`");
    expect(src).toContain('<tr role="row">');
  });
});
