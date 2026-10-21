import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { generateReactNativeComponentSource } from "./component-source.js";

const select = JSON.parse(
  readFileSync(resolve(__dirname, "../../../../ds-contracts/components/Select/Select.contract.json"), "utf8"),
) as ComponentContract;

describe("React Native accessibility roles", () => {
  const generated = generateReactNativeComponentSource(buildComponentIR(select)).componentFile;
  /** The rendered tree: everything from the component's JSX return on. */
  const source = generated.slice(generated.indexOf("return (\n"));
  const trigger = source.slice(source.indexOf("<Pressable"), source.indexOf(">", source.indexOf("accessibilityState", source.indexOf("<Pressable"))));

  // A declared combobox keeps its role: React Native exposes combobox, and
  // dropping the unmapped role left Select's trigger with no role at all.
  it("lowers a declared combobox role on a pressable trigger", () => {
    expect(trigger).toContain('accessibilityRole="combobox"');
    expect(trigger).toContain("accessibilityLabel={triggerLabel}");
    expect(trigger).toContain('expanded: String(open) === "true"');
  });

  it("leaves the combobox state off the wrapper View, so one element carries it", () => {
    const wrapper = source.slice(source.indexOf("<View"), source.indexOf("<Pressable"));
    expect(wrapper).not.toContain("expanded");
    expect(wrapper).not.toContain("triggerLabel");
    expect((source.match(/accessibilityRole="combobox"/g) ?? []).length).toBe(1);
  });
});
