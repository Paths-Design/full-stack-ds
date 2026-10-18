import { describe, expect, it } from "vitest";
import { buildComponentIR } from "../ir.js";
import { allCorpusComponentNames, loadCorpusContract } from "./corpus-fixtures.js";
import { swiftLiteral } from "./swift/swiftui/icon-glyph.js";
import { kotlinStringLiteral } from "./jetpack-compose/messages.js";
import { generateSwiftUIComponentSource } from "./swift/swiftui/component-source.js";
import { generateJetpackComposeComponentSource } from "./jetpack-compose/component-source.js";

// A message default is any non-empty string, so native literals must survive
// line breaks, quotes, backslashes, template syntax and control characters.
const hostile = 'a\nb "q"\tt $d ${x} \\s \\(i) \r \u0001 \u007f 次へ';

describe("native string literals", () => {
  it("Swift escapes every character that would end or reinterpret a single-line literal", () => {
    expect(swiftLiteral(hostile)).toBe('"a\\nb \\"q\\"\\tt $d ${x} \\\\s \\\\(i) \\r \\u{1} \\u{7f} 次へ"');
    expect(swiftLiteral("\0")).toBe(String.raw`"\0"`);
  });

  it("Kotlin escapes every character that would end, template or reinterpret a literal", () => {
    expect(kotlinStringLiteral(hostile)).toBe(String.raw`"a\nb \"q\"\tt \$d \${x} \\s \\(i) \r \u0001 \u007f 次へ"`);
    expect(kotlinStringLiteral("\b")).toBe(String.raw`"\b"`);
  });

  it("a multiline message default stays one escaped literal in both native emitters", () => {
    const corpus = new Map(allCorpusComponentNames().map((name) => [name, loadCorpusContract(name)]));
    const contract = loadCorpusContract("Truncate");
    contract.messages!.expand.defaultMessage = "Show\nmore";
    const ir = buildComponentIR(contract, { allContracts: new Map([...corpus, ["Truncate", contract]]) });
    const swift = generateSwiftUIComponentSource(ir);
    const kotlin = generateJetpackComposeComponentSource(ir);
    expect(swift).toContain(String.raw`fsdsMessages.string("Truncate.expand", default: "Show\nmore")`);
    expect(kotlin).toContain(String.raw`.string("Truncate.expand", "Show\nmore")`);
    expect(swift.split("\n").some((line) => line.endsWith('"Show'))).toBe(false);
    expect(kotlin.split("\n").some((line) => line.endsWith('"Show'))).toBe(false);
  });
});
