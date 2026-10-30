import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../contract.js";
import { buildComponentIR } from "../ir.js";
import { generateVueComponentSource } from "./vue/component-source.js";

function inputLikeContract(
  valueType: "string" | "boolean",
  commit: "input" | "change",
): ComponentContract {
  return {
    name: "FixtureValueInput",
    layer: "primitive",
    cssPrefix: "fixture-value-input",
    anatomy: {
      parts: ["root"],
      details: { root: { role: "trigger", interactive: true } },
      dom: {
        tag: "input",
        part: "root",
        bindings: { value: "channel:value.value" },
      },
    },
    formControl: {
      part: "root",
      channel: "value",
      valueModel: valueType === "boolean" ? "boolean" : "text",
      commit,
    },
    props: {
      designed: {
        members: [
          {
            name: "value",
            propType: { kind: valueType === "boolean" ? "boolean" : "string" },
            description: "current value",
          },
          {
            name: "onChange",
            propType: {
              kind: "callback",
              params: [{ name: "value", type: { kind: valueType } }],
              returns: { kind: "void" },
            },
            description: "change handler",
          },
        ],
      },
    },
    channels: {
      value: {
        value: "value",
        onChange: "onChange",
        valueType,
        description: "value channel",
      },
    },
  } as unknown as ComponentContract;
}

describe("Vue form-control commit timing", () => {
  it("lowers a text control's input commit to @input (keystroke)", () => {
    const ir = buildComponentIR(inputLikeContract("string", "input"), { allContracts: new Map() });
    const src = generateVueComponentSource(ir);
    // The value channel setter fires on @input, not the blur-timed @change.
    expect(src).toMatch(/<input\b[^>]*@input=/);
    expect(src).not.toMatch(/@change=/);
  });

  it("lowers a boolean control's change commit to @change", () => {
    const ir = buildComponentIR(inputLikeContract("boolean", "change"), { allContracts: new Map() });
    const src = generateVueComponentSource(ir);
    // Boolean (checkbox/switch) fires the native change event on toggle;
    // there is no keystroke to react to, so @input would be wrong.
    expect(src).toMatch(/@change="\(e\) => behavior\.setValue\(.*\.checked\)"/);
    expect(src).not.toMatch(/@input=/);
  });

  it("does not override an explicit text change commit from value-type lore", () => {
    const ir = buildComponentIR(inputLikeContract("string", "change"), { allContracts: new Map() });
    const src = generateVueComponentSource(ir);
    expect(src).toMatch(/<input\b[^>]*@change=/);
    expect(src).not.toMatch(/@input=/);
  });
});
