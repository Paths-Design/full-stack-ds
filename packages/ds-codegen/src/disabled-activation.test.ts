import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "./contract.js";
import { buildComponentIR, hasDisabledActivation, type ComponentIR } from "./ir.js";
import { generateReactComponentSource } from "./frameworks/react/component-source.js";
import { generateVueComponentSource } from "./frameworks/vue/component-source.js";
import { generateSvelteComponentSource } from "./frameworks/svelte/component-source.js";
import { generateAngularComponentSource } from "./frameworks/angular/component-source.js";
import { generateLitComponentSource } from "./frameworks/lit/component-source.js";

function fixture(tag = "a", callback = true, staticHref?: string): ComponentContract {
  const contract = JSON.parse(readFileSync(resolve(__dirname, "../../ds-contracts/components/Links/Links.contract.json"), "utf8"));
  contract.name = "RouteProbe";
  const rename: Record<string, string> = { disabled: "unavailable", href: "destination", onClick: "onNavigate" };
  for (const prop of contract.props.designed.members) prop.name = rename[prop.name] ?? prop.name;
  contract.anatomy.dom.tag = tag;
  contract.anatomy.details.root.tag = tag;
  contract.anatomy.dom.bindings.href = "prop:destination";
  contract.anatomy.dom.bindings["aria-disabled"] = "prop:unavailable";
  contract.anatomy.dom.events = callback ? { click: "prop:onNavigate" } : {};
  if (staticHref !== undefined) {
    contract.anatomy.dom.attrs.href = staticHref;
    delete contract.anatomy.dom.bindings.href;
  }
  return contract;
}

describe("disabled anchor host facts", () => {
  it("derives availability from an authored binding while retaining the destination binding", () => {
    const ir = buildComponentIR(fixture());
    expect(ir.dom?.disabledActivation).toEqual({ disabled: { kind: "prop", prop: "unavailable" } });
    expect(ir.dom?.bindings.href).toEqual({ kind: "prop", prop: "destination" });
    expect(hasDisabledActivation(ir.dom)).toBe(true);
    expect(hasDisabledActivation(undefined)).toBe(false);
  });
  it("does not infer navigation suppression for a non-anchor host or absent declaration", () => {
    expect(buildComponentIR(fixture("span")).dom?.disabledActivation).toBeUndefined();
    const contract = fixture();
    const anatomy = contract.anatomy as { dom: { bindings: Record<string, string> } };
    delete anatomy.dom.bindings["aria-disabled"];
    expect(buildComponentIR(contract).dom?.disabledActivation).toBeUndefined();
  });
  it("normalizes a static destination without mutating its contract source", () => {
    const contract = fixture("a", true, "https://example.test/docs");
    const ir = buildComponentIR(contract);
    expect(ir.dom?.attrs.href).toBeUndefined();
    expect(ir.dom?.bindings.href).toEqual({ kind: "literal", value: "https://example.test/docs" });
    const anatomy = contract.anatomy as { dom: { attrs: Record<string, string> } };
    expect(anatomy.dom.attrs.href).toBe("https://example.test/docs");
  });
  it.each([
    ["React", (ir: ComponentIR) => generateReactComponentSource(ir, "../../primitives/stack"), "unavailable", "undefined", "onNavigate"],
    ["Vue", generateVueComponentSource, "props.unavailable", "undefined", "props.onNavigate"],
    ["Svelte", generateSvelteComponentSource, "unavailable", "undefined", "onNavigate"],
    ["Angular", generateAngularComponentSource, "unavailable", "null", "onNavigate"],
    ["Lit", generateLitComponentSource, "this.unavailable", "undefined", "this.onNavigate"],
  ] as const)("%s lowers guarded callbacks and actual href omission from renamed facts", (_name, generate, disabled, missing, callback) => {
    const code = generate(buildComponentIR(fixture()));
    expect(code).toContain(`isActivationDisabled(${disabled}) ? ${missing} :`);
    expect(code).toContain(`isActivationDisabled(${disabled}))`);
    expect(code).toContain(`(${callback})?.(`);
    expect(code).toContain("canActivateInteraction");
    if (_name === "Vue") {
      expect(code).toContain("defineOptions({ inheritAttrs: false });");
      expect(code).toContain('v-bind="$attrs"');
      expect(code.indexOf('v-bind="$attrs"')).toBeLessThan(code.indexOf(':href="isActivationDisabled'));
    }
    const withoutCallback = generate(buildComponentIR(fixture("a", false)));
    expect(withoutCallback).toContain("canActivateInteraction");
    expect(withoutCallback).not.toContain(`(${callback})?.(`);
    const staticDestination = generate(buildComponentIR(fixture("a", true, "https://example.test/docs")));
    expect(staticDestination).toContain(`isActivationDisabled(${disabled}) ? ${missing} :`);
  });
});
