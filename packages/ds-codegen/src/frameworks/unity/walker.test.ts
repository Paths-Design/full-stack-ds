import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { loadContractWithSidecars } from "./boundary.js";
import { createUnityEmitter, unityLowering } from "./factory.js";

const root = path.resolve(__dirname, "../../../../..");
const contractsRoot = path.join(root, "packages/ds-contracts");

function irFor(name: string, replacement: string) {
  const contract = loadContractWithSidecars(root, name) as ComponentContract;
  const ir = buildComponentIR(contract);
  ir.name = replacement;
  expect(unityLowering(ir).behavior).toBe("Passive");
  return ir;
}

const emit = (ir: ReturnType<typeof irFor>): string => createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot })[0]!.contents;

describe("Unity passive anatomy path", () => {
  it("emits a channel-free rule host with a real orientation style carrier", () => {
    const ir = irFor("Divider", "UnrelatedRule");
    ir.styledProps = ir.styledProps.filter(prop => prop.name === "orientation");
    const output = emit(ir);
    expect(output).toContain("public partial class UnrelatedRule : VisualElement");
    expect(output).toContain('[UxmlAttribute] public string Orientation { get => Variants.Get(this, "divider", "horizontal", "vertical");');
    expect(output).not.toContain("ChannelName");
    expect(output).not.toContain("ChangeHandler");
    expect(output).not.toMatch(/(?:BooleanControl|ItemGroup|AnchoredSurface)\.Attach\(this/);
  });

  it("emits a consumer-content host without synthesizing a channel or interaction", () => {
    const ir = irFor("Text", "UnrelatedContent");
    ir.styledProps = ir.styledProps.filter(prop => prop.name === "variant" || prop.name === "weight");
    ir.dom!.bindings = {};
    const output = emit(ir);
    expect(output).toContain("public partial class UnrelatedContent : VisualElement");
    expect(output).not.toContain("ChannelName");
    expect(output).not.toMatch(/(?:BooleanControl|ItemGroup|AnchoredSurface)\.Attach\(this/);
    expect(output).not.toContain("INotifyValueChanged");
  });

  it("refuses the current contracts until their authored props and anatomy are realised", () => {
    expect(() => emit(irFor("Divider", "UnrelatedRule"))).toThrow("UNITY_UNSUPPORTED_PASSIVE_PROP: UnrelatedRule does not realise decorative, thickness, title");
    expect(() => emit(irFor("Text", "UnrelatedContent"))).toThrow("UNITY_UNSUPPORTED_PASSIVE_ANATOMY: UnrelatedContent root has unlowered authored facts");
    const rootContent = irFor("Divider", "UnrelatedRule");
    rootContent.dom!.content = { kind: "literal", value: "Hidden" };
    expect(() => emit(rootContent)).toThrow("UNITY_UNSUPPORTED_PASSIVE_ANATOMY: UnrelatedRule root has unlowered authored facts");
    const compoundContent = irFor("Text", "UnrelatedContent");
    compoundContent.styledProps = [];
    compoundContent.dom!.bindings = {};
    const caption = { ...compoundContent.parts[0]!, name: "caption", nativeTag: "span", isCompound: true, isRootOnly: false };
    compoundContent.parts.push(caption);
    compoundContent.compoundParts.push(caption);
    compoundContent.dom!.children = [{ ...compoundContent.dom!, tag: "span", part: "caption", content: { kind: "literal", value: "VISIBLE" }, children: [] }];
    expect(() => emit(compoundContent)).toThrow("UNITY_UNSUPPORTED_PASSIVE_ANATOMY: UnrelatedContent caption has unlowered authored facts");
  });
});
