import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract, ContractDismissalTrigger } from "./contract.js";
import { buildComponentIR } from "./ir.js";
import { dismissalGateExpression, dismissalGateProps } from "./dismissal-gates.js";
import { generateVueComponentSource } from "./frameworks/vue/component-source.js";
import { generateAngularComponentSource } from "./frameworks/angular/component-source.js";
import { generateLitComponentSource } from "./frameworks/lit/component-source.js";

function fixture(): ComponentContract {
  return JSON.parse(readFileSync(resolve(__dirname, "../../ds-contracts/components/Dialog/Dialog.contract.json"), "utf8"));
}

describe("dismissal conjunction", () => {
  it("forwards renamed dismissal policies as live properties to persistent behaviors", () => {
    const contract = fixture();
    contract.name = "PolicyProbe";
    contract.props!.styled!.members!.find(prop => prop.name === "closeOnEscape")!.name = "allowExit";
    contract.dismissal!.triggers![0].enabledBy = "allowExit";
    const ir = buildComponentIR(contract);
    expect(generateVueComponentSource(ir)).toContain("get allowExit() { return props.allowExit; }");
    expect(generateAngularComponentSource(ir)).toContain("get allowExit() { return host.allowExit; }");
    expect(generateLitComponentSource(ir)).toContain("get allowExit() { return host.allowExit; }");
  });
  it("normalizes renamed boolean gates and requires both, including defaulted omissions", () => {
    const contract = fixture();
    const members = contract.props!.styled!.members!;
    const gateA = members.find(prop => prop.name === "dismissible")!;
    const gateB = members.find(prop => prop.name === "closeOnBackdropClick")!;
    // Add independent names so the original DOM bindings remain valid.
    members.push({ ...gateA, name: "allowDismiss" }, { ...gateB, name: "allowBackdrop" });
    const trigger = contract.dismissal!.triggers![1];
    trigger.enabledByAll = ["allowDismiss", "allowBackdrop"];
    const normalized = buildComponentIR(contract).behavior.normalizedDismissalTriggers[1];
    expect(dismissalGateProps(normalized)).toEqual(["allowDismiss", "allowBackdrop"]);
    const expression = dismissalGateExpression(normalized, name => `props.${name}`);
    const evaluate = new Function("props", `return ${expression}`);
    for (const a of [true, false, undefined]) for (const b of [true, false, undefined]) {
      expect(evaluate({ allowDismiss: a, allowBackdrop: b })).toBe((a ?? true) && (b ?? true));
    }
    normalized.defaultEnabled = false;
    expect(new Function("props", `return ${dismissalGateExpression(normalized, name => `props.${name}`)}`)({})).toBe(false);
    expect(contract.dismissal!.triggers![0]).toMatchObject({ event: "escape", enabledBy: "closeOnEscape" });
  });

  it.each([
    { enabledByAll: [] },
    { enabledByAll: ["dismissible", "dismissible"] },
    { enabledByAll: ["missing"] },
    { enabledByAll: ["size"] },
    { enabledByAll: ["dismissible"], enabledBy: "closeOnBackdropClick" },
    { enabledByAll: ["dismissible"], event: "escape" },
  ] satisfies Partial<ContractDismissalTrigger>[])("rejects invalid or unsupported gates: %j", invalid => {
    const contract = fixture();
    Object.assign(contract.dismissal!.triggers![1], invalid);
    expect(() => buildComponentIR(contract)).toThrow(/dismissal enabledByAll/);
  });

  it("retains scalar and ungated policy defaults", () => {
    expect(dismissalGateExpression({ event: "escape", enabledByProp: "permit", defaultEnabled: false }, name => name)).toBe("(permit ?? false)");
    expect(dismissalGateExpression({ event: "overlayClick", defaultEnabled: false }, name => name)).toBe("false");
  });
});
