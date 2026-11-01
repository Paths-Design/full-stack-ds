import { describe, expect, it } from "vitest";
import { corpusIR } from "../corpus-fixtures.js";
import { parseBindingExpression } from "../../ir.js";
import { generateSvelteComponentSource } from "./component-source.js";

describe("Svelte numeric conditional attributes", () => {
  function source(attribute: string, expression: string, reference = false) {
    const ir = structuredClone(corpusIR("Table"));
    ir.name = "Viewport";
    const gate = ir.styledProps.find(prop => prop.name === "responsive")!;
    ir.styledProps.push({ ...gate, name: "enabled", safeName: "enabled" });
    ir.styledProps.push({ name: "level", safeName: "level", type: "number", typeRefs: [], required: false, propType: { kind: "number" } });
    if (reference) {
      ir.dom!.tag = "";
      ir.dom!.componentRef = "CodeLabel";
      ir.dom!.children[0].bindings.tabindex = parseBindingExpression("conditional:prop:enabled|literal:0|literal:-1");
    }
    ir.dom!.bindings[attribute] = parseBindingExpression(expression);
    return generateSvelteComponentSource(ir);
  }

  it("lowers integer branches as numbers for a renamed component and prop", () => {
    expect(source("tabindex", "conditional:prop:enabled|literal:0|literal:-1"))
      .toContain("tabindex={(enabled ? 0 : -1)}");
  });

  it("keeps numeric literals numeric beside a prop value", () => {
    expect(source("aria-level", "conditional:prop:enabled|literal:1|prop:level"))
      .toContain("aria-level={(enabled ? 1 : level)}");
  });

  it("preserves literal strings in nonnumeric attribute conditionals", () => {
    expect(source("data-level", "conditional:prop:enabled|literal:0|literal:-1"))
      .toContain('data-level={(enabled ? "0" : "-1")}');
  });

  it("preserves component-prop strings without leaking their context into native children", () => {
    const output = source("size", "conditional:prop:enabled|literal:01|literal:02", true);
    expect(output).toContain("<CodeLabel");
    expect(output).toContain('size={(enabled ? "01" : "02")}');
    expect(output).toContain("tabindex={(enabled ? 0 : -1)}");
  });
});
