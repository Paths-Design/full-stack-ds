import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "./contract.js";
import { buildComponentIR } from "./ir.js";
import { generateAngularComponentSource } from "./frameworks/angular/component-source.js";
import { generateLitComponentSource } from "./frameworks/lit/component-source.js";
import { generateReactComponentSource } from "./frameworks/react/component-source.js";
import { generateSvelteComponentSource } from "./frameworks/svelte/component-source.js";
import { generateVueComponentSource } from "./frameworks/vue/component-source.js";

const CONTRACTS_ROOT = resolve(__dirname, "../../ds-contracts/components");

function loadContract(name: string): ComponentContract {
  return JSON.parse(
    readFileSync(resolve(CONTRACTS_ROOT, name, `${name}.contract.json`), "utf8"),
  ) as ComponentContract;
}

function irFor(name: string) {
  return buildComponentIR(loadContract(name));
}

describe("FormControlIR", () => {
  it.each([
    ["Input", "root", "value", "text", "input", "input"],
    ["TextField", "field", "value", "text", "input", "input"],
    ["Checkbox", "input", "checked", "boolean", "change", "change"],
    ["Switch", "input", "checked", "boolean", "change", "change"],
    ["ToggleSwitch", "root", "checked", "boolean", "activation", "click"],
    ["Command", "input", "search", "text", "input", "input"],
  ] as const)(
    "lowers %s control facts and synthesizes its commit event",
    (name, part, channel, valueModel, commit, event) => {
      const ir = irFor(name);
      expect(ir.formControl).toMatchObject({
        part: { name: part },
        channel: { name: channel },
        valueModel,
        commit,
        event,
      });
      const target = findPart(ir.dom!, part);
      expect(Object.keys(target.events)).toEqual([event]);
      expect(target.events[event]).toMatchObject({
        kind: "channel",
        channel,
        field: "onChange",
      });
    },
  );

  it("fails loud when an authored DOM event duplicates form-control authority", () => {
    const contract = loadContract("Input");
    const dom = contract.anatomy && !Array.isArray(contract.anatomy)
      ? contract.anatomy.dom
      : undefined;
    if (!dom) throw new Error("fixture requires anatomy.dom");
    dom.events = { change: "channel:value.onChange" };

    expect(() => buildComponentIR(contract)).toThrow(
      /formControl owns the value commit; remove anatomy\.dom event "change"/,
    );
  });

  it("fails loud when the value model disagrees with the channel type", () => {
    const contract = loadContract("Input");
    contract.formControl = {
      ...contract.formControl!,
      valueModel: "boolean",
      commit: "change",
    };
    expect(() => buildComponentIR(contract)).toThrow(
      /valueModel "boolean" requires channel "value" to have valueType "boolean"/,
    );
  });
});

describe("form-control emitter consumption", () => {
  it("uses per-input commit timing in all five web targets", () => {
    const ir = irFor("Input");
    const react = generateReactComponentSource(ir, "../../primitives");
    const vue = generateVueComponentSource(ir);
    const svelte = generateSvelteComponentSource(ir);
    const angular = generateAngularComponentSource(ir);
    const lit = generateLitComponentSource(ir);

    // React's synthetic onChange is its idiomatic per-input text event; the
    // other targets spell the same semantic commit as the native input event.
    expect(react).toMatch(/as="input"[^>]*onChange=/);
    expect(react).not.toMatch(/onInput=/);
    expect(vue).toMatch(/<input\b[^>]*@input=/);
    expect(vue).not.toMatch(/@change=/);
    expect(svelte).toMatch(/<input\b[^>]*oninput=/);
    expect(svelte).not.toMatch(/onchange=/);
    expect(angular).toMatch(/<input\b[^>]*\(input\)=/);
    expect(angular).not.toMatch(/\(change\)=/);
    expect(lit).toMatch(/<input\b[^>]*@input=/);
    expect(lit).not.toMatch(/@change=/);
  });

  it("binds Field association to a nested control part, not its wrapper", () => {
    const ir = irFor("Checkbox");
    expect(ir.fieldAssociation?.consumerPart).toBe("input");

    const sources = [
      generateReactComponentSource(ir, "../../primitives"),
      generateVueComponentSource(ir),
      generateSvelteComponentSource(ir),
      generateAngularComponentSource(ir),
    ];
    for (const source of sources) {
      const label = source.match(/<label\b[^>]*>/)?.[0] ?? "";
      expect(label).not.toContain("controlId");
      expect(source.lastIndexOf("controlId")).toBeGreaterThan(
        source.indexOf("<input"),
      );
    }

    // Lit intentionally does not bridge light/shadow-root idrefs.
    expect(generateLitComponentSource(ir)).not.toContain("controlId");
  });

  it("does not bind association to unnamed parts when no consumer exists", () => {
    const ir = irFor("Icon");
    expect(ir.fieldAssociation).toBeUndefined();
    expect(generateReactComponentSource(ir, "../../primitives")).not.toContain(
      "fieldAssociation?.controlId",
    );
  });
});

function findPart(node: NonNullable<ReturnType<typeof irFor>["dom"]>, part: string) {
  if (node.part === part) return node;
  for (const child of node.children) {
    const found = findPartMaybe(child, part);
    if (found) return found;
  }
  throw new Error(`part ${part} not found`);
}

function findPartMaybe(
  node: NonNullable<ReturnType<typeof irFor>["dom"]>,
  part: string,
): typeof node | undefined {
  if (node.part === part) return node;
  for (const child of node.children) {
    const found = findPartMaybe(child, part);
    if (found) return found;
  }
  return undefined;
}
