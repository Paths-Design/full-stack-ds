import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { createUnityEmitter } from "./factory.js";
import { unityGlyphPlan } from "./glyph-plan.js";
import { loadContractWithSidecars } from "./boundary.js";

const root = path.resolve(__dirname, "../../../../..");
const contractsRoot = path.join(root, "packages/ds-contracts");
const icon = () => structuredClone(loadContractWithSidecars(root, "Icon")) as ComponentContract;

describe("Unity fact-derived glyph lowering", () => {
  it("survives component identity substitution and binds name and all authored sizes", () => {
    const ir = buildComponentIR(icon());
    ir.name = "UnrelatedGlyph";
    const plan = unityGlyphPlan(ir);
    expect(plan).toMatchObject({ nameProp: "name", sizeProp: "size",
      sizeHints: { sm: 16, md: 20, lg: 24, xl: 32 } });
    const source = createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot })[0]!.contents;
    expect(source).toContain("public partial class UnrelatedGlyph : VisualElement");
    expect(source).toContain("private readonly GlyphElement glyphElement");
    expect(source).toContain("glyphElement.GlyphName = value");
    for (const [name, px] of Object.entries(plan!.sizeHints))
      expect(source).toContain('value == "' + name + '" ? ' + px);
    expect(source).not.toContain("if (component");
  });

  it("refuses a second glyph or an unrepresented SVG attribute", () => {
    const duplicate = buildComponentIR(icon());
    duplicate.dom!.children.push(structuredClone(duplicate.dom!.children[0]!));
    expect(() => unityGlyphPlan(duplicate)).toThrow(/expected one direct glyph/);
    const unrepresented = buildComponentIR(icon());
    unrepresented.dom!.children[0]!.attrs.filter = "url(#blur)";
    expect(() => unityGlyphPlan(unrepresented)).toThrow(/SVG attributes/);
  });

  it("emits the authored catalog only when a glyph fact is admitted", () => {
    const emitter = createUnityEmitter();
    const glyphIR = buildComponentIR(loadContractWithSidecars(root, "Icon"));
    const textIR = buildComponentIR(loadContractWithSidecars(root, "Text"));
    const assets = emitter.emitTargetAssets!([glyphIR], { componentsRoot: "", contractsRoot });
    const catalog = assets.find(asset => asset.relativePath === "Runtime/GlyphCatalog.generated.cs");
    expect(catalog).toBeDefined();
    expect(catalog!.contents).toContain('"check", new GlyphSet(');
    expect(catalog!.contents).toContain('"placeholder", new GlyphSet(');
    expect(catalog!.contents).toContain("GlyphCommandKind.Cubic");
    expect(emitter.emitTargetAssets!([textIR], { componentsRoot: "", contractsRoot })
      .some(asset => asset.relativePath.includes("GlyphCatalog"))).toBe(false);
  });
});
