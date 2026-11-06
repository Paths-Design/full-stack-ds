import { describe, expect, it } from "vitest";
import ts from "typescript";
import type { ComponentContract } from "../contract.js";
import { buildComponentIR, type ComponentIR } from "../ir.js";
import { allCorpusComponentNames, corpusIR } from "./corpus-fixtures.js";
import { generateReactTest } from "./react/tests.js";
import { generateVueTest } from "./vue/tests.js";
import { generateSvelteTest } from "./svelte/tests.js";
import { generateLitTest } from "./lit/tests.js";

const emitters = [
  { name: "react", emit: generateReactTest, change: true },
  { name: "vue", emit: generateVueTest, change: true },
  { name: "svelte", emit: generateSvelteTest, change: false },
  { name: "lit", emit: generateLitTest, change: false },
];

/** Inspect test bodies, so an assertion in another test cannot satisfy the claim. */
function callbackCases(source: string): Array<{ handler: string; body: string }> {
  const file = ts.createSourceFile("generated.test.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const cases: Array<{ handler: string; body: string }> = [];
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "it") {
      const [title, callback] = node.arguments;
      if (title && ts.isStringLiteral(title) && callback && ts.isArrowFunction(callback)) {
        const match = /^calls (\w+) when .+ changes$/.exec(title.text);
        if (match) cases.push({ handler: match[1], body: callback.body.getText(file) });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return cases;
}

function expectCallbackObservation(source: string): void {
  for (const { handler, body } of callbackCases(source)) {
    expect(body).toContain(`expect(${handler}Spy).toHaveBeenCalled();`);
    expect(body).toMatch(/(?:\.click\(|fireEvent\.change\(|\.trigger\("(?:click|change)"\))/);
    expect(body).not.toContain("not.toThrow()");
  }
}

function rootChannel(valueType: "boolean" | "string"): ComponentIR {
  const contract: ComponentContract = {
    name: "ChannelFixture",
    cssPrefix: "channel-fixture",
    anatomy: { parts: ["root"] },
    props: { styled: { members: [
      { name: "value", type: valueType },
      { name: "onValueChange", type: `(value: ${valueType}) => void` },
    ] } },
    channels: { value: { value: "value", onChange: "onValueChange", valueType } },
    a11y: { role: valueType === "boolean" ? "switch" : "textbox" },
  };
  const ir = buildComponentIR(contract);
  // This fixture supplies the native root capability consumed by the test plan.
  return { ...ir, root: { ...ir.root, element: "input" } };
}

describe.each(emitters)("$name generated callback behavior", ({ emit, change }) => {
  it("keeps reachable click cases with an event and callback observation", () => {
    const source = emit(rootChannel("boolean"));
    expect(callbackCases(source).map((entry) => entry.handler)).toEqual(["onValueChange"]);
    expectCallbackObservation(source);
  });

  it("emits native change cases only when the backend supplies a change action", () => {
    const source = emit(rootChannel("string"));
    expect(callbackCases(source).map((entry) => entry.handler)).toEqual(change ? ["onValueChange"] : []);
    expectCallbackObservation(source);
  });

  it("omits callback claims when a root has no supported action", () => {
    const ir = rootChannel("string");
    ir.root.element = "div";
    expect(callbackCases(emit(ir))).toEqual([]);
  });

  it("omits unreachable date-grid callbacks instead of treating rendering as behavior", () => {
    const source = emit(corpusIR("Calendar"));
    expect(callbackCases(source)).toEqual([]);
  });

  it("never emits a corpus callback claim without an action and callback observation", () => {
    for (const name of allCorpusComponentNames()) {
      expectCallbackObservation(emit(corpusIR(name)));
    }
  });
});

it("rejects the former render-only callback oracle", () => {
  const source = `it("calls onChange when value changes", async () => {
    const onChangeSpy = vi.fn();
    expect(() => render(Component, { onChange: onChangeSpy })).not.toThrow();
  });`;
  expect(() => expectCallbackObservation(source)).toThrow();
});
