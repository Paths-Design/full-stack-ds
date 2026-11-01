import { describe, expect, it } from "vitest";
import { buildComponentIR } from "../../ir.js";
import { corpusIR, loadCorpusContract } from "../corpus-fixtures.js";
import { generateReactNativeComponentSource } from "./component-source.js";

describe("native projected scalar content boundaries", () => {
  it.each(["Stat", "Button", "Checkbox", "Tabs", "Tooltip", "Truncate", "CodeBlock"])("imports the shared normalizer wherever %s owns projected container text", name => {
    const source = generateReactNativeComponentSource(corpusIR(name)).componentFile;
    expect(source).toContain('import { renderTextChildren } from "../../primitives/text-children"');
    expect(source).toContain("renderTextChildren(children");
    expect(source).not.toContain('typeof children === "string"');
  });

  it("preserves actual native Text-root content without an additional wrapper", () => {
    const source = generateReactNativeComponentSource(corpusIR("Text")).componentFile;
    expect(source).toContain("<RNText\n      testID={testID}");
    expect(source).toContain("{children}");
    expect(source).not.toContain("renderTextChildren");
  });
  it("leaves native Text imports to their actual owner", () => {
    for (const name of ["Stat", "Button", "Tabs", "Tooltip"]) {
      const source = generateReactNativeComponentSource(corpusIR(name)).componentFile;
      expect(source).not.toContain("Text as RNText");
      expect(source).toContain('import { renderTextChildren }');
    }
    expect(generateReactNativeComponentSource(corpusIR("Text")).componentFile).toContain("Text as RNText");
    const sequence = generateReactNativeComponentSource(corpusIR("Carousel")).componentFile;
    expect(sequence).toContain("<RNText>{sequence.playing");
    expect(sequence).toContain("Text as RNText");
  });

  it("applies text presentation and line limits at the same projection site", () => {
    const source = generateReactNativeComponentSource(corpusIR("Truncate")).componentFile;
    expect(source).toContain("renderTextChildren(children, { numberOfLines:");
    const styled = generateReactNativeComponentSource(corpusIR("Stat")).componentFile;
    expect(styled).toContain("renderTextChildren(children, { style: [styles.rootText, textVariantStyleForSize, textVariantStyleForTrend] })");
    const anchored = generateReactNativeComponentSource(corpusIR("Tooltip")).componentFile;
    expect(anchored).toContain("renderTextChildren(content)");
  });

  it("recognizes named-slot hosts promoted to native Text by their style facts", () => {
    const source = generateReactNativeComponentSource(corpusIR("Field")).componentFile;
    expect(source).toContain("<RNText\n          style={styles.label}");
    for (const slot of ["label", "help", "error", "validatingIndicator"]) {
      expect(source).toContain(`{slots?.${slot}}`);
      expect(source).not.toContain(`renderTextChildren(slots?.${slot}`);
    }
    expect(source).toContain("renderTextChildren(slots?.control)");
  });

  it("normalizes named and default slots independently under a renamed container", () => {
    const contract = JSON.parse(JSON.stringify(loadCorpusContract("Stat")).replaceAll("stat.design.", "metric.design."));
    contract.name = "Metric";
    contract.anatomy.dom.children = [{ tag: "slot", name: "summary" }, { tag: "children" }];
    contract.slots.summary = { required: false, selector: "[slot=summary]" };
    const source = generateReactNativeComponentSource(buildComponentIR(contract)).componentFile;
    expect(source).toContain("summary?: ReactNode;");
    expect(source).toContain("renderTextChildren(slots?.summary, { style:");
    expect(source).toContain("renderTextChildren(children, { style:");
    expect(source).not.toContain("{slots?.summary}");
  });

  it("keeps named slots as raw native text children when their parent is already Text", () => {
    const contract = JSON.parse(JSON.stringify(loadCorpusContract("Stat")).replaceAll("stat.design.", "metric.design."));
    contract.name = "Metric";
    contract.anatomy.dom.tag = "p";
    contract.anatomy.details.root.tag = "p";
    contract.anatomy.dom.children = [{ tag: "slot", name: "summary" }, { tag: "children" }];
    contract.slots.summary = { required: false, selector: "[slot=summary]" };
    const source = generateReactNativeComponentSource(buildComponentIR(contract)).componentFile;
    expect(source).toContain("<RNText\n");
    expect(source).toContain("{slots?.summary}");
    expect(source).toContain("{children}");
    expect(source).not.toContain("renderTextChildren");
  });
});
