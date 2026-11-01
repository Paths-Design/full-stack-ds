import { describe, expect, it } from "vitest";
import type { ComponentContract } from "./contract.js";
import { buildComponentIR, computeCssBlocks } from "./ir.js";

/**
 * After the tokens/styles convergence (PLAN-TOKENS-STYLES-CONVERGENCE-001),
 * `<Name>.tokens.json` is a flat slot pool whose entries always emit as
 * custom-property declarations on the component root selector. The IR
 * keys all other selector blocks off `<Name>.styles.json`:
 *
 *   - Bare state names ("hover", "checked", ...) -> pseudo-class selectors
 *     via DERIVABLE_STATE_TO_PSEUDO.
 *   - ARIA states ("expanded", "pressed", "selected") -> attribute selectors.
 *   - "--<value>" -> BEM variant modifier.
 *   - "__<part>" or bare part name -> BEM anatomy selector.
 *   - Compound keys (":has(...)", combinator chars) -> expanded verbatim
 *     with bare part identifiers qualified by the BEM prefix.
 *
 * Each entry inside a selector block is a styleEntry: `{ resolvesTo }`
 * (slot reference; emits `var(--<slug>)` consumer) or `{ literal, platforms }`
 * (target-filtered hardcoded value).
 */
describe("computeCssBlocks: styles.json key -> CSS selector", () => {
  it("maps bare state names to pseudo-class selectors via DERIVABLE_STATE_TO_PSEUDO", () => {
    const contract = makeContract({
      styles: {
        hover: { color: { literal: "red", platforms: ["web"] } },
        focus: { color: { literal: "blue", platforms: ["web"] } },
      },
    });
    const blocks = computeCssBlocks(contract, "x");
    const selectors = blocks.map((b) => b.selector);

    expect(selectors).toContain(".x:hover");
    expect(selectors).toContain(".x:focus-visible");
    // Must NOT collapse state keys onto __part fallbacks.
    expect(selectors).not.toContain(".x__hover");
    expect(selectors).not.toContain(".x--hover");
  });

  it("maps ARIA states to attribute selectors", () => {
    const contract = makeContract({
      styles: {
        expanded: { color: { literal: "red", platforms: ["web"] } },
        pressed: { color: { literal: "blue", platforms: ["web"] } },
      },
    });
    const blocks = computeCssBlocks(contract, "x");
    const selectors = blocks.map((b) => b.selector);

    expect(selectors).toContain('.x[aria-expanded="true"]');
    expect(selectors).toContain('.x[aria-pressed="true"]');
  });

  it("expands bare anatomy part names into BEM selectors", () => {
    const contract = makeContract({
      anatomy: { parts: ["root", "track", "thumb"] },
      styles: {
        track: { "background-color": { literal: "#cecece", platforms: ["web"] } },
        thumb: { "background-color": { literal: "#ffffff", platforms: ["web"] } },
      },
    });
    const blocks = computeCssBlocks(contract, "x");
    const selectors = blocks.map((b) => b.selector);

    expect(selectors).toContain(".x__track");
    expect(selectors).toContain(".x__thumb");
  });

  it("expands --<value> keys into BEM variant modifiers", () => {
    const contract = makeContract({
      variants: { size: ["sm", "md", "lg"] },
      styles: {
        "--sm": { width: { literal: "24px", platforms: ["web"] } },
        "--lg": { width: { literal: "64px", platforms: ["web"] } },
      },
    });
    const blocks = computeCssBlocks(contract, "x");
    const selectors = blocks.map((b) => b.selector);

    expect(selectors).toContain(".x--sm");
    expect(selectors).toContain(".x--lg");
  });

  it("passes compound selector keys through expandComplexSelector verbatim", () => {
    const contract = makeContract({
      anatomy: { parts: ["root", "track", "input"] },
      styles: {
        ":has(.x__input:checked) .x__track": {
          "background-color": { literal: "#d9292b", platforms: ["web"] },
        },
      },
    });
    const blocks = computeCssBlocks(contract, "x");
    const selectors = blocks.map((b) => b.selector);

    expect(selectors).toContain(":has(.x__input:checked) .x__track");
  });

  it("passes already-qualified single-segment selectors (start with `.`) through verbatim", () => {
    // Regression for the `expandStylesKey` bug Round 3 surfaced:
    // a single-segment key like `.x--small` was treated as a bare
    // anatomy part and emitted as `.x__.x--small` instead of `.x--small`.
    // Already-qualified selectors (start with `.`, `#`, or `*`) must
    // pass through untouched.
    const contract = makeContract({
      variants: { size: ["small", "medium"] },
      styles: {
        ".x--small": { width: { literal: "24px", platforms: ["web"] } },
        ".x--medium": { width: { literal: "32px", platforms: ["web"] } },
      },
    });
    const blocks = computeCssBlocks(contract, "x");
    const selectors = blocks.map((b) => b.selector);

    expect(selectors).toContain(".x--small");
    expect(selectors).toContain(".x--medium");
    expect(selectors).not.toContain(".x__.x--small");
    expect(selectors).not.toContain(".x__.x--medium");
  });
});

