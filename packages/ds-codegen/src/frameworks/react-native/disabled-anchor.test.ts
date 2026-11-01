import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { buildComponentIR } from "../../ir.js";
import { corpusIR, loadCorpusContract } from "../corpus-fixtures.js";
import { generateReactNativeComponentSource } from "./component-source.js";

function renamedAnchor(withCallback = true) {
  const contract = loadCorpusContract("Links");
  contract.name = "Destination";
  contract.cssPrefix = "destination";
  // Activation is independent of Links' namespaced design-slot sidecars.
  delete contract.styles;
  delete contract.tokens;
  for (const prop of contract.props!.designed!.members!) {
    if (prop.name === "disabled") prop.name = "unavailable";
    if (prop.name === "href") prop.name = "destination";
    if (prop.name === "onClick") prop.name = "onActivate";
  }
  if (!contract.anatomy || Array.isArray(contract.anatomy) || !contract.anatomy.dom) throw new Error("Links requires an authored DOM root");
  contract.anatomy.dom.bindings = { href: "prop:destination", "aria-disabled": "prop:unavailable" };
  contract.anatomy.dom.events = withCallback ? { click: "prop:onActivate" } : {};
  return buildComponentIR(contract);
}

/** Execute the emitted handler; the boundary is Linking, without a native OS. */
function handler(disabled: boolean, callback?: (event: { defaultPrevented: boolean; preventDefault(): void }) => void, authoredAvailability = true) {
  const ir = renamedAnchor(callback !== undefined);
  if (!authoredAvailability) {
    delete ir.dom!.bindings["aria-disabled"];
    delete ir.dom!.disabledActivation;
  }
  const source = generateReactNativeComponentSource(ir).componentFile;
  const ast = ts.createSourceFile("Destination.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const expressions: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxAttribute(node) && node.name.getText(ast) === "onPress" && node.initializer && ts.isJsxExpression(node.initializer)) {
      expressions.push(node.initializer.expression!.getText(ast));
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  expect(expressions).toHaveLength(1);
  const openURL = vi.fn();
  const press = new Function("unavailable", "destination", "onActivate", "Linking", `return (${expressions[0]});`)(disabled, "https://example.test/docs", callback, { openURL });
  return { press, openURL, source };
}

const event = (cancelled = false) => ({ defaultPrevented: cancelled, preventDefault() { this.defaultPrevented = true; } });

describe("React Native authored anchor activation", () => {
  it("guards disabled activation without relying on conventional prop or component names", () => {
    const callback = vi.fn();
    const { press, openURL, source } = handler(true, callback);
    expect(source).toContain('disabled={String(unavailable) === "true"}');
    expect(source).toContain('disabled: String(unavailable) === "true"');
    press(event());
    expect(callback).not.toHaveBeenCalled();
    expect(openURL).not.toHaveBeenCalled();
  });

  it("calls the callback once before opening the destination once", () => {
    const order: string[] = [];
    const callback = vi.fn(() => order.push("callback"));
    const { press, openURL } = handler(false, callback);
    openURL.mockImplementation(() => order.push("navigation"));
    const activation = event();
    press(activation);
    expect(callback).toHaveBeenCalledExactlyOnceWith(activation);
    expect(openURL).toHaveBeenCalledExactlyOnceWith("https://example.test/docs");
    expect(order).toEqual(["callback", "navigation"]);
  });

  it("respects cancellation before and during the callback", () => {
    const callback = vi.fn(activation => activation.preventDefault());
    const { press, openURL } = handler(false, callback);
    press(event(true));
    expect(callback).not.toHaveBeenCalled();
    press(event());
    expect(callback).toHaveBeenCalledTimes(1);
    expect(openURL).not.toHaveBeenCalled();
  });

  it("retains navigation without an authored callback", () => {
    const { press, openURL } = handler(false);
    press(event());
    expect(openURL).toHaveBeenCalledExactlyOnceWith("https://example.test/docs");
  });

  it("preserves callback and navigation composition on anchors without availability semantics", () => {
    const callback = vi.fn();
    const { press, openURL } = handler(false, callback, false);
    const activation = event();
    press(activation);
    expect(callback).toHaveBeenCalledExactlyOnceWith(activation);
    expect(openURL).toHaveBeenCalledExactlyOnceWith("https://example.test/docs");
  });

  it("keeps ordinary href-only anchors independent of press event payloads", () => {
    const { componentFile } = generateReactNativeComponentSource(corpusIR("NavTree"));
    expect(componentFile).toContain("onPress={() => { if (href) void Linking.openURL(String(href)); }}");
    expect(componentFile).not.toContain("event.defaultPrevented");
  });
});
