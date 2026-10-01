import { describe, expect, it } from "vitest";
import type { ComponentContract } from "./contract.js";
import { buildComponentIR, parseBindingExpression } from "./ir.js";
import { allCorpusComponentNames, loadCorpusContract } from "./frameworks/corpus-fixtures.js";
import { generateReactComponentSource } from "./frameworks/react/component-source.js";
import { generateVueComponentSource } from "./frameworks/vue/component-source.js";
import { generateSvelteComponentSource } from "./frameworks/svelte/component-source.js";
import { generateAngularComponentSource } from "./frameworks/angular/component-source.js";
import { generateLitComponentSource } from "./frameworks/lit/component-source.js";

const corpus = new Map(allCorpusComponentNames().map(name => [name, loadCorpusContract(name)]));
const build = (contract: ComponentContract) => buildComponentIR(contract, { allContracts: corpus });
const emit = (contract: ComponentContract) => {
  const ir = build(contract);
  return [JSON.stringify(generateReactComponentSource(ir, "../../primitives")), generateVueComponentSource(ir), generateSvelteComponentSource(ir), generateAngularComponentSource(ir), generateLitComponentSource(ir)];
};

describe("ordered-set semantics are independent of component name and projection", () => {
  it("lowers a renamed composed navigator through every web emitter", () => {
    const contract = structuredClone(corpus.get("PageNavigator")!);
    contract.name = "BoundedFlow";
    contract.channels!.position = contract.channels!.page;
    delete contract.channels!.page;
    contract.pagedSet!.channel = "position";
    contract.anatomy = JSON.parse(JSON.stringify(contract.anatomy).replaceAll("channel:page.", "channel:position."));
    for (const block of Object.values(contract.styles ?? {})) for (const entry of Object.values(block)) {
      if (entry.design) entry.design.slot = entry.design.slot.replace(/^page-navigator\./, "bounded-flow.");
    }
    for (const source of emit(contract)) {
      expect(source).toContain("pagedSet");
      expect(source).toContain("position");
      expect(source).toContain("Input");
      expect(source).toContain("Pagination");
    }
  });

  it("admits a read-only activity projection with independent completion and progress data", () => {
    const contract = structuredClone(corpus.get("Pagination")!);
    contract.name = "ActivityProjection";
    contract.styles = {}; contract.tokens = {};
    contract.types!.Activity = { kind: "alias", alias: "{ label: string; completed: boolean; progress: number }" };
    contract.props!.styled!.members!.find(prop => prop.name === "pages")!.propType = { kind: "array", items: { kind: "ref", to: "Activity" } };
    contract.anatomy = {
      parts: ["root", "item", "progress"],
      details: { root: { tag: "div", role: "root", subcomponent: false }, item: { tag: "span", role: "content", multiple: true, subcomponent: false }, progress: { componentRef: "fsds.Progress", role: "decoration", subcomponent: false } },
      dom: { tag: "div", part: "root", children: [{ tag: "span", part: "item", iterate: { source: "prop:pages", kind: "array", itemType: "Activity" }, bindings: { "aria-current": "predicate:eq(iter:index, channel:page.value)", "data-completed": "iter:item.completed" }, children: [{ tag: "span", content: "iter:item.label" }, { componentRef: "fsds.Progress", part: "progress", bindings: { value: "iter:item.progress", label: "iter:item.label" } }] }] },
    };
    contract.a11y = { role: "group", keyboard: [] };
    const ir = build(contract);
    expect(ir.parts.every(part => !part.details?.interactive && !part.details?.focusable)).toBe(true);
    for (const source of emit(contract)) {
      expect(source).toContain("completed");
      expect(source).toContain("progress");
      expect(source).not.toMatch(/onClick=|onclick=|@click=|\(click\)=|<button/);
    }
    const selectable = structuredClone(contract);
    const anatomy = selectable.anatomy as Exclude<ComponentContract["anatomy"], unknown[]>;
    anatomy!.details!.item = { ...anatomy!.details!.item, tag: "button", role: "trigger", interactive: true, focusable: true };
    anatomy!.dom!.children![0].tag = "button";
    anatomy!.dom!.children![0].events = { click: "paged:request(iter:index)" };
    for (const source of emit(selectable)) {
      expect(source).toContain("pagedSet.request");
      expect(source).toContain("completed");
      expect(source).toContain("progress");
    }
  });

  it("rejects unsupported operations and incompatible ownership", () => {
    for (const expression of ["paged:complete", "paged:request(prop:index)", "paged:request(iter:item)"]) expect(() => parseBindingExpression(expression)).toThrow(/PAGED_BINDING_INVALID/);
    const noPolicy = structuredClone(corpus.get("PageNavigator")!);
    delete noPolicy.pagedSet;
    expect(() => build(noPolicy)).toThrow(/paged bindings require/);
    const booleanChannel = structuredClone(corpus.get("PageNavigator")!);
    booleanChannel.channels!.page.valueType = "boolean";
    expect(() => build(booleanChannel)).toThrow(/numeric value channel/);
    const wrongCallback = structuredClone(corpus.get("PageNavigator")!);
    const anatomy = wrongCallback.anatomy as Exclude<ComponentContract["anatomy"], unknown[]>;
    anatomy!.dom!.children![1].children![0].events!.change = "paged:request";
    expect(() => build(wrongCallback)).toThrow(/COMPONENT_CALLBACK_INVALID/);
    const wrongValue = structuredClone(corpus.get("PageNavigator")!);
    const valueAnatomy = wrongValue.anatomy as Exclude<ComponentContract["anatomy"], unknown[]>;
    valueAnatomy!.dom!.children![1].children![0].bindings!.value = "paged:count";
    expect(() => build(wrongValue)).toThrow(/PAGED_VALUE_INVALID/);
  });
});
