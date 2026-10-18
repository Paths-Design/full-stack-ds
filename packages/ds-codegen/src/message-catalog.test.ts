import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { collectCorpusMessages, generateXcstrings } from "./message-catalog.js";
import { allCorpusComponentNames, corpusIR } from "./frameworks/corpus-fixtures.js";
import { SWIFTUI_XCSTRINGS_RELATIVE_PATH } from "./frameworks/swift/swiftui/factory.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const CONTRACTS_ROOT = path.join(REPO_ROOT, "packages/ds-contracts");
const COMMITTED = path.join(REPO_ROOT, "packages/ds-swiftui/Localization/FsdsComponents.xcstrings");

describe("corpus message catalog", () => {
  it("collects every component's messages under <Component>.<key>, sorted", () => {
    const keys = collectCorpusMessages(CONTRACTS_ROOT).map((m) => m.catalogKey);
    const expected = allCorpusComponentNames()
      .flatMap((name) => corpusIR(name).messages.map((m) => m.catalogKey))
      .sort();
    expect(keys).toEqual(expected);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("PageNavigator.pageCount");
  });

  it("writes the contract default and description, naming placeholders for the translator", () => {
    const catalog = JSON.parse(generateXcstrings(collectCorpusMessages(CONTRACTS_ROOT)));
    expect(catalog.sourceLanguage).toBe("en");
    expect(catalog.strings["PageNavigator.pageCount"]).toEqual({
      comment: "Text after the page number field: the total page count. Placeholders: {count}.",
      extractionState: "manual",
      localizations: { en: { stringUnit: { state: "translated", value: "of {count}" } } },
    });
    expect(catalog.strings["Carousel.nextSlide"].comment).toBe(
      "Accessible name of the button that shows the next slide.",
    );
  });

  it("the committed SwiftUI reference catalog equals a fresh render of the corpus", () => {
    // The SwiftUI emitter writes this file relative to its primitives root; a
    // contract message edit without a regenerate leaves translators a stale catalog.
    expect(path.resolve(REPO_ROOT, "packages/ds-swiftui/Sources/DsSwiftUI/primitives", SWIFTUI_XCSTRINGS_RELATIVE_PATH)).toBe(COMMITTED);
    expect(fs.readFileSync(COMMITTED, "utf8")).toBe(generateXcstrings(collectCorpusMessages(CONTRACTS_ROOT)));
  });
});
