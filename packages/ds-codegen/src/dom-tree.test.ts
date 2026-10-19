import { describe, expect, it } from "vitest";
import type { ComponentContract, ContractDomNode } from "./contract.js";
import { buildComponentIR, parseBindingExpression } from "./ir.js";

describe("parseBindingExpression", () => {
  it("leaves a projection outside the closed vocabulary as visible literal text", () => {
    // Day labels are the date grid's locale-formatted `iter:item.label`; a
    // locale-blind day-of-month projection is not part of the vocabulary.
    expect(parseBindingExpression("project:dateDayOfMonth(iter:item)")).toEqual({
      kind: "literal",
      value: "project:dateDayOfMonth(iter:item)",
    });
    expect(parseBindingExpression("project:eval(iter:item)")).toEqual({
      kind: "literal",
      value: "project:eval(iter:item)",
    });
  });

  it("parses prop: bindings", () => {
    expect(parseBindingExpression("prop:disabled")).toEqual({
      kind: "prop",
      prop: "disabled",
    });
  });

  it("parses channel:value bindings", () => {
    expect(parseBindingExpression("channel:checked.value")).toEqual({
      kind: "channel",
      channel: "checked",
      field: "value",
    });
  });

  it("parses channel:onChange bindings", () => {
    expect(parseBindingExpression("channel:checked.onChange")).toEqual({
      kind: "channel",
      channel: "checked",
      field: "onChange",
    });
  });

  it("parses channel:defaultValue bindings", () => {
    expect(parseBindingExpression("channel:open.defaultValue")).toEqual({
      kind: "channel",
      channel: "open",
      field: "defaultValue",
    });
  });

  it("parses literal: bindings", () => {
    expect(parseBindingExpression("literal:Submit")).toEqual({
      kind: "literal",
      value: "Submit",
    });
  });

  it("falls back to literal for malformed expressions", () => {
    // Visible failure mode: the expression appears verbatim in output rather
    // than disappearing silently.
    expect(parseBindingExpression("not-a-binding")).toEqual({
      kind: "literal",
      value: "not-a-binding",
    });
  });

  // BINDING-EXPRESSION-V2-01: the `iter:` form names the *role* of an
  // iteration local (index vs item), not a specific lexical variable.
  // The IR resolves the role to the enclosing iteration's declared
  // `indexVar` / `itemVar` at lowering time.
  it("parses iter:index bindings", () => {
    expect(parseBindingExpression("iter:index")).toEqual({
      kind: "iterationLocal",
      local: "index",
    });
  });

  it("parses iter:item bindings", () => {
    expect(parseBindingExpression("iter:item")).toEqual({
      kind: "iterationLocal",
      local: "item",
    });
  });

  it("rejects unknown iter: locals as literals (visible failure)", () => {
    // Only "index" and "item" are valid. Anything else falls through to
    // literal so the typo appears in output.
    expect(parseBindingExpression("iter:row")).toEqual({
      kind: "literal",
      value: "iter:row",
    });
  });
});

// BINDING-EXPRESSION-V2-PATH-01: property paths are object-field projection
// only — no transforms, no comparisons, no optional chaining, no array
// indexing, no function calls, no boolean / arithmetic expressions, no
// set-membership, no fallback expressions. The grammar is a dotted tail
// of identifier segments only. Anything else falls through to `literal`.
describe("parseBindingExpression — paths (V2-PATH-01)", () => {
  it("parses prop:foo.bar with a single path segment", () => {
    expect(parseBindingExpression("prop:item.value")).toEqual({
      kind: "prop",
      prop: "item",
      path: ["value"],
    });
  });

  it("parses prop:foo.bar.baz with multiple path segments", () => {
    expect(parseBindingExpression("prop:user.profile.firstName")).toEqual({
      kind: "prop",
      prop: "user",
      path: ["profile", "firstName"],
    });
  });

  it("parses channel:X.value.field with a path on the channel value", () => {
    expect(parseBindingExpression("channel:selection.value.length")).toEqual({
      kind: "channel",
      channel: "selection",
      field: "value",
      path: ["length"],
    });
  });

  it("parses iter:item.field for array-iteration object access", () => {
    expect(parseBindingExpression("iter:item.value")).toEqual({
      kind: "iterationLocal",
      local: "item",
      path: ["value"],
    });
  });

  it("parses iter:item.label as a separate object-field projection", () => {
    expect(parseBindingExpression("iter:item.label")).toEqual({
      kind: "iterationLocal",
      local: "item",
      path: ["label"],
    });
  });

  it("parses iter:index without path (path is optional)", () => {
    expect(parseBindingExpression("iter:index")).toEqual({
      kind: "iterationLocal",
      local: "index",
    });
  });

  it("rejects empty segment at end (trailing dot)", () => {
    // `iter:item.` is malformed — falls through to literal.
    expect(parseBindingExpression("iter:item.")).toEqual({
      kind: "literal",
      value: "iter:item.",
    });
  });

  it("rejects double dot (empty middle segment)", () => {
    expect(parseBindingExpression("iter:item..value")).toEqual({
      kind: "literal",
      value: "iter:item..value",
    });
  });

  it("rejects bracket access (path is dot-only)", () => {
    expect(parseBindingExpression("iter:item[value]")).toEqual({
      kind: "literal",
      value: "iter:item[value]",
    });
  });

  it("rejects optional chaining", () => {
    expect(parseBindingExpression("iter:item?.value")).toEqual({
      kind: "literal",
      value: "iter:item?.value",
    });
  });

  it("rejects fallback expressions (?? x)", () => {
    expect(parseBindingExpression("iter:item.value ?? alpha")).toEqual({
      kind: "literal",
      value: "iter:item.value ?? alpha",
    });
  });

  it("rejects comparison expressions", () => {
    expect(parseBindingExpression("iter:item.value === channel:selection.value")).toEqual({
      kind: "literal",
      value: "iter:item.value === channel:selection.value",
    });
  });

  it("rejects function-call paths", () => {
    expect(parseBindingExpression("iter:item.value()")).toEqual({
      kind: "literal",
      value: "iter:item.value()",
    });
  });

  it("rejects paths on channel:X.onChange (no value projection on callbacks)", () => {
    // channel:X.onChange is a callback, not a value; a path makes no
    // sense and should not parse — falls through to literal.
    expect(parseBindingExpression("channel:selection.onChange.foo")).toEqual({
      kind: "literal",
      value: "channel:selection.onChange.foo",
    });
  });

  it("rejects paths on channel:X.defaultValue (out of scope this slice)", () => {
    expect(parseBindingExpression("channel:selection.defaultValue.length")).toEqual({
      kind: "literal",
      value: "channel:selection.defaultValue.length",
    });
  });

  it("does not attach path to literal: (literal carries no path)", () => {
    // The contents of literal: are opaque — even though "Foo.Bar" contains a
    // dot, it is part of the literal value, not a path.
    expect(parseBindingExpression("literal:Foo.Bar")).toEqual({
      kind: "literal",
      value: "Foo.Bar",
    });
  });

  it("rejects segments that start with a digit", () => {
    // Segment must start with identifier-start; `1value` is not a valid
    // JS property identifier-tail in our grammar (it isn't a valid
    // unquoted property at parse time anyway).
    expect(parseBindingExpression("iter:item.1value")).toEqual({
      kind: "literal",
      value: "iter:item.1value",
    });
  });
});

describe("buildDomTree (via buildComponentIR)", () => {
  function withDom(dom: unknown): ComponentContract {
    return {
      name: "TestComponent",
      anatomy: {
        parts: ["wrapper", "field"],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dom: dom as any,
      },
    } as ComponentContract;
  }

  it("returns undefined when no dom block is present", () => {
    const ir = buildComponentIR({
      name: "Plain",
      anatomy: { parts: ["root"] },
    } as ComponentContract);
    expect(ir.dom).toBeUndefined();
  });

  it("returns undefined for legacy flat-array anatomy", () => {
    const ir = buildComponentIR({
      name: "Legacy",
      anatomy: ["root"],
    } as ComponentContract);
    expect(ir.dom).toBeUndefined();
  });

  it("parses a single root node with attrs", () => {
    const ir = buildComponentIR(
      withDom({
        tag: "label",
        part: "wrapper",
        attrs: { class: "switch__wrapper" },
      }),
    );
    expect(ir.dom).toEqual({
      tag: "label",
      slotName: undefined,
      part: "wrapper",
      attrs: { class: "switch__wrapper" },
      bindings: {},
      propertyBindings: {},
      events: {},
      content: undefined,
      children: [],
      ifProp: undefined,
      ifNegated: false,
      iteration: undefined,
      cssVarBindings: [],
      idRefAttrs: [],
    });
  });

  it("parses nested children with bindings", () => {
    // The contract must declare the channels and props that DOM bindings
    // reference, otherwise validateDomBindings() throws.
    const ir = buildComponentIR({
      name: "TestComponent",
      anatomy: {
        parts: ["wrapper", "field"],
        dom: {
          tag: "label",
          part: "wrapper",
          children: [
            {
              tag: "input",
              part: "field",
              attrs: { type: "checkbox", role: "switch" },
              bindings: {
                checked: "channel:checked.value",
                disabled: "prop:disabled",
              },
              events: {
                change: "channel:checked.onChange",
              },
            },
            { tag: "slot" },
          ],
        } as any,
      },
      channels: {
        checked: { value: "checked", defaultValue: "defaultChecked", onChange: "onCheckedChange" },
      },
      props: {
        styled: {
          members: [
            { name: "checked", type: "boolean" },
            { name: "defaultChecked", type: "boolean" },
            { name: "onCheckedChange", type: "(value: boolean) => void" },
            { name: "disabled", type: "boolean" },
          ],
        },
      },
    } as ComponentContract);
    expect(ir.dom).toEqual({
      tag: "label",
      slotName: undefined,
      part: "wrapper",
      attrs: {},
      bindings: {},
      propertyBindings: {},
      events: {},
      content: undefined,
      children: [
        {
          tag: "input",
          slotName: undefined,
          part: "field",
          attrs: { type: "checkbox", role: "switch" },
          bindings: {
            checked: { kind: "channel", channel: "checked", field: "value" },
            disabled: { kind: "prop", prop: "disabled" },
          },
          propertyBindings: {},
          events: {
            change: { kind: "channel", channel: "checked", field: "onChange" },
          },
          content: undefined,
          children: [],
          ifProp: undefined,
          ifNegated: false,
          iteration: undefined,
          cssVarBindings: [],
          idRefAttrs: [],
        },
        {
          tag: "slot",
          slotName: undefined,
          part: undefined,
          attrs: {},
          bindings: {},
          propertyBindings: {},
          events: {},
          content: undefined,
          children: [],
          ifProp: undefined,
          ifNegated: false,
          iteration: undefined,
          cssVarBindings: [],
          idRefAttrs: [],
        },
      ],
      ifProp: undefined,
      ifNegated: false,
      iteration: undefined,
      cssVarBindings: [],
      idRefAttrs: [],
    });
  });

  it("carries the slot name through the IR when a slot declares one", () => {
    const ir = buildComponentIR(
      withDom({
        tag: "div",
        children: [
          { tag: "slot", name: "title" } as ContractDomNode,
          { tag: "slot" } as ContractDomNode,
        ],
      }),
    );
    expect(ir.dom?.children[0].slotName).toBe("title");
    expect(ir.dom?.children[1].slotName).toBeUndefined();
  });

  it("leaves slotName undefined for non-slot nodes even if they accidentally carry a name", () => {
    // Defensive: only `tag: "slot"` should produce a slotName. A `<div name="foo">`
    // would set slotName=undefined; the `name` attribute would still need to
    // flow through attrs if the contract intended it.
    const ir = buildComponentIR(
      withDom({ tag: "div", name: "foo" } as unknown as ContractDomNode),
    );
    expect(ir.dom?.slotName).toBeUndefined();
  });

  it("preserves the if guard for conditional rendering", () => {
    const ir = buildComponentIR(
      withDom({
        tag: "div",
        children: [{ tag: "span", part: "label", if: "children" }],
      }),
    );
    expect(ir.dom?.children[0].ifProp).toBe("children");
  });
});

