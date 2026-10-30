import { describe, expect, it } from "vitest";
import ts from "typescript";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { generateLitComponentSource } from "./component-source.js";

describe("Lit static component-instance props", () => {
  it.each(["boolean", "number"] as const)("rejects string attrs targeting %s props instead of bypassing native value types", kind => {
    const leaf: ComponentContract = { name: "TypedLeaf", layer: "primitive", props: { designed: { members: [{ name: "value", propType: { kind } }] } } };
    const owner: ComponentContract = { name: "TypedOwner", layer: "composer", anatomy: { parts: ["root"], dom: { componentRef: "fsds.TypedLeaf", part: "root", attrs: { value: kind === "boolean" ? "false" : "3" } } } };
    expect(() => buildComponentIR(owner, { allContracts: new Map([[leaf.name, leaf], [owner.name, owner]]) })).toThrow(`targets ${kind}; static attrs carry strings`);
  });
  it("uses the normalized property classification for renamed enum and string props while preserving host attributes", () => {
    const caption = 'Quoted "text" with ${braces} and `ticks`';
    const leaf: ComponentContract = {
      name: "ProbeLeaf", layer: "primitive",
      anatomy: { parts: ["root"], dom: { tag: "div", part: "root" } },
      props: { designed: { members: [
        { name: "variant", propType: { kind: "enum", values: ["compact", "roomy"] }, default: "roomy" },
        { name: "caption", propType: { kind: "string" } },
      ] } },
    };
    const owner: ComponentContract = {
      name: "ProbeOwner", layer: "composer",
      anatomy: { parts: ["root"], dom: { tag: "div", part: "root", children: [
        { componentRef: "fsds.ProbeLeaf", attrs: { variant: "compact", caption, "data-probe": "kept", "aria-label": "Host label" } },
      ] } },
    };
    const ir = buildComponentIR(owner, { allContracts: new Map([[leaf.name, leaf], [owner.name, owner]]) });
    const child = ir.dom!.children[0];
    expect(child.componentInstance?.attrs.map(attr => [attr.sourceAttr, attr.kind])).toEqual([
      ["variant", "prop"], ["caption", "prop"], ["data-probe", "attribute"], ["aria-label", "attribute"],
    ]);
    const source = generateLitComponentSource(ir);
    expect(source).toContain('.variant=${"compact"}');
    expect(source).toContain(`.caption=\${${JSON.stringify(caption)}}`);
    expect(source).toContain('data-probe="kept"');
    expect(source).toContain('aria-label="Host label"');
    expect(source).not.toContain(' variant="compact"');
    const parsed = ts.createSourceFile("ProbeOwner.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    expect((parsed as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics).toHaveLength(0);
  });
});