// The box-model primitive auto-consumes its 11 longhand slots on every
// component's root selector. Declared once here so the three root-block
// shape tests below stay focused on what they're actually asserting
// (token-slot wiring) rather than restating the consumer block in each
// expectation.
const BOX_MODEL_CONSUMERS = {
  "padding-block-start": "var(--fsds-box-model-padding-block-start)",
  "padding-block-end": "var(--fsds-box-model-padding-block-end)",
  "padding-inline-start": "var(--fsds-box-model-padding-inline-start)",
  "padding-inline-end": "var(--fsds-box-model-padding-inline-end)",
  gap: "var(--fsds-box-model-gap)",
  width: "var(--fsds-box-model-width)",
  "min-width": "var(--fsds-box-model-min-width)",
  "max-width": "var(--fsds-box-model-max-width)",
  height: "var(--fsds-box-model-height)",
  "min-height": "var(--fsds-box-model-min-height)",
  "max-height": "var(--fsds-box-model-max-height)",
};

describe("computeCssBlocks: tokens.json -> slot declarations on root", () => {
  it("emits one slot declaration per tokens.json entry on the root selector", () => {
    const contract: ComponentContract = {
      name: "X",
      cssPrefix: "x",
      anatomy: { parts: ["root"] },
      props: { styled: { members: [] } },
      tokens: {
        "x.color.track.bg": {
          resolvesTo: "semantic.color.background.tertiary",
          fallback: "#cecece",
          layer: "semantic",
        },
        "x.color.thumb.bg": {
          resolvesTo: "semantic.color.background.primary",
          fallback: "#ffffff",
          layer: "semantic",
        },
      },
    };
    const blocks = computeCssBlocks(contract, "x");
    const root = blocks.find((b) => b.selector === ".x");

    expect(root).toBeDefined();
    // Every tokens.json entry becomes a `--<slug>: var(--global, fallback)`
    // declaration on the root selector. The cascade delivers it to every
    // descendant selector that reads it by name.
    expect(root?.declarations).toEqual({
      "--fsds-x-color-track-bg":
        "var(--fsds-semantic-color-background-tertiary, #cecece)",
      "--fsds-x-color-thumb-bg":
        "var(--fsds-semantic-color-background-primary, #ffffff)",
      ...BOX_MODEL_CONSUMERS,
    });
  });

  it("emits literal-valued slot declarations as the literal value", () => {
    const contract: ComponentContract = {
      name: "X",
      cssPrefix: "x",
      anatomy: { parts: ["root"] },
      props: { styled: { members: [] } },
      tokens: {
        "x.size.hairline": { literal: "1px" },
      },
    };
    const blocks = computeCssBlocks(contract, "x");
    const root = blocks.find((b) => b.selector === ".x");

    expect(root?.declarations).toEqual({
      "--fsds-x-size-hairline": "1px",
      ...BOX_MODEL_CONSUMERS,
    });
  });

  it("merges styles.root consumers with the slot declarations on the root selector", () => {
    const contract: ComponentContract = {
      name: "X",
      cssPrefix: "x",
      anatomy: { parts: ["root"] },
      props: { styled: { members: [] } },
      tokens: {
        "x.color.bg": {
          resolvesTo: "semantic.color.background.primary",
          fallback: "#fff",
        },
      },
      styles: {
        root: {
          "background-color": { resolvesTo: "x.color.bg" },
          display: { literal: "inline-flex", platforms: ["web"] },
        },
      },
    };
    const blocks = computeCssBlocks(contract, "x");
    const root = blocks.find((b) => b.selector === ".x");

    expect(root?.declarations).toEqual({
      "--fsds-x-color-bg":
        "var(--fsds-semantic-color-background-primary, #fff)",
      ...BOX_MODEL_CONSUMERS,
      "background-color": "var(--fsds-x-color-bg)",
      display: "inline-flex",
    });
  });
});

