import { describe, expect, it } from "vitest";
import type { ComponentContract, ContractDomNode } from "./contract.js";
import { buildComponentIR, parseBindingExpression } from "./ir.js";
import { allCorpusComponentNames, loadCorpusContract } from "./frameworks/corpus-fixtures.js";

const corpus = new Map(allCorpusComponentNames().map((name) => [name, loadCorpusContract(name)]));
const calendar = () => structuredClone(corpus.get("Calendar")!) as ComponentContract;
const build = (contract: ComponentContract) => buildComponentIR(contract, { allContracts: corpus });

/** The first contract DOM node whose part matches. */
function part(contract: ComponentContract, name: string): ContractDomNode {
  const visit = (node: ContractDomNode): ContractDomNode | undefined =>
    node.part === name ? node : (node.children ?? []).map(visit).find(Boolean);
  const found = visit(dom(contract));
  if (!found) throw new Error(`no ${name} node`);
  return found;
}
const tr = (contract: ComponentContract) => {
  const visit = (node: ContractDomNode): ContractDomNode | undefined =>
    node.iterate?.source === "dateGrid:weeks" ? node : (node.children ?? []).map(visit).find(Boolean);
  return visit(dom(contract))!;
};
const dom = (contract: ComponentContract) => (contract.anatomy as { dom: ContractDomNode }).dom;
/** A designed prop, loosely typed so a test can set any field to an invalid value. */
const member = (contract: ComponentContract, name: string) =>
  contract.props!.designed!.members!.find((m) => m.name === name)! as unknown as Record<string, unknown>;

describe("dateGrid IR fact", () => {
  it("names the channels and props the runtime reads", () => {
    expect(build(calendar()).dateGrid).toEqual({
      valueChannel: "value", monthChannel: "month", modeProp: "mode", localeProp: "locale",
      minProp: "minDate", maxProp: "maxDate", disabledProp: "disabled", captionProp: "caption",
    });
  });

  it("parses date-grid values and actions", () => {
    expect(parseBindingExpression("dateGrid:weeks")).toEqual({ kind: "dateGrid", field: "weeks" });
    expect(parseBindingExpression("dateGrid:keydown")).toEqual({ kind: "dateGrid", action: "keydown" });
    expect(parseBindingExpression("dateGrid:select(iter:item)")).toEqual({
      kind: "dateGrid", action: "select", arg: { kind: "iterationLocal", local: "item" },
    });
    for (const bad of ["dateGrid:select", "dateGrid:select(iter:index)", "dateGrid:select(iter:item.key)", "dateGrid:today"]) {
      expect(() => parseBindingExpression(bad), bad).toThrow(`DATE_GRID_BINDING_INVALID: ${bad}`);
    }
  });

  it("nests the day iteration under the week with the week's own locals", () => {
    const ir = build(calendar());
    const find = (node: typeof ir.dom, partName: string): typeof ir.dom | undefined =>
      node?.part === partName ? node : node?.children.map((child) => find(child, partName)).find(Boolean);
    const cell = find(ir.dom, "day")!;
    expect(cell.iteration).toMatchObject({
      kind: "array", source: { kind: "iterationLocal", local: "item", path: ["days"] },
      itemVar: "day", indexVar: "column", itemType: "DateGridDay",
    });
  });
});

