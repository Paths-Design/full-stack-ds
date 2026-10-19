import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../contract.js";
import { buildComponentIR } from "../ir.js";
import { generateReactComponentSource } from "./react/component-source.js";
import { generateVueComponentSource } from "./vue/component-source.js";
import { generateSvelteComponentSource } from "./svelte/component-source.js";
import { generateLitComponentSource } from "./lit/component-source.js";
import { generateAngularComponentSource } from "./angular/component-source.js";
import { generateReactNativeComponentSource } from "./react-native/component-source.js";

// FEAT-BINDING-CALL-WITH-ARG-01 — per-framework lowering of the
// call-with-argument channel-setter form.
//
// The fixture models Select's option: an array-iterated element whose click
// wires `channel:selection.onChange(iter:item.value)`. Each framework must
// lower this to an invocation of the channel setter WITH the per-item payload
// — NOT the pre-fix self-assignment no-op `() => setSelection(selection)`
// that a bare non-boolean channel-click produced (the falsification target
// asserted in every framework block below).

const FIXTURE: ComponentContract = {
  name: "CallArgFixture",
  layer: "compound",
  cssPrefix: "call-arg-fixture",
  anatomy: {
    parts: ["root", "option", "label"],
    dom: {
      tag: "div",
      part: "root",
      children: [
        {
          // A `button` host so React Native maps it to `Pressable` and wires
          // `onPress` — RN only installs event handlers on Pressable hosts.
          // The web frameworks lower the click identically on any host.
          tag: "button",
          part: "option",
          iterate: {
            source: "prop:options",
            kind: "array",
            itemType: "FixtureOption",
          },
          attrs: { role: "option" },
          bindings: {
            "aria-selected": "predicate:memberOf(iter:item.value, channel:selection.value)",
          },
          events: {
            click: "channel:selection.onChange(iter:item.value)",
          },
          children: [{ tag: "span", part: "label", content: "iter:item.label" }],
        },
      ],
    },
  },
  props: {
    styled: {
      members: [
        {
          name: "options",
          type: "FixtureOption[]",
          description: "Options to render.",
        },
      ],
    },
  },
  channels: {
    selection: {
      value: "value",
      defaultValue: "defaultValue",
      onChange: "onChange",
      valueType: "string | string[]",
    },
  },
  types: {
    FixtureOption: {
      kind: "object",
      fields: [
        { name: "value", type: "string" },
        { name: "label", type: "string" },
      ],
    },
  },
} as unknown as ComponentContract;

const ir = buildComponentIR(FIXTURE);

describe("FEAT-BINDING-CALL-WITH-ARG-01: React lowering", () => {
  const src = generateReactComponentSource(ir, "../../primitives");

  it("wires onClick to setSelection WITH the per-item payload (item.value)", () => {
    expect(src).toContain("onClick={() => setSelection(item.value)}");
  });

  it("does NOT emit the pre-fix self-assignment no-op (falsification)", () => {
    // The bug this slice fixes: a non-boolean channel-click synthesised
    // `() => setSelection(selection)` — a write of the value onto itself.
    expect(src).not.toContain("() => setSelection(selection)");
  });
});

describe("FEAT-BINDING-CALL-WITH-ARG-01: Vue lowering", () => {
  const src = generateVueComponentSource(ir);

  it("wires @click to behavior.setSelection WITH item.value (v-for alias)", () => {
    expect(src).toContain('@click="() => behavior.setSelection(item.value)"');
  });

  it("does NOT emit the self-assignment no-op reading the channel value (falsification)", () => {
    expect(src).not.toContain("behavior.setSelection(behavior.selection.value)");
  });
});

describe("FEAT-BINDING-CALL-WITH-ARG-01: Svelte lowering", () => {
  const src = generateSvelteComponentSource(ir);

  it("wires onclick to the hook setter WITH item.value ({#each} alias)", () => {
    // The hook variable name is component-derived; assert the setter+arg shape
    // without pinning the exact hook identifier.
    expect(src).toMatch(/onclick=\{\(\) => \w+\.setSelection\(item\.value\)\}/);
  });

  it("does NOT pass the channel value to itself (falsification)", () => {
    expect(src).not.toMatch(/setSelection\(\w+\.selection\)/);
  });
});

describe("FEAT-BINDING-CALL-WITH-ARG-01: Angular lowering", () => {
  const src = generateAngularComponentSource(ir);

  it("wires (click) to behavior.setSelection WITH item.value (*ngFor alias)", () => {
    // The (event)="..." value is a "-delimited Angular template; item.value
    // carries no quotes so no escaping collision (aria-checked precedent).
    expect(src).toContain('(click)="behavior.setSelection(item.value)"');
  });

  it("does NOT emit the self-assignment no-op (falsification)", () => {
    expect(src).not.toContain("behavior.setSelection(behavior.selection())");
  });
});

describe("FEAT-BINDING-CALL-WITH-ARG-01: Lit lowering", () => {
  const src = generateLitComponentSource(ir);

  it("wires @click to this.behavior.setSelection WITH item.value (.map alias)", () => {
    expect(src).toContain("@click=${() => this.behavior.setSelection(item.value)}");
  });

  it("does NOT emit the self-assignment no-op (falsification)", () => {
    expect(src).not.toContain("this.behavior.setSelection(this.behavior.selection)");
  });
});

describe("FEAT-BINDING-CALL-WITH-ARG-01: React Native lowering", () => {
  const src = generateReactNativeComponentSource(ir).componentFile;

  it("wires onPress to the channel setter WITH item.value", () => {
    // RN's setter convention is `set<Channel>Value`.
    expect(src).toContain("onPress={() => setSelectionValue(item.value)}");
  });

  it("does NOT emit the self-assignment no-op (falsification)", () => {
    expect(src).not.toContain("setSelectionValue(selection)");
  });
});

it('RN emits callback-only channel state without an unconsumed value local', () => {
  const contract = structuredClone(FIXTURE);
  if (!contract.anatomy || Array.isArray(contract.anatomy)) throw new Error("fixture requires a DOM anatomy");
  contract.anatomy.dom!.children![0].bindings = {};
  contract.anatomy.dom!.children![0].attrs = {};
  const source = generateReactNativeComponentSource(buildComponentIR(contract)).componentFile;
  expect(source).toContain('onPress={() => setSelectionValue(item.value)}');
  expect(source).toContain('const [, setUncontrolledSelection] = useState');
  expect(source).not.toContain('const selection =');
  const withRead = generateReactNativeComponentSource(ir).componentFile;
  expect(withRead).toContain('const selection = controlledSelection !== undefined ? controlledSelection : uncontrolledSelection;');
});
