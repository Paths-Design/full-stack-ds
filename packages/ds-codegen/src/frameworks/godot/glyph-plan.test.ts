import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { godotGlyphPlan } from "./glyph-plan.js";
import { createGodotEmitter, godotPlan } from "./factory.js";

const root = path.resolve(__dirname, "../../../../..");
function iconIr() {
  const base = path.join(root, "packages/ds-contracts/components/Icon/Icon");
  const contract = JSON.parse(fs.readFileSync(`${base}.contract.json`, "utf8")) as ComponentContract & { tokens?: unknown; styles?: unknown };
  contract.tokens = JSON.parse(fs.readFileSync(`${base}.tokens.json`, "utf8"));
  contract.styles = JSON.parse(fs.readFileSync(`${base}.styles.json`, "utf8"));
  const ir = buildComponentIR(contract);
  ir.name = "UnrelatedGlyph";
  return ir;
}

describe("Godot glyph plan", () => {
  it("binds authored name, size, accessible name and exact token style values independent of component name", () => {
    const ir = iconIr();
    expect(godotGlyphPlan(ir)).toEqual({
      operation: "glyph", nameProp: "name", sizeProp: "size", decorativeProp: "decorative", labelProp: "ariaLabel",
      svgFill: "none",
      sizeHints: { sm: 16, md: 20, lg: 24, xl: 32 },
      sizeStyles: { sm: { width: "16px", height: "16px" }, md: { width: "20px", height: "20px" },
        lg: { width: "24px", height: "24px" }, xl: { width: "32px", height: "32px" } },
      excluded: [],
    });
    const glyph = ir.dom!.children[0]!.iconGlyph!;
    glyph.namePropName = "symbol";
    glyph.nameFrom = { kind: "prop", prop: "symbol" };
    ir.styledProps.find(prop => prop.name === "name")!.name = "symbol";
    glyph.sizePropName = "scale";
    glyph.sizeFrom = { kind: "prop", prop: "scale" };
    ir.styledProps.find(prop => prop.name === "size")!.name = "scale";
    for (const rule of ir.nativeStyleRules!.rules) for (const predicate of rule.predicates) if (predicate.kind === "variant" && predicate.axis === "size") predicate.axis = "scale";
    const role = ir.dom!.bindings.role;
    const hidden = ir.dom!.bindings["aria-hidden"];
    if (role?.kind !== "conditional" || role.condition.kind !== "prop" || hidden?.kind !== "conditional" || hidden.condition.kind !== "prop") throw new Error("Invalid glyph fixture");
    role.condition.prop = "hidden";
    hidden.condition.prop = "hidden";
    ir.styledProps.find(prop => prop.name === "decorative")!.name = "hidden";
    ir.dom!.bindings["aria-label"] = { kind: "prop", prop: "spokenName" };
    ir.styledProps.find(prop => prop.name === "ariaLabel")!.name = "spokenName";
    expect(godotGlyphPlan(ir)).toMatchObject({ nameProp: "symbol", sizeProp: "scale", decorativeProp: "hidden", labelProp: "spokenName" });
  });

  it("rejects unbound props, divergent accessibility bindings and malformed glyph source", () => {
    const extra = iconIr();
    extra.styledProps.push({ ...extra.styledProps[0]!, name: "unused" });
    expect(() => godotGlyphPlan(extra)).toThrow("GODOT_UNSUPPORTED_GLYPH: UnrelatedGlyph: unbound prop or size hint");
    const hidden = iconIr();
    hidden.dom!.bindings["aria-hidden"] = { kind: "literal", value: "false" };
    expect(() => godotGlyphPlan(hidden)).toThrow("GODOT_UNSUPPORTED_GLYPH: UnrelatedGlyph: accessibility bindings do not describe decorative/image semantics");
    const missingSource = iconIr();
    missingSource.dom!.children[0]!.iconGlyph!.nameFrom = { kind: "prop", prop: "other" };
    expect(() => godotGlyphPlan(missingSource)).toThrow("GODOT_UNSUPPORTED_GLYPH: UnrelatedGlyph: glyph prop bindings disagree with normalized names");
  });

  it("refuses unsupported body facts and invalid defaults before emission", () => {
    const extraAnatomy = iconIr();
    extraAnatomy.dom!.children[0]!.attrs.fill = "currentColor";
    expect(() => godotGlyphPlan(extraAnatomy)).toThrow("GODOT_UNSUPPORTED_GLYPH: UnrelatedGlyph: unsupported host or SVG vocabulary");
    const childFocus = iconIr();
    childFocus.dom!.children[0]!.focusContainer = true;
    expect(() => godotGlyphPlan(childFocus)).toThrow("GODOT_UNSUPPORTED_GLYPH: UnrelatedGlyph: unlowered anatomy fact");
    const childActivation = iconIr();
    childActivation.dom!.children[0]!.activation = {} as never;
    expect(() => godotGlyphPlan(childActivation)).toThrow("GODOT_UNSUPPORTED_GLYPH: UnrelatedGlyph: unlowered anatomy fact");
    const keyboard = iconIr();
    keyboard.dom!.keyboardPanel = true;
    expect(() => godotGlyphPlan(keyboard)).toThrow("GODOT_UNSUPPORTED_GLYPH: UnrelatedGlyph: unlowered anatomy fact");
    const nativeChannel = iconIr();
    nativeChannel.dom!.children[0]!.nativeTextChannel = "value";
    expect(() => godotGlyphPlan(nativeChannel)).toThrow("GODOT_UNSUPPORTED_GLYPH: UnrelatedGlyph: unlowered anatomy fact");
    const badDefault = iconIr();
    badDefault.styledProps.find(prop => prop.name === "size")!.defaultExpr = '"huge"';
    expect(() => godotGlyphPlan(badDefault)).toThrow("GODOT_UNSUPPORTED_GLYPH: UnrelatedGlyph: invalid size default");
    const defaulted = iconIr();
    defaulted.styledProps.find(prop => prop.name === "name")!.defaultExpr = '"check"';
    defaulted.styledProps.find(prop => prop.name === "ariaLabel")!.defaultExpr = '"Default check"';
    expect(godotGlyphPlan(defaulted)).toMatchObject({ nameProp: "name", labelProp: "ariaLabel" });
    const invalidNameDefault = iconIr();
    invalidNameDefault.styledProps.find(prop => prop.name === "name")!.defaultExpr = "42";
    expect(() => godotGlyphPlan(invalidNameDefault)).toThrow("GODOT_UNSUPPORTED_GLYPH: UnrelatedGlyph: invalid glyph name default");
    const unrenderedSelector = iconIr();
    unrenderedSelector.nativeStyleRules!.unsupported.push({ sourceKey: "future-state", selector: ".future-state", reason: "test" } as never);
    expect(() => godotGlyphPlan(unrenderedSelector)).toThrow("GODOT_UNSUPPORTED_GLYPH: UnrelatedGlyph: unsupported native style selector");
    const godotOnlyStyle = iconIr();
    godotOnlyStyle.nativeStyleRules!.rules.find(rule => rule.sourceKey === "root")!.declarations.push({ property: "outline-color", value: "#ff0000", platforms: ["godot"] });
    expect(() => godotGlyphPlan(godotOnlyStyle)).toThrow("GODOT_UNSUPPORTED_GLYPH: UnrelatedGlyph: unsupported style selector root");
    const unrenderedDimension = iconIr();
    unrenderedDimension.tokenFacts.find(fact => fact.name === "icon.size.md")!.rawValue = "calc(1rem + 1px)";
    expect(() => godotGlyphPlan(unrenderedDimension)).toThrow("GODOT_UNSUPPORTED_GLYPH: UnrelatedGlyph: unsupported glyph dimension --md");
    const rectangularDimension = iconIr();
    rectangularDimension.nativeStyleRules!.rules.find(rule => rule.sourceKey === "--md")!.declarations.find(decl => decl.property === "height")!.token = "icon.size.lg";
    expect(() => godotGlyphPlan(rectangularDimension)).toThrow("GODOT_UNSUPPORTED_GLYPH: UnrelatedGlyph: non-square glyph dimension --md");
  });

  it("selects the shared glyph runtime and catalog from an IR fact, without an identity branch", () => {
    const ir = iconIr();
    expect(godotPlan(ir).operation).toBe("glyph");
    const emitter = createGodotEmitter();
    const files = emitter.emitComponent(ir, { componentsRoot: "", contractsRoot: root });
    const script = files.find(file => file.relativePath.endsWith(".gd"))!.contents;
    expect(script).toContain("runtime/glyph.gd");
    const encoded = script.match(/JSON.parse_string\((.+)\)/)![1]!;
    const configuration = JSON.parse(JSON.parse(encoded));
    expect(configuration.defaults).toEqual({ size: '"md"', decorative: "true" });
    expect(configuration).toMatchObject({ nameProp: "name", sizeProp: "size", decorativeProp: "decorative", labelProp: "ariaLabel" });
    expect(files.find(file => file.relativePath.endsWith(".tscn"))!.contents).not.toContain("theme = ExtResource");
    expect(emitter.emitTargetAssets!([ir], { componentsRoot: "", contractsRoot: path.join(root, "packages/ds-contracts") })).toHaveLength(1);
    expect(emitter.emitTargetAssets!([], { componentsRoot: "", contractsRoot: path.join(root, "packages/ds-contracts") })).toEqual([]);
  });
});
