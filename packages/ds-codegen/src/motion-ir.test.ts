import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "./contract.js";
import { emitCss } from "./css.js";
import { buildComponentIR } from "./ir.js";

function loadContract(name: string): ComponentContract {
  return JSON.parse(readFileSync(
    resolve(__dirname, "../../ds-contracts/components", name, `${name}.contract.json`),
    "utf8",
  )) as ComponentContract;
}

describe("motion declaration custody", () => {
  it("carries a real legacy trigger without interpreting its mismatched state vocabulary", () => {
    const ir = buildComponentIR(loadContract("Accordion"));
    expect(ir.motion.transitions[0]).toEqual({
      name: "expand",
      trigger: "openness=collapsed→expanded",
      realization: "declaration-only",
      phase: "enter",
      properties: ["height", "opacity"],
      durationRef: "accordion.motion.duration",
      easingRef: "accordion.motion.easing",
    });
    expect(ir.motion.transitions[1].trigger).toBe("openness=expanded→collapsed");
  });

  it.each([undefined, "", "  custom event → next  ", "open=false→true"])(
    "preserves absent or arbitrary trigger %j without granting execution",
    (trigger) => {
      const contract = loadContract("Accordion");
      contract.name = "UnfamiliarDisclosure";
      contract.motion = {
        transitions: [{ name: "respond", ...(trigger === undefined ? {} : { trigger }) }],
      };
      expect(buildComponentIR(contract).motion.transitions).toEqual([{
        name: "respond",
        trigger: trigger ?? null,
        realization: "declaration-only",
        phase: null,
        properties: [],
        durationRef: null,
        easingRef: null,
      }]);
    },
  );

  it("keeps undeclared motion empty and preserves default reduced-motion handling", () => {
    const contract = loadContract("Accordion");
    delete contract.motion;
    expect(buildComponentIR(contract).motion).toEqual({
      reducedMotion: null,
      honorsReducedMotion: true,
      transitions: [],
    });
  });

  it("does not turn a carried trigger into emitted animation behavior", () => {
    const contract = loadContract("Skeleton");
    const before = emitCss(buildComponentIR(contract));
    expect(before).toContain("@keyframes");
    contract.motion = {
      transitions: [{
        name: "new-entry",
        trigger: "mounted",
        phase: "enter",
        properties: ["opacity"],
        duration: "unresolved.duration",
      }],
    };
    const ir = buildComponentIR(contract);
    expect(ir.motion.transitions[0].trigger).toBe("mounted");
    expect(ir.motion.transitions[0].realization).toBe("declaration-only");
    expect(emitCss(ir)).toBe(before);
  });
});
