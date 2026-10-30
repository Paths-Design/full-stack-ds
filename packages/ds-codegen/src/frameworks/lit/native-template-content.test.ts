import { describe, expect, it } from "vitest";
import { corpusIR } from "../corpus-fixtures.js";
import { generateLitComponentSource } from "./component-source.js";

describe("Lit native insertion contexts", () => {
  for (const parent of ["table", "thead", "tbody", "tfoot", "tr"]) {
    it(`inserts template children directly under ${parent}`, () => {
      const ir = structuredClone(corpusIR("Table"));
      ir.dom!.children[0].tag = parent;
      const source = generateLitComponentSource(ir);
      expect(source).toContain("@property({ attribute: false }) renderContent?: (slotName?: string) => unknown;");
      expect(source).toContain("${this.renderContent?.()}");
      expect(source).not.toContain("<slot>");
    });
  }

  for (const parent of ["td", "th", "caption"]) {
    it(`preserves a flow-content slot under ${parent}`, () => {
      const ir = structuredClone(corpusIR("Table"));
      ir.dom!.children[0].tag = parent;
      const source = generateLitComponentSource(ir);
      expect(source).toContain("<slot></slot>");
      expect(source).not.toContain("renderContent");
    });
  }

  it("passes a named native insertion to the consumer callback", () => {
    const ir = structuredClone(corpusIR("Table"));
    ir.dom!.children[0].children[0].slotName = "rows";
    expect(generateLitComponentSource(ir)).toContain('${this.renderContent?.("rows")}');
  });

  it("derives helper identifiers and classes from a renamed contract IR", () => {
    const ir = structuredClone(corpusIR("Table"));
    ir.name = "OrdersGrid";
    ir.classRecipe.base = "orders-grid";
    const source = generateLitComponentSource(ir);
    expect(source).toContain("export function ordersGridRow(content: unknown");
    expect(source).toContain('class=${["orders-grid__row", attrs.class]');
    expect(source).not.toContain("export function tableRow");
  });
});
