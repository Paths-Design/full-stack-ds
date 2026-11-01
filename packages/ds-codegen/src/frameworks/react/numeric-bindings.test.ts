import { describe, expect, it } from "vitest";
import ts from "typescript";
import { corpusIR } from "../corpus-fixtures.js";
import { parseBindingExpression } from "../../ir.js";
import { generateReactComponentSource } from "./component-source.js";

describe("React numeric conditional attributes", () => {
  function source(attribute: string, expression: string, kind: "binding" | "attribute" = "binding", reference = false) {
    const ir = structuredClone(corpusIR("Table"));
    ir.name = "Viewport";
    const gate = ir.styledProps.find(prop => prop.name === "responsive")!;
    ir.styledProps.push({ ...gate, name: "enabled", safeName: "enabled" });
    ir.styledProps.push({ name: "level", safeName: "level", type: "number", typeRefs: [], required: false, propType: { kind: "number" } });
    if (reference) {
      // Bare references remain valid IR without an allContracts registry.
      ir.dom!.tag = "";
      ir.dom!.componentRef = "CodeLabel";
      ir.dom!.children[0].bindings.tabindex = parseBindingExpression("conditional:prop:enabled|literal:0|literal:-1");
    }
    if (kind === "attribute") {
      delete ir.dom!.bindings[attribute];
      ir.dom!.attrs[attribute] = expression;
    } else {
      ir.dom!.bindings[attribute] = parseBindingExpression(expression);
    }
    return generateReactComponentSource(ir, "../../primitives");
  }

  function expectValidSyntax(output: string) {
    const result = ts.transpileModule(output, {
      fileName: "Viewport.tsx", reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX },
    });
    expect(result.diagnostics?.filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error).map(diagnostic => diagnostic.code)).toEqual([]);
  }

  it("lowers integer branches as numbers for a renamed component and prop", () => {
    expect(source("tabindex", "conditional:prop:enabled|literal:0|literal:-1"))
      .toContain("tabIndex={(enabled ? 0 : -1)}");
  });

  it("keeps numeric literal branches numeric beside a prop value", () => {
    expect(source("aria-level", "conditional:prop:enabled|literal:1|prop:level"))
      .toContain("aria-level={(enabled ? 1 : level)}");
  });

  it("normalizes padded conditional integers to valid decimal syntax", () => {
    const output = source("tabindex", "conditional:prop:enabled|literal:01|literal:-01");
    expectValidSyntax(output);
    expect(output).toContain("tabIndex={(enabled ? 1 : -1)}");
  });

  it("normalizes padded direct numeric bindings", () => {
    const output = source("tabindex", "literal:-01");
    expectValidSyntax(output);
    expect(output).toContain("tabIndex={-1}");
  });

  it("normalizes padded static numeric attributes", () => {
    const output = source("tabindex", "01", "attribute");
    expectValidSyntax(output);
    expect(output).toContain("tabIndex={1}");
  });

  it.each([
    ["attribute", "01", 'size="01"'],
    ["binding", "literal:01", 'size={"01"}'],
    ["binding", "conditional:prop:enabled|literal:01|literal:02", 'size={(enabled ? "01" : "02")}'],
  ] as const)("preserves component-prop strings for %s %s", (kind, expression, expected) => {
    const output = source("size", expression, kind, true);
    expect(output).toContain("<CodeLabel");
    expect(output).toContain(expected);
    expect(output).toContain("tabIndex={(enabled ? 0 : -1)}");
    expectValidSyntax(output);
  });

  it("preserves literal strings in nonnumeric attribute conditionals", () => {
    expect(source("data-level", "conditional:prop:enabled|literal:0|literal:-1"))
      .toContain('data-level={(enabled ? "0" : "-1")}');
  });
});