describe("renderStyleBlock: resolution and platform filtering", () => {
  it("renders a `resolvesTo` styleEntry as var(--<slug>) at the consumer site", () => {
    const contract: ComponentContract = {
      name: "X",
      cssPrefix: "x",
      anatomy: { parts: ["root", "track"] },
      props: { styled: { members: [] } },
      tokens: {
        "x.color.track.bg": {
          resolvesTo: "semantic.color.background.tertiary",
          fallback: "#cecece",
        },
      },
      styles: {
        track: {
          "background-color": { resolvesTo: "x.color.track.bg" },
        },
      },
    };
    const blocks = computeCssBlocks(contract, "x");
    const track = blocks.find((b) => b.selector === ".x__track");

    // No fallback at the consumer site — the slot's own fallback chains
    // via the cascade.
    expect(track?.declarations).toEqual({
      "background-color": "var(--fsds-x-color-track-bg)",
    });
  });

  it("emits a `literal` styleEntry only when its platforms include the target", () => {
    const contract: ComponentContract = {
      name: "X",
      cssPrefix: "x",
      anatomy: { parts: ["root", "track"] },
      props: { styled: { members: [] } },
      styles: {
        track: {
          // web-only: should render under the default ("web") platformTarget.
          cursor: { literal: "pointer", platforms: ["web"] },
          // ios/android-only: should NOT render under "web".
          "tap-highlight-color": {
            literal: "rgba(0,0,0,0)",
            platforms: ["ios", "android"],
          },
        },
      },
    };
    const blocks = computeCssBlocks(contract, "x");
    const track = blocks.find((b) => b.selector === ".x__track");

    expect(track?.declarations).toEqual({
      cursor: "pointer",
    });
  });

  it("emits a `literal` styleEntry under a non-web target when platforms match", () => {
    const contract: ComponentContract = {
      name: "X",
      cssPrefix: "x",
      anatomy: { parts: ["root", "track"] },
      props: { styled: { members: [] } },
      styles: {
        track: {
          cursor: { literal: "pointer", platforms: ["web"] },
          "tap-highlight-color": {
            literal: "rgba(0,0,0,0)",
            platforms: ["ios", "android"],
          },
        },
      },
    };
    const blocks = computeCssBlocks(contract, "x", { platformTarget: "ios" });
    const track = blocks.find((b) => b.selector === ".x__track");

    expect(track?.declarations).toEqual({
      "tap-highlight-color": "rgba(0,0,0,0)",
    });
  });

  it("includes a `resolvesTo` styleEntry on all platforms by default (no `platforms` arg)", () => {
    const contract: ComponentContract = {
      name: "X",
      cssPrefix: "x",
      anatomy: { parts: ["root", "track"] },
      props: { styled: { members: [] } },
      tokens: {
        "x.color.track.bg": { resolvesTo: "semantic.color.bg", fallback: "#fff" },
      },
      styles: {
        track: {
          "background-color": { resolvesTo: "x.color.track.bg" },
        },
      },
    };
    const blocksWeb = computeCssBlocks(contract, "x", { platformTarget: "web" });
    const blocksIos = computeCssBlocks(contract, "x", { platformTarget: "ios" });

    const trackWeb = blocksWeb.find((b) => b.selector === ".x__track");
    const trackIos = blocksIos.find((b) => b.selector === ".x__track");

    expect(trackWeb?.declarations).toEqual({
      "background-color": "var(--fsds-x-color-track-bg)",
    });
    expect(trackIos?.declarations).toEqual({
      "background-color": "var(--fsds-x-color-track-bg)",
    });
  });

  it("filters a `resolvesTo` styleEntry by explicit platforms", () => {
    const contract: ComponentContract = {
      name: "X",
      cssPrefix: "x",
      anatomy: { parts: ["root", "track"] },
      props: { styled: { members: [] } },
      tokens: {
        "x.color.track.bg": { resolvesTo: "semantic.color.bg", fallback: "#fff" },
      },
      styles: {
        track: {
          "background-color": {
            resolvesTo: "x.color.track.bg",
            platforms: ["web"],
          },
        },
      },
    };
    const blocks = computeCssBlocks(contract, "x", { platformTarget: "ios" });
    // Under ios, the explicit `platforms: ["web"]` filter drops the entry,
    // and the resulting empty block isn't emitted.
    expect(blocks.find((b) => b.selector === ".x__track")).toBeUndefined();
  });

  it("emits a slot-path property key as a CSS custom-property redefinition", () => {
    // A property key containing `.` (e.g. `x.color.bg`) is a variant /
    // state redirection: it redefines the named slot at this selector's
    // scope. The output key becomes the CSS custom property
    // (`--fsds-x-color-bg`), not the raw dotted path.
    const contract: ComponentContract = {
      name: "X",
      cssPrefix: "x",
      anatomy: { parts: ["root"] },
      props: { styled: { members: [] } },
      tokens: {
        "x.color.bg": {
          resolvesTo: "semantic.color.background.primary",
          fallback: "#fff",
        },
      },
      styles: {
        root: {
          "background-color": { resolvesTo: "x.color.bg" },
        },
        "--primary": {
          "x.color.bg": {
            resolvesTo: "semantic.color.action.background.primary.default",
          },
        },
      },
    };
    const blocks = computeCssBlocks(contract, "x");
    const variant = blocks.find((b) => b.selector === ".x--primary");
    expect(variant).toBeDefined();
    // Slot-path key emitted as a custom-property redefinition, not as a
    // CSS property named `x.color.bg` (which would be invalid CSS).
    expect(variant?.declarations).toEqual({
      "--fsds-x-color-bg":
        "var(--fsds-semantic-color-action-background-primary-default)",
    });
  });
});

