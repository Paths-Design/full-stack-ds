import dialog from "../../ds-contracts/components/Dialog/Dialog.contract.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "./contract.js";
import { buildComponentIR, focusTargetProps } from "./ir.js";
import { generateReactHookSource } from "./frameworks/react/hook-source.js";
import { generateVueHookSource } from "./frameworks/vue/hook-source.js";
import { generateSvelteHookSource } from "./frameworks/svelte/hook-source.js";
import { generateAngularHookSource } from "./frameworks/angular/hook-source.js";
import { generateLitHookSource } from "./frameworks/lit/hook-source.js";

function unfamiliarPolicy(): ComponentContract {
  const contract = JSON.parse(JSON.stringify(dialog)
    .replaceAll('"initialFocus"', '"entryTarget"')
    .replaceAll('"returnFocus"', '"exitTarget"')) as ComponentContract;
  contract.name = "UnfamiliarSurface";
  contract.focus = { strategy: "trap", initialFocus: "prop:entryTarget", returnFocus: "prop:exitTarget" };
  return contract;
}

describe("contract focus target props", () => {
  it("derives targets from the policy rather than conventional public names", () => {
    expect(focusTargetProps(buildComponentIR(unfamiliarPolicy()))).toEqual([
      { target: "initialFocus", prop: "entryTarget" },
      { target: "returnFocus", prop: "exitTarget" },
    ]);
  });

  it("does not install trapping target bindings for a non-trap strategy", () => {
    const contract = unfamiliarPolicy();
    contract.focus = { strategy: "roving" };
    expect(focusTargetProps(buildComponentIR(contract))).toEqual([]);
  });

  for (const [framework, emit, source] of [
    ["react", generateReactHookSource, "options"],
    ["vue", generateVueHookSource, "options"],
    ["svelte", generateSvelteHookSource, "opts"],
    ["angular", generateAngularHookSource, "options"],
    ["lit", generateLitHookSource, "opts"],
  ] as const) {
    it(`${framework} wires renamed policy props into the primitive`, () => {
      const emitted = emit(buildComponentIR(unfamiliarPolicy()));
      expect(emitted).not.toBeNull();
      const prefix = framework === "react" || framework === "vue" ? "" : "get";
      const initial = prefix ? "getInitialFocus" : "initialFocus";
      const returnTo = prefix ? "getReturnFocus" : "returnFocus";
      expect(emitted).toContain(`${initial}: ${source}.entryTarget`);
      expect(emitted).toContain(`${returnTo}: ${source}.exitTarget`);
      expect(emitted).not.toContain("initialFocusRef: options.entryTarget");
    });
  }
});
