import { describe, expect, it } from "vitest";
import type { ContractDomNode } from "../contract.js";
import { allCorpusComponentNames, loadCorpusContract } from "../frameworks/corpus-fixtures.js";
import { validateContractIr } from "./ir-build.js";

const corpus = new Map(allCorpusComponentNames().map((name) => [name, loadCorpusContract(name)]));

describe("IR build as a semantic check", () => {
  it("every corpus contract builds", () => {
    const issues = [...corpus.values()].flatMap((contract) =>
      validateContractIr(contract, corpus).map((issue) => `${contract.name}: ${issue.message}`),
    );
    expect(issues).toEqual([]);
  });

  it("reports an IR failure as an issue instead of throwing", () => {
    const contract = loadCorpusContract("PageNavigator");
    const walk = (node: ContractDomNode) => {
      if (node.content === "message:pageCount(count=paged:count)") node.content = "message:pageTotal(count=paged:count)";
      node.children?.forEach(walk);
    };
    walk(contract.anatomy && !Array.isArray(contract.anatomy) ? contract.anatomy.dom! : ({} as ContractDomNode));
    expect(validateContractIr(contract, corpus)).toEqual([
      { pointer: "/", message: "[MESSAGE_INVALID] PageNavigator: DOM binding references unknown message 'pageTotal'" },
    ]);
  });

  it("leaves the contract it checks untouched", () => {
    const contract = loadCorpusContract("Carousel");
    const before = JSON.stringify(contract);
    validateContractIr(contract, corpus);
    expect(JSON.stringify(contract)).toBe(before);
  });
});