describe("legacy bindings shapes hard-reject (IR-DOM-BINDING-CAPABILITY-01/4C)", () => {
  // After step 4C, the IR rejects the three legacy shapes that used to
  // be auto-translated. These tests pin the rejection so a future
  // refactor can't silently reintroduce the dual-pathway retention.

  it("rejects bindings.onClick with an actionable message", () => {
    expect(() =>
      buildComponentIR({
        name: "LegacyEventBinding",
        anatomy: {
          parts: ["root"],
          dom: {
            tag: "button",
            part: "root",
            attrs: { type: "button" },
            bindings: {
              onClick: "prop:onPress",
            } as any,
          },
        },
        props: {
          styled: {
            members: [
              { name: "onPress", type: "() => void" },
            ],
          },
        },
      } as ComponentContract),
    ).toThrow(/bindings\.onClick is an event-shaped key.*events.*click/);
  });

  it("rejects bindings.onChange with an actionable message", () => {
    expect(() =>
      buildComponentIR({
        name: "LegacyChangeBinding",
        anatomy: {
          parts: ["root"],
          dom: {
            tag: "input",
            part: "root",
            bindings: {
              onChange: "channel:value.onChange",
            } as any,
          },
        },
        channels: {
          value: { value: "value", onChange: "onValueChange", valueType: "string" },
        },
        props: {
          styled: {
            members: [
              { name: "value", type: "string" },
              { name: "onValueChange", type: "(v: string) => void" },
            ],
          },
        },
      } as ComponentContract),
    ).toThrow(/bindings\.onChange is an event-shaped key.*events.*change/);
  });

  it("rejects bindings.children with an actionable message", () => {
    expect(() =>
      buildComponentIR({
        name: "LegacyChildrenBinding",
        anatomy: {
          parts: ["root"],
          dom: {
            tag: "span",
            part: "root",
            bindings: {
              children: "prop:icon",
            } as any,
          },
        },
        props: {
          styled: {
            members: [
              { name: "icon", type: "ReactNode" },
            ],
          },
        },
      } as ComponentContract),
    ).toThrow(/bindings\.children smuggles inner content.*content.*prop:icon/);
  });

  it("rejects bindings.textContent with an actionable message", () => {
    expect(() =>
      buildComponentIR({
        name: "LegacyTextContentBinding",
        anatomy: {
          parts: ["root"],
          dom: {
            tag: "span",
            part: "root",
            bindings: {
              textContent: "prop:label",
            } as any,
          },
        },
        props: {
          styled: {
            members: [
              { name: "label", type: "string" },
            ],
          },
        },
      } as ComponentContract),
    ).toThrow(/bindings\.textContent smuggles inner content.*content.*prop:label/);
  });

  it("rejects bindings.indeterminate — DOM-property-only, must move to properties (DOM-PROPERTY-REFLECTION-IR-CHECKBOX-INDETERMINATE-01)", () => {
    expect(() =>
      buildComponentIR({
        name: "MisplacedPropertyBinding",
        anatomy: {
          parts: ["root"],
          dom: {
            tag: "input",
            part: "root",
            attrs: { type: "checkbox" },
            bindings: {
              indeterminate: "prop:indeterminate",
            } as any,
          },
        },
        props: {
          styled: {
            members: [{ name: "indeterminate", type: "boolean" }],
          },
        },
      } as ComponentContract),
    ).toThrow(/bindings\.indeterminate is a DOM-property-only binding.*properties/);
  });

  it("rejects content + children on the same node", () => {
    expect(() =>
      buildComponentIR({
        name: "ContentAndChildrenConflict",
        anatomy: {
          parts: ["root"],
          dom: {
            tag: "div",
            part: "root",
            content: "prop:label",
            children: [{ tag: "span" }],
          } as any,
        },
        props: {
          styled: {
            members: [
              { name: "label", type: "string" },
            ],
          },
        },
      } as ComponentContract),
    ).toThrow(/`content` and `children` are mutually exclusive/);
  });

  it("accepts the canonical authoring path", () => {
    // The post-4C shape. Should parse without throwing and surface all
    // three fields on the IR.
    const ir = buildComponentIR({
      name: "CanonicalAuthoring",
      anatomy: {
        parts: ["root", "icon", "dismiss"],
        dom: {
          tag: "div",
          part: "root",
          children: [
            {
              tag: "span",
              part: "icon",
              attrs: { "aria-hidden": "true" },
              content: "prop:icon",
            },
            {
              tag: "button",
              part: "dismiss",
              attrs: { type: "button" },
              bindings: { "aria-label": "prop:dismissLabel" },
              events: { click: "prop:onDismiss" },
            },
          ],
        },
      },
      props: {
        styled: {
          members: [
            { name: "icon", type: "ReactNode" },
            { name: "onDismiss", type: "() => void" },
            { name: "dismissLabel", type: "string" },
          ],
        },
      },
    } as ComponentContract);

    const root = ir.dom!;
    expect(root.children).toHaveLength(2);
    // icon: content set, bindings empty, events empty.
    expect(root.children[0].content).toEqual({ kind: "prop", prop: "icon" });
    expect(root.children[0].bindings).toEqual({});
    expect(root.children[0].events).toEqual({});
    // dismiss: bindings.aria-label and events.click set, content undefined.
    expect(root.children[1].bindings).toEqual({
      "aria-label": { kind: "prop", prop: "dismissLabel" },
    });
    expect(root.children[1].events).toEqual({
      click: { kind: "prop", prop: "onDismiss" },
    });
    expect(root.children[1].content).toBeUndefined();
  });
});

describe("if-prop validation", () => {
  it("rejects if-prop references that don't resolve to a prop or channel", () => {
    // The bug this guards against: contracts with `if: "validating"` when
    // `validating` is neither a prop nor a channel — the React emitter
    // previously produced `{validating && ...}` which throws ReferenceError.
    expect(() =>
      buildComponentIR({
        name: "BrokenGuard",
        anatomy: {
          parts: ["root", "indicator"],
          dom: {
            tag: "div",
            part: "root",
            children: [
              { tag: "span", part: "indicator", if: "bogus" },
            ],
          },
        },
        props: { styled: { members: [{ name: "label", type: "string" }] } },
      } as ComponentContract),
    ).toThrow(/'if: "bogus"' does not resolve/);
  });

  function slotGuarded(slotName: string, guard: string): ComponentContract {
    return {
      name: "SlotGuard",
      anatomy: {
        parts: ["root", "action"],
        dom: {
          tag: "div",
          part: "root",
          children: [
            { tag: "div", part: "action", if: guard, children: [{ tag: "slot", name: slotName }] },
          ],
        },
      },
    } as ComponentContract;
  }

  it("lowers if: \"slot:<name>\" to a named-slot presence guard, not a prop guard", () => {
    const ir = buildComponentIR(slotGuarded("action", "slot:action"));
    const action = ir.dom!.children[0];
    expect(action.ifSlot).toBe("action");
    expect(action.ifProp).toBeUndefined();
    expect(action.ifNegated).toBe(false);
    const negated = buildComponentIR(slotGuarded("action", "!slot:action")).dom!.children[0];
    expect(negated.ifSlot).toBe("action");
    expect(negated.ifNegated).toBe(true);
  });

  it("rejects a slot guard whose subtree never renders that slot", () => {
    // The guard could never become true: nothing inside it is slottable.
    expect(() => buildComponentIR(slotGuarded("other", "slot:action"))).toThrow(
      /'if: "slot:action"' guards a subtree that renders no \{"tag": "slot", "name": "action"\}/,
    );
  });

  it("accepts if-prop matching a declared prop", () => {
    expect(() =>
      buildComponentIR({
        name: "GoodGuardProp",
        anatomy: {
          parts: ["root", "label"],
          dom: {
            tag: "div",
            part: "root",
            children: [{ tag: "label", part: "label", if: "labelText" }],
          },
        },
        props: {
          styled: { members: [{ name: "labelText", type: "string" }] },
        },
      } as ComponentContract),
    ).not.toThrow();
  });

  it("accepts if-prop matching a channel name", () => {
    expect(() =>
      buildComponentIR({
        name: "GoodGuardChannel",
        anatomy: {
          parts: ["root", "panel"],
          dom: {
            tag: "div",
            part: "root",
            children: [{ tag: "div", part: "panel", if: "open" }],
          },
        },
        channels: {
          open: { value: "open", onChange: "onOpenChange", valueType: "boolean" },
        },
        props: {
          styled: {
            members: [
              { name: "open", type: "boolean" },
              { name: "onOpenChange", type: "(open: boolean) => void" },
            ],
          },
        },
      } as ComponentContract),
    ).not.toThrow();
  });

  it("accepts if-prop matching a channel value-prop (different from channel name)", () => {
    // Some contracts name the channel something abstract (e.g. `openness`) but
    // the actual prop the consumer passes is `open`. Both must validate.
    expect(() =>
      buildComponentIR({
        name: "GoodGuardChannelValueProp",
        anatomy: {
          parts: ["root", "panel"],
          dom: {
            tag: "div",
            part: "root",
            children: [{ tag: "div", part: "panel", if: "open" }],
          },
        },
        channels: {
          openness: {
            value: "open",
            onChange: "onOpenChange",
            valueType: "boolean",
          },
        },
        props: {
          styled: {
            members: [
              { name: "open", type: "boolean" },
              { name: "onOpenChange", type: "(open: boolean) => void" },
            ],
          },
        },
      } as ComponentContract),
    ).not.toThrow();
  });

  it("accepts the literal 'children' as the if-prop", () => {
    expect(() =>
      buildComponentIR({
        name: "GoodGuardChildren",
        anatomy: {
          parts: ["root", "label"],
          dom: {
            tag: "div",
            part: "root",
            children: [{ tag: "span", part: "label", if: "children" }],
          },
        },
      } as ComponentContract),
    ).not.toThrow();
  });
});

