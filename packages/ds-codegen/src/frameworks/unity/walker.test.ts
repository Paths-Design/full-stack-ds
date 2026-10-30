import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { loadContractWithSidecars } from "./boundary.js";
import { createUnityEmitter, unityLowering } from "./factory.js";

const root = path.resolve(__dirname, "../../../../..");
const contractsRoot = path.join(root, "packages/ds-contracts");

function source(name: string, replacement: string): string {
  const contract = loadContractWithSidecars(root, name) as ComponentContract;
  const ir = buildComponentIR(contract);
  ir.name = replacement;
  expect(unityLowering(ir).behavior).toBe("Passive");
  return createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot })[0]!.contents;
}

describe("Unity passive anatomy path", () => {
  it("emits a channel-free rule host with a real orientation style carrier", () => {
    const output = source("Divider", "UnrelatedRule");
    expect(output).toContain("public partial class UnrelatedRule : VisualElement");
    expect(output).toContain('[UxmlAttribute] public string Orientation { get => Variants.Get(this, "divider", "horizontal", "vertical");');
    expect(output).not.toContain("ChannelName");
    expect(output).not.toContain("ChangeHandler");
    expect(output).not.toMatch(/(?:BooleanControl|ItemGroup|AnchoredSurface)\.Attach\(this/);
  });

  it("emits a consumer-content host without synthesizing a channel or interaction", () => {
    const output = source("Text", "UnrelatedContent");
    expect(output).toContain("public partial class UnrelatedContent : VisualElement");
    expect(output).not.toContain("ChannelName");
    expect(output).not.toMatch(/(?:BooleanControl|ItemGroup|AnchoredSurface)\.Attach\(this/);
    expect(output).not.toContain("INotifyValueChanged");
  });
});
