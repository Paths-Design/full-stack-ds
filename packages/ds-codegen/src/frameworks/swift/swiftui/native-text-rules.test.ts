import { describe, expect, it } from "vitest";
import { corpusIR } from "../../corpus-fixtures.js";
import { emitSwiftNativeTextRules, nativeTextPart } from "./native-text-rules.js";

describe("SwiftUI native text rule projection", () => {
  it.each([
    ["Text", "root"],
    ["Button", "loadingText"],
    ["Badge", "content"],
    ["AlertNotice", "root"],
  ])("finds the owned text region for %s", (name, part) => {
    expect(nativeTextPart(corpusIR(name))).toBe(part);
  });

  it("retains source-order variant token rebindings without web-only declarations", () => {
    const ir = corpusIR("Text");
    const emission = emitSwiftNativeTextRules(ir, "root", Object.keys(ir.variants));
    const source = emission.lines.join("\n");
    expect(emission.hasProperties).toBe(true);
    expect(source).toContain('property: "font-size", value: "1rem", token: "text.size.md"');
    expect(source).toContain('axis: "variant", value: "display"');
    expect(source).toContain('property: "text.size.md", value: "3.75rem", token: "core.typography.ramp.11"');
    expect(source).not.toContain('property: "margin"');
    expect(source.indexOf('value: "display"')).toBeGreaterThan(source.indexOf('property: "font-size", value: "1rem"'));
  });

  it("reports a state-conditioned text rule instead of silently treating it as a variant", () => {
    const ir = structuredClone(corpusIR("Button"));
    ir.nativeStyleRules!.rules.push({
      sourceKey: "synthetic-disabled",
      part: "root",
      predicates: [{ kind: "disabled", value: true }],
      declarations: [{ property: "color", value: "#ff0000" }],
    });
    const emission = emitSwiftNativeTextRules(ir, "loadingText", Object.keys(ir.variants));
    expect(emission.omissions).toContain("synthetic-disabled: text rule has unsupported predicate or pseudo");
    expect(emission.lines.join("\n")).not.toContain('value: "#ff0000"');
  });
});
