import { describe, expect, it } from "vitest";
import type { ComponentContract, ContractDomNode } from "./contract.js";
import { buildComponentIR, type DomNodeIR } from "./ir.js";
import { allCorpusComponentNames, corpusIR, loadCorpusContract } from "./frameworks/corpus-fixtures.js";

const corpus = new Map(allCorpusComponentNames().map((name) => [name, loadCorpusContract(name)]));

function build(contract: ComponentContract) {
  return buildComponentIR(contract, { allContracts: new Map([...corpus, [contract.name, contract]]) });
}

function contractNode(contract: ComponentContract, part: string): ContractDomNode {
  const found: ContractDomNode[] = [];
  const walk = (node: ContractDomNode) => {
    if (node.part === part && !node.componentRef) found.push(node);
    node.children?.forEach(walk);
  };
  if (contract.anatomy && !Array.isArray(contract.anatomy) && contract.anatomy.dom) walk(contract.anatomy.dom);
  if (found.length !== 1) throw new Error(`expected one ${part} node, found ${found.length}`);
  return found[0];
}

function irNode(node: DomNodeIR | null | undefined, part: string): DomNodeIR {
  const found: DomNodeIR[] = [];
  const walk = (n: DomNodeIR) => {
    if (n.part === part) found.push(n);
    n.children.forEach(walk);
  };
  if (node) walk(node);
  if (found.length !== 1) throw new Error(`expected one ${part} IR node, found ${found.length}`);
  return found[0];
}

function memberNamed(contract: ComponentContract, name: string) {
  const member = [
    ...(contract.props?.designed?.members ?? []),
    ...(contract.props?.constrained?.members ?? []),
    ...(contract.props?.styled?.members ?? []),
  ].find((m) => m.name === name);
  if (!member) throw new Error(`no prop ${name}`);
  return member;
}

/** PageNavigator's page-count text node: `message:pageCount(count=paged:count)`. */
function pageCountNode(contract: ComponentContract): ContractDomNode {
  const found: ContractDomNode[] = [];
  const walk = (node: ContractDomNode) => {
    if (typeof node.content === "string" && node.content.startsWith("message:pageCount")) found.push(node);
    node.children?.forEach(walk);
  };
  if (contract.anatomy && !Array.isArray(contract.anatomy) && contract.anatomy.dom) walk(contract.anatomy.dom);
  if (found.length !== 1) throw new Error(`expected one pageCount node, found ${found.length}`);
  return found[0];
}

describe("message IR facts", () => {
  it("normalizes the messages block into catalog-keyed facts in declaration order", () => {
    const ir = corpusIR("Carousel");
    expect(ir.messages.map((m) => m.catalogKey)).toEqual([
      "Carousel.regionLabel",
      "Carousel.roleDescription",
      "Carousel.rotationStart",
      "Carousel.rotationStop",
      "Carousel.slideRoleDescription",
      "Carousel.slidePosition",
      "Carousel.previousSlide",
      "Carousel.nextSlide",
      "Carousel.chooseSlide",
    ]);
    expect(ir.messages.find((m) => m.key === "slidePosition")).toEqual({
      key: "slidePosition",
      catalogKey: "Carousel.slidePosition",
      defaultMessage: "{index} of {count}",
      description: "Accessible name of a slide with no consumer label: its 1-based position and the slide count.",
      params: ["index", "count"],
    });
  });

  it("parses a parameterized content reference into a message binding with typed params", () => {
    const ir = corpusIR("PageNavigator");
    const contract = loadCorpusContract("PageNavigator");
    const node = irNode(ir.dom, pageCountNode(contract).part!);
    expect(node.content).toEqual({
      kind: "message",
      key: "pageCount",
      params: [{ name: "count", value: { kind: "paged", field: "count" } }],
    });
  });

  it("parses an attribute reference into a parameter-free message binding", () => {
    const ir = corpusIR("Carousel");
    expect(ir.dom?.bindings["aria-roledescription"]).toEqual({ kind: "message", key: "roleDescription", params: [] });
  });
});