function makeContract(extra: Partial<ComponentContract>): ComponentContract {
  return {
    name: "X",
    cssPrefix: "x",
    anatomy: { parts: ["root"] },
    props: { styled: { members: [] } },
    ...extra,
  } as ComponentContract;
}

describe("computeCssBlocks: interaction suppression guard (FIX-STATE-SUPPRESSION-LEAKS-01)", () => {
  // A contract declaring `suppresses.categories: ["interaction"]` claims that
  // while suppressed, interaction styling does not apply. Guarding the
  // interaction selectors enforces that by construction. Resetting properties
  // inside the suppressing block instead is enumeration, and enumeration is why
  // the defect existed: Button's :disabled reset background-color and color and
  // forgot border-color, so a disabled Button still took the hover border.
  const suppressing = (over: Record<string, unknown> = {}) =>
    ({
    dimensions: {
      availability: {
        category: "availability",
        values: ["enabled", "disabled"],
        initial: "enabled",
        suppresses: { categories: ["interaction"] },
        ...over,
      },
    },
  }) as unknown as ComponentContract["states"];

  const interactionStyles = {
    hover: { color: { literal: "red", platforms: ["web"] } },
    active: { color: { literal: "blue", platforms: ["web"] } },
    disabled: { color: { literal: "grey", platforms: ["web"] } },
  } as unknown as ComponentContract["styles"];

  it("guards interaction selectors on a native form-control root with :not(:disabled)", () => {
    const contract = makeContract({
      anatomy: { parts: ["root"], dom: { tag: "button", part: "root" } },
      states: suppressing(),
      styles: interactionStyles,
    });
    const selectors = computeCssBlocks(contract, "x").map((b) => b.selector);
    expect(selectors).toContain(".x:hover:not(:disabled)");
    expect(selectors).toContain(".x:active:not(:disabled)");
    // The suppressing block itself is not interaction styling — never guarded,
    // or it could never match the state it exists to style.
    expect(selectors).toContain(".x:disabled");
  });

  it("guards with the ARIA form when the root is not a native form control", () => {
    // `:disabled` matches only form controls, so emitting it on a <span> would
    // suppress nothing while looking like it did.
    const contract = makeContract({
      anatomy: { parts: ["root"], dom: { tag: "span", part: "root" } },
      states: suppressing(),
      styles: interactionStyles,
    });
    const selectors = computeCssBlocks(contract, "x").map((b) => b.selector);
    expect(selectors).toContain('.x:hover:not([aria-disabled="true"])');
  });

  it("prefers a contract-declared a11y attribute over the derived form", () => {
    const contract = makeContract({
      anatomy: { parts: ["root"], dom: { tag: "div", part: "root" } },
      states: suppressing({
        a11y: { attribute: "aria-disabled", values: { enabled: "false", disabled: "true" } },
      }),
      styles: interactionStyles,
    });
    const selectors = computeCssBlocks(contract, "x").map((b) => b.selector);
    expect(selectors).toContain('.x:hover:not([aria-disabled="true"])');
  });

  it("adds NO guard when the contract declares no interaction suppression", () => {
    // The change must be driven by the declared fact, not applied blanket.
    const contract = makeContract({
      anatomy: { parts: ["root"], dom: { tag: "button", part: "root" } },
      styles: interactionStyles,
    });
    const selectors = computeCssBlocks(contract, "x").map((b) => b.selector);
    expect(selectors).toContain(".x:hover");
    expect(selectors.some((s) => s.includes(":not("))).toBe(false);
  });

  it("adds NO guard for non-web platform targets", () => {
    // Selector mechanics are web-only. Leaking them into a native target is how
    // this change first dropped every `_pressed` style from React Native.
    const contract = makeContract({
      anatomy: { parts: ["root"], dom: { tag: "button", part: "root" } },
      states: suppressing(),
      styles: interactionStyles,
    });
    for (const platformTarget of ["ios", "android"] as const) {
      const selectors = computeCssBlocks(contract, "x", { platformTarget }).map((b) => b.selector);
      expect(selectors.some((s) => s.includes(":not("))).toBe(false);
    }
  });

  it("does not guard variant or anatomy-part selectors", () => {
    const contract = makeContract({
      anatomy: { parts: ["root", "icon"], dom: { tag: "button", part: "root" } },
      states: suppressing(),
      styles: {
        "--primary": { color: { literal: "red", platforms: ["web"] } },
        __icon: { color: { literal: "red", platforms: ["web"] } },
      },
    });
    const selectors = computeCssBlocks(contract, "x").map((b) => b.selector);
    expect(selectors).toContain(".x--primary");
    expect(selectors).toContain(".x__icon");
    expect(selectors.some((s) => s.includes(":not("))).toBe(false);
  });
});

