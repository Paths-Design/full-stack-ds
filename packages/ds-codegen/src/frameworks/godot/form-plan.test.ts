import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { createGodotEmitter } from "./factory.js";
import { godotFormPlan } from "./form-plan.js";

const root = path.resolve(__dirname, "../../../../..");
function fixture(name: "Input" | "Label") {
  const base = path.join(root, `packages/ds-contracts/components/${name}/${name}`);
  const contract = JSON.parse(fs.readFileSync(`${base}.contract.json`, "utf8")) as ComponentContract & { styles?: unknown; tokens?: unknown };
  for (const suffix of ["styles", "tokens"] as const) {
    if (fs.existsSync(`${base}.${suffix}.json`)) contract[suffix] = JSON.parse(fs.readFileSync(`${base}.${suffix}.json`, "utf8"));
  }
  return buildComponentIR(contract);
}

describe("Godot native form lowering", () => {
  it("emits a renamed native LineEdit with source invalid color and explicit exclusions", () => {
    const ir = fixture("Input");
    ir.name = "SearchBox";
    const invalid = ir.nativeStyleRules!.rules.find(rule => rule.sourceKey === "--invalid")!;
    invalid.declarations.find(d => d.property === "border-color")!.value = "#ab1234";
    const plan = godotFormPlan(ir)!;
    expect(plan.colors.invalid).toBe("#ab1234");
    expect(plan.excluded).toContain("name");
    const files = createGodotEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot: root });
    expect(files.find(file => file.relativePath === "SearchBox/SearchBox.tscn")!.contents).toContain('type="LineEdit"');
    expect(files.find(file => file.relativePath === "SearchBox/SearchBox.gd")!.contents).toContain('runtime/text_input.gd');
    const receipt = JSON.parse(files.find(file => file.relativePath === "SearchBox/capabilities.json")!.contents);
    expect(receipt.colors.invalid).toBe("#ab1234");
    expect(receipt.form.changeHandlerProp).toBe("onChange");
  });

  it("emits an associated native Label with a target prop and refuses missing paint", () => {
    const ir = fixture("Label");
    ir.name = "FieldCaption";
    const plan = godotFormPlan(ir)!;
    expect(plan.form).toMatchObject({ kind: "associated-label", targetProp: "htmlFor" });
    const files = createGodotEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot: root });
    expect(files.find(file => file.relativePath === "FieldCaption/FieldCaption.tscn")!.contents).toContain('type="Label"');
    expect(files.find(file => file.relativePath === "FieldCaption/FieldCaption.gd")!.contents).toContain('runtime/associated_label.gd');
    ir.nativeStyleRules!.rules = ir.nativeStyleRules!.rules.map(rule => ({
      ...rule, declarations: rule.declarations.filter(d => d.property !== "color" && d.property !== "label.color.text"),
    }));
    expect(() => godotFormPlan(ir)).toThrow("no label foreground source");
  });
});
