import { describe, expect, it } from "vitest";
import { buildComponentIR } from "../../ir.js";
import { corpusIR, loadCorpusContract } from "../corpus-fixtures.js";
import { generateReactNativeComponentSource, stateStyleFacts, variantStyleFacts } from "./component-source.js";

describe("React Native disabled text state projection", () => {
  it("joins the actual Links disabled token into its text wrapper, separate from the Pressable", () => {
    const ir = corpusIR("Links");
    expect(ir.cssBlocks.find(block => block.selector === '.links[aria-disabled="true"]')).toBeDefined();
    const disabled = stateStyleFacts(ir).find(state => state.stateKey === "disabled");
    expect(disabled?.rootEntries.find(entry => entry.rnProp === "color")?.tokenName).toBe("links.color.foreground.disabled");
    const { componentFile, stylesFile, tokensFile } = generateReactNativeComponentSource(ir);
    expect(stylesFile).toContain("rootText_state_disabled: definedStyle({ color:");
    expect(stylesFile).not.toContain("root_state_disabled:");
    expect(tokensFile).toContain('name: "links.color.foreground.disabled"');
    expect(componentFile).toContain('(String(disabled) === "true") ? styles.rootText_state_disabled : undefined');
  });

  it("reads renamed availability bindings and rejects neighbouring attribute selectors", () => {
    const contract = loadCorpusContract("Links");
    const disabled = contract.props!.designed!.members!.find(prop => prop.name === "disabled")!;
    disabled.name = "unavailable";
    if (!contract.anatomy || Array.isArray(contract.anatomy) || !contract.anatomy.dom) throw new Error("Links requires an authored DOM root");
    contract.anatomy.dom.bindings!["aria-disabled"] = "prop:unavailable";
    const ir = buildComponentIR(contract);
    expect(generateReactNativeComponentSource(ir).componentFile).toContain('(String(unavailable) === "true") ? styles.rootText_state_disabled : undefined');
    ir.cssBlocks = ir.cssBlocks.map(block => block.selector === '.links[aria-disabled="true"]' ? { ...block, selector: '.links[aria-disabled="true-ish"]' } : block);
    expect(stateStyleFacts(ir).find(state => state.stateKey === "disabled")).toBeUndefined();
  });

  it("preserves guarded pressed view styles for Button", () => {
    const { componentFile, stylesFile } = generateReactNativeComponentSource(corpusIR("Button"));
    expect(componentFile).toContain("style={({ pressed }) =>");
    expect(componentFile).toContain("pressed ? styles.root_state_pressed : undefined");
    expect(stylesFile).toContain("root_state_pressed: definedStyle({ backgroundColor:");
  });

  it("consumes Button disabled text on its rendered label while preserving its view state", () => {
    const { componentFile, stylesFile, tokensFile } = generateReactNativeComponentSource(corpusIR("Button"));
    expect(componentFile).toContain("disabled ? styles.root_state_disabled : undefined");
    expect(componentFile).toMatch(/renderTextChildren\(children, \{ style: \[[^\]]*\(disabled\) \? styles\.rootText_state_disabled : undefined\] \}\)/);
    expect(stylesFile).toContain('rootText_state_disabled: definedStyle({ color: (tokens.root?.["button.color.foreground.disabled"]');
    expect(tokensFile).toContain('name: "button.color.foreground.disabled"');
  });

  it("omits disabled text artifacts without a rendered text consumer", () => {
    const ir = corpusIR("Input");
    expect(stateStyleFacts(ir).find(state => state.stateKey === "disabled")?.rootEntries.some(entry => entry.layer === "text")).toBe(true);
    const { componentFile, stylesFile, tokensFile } = generateReactNativeComponentSource(ir);
    expect(componentFile).toContain("<TextInput");
    expect(componentFile).toContain("disabled ? styles.root_state_disabled : undefined");
    expect(stylesFile).not.toContain("rootText_state_disabled");
    expect(tokensFile).not.toContain('name: "input.color.text.disabled"');
  });

  it("omits generic root state artifacts when the root has no availability consumer", () => {
    const ir = corpusIR("Command");
    expect(stateStyleFacts(ir).find(state => state.stateKey === "disabled")?.rootEntries.some(entry => entry.rnProp === "opacity")).toBe(true);
    const { componentFile, stylesFile, tokensFile } = generateReactNativeComponentSource(ir);
    expect(componentFile).not.toContain("styles.root_state_disabled");
    expect(stylesFile).not.toContain("root_state_disabled");
    expect(tokensFile).not.toContain('name: "command.opacity.disabled"');
  });

  it("imports TextStyle for a disabled-only text variant beside view-only base variants", () => {
    const ir = corpusIR("Links");
    const disabled = ir.cssBlocks.find(block => block.selector === '.links[aria-disabled="true"]')!;
    const token = ir.tokenScopes.find(scope => scope.scope === "root")!.values.find(value => value.name === "links.color.foreground.disabled")!;
    ir.cssBlocks = [
      { selector: ".links", declarations: { gap: "2px" } },
      { selector: ".links--small", declarations: { opacity: "0.5" } },
      disabled,
    ];
    ir.tokenScopes.find(scope => scope.scope === "variant_small")!.values.push({ ...token });
    expect(variantStyleFacts(ir).every(fact => fact.textEntries.length === 0)).toBe(true);
    const { componentFile, stylesFile } = generateReactNativeComponentSource(ir);
    expect(componentFile).toMatch(/import type \{[^}]*\bTextStyle\b[^}]*\} from "react-native"/);
    expect(componentFile).toContain("const textDisabledStyleForSize =");
    expect(componentFile).toContain('(String(disabled) === "true") ? textDisabledStyleForSize : undefined');
    expect(stylesFile).toContain("rootText_variant_small_disabled: definedStyle({ color:");
  });
});