describe("message validation refuses broken references", () => {
  it("an unknown key", () => {
    const contract = loadCorpusContract("PageNavigator");
    pageCountNode(contract).content = "message:pageTotal(count=paged:count)";
    expect(() => build(contract)).toThrow(
      "[MESSAGE_INVALID] PageNavigator: DOM binding references unknown message 'pageTotal'",
    );
  });

  it.each([
    ["a literal param value", "message:pageCount(count=literal:3)"],
    ["empty params", "message:nextPage()"],
    ["a capitalized key", "message:NextPage"],
  ])("a reference the parser cannot read (%s), instead of rendering it as text", (_label, reference) => {
    // Every message keeps a valid use, so only the parse check can catch the bad reference.
    const contract = loadCorpusContract("PageNavigator");
    const root = contract.anatomy && !Array.isArray(contract.anatomy) ? contract.anatomy.dom! : undefined;
    root!.bindings = { ...root!.bindings, title: reference };
    expect(() => build(contract)).toThrow(
      `[MESSAGE_INVALID] PageNavigator: malformed message reference '${reference}'; ` +
        "expected message:<key> or message:<key>(<name>=<binding>, ...)",
    );
  });

  it("placeholders that disagree with the declared params", () => {
    const contract = loadCorpusContract("PageNavigator");
    contract.messages!.pageCount.params = ["total"];
    expect(() => build(contract)).toThrow(
      "[MESSAGE_INVALID] PageNavigator: message 'pageCount' placeholders {count} do not match params [total]",
    );
  });

  it("a param declared twice", () => {
    const contract = loadCorpusContract("PageNavigator");
    contract.messages!.pageCount.params = ["count", "count"];
    expect(() => build(contract)).toThrow(
      "[MESSAGE_INVALID] PageNavigator: message 'pageCount' declares a param twice",
    );
  });

  it("a binding that supplies different params than the message declares", () => {
    const contract = loadCorpusContract("PageNavigator");
    pageCountNode(contract).content = "message:pageCount(total=paged:count)";
    expect(() => build(contract)).toThrow(
      "[MESSAGE_INVALID] PageNavigator: DOM binding supplies params [total] but message 'pageCount' declares [count]",
    );
  });

  it("a parameterized message referenced with no params", () => {
    const contract = loadCorpusContract("PageNavigator");
    pageCountNode(contract).content = "message:pageCount";
    expect(() => build(contract)).toThrow(
      "[MESSAGE_INVALID] PageNavigator: DOM binding supplies params [] but message 'pageCount' declares [count]",
    );
  });

  it("a declared message nothing references", () => {
    const contract = loadCorpusContract("PageNavigator");
    contract.messages!.unused = { defaultMessage: "Never shown", description: "Not referenced." };
    expect(() => build(contract)).toThrow(
      "[MESSAGE_INVALID] PageNavigator: message 'unused' is declared but never referenced",
    );
  });

  it("a prop that declares both a literal default and a defaultMessage", () => {
    const contract = loadCorpusContract("PageNavigator");
    memberNamed(contract, "nextLabel").default = "Next";
    expect(() => build(contract)).toThrow(
      "[MESSAGE_INVALID] PageNavigator: prop 'nextLabel' declares both default and defaultMessage",
    );
  });

  it("a defaultMessage on a prop that is not string-typed", () => {
    const contract = loadCorpusContract("PageNavigator");
    memberNamed(contract, "nextLabel").type = "number";
    expect(() => build(contract)).toThrow(
      "[MESSAGE_INVALID] PageNavigator: prop 'nextLabel' has defaultMessage but is not string-typed",
    );
  });

  it("a prop defaultMessage naming a parameterized message", () => {
    const contract = loadCorpusContract("PageNavigator");
    memberNamed(contract, "nextLabel").defaultMessage = "pageCount";
    expect(() => build(contract)).toThrow(
      "[MESSAGE_INVALID] PageNavigator: prop 'nextLabel' defaultMessage supplies params [] but message 'pageCount' declares [count]",
    );
  });

  it("a slide-position label that does not take index and count", () => {
    const contract = loadCorpusContract("Carousel");
    contract.messages!.slidePosition = { defaultMessage: "Slide {index}", description: "Position.", params: ["index"] };
    expect(() => build(contract)).toThrow(
      "[MESSAGE_INVALID] Carousel: sequence.labels.position supplies params [index, count] but message 'slidePosition' declares [index]",
    );
  });

  it("a sequence label naming an undeclared message", () => {
    const contract = loadCorpusContract("Carousel");
    contract.sequence!.labels.stop = "pauseRotation";
    expect(() => build(contract)).toThrow(
      "[MESSAGE_INVALID] Carousel: sequence.labels.stop references unknown message 'pauseRotation'",
    );
  });
});

describe("sequence rotation control has one text writer", () => {
  const refusal =
    "rotation text and name are owned by sequence.labels; the part must not declare content, children or aria-label";

  it("accepts the corpus rotation control, whose runtime writes text from sequence.labels", () => {
    expect(corpusIR("Carousel").motion.sequence?.labels).toEqual({
      start: "rotationStart",
      stop: "rotationStop",
      item: "slideRoleDescription",
      position: "slidePosition",
    });
  });

  it.each([
    ["content", (n: ContractDomNode) => { n.content = "message:rotationStart"; }],
    ["children", (n: ContractDomNode) => { n.children = [{ tag: "span", content: "message:rotationStart" }]; }],
    ["a static aria-label", (n: ContractDomNode) => { n.attrs = { ...n.attrs, "aria-label": "Rotate" }; }],
    ["a bound aria-label", (n: ContractDomNode) => { n.bindings = { "aria-label": "message:rotationStart" }; }],
  ])("refuses a rotation part declaring %s", (_label, mutate) => {
    const contract = loadCorpusContract("Carousel");
    mutate(contractNode(contract, "rotation"));
    expect(() => build(contract)).toThrow(refusal);
  });
});
