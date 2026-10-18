import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../contract.js";
import { buildComponentIR } from "../ir.js";
import { generateReactComponentSource } from "./react/component-source.js";
import { generateVueComponentSource } from "./vue/component-source.js";
import { generateSvelteComponentSource } from "./svelte/component-source.js";
import { generateLitComponentSource } from "./lit/component-source.js";
import { generateAngularComponentSource } from "./angular/component-source.js";
import { generateReactNativeComponentSource } from "./react-native/component-source.js";
import { buildComponentTestPlan } from "../test-plan.js";

// IR-DOM-ITERATE-CAPABILITY-01 — fixture harness.
//
// Two new iteration variants exercise the full dispatch path:
//
//   kind="count" — repeat a subtree N times. Source prop is a number.
//                  Index alias visible inside the subtree as
//                  cssVariableBindings value, attribute binding,
//                  or content binding.
//
//   kind="array" — iterate an array prop. Each iteration introduces
//                  `item` and `index` aliases visible inside the
//                  subtree's bindings.
//
// Doctrine locked here: iteration wraps OUTSIDE the if-guard. Each
// loop iteration re-evaluates `if:` against the per-iteration scope.
// The COUNT_CONTRACT below has neither if-guard nor cssVarBindings,
// so it provides clean baseline assertions; the ARRAY_CONTRACT
// combines all four lowering paths (text content, attribute binding,
// CSS-var binding, and a nested if-guard against an item field) so
// the cross-cutting interactions are pinned.

const COUNT_CONTRACT: ComponentContract = {
  name: "FixtureCount",
  layer: "primitive",
  cssPrefix: "fixture-count",
  anatomy: {
    parts: ["root", "dot"],
    dom: {
      tag: "div",
      part: "root",
      attrs: { role: "group" },
      children: [
        {
          tag: "span",
          part: "dot",
          attrs: { "aria-hidden": "true" },
          iterate: {
            source: "prop:count",
            kind: "count",
          },
          bindings: {
            "data-index": "prop:index",
          },
          cssVariableBindings: {
            "--fsds-fixture-count-dot-index": "prop:index",
          },
        },
      ],
    },
  },
  props: {
    styled: {
      members: [
        { name: "count", type: "number", description: "Number of dots to render" },
      ],
    },
  },
};

const ARRAY_CONTRACT: ComponentContract = {
  name: "FixtureArray",
  layer: "primitive",
  cssPrefix: "fixture-array",
  anatomy: {
    parts: ["root", "row", "label"],
    dom: {
      tag: "ul",
      part: "root",
      children: [
        // The iterated `<li>` carries `iterate` + attribute bindings
        // against item/index, then projects the content into a
        // dedicated inner `<span>`. The split is required by the
        // IR builder's `iterate`-vs-`content` mutex (parseDomNode in
        // ir.ts) — Commit 1 keeps content on a separate node so
        // emitters never have to reconcile iteration with content
        // on the same node.
        {
          tag: "li",
          part: "row",
          iterate: {
            source: "prop:items",
            kind: "array",
            itemType: "string",
          },
          // `prop:item` resolves to the iteration alias (bare local in
          // every framework's loop scope). `prop:index` likewise.
          bindings: {
            "data-row-index": "prop:index",
            "aria-label": "prop:item",
          },
          children: [
            {
              tag: "span",
              part: "label",
              content: "prop:item",
            },
          ],
        },
      ],
    },
  },
  props: {
    styled: {
      members: [
        {
          name: "items",
          type: "string[]",
          description: "Row labels (also drives the per-row aria-label).",
        },
      ],
    },
  },
};

