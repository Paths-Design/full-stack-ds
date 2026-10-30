import { describe, expect, it } from "vitest";
import type { ComponentContract, ContractDomNode } from "./contract.js";
import { buildComponentIR, parseBindingExpression } from "./ir.js";
import { allCorpusComponentNames, loadCorpusContract } from "./frameworks/corpus-fixtures.js";

const corpus = new Map(allCorpusComponentNames().map((name) => [name, loadCorpusContract(name)]));
const shuttle = () => structuredClone(corpus.get("Shuttle")!) as ComponentContract;
const build = (contract: ComponentContract) => buildComponentIR(contract, { allContracts: corpus });
const dom = (contract: ComponentContract) => (contract.anatomy as { dom: ContractDomNode }).dom;
/** The listbox and option nodes of one side. */
const side = (contract: ComponentContract, name: "available" | "selected") => {
  const list = (dom(contract).children ?? []).find((node) => node.attrs?.["data-side"] === name)!;
  return { list, option: list.children![0] };
};

describe("transfer IR fact", () => {
  it("names the value channel and the options prop the runtime reads", () => {
    expect(build(shuttle()).transfer).toEqual({ valueChannel: "selection", optionsProp: "options" });
  });

  it("parses transfer values and actions", () => {
    expect(parseBindingExpression("transfer:available")).toEqual({ kind: "transfer", field: "available" });
    expect(parseBindingExpression("transfer:addDisabled")).toEqual({ kind: "transfer", field: "addDisabled" });
    expect(parseBindingExpression("transfer:keydown")).toEqual({ kind: "transfer", action: "keydown" });
    expect(parseBindingExpression("transfer:toggle(iter:item)")).toEqual({
      kind: "transfer", action: "toggle", arg: { kind: "iterationLocal", local: "item" },
    });
    for (const bad of ["transfer:toggle", "transfer:toggle(iter:index)", "transfer:toggle(iter:item.key)", "transfer:marked"]) {
      expect(() => parseBindingExpression(bad), bad).toThrow(`TRANSFER_BINDING_INVALID: ${bad}`);
    }
  });

  it("iterates each side's runtime list with the TransferListItem type", () => {
    const ir = build(shuttle());
    const options = ir.dom!.children.filter((node) => node.attrs["data-side"]).map((node) => node.children[0].iteration);
    expect(options).toMatchObject([
      { kind: "array", source: { kind: "transfer", field: "available" }, itemType: "TransferListItem" },
      { kind: "array", source: { kind: "transfer", field: "selected" }, itemType: "TransferListItem" },
    ]);
  });

  it("leaves components without a transfer block without a transfer fact", () => {
    expect(build(structuredClone(corpus.get("Tabs")!) as ComponentContract).transfer).toBeUndefined();
  });
});

describe("transfer refusals", () => {
  const refuses = (mutate: (contract: ComponentContract) => void, message: string) => {
    const contract = shuttle();
    mutate(contract);
    expect(() => build(contract)).toThrow(message);
  };

  it("refuses transfer bindings without a transfer block", () => {
    refuses((c) => { delete (c as { transfer?: unknown }).transfer; }, "TRANSFER_INVALID: Shuttle: transfer bindings");
  });

  it("refuses a value channel that is not string[]", () => {
    refuses((c) => { c.transfer!.valueChannel = "missing"; }, `valueChannel "missing" must name a value channel typed string[]`);
  });

  it("refuses an options prop that is not an array of strings", () => {
    refuses((c) => { c.transfer!.optionsProp = "ariaLabel"; }, `optionsProp "ariaLabel" must be an array of strings`);
  });

  it("refuses actions bound to the wrong event", () => {
    refuses((c) => {
      const { list } = side(c, "available");
      list.events = { click: "transfer:keydown" };
    }, "transfer:keydown must bind the keydown event");
  });

  it("refuses a mark that is not the selection dimension's attribute", () => {
    refuses((c) => { side(c, "selected").option.bindings!["aria-selected"] = "iter:item.key"; }, "the transfer:selected items must bind aria-selected to iter:item.marked");
  });

  it("refuses an option without its roving tab stop or its key", () => {
    refuses((c) => { delete side(c, "available").option.bindings!.tabindex; }, "must bind tabindex to iter:item.tabIndex");
    refuses((c) => { delete side(c, "available").option.bindings!["data-value"]; }, "must bind data-value to iter:item.key");
  });

  it("refuses a listbox that cannot tell the runtime its side or hand it keys", () => {
    refuses((c) => { side(c, "selected").list.attrs!["data-side"] = "right"; }, `the selected listbox must declare data-side="selected"`);
    refuses((c) => { side(c, "selected").option.iterate!.source = "transfer:available"; }, "transfer:available is iterated more than once");
    refuses((c) => { delete side(c, "available").list.attrs!["aria-multiselectable"]; }, `the available listbox must declare aria-multiselectable="true"`);
    refuses((c) => { delete side(c, "available").list.events; }, "the available listbox must bind keydown to transfer:keydown");
  });

  it("refuses an option that contains its own interactive element", () => {
    refuses((c) => { side(c, "available").option.children = [{ tag: "button", content: "iter:item.label" }]; },
      "the transfer:available items must contain no focusable or interactive element (found <button>)");
  });

  it("refuses a missing mark dimension", () => {
    refuses((c) => { delete c.states!.dimensions!.mark; }, "a selection state dimension with an a11y attribute is required");
  });
});
