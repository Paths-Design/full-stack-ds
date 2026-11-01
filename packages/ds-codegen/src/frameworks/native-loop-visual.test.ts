import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../contract.js";
import { buildComponentIR } from "../ir.js";
import { nativeLoopVisualPlan } from "./native-loop-visual.js";
import { createGodotEmitter } from "./godot/factory.js";

const root = path.resolve(__dirname, "../../../..");
function fixture(name = "Spinner") {
  const base = path.join(root, `packages/ds-contracts/components/${name}/${name}`);
  const contract = JSON.parse(fs.readFileSync(`${base}.contract.json`, "utf8")) as ComponentContract & { styles?: unknown; tokens?: unknown };
  contract.styles = JSON.parse(fs.readFileSync(`${base}.styles.json`, "utf8"));
  contract.tokens = JSON.parse(fs.readFileSync(`${base}.tokens.json`, "utf8"));
  return buildComponentIR(contract);
}

describe("native loop visual plan", () => {
  it("carries the loop and painted variant facts after an identity substitution", () => {
    const ir = fixture();
    ir.name = "WaitingIndicator";
    expect(nativeLoopVisualPlan(ir)).toEqual({
      operation: "loop-visual", targetPart: "visual", durationMs: 800, multiplier: 1,
      easing: [0, 0, 1, 1], reducedValue: 0, sizeAxis: "size", thicknessAxis: "thickness",
      sizePixels: { xs: 12, sm: 16, md: 20, lg: 24 },
      thicknessPixels: { hairline: 2, regular: 3, bold: 4 }, baseThicknessPx: 3,
      trackColor: "#d0d0d0", accentColor: "#d92d2e", hiddenProp: "ariaHidden", labelProp: "label",
      excluded: ["inline", "showAfterMs"],
    });
    const large = ir.nativeStyleRules!.rules.find(rule => rule.sourceKey === "--lg")!;
    large.declarations.find(decl => decl.property === "font-size")!.value = "28px";
    expect(nativeLoopVisualPlan(ir)?.sizePixels.lg).toBe(28);
  });

  it("rejects a missing style carrier or a new native declaration", () => {
    const absent = fixture();
    absent.nativeStyleRules!.rules = absent.nativeStyleRules!.rules.filter(rule =>
      !rule.predicates.some(predicate => predicate.kind === "variant" && predicate.axis === "thickness" && predicate.value === "bold"));
    expect(() => nativeLoopVisualPlan(absent)).toThrow("size and thickness carriers must cover");
    const extra = fixture();
    extra.nativeStyleRules!.rules.find(rule => rule.sourceKey === "visual")!.declarations.push({ property: "outline-color", value: "#123456" });
    expect(() => nativeLoopVisualPlan(extra)).toThrow("ring style requires circular solid borders");
  });

  it("refuses an altered loop and anatomy rather than rendering a plausible ring", () => {
    const keyframes = fixture();
    keyframes.motion.loops[0]!.effect.keyframes[1]!.value = 180;
    expect(() => nativeLoopVisualPlan(keyframes)).toThrow("only a declared full-turn repeat rotation");
    const anatomy = fixture();
    anatomy.dom!.children[0]!.attrs["aria-hidden"] = "false";
    expect(() => nativeLoopVisualPlan(anatomy)).toThrow("one owned decorative visual child");
  });

  it("emits the normalized ring plan into a renamed Godot scene", () => {
    const ir = fixture();
    ir.name = "WaitingIndicator";
    const files = createGodotEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot: root });
    const script = files.find(file => file.relativePath === "WaitingIndicator/WaitingIndicator.gd")!.contents;
    const capabilities = JSON.parse(files.find(file => file.relativePath === "WaitingIndicator/capabilities.json")!.contents);
    expect(script).toContain('class_name DSWaitingIndicator');
    expect(script).toContain('runtime/loop_visual.gd');
    expect(capabilities).toMatchObject({ operation: "loop-visual", targetPart: "visual", durationMs: 800,
      sizePixels: { xs: 12, lg: 24 }, thicknessPixels: { hairline: 2, bold: 4 },
      trackColor: "#d0d0d0", accentColor: "#d92d2e", excludedProps: ["inline", "showAfterMs"] });
  });

  it("leaves a different loop family to its admitted shape planner", () => {
    expect(nativeLoopVisualPlan(fixture("Skeleton"))).toBeUndefined();
  });
});
