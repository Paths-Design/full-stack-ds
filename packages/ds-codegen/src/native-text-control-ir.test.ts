import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "./contract.js";
import { buildComponentIR, type DomNodeIR } from "./ir.js";
const load = (name: string) => JSON.parse(readFileSync(resolve(__dirname, `../../ds-contracts/components/${name}/${name}.contract.json`), "utf8")) as ComponentContract;
function marked(node: DomNodeIR | undefined): string[] {
  return node ? [...(node.nativeTextChannel ? [node.nativeTextChannel] : []), ...node.children.flatMap(marked)] : [];
}
describe("native text ownership facts", () => {
  it.each(["Input", "TextField"])("derives %s after renaming from matching native value and event", name => {
    const contract = load(name); contract.name = "RenamedControl";
    const ir = buildComponentIR(contract);
    expect(ir.nativeTextChannels).toEqual(["value"]);
    expect(marked(ir.dom)).toEqual(["value"]);
  });
  it("supports an authored textarea event without formControl", () => {
    const contract = load("Input"); delete contract.formControl; delete contract.fieldAssociation;
    if (!contract.anatomy || Array.isArray(contract.anatomy) || !contract.anatomy.dom) throw new Error("fixture requires native DOM");
    contract.anatomy.dom.tag = "textarea";
    contract.anatomy.details!.root.tag = "textarea";
    contract.anatomy.dom.events = { change: "channel:value.onChange" };
    const ir = buildComponentIR(contract);
    expect(ir.nativeTextChannels).toEqual(["value"]);
    expect(marked(ir.dom)).toEqual(["value"]);
  });
  it.each(["value", "event", "host", "type"])("rejects unrelated %s facts", mismatch => {
    const contract = load("Input"); delete contract.formControl; delete contract.fieldAssociation;
    if (!contract.anatomy || Array.isArray(contract.anatomy) || !contract.anatomy.dom) throw new Error("fixture requires native DOM");
    const node = contract.anatomy.dom; node.events = { input: "channel:value.onChange" };
    if (mismatch === "value") node.bindings = { ...node.bindings, value: "prop:value" };
    if (mismatch === "event") node.events = { blur: "channel:value.onChange" };
    if (mismatch === "host") { node.tag = "div"; contract.anatomy.details!.root.tag = "div"; }
    if (mismatch === "type") contract.channels!.value.valueType = "number";
    const ir = buildComponentIR(contract);
    expect(ir.nativeTextChannels).toEqual([]); expect(marked(ir.dom)).toEqual([]);
  });
});
