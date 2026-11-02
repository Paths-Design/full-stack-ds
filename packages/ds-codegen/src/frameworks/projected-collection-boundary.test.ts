import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../contract.js";
import { buildComponentIR } from "../ir.js";
import { isOwnedProjectedCollectionCssBinding } from "../projected-collection.js";
import { classifyContract as unityLeaves } from "./unity/boundary.js";
import { createUnityEmitter } from "./unity/factory.js";
import { classifyLeaves as godotLeaves } from "./godot/boundary.js";
import { godotAnatomyPlan } from "./godot/walker.js";
import { classifyLeaves as gpuiLeaves, loadBoundary as gpuiBoundary } from "./gpui/boundary.js";
import { gpuiAnatomyPlan } from "./gpui/anatomy.js";

function contract(): ComponentContract {
  return {
    name: "RenamedTrail", cssPrefix: "renamed-trail", layer: "compound",
    anatomy: {
      parts: ["root", "trail", "crumb", "divider"],
      details: { root: { tag: "div", role: "root" }, trail: { tag: "ol", role: "group" }, crumb: { tag: "li", role: "item", subcomponent: true, multiple: true }, divider: { role: "decoration", multiple: true } },
      dom: { tag: "div", part: "root", children: [{ tag: "ol", part: "trail", projectedCollection: { itemPart: "crumb", separatorPart: "divider", separator: "prop:dividerText" }, children: [{ tag: "children" }] }] },
    },
    props: { styled: { members: [{ name: "dividerText", type: "string", default: "/" }] } },
  };
}
function fixture() {
  const ir = buildComponentIR(contract());
  const node = ir.dom!.children[0];
  expect(node.projectedCollection?.itemPart).toBe("crumb");
  return { ir, node };
}
function unitySource(ir: ReturnType<typeof buildComponentIR>) {
  return createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot: "" })[0]!.contents;
}

describe("projected collections outside the npm renderers", () => {
  it("classifies every authored relation leaf without a component-name exception or catch-all", () => {
    const input = contract();
    for (const entry of [
      { target: "unity", leaves: unityLeaves(input), disposition: "refused" },
      { target: "godot", leaves: godotLeaves(input), disposition: "pending" },
      { target: "gpui", leaves: gpuiLeaves(input, gpuiBoundary()), disposition: "pending" },
    ]) {
      const relation = entry.leaves.filter(leaf => leaf.keyed.includes("/projectedCollection/"));
      expect(Object.fromEntries(relation.map(leaf => [leaf.keyed.split("/").at(-1), { value: leaf.value, rule: leaf.rule, disposition: leaf.disposition, catchAll: leaf.catchAll }])), entry.target).toEqual({
        itemPart: { value: "crumb", rule: "anatomy-projected-collection", disposition: entry.disposition, catchAll: false },
        separatorPart: { value: "divider", rule: "anatomy-projected-collection", disposition: entry.disposition, catchAll: false },
        separator: { value: "prop:dividerText", rule: "anatomy-projected-collection", disposition: entry.disposition, catchAll: false },
      });
    }
  });
  it("allows only the exact owned carrier while making Unity's semantic omission explicit", () => {
    const { ir, node } = fixture();
    const binding = structuredClone(node.cssVarBindings[0]!);
    binding.value = { kind: "prop", prop: "dividerText", path: [] };
    expect(isOwnedProjectedCollectionCssBinding(node, binding)).toBe(true);
    const source = unitySource(ir);
    expect(source).toContain("public partial class RenamedTrail : VisualElement");
    expect(source).toContain('// Omitted projectedCollection: {"part":"trail","itemPart":"crumb","separatorPart":"divider"');
    expect(source).toContain('"separator":{"kind":"prop","prop":"dividerText"}');
    expect(source).not.toContain("public string DividerText");
  });
  it.each(["variable", "format", "prop", "path", "literal", "missing relation", "unrelated binding"] as const)("keeps Unity fail-closed for %s", mutation => {
    const { ir, node } = fixture();
    const binding = node.cssVarBindings[0]!;
    switch (mutation) {
      case "variable": binding.varName += "-other"; break;
      case "format": binding.format = undefined; break;
      case "prop": binding.value = { kind: "prop", prop: "anotherValue" }; break;
      case "path": binding.value = { kind: "prop", prop: "dividerText", path: ["nested"] }; break;
      case "literal": binding.value = { kind: "literal", value: "/" }; break;
      case "missing relation": delete node.projectedCollection; break;
      case "unrelated binding": node.cssVarBindings.push({ varName: "--fsds-renamed-trail-other", format: "decorative-content", value: { kind: "prop", prop: "dividerText" } }); break;
    }
    expect(() => unitySource(ir)).toThrow("UNITY_UNSUPPORTED_PASSIVE_ANATOMY: RenamedTrail trail has unlowered authored facts");
  });
  it("records Godot's semantic relation separately from the CSS carrier", () => {
    const { ir } = fixture();
    const plan = godotAnatomyPlan(ir);
    expect(plan?.contentPart).toBe("trail");
    expect(plan?.omissions).toContain("trail: projected collection items crumb with separator divider from prop:dividerText not lowered");
    expect(plan?.omissions).toContain("trail: CSS variable bindings (--fsds-renamed-trail-child-separator) not lowered");
  });
  it("records and strips GPUI's relation without mutating input or losing carrier accounting", () => {
    const { ir, node } = fixture();
    const relation = structuredClone(node.projectedCollection);
    const projection = gpuiAnatomyPlan(ir);
    expect(projection.omissions).toContainEqual(expect.objectContaining({ kind: "projectedCollection", source: "trail/projectedCollection", boundary: "anatomy-projected-collection", disposition: "pending", reason: expect.stringContaining('"separator":{"kind":"prop","prop":"dividerText"}') }));
    expect(projection.omissions).toContainEqual(expect.objectContaining({ kind: "cssVarBindings", source: "trail", boundary: "anatomy-css-variable-bindings" }));
    expect(projection.ir.dom?.children[0].projectedCollection).toBeUndefined();
    expect(projection.ir.dom?.children[0].cssVarBindings).toEqual([]);
    expect(node.projectedCollection).toEqual(relation);
    expect(node.cssVarBindings).toHaveLength(1);
  });
});