describe("named dimension suppression", () => {
  const named = (names: string[], extra: Record<string, unknown> = {}) => makeContract({
    anatomy: { parts: ["root"], dom: { tag: "a", part: "root" } },
    states: { dimensions: {
      pointer: { category: "interaction", values: ["rest", "hover", "visited"], initial: "rest" },
      focus: { category: "interaction", values: ["blur", "focus"], initial: "blur" },
      availability: {
        category: "availability", values: ["enabled", "disabled"], initial: "enabled",
        suppresses: { names }, a11y: { attribute: "aria-disabled", values: { disabled: "true" } },
      },
      ...extra,
    } } as ComponentContract["states"],
    styles: Object.fromEntries(["hover", "visited", "focus"].map((key) => [key, {
      color: { literal: "red", platforms: ["web", "ios"], design: { property: "foreground.color", slot: `x.design.${key}.foreground.color` } },
    }])) as ComponentContract["styles"],
  });

  it("suppresses pointer hover and visited while preserving focus, with matching design selectors", () => {
    const ir = buildComponentIR(named(["pointer"]));
    const selectors = ir.cssBlocks.map((block) => block.selector);
    expect(selectors).toContain('.x:hover:not([aria-disabled="true"])');
    expect(selectors).toContain('.x:visited:not([aria-disabled="true"])');
    expect(selectors).toContain(".x:focus-visible");
    expect(ir.designBindings.map((binding) => binding.selector)).toEqual(selectors.slice(1));
    expect(selectors.some((selector) => selector.includes(":pointer"))).toBe(false);
  });

  it("focus-only suppression preserves both pointer states and leaves native CSS selectors unguarded", () => {
    const contract = named(["focus"]);
    expect(computeCssBlocks(contract, "x").map((block) => block.selector)).toEqual([
      ".x", ".x:hover", ".x:visited", '.x:focus-visible:not([aria-disabled="true"])',
    ]);
    expect(computeCssBlocks(contract, "x", { platformTarget: "ios" }).map((block) => block.selector)).toEqual([
      ".x", ".x:hover", ".x:visited", ".x:focus-visible",
    ]);
  });

  it("resolves category and name targets as a union and rejects unknown names", () => {
    const contract = named(["pointer"], { selection: { category: "selection", values: ["unchecked", "checked"], initial: "unchecked" } });
    contract.states!.dimensions.availability.suppresses!.categories = ["selection"];
    contract.styles!.checked = { color: { literal: "blue", platforms: ["web"] } };
    const selectors = computeCssBlocks(contract, "x").map((block) => block.selector);
    expect(selectors).toContain('.x:hover:not([aria-disabled="true"])');
    expect(selectors).toContain('.x:checked:not([aria-disabled="true"])');
    expect(selectors).toContain('.x:focus-visible');
    expect(() => computeCssBlocks(named(["missing"]), "x")).toThrow(/STATE_SUPPRESSION_UNKNOWN_DIMENSION.*availability.*missing/);
    expect(() => buildComponentIR(named(["missing"]))).toThrow(/STATE_SUPPRESSION_UNKNOWN_DIMENSION/);
  });

  it("guards the state-bearing subject in compound selectors without inheriting an ancestor's guard", () => {
    const contract = named(["pointer"]);
    contract.styles = {
      '.x:hover:focus-visible': { color: { literal: "red", platforms: ["web"] } },
      '.outer:not([aria-disabled="true"]) .x:hover': { color: { literal: "blue", platforms: ["web"] } },
      '.x:focus-visible': { color: { literal: "black", platforms: ["web"] } },
    };
    expect(computeCssBlocks(contract, "x").map((block) => block.selector)).toEqual([
      ".x", '.x:hover:focus-visible:not([aria-disabled="true"])',
      '.outer:not([aria-disabled="true"]) .x:hover:not([aria-disabled="true"])', '.x:focus-visible',
    ]);
  });

  it("preserves an authored native source guard while rejecting a decorative one on an anchor", () => {
    const contract = named(["pointer"]);
    contract.anatomy = { parts: ["root", "field"], dom: { tag: "div", part: "root", children: [
      { tag: "input", part: "field", bindings: { disabled: "prop:disabled" } },
    ] } };
    contract.styles = { '.x__field:hover:not(:disabled)': { color: { literal: "red", platforms: ["web"] } } };
    expect(computeCssBlocks(contract, "x")[1].selector).toBe('.x__field:hover:not(:disabled)');
    const anchor = named(["pointer"]);
    anchor.styles = { '.x:hover:not(:disabled)': { color: { literal: "red", platforms: ["web"] } } };
    expect(computeCssBlocks(anchor, "x")[1].selector).toBe('.x:hover:not(:disabled):not([aria-disabled="true"])');
  });

  it("composes distinct source guards and keeps authored guards idempotent in each selector-list branch", () => {
    const contract = named(["pointer"], {
      loading: {
        category: "data", values: ["idle", "loading", "blocked"], initial: "idle",
        suppresses: { names: ["pointer"] },
        a11y: { attribute: "data-status", values: { loading: "loading", blocked: "blocked" } },
      },
    });
    contract.styles = {
      '.x:hover:not([aria-disabled="true"]), .x:visited': { color: { literal: "red", platforms: ["web"] } },
    };
    expect(computeCssBlocks(contract, "x")[1].selector).toBe(
      '.x:hover:not([aria-disabled="true"]):not([data-status="loading"]):not([data-status="blocked"]), .x:visited:not([aria-disabled="true"]):not([data-status="loading"]):not([data-status="blocked"])',
    );
  });
});

