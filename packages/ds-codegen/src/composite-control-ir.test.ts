import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "./contract.js";
import { buildComponentIR } from "./ir.js";

const CONTRACTS_ROOT = resolve(__dirname, "../../ds-contracts/components");

function loadContract(name: string): ComponentContract {
  return JSON.parse(
    readFileSync(resolve(CONTRACTS_ROOT, name, `${name}.contract.json`), "utf8"),
  ) as ComponentContract;
}

function findPart(node: ReturnType<typeof buildComponentIR>["dom"], part: string) {
  if (!node) throw new Error("fixture requires anatomy.dom");
  if (node.part === part) return node;
  for (const child of node.children) {
    const match = findPartOrNull(child, part);
    if (match) return match;
  }
  throw new Error(`missing part ${part}`);
}

function findPartOrNull(
  node: NonNullable<ReturnType<typeof buildComponentIR>["dom"]>,
  part: string,
): typeof node | null {
  if (node.part === part) return node;
  for (const child of node.children) {
    const match = findPartOrNull(child, part);
    if (match) return match;
  }
  return null;
}

describe("CompositeControlIR", () => {
  it.each([
    ["Select", "option", "selection", "collection-selection", "activation", "click", "channelUpdate"],
    ["RadioGroup", "option", "selection", "collection-selection", "change", "change", "channelCall"],
    ["OTP", "field", "value", "segmented-text", "input", "input", "channelUpdate"],
  ] as const)(
    "lowers %s repeated-item ownership and synthesizes its commit event",
    (name, part, channel, interactionModel, commit, event, updateKind) => {
      const ir = buildComponentIR(loadContract(name));
      expect(ir.compositeControl).toMatchObject({
        part: { name: part },
        channel: { name: channel },
        interactionModel,
        commit,
        event,
        update: { kind: updateKind, channel },
      });
      expect(findPart(ir.dom, part).events[event]).toMatchObject({
        kind: updateKind,
        channel,
      });
    },
  );

  it("fails loud when anatomy duplicates composite-control event authority", () => {
    const contract = loadContract("Select");
    const dom = contract.anatomy && !Array.isArray(contract.anatomy)
      ? contract.anatomy.dom
      : undefined;
    // Probe built from the INTACT contract: Select's roving keyboard
    // behaviors legitimately require compositeControl, so stripping it here
    // would fail in fixture preparation instead of exercising the
    // duplicate-authority assertion below.
    const option = findPartOrNull(buildComponentIR(contract).dom!, "option");
    if (!dom || !option) throw new Error("fixture requires option DOM");

    const rawOption = (() => {
      const visit = (node: NonNullable<typeof dom>): NonNullable<typeof dom> | null => {
        if (node.part === "option") return node;
        for (const child of node.children ?? []) {
          const match = visit(child);
          if (match) return match;
        }
        return null;
      };
      return visit(dom);
    })();
    if (!rawOption) throw new Error("fixture requires raw option DOM");
    rawOption.events = { click: "channel:selection.onChange(iter:item.value)" };

    expect(() => buildComponentIR(contract)).toThrow(
      /compositeControl owns the selection commit; remove authored anatomy\.dom events/,
    );
  });

  it("rejects arbitrary update strings instead of passing code to emitters", () => {
    const contract = loadContract("OTP");
    contract.compositeControl = {
      ...contract.compositeControl!,
      update: "doSomething(iter:index)",
    };
    expect(() => buildComponentIR(contract)).toThrow(
      /must be a closed channelCall or channelUpdate expression/,
    );
  });
});
