import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../contract.js";
import { buildComponentIR } from "../ir.js";
import { nativeFormPlan } from "./native-form-plan.js";

const root = path.resolve(__dirname, "../../../..");

function fixture(name: string) {
  const base = path.join(root, `packages/ds-contracts/components/${name}/${name}`);
  const contract = JSON.parse(fs.readFileSync(`${base}.contract.json`, "utf8")) as ComponentContract & { styles?: unknown; tokens?: unknown };
  for (const suffix of ["styles", "tokens"] as const) {
    if (fs.existsSync(`${base}.${suffix}.json`)) contract[suffix] = JSON.parse(fs.readFileSync(`${base}.${suffix}.json`, "utf8"));
  }
  return buildComponentIR(contract);
}

describe("native form plan", () => {
  it("derives text ownership and attribute bindings from a renamed input", () => {
    const ir = fixture("Input");
    ir.name = "SearchBox";
    expect(nativeFormPlan(ir)).toEqual({
      kind: "text-input", part: "root", channel: "value", valueProp: "value",
      defaultValueProp: "defaultValue", changeHandlerProp: "onChange",
      placeholderProp: "placeholder", disabledProp: "disabled", invalidProp: "invalid",
      requiredProp: "required", typeProp: "type", nameProp: "name",
      ariaLabelProp: "ariaLabel", ariaLabelledbyProp: "ariaLabelledby",
    });
    ir.dom!.bindings.placeholder = { kind: "prop", prop: "ariaLabel" };
    expect(nativeFormPlan(ir)).toMatchObject({ placeholderProp: "ariaLabel" });
  });

  it("derives label association from a renamed label and refuses a changed host", () => {
    const ir = fixture("Label");
    ir.name = "CaptionControl";
    expect(nativeFormPlan(ir)).toEqual({ kind: "associated-label", part: "root", targetProp: "htmlFor", formProp: "form" });
    ir.dom!.children = [];
    expect(() => nativeFormPlan(ir)).toThrow("associated label needs one consumer content insertion");
  });

  it("refuses altered text commit and value source instead of silently dropping them", () => {
    const commit = fixture("Input");
    commit.formControl!.commit = "change";
    expect(() => nativeFormPlan(commit)).toThrow("text input needs an input commit");
    const source = fixture("Input");
    source.dom!.bindings.value = { kind: "prop", prop: "value" };
    expect(() => nativeFormPlan(source)).toThrow("must bind its value to channel");
    const binding = fixture("Input");
    binding.dom!.bindings.disabled = { kind: "literal", value: "true" };
    expect(() => nativeFormPlan(binding)).toThrow("disabled must bind directly");
    const multiline = fixture("Input");
    multiline.dom!.tag = "textarea";
    expect(() => nativeFormPlan(multiline)).toThrow("multiline text needs a native multiline host");
  });

  it("leaves unrelated components on their existing lowering paths", () => {
    expect(nativeFormPlan(fixture("Button"))).toBeUndefined();
  });
});