describe("renderStyleBlock — platforms-on-literal guard", () => {
  // The schema requires `platforms` whenever `literal` is set. Prior to
  // this guard, a `literal` entry that bypassed schema validation (e.g.
  // a hand-constructed StyleEntry, or a malformed contract that slipped
  // past validation) would be silently dropped from emission with no
  // diagnostic. The IR now throws so the contract bug is visible.
  it("throws when a literal entry omits platforms", () => {
    const contract = makeContract({
      anatomy: { parts: ["root", "track"] },
      styles: {
        track: {
          // Intentionally missing `platforms` — would have produced an
          // empty declaration block before the guard.
          "background-color": { literal: "red" },
        },
      },
    });
    expect(() => computeCssBlocks(contract, "x")).toThrow(
      /uses `literal` without a `platforms` array/,
    );
  });

  it("does NOT throw on resolvesTo without platforms (symmetric default = all platforms)", () => {
    const contract = makeContract({
      anatomy: { parts: ["root", "track"] },
      styles: {
        track: {
          "background-color": {
            resolvesTo: "semantic.color.background.tertiary",
          },
        },
      },
    });
    // Must not throw — that is the contract under test. The exact
    // selector chosen by `computeCssBlocks` for a bare part key is an
    // emitter implementation detail; the cross-check we care about is
    // that the resolvesTo entry survives to a declaration somewhere.
    const blocks = computeCssBlocks(contract, "x");
    const allDeclarations = blocks.flatMap((b) =>
      Object.values(b.declarations),
    );
    expect(allDeclarations).toContain(
      "var(--fsds-semantic-color-background-tertiary)",
    );
  });
});
