import { describe, expect, it } from "vitest";
import type { ComponentContract, ContractDomNode } from "../contract.js";
import { allCorpusComponentNames, loadCorpusContract } from "../frameworks/corpus-fixtures.js";
import { validateLocalization } from "./localization.js";
import { validateContractSemantics } from "./semantic.js";

const corpus = new Map(allCorpusComponentNames().map((name) => [name, loadCorpusContract(name)]));

function rootOf(contract: ComponentContract): ContractDomNode {
  const dom = contract.anatomy && !Array.isArray(contract.anatomy) ? contract.anatomy.dom : undefined;
  if (!dom) throw new Error(`${contract.name} has no DOM anatomy`);
  return dom;
}

/** The Carousel's rotation button: `/anatomy/dom/children/0`. */
function rotationOf(contract: ComponentContract): ContractDomNode {
  const node = rootOf(contract).children![0];
  expect(node.part).toBe("rotation");
  return node;
}

/** The Carousel's Pagination instance and its JSON pointer. */
function paginationOf(contract: ComponentContract): { node: ContractDomNode; pointer: string } {
  const visit = (node: ContractDomNode, pointer: string): { node: ContractDomNode; pointer: string } | undefined => {
    if (node.componentRef === "fsds.Pagination") return { node, pointer };
    for (const [index, child] of (node.children ?? []).entries()) {
      const found = visit(child, `${pointer}/children/${index}`);
      if (found) return found;
    }
    return undefined;
  };
  const found = visit(rootOf(contract), "/anatomy/dom");
  if (!found) throw new Error("Carousel has no Pagination instance");
  return found;
}

const advice = "declare it in the messages block and reference it with message:<key>";

describe("localization gate over the corpus", () => {
  it("finds no literal user-facing text in any contract", () => {
    const issues = [...corpus.values()].flatMap((contract) =>
      validateLocalization(contract, corpus).map((issue) => `${contract.name}${issue.pointer}: ${issue.message}`),
    );
    expect(issues).toEqual([]);
  });

  it("runs as part of semantic validation, so generate:check refuses a regression", () => {
    const contract = loadCorpusContract("Carousel");
    rootOf(contract).attrs = { ...rootOf(contract).attrs, "aria-label": "Featured content" };
    const messages = validateContractSemantics(contract, { allContracts: corpus }).map((issue) => issue.message);
    expect(messages).toContain(`[L10N_LITERAL_TEXT_ATTRIBUTE] "aria-label" carries literal text "Featured content"; ${advice}`);
  });
});

