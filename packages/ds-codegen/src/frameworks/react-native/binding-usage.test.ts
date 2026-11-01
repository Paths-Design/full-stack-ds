import { describe, expect, it } from "vitest";
import { corpusIR } from "../corpus-fixtures.js";
import { parseBindingExpression } from "../../ir.js";
import { generateReactNativeComponentSource } from "./component-source.js";

describe("React Native DOM-metadata usage", () => {
  function source(nativeGuard: boolean) {
    const ir = structuredClone(corpusIR("Table"));
    ir.name = "Viewport";
    const gate = ir.styledProps.find(prop => prop.name === "responsive")!;
    ir.styledProps.push({ ...gate, name: "viewportEnabled", safeName: "viewportEnabled" });
    ir.dom!.bindings.tabindex = parseBindingExpression("conditional:prop:viewportEnabled|literal:0|literal:-1");
    if (nativeGuard) ir.dom!.children[0].ifProp = "viewportEnabled";
    const output = generateReactNativeComponentSource(ir).componentFile;
    expect(output).toContain("viewportEnabled?: boolean;");
    expect(output).toContain("export function Viewport(");
    return output.slice(output.indexOf("export function Viewport("));
  }

  it("does not read a prop used only by an omitted DOM tab-order binding", () => {
    const body = source(false);
    expect(body).not.toContain("viewportEnabled");
    expect(body).toContain("contentLabel: contentLabelProp");
    expect(body).toContain("accessibilityLabel={accessibilityLabel ?? contentLabel}");
  });

  it("retains the same prop when native conditional rendering consumes it", () => {
    const body = source(true);
    expect(body).toContain("viewportEnabled = true");
    expect(body).toContain("{viewportEnabled ? (");
  });
});
