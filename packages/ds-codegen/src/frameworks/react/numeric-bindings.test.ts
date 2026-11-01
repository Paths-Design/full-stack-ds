import { describe, expect, it } from "vitest";
import { corpusIR } from "../corpus-fixtures.js";
import { parseBindingExpression } from "../../ir.js";
import { generateReactComponentSource } from "./component-source.js";

describe("React numeric conditional attributes", () => {
  function source(attribute: string, expression: string) {
    const ir = structuredClone(corpusIR("Table"));
    ir.name = "Viewport";
    const gate = ir.styledProps.find(prop => prop.name === "responsive")!;
    ir.styledProps.push({ ...gate, name: "enabled", safeName: "enabled" });
    ir.styledProps.push({ name: "level", safeName: "level", type: "number", typeRefs: [], required: false, propType: { kind: "number" } });
    ir.dom!.bindings[attribute] = parseBindingExpression(expression);
    return generateReactComponentSource(ir, "../../primitives");
  }

  it("lowers integer branches as numbers for a renamed component and prop", () => {
    expect(source("tabindex", "conditional:prop:enabled|literal:0|literal:-1"))
      .toContain("tabIndex={(enabled ? 0 : -1)}");
  });

  it("keeps numeric literal branches numeric beside a prop value", () => {
    expect(source("aria-level", "conditional:prop:enabled|literal:1|prop:level"))
      .toContain("aria-level={(enabled ? 1 : level)}");
  });

  it("preserves literal strings in nonnumeric attribute conditionals", () => {
    expect(source("data-level", "conditional:prop:enabled|literal:0|literal:-1"))
      .toContain('data-level={(enabled ? "0" : "-1")}');
  });
});