describe("iterate directive", () => {
  it("parses count-driven iteration into IterationIR", () => {
    const ir = buildComponentIR({
      name: "OTP",
      anatomy: {
        parts: ["root", "field"],
        dom: {
          tag: "div",
          part: "root",
          children: [
            {
              tag: "input",
              part: "field",
              iterate: {
                source: "prop:length",
                kind: "count",
                indexVar: "fieldIndex",
              },
            },
          ],
        },
      },
      props: {
        styled: {
          members: [{ name: "length", type: "number", default: 6 }],
        },
      },
    } as ComponentContract);
    const field = ir.dom!.children[0];
    expect(field.iteration).toEqual({
      kind: "count",
      source: { kind: "prop", prop: "length" },
      sourceProp: "length",
      indexVar: "fieldIndex",
      itemVar: undefined,
      itemType: undefined,
    });
  });

  it("defaults indexVar to 'index' when omitted", () => {
    const ir = buildComponentIR({
      name: "Pin",
      anatomy: {
        parts: ["root", "dot"],
        dom: {
          tag: "div",
          part: "root",
          children: [
            {
              tag: "span",
              part: "dot",
              iterate: { source: "prop:count", kind: "count" },
            },
          ],
        },
      },
      props: { styled: { members: [{ name: "count", type: "number" }] } },
    } as ComponentContract);
    expect(ir.dom!.children[0].iteration!.indexVar).toBe("index");
  });

  it("parses array-driven iteration with itemVar/itemType", () => {
    const ir = buildComponentIR({
      name: "Calendar",
      types: {
        CalendarDay: {
          kind: "object",
          fields: { date: "string", isToday: "boolean" },
        },
      },
      anatomy: {
        parts: ["root", "cell"],
        dom: {
          tag: "div",
          part: "root",
          children: [
            {
              tag: "td",
              part: "cell",
              iterate: {
                source: "prop:days",
                kind: "array",
                itemVar: "day",
                itemType: "CalendarDay",
              },
            },
          ],
        },
      },
      props: {
        styled: {
          members: [{ name: "days", type: "CalendarDay[]" }],
        },
      },
    } as ComponentContract);
    expect(ir.dom!.children[0].iteration).toEqual({
      kind: "array",
      source: { kind: "prop", prop: "days" },
      sourceProp: "days",
      indexVar: "index",
      itemVar: "day",
      itemType: "CalendarDay",
    });
  });

  it("defaults itemVar to 'item' for array iteration when omitted", () => {
    const ir = buildComponentIR({
      name: "Stack",
      types: { Item: { kind: "object", fields: { id: "string" } } },
      anatomy: {
        parts: ["root", "row"],
        dom: {
          tag: "div",
          part: "root",
          children: [
            {
              tag: "div",
              part: "row",
              iterate: {
                source: "prop:items",
                kind: "array",
                itemType: "Item",
              },
            },
          ],
        },
      },
      props: { styled: { members: [{ name: "items", type: "Item[]" }] } },
    } as ComponentContract);
    expect(ir.dom!.children[0].iteration!.itemVar).toBe("item");
  });

  it("rejects iterate.source when the named prop is not declared", () => {
    expect(() =>
      buildComponentIR({
        name: "Broken",
        anatomy: {
          parts: ["root", "x"],
          dom: {
            tag: "div",
            part: "root",
            children: [
              {
                tag: "div",
                part: "x",
                iterate: { source: "prop:nope", kind: "count" },
              },
            ],
          },
        },
        props: { styled: { members: [{ name: "other", type: "number" }] } },
      } as ComponentContract),
    ).toThrow(/iterate\.source references unknown prop 'nope'/);
  });

  it("rejects count iteration when the source prop is not number-typed", () => {
    expect(() =>
      buildComponentIR({
        name: "BadCount",
        anatomy: {
          parts: ["root", "x"],
          dom: {
            tag: "div",
            part: "root",
            children: [
              {
                tag: "div",
                part: "x",
                iterate: { source: "prop:label", kind: "count" },
              },
            ],
          },
        },
        props: { styled: { members: [{ name: "label", type: "string" }] } },
      } as ComponentContract),
    ).toThrow(/kind="count" requires prop 'label' to be typed 'number'/);
  });

  it("rejects array iteration when the source prop is not array-typed", () => {
    expect(() =>
      buildComponentIR({
        name: "BadArray",
        types: { Item: { kind: "object", fields: { id: "string" } } },
        anatomy: {
          parts: ["root", "x"],
          dom: {
            tag: "div",
            part: "root",
            children: [
              {
                tag: "div",
                part: "x",
                iterate: {
                  source: "prop:single",
                  kind: "array",
                  itemType: "Item",
                },
              },
            ],
          },
        },
        props: { styled: { members: [{ name: "single", type: "Item" }] } },
      } as ComponentContract),
    ).toThrow(/kind="array" requires prop 'single' to be an array type/);
  });

  it("rejects array iteration without itemType", () => {
    expect(() =>
      buildComponentIR({
        name: "NoItemType",
        anatomy: {
          parts: ["root", "x"],
          dom: {
            tag: "div",
            part: "root",
            children: [
              {
                tag: "div",
                part: "x",
                iterate: { source: "prop:items", kind: "array" },
              },
            ],
          },
        },
        props: { styled: { members: [{ name: "items", type: "string[]" }] } },
      } as ComponentContract),
    ).toThrow(/iterate\.kind="array" requires `itemType`/);
  });

  it("rejects iterate.source kinds outside { prop, channel.value }", () => {
    // PRODUCTION-ARRAY-ITERATION-CONSUMER-01: channel:X.value is now an
    // accepted iteration source (in addition to prop:X). Sources that
    // remain rejected are literal:, iter:, and channel:X.{onChange,
    // defaultValue} — none of which represent an iterable value.
    expect(() =>
      buildComponentIR({
        name: "LiteralSource",
        anatomy: {
          parts: ["root", "x"],
          dom: {
            tag: "div",
            part: "root",
            children: [
              {
                tag: "div",
                part: "x",
                iterate: { source: "literal:5", kind: "count" },
              },
            ],
          },
        },
      } as ComponentContract),
    ).toThrow(/must be a prop: or channel:<name>\.value/);
  });

  it("rejects channel:X.value iterate.source when X is not a known channel", () => {
    expect(() =>
      buildComponentIR({
        name: "UnknownChannelSource",
        anatomy: {
          parts: ["root", "x"],
          dom: {
            tag: "div",
            part: "root",
            children: [
              {
                tag: "div",
                part: "x",
                iterate: { source: "channel:nonexistent.value", kind: "count" },
              },
            ],
          },
        },
        // No channels declared.
        props: { styled: { members: [] } },
      } as ComponentContract),
    ).toThrow(/iterate\.source references unknown channel 'nonexistent'/);
  });

  it("accepts channel:X.value iterate.source when X is declared", () => {
    const ir = buildComponentIR({
      name: "ChannelArraySource",
      anatomy: {
        parts: ["root", "x"],
        dom: {
          tag: "ul",
          part: "root",
          children: [
            {
              tag: "li",
              part: "x",
              iterate: {
                source: "channel:selection.value",
                kind: "array",
                itemType: "string",
              },
              children: [{ tag: "span", content: "iter:item" }],
            },
          ],
        },
      },
      channels: {
        selection: {
          value: "value",
          defaultValue: "defaultValue",
          onChange: "onValueChange",
          valueType: "string[]",
        },
      },
      props: {
        styled: {
          members: [
            { name: "value", type: "string[]" },
            { name: "defaultValue", type: "string[]" },
            { name: "onValueChange", type: "(value: string[]) => void" },
          ],
        },
      },
    } as unknown as ComponentContract);
    // The iteration's source binding survives intact; sourceProp is
    // resolved to the channel's valueProp by the validator.
    const iter = ir.dom!.children[0].iteration!;
    expect(iter.source).toEqual({
      kind: "channel",
      channel: "selection",
      field: "value",
    });
    expect(iter.sourceProp).toBe("value");
  });

  it("rejects iterate + content on the same node", () => {
    expect(() =>
      buildComponentIR({
        name: "IterContent",
        anatomy: {
          parts: ["root", "x"],
          dom: {
            tag: "div",
            part: "root",
            children: [
              {
                tag: "span",
                part: "x",
                iterate: { source: "prop:n", kind: "count" },
                content: "prop:label",
              },
            ],
          },
        },
        props: {
          styled: {
            members: [
              { name: "n", type: "number" },
              { name: "label", type: "string" },
            ],
          },
        },
      } as ComponentContract),
    ).toThrow(/`iterate` and `content` are mutually exclusive/);
  });

  it("accepts Array<T> and ReadonlyArray<T> as array-typed sources", () => {
    expect(() =>
      buildComponentIR({
        name: "GenericArray",
        types: { Item: { kind: "object", fields: { id: "string" } } },
        anatomy: {
          parts: ["root", "x"],
          dom: {
            tag: "div",
            part: "root",
            children: [
              {
                tag: "div",
                part: "x",
                iterate: {
                  source: "prop:items",
                  kind: "array",
                  itemType: "Item",
                },
              },
            ],
          },
        },
        props: {
          styled: { members: [{ name: "items", type: "Array<Item>" }] },
        },
      } as ComponentContract),
    ).not.toThrow();
    expect(() =>
      buildComponentIR({
        name: "ReadonlyArray",
        types: { Item: { kind: "object", fields: { id: "string" } } },
        anatomy: {
          parts: ["root", "x"],
          dom: {
            tag: "div",
            part: "root",
            children: [
              {
                tag: "div",
                part: "x",
                iterate: {
                  source: "prop:items",
                  kind: "array",
                  itemType: "Item",
                },
              },
            ],
          },
        },
        props: {
          styled: {
            members: [{ name: "items", type: "ReadonlyArray<Item>" }],
          },
        },
      } as ComponentContract),
    ).not.toThrow();
  });
});

describe("propertyBindings (DOM-PROPERTY-REFLECTION-IR-CHECKBOX-INDETERMINATE-01)", () => {
  it("parses properties.indeterminate into propertyBindings, distinct from bindings", () => {
    const ir = buildComponentIR({
      name: "TestCheckbox",
      anatomy: {
        parts: ["input"],
        dom: {
          tag: "input",
          part: "input",
          attrs: { type: "checkbox" },
          bindings: {
            checked: "channel:checked.value",
            "aria-checked":
              "conditional:prop:indeterminate|literal:mixed|channel:checked.value",
          },
          properties: {
            indeterminate: "prop:indeterminate",
          },
          events: {
            change: "channel:checked.onChange",
          },
        } as any,
      },
      channels: {
        checked: {
          value: "checked",
          defaultValue: "defaultChecked",
          onChange: "onCheckedChange",
        },
      },
      props: {
        styled: {
          members: [
            { name: "checked", type: "boolean" },
            { name: "defaultChecked", type: "boolean" },
            { name: "onCheckedChange", type: "(value: boolean) => void" },
            { name: "indeterminate", type: "boolean" },
          ],
        },
      },
    } as ComponentContract);

    expect(ir.dom?.propertyBindings).toEqual({
      indeterminate: { kind: "prop", prop: "indeterminate" },
    });
    // Distinct storage: indeterminate must NOT also appear in bindings.
    expect(ir.dom?.bindings.indeterminate).toBeUndefined();
    // aria-checked stays a real attribute binding (conditional expression),
    // proving the two facts coexist via different mechanisms on the same node.
    expect(ir.dom?.bindings["aria-checked"]).toEqual({
      kind: "conditional",
      condition: { kind: "prop", prop: "indeterminate" },
      whenTrue: { kind: "literal", value: "mixed" },
      whenFalse: { kind: "channel", channel: "checked", field: "value" },
    });
  });

  it("returns propertyBindings: {} when the contract declares no properties block", () => {
    const ir = buildComponentIR({
      name: "TestNoProperties",
      anatomy: {
        parts: ["root"],
        dom: { tag: "div", part: "root" },
      },
    } as ComponentContract);
    expect(ir.dom?.propertyBindings).toEqual({});
  });

  it("rejects properties.indeterminate on a non-input host (div)", () => {
    expect(() =>
      buildComponentIR({
        name: "TestBadHostDiv",
        anatomy: {
          parts: ["root"],
          dom: {
            tag: "div",
            part: "root",
            properties: { indeterminate: "prop:indeterminate" },
          } as any,
        },
        props: {
          styled: { members: [{ name: "indeterminate", type: "boolean" }] },
        },
      } as ComponentContract),
    ).toThrow(/properties\.indeterminate requires a DOM node shaped/);
  });

  it("rejects properties.indeterminate on a slot host", () => {
    expect(() =>
      buildComponentIR({
        name: "TestBadHostSlot",
        anatomy: {
          parts: ["root"],
          dom: {
            tag: "slot",
            part: "root",
            properties: { indeterminate: "prop:indeterminate" },
          } as any,
        },
        props: {
          styled: { members: [{ name: "indeterminate", type: "boolean" }] },
        },
      } as ComponentContract),
    ).toThrow(/properties\.indeterminate requires a DOM node shaped/);
  });

  it("rejects properties.indeterminate on a componentRef host", () => {
    expect(() =>
      buildComponentIR({
        name: "TestBadHostComponentRef",
        anatomy: {
          parts: ["root"],
          dom: {
            componentRef: "fsds.Input",
            part: "root",
            properties: { indeterminate: "prop:indeterminate" },
          } as any,
        },
        props: {
          styled: { members: [{ name: "indeterminate", type: "boolean" }] },
        },
      } as ComponentContract),
    ).toThrow(/properties\.indeterminate requires a DOM node shaped/);
  });

  it("rejects properties.indeterminate on a non-checkbox input (type=text)", () => {
    expect(() =>
      buildComponentIR({
        name: "TestBadHostTextInput",
        anatomy: {
          parts: ["input"],
          dom: {
            tag: "input",
            part: "input",
            attrs: { type: "text" },
            properties: { indeterminate: "prop:indeterminate" },
          } as any,
        },
        props: {
          styled: { members: [{ name: "indeterminate", type: "boolean" }] },
        },
      } as ComponentContract),
    ).toThrow(/properties\.indeterminate requires a DOM node shaped/);
  });

  it("rejects properties.indeterminate on an input with no type attr at all", () => {
    expect(() =>
      buildComponentIR({
        name: "TestBadHostNoType",
        anatomy: {
          parts: ["input"],
          dom: {
            tag: "input",
            part: "input",
            properties: { indeterminate: "prop:indeterminate" },
          } as any,
        },
        props: {
          styled: { members: [{ name: "indeterminate", type: "boolean" }] },
        },
      } as ComponentContract),
    ).toThrow(/properties\.indeterminate requires a DOM node shaped/);
  });

  it("accepts properties.indeterminate on input type=checkbox (eligible host)", () => {
    const ir = buildComponentIR({
      name: "TestGoodHost",
      anatomy: {
        parts: ["input"],
        dom: {
          tag: "input",
          part: "input",
          attrs: { type: "checkbox" },
          properties: { indeterminate: "prop:indeterminate" },
        } as any,
      },
      props: {
        styled: { members: [{ name: "indeterminate", type: "boolean" }] },
      },
    } as ComponentContract);
    expect(ir.dom?.propertyBindings).toEqual({
      indeterminate: { kind: "prop", prop: "indeterminate" },
    });
  });
});