describe("dateGrid refusals", () => {
  const refuses = (mutate: (contract: ComponentContract) => void, message: string) => {
    const contract = calendar();
    mutate(contract);
    expect(() => build(contract)).toThrow(message);
  };

  it("refuses date-grid bindings without the block", () => {
    refuses((c) => { delete c.dateGrid; }, "DATE_GRID_INVALID: Calendar: dateGrid bindings (binding aria-disabled) require a dateGrid declaration");
  });

  it("refuses a missing or mistyped channel", () => {
    refuses((c) => { c.dateGrid!.monthChannel = "visible"; }, `monthChannel "visible" must name a value channel typed Date`);
    refuses((c) => { c.channels!.month.valueType = "string"; }, `monthChannel "month" must name a value channel typed Date`);
    const valueTyped = `valueChannel "value" must name a value channel typed Date | Date[], optionally | null`;
    refuses((c) => { c.channels!.value.valueType = "string"; }, valueTyped);
    // A name that merely contains "Date", and a channel missing the arm range mode commits.
    refuses((c) => { c.channels!.value.valueType = "DateRange"; }, valueTyped);
    refuses((c) => { c.channels!.value.valueType = "Date | null"; }, valueTyped);
    refuses((c) => { c.channels!.value.valueType = "Date | Date[] | string"; }, valueTyped);
  });

  it("accepts a value channel without the null arm", () => {
    const contract = calendar();
    contract.channels!.value.valueType = "Date[] | Date";
    expect(build(contract).dateGrid?.valueChannel).toBe("value");
  });

  it("refuses mistyped props", () => {
    refuses((c) => { member(c, "locale").translatable = true; }, `localeProp "locale" must be a string prop declared translatable: false`);
    refuses((c) => { c.types!.CalendarMode = { kind: "union", values: ["single", "multiple"] }; }, `modeProp "mode" must be typed by a "single" | "range" union`);
    refuses((c) => { member(c, "minDate").propType = { kind: "string" }; }, `minProp "minDate" must be a Date prop`);
    refuses((c) => { member(c, "disabled").propType = { kind: "string" }; }, `disabledProp "disabled" must be a boolean prop`);
  });

  it("refuses a compositeControl that would also commit the value channel", () => {
    refuses((c) => {
      c.compositeControl = { part: "day", channel: "value", interactionModel: "collection-selection", commit: "activation", update: "channel:value.onChange(iter:item)" };
    }, `Contract "Calendar": compositeControl owns the value commit; remove authored anatomy.dom events from part "day".`);
  });

  it("refuses a day cell that does not carry the selection dimension's a11y attribute", () => {
    refuses((c) => { delete part(c, "day").bindings!["aria-selected"]; }, "the day cell must bind aria-selected (states.dimensions selection a11y) to iter:item.selected");
    refuses((c) => { part(c, "day").bindings!["aria-selected"] = "iter:item.current"; }, "the day cell must bind aria-selected");
    // The attribute is whatever the states block declares, not a hard-coded aria-selected.
    refuses((c) => { c.states!.dimensions!.selection.a11y!.attribute = "aria-checked"; }, "the day cell must bind aria-checked");
    refuses((c) => { c.states!.dimensions!.selection.a11y!.values = { unselected: "no", selected: "yes" }; }, `values must map "unselected" to "false" and "selected" to "true"`);
  });

  it("refuses a grid without a single roving tab stop, focus target, select action or keydown owner", () => {
    refuses((c) => { delete part(c, "day").bindings!.tabindex; }, "the day cell must bind tabindex to iter:item.tabIndex");
    refuses((c) => { delete part(c, "day").bindings!["data-date"]; }, "the day cell must bind data-date to iter:item.key");
    refuses((c) => { delete part(c, "day").events; }, "the day cell must bind click to dateGrid:select(iter:item)");
    refuses((c) => { delete part(c, "grid").events; }, "an ancestor of the day cells must bind keydown to dateGrid:keydown");
  });

  it("refuses a day cell that is not itself the gridcell control (the ARIA grid pattern)", () => {
    const nestedControl = "the day cell must contain no focusable or interactive element";
    // A focusable button inside the cell carrying the day's bindings: focus lands on
    // the button while aria-selected sits on the cell.
    refuses((c) => {
      const cell = part(c, "day");
      const { tabindex, "aria-label": label, "aria-disabled": disabled, "data-date": date } = cell.bindings!;
      for (const key of ["tabindex", "aria-label", "aria-disabled", "data-date"]) delete cell.bindings![key];
      cell.children = [{ tag: "button", attrs: { type: "button" }, bindings: { tabindex, "aria-label": label, "aria-disabled": disabled, "data-date": date }, events: cell.events, content: "iter:item.label" }];
      delete cell.events;
    }, "the day cell must bind tabindex to iter:item.tabIndex");
    // The cell is the control, yet a natively focusable element sits inside it.
    refuses((c) => { part(c, "day").children = [{ tag: "button", attrs: { type: "button" } }]; }, `${nestedControl} (found <button>)`);
    refuses((c) => { part(c, "day").children = [{ tag: "span", attrs: { tabindex: "0" } }]; }, `${nestedControl} (found <span>)`);
    refuses((c) => { part(c, "day").children = [{ tag: "span", events: { click: "dateGrid:previous" } }]; }, `${nestedControl} (found <span>)`);
    refuses((c) => { part(c, "day").children = [{ componentRef: "fsds.Button" } as ContractDomNode]; }, `${nestedControl} (found Button)`);
    refuses((c) => { part(c, "day").attrs = { role: "button" }; }, `the day cell must declare role="gridcell"`);
  });

  it("admits presentational content inside the gridcell", () => {
    const contract = calendar();
    part(contract, "day").children = [{ tag: "span", children: [{ tag: "span", attrs: { "aria-hidden": "true" }, content: "iter:item.label" }] }];
    expect(build(contract).dateGrid?.valueChannel).toBe("value");
  });

  it("refuses actions on the wrong event and values used as handlers", () => {
    refuses((c) => { part(c, "grid").events = { click: "dateGrid:keydown" }; }, "dateGrid:keydown must bind the keydown event");
    refuses((c) => { part(c, "day").events = { keydown: "dateGrid:select(iter:item)" }; }, "dateGrid:select must bind the click event");
  });

  it("refuses an iteration item type that is not the runtime's", () => {
    refuses((c) => { part(c, "day").iterate!.itemType = "Date"; }, `an iteration over DateGridDay items must declare itemType "DateGridDay" (got "Date")`);
  });

  it("refuses iterating the enclosing item outside any array iteration", () => {
    refuses((c) => { tr(c).iterate!.source = "iter:item.weeks"; }, "iterates the enclosing item, but the node has no enclosing array iteration");
  });
});
