import { describe, expect, it } from "vitest";
import { corpusIR } from "../corpus-fixtures.js";
import { generateReactNativeComponentSource } from "./component-source.js";

describe("react-native projected text presentation", () => {
  it("attaches inherited text tokens and active variants to nested Button and Badge labels", () => {
    for (const [name, part] of [["Button", "loadingText"], ["Badge", "content"]] as const) {
      const { componentFile, stylesFile } = generateReactNativeComponentSource(corpusIR(name));
      expect(stylesFile).toContain("rootText: definedStyle({ color:");
      expect(componentFile).toContain(`style={styles.${part}}`);
      expect(componentFile).toMatch(/<RNText style=\{\[styles\.rootText, textVariantStyleFor/);
    }
  });

  it("keeps root text presentation on the root host when that host is text", () => {
    const { componentFile } = generateReactNativeComponentSource(corpusIR("Text"));
    expect(componentFile).toContain("<RNText\n      testID={testID}");
    expect(componentFile).not.toContain("styles.rootText");
  });
});