describe("cssVariableBindings", () => {
  it("parses well-formed bindings into CssVarBindingIR[] in order", () => {
    const ir = buildComponentIR({
      name: "Progress",
      anatomy: {
        parts: ["root", "fill"],
        dom: {
          tag: "div",
          part: "root",
          children: [
            {
              tag: "div",
              part: "fill",
              cssVariableBindings: {
                "--fsds-progress-fill-width": "prop:value",
                "--fsds-progress-intent": "prop:intent",
              },
            },
          ],
        },
      },
      props: {
        styled: {
          members: [
            { name: "value", type: "number" },
            { name: "intent", type: "string" },
          ],
        },
      },
    } as ComponentContract);
    const fill = ir.dom!.children[0];
    expect(fill.cssVarBindings).toEqual([
      {
        varName: "--fsds-progress-fill-width",
        value: { kind: "prop", prop: "value" },
      },
      {
        varName: "--fsds-progress-intent",
        value: { kind: "prop", prop: "intent" },
      },
    ]);
  });

  it("rejects var names that don't include the component's cssPrefix", () => {
    expect(() =>
      buildComponentIR({
        name: "Progress",
        anatomy: {
          parts: ["root"],
          dom: {
            tag: "div",
            part: "root",
            cssVariableBindings: {
              "--fsds-truncate-lines": "prop:value",
            },
          },
        },
        props: {
          styled: { members: [{ name: "value", type: "number" }] },
        },
      } as ComponentContract),
    ).toThrow(/must match --fsds-progress-<name>/);
  });

  it("rejects bindings that reference an unknown prop", () => {
    expect(() =>
      buildComponentIR({
        name: "Progress",
        anatomy: {
          parts: ["root"],
          dom: {
            tag: "div",
            part: "root",
            cssVariableBindings: {
              "--fsds-progress-value": "prop:nope",
            },
          },
        },
        props: { styled: { members: [{ name: "value", type: "number" }] } },
      } as ComponentContract),
    ).toThrow(
      /cssVariableBindings '--fsds-progress-value' references unknown prop 'nope'/,
    );
  });

  it("rejects cssVariableBindings + literal attrs.style on the same node", () => {
    expect(() =>
      buildComponentIR({
        name: "Progress",
        anatomy: {
          parts: ["root"],
          dom: {
            tag: "div",
            part: "root",
            attrs: { style: "color: red;" },
            cssVariableBindings: {
              "--fsds-progress-value": "prop:value",
            },
          },
        },
        props: { styled: { members: [{ name: "value", type: "number" }] } },
      } as ComponentContract),
    ).toThrow(
      /`cssVariableBindings` and a literal `attrs.style` cannot both be set/,
    );
  });

  it("leaves cssVarBindings empty for nodes without the field", () => {
    const ir = buildComponentIR({
      name: "Bare",
      anatomy: {
        parts: ["root"],
        dom: { tag: "div", part: "root" },
      },
    } as ComponentContract);
    expect(ir.dom!.cssVarBindings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// BINDING-EXPRESSION-V2-01: iteration-local grammar + V1 normalization
// ---------------------------------------------------------------------------

describe("BindingExpressionV2 — iteration locals", () => {
  function withIteratingDom(opts: {
    iterateKind: "count" | "array";
    iterateSource: string;
    binding: string;
    extraProps?: Array<{ name: string; type: string }>;
  }): ComponentContract {
    return {
      name: "V2Fixture",
      cssPrefix: "v2-fixture",
      anatomy: {
        parts: ["root", "cell"],
        dom: {
          tag: "ul",
          part: "root",
          children: [
            {
              tag: "li",
              part: "cell",
              iterate:
                opts.iterateKind === "array"
                  ? {
                      source: opts.iterateSource,
                      kind: "array",
                      itemType: "string",
                    }
                  : { source: opts.iterateSource, kind: "count" },
              bindings: { "data-index": opts.binding },
            },
          ],
        },
      },
      props: {
        styled: {
          members: [
            opts.iterateKind === "count"
              ? { name: "count", type: "number" }
              : {
                  name: "rows",
                  type: "string[]",
                  description: "Items to render",
                },
            ...(opts.extraProps ?? []),
          ],
        },
      },
    } as unknown as ComponentContract;
  }

  it("auto-promotes prop:index inside count iteration to iterationLocal", () => {
    const ir = buildComponentIR(
      withIteratingDom({
        iterateKind: "count",
        iterateSource: "prop:count",
        binding: "prop:index",
      }),
    );
    expect(ir.dom!.children[0].bindings["data-index"]).toEqual({
      kind: "iterationLocal",
      local: "index",
    });
  });

  it("auto-promotes prop:item inside array iteration to iterationLocal", () => {
    const ir = buildComponentIR(
      withIteratingDom({
        iterateKind: "array",
        iterateSource: "prop:rows",
        binding: "prop:item",
      }),
    );
    expect(ir.dom!.children[0].bindings["data-index"]).toEqual({
      kind: "iterationLocal",
      local: "item",
    });
  });

  it("accepts explicit iter:index form (no auto-promotion needed)", () => {
    const ir = buildComponentIR(
      withIteratingDom({
        iterateKind: "count",
        iterateSource: "prop:count",
        binding: "iter:index",
      }),
    );
    expect(ir.dom!.children[0].bindings["data-index"]).toEqual({
      kind: "iterationLocal",
      local: "index",
    });
  });

  it("does NOT promote prop:X when X is not the iteration's declared indexVar/itemVar", () => {
    // Real prop named "foo" — still a prop binding, not an iteration local.
    const ir = buildComponentIR(
      withIteratingDom({
        iterateKind: "count",
        iterateSource: "prop:count",
        binding: "prop:foo",
        extraProps: [{ name: "foo", type: "string" }],
      }),
    );
    expect(ir.dom!.children[0].bindings["data-index"]).toEqual({
      kind: "prop",
      prop: "foo",
    });
  });

  it("rejects iter:item under count iteration (no item exists)", () => {
    expect(() =>
      buildComponentIR(
        withIteratingDom({
          iterateKind: "count",
          iterateSource: "prop:count",
          binding: "iter:item",
        }),
      ),
    ).toThrow(/iter:item.*count-kind iteration/);
  });

  it("accepts iter:item under array iteration", () => {
    const ir = buildComponentIR(
      withIteratingDom({
        iterateKind: "array",
        iterateSource: "prop:rows",
        binding: "iter:item",
      }),
    );
    expect(ir.dom!.children[0].bindings["data-index"]).toEqual({
      kind: "iterationLocal",
      local: "item",
    });
  });

  it("rejects iter:index outside any iteration scope", () => {
    expect(() =>
      buildComponentIR({
        name: "V2NoIter",
        cssPrefix: "v2-no-iter",
        anatomy: {
          parts: ["root"],
          dom: {
            tag: "div",
            part: "root",
            bindings: { "data-index": "iter:index" },
          },
        },
        props: { styled: { members: [] } },
      } as unknown as ComponentContract),
    ).toThrow(/iter:index.*not inside any `iterate` block/);
  });

  it("rejects prop:undeclared outside iteration (validation still catches typos)", () => {
    // Pre-V2 sanity: outside iteration, `prop:index` must refer to a real
    // prop named `index`. With no such prop declared, validation throws.
    expect(() =>
      buildComponentIR({
        name: "V2BadProp",
        cssPrefix: "v2-bad",
        anatomy: {
          parts: ["root"],
          dom: {
            tag: "div",
            part: "root",
            bindings: { "data-x": "prop:index" },
          },
        },
        props: { styled: { members: [] } },
      } as unknown as ComponentContract),
    ).toThrow(/references unknown prop 'index'/);
  });

  it("nested iterations resolve iter:index to the nearest enclosing scope", () => {
    // The inner iteration's indexVar shadows the outer one's. A binding on
    // the inner iterating node sees the inner index.
    const ir = buildComponentIR({
      name: "V2Nested",
      cssPrefix: "v2-nested",
      anatomy: {
        parts: ["outer", "inner"],
        dom: {
          tag: "ul",
          part: "outer",
          children: [
            {
              tag: "li",
              iterate: { source: "prop:outerRows", kind: "array", itemType: "string[]" },
              children: [
                {
                  tag: "span",
                  part: "inner",
                  iterate: { source: "prop:innerCount", kind: "count" },
                  bindings: { "data-inner-index": "iter:index" },
                },
              ],
            },
          ],
        },
      },
      props: {
        styled: {
          members: [
            { name: "outerRows", type: "string[][]" },
            { name: "innerCount", type: "number" },
          ],
        },
      },
    } as unknown as ComponentContract);
    const inner = ir.dom!.children[0].children[0];
    expect(inner.bindings["data-inner-index"]).toEqual({
      kind: "iterationLocal",
      local: "index",
    });
  });

  it("resolves iter:index to the iteration's declared indexVar at emit (not literal 'index')", () => {
    // Contract author overrides indexVar; the IR still carries
    // { kind: "iterationLocal", local: "index" } — the emitter looks up
    // the lexical name from the iteration's indexVar when lowering.
    const ir = buildComponentIR({
      name: "V2Renamed",
      cssPrefix: "v2-renamed",
      anatomy: {
        parts: ["root", "cell"],
        dom: {
          tag: "ul",
          part: "root",
          children: [
            {
              tag: "li",
              part: "cell",
              iterate: { source: "prop:count", kind: "count", indexVar: "dayIndex" },
              bindings: { "data-day": "iter:index" },
            },
          ],
        },
      },
      props: { styled: { members: [{ name: "count", type: "number" }] } },
    } as unknown as ComponentContract);
    // IR carries the role, not the variable name. The variable name
    // lives on `iteration.indexVar` and is resolved at emit time.
    expect(ir.dom!.children[0].bindings["data-day"]).toEqual({
      kind: "iterationLocal",
      local: "index",
    });
    expect(ir.dom!.children[0].iteration!.indexVar).toBe("dayIndex");
  });

  // ------------------------------------------------------------------
  // BINDING-EXPRESSION-V2-PATH-01: scope rules for paths
  // ------------------------------------------------------------------

  it("accepts iter:item.value under array iteration (object-field projection)", () => {
    // Synthetic contract: items are objects with a `value` field. The
    // IR carries the path; the framework type-checker enforces that
    // the projection is well-typed against the declared itemType.
    const ir = buildComponentIR({
      name: "V2PathArray",
      cssPrefix: "v2-path-array",
      anatomy: {
        parts: ["root", "cell"],
        dom: {
          tag: "ul",
          part: "root",
          children: [
            {
              tag: "li",
              part: "cell",
              iterate: {
                source: "prop:rows",
                kind: "array",
                itemType: "{ value: string; label: string }",
              },
              bindings: { "data-value": "iter:item.value" },
            },
          ],
        },
      },
      props: {
        styled: {
          members: [
            {
              name: "rows",
              type: "Array<{ value: string; label: string }>",
            },
          ],
        },
      },
    } as unknown as ComponentContract);
    expect(ir.dom!.children[0].bindings["data-value"]).toEqual({
      kind: "iterationLocal",
      local: "item",
      path: ["value"],
    });
  });

  it("rejects iter:item.value under count iteration (no item exists)", () => {
    // The iter:item scope check fires *before* path-validity checks —
    // count iteration has no `item`, so any iter:item form (with or
    // without path) is a scope error.
    expect(() =>
      buildComponentIR(
        withIteratingDom({
          iterateKind: "count",
          iterateSource: "prop:count",
          binding: "iter:item.value",
        }),
      ),
    ).toThrow(/iter:item.*count-kind iteration/);
  });

  it("rejects iter:index.<anything> (index resolves to a number)", () => {
    // iter:index is the loop index (number-typed). Object-field paths
    // are only meaningful on object-shaped values; the validator catches
    // this with a typed message rather than silently emitting `index.foo`.
    expect(() =>
      buildComponentIR(
        withIteratingDom({
          iterateKind: "array",
          iterateSource: "prop:rows",
          binding: "iter:index.value",
        }),
      ),
    ).toThrow(/iter:index\.value.*loop index.*number/);
  });

  it("rejects path on iterate.source itself (out of scope this slice)", () => {
    // iterate.source must be a bare prop:<name> or channel:<name>.value.
    // Property paths on the iteration root are explicitly held for a
    // future nested-iteration grammar.
    expect(() =>
      buildComponentIR({
        name: "V2PathOnSource",
        cssPrefix: "v2-path-on-source",
        anatomy: {
          parts: ["root", "cell"],
          dom: {
            tag: "ul",
            part: "root",
            children: [
              {
                tag: "li",
                part: "cell",
                iterate: {
                  source: "prop:groups.items",
                  kind: "array",
                  itemType: "string",
                },
                bindings: { "data-x": "iter:item" },
              },
            ],
          },
        },
        props: {
          styled: {
            members: [
              { name: "groups", type: "{ items: string[] }[]" },
            ],
          },
        },
      } as unknown as ComponentContract),
    ).toThrow(/iterate\.source must be a bare prop:<name>/);
  });

  it("preserves path through prop:item.<field> auto-promotion (carry-through)", () => {
    // V1 contracts only ever wrote bare `prop:item` / `prop:index`, but
    // the V2 promotion code is path-aware so a `prop:item.value` form
    // (synthetic — no production contract uses this) still ends up as
    // `iterationLocal item path:[value]` rather than dropping the path.
    const ir = buildComponentIR({
      name: "V2PromoteWithPath",
      cssPrefix: "v2-promote-with-path",
      anatomy: {
        parts: ["root", "cell"],
        dom: {
          tag: "ul",
          part: "root",
          children: [
            {
              tag: "li",
              part: "cell",
              iterate: {
                source: "prop:rows",
                kind: "array",
                itemType: "{ value: string }",
              },
              bindings: { "data-v": "prop:item.value" },
            },
          ],
        },
      },
      props: {
        styled: { members: [{ name: "rows", type: "Array<{ value: string }>" }] },
      },
    } as unknown as ComponentContract);
    expect(ir.dom!.children[0].bindings["data-v"]).toEqual({
      kind: "iterationLocal",
      local: "item",
      path: ["value"],
    });
  });

  it("rejects iter:item.value with no enclosing iteration", () => {
    // iter:item scope check still applies — path doesn't bypass scope.
    expect(() =>
      buildComponentIR({
        name: "V2PathNoIter",
        cssPrefix: "v2-path-no-iter",
        anatomy: {
          parts: ["root"],
          dom: {
            tag: "div",
            part: "root",
            bindings: { "data-v": "iter:item.value" },
          },
        },
        props: { styled: { members: [] } },
      } as unknown as ComponentContract),
    ).toThrow(/iter:item.*not inside any `iterate` block/);
  });
});

// ---------------------------------------------------------------------------
// A11Y-CONTRACT-OBLIGATION-VALIDATOR-01
// ---------------------------------------------------------------------------

describe("A11y obligation validator (anatomy.dom role obligations)", () => {
  function makeContract(opts: {
    role?: string;
    extraAttrs?: Record<string, string>;
    bindings?: Record<string, string>;
    suppress?: Array<{ role: string; attr: string; reason: string }>;
  }): ComponentContract {
    const attrs: Record<string, string> = {};
    if (opts.role) attrs.role = opts.role;
    Object.assign(attrs, opts.extraAttrs ?? {});
    return {
      name: "A11yFixture",
      cssPrefix: "a11y-fixture",
      anatomy: {
        parts: ["root", "item"],
        dom: {
          tag: "ul",
          part: "root",
          children: [
            {
              tag: "li",
              part: "item",
              attrs,
              bindings: opts.bindings,
            },
          ],
        },
      },
      props: { styled: { members: [] } },
      a11y: opts.suppress
        ? { obligations: { suppress: opts.suppress } }
        : undefined,
    } as unknown as ComponentContract;
  }

  it("rejects role='option' without aria-selected (no suppression)", () => {
    expect(() =>
      buildComponentIR(makeContract({ role: "option" })),
    ).toThrow(
      /\[A11yFixture\] anatomy\.dom node \(part="item"\) has `role="option"` but is missing the required ARIA attribute 'aria-selected'/,
    );
  });

  it("error message names component, part, role, missing attr, and remediation", () => {
    let captured: Error | undefined;
    try {
      buildComponentIR(makeContract({ role: "option" }));
    } catch (e) {
      captured = e as Error;
    }
    expect(captured).toBeDefined();
    const msg = captured!.message;
    // Component name
    expect(msg).toContain("[A11yFixture]");
    // Part identifier
    expect(msg).toContain('part="item"');
    // Role
    expect(msg).toContain('role="option"');
    // Missing attr
    expect(msg).toContain("aria-selected");
    // Remediation path 1: declare via attrs / bindings
    expect(msg).toMatch(/Declare the attribute under `attrs` .* or `bindings`/);
    // Remediation path 2: explicit suppression
    expect(msg).toMatch(/suppression under `a11y\.obligations\.suppress`/);
  });

  it("accepts role='option' with static attrs.aria-selected", () => {
    expect(() =>
      buildComponentIR(
        makeContract({
          role: "option",
          extraAttrs: { "aria-selected": "true" },
        }),
      ),
    ).not.toThrow();
  });

  it("accepts role='option' with dynamic aria-selected binding", () => {
    expect(() =>
      buildComponentIR(
        makeContract({
          role: "option",
          // `literal:` binding is structurally satisfied by the validator;
          // truthfulness of the literal is the contract author's
          // responsibility. The validator only checks presence, not value.
          bindings: { "aria-selected": "literal:true" },
        }),
      ),
    ).not.toThrow();
  });

  it("downgrades to advisory diagnostic when a matching suppression exists", () => {
    const ir = buildComponentIR(
      makeContract({
        role: "option",
        suppress: [
          {
            role: "option",
            attr: "aria-selected",
            reason: "Per-item selection state needs property-path grammar",
          },
        ],
      }),
    );
    expect(ir.unresolvedA11yObligations).toHaveLength(1);
    expect(ir.unresolvedA11yObligations[0]).toEqual({
      role: "option",
      attr: "aria-selected",
      reason: "Per-item selection state needs property-path grammar",
      part: "item",
    });
  });

  it("ignores suppression entries that don't match a real obligation", () => {
    // Suppression for role="button" / attr="aria-pressed" — neither
    // appears in the dom. The validator should not surface a
    // spurious diagnostic; the IR's unresolvedA11yObligations is empty.
    const ir = buildComponentIR(
      makeContract({
        role: "option",
        extraAttrs: { "aria-selected": "true" },
        suppress: [
          { role: "button", attr: "aria-pressed", reason: "n/a" },
        ],
      }),
    );
    expect(ir.unresolvedA11yObligations).toEqual([]);
  });

  it("non-option roles are not constrained (table is bounded to roles in production)", () => {
    // role="group" has no required attrs in this minimal validator;
    // it should pass without aria-selected. If a future slice extends
    // the obligation table to cover group, this test should be updated
    // in lockstep.
    expect(() =>
      buildComponentIR(makeContract({ role: "group" })),
    ).not.toThrow();
  });

  it("contracts without anatomy.dom skip a11y validation entirely", () => {
    // Defensive: pre-DOM contracts should not be perturbed by the
    // obligation walker. `unresolvedA11yObligations` must be present
    // (empty array) so consumers can rely on the field shape.
    const ir = buildComponentIR({
      name: "NoDom",
      anatomy: { parts: ["root"] },
      props: { styled: { members: [] } },
    } as unknown as ComponentContract);
    expect(ir.dom).toBeUndefined();
    expect(ir.unresolvedA11yObligations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// BINDING-EXPRESSION-V2-PREDICATE-01: closed predicate grammar
// ---------------------------------------------------------------------------

describe("parseBindingExpression — predicates (V2-PREDICATE-01)", () => {
  it("parses predicate:eq with two value-shaped operands", () => {
    expect(parseBindingExpression("predicate:eq(prop:value, prop:other)")).toEqual({
      kind: "predicate",
      op: "eq",
      left: { kind: "prop", prop: "value" },
      right: { kind: "prop", prop: "other" },
    });
  });

  it("parses predicate:contains with channel collection + iter:item operand", () => {
    expect(
      parseBindingExpression("predicate:contains(channel:selection.value, iter:item.value)"),
    ).toEqual({
      kind: "predicate",
      op: "contains",
      left: { kind: "channel", channel: "selection", field: "value" },
      right: { kind: "iterationLocal", local: "item", path: ["value"] },
    });
  });

  it("parses predicate:memberOf with iter:item.value candidate and channel scalarOrCollection", () => {
    expect(
      parseBindingExpression("predicate:memberOf(iter:item.value, channel:selection.value)"),
    ).toEqual({
      kind: "predicate",
      op: "memberOf",
      left: { kind: "iterationLocal", local: "item", path: ["value"] },
      right: { kind: "channel", channel: "selection", field: "value" },
    });
  });

  it("accepts trim around the comma (predicate:eq(a,  b))", () => {
    // Naive split tolerates extra space after the comma.
    expect(parseBindingExpression("predicate:eq(prop:value,  prop:other)")).toEqual({
      kind: "predicate",
      op: "eq",
      left: { kind: "prop", prop: "value" },
      right: { kind: "prop", prop: "other" },
    });
  });

  it("rejects nested predicates (operand kind=predicate is illegal)", () => {
    // The inner predicate parses; the outer parser rejects it as an operand
    // and falls through to literal so the malformed form appears in output.
    const expr = "predicate:eq(predicate:eq(prop:a, prop:b), prop:c)";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });

  it("rejects literal operands (literals have no comparison semantics)", () => {
    const expr = "predicate:eq(literal:foo, prop:value)";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });

  it("rejects arbitrary JS comparison (=== is not the grammar)", () => {
    const expr = "iter:item.value === channel:selection.value";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });

  it("rejects unknown predicate op", () => {
    const expr = "predicate:notAnOp(prop:value, prop:other)";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });

  it("rejects predicate with single operand", () => {
    const expr = "predicate:eq(prop:value)";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });

  it("rejects predicate with three operands", () => {
    const expr = "predicate:eq(prop:a, prop:b, prop:c)";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });

  it("rejects predicate with empty operand", () => {
    const expr = "predicate:eq(prop:value, )";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });

  it("rejects predicate missing parens", () => {
    const expr = "predicate:eq prop:value, prop:other";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });
});

describe("parseBindingExpression — channelCall (FEAT-BINDING-CALL-WITH-ARG-01)", () => {
  it("parses channel:X.onChange(iter:item.value) — the Select option-click witness", () => {
    // The call carries the channel name and one iterationLocal arg with a
    // path projection, so the emitter can lower `() => setSelection(item.value)`.
    expect(parseBindingExpression("channel:selection.onChange(iter:item.value)")).toEqual({
      kind: "channelCall",
      channel: "selection",
      arg: { kind: "iterationLocal", local: "item", path: ["value"] },
    });
  });

  it("parses channel:X.onChange(iter:item) with a whole-item Date payload — the Calendar day witness", () => {
    expect(parseBindingExpression("channel:value.onChange(iter:item)")).toEqual({
      kind: "channelCall",
      channel: "value",
      arg: { kind: "iterationLocal", local: "item" },
    });
  });

  it("parses an iter:index argument (a number payload)", () => {
    expect(parseBindingExpression("channel:sel.onChange(iter:index)")).toEqual({
      kind: "channelCall",
      channel: "sel",
      arg: { kind: "iterationLocal", local: "index" },
    });
  });

  it("parses a prop argument (with a path projection)", () => {
    expect(parseBindingExpression("channel:sel.onChange(prop:current.id)")).toEqual({
      kind: "channelCall",
      channel: "sel",
      arg: { kind: "prop", prop: "current", path: ["id"] },
    });
  });

  it("parses a literal argument", () => {
    expect(parseBindingExpression("channel:sel.onChange(literal:reset)")).toEqual({
      kind: "channelCall",
      channel: "sel",
      arg: { kind: "literal", value: "reset" },
    });
  });

  it("still parses the bare channel:X.onChange (no-arg) form as a channel callback", () => {
    // The call form is matched BEFORE the bare form, but only when a `(...)`
    // is present — the bare form must be undisturbed.
    expect(parseBindingExpression("channel:selection.onChange")).toEqual({
      kind: "channel",
      channel: "selection",
      field: "onChange",
    });
  });

  it("rejects a channel argument — reading another channel's live value is not a closed payload", () => {
    // Falsification: a channel-valued payload would be a composed-setter case
    // (held for a successor). The whole form falls through to literal so the
    // authoring error appears verbatim in output.
    const expr = "channel:sel.onChange(channel:open.value)";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });

  it("rejects a predicate argument — no boolean payloads, no nesting", () => {
    const expr = "channel:sel.onChange(predicate:eq(iter:item, prop:x))";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });

  it("rejects a nested channelCall argument — the grammar has no escape hatch", () => {
    const expr = "channel:sel.onChange(channel:other.onChange(iter:item))";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });

  it("rejects an empty argument list", () => {
    const expr = "channel:sel.onChange()";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });

  it("rejects a conditional argument", () => {
    const expr = "channel:sel.onChange(conditional:prop:a|prop:b|prop:c)";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });
});

describe("parseBindingExpression — channelUpdate (FEAT-CHANNEL-UPDATE-OPERATIONS-01)", () => {
  it("parses setCharAt(iter:index) — the OTP per-field witness", () => {
    expect(parseBindingExpression("channel:value.onChange:setCharAt(iter:index)")).toEqual({
      kind: "channelUpdate",
      channel: "value",
      op: "setCharAt",
      operands: [{ kind: "iterationLocal", local: "index" }],
    });
  });

  it("parses toggleMembership(iter:item.value, prop:multiple) — the Select multi witness", () => {
    expect(
      parseBindingExpression(
        "channel:selection.onChange:toggleMembership(iter:item.value, prop:multiple)",
      ),
    ).toEqual({
      kind: "channelUpdate",
      channel: "selection",
      op: "toggleMembership",
      operands: [
        { kind: "iterationLocal", local: "item", path: ["value"] },
        { kind: "prop", prop: "multiple" },
      ],
    });
  });

  it("rejects an unknown operation name — the vocabulary is closed", () => {
    // Falsification: an arbitrary op is not admitted; the whole form falls to
    // literal so the authoring error appears verbatim in output.
    const expr = "channel:value.onChange:spliceInto(iter:index)";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });

  it("rejects wrong arity for setCharAt (expects exactly 1 operand)", () => {
    const expr = "channel:value.onChange:setCharAt(iter:index, prop:x)";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });

  it("rejects wrong arity for toggleMembership (expects exactly 2 operands)", () => {
    const expr = "channel:selection.onChange:toggleMembership(iter:item.value)";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });

  it("rejects a channel operand — operands are value-shaped, no escape hatch", () => {
    const expr = "channel:value.onChange:setCharAt(channel:open.value)";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });

  it("rejects a predicate operand — no boolean/nested payloads", () => {
    const expr =
      "channel:selection.onChange:toggleMembership(predicate:eq(iter:item, prop:x), prop:multiple)";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });

  it("rejects an empty operand list", () => {
    const expr = "channel:value.onChange:setCharAt()";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });

  it("leaves the bare channel:X.onChange callback form undisturbed", () => {
    // The `:op(` form is matched only when a colon+op+parens is present.
    expect(parseBindingExpression("channel:value.onChange")).toEqual({
      kind: "channel",
      channel: "value",
      field: "onChange",
    });
  });

  it("leaves the plain channelCall channel:X.onChange(arg) form undisturbed", () => {
    expect(parseBindingExpression("channel:value.onChange(iter:item)")).toEqual({
      kind: "channelCall",
      channel: "value",
      arg: { kind: "iterationLocal", local: "item" },
    });
  });
});

describe("parseBindingExpression — conditionals (V2-CONDITIONAL-01)", () => {
  it("parses value-position conditional bindings", () => {
    expect(
      parseBindingExpression(
        "conditional:channel:expanded.value|prop:collapseText|prop:expandText",
      ),
    ).toEqual({
      kind: "conditional",
      condition: { kind: "channel", channel: "expanded", field: "value" },
      whenTrue: { kind: "prop", prop: "collapseText" },
      whenFalse: { kind: "prop", prop: "expandText" },
    });
  });

  it("rejects malformed conditionals by falling through to literal", () => {
    const expr = "conditional:channel:expanded.value|prop:collapseText";
    expect(parseBindingExpression(expr)).toEqual({ kind: "literal", value: expr });
  });
});

describe("predicate validator — context and scope", () => {
  function withPredicateBinding(opts: {
    bindingSite: "binding" | "content" | "event" | "css-var";
    expr: string;
    enclosingIterate?: { source: string; kind: "array" | "count"; itemType?: string };
    extraProps?: Array<{ name: string; type: string; default?: unknown }>;
    cssPrefix?: string;
  }): ComponentContract {
    const innerNode: ContractDomNode = {
      tag: "li",
      part: "item",
      ...(opts.enclosingIterate
        ? { iterate: opts.enclosingIterate as ContractDomNode["iterate"] }
        : {}),
      ...(opts.bindingSite === "binding"
        ? { bindings: { "aria-selected": opts.expr } }
        : opts.bindingSite === "content"
        ? { content: opts.expr }
        : opts.bindingSite === "event"
        ? { events: { click: opts.expr } }
        : {
            cssVariableBindings: {
              [`--fsds-${opts.cssPrefix ?? "p-fixture"}-x`]: opts.expr,
            },
          }),
    } as ContractDomNode;
    return {
      name: "PredicateFixture",
      cssPrefix: opts.cssPrefix ?? "p-fixture",
      anatomy: {
        parts: ["root", "item"],
        dom: {
          tag: "ul",
          part: "root",
          children: [innerNode],
        },
      },
      props: {
        styled: {
          members: [
            { name: "value", type: "string | string[]" },
            ...(opts.extraProps ?? []),
          ],
        },
      },
      channels: {
        selection: {
          value: "value",
          defaultValue: "defaultValue",
          onChange: "onValueChange",
          valueType: "string | string[]",
        },
      },
    } as unknown as ComponentContract;
  }

  it("accepts predicate in attribute-binding position", () => {
    const ir = buildComponentIR(
      withPredicateBinding({
        bindingSite: "binding",
        expr: "predicate:memberOf(iter:item, channel:selection.value)",
        enclosingIterate: { source: "channel:selection.value", kind: "array", itemType: "string" },
      }),
    );
    expect(ir.dom!.children[0].bindings["aria-selected"]).toEqual({
      kind: "predicate",
      op: "memberOf",
      left: { kind: "iterationLocal", local: "item" },
      right: { kind: "channel", channel: "selection", field: "value" },
    });
  });

  it("rejects predicate in content position", () => {
    expect(() =>
      buildComponentIR(
        withPredicateBinding({
          bindingSite: "content",
          expr: "predicate:eq(prop:value, prop:value)",
        }),
      ),
    ).toThrow(/predicate.*only legal in attribute-binding positions/);
  });

  it("rejects predicate in event position", () => {
    expect(() =>
      buildComponentIR(
        withPredicateBinding({
          bindingSite: "event",
          expr: "predicate:eq(prop:value, prop:value)",
        }),
      ),
    ).toThrow(/predicate.*only legal in attribute-binding positions/);
  });

  it("rejects predicate in cssVariableBindings position", () => {
    expect(() =>
      buildComponentIR(
        withPredicateBinding({
          bindingSite: "css-var",
          expr: "predicate:eq(prop:value, prop:value)",
        }),
      ),
    ).toThrow(/predicate.*only legal in attribute-binding positions/);
  });

  it("preserves iter:item scope rules inside predicate operands (rejects under count)", () => {
    expect(() =>
      buildComponentIR(
        withPredicateBinding({
          bindingSite: "binding",
          expr: "predicate:eq(iter:item.value, prop:value)",
          enclosingIterate: { source: "prop:count", kind: "count" },
          extraProps: [{ name: "count", type: "number" }],
        }),
      ),
    ).toThrow(/iter:item.*count-kind iteration/);
  });

  it("rejects unknown prop inside predicate operand", () => {
    expect(() =>
      buildComponentIR(
        withPredicateBinding({
          bindingSite: "binding",
          expr: "predicate:eq(prop:doesNotExist, prop:value)",
          enclosingIterate: { source: "channel:selection.value", kind: "array", itemType: "string" },
        }),
      ),
    ).toThrow(/references unknown prop 'doesNotExist'/);
  });

  it("rejects unknown channel inside predicate operand", () => {
    expect(() =>
      buildComponentIR(
        withPredicateBinding({
          bindingSite: "binding",
          expr: "predicate:eq(channel:unknown.value, prop:value)",
          enclosingIterate: { source: "channel:selection.value", kind: "array", itemType: "string" },
        }),
      ),
    ).toThrow(/references unknown channel 'unknown'/);
  });
});

describe("channelCall validator — context and scope (FEAT-BINDING-CALL-WITH-ARG-01)", () => {
  // Self-contained fixture builder (the predicate block's `withPredicateBinding`
  // is scoped to that describe). Same shape: one iterated `<li part="item">`
  // that hosts the expression under test at the requested binding site.
  function withCallArgBinding(opts: {
    bindingSite: "binding" | "content" | "event" | "css-var";
    expr: string;
    enclosingIterate?: { source: string; kind: "array" | "count"; itemType?: string };
    extraProps?: Array<{ name: string; type: string; default?: unknown }>;
    cssPrefix?: string;
  }): ComponentContract {
    const innerNode: ContractDomNode = {
      tag: "li",
      part: "item",
      ...(opts.enclosingIterate
        ? { iterate: opts.enclosingIterate as ContractDomNode["iterate"] }
        : {}),
      ...(opts.bindingSite === "binding"
        ? { bindings: { "aria-selected": opts.expr } }
        : opts.bindingSite === "content"
        ? { content: opts.expr }
        : opts.bindingSite === "event"
        ? { events: { click: opts.expr } }
        : {
            cssVariableBindings: {
              [`--fsds-${opts.cssPrefix ?? "c-fixture"}-x`]: opts.expr,
            },
          }),
    } as ContractDomNode;
    return {
      name: "CallArgValidatorFixture",
      cssPrefix: opts.cssPrefix ?? "c-fixture",
      anatomy: {
        parts: ["root", "item"],
        dom: { tag: "ul", part: "root", children: [innerNode] },
      },
      props: {
        styled: {
          members: [
            { name: "value", type: "string | string[]" },
            ...(opts.extraProps ?? []),
          ],
        },
      },
      channels: {
        selection: {
          value: "value",
          defaultValue: "defaultValue",
          onChange: "onValueChange",
          valueType: "string | string[]",
        },
      },
    } as unknown as ComponentContract;
  }

  it("accepts channelCall in event position and normalizes it onto the IR", () => {
    const ir = buildComponentIR(
      withCallArgBinding({
        bindingSite: "event",
        expr: "channel:selection.onChange(iter:item.value)",
        enclosingIterate: { source: "channel:selection.value", kind: "array", itemType: "string" },
      }),
    );
    expect(ir.dom!.children[0].events.click).toEqual({
      kind: "channelCall",
      channel: "selection",
      arg: { kind: "iterationLocal", local: "item", path: ["value"] },
    });
  });

  it("rejects channelCall in attribute-binding position (event-position only)", () => {
    // A channelCall produces a `() => setter(arg)` handler, not a value — it is
    // not admissible where an attribute value is expected.
    expect(() =>
      buildComponentIR(
        withCallArgBinding({
          bindingSite: "binding",
          expr: "channel:selection.onChange(iter:item.value)",
          enclosingIterate: { source: "channel:selection.value", kind: "array", itemType: "string" },
        }),
      ),
    ).toThrow(/only legal in `events` positions/);
  });

  it("rejects channelCall in content position", () => {
    expect(() =>
      buildComponentIR(
        // No iteration: `content` and `iterate` are mutually exclusive on one
        // node (that mutex fires first and would mask the event-position
        // check). A `prop:` argument needs no iteration scope, so this isolates
        // the content-position rejection cleanly.
        withCallArgBinding({
          bindingSite: "content",
          expr: "channel:selection.onChange(prop:value)",
        }),
      ),
    ).toThrow(/only legal in `events` positions/);
  });

  it("rejects channelCall in cssVariableBindings position", () => {
    expect(() =>
      buildComponentIR(
        withCallArgBinding({
          bindingSite: "css-var",
          expr: "channel:selection.onChange(iter:item.value)",
          enclosingIterate: { source: "channel:selection.value", kind: "array", itemType: "string" },
        }),
      ),
    ).toThrow(/only legal in `events` positions/);
  });

  it("rejects a channelCall on an unknown channel", () => {
    expect(() =>
      buildComponentIR(
        withCallArgBinding({
          bindingSite: "event",
          expr: "channel:nope.onChange(iter:item.value)",
          enclosingIterate: { source: "channel:selection.value", kind: "array", itemType: "string" },
        }),
      ),
    ).toThrow(/references unknown channel 'nope'/);
  });

  it("enforces iteration scope on the argument (iter:item under count is rejected)", () => {
    expect(() =>
      buildComponentIR(
        withCallArgBinding({
          bindingSite: "event",
          expr: "channel:selection.onChange(iter:item)",
          enclosingIterate: { source: "prop:count", kind: "count" },
          extraProps: [{ name: "count", type: "number" }],
        }),
      ),
    ).toThrow(/iter:item.*count-kind iteration/);
  });

  it("enforces iteration scope on the argument (iter:item with no enclosing iteration is rejected)", () => {
    expect(() =>
      buildComponentIR(
        withCallArgBinding({
          bindingSite: "event",
          expr: "channel:selection.onChange(iter:item)",
        }),
      ),
    ).toThrow(/not inside any `iterate` block/);
  });
});

describe("channelUpdate validator — context, scope, valueType (FEAT-CHANNEL-UPDATE-OPERATIONS-01)", () => {
  // Fixture: a `value` string channel (for setCharAt) AND a `selection`
  // array-capable channel plus a `multiple` prop (for toggleMembership),
  // hosting the expression under test at the requested binding site inside a
  // count-iterated `<li>` (so `iter:index` resolves).
  function withUpdateBinding(opts: {
    bindingSite: "binding" | "content" | "event";
    expr: string;
    iterate?: { source: string; kind: "array" | "count"; itemType?: string };
  }): ComponentContract {
    const innerNode: ContractDomNode = {
      tag: "li",
      part: "item",
      ...(opts.iterate ? { iterate: opts.iterate as ContractDomNode["iterate"] } : {}),
      ...(opts.bindingSite === "binding"
        ? { bindings: { "aria-selected": opts.expr } }
        : opts.bindingSite === "content"
        ? { content: opts.expr }
        : { events: { input: opts.expr } }),
    } as ContractDomNode;
    return {
      name: "UpdateValidatorFixture",
      cssPrefix: "u-fixture",
      anatomy: {
        parts: ["root", "item"],
        dom: { tag: "ul", part: "root", children: [innerNode] },
      },
      props: {
        styled: {
          members: [
            { name: "value", type: "string" },
            { name: "sel", type: "string | string[]" },
            { name: "length", type: "number" },
            { name: "multiple", type: "boolean" },
          ],
        },
      },
      channels: {
        value: { value: "value", onChange: "onValueChange", valueType: "string" },
        selection: { value: "sel", onChange: "onSelChange", valueType: "string | string[]" },
      },
    } as unknown as ComponentContract;
  }

  it("accepts setCharAt on a string channel in event position and normalizes it", () => {
    const ir = buildComponentIR(
      withUpdateBinding({
        bindingSite: "event",
        expr: "channel:value.onChange:setCharAt(iter:index)",
        iterate: { source: "prop:length", kind: "count" },
      }),
    );
    expect(ir.dom!.children[0].events.input).toEqual({
      kind: "channelUpdate",
      channel: "value",
      op: "setCharAt",
      operands: [{ kind: "iterationLocal", local: "index" }],
    });
  });

  it("accepts toggleMembership on an array-capable channel", () => {
    const ir = buildComponentIR(
      withUpdateBinding({
        bindingSite: "event",
        expr: "channel:selection.onChange:toggleMembership(iter:item.value, prop:multiple)",
        iterate: { source: "channel:selection.value", kind: "array", itemType: "string" },
      }),
    );
    expect(ir.dom!.children[0].events.input).toMatchObject({
      kind: "channelUpdate",
      channel: "selection",
      op: "toggleMembership",
    });
  });

  it("rejects channelUpdate in attribute-binding position (event-position only)", () => {
    expect(() =>
      buildComponentIR(
        withUpdateBinding({
          bindingSite: "binding",
          expr: "channel:value.onChange:setCharAt(iter:index)",
          iterate: { source: "prop:length", kind: "count" },
        }),
      ),
    ).toThrow(/only legal in `events` positions/);
  });

  it("rejects setCharAt on a NON-string channel — valueType incompatibility", () => {
    // Falsification: setCharAt sets a character; it is meaningless on the
    // `string | string[]` `selection` channel and must be rejected.
    expect(() =>
      buildComponentIR(
        withUpdateBinding({
          bindingSite: "event",
          expr: "channel:selection.onChange:setCharAt(iter:index)",
          iterate: { source: "prop:length", kind: "count" },
        }),
      ),
    ).toThrow(/requires a string channel/);
  });

  it("rejects toggleMembership on a NON-array channel — valueType incompatibility", () => {
    expect(() =>
      buildComponentIR(
        withUpdateBinding({
          bindingSite: "event",
          expr: "channel:value.onChange:toggleMembership(iter:item.value, prop:multiple)",
          iterate: { source: "channel:selection.value", kind: "array", itemType: "string" },
        }),
      ),
    ).toThrow(/requires an array-capable channel/);
  });

  it("rejects channelUpdate on an unknown channel", () => {
    expect(() =>
      buildComponentIR(
        withUpdateBinding({
          bindingSite: "event",
          expr: "channel:nope.onChange:setCharAt(iter:index)",
          iterate: { source: "prop:length", kind: "count" },
        }),
      ),
    ).toThrow(/references unknown channel 'nope'/);
  });

  it("enforces iteration scope on operands (iter:index with no enclosing iteration is rejected)", () => {
    expect(() =>
      buildComponentIR(
        withUpdateBinding({
          bindingSite: "event",
          expr: "channel:value.onChange:setCharAt(iter:index)",
        }),
      ),
    ).toThrow(/not inside any `iterate` block/);
  });
});

// CODEGEN-RECURSIVE-COMPOSITION-01: componentRef carries a by-reference
// composition fact through the IR — the recursive generalization of the
// Stack-consumption base case. These tests prove the fact is parsed and
// carried (Slice 1); emission is proven separately per framework.
describe("componentRef (by-reference composition fact)", () => {
  it("carries a dom-node componentRef as a bare name with empty tag", () => {
    const ir = buildComponentIR({
      name: "TestCard",
      anatomy: {
        parts: ["root", "actions"],
        dom: {
          tag: "div",
          part: "root",
          children: [{ componentRef: "fsds.Button", part: "actions" }],
        },
      },
    } as unknown as ComponentContract);
    const child = ir.dom?.children[0];
    expect(child?.componentRef).toBe("Button");
    // The discriminator is `componentRef !== undefined`; the normalized tag is
    // empty so the native-tag emission branch never fires for this node.
    expect(child?.tag).toBe("");
    expect(child?.part).toBe("actions");
  });

  it("derives a part-level componentRef from anatomy.details", () => {
    const ir = buildComponentIR({
      name: "TestField",
      anatomy: {
        parts: ["root", "control"],
        details: {
          control: { componentRef: "fsds.Input" },
        },
      },
    } as unknown as ComponentContract);
    const control = ir.parts.find((p) => p.name === "control");
    expect(control?.componentRef).toBe("Input");
    // A componentRef part declares no native tag.
    expect(control?.nativeTag).toBeUndefined();
  });

  it("rejects a dom node declaring both tag and componentRef", () => {
    expect(() =>
      buildComponentIR({
        name: "Bad",
        anatomy: {
          parts: ["root"],
          dom: { tag: "button", componentRef: "fsds.Button", part: "root" },
        },
      } as unknown as ComponentContract),
    ).toThrow(/mutually exclusive/);
  });

  it("rejects a part declaring both details.tag and details.componentRef", () => {
    expect(() =>
      buildComponentIR({
        name: "Bad",
        anatomy: {
          parts: ["root", "control"],
          details: {
            control: { tag: "input", componentRef: "fsds.Input" },
          },
        },
      } as unknown as ComponentContract),
    ).toThrow(/mutually exclusive/);
  });

  it("rejects a malformed componentRef (missing fsds. prefix)", () => {
    expect(() =>
      buildComponentIR({
        name: "Bad",
        anatomy: {
          parts: ["root"],
          dom: { componentRef: "Button", part: "root" },
        },
      } as unknown as ComponentContract),
    ).toThrow(/must be "fsds\.<Name>"/);
  });

  it("rejects a dom node declaring neither tag nor componentRef", () => {
    expect(() =>
      buildComponentIR({
        name: "Bad",
        anatomy: {
          parts: ["root"],
          dom: { part: "root" },
        },
      } as unknown as ComponentContract),
    ).toThrow(/Exactly one is required/);
  });

  it("rejects disagreement between details and dom componentRef for a part", () => {
    expect(() =>
      buildComponentIR({
        name: "Bad",
        anatomy: {
          parts: ["root", "control"],
          details: { control: { componentRef: "fsds.Input" } },
          dom: {
            tag: "div",
            part: "root",
            children: [{ componentRef: "fsds.Select", part: "control" }],
          },
        },
      } as unknown as ComponentContract),
    ).toThrow(/disagrees with anatomy\.dom componentRef/);
  });
});

// CODEGEN-RECURSIVE-COMPOSITION-01 / Phase 5: componentRef nodes resolve into a
// typed ComponentInstanceIR fact when the corpus is supplied. The IR classifies
// each binding against the TARGET's prop surface, resolves the target layer,
// and fails loud on unknown target props / unresolved refs / layer violations.
describe("componentInstance resolution (cross-contract fact)", () => {
  // Minimal target contracts. getPropMembers reads props.designed.members.
  const ImageContract = {
    name: "Image",
    layer: "primitive",
    anatomy: { parts: ["root"] },
    props: {
      designed: {
        members: [
          { name: "src", propType: { kind: "string" } },
          { name: "alt", propType: { kind: "string" } },
        ],
      },
    },
  } as unknown as ComponentContract;

  const ButtonContract = {
    name: "Button",
    layer: "primitive",
    anatomy: { parts: ["root"] },
    props: {
      designed: {
        members: [
          { name: "type", propType: { kind: "string" } },
          { name: "ariaLabel", propType: { kind: "string" } },
        ],
      },
    },
  } as unknown as ComponentContract;

  function corpus(...cs: ComponentContract[]) {
    return new Map(cs.map((c) => [c.name, c]));
  }

  function avatarRefsImage(): ComponentContract {
    return {
      name: "Avatar",
      layer: "compound",
      // Host props the dom bindings read from (validateDomBindings checks the
      // `prop:X` source side; the componentRef classification checks the attr
      // name side — two independent rules).
      props: { designed: { members: [{ name: "src", propType: { kind: "string" } }] } },
      anatomy: {
        parts: ["root", "image"],
        dom: {
          tag: "div",
          part: "root",
          children: [
            {
              componentRef: "fsds.Image",
              part: "image",
              bindings: { src: "prop:src", alt: "literal:" },
            },
          ],
        },
      },
    } as unknown as ComponentContract;
  }

  it("does NOT resolve when no corpus is supplied (bare-name fallback)", () => {
    const ir = buildComponentIR(avatarRefsImage());
    expect(ir.dom?.children[0].componentRef).toBe("Image");
    expect(ir.dom?.children[0].componentInstance).toBeUndefined();
  });

  it("resolves a componentInstance with target layer + classified bindings", () => {
    const ir = buildComponentIR(avatarRefsImage(), {
      allContracts: corpus(avatarRefsImage(), ImageContract),
    });
    const inst = ir.dom?.children[0].componentInstance;
    expect(inst).toBeDefined();
    expect(inst?.ref).toBe("Image");
    expect(inst?.targetLayer).toBe("primitive");
    // Both src and alt are declared Image props → kind:"prop".
    const byAttr = new Map(inst?.bindings.map((b) => [b.sourceAttr, b]));
    expect(byAttr.get("src")?.kind).toBe("prop");
    expect(byAttr.get("src")?.targetProp).toBe("src");
    expect(byAttr.get("alt")?.kind).toBe("prop");
  });

  it("classifies a data-* binding as a host attribute (passthrough)", () => {
    const host = {
      name: "Avatar",
      layer: "compound",
      props: {
        designed: {
          members: [
            { name: "src", propType: { kind: "string" } },
            { name: "trackId", propType: { kind: "string" } },
          ],
        },
      },
      anatomy: {
        parts: ["root", "image"],
        dom: {
          tag: "div",
          part: "root",
          children: [
            {
              componentRef: "fsds.Image",
              part: "image",
              bindings: { src: "prop:src", "data-x": "prop:trackId" },
            },
          ],
        },
      },
    } as unknown as ComponentContract;
    const ir = buildComponentIR(host, {
      allContracts: corpus(host, ImageContract),
    });
    const byAttr = new Map(
      ir.dom?.children[0].componentInstance?.bindings.map((b) => [b.sourceAttr, b]),
    );
    expect(byAttr.get("src")?.kind).toBe("prop");
    expect(byAttr.get("data-x")?.kind).toBe("attribute");
  });

  it("THROWS (fail-loud) on a binding that names neither a target prop nor a host attr", () => {
    const host = {
      name: "Avatar",
      layer: "compound",
      props: { designed: { members: [{ name: "bad", propType: { kind: "string" } }] } },
      anatomy: {
        parts: ["root", "image"],
        dom: {
          tag: "div",
          part: "root",
          children: [
            {
              componentRef: "fsds.Image",
              part: "image",
              // Image has no "invalid" prop and "invalid" is not data-/aria-.
              bindings: { invalid: "prop:bad" },
            },
          ],
        },
      },
    } as unknown as ComponentContract;
    expect(() =>
      buildComponentIR(host, { allContracts: corpus(host, ImageContract) }),
    ).toThrow(/binds "invalid", which is neither a declared prop on Image/);
  });

  it("THROWS on an unresolved componentRef", () => {
    const host = avatarRefsImage();
    expect(() =>
      buildComponentIR(host, { allContracts: corpus(host) }), // no Image
    ).toThrow(/does not resolve to a known component contract/);
  });

  it("THROWS on a layer violation (primitive referencing a compound)", () => {
    const Card = {
      name: "Card",
      layer: "compound",
      anatomy: { parts: ["root"] },
      props: { designed: { members: [] } },
    } as unknown as ComponentContract;
    const badPrim = {
      name: "BadPrim",
      layer: "primitive",
      anatomy: {
        parts: ["root", "x"],
        dom: {
          tag: "div",
          part: "root",
          children: [{ componentRef: "fsds.Card", part: "x" }],
        },
      },
    } as unknown as ComponentContract;
    expect(() =>
      buildComponentIR(badPrim, { allContracts: corpus(badPrim, Card) }),
    ).toThrow(/targets a higher layer \(compound\) than this primitive/);
  });

  it("binds the TARGET's prop name (ariaLabel), and carries events separately", () => {
    // Correct authoring: name Button's actual prop `ariaLabel` (NOT the raw
    // `aria-label` HTML attribute). The IR classifies it as kind:"prop" so the
    // label reaches Button's ariaLabel prop, which Button maps to aria-label on
    // its own <button> — the a11y-across-boundary fix.
    const host = {
      name: "Alert",
      layer: "compound",
      props: {
        designed: {
          members: [
            { name: "dismissLabel", propType: { kind: "string" } },
            {
              name: "onDismiss",
              propType: { kind: "callback", params: [], returns: { kind: "void" } },
            },
          ],
        },
      },
      anatomy: {
        parts: ["root", "dismiss"],
        dom: {
          tag: "div",
          part: "root",
          children: [
            {
              componentRef: "fsds.Button",
              part: "dismiss",
              bindings: { ariaLabel: "prop:dismissLabel" },
              events: { click: "prop:onDismiss" },
            },
          ],
        },
      },
    } as unknown as ComponentContract;
    const ir = buildComponentIR(host, {
      allContracts: corpus(host, ButtonContract),
    });
    const inst = ir.dom?.children[0].componentInstance;
    const ariaBinding = inst?.bindings.find((b) => b.sourceAttr === "ariaLabel");
    expect(ariaBinding?.kind).toBe("prop");
    expect(ariaBinding?.targetProp).toBe("ariaLabel");
    // Events are carried separately, never prop-classified.
    expect(inst?.events).toEqual([
      { name: "click", expr: { kind: "prop", prop: "onDismiss" } },
    ]);
  });

  it("normalizes a contract-authored value map on a composed component prop", () => {
    const IconContract = {
      name: "Icon",
      layer: "primitive",
      anatomy: { parts: ["root"] },
      props: {
        designed: {
          members: [{ name: "name", propType: { kind: "string" } }],
        },
      },
    } as unknown as ComponentContract;
    const host = {
      name: "Status",
      layer: "primitive",
      types: {
        StatusIntent: {
          kind: "union",
          values: ["info", "success", "warning", "danger", "error"],
        },
      },
      props: {
        designed: {
          members: [
            { name: "status", propType: { kind: "ref", to: "StatusIntent" } },
          ],
        },
      },
      anatomy: {
        parts: ["root", "icon"],
        dom: {
          tag: "span",
          part: "root",
          children: [
            {
              componentRef: "fsds.Icon",
              part: "icon",
              bindings: {
                name: {
                  kind: "map",
                  source: "prop:status",
                  values: {
                    info: "info",
                    success: "check",
                    warning: "triangle-alert",
                    danger: "triangle-alert",
                    error: "triangle-alert",
                  },
                },
              },
            },
          ],
        },
      },
    } as unknown as ComponentContract;

    const ir = buildComponentIR(host, {
      allContracts: corpus(host, IconContract),
    });

    expect(ir.dom?.children[0].componentInstance?.bindings[0]).toMatchObject({
      kind: "prop",
      targetProp: "name",
      expr: {
        kind: "valueMap",
        source: { kind: "prop", prop: "status" },
        values: {
          info: "info",
          success: "check",
          warning: "triangle-alert",
          danger: "triangle-alert",
          error: "triangle-alert",
        },
      },
    });
  });

  it("rejects a value map that omits a member of its source prop domain", () => {
    const host = {
      name: "Status",
      types: {
        StatusIntent: { kind: "union", values: ["info", "success"] },
      },
      props: {
        designed: {
          members: [
            { name: "status", propType: { kind: "ref", to: "StatusIntent" } },
          ],
        },
      },
      anatomy: {
        parts: ["root"],
        dom: {
          tag: "span",
          part: "root",
          bindings: {
            title: {
              kind: "map",
              source: "prop:status",
              values: { info: "Informational" },
            },
          },
        },
      },
    } as unknown as ComponentContract;

    expect(() => buildComponentIR(host)).toThrow(/value map.*exhaustive.*success/i);
  });

  it("rejects value-map keys outside the source prop domain", () => {
    const host = {
      name: "Status",
      types: {
        StatusIntent: { kind: "union", values: ["info", "success"] },
      },
      props: {
        designed: {
          members: [
            { name: "status", propType: { kind: "ref", to: "StatusIntent" } },
          ],
        },
      },
      anatomy: {
        parts: ["root"],
        dom: {
          tag: "span",
          part: "root",
          bindings: {
            title: {
              kind: "map",
              source: "prop:status",
              values: { info: "Informational", success: "Done", typo: "Nope" },
            },
          },
        },
      },
    } as unknown as ComponentContract;

    expect(() => buildComponentIR(host)).toThrow(/value map.*unknown.*typo/i);
  });
});