describe("IR-DOM-ITERATE-CAPABILITY-01: count iteration lowering", () => {
  const ir = buildComponentIR(COUNT_CONTRACT);

  describe("React", () => {
    const src = generateReactComponentSource(ir, "../../primitives");

    it("wraps the iterated subtree in Array.from(...).map() with 0-based index", () => {
      // The map callback uses underscore for the discarded slot and the
      // contract's indexVar default `index` as the second param.
      expect(src).toMatch(
        /\{Array\.from\(\{ length: count \}, \(_, index\) =>/,
      );
    });

    it("emits key={index} on the iterated element", () => {
      // The key attribute may come before or after other attrs; only
      // the membership and the indexVar value are load-bearing.
      expect(src).toMatch(/<span[^>]*aria-hidden="true"[^>]*key=\{index\}/);
    });

    it("resolves `prop:index` inside the subtree to the bare iteration alias", () => {
      // data-index is the attribute binding; React lowers bare prop names
      // as JSX identifiers. The bare `index` here comes from the map
      // callback parameter, NOT from a destructured component prop
      // (the component only declares `count`).
      expect(src).toMatch(/data-index=\{index\}/);
    });

    it("threads `prop:index` into the cssVarBindings value too", () => {
      // The cssVarBindings emit shape: style={{ '--fsds-foo': value }}.
      // The value position is the iteration alias.
      expect(src).toMatch(
        /style=\{\{\s*"--fsds-fixture-count-dot-index":\s*index\s*\}\s*as\s+CSSProperties\}/,
      );
    });

    it("does not lower `prop:index` as a destructured component prop", () => {
      // Negative: `index` is not in the destructure list (only `count` is
      // declared on the contract). React's destructure for FixtureCount
      // should NOT contain `index`.
      const destructure = src.match(/export function FixtureCount\(\{([\s\S]*?)\}: FixtureCountProps\)/);
      expect(destructure).toBeTruthy();
      const destructured = destructure?.[1] ?? "";
      expect(destructured).not.toContain("index");
    });
  });

  describe("Vue", () => {
    const src = generateVueComponentSource(ir);

    it("emits v-for over Array(props.count) for 0-based index", () => {
      // Array(props.count) yields a sparse iterable of length N — Vue's v-for
      // produces 0..count-1 as the index. The numeric form `v-for="i in N"`
      // is 1-based, so we deliberately wrap in Array() for cross-framework
      // parity.
      //
      // PRODUCTION-ARRAY-ITERATION-CONSUMER-01: the source is now rendered
      // through the binding-value renderer, which for Vue lowers `prop:count`
      // to `props.count` rather than bare `count`. Vue's <script setup>
      // doesn't auto-expose `defineProps` returns as bare template locals.
      expect(src).toMatch(
        /<span[^>]*v-for="\(_, index\) in Array\(props\.count\)"[^>]*:key="index"/,
      );
    });

    it("resolves `prop:index` in attribute bindings to bare alias (not props.index)", () => {
      // :data-index must be the bare local, not props.index — `index`
      // is introduced by v-for, not by the props interface.
      expect(src).toMatch(/:data-index="index"/);
      expect(src).not.toMatch(/:data-index="props\.index"/);
    });

    it("threads `prop:index` into the :style cssVar object", () => {
      expect(src).toMatch(
        /:style="\{\s*'--fsds-fixture-count-dot-index':\s*index\s*\}"/,
      );
    });
  });

  describe("Svelte", () => {
    const src = generateSvelteComponentSource(ir);

    it("wraps the iterated subtree in {#each Array(count) as _, index (index)}", () => {
      expect(src).toContain(`{#each Array(count) as _, index (index)}`);
      expect(src).toMatch(/\{\/each\}/);
    });

    it("emits the bare alias in attribute bindings", () => {
      expect(src).toMatch(/data-index=\{index\}/);
    });

    it("emits the bare alias in the style:--fsds-* directive value", () => {
      expect(src).toContain(`style:--fsds-fixture-count-dot-index={index}`);
    });
  });

  describe("Angular", () => {
    const src = generateAngularComponentSource(ir);

    it("wraps in <ng-container *ngFor> with arrayFromCount(count) and `let index = index`", () => {
      // The `let index = index` syntax aliases Angular's built-in
      // template variable `$index` (right side) to a local `index`
      // (left side) for cross-framework parity.
      expect(src).toMatch(
        /<ng-container \*ngFor="let _ of arrayFromCount\(count\); let index = index">/,
      );
    });

    it("emits bare alias in attribute bindings (not safePropertyExpr-wrapped)", () => {
      // `[attr.data-index]="index"` — bare, no `this.` prefix.
      expect(src).toMatch(/\[attr\.data-index\]="index"/);
    });

    it("emits bare alias in [style.--fsds-*] bindings", () => {
      expect(src).toMatch(
        /\[style\.--fsds-fixture-count-dot-index\]="index"/,
      );
    });

    it("imports NgFor and injects the arrayFromCount helper", () => {
      expect(src).toMatch(/import \{[^}]*NgFor[^}]*\} from "@angular\/common"/);
      expect(src).toMatch(/arrayFromCount\(n: number \| undefined\)/);
    });
  });

  describe("Lit", () => {
    const src = generateLitComponentSource(ir);

    it("wraps the iterated subtree in Array.from({...}).map((_, index) => html``)", () => {
      // The class-field accessor `this.count` is the source. `?? 0`
      // guards against undefined when the prop is unset.
      expect(src).toMatch(
        /Array\.from\(\{ length: this\.count \?\? 0 \}, \(_, index\) => html`/,
      );
    });

    it("emits bare alias in attribute bindings (no `this.` prefix, no ifDefined)", () => {
      // Post-V2 (BINDING-EXPRESSION-V2-01): `prop:index` inside an
      // iteration scope normalizes to `iterationLocal` in the IR, and
      // the Lit emitter's `iterationLocal` branch lowers without an
      // `ifDefined` wrap. Iteration locals introduced by a `.map`
      // callback are never undefined, so `ifDefined` was always dead
      // weight on the V1 path.
      expect(src).toMatch(/data-index=\$\{index\}/);
      expect(src).not.toMatch(/data-index=\$\{ifDefined\(index\)\}/);
    });

    it("emits bare alias inside styleMap directive value", () => {
      // The undefined-guard ternary is uniform across all sources
      // (iteration aliases included), even though loop-locals can't
      // be undefined in scope. Keeping the emit shape branch-free
      // makes the codegen path simpler than threading per-source
      // nullability through styleMap construction.
      expect(src).toMatch(
        /styleMap\(\{\s*'--fsds-fixture-count-dot-index':\s*index === undefined \? undefined : String\(index\)\s*\}\)/,
      );
    });

    it("does not emit `this.index` anywhere", () => {
      // Negative: `index` is loop-local, never a class field.
      expect(src).not.toMatch(/this\.index\b/);
    });
  });
});

describe("IR-DOM-ITERATE-CAPABILITY-01: array iteration lowering", () => {
  const ir = buildComponentIR(ARRAY_CONTRACT);

  describe("React", () => {
    const src = generateReactComponentSource(ir, "../../primitives");

    it("wraps in (items ?? []).map((item, index) => (...))", () => {
      // PRODUCTION-ARRAY-ITERATION-CONSUMER-01: array iteration emit
      // guards the source with `?? []` so undefined values render zero
      // items instead of throwing. Matches Lit's existing `?? 0` guard
      // for count iteration; the array counterpart.
      expect(src).toMatch(/\{\(items \?\? \[\]\)\.map\(\(item, index\) =>/);
    });

    it("resolves both `item` and `index` aliases inside the subtree", () => {
      // data-row-index reads index; aria-label reads item; content is
      // item inside the nested <span>.
      expect(src).toMatch(/data-row-index=\{index\}/);
      expect(src).toMatch(/aria-label=\{item\}/);
      // Content binding renders as a JSX child expression on the
      // <span> child.
      expect(src).toMatch(/<span[^>]*>\s*\{item\}\s*<\/span>/);
    });

    it("emits a stable key on the iterated element", () => {
      expect(src).toMatch(/<li[^>]*key=\{index\}/);
    });
  });

  describe("Vue", () => {
    const src = generateVueComponentSource(ir);

    it("emits v-for=\"(item, index) in (props.items ?? [])\"", () => {
      // PRODUCTION-ARRAY-ITERATION-CONSUMER-01: source goes through the
      // value renderer (so prop:items → props.items, not bare `items`)
      // and is guarded with `?? []` so an undefined source renders zero
      // items instead of erroring in the v-for evaluator.
      expect(src).toMatch(
        /<li[^>]*v-for="\(item, index\) in \(props\.items \?\? \[\]\)"[^>]*:key="index"/,
      );
    });

    it("emits content binding as {{ item }} interpolation on the inner <span>", () => {
      // The {{ item }} resolves against the v-for scope, not props.item.
      expect(src).toMatch(/<span[^>]*>\s*\{\{ item \}\}\s*<\/span>/);
    });

    it("emits attribute bindings against the bare aliases", () => {
      expect(src).toMatch(/:data-row-index="index"/);
      expect(src).toMatch(/:aria-label="item"/);
    });
  });

  describe("Svelte", () => {
    const src = generateSvelteComponentSource(ir);

    it("wraps in {#each (items ?? []) as item, index (index)}", () => {
      // PRODUCTION-ARRAY-ITERATION-CONSUMER-01: source guarded with `?? []`.
      expect(src).toContain(`{#each (items ?? []) as item, index (index)}`);
    });

    it("inlines content as {item} text expression on the inner <span>", () => {
      // Svelte's content path emits `<tag>{item}</tag>` for a node
      // whose content binding is present and which has no children.
      expect(src).toMatch(/<span[^>]*>\{item\}<\/span>/);
    });

    it("emits both aliases in attribute bindings", () => {
      expect(src).toMatch(/data-row-index=\{index\}/);
      expect(src).toMatch(/aria-label=\{item\}/);
    });
  });

  describe("Angular", () => {
    const src = generateAngularComponentSource(ir);

    it("wraps in <ng-container *ngFor=\"let item of (items ?? []); let index = index\">", () => {
      // PRODUCTION-ARRAY-ITERATION-CONSUMER-01: source guarded with `?? []`.
      expect(src).toMatch(
        /<ng-container \*ngFor="let item of \(items \?\? \[\]\); let index = index">/,
      );
    });

    it("emits content binding as {{ item }} interpolation on inner <span>", () => {
      expect(src).toMatch(/<span[^>]*>[\s\S]*\{\{ item \}\}[\s\S]*<\/span>/);
    });

    it("emits attribute bindings against the bare aliases", () => {
      expect(src).toMatch(/\[attr\.data-row-index\]="index"/);
      expect(src).toMatch(/\[attr\.aria-label\]="item"/);
    });

    it("does NOT inject arrayFromCount when only array iteration is used", () => {
      // Negative — count helper only appears when at least one
      // count-iteration node exists in the tree.
      expect(src).not.toContain("arrayFromCount(");
    });
  });

  describe("Lit", () => {
    const src = generateLitComponentSource(ir);

    it("wraps in (this.items ?? []).map((item, index) => html``)", () => {
      // PRODUCTION-ARRAY-ITERATION-CONSUMER-01: source guarded with `?? []`.
      expect(src).toMatch(
        /\(this\.items \?\? \[\]\)\.map\(\(item, index\) => html`/,
      );
    });

    it("emits content interpolation against the bare alias on inner <span>", () => {
      // renderLitContent for prop:item lowers to `${item}` (not `${this.item}`)
      // because `item` is in the iterationScope.
      expect(src).toMatch(/<span[^>]*>[\s\S]*\$\{item\}[\s\S]*<\/span>/);
      expect(src).not.toMatch(/\$\{this\.item\}/);
    });

    it("emits attribute bindings against the bare aliases (no ifDefined)", () => {
      // Post-V2 (BINDING-EXPRESSION-V2-01): both `data-row-index` and
      // `aria-label` bind to iterationLocal-kind values now, so the
      // emitter takes the dedicated iterationLocal branch which skips
      // the `ifDefined` wrap. Loop locals introduced by `.map((item,
      // index) => ...)` are never undefined; the V1 wrap was inherited
      // mechanically from the `prop:` branch.
      expect(src).toMatch(/data-row-index=\$\{index\}/);
      expect(src).toMatch(/aria-label=\$\{item\}/);
      expect(src).not.toMatch(/ifDefined\((index|item)\)/);
    });
  });
});

// ---------------------------------------------------------------------------
// PRODUCTION-ARRAY-ITERATION-CONSUMER-01: channel-driven iteration source
// ---------------------------------------------------------------------------

// A channel-driven array prop. The contract sets `iterate.source` to
// `channel:selection.value`, so each emitter must lower the iteration
// over the channel's *resolved* runtime identifier (e.g. React's
// `selection` from useX(), Vue's `behavior.selection.value`), NOT over
// the raw destructured prop name (which would be `controlledValue` in
// React or undefined in Vue's template scope).
const CHANNEL_ARRAY_CONTRACT: ComponentContract = {
  name: "FixtureChannelArray",
  layer: "primitive",
  cssPrefix: "fixture-channel-array",
  anatomy: {
    parts: ["root", "row"],
    dom: {
      tag: "ul",
      part: "root",
      children: [
        {
          tag: "li",
          part: "row",
          iterate: {
            source: "channel:selection.value",
            kind: "array",
            itemType: "string",
          },
          children: [
            {
              tag: "span",
              content: "iter:item",
            },
          ],
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
} as unknown as ComponentContract;

describe("PRODUCTION-ARRAY-ITERATION-CONSUMER-01: channel-driven iteration source", () => {
  const ir = buildComponentIR(CHANNEL_ARRAY_CONTRACT);

  it("IR sourceProp resolves to the channel's valueProp", () => {
    // The contract author wrote `channel:selection.value`. The validator
    // resolves this to the channel's underlying valueProp (`"value"`)
    // for type-checking purposes, while leaving `source` as the original
    // channel binding so each emitter's value renderer can dispatch on
    // it idiomatically.
    const iter = ir.dom!.children[0].iteration!;
    expect(iter.sourceProp).toBe("value");
    expect(iter.source).toEqual({
      kind: "channel",
      channel: "selection",
      field: "value",
    });
  });

  describe("React", () => {
    const src = generateReactComponentSource(ir, "../../primitives");

    it("emits .map on the channel's resolved local (selection), not the renamed raw prop", () => {
      // The component destructures `value: controlledValue` (channel
      // value-prop alias) and `const { selection, setSelection } =
      // useFixtureChannelArray(...)`. Iteration source must resolve to
      // `selection`, the post-resolution channel value — NOT
      // `controlledValue` (raw destructure) and NOT `value` (undefined).
      expect(src).toMatch(/\(selection \?\? \[\]\)\.map\(\(item, index\)/);
      expect(src).not.toMatch(/\{value\.map\(/);
      expect(src).not.toMatch(/\{controlledValue\.map\(/);
    });
  });

  describe("Vue", () => {
    const src = generateVueComponentSource(ir);

    it("emits v-for over (behavior.selection.value ?? []) — the resolved channel ref", () => {
      // Vue's <script setup> exposes `props` and `behavior` to the
      // template. The channel's resolved value is `behavior.selection.value`
      // (the controllable-state ref auto-unwrapped via `.value`).
      // A raw `value` reference would be undefined; `props.value` would
      // be the raw prop, pre-channel-resolution.
      expect(src).toMatch(
        /v-for="\(item, index\) in \(behavior\.selection\.value \?\? \[\]\)"/,
      );
      expect(src).not.toMatch(/v-for="[^"]* in value"/);
      expect(src).not.toMatch(/v-for="[^"]* in props\.value"/);
    });
  });

  describe("Svelte", () => {
    const src = generateSvelteComponentSource(ir);

    it("emits {#each} over the hook's selection value (not raw $props.value), guarded with `?? []`", () => {
      // The Svelte component calls the hook and destructures its return.
      // Iteration source resolves to `${hookVar}.selection`, the
      // controllable-state value — not the raw destructured `$props` field.
      expect(src).toMatch(
        /\{#each \([a-zA-Z_$][\w$]*\.selection \?\? \[\]\) as item, index/,
      );
    });
  });

  describe("Lit", () => {
    const src = generateLitComponentSource(ir);

    it("emits .map on (this.behavior.selection ?? []) — the controllable-state value", () => {
      // Lit exposes the resolved channel value as `this.behavior.X` —
      // a property whose getter returns the controller's current state.
      // Routing iteration source through the value renderer ensures the
      // emit uses `this.behavior.selection`, not `this.value` (raw prop).
      expect(src).toMatch(
        /\$\{\(this\.behavior\.selection \?\? \[\]\)\.map\(\(item, index\)/,
      );
      expect(src).not.toMatch(/\$\{this\.value\.map\(/);
    });
  });

  describe("Angular", () => {
    const src = generateAngularComponentSource(ir);

    it("emits *ngFor over (behavior.selection() ?? []) — the controllable-state getter", () => {
      // Angular's resolved channel value is `behavior.X()` — a class
      // method that returns the current state. Iteration source resolves
      // through the binding-value renderer to that accessor form, then
      // wrapped with `?? []` for undefined-safety.
      expect(src).toMatch(
        /\*ngFor="let item of \(behavior\.selection\(\) \?\? \[\]\); let index = index"/,
      );
      expect(src).not.toMatch(/\*ngFor="let item of value/);
    });
  });
});

describe("PRODUCTION-ARRAY-ITERATION-CONSUMER-01: count iteration still works for plain props", () => {
  // Regression guard: routing the source through the value renderer must
  // not break the existing plain-prop count-iteration emit (OTP's
  // `length` is the live corpus witness; Calendar's `daysShown` count was
  // replaced by a `days: Date[]` array iteration in
  // FEAT-BINDING-CALL-WITH-ARG-01). Use the existing COUNT_CONTRACT
  // fixture (kind="count", source="prop:count"); every framework should
  // still emit its expected shape over the prop.
  const ir = buildComponentIR(COUNT_CONTRACT);

  it("React: Array.from over bare count identifier", () => {
    const src = generateReactComponentSource(ir, "../../primitives");
    expect(src).toMatch(/Array\.from\(\{ length: count \}/);
  });

  it("Lit: Array.from over this.count", () => {
    const src = generateLitComponentSource(ir);
    expect(src).toMatch(/Array\.from\(\{ length: this\.count \?\? 0 \}/);
  });

  it("Vue: v-for over Array(props.count)", () => {
    const src = generateVueComponentSource(ir);
    expect(src).toMatch(/v-for="\(_, index\) in Array\(props\.count\)"/);
  });

  it("Svelte: {#each} over Array(count) bare", () => {
    const src = generateSvelteComponentSource(ir);
    expect(src).toMatch(/\{#each Array\(count\) as _, index/);
  });

  it("Angular: *ngFor over arrayFromCount(count)", () => {
    const src = generateAngularComponentSource(ir);
    expect(src).toMatch(/\*ngFor="let _ of arrayFromCount\(count\); let index = index"/);
  });
});

describe("IR-DOM-ITERATE-CAPABILITY-01: no-opt-in drift guard", () => {
  // No production contract uses `iterate` yet (this commit is latent
  // — Commits 5 and 6 wire OTP and Calendar). The synthetic contracts
  // above never reach the framework src trees because they aren't
  // emitted from disk. Each framework's existing components should
  // therefore remain byte-identical after this commit.
  //
  // We can't easily run a full `generate --target=all` from a unit
  // test, so the drift check is enforced upstream by the pre-push
  // hook's framework-src diff guard (step 13/13). This test exists
  // as documentation of the no-opt-in invariant and as a
  // breadcrumb for future debuggers.
  it("documents the no-opt-in invariant", () => {
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BINDING-EXPRESSION-V2-PATH-01 — emitter-side path lowering
// ---------------------------------------------------------------------------

// Object-array iteration: items are `{ value: string; label: string }`.
// Two bindings exercise the path lowering — `iter:item.value` on an
// attribute, `iter:item.label` on content. The dispatch must produce
// `item.value` / `item.label` in all five frameworks with no
// component-name branch and identical `.x` lowering across frameworks.
const OBJECT_ARRAY_CONTRACT: ComponentContract = {
  name: "FixtureObjectArrayPath",
  layer: "primitive",
  cssPrefix: "fixture-obj-array",
  anatomy: {
    parts: ["root", "row", "label"],
    dom: {
      tag: "ul",
      part: "root",
      children: [
        {
          tag: "li",
          part: "row",
          iterate: {
            source: "prop:rows",
            kind: "array",
            itemType: "{ value: string; label: string }",
          },
          bindings: {
            // Attribute binding reads the `value` field of each item.
            "data-row-value": "iter:item.value",
          },
          children: [
            {
              tag: "span",
              part: "label",
              // Content binding reads the `label` field.
              content: "iter:item.label",
            },
          ],
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
          description: "Object rows; the iteration projects two fields per row.",
        },
      ],
    },
  },
} as unknown as ComponentContract;

describe("BINDING-EXPRESSION-V2-PATH-01: object-field path lowering", () => {
  const ir = buildComponentIR(OBJECT_ARRAY_CONTRACT);

  it("IR carries the path on item-rooted bindings", () => {
    // The IR shape is the contract between contracts and emitters; pin
    // it here so a regression in `parseBindingExpression` or
    // `promoteIterationLocals` is caught upstream of any emitter test.
    const row = ir.dom!.children[0];
    expect(row.bindings["data-row-value"]).toEqual({
      kind: "iterationLocal",
      local: "item",
      path: ["value"],
    });
    const labelSpan = row.children[0];
    expect(labelSpan.content).toEqual({
      kind: "iterationLocal",
      local: "item",
      path: ["label"],
    });
  });

  describe("React", () => {
    const src = generateReactComponentSource(ir, "../../primitives");

    it("emits item.value on the attribute and item.label in content", () => {
      // React JSX: `{item.value}` interpolates the projection directly.
      // No alternative idiom is needed — `.field` is plain JS.
      expect(src).toMatch(/data-row-value=\{item\.value\}/);
      expect(src).toMatch(/<span[^>]*>\s*\{item\.label\}\s*<\/span>/);
    });

    it("does NOT introduce an alias / destructure for the path", () => {
      // Sanity: the emitter doesn't try to be clever (e.g. destructuring
      // `{ value, label }` from the iteration callback). It lowers the
      // path as a member access at the call site.
      expect(src).not.toMatch(/\{\s*value\s*,\s*label\s*\}\s*=\s*item/);
    });
  });

  describe("Vue", () => {
    const src = generateVueComponentSource(ir);

    it("emits item.value in :data-row-value and item.label in {{ }}", () => {
      expect(src).toMatch(/:data-row-value="item\.value"/);
      expect(src).toMatch(/<span[^>]*>\s*\{\{ item\.label \}\}\s*<\/span>/);
    });
  });

  describe("Svelte", () => {
    const src = generateSvelteComponentSource(ir);

    it("emits item.value on the attribute and item.label in text content", () => {
      expect(src).toMatch(/data-row-value=\{item\.value\}/);
      expect(src).toMatch(/<span[^>]*>\{item\.label\}<\/span>/);
    });
  });

  describe("Angular", () => {
    const src = generateAngularComponentSource(ir);

    it("emits [attr.data-row-value]=\"item.value\" and {{ item.label }} content", () => {
      expect(src).toMatch(/\[attr\.data-row-value\]="item\.value"/);
      expect(src).toMatch(/<span[^>]*>[\s\S]*\{\{ item\.label \}\}[\s\S]*<\/span>/);
    });
  });

  describe("Lit", () => {
    const src = generateLitComponentSource(ir);

    it("omits absent projected fields while reading the iteration item", () => {
      // The callback item exists; a field read does not carry that guarantee.
      expect(src).toMatch(/data-row-value=\$\{ifDefined\(item\.value\)\}/);
      expect(src).not.toMatch(/this\.item/);
    });

    it("emits ${item.label} inside the inner <span>", () => {
      expect(src).toMatch(/<span[^>]*>[\s\S]*\$\{item\.label\}[\s\S]*<\/span>/);
    });
  });
});

// ---------------------------------------------------------------------------
// BINDING-EXPRESSION-V2-PREDICATE-01 — emitter-side predicate lowering
// ---------------------------------------------------------------------------

// Three fixtures exercise each closed predicate operator independently
// against the same iteration shape (object-array with `.value` field).
// Per-framework assertions are deliberately literal — these are the
// emit-shape contracts the production Select migration depends on.

function buildPredicateFixture(opName: "eq" | "contains" | "memberOf"): ComponentContract {
  // For `contains`, the channel value type is array-shaped (collection
  // first, item second). For `eq`, both sides are scalar. For
  // `memberOf`, the union type is preserved (`string | string[]`).
  const valueType =
    opName === "contains" ? "string[]" : opName === "memberOf" ? "string | string[]" : "string";
  const expr =
    opName === "contains"
      ? "predicate:contains(channel:selection.value, iter:item.value)"
      : opName === "memberOf"
      ? "predicate:memberOf(iter:item.value, channel:selection.value)"
      : "predicate:eq(iter:item.value, channel:selection.value)";
  return {
    name: `Predicate${opName[0].toUpperCase()}${opName.slice(1)}Fixture`,
    layer: "primitive",
    cssPrefix: `predicate-${opName}`,
    anatomy: {
      parts: ["root", "option"],
      dom: {
        tag: "ul",
        part: "root",
        children: [
          {
            tag: "li",
            part: "option",
            attrs: { role: "option" },
            iterate: {
              source: "prop:options",
              kind: "array",
              itemType: "{ value: string; label: string }",
            },
            bindings: {
              "aria-selected": expr,
            },
          },
        ],
      },
    },
    props: {
      styled: {
        members: [
          {
            name: "options",
            type: "Array<{ value: string; label: string }>",
            description: "Object rows for the iteration.",
          },
          {
            name: "value",
            type: valueType,
            description: "Selected value (scalar or array per the chosen operator).",
          },
          {
            name: "defaultValue",
            type: valueType,
            description: "Uncontrolled default selected value.",
          },
          {
            name: "onValueChange",
            type: `(value: ${valueType}) => void`,
            description: "Selection change handler.",
          },
        ],
      },
    },
    channels: {
      selection: {
        description: "Selected option value(s).",
        value: "value",
        defaultValue: "defaultValue",
        onChange: "onValueChange",
        valueType,
      },
    },
  } as unknown as ComponentContract;
}

describe("BINDING-EXPRESSION-V2-PREDICATE-01: eq operator lowering", () => {
  const ir = buildComponentIR(buildPredicateFixture("eq"));

  it("React lowers to (item.value === selection)", () => {
    const src = generateReactComponentSource(ir, "../../primitives");
    expect(src).toMatch(/aria-selected=\{\(item\.value === selection\)\}/);
  });

  it("Vue lowers to (item.value === behavior.selection.value)", () => {
    const src = generateVueComponentSource(ir);
    expect(src).toMatch(/:aria-selected="\(item\.value === behavior\.selection\.value\)"/);
  });

  it("Svelte lowers to (item.value === hook.selection)", () => {
    const src = generateSvelteComponentSource(ir);
    // Svelte's hookVar is the cebab-cased component name; for this
    // fixture it's `predicate_eq_fixture` (the generated hook variable).
    // Match the general shape with a relaxed selector.
    expect(src).toMatch(/aria-selected=\{\(item\.value === [a-zA-Z_$][\w$]*\.selection\)\}/);
  });

  it("Angular lowers to (item.value === behavior.selection())", () => {
    const src = generateAngularComponentSource(ir);
    expect(src).toMatch(
      /\[attr\.aria-selected\]="\(item\.value === behavior\.selection\(\)\)"/,
    );
  });

  it("Lit lowers to (item.value === this.behavior.selection) wrapped in ARIA string serialization", () => {
    const src = generateLitComponentSource(ir);
    expect(src).toMatch(
      /aria-selected=\$\{\(\(item\.value === this\.behavior\.selection\)\) \? 'true' : 'false'\}/,
    );
  });
});

describe("BINDING-EXPRESSION-V2-PREDICATE-01: contains operator lowering", () => {
  const ir = buildComponentIR(buildPredicateFixture("contains"));

  it("React lowers to ((selection ?? []).includes(item.value))", () => {
    const src = generateReactComponentSource(ir, "../../primitives");
    expect(src).toMatch(
      /aria-selected=\{\(\(selection \?\? \[\]\)\.includes\(item\.value\)\)\}/,
    );
  });

  it("Vue lowers to ((behavior.selection.value ?? []).includes(item.value))", () => {
    const src = generateVueComponentSource(ir);
    expect(src).toMatch(
      /:aria-selected="\(\(behavior\.selection\.value \?\? \[\]\)\.includes\(item\.value\)\)"/,
    );
  });

  it("Svelte lowers to ((hook.selection ?? []).includes(item.value))", () => {
    const src = generateSvelteComponentSource(ir);
    expect(src).toMatch(
      /aria-selected=\{\(\([a-zA-Z_$][\w$]*\.selection \?\? \[\]\)\.includes\(item\.value\)\)\}/,
    );
  });

  it("Angular lowers to ((behavior.selection() ?? []).includes(item.value))", () => {
    const src = generateAngularComponentSource(ir);
    expect(src).toMatch(
      /\[attr\.aria-selected\]="\(\(behavior\.selection\(\) \?\? \[\]\)\.includes\(item\.value\)\)"/,
    );
  });

  it("Lit lowers to ARIA-stringified contains predicate", () => {
    const src = generateLitComponentSource(ir);
    expect(src).toMatch(
      /aria-selected=\$\{\(\(\(this\.behavior\.selection \?\? \[\]\)\.includes\(item\.value\)\)\) \? 'true' : 'false'\}/,
    );
  });
});

describe("BINDING-EXPRESSION-V2-PREDICATE-01: memberOf operator lowering", () => {
  const ir = buildComponentIR(buildPredicateFixture("memberOf"));

  it("React lowers to (Array.isArray(selection) ? selection.includes(item.value) : item.value === selection)", () => {
    const src = generateReactComponentSource(ir, "../../primitives");
    expect(src).toMatch(
      /aria-selected=\{\(Array\.isArray\(selection\) \? selection\.includes\(item\.value\) : item\.value === selection\)\}/,
    );
  });

  it("Vue lowers memberOf against behavior.selection.value", () => {
    const src = generateVueComponentSource(ir);
    expect(src).toMatch(
      /:aria-selected="\(Array\.isArray\(behavior\.selection\.value\) \? behavior\.selection\.value\.includes\(item\.value\) : item\.value === behavior\.selection\.value\)"/,
    );
  });

  it("Svelte lowers memberOf against hook.selection", () => {
    const src = generateSvelteComponentSource(ir);
    expect(src).toMatch(
      /aria-selected=\{\(Array\.isArray\([a-zA-Z_$][\w$]*\.selection\) \? [a-zA-Z_$][\w$]*\.selection\.includes\(item\.value\) : item\.value === [a-zA-Z_$][\w$]*\.selection\)\}/,
    );
  });

  it("Angular lowers memberOf to a component-instance helper call", () => {
    // Angular templates can't reference the global `Array` object, so
    // `predicate:memberOf` lowers to `memberOf(L, R)` — a method on
    // the component class. The class generator injects the helper
    // when the IR walker detects any `predicate:memberOf` binding.
    const src = generateAngularComponentSource(ir);
    expect(src).toMatch(
      /\[attr\.aria-selected\]="memberOf\(item\.value, behavior\.selection\(\)\)"/,
    );
    // Helper definition is injected on the component class.
    expect(src).toMatch(
      /protected memberOf\(candidate: unknown, selection: unknown\): boolean \{[\s\S]*Array\.isArray\(selection\)[\s\S]*selection\.includes\(candidate\)[\s\S]*candidate === selection/,
    );
  });

  it("Angular omits memberOf helper when no predicate:memberOf is used", () => {
    // Negative — the eq fixture uses `predicate:eq`, which lowers
    // inline (`L === R` is template-safe). The class generator must
    // not inject the helper unconditionally.
    const eqIr = buildComponentIR(buildPredicateFixture("eq"));
    const eqSrc = generateAngularComponentSource(eqIr);
    expect(eqSrc).not.toMatch(/protected memberOf\(/);
  });

  it("Lit lowers memberOf against this.behavior.selection and wraps for ARIA serialization", () => {
    const src = generateLitComponentSource(ir);
    expect(src).toMatch(
      /aria-selected=\$\{\(\(Array\.isArray\(this\.behavior\.selection\) \? this\.behavior\.selection\.includes\(item\.value\) : item\.value === this\.behavior\.selection\)\) \? 'true' : 'false'\}/,
    );
  });
});

const CONDITIONAL_CONTRACT: ComponentContract = {
  name: "FixtureConditional",
  layer: "primitive",
  cssPrefix: "fixture-conditional",
  anatomy: {
    parts: ["root", "trigger"],
    dom: {
      tag: "div",
      part: "root",
      children: [
        {
          tag: "button",
          part: "trigger",
          attrs: { type: "button" },
          bindings: {
            "aria-expanded": "channel:expanded.value",
          },
          events: {
            click: "channel:expanded.onChange",
          },
          content: "conditional:channel:expanded.value|prop:collapseText|prop:expandText",
        },
      ],
    },
  },
  props: {
    styled: {
      members: [
        { name: "expanded", type: "boolean", description: "Expanded state." },
        { name: "defaultExpanded", type: "boolean", description: "Initial expanded state." },
        {
          name: "onExpandedChange",
          type: "(expanded: boolean) => void",
          description: "Expanded change callback.",
        },
        {
          name: "expandText",
          type: "string",
          description: "Collapsed label.",
          default: "Show more",
        },
        {
          name: "collapseText",
          type: "string",
          description: "Expanded label.",
          default: "Show less",
        },
      ],
    },
  },
  channels: {
    expanded: {
      value: "expanded",
      defaultValue: "defaultExpanded",
      onChange: "onExpandedChange",
      valueType: "boolean",
    },
  },
};

const DYNAMIC_ROOT_ROLE_CONTRACT: ComponentContract = {
  name: "FixtureDynamicRole",
  layer: "primitive",
  cssPrefix: "fixture-dynamic-role",
  anatomy: {
    parts: ["root"],
    dom: {
      tag: "div",
      part: "root",
      bindings: {
        role: "conditional:prop:decorative|literal:presentation|literal:status",
      },
    },
  },
  props: {
    designed: {
      members: [
        {
          name: "decorative",
          type: "boolean",
          description: "When true, hides the component from assistive tech.",
          default: true,
        },
      ],
    },
  },
  a11y: {
    role: "status",
    labeling: [],
    keyboard: [],
  },
};

describe("BINDING-EXPRESSION-V2-CONDITIONAL-01: conditional content lowering", () => {
  const ir = buildComponentIR(CONDITIONAL_CONTRACT);

  it("React lowers conditional content to a JSX ternary", () => {
    const src = generateReactComponentSource(ir, "../../primitives");
    expect(src).toContain("{(expanded ? collapseText : expandText)}");
    expect(src).toContain("onClick={() => setExpanded(!expanded)}");
  });

  it("Vue lowers conditional content to a template ternary", () => {
    const src = generateVueComponentSource(ir);
    expect(src).toContain("{{ (behavior.expanded.value ? props.collapseText : props.expandText) }}");
    expect(src).toContain("@click=\"() => behavior.setExpanded(!behavior.expanded.value)\"");
  });

  it("Svelte lowers conditional content to a template ternary", () => {
    const src = generateSvelteComponentSource(ir);
    expect(src).toMatch(/\{\([a-zA-Z_$][\w$]*\.expanded \? collapseText : expandText\)\}/);
    expect(src).toMatch(/onclick=\{\(\) => [a-zA-Z_$][\w$]*\.setExpanded\(![a-zA-Z_$][\w$]*\.expanded\)\}/);
  });

  it("Angular lowers conditional content to a template ternary", () => {
    const src = generateAngularComponentSource(ir);
    expect(src).toContain(
      "{{ (behavior.expanded() ? (collapseText ?? 'Show less') : (expandText ?? 'Show more')) }}",
    );
    expect(src).toContain('(click)="behavior.setExpanded(!behavior.expanded())"');
  });

  it("Lit lowers conditional content to a template ternary", () => {
    const src = generateLitComponentSource(ir);
    expect(src).toContain(
      '${(this.behavior.expanded ? (this.collapseText ?? "Show less") : (this.expandText ?? "Show more"))}',
    );
    expect(src).toContain("@click=${() => this.behavior.setExpanded(!this.behavior.expanded)}");
  });

  it("React Native lowers conditional content to a JSX ternary", () => {
    const src = generateReactNativeComponentSource(ir).componentFile;
    expect(src).toContain("<RNText>{(expanded ? collapseText : expandText)}</RNText>");
    expect(src).toContain("onPress={() => setExpandedValue(!expanded)}");
    expect(src).not.toContain("showMoreLabel");
  });
});

describe("BINDING-EXPRESSION-V2-CONDITIONAL-01: dynamic root role lowering", () => {
  const ir = buildComponentIR(DYNAMIC_ROOT_ROLE_CONTRACT);

  it("does not append a duplicate static root role when anatomy.dom binds role", () => {
    const src = generateReactComponentSource(ir, "../../primitives");

    expect(src).toContain('role={(decorative ? "presentation" : "status")}');
    expect(src).not.toContain('role="status"');
    expect(buildComponentTestPlan(ir).role).toBeUndefined();
  });

  it("lowers the dynamic role binding across web and native emitters", () => {
    expect(generateVueComponentSource(ir)).toContain(
      ":role=\"(props.decorative ? 'presentation' : 'status')\"",
    );
    expect(generateSvelteComponentSource(ir)).toContain(
      'role={(decorative ? "presentation" : "status")}',
    );
    // lit/angular read class fields, not defaulted parameters, so the
    // accessor must re-apply the contract default (true) on undefined.
    expect(generateAngularComponentSource(ir)).toContain(
      "[attr.role]=\"((decorative ?? true) ? 'presentation' : 'status')\"",
    );
    expect(generateLitComponentSource(ir)).toContain(
      '.role=${((this.decorative ?? true) ? "presentation" : "status")}',
    );
    expect(generateReactNativeComponentSource(ir).componentFile).toContain(
      'accessibilityRole={(((decorative ? "presentation" : "status") === "presentation" ? "none" : (decorative ? "presentation" : "status")) as AccessibilityRole)}',
    );
  });
});

// FIX-COUNT-ITERATION-DEFAULT-THREADING-01 — parity fixture.
//
// Cross-framework rule under test: a count-kind iteration source that is
// a bare prop binding must, when explicitly `undefined` at runtime,
// resolve to the prop's CONTRACT default in every framework (react's
// parameter default / vue's withDefaults / svelte's `export let` already
// honor this). Lit and Angular's count-iteration lowering used to
// hardcode `?? 0` / undefined->0 regardless of any declared default
// (production repro: OTP.length defaults to 6, but lit/angular rendered
// zero fields for an explicitly-undefined input). (Calendar was a second
// count-default witness at the time; its `daysShown` count was later
// replaced by a `days: Date[]` array iteration in
// FEAT-BINDING-CALL-WITH-ARG-01, so OTP now carries this repro alone.)
//
// COUNT_CONTRACT_WITH_DEFAULT declares `default: 6` on the count prop —
// the sibling of PRODUCTION-ARRAY-ITERATION-CONSUMER-01's COUNT_CONTRACT
// above (which deliberately has NO default and pins the unchanged
// fallback-to-0 behavior in the "still works for plain props" block).
const COUNT_CONTRACT_WITH_DEFAULT: ComponentContract = {
  name: "FixtureCountWithDefault",
  layer: "primitive",
  cssPrefix: "fixture-count-default",
  anatomy: {
    parts: ["root", "dot"],
    dom: {
      tag: "div",
      part: "root",
      attrs: { role: "group" },
      children: [
        {
          tag: "span",
          part: "dot",
          attrs: { "aria-hidden": "true" },
          iterate: {
            source: "prop:count",
            kind: "count",
          },
        },
      ],
    },
  },
  props: {
    styled: {
      members: [
        {
          name: "count",
          type: "number",
          description: "Number of dots to render",
          default: 6,
        },
      ],
    },
  },
};

describe("FIX-COUNT-ITERATION-DEFAULT-THREADING-01: count-iteration default threading", () => {
  const ir = buildComponentIR(COUNT_CONTRACT_WITH_DEFAULT);

  it("Lit: threads the contract default into the count fallback ((this.count ?? 6), not ?? 0)", () => {
    const src = generateLitComponentSource(ir);
    // The default-aware accessor parenthesizes the defaulted read.
    expect(src).toMatch(/Array\.from\(\{ length: \(this\.count \?\? 6\) \}/);
    expect(src).not.toMatch(/Array\.from\(\{ length: this\.count \?\? 0 \}/);
  });

  it("Angular: threads the contract default at the arrayFromCount call site ((count ?? 6), not bare count)", () => {
    const src = generateAngularComponentSource(ir);
    expect(src).toMatch(/\*ngFor="let _ of arrayFromCount\(\(count \?\? 6\)\); let index = index"/);
    expect(src).not.toMatch(/\*ngFor="let _ of arrayFromCount\(count\); let index = index"/);
  });

  it("Lit: no-default fixture (COUNT_CONTRACT) still falls back to ?? 0 unchanged", () => {
    // Falsification anchor: COUNT_CONTRACT (no `default` on `count`) must
    // keep emitting the literal `?? 0` fallback — the fix must not invent
    // a default where the contract declares none.
    const noDefaultIr = buildComponentIR(COUNT_CONTRACT);
    const src = generateLitComponentSource(noDefaultIr);
    expect(src).toMatch(/Array\.from\(\{ length: this\.count \?\? 0 \}/);
  });

  it("Angular: no-default fixture (COUNT_CONTRACT) still calls arrayFromCount(count) unchanged", () => {
    const noDefaultIr = buildComponentIR(COUNT_CONTRACT);
    const src = generateAngularComponentSource(noDefaultIr);
    expect(src).toMatch(/\*ngFor="let _ of arrayFromCount\(count\); let index = index"/);
  });
});