describe("localization gate refuses each literal route", () => {
  it("a static text-bearing attribute", () => {
    const contract = loadCorpusContract("Carousel");
    rotationOf(contract).attrs = { type: "button", title: "Rotate" };
    expect(validateLocalization(contract, corpus)).toEqual([
      {
        pointer: "/anatomy/dom/children/0/attrs/title",
        message: `[L10N_LITERAL_TEXT_ATTRIBUTE] "title" carries literal text "Rotate"; ${advice}`,
      },
    ]);
  });

  it("a literal: binding on a text-bearing attribute", () => {
    const contract = loadCorpusContract("Carousel");
    rootOf(contract).bindings = { ...rootOf(contract).bindings, "aria-roledescription": "literal:carousel" };
    expect(validateLocalization(contract, corpus)).toEqual([
      {
        pointer: "/anatomy/dom/bindings/aria-roledescription",
        message: `[L10N_LITERAL_TEXT_ATTRIBUTE] "aria-roledescription" binds literal text "carousel"; ${advice}`,
      },
    ]);
  });

  it("a value-map arm on a text-bearing attribute", () => {
    const contract = loadCorpusContract("Carousel");
    rotationOf(contract).bindings = {
      "aria-description": { kind: "map", source: "prop:autoplay", values: { true: "Rotating", false: "—" } },
    };
    expect(validateLocalization(contract, corpus)).toEqual([
      {
        pointer: "/anatomy/dom/children/0/bindings/aria-description",
        message: `[L10N_LITERAL_TEXT_ATTRIBUTE] "aria-description" binds literal text "Rotating"; ${advice}`,
      },
    ]);
  });

  it("literal element content", () => {
    const contract = loadCorpusContract("Carousel");
    rotationOf(contract).content = "literal:Pause";
    expect(validateLocalization(contract, corpus)).toEqual([
      {
        pointer: "/anatomy/dom/children/0/content",
        message: `[L10N_LITERAL_CONTENT] content renders literal text "Pause"; ${advice}`,
      },
    ]);
  });

  it("each letter-bearing arm of conditional content, and not its condition", () => {
    const contract = loadCorpusContract("Carousel");
    rotationOf(contract).content = "conditional:prop:autoplay | literal:Pause | literal:Play";
    expect(validateLocalization(contract, corpus).map((issue) => issue.message)).toEqual([
      `[L10N_LITERAL_CONTENT] content renders literal text "Pause"; ${advice}`,
      `[L10N_LITERAL_CONTENT] content renders literal text "Play"; ${advice}`,
    ]);
  });

  it("a string prop with a literal default", () => {
    const contract = loadCorpusContract("Carousel");
    const label = contract.props!.styled!.members![7];
    expect(label.name).toBe("label");
    delete label.defaultMessage;
    label.default = "Featured content";
    expect(validateLocalization(contract, corpus)).toEqual([
      {
        pointer: "/props/styled/members/7/default",
        message:
          `[L10N_LITERAL_PROP_DEFAULT] prop "label" defaults to literal text "Featured content"; ` +
          "use defaultMessage, or translatable: false when the default is not user-facing",
      },
    ]);
  });

  it("a static attribute on a component instance feeding a translatable prop", () => {
    const contract = loadCorpusContract("Carousel");
    const { node, pointer } = paginationOf(contract);
    delete node.bindings!.label;
    node.attrs = { ...node.attrs, label: "Choose slide" };
    expect(validateLocalization(contract, corpus)).toEqual([
      {
        pointer: `${pointer}/attrs/label`,
        message: `[L10N_LITERAL_INSTANCE_ATTRIBUTE] "label" passes literal text "Choose slide" to Pagination's translatable prop; ${advice}`,
      },
    ]);
  });

  it("a literal: binding on a component instance feeding a translatable prop", () => {
    const contract = loadCorpusContract("Carousel");
    const { node, pointer } = paginationOf(contract);
    node.bindings = { ...node.bindings, label: "literal:Choose slide" };
    expect(validateLocalization(contract, corpus)).toEqual([
      {
        pointer: `${pointer}/bindings/label`,
        message: `[L10N_LITERAL_INSTANCE_ATTRIBUTE] "label" binds literal text "Choose slide" to Pagination's translatable prop; ${advice}`,
      },
    ]);
  });

  it("text in any script, not only Latin letters", () => {
    const contract = loadCorpusContract("Carousel");
    rotationOf(contract).content = "literal:次へ";
    expect(validateLocalization(contract, corpus).map((issue) => issue.message)).toEqual([
      `[L10N_LITERAL_CONTENT] content renders literal text "次へ"; ${advice}`,
    ]);
  });
});

describe("localization gate admits what is not translatable text", () => {
  it("a literal with no letters", () => {
    const contract = loadCorpusContract("Carousel");
    rotationOf(contract).content = "literal:×";
    rotationOf(contract).attrs = { type: "button", title: "1/2" };
    expect(validateLocalization(contract, corpus)).toEqual([]);
  });

  it("a non-text attribute holding letters", () => {
    const contract = loadCorpusContract("Carousel");
    rotationOf(contract).attrs = { type: "button", "data-state": "paused" };
    expect(validateLocalization(contract, corpus)).toEqual([]);
  });

  it("a prop default marked translatable: false", () => {
    const contract = loadCorpusContract("Calendar");
    const locale = contract.props!.designed!.members![8];
    expect(locale).toMatchObject({ name: "locale", translatable: false, default: "en-US" });
    expect(validateLocalization(contract, corpus)).toEqual([]);
    delete locale.translatable;
    expect(validateLocalization(contract, corpus).map((issue) => issue.pointer)).toEqual([
      "/props/designed/members/8/default",
    ]);
  });

  it("a letter-bearing instance attribute feeding a non-string prop", () => {
    // Carousel passes presentation="indicators" to Pagination's enumerated prop.
    const contract = loadCorpusContract("Carousel");
    expect(paginationOf(contract).node.attrs).toEqual({ presentation: "indicators" });
    expect(validateLocalization(contract, corpus)).toEqual([]);
  });

  it("instance attributes without a corpus to resolve the target's props", () => {
    const contract = loadCorpusContract("Carousel");
    paginationOf(contract).node.attrs = { label: "Choose slide" };
    expect(validateLocalization(contract)).toEqual([]);
    expect(validateLocalization(contract, corpus)).toHaveLength(1);
  });
});
