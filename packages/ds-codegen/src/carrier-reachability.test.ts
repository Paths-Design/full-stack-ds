/**
 * RAIL-WEB-STYLE-CARRIER-REACHABILITY-01 — the carrier derivation and the
 * reachability validator built on it.
 *
 * The thing under test is an authority claim: `deriveWebDomCarriers` is the
 * single place that says what attachment points a Web-DOM component can
 * produce, and every consumer (the semantic validator, the forward rail, the
 * inverse census) reads it rather than re-deriving modifier spelling or part
 * vocabulary. Two ways that claim can fail, and both are worse than a plain
 * bug:
 *
 *   under-claim — a carrier the emitters do place is absent from the set, so
 *                 the rail reports healthy CSS as dead. The corpus consistency
 *                 case below is the guard.
 *   over-claim  — a carrier nothing places is in the set, so the rail is green
 *                 on exactly the defect it exists to find. The Checkbox and
 *                 Details fixtures are the guards.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { buildComponentIR, deriveWebDomCarriers } from "./ir.js";
import { loadCorpusContract } from "./frameworks/corpus-fixtures.js";
import { getCssPrefix } from "./contract.js";
import type { ComponentContract } from "./contract.js";
import { validateStylesCarrierReachability } from "./validation/styles.js";

const CONTRACTS = resolve(__dirname, "../../ds-contracts/components");
const REACT = resolve(__dirname, "../../ds-react/src/components");

function carriersOf(contract: ComponentContract) {
  return deriveWebDomCarriers(buildComponentIR(contract), contract);
}

function base(extra: Partial<ComponentContract>): ComponentContract {
  return {
    name: "Test",
    cssPrefix: "test",
    layer: "primitive",
    anatomy: { parts: ["root"] },
    props: { styled: { members: [] } },
    ...extra,
  } as ComponentContract;
}

describe("deriveWebDomCarriers — modifier spelling comes from classRecipe", () => {
  it("a value-disjoint axis keeps the bare `--<value>` shape", () => {
    const c = base({
      variants: { icon: ["left", "right", "none"] },
      props: {
        styled: { members: [{ name: "icon", propType: { kind: "ref", to: "TestIcon" } }] },
      },
    } as Partial<ComponentContract>);
    const carriers = carriersOf(c);
    expect(carriers.classes.has("test--none")).toBe(true);
    // The namespaced form is what Details' styles sidecar wrongly assumes.
    expect(carriers.classes.has("test--icon-none")).toBe(false);
  });

  it("a colliding axis is namespaced `--<axis>-<value>`, and only that form", () => {
    // `size` and `radius` share sm/md: `computeTaintedAxes` namespaces both, so
    // a bare `.test--sm` would be ambiguous and is not a produced carrier.
    const c = base({
      variants: { size: ["sm", "md"], radius: ["sm", "md"] },
      props: {
        styled: {
          members: [
            { name: "size", propType: { kind: "ref", to: "TestSize" } },
            { name: "radius", propType: { kind: "ref", to: "TestRadius" } },
          ],
        },
      },
    } as Partial<ComponentContract>);
    const carriers = carriersOf(c);
    expect(carriers.classes.has("test--size-sm")).toBe(true);
    expect(carriers.classes.has("test--radius-sm")).toBe(true);
    expect(carriers.classes.has("test--sm")).toBe(false);
  });
});

describe("deriveWebDomCarriers — part carriers reflect the realization", () => {
  it("a declared part the dom tree never renders is NOT a produced carrier", () => {
    // The Checkbox shape: `anatomy.parts` promises an indicator, `anatomy.dom`
    // collapses to a bare input. Claiming the part here would green the defect.
    const c = base({
      anatomy: {
        parts: ["root", "input", "indicator"],
        dom: { tag: "input", part: "root" },
      },
    } as Partial<ComponentContract>);
    const carriers = carriersOf(c);
    expect(carriers.partsDeterminate).toBe(true);
    expect(carriers.classes.has("test__indicator")).toBe(false);
  });

  it("a part the dom tree DOES render is a produced carrier", () => {
    const c = base({
      anatomy: {
        parts: ["root", "indicator"],
        dom: { tag: "span", part: "root", children: [{ tag: "span", part: "indicator" }] },
      },
    } as Partial<ComponentContract>);
    expect(carriersOf(c).classes.has("test__indicator")).toBe(true);
  });

  it("an explicitly consumer-composed part is a produced carrier without a root DOM placeholder", () => {
    const c = base({
      anatomy: {
        parts: ["root", "ornament"],
        details: {
          ornament: {
            description: "Consumer-composed ornament wrapper",
            tag: "span",
            role: "decoration",
            subcomponent: true,
          },
        },
        dom: { tag: "div", part: "root" },
      },
    } as Partial<ComponentContract>);

    const ir = buildComponentIR(c);
    expect(ir.compoundParts.map((part) => part.name)).toContain("ornament");
    expect(ir.compoundParts.find((part) => part.name === "ornament")?.nativeTag).toBe(
      "span",
    );
    expect(deriveWebDomCarriers(ir, c).classes.has("test__ornament")).toBe(true);
  });

  it("the ROOT part carries `.base`, never `.base__<part>`", () => {
    // Toast names its root part `viewport`; `.toast__viewport` is never placed.
    const c = base({
      anatomy: { parts: ["viewport"], dom: { tag: "div", part: "viewport" } },
    } as Partial<ComponentContract>);
    const carriers = carriersOf(c);
    expect(carriers.classes.has("test")).toBe(true);
    expect(carriers.classes.has("test__viewport")).toBe(false);
  });

  it("a contract with no anatomy.dom is INDETERMINATE, not empty", () => {
    // Card/Popover/Tooltip. Reporting their part carriers as unreachable would
    // be inferring a defect from missing information — the error slice 0
    // removed from the dead-slot classifier.
    const c = base({ anatomy: { parts: ["root", "media"] } } as Partial<ComponentContract>);
    expect(carriersOf(c).partsDeterminate).toBe(false);
  });
});

describe("validateStylesCarrierReachability", () => {
  it("reports the Details defect: the sidecar names a carrier the recipe never emits", () => {
    const c = base({
      cssPrefix: "details",
      name: "Details",
      variants: { icon: ["left", "right", "none"] },
      props: {
        styled: { members: [{ name: "icon", propType: { kind: "ref", to: "DetailsIcon" } }] },
      },
      anatomy: {
        parts: ["root", "icon"],
        dom: { tag: "details", part: "root", children: [{ tag: "span", part: "icon" }] },
      },
      styles: { ".details--icon-none .details__icon": { display: { literal: "none", platforms: ["web"] } } },
    } as Partial<ComponentContract>);
    const issues = validateStylesCarrierReachability(c);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('".details--icon-none"');
    // The diagnostic names the repair, not only the failure.
    expect(issues[0].message).toContain('".details--none"');
  });

  it("correcting the modifier to the produced form clears the finding", () => {
    const c = base({
      cssPrefix: "details",
      name: "Details",
      variants: { icon: ["left", "right", "none"] },
      props: {
        styled: { members: [{ name: "icon", propType: { kind: "ref", to: "DetailsIcon" } }] },
      },
      anatomy: {
        parts: ["root", "icon"],
        dom: { tag: "details", part: "root", children: [{ tag: "span", part: "icon" }] },
      },
      styles: { ".details--none .details__icon": { display: { literal: "none", platforms: ["web"] } } },
    } as Partial<ComponentContract>);
    expect(validateStylesCarrierReachability(c)).toEqual([]);
  });

  it("reports a part carrier the realization does not produce", () => {
    const c = base({
      cssPrefix: "checkbox",
      name: "Checkbox",
      anatomy: { parts: ["root", "indicator"], dom: { tag: "input", part: "root" } },
      styles: { indicator: { width: { literal: "16px", platforms: ["web"] } } },
    } as Partial<ComponentContract>);
    const issues = validateStylesCarrierReachability(c);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('".checkbox__indicator"');
  });

  it("adding the part to the REALIZATION clears it, with the styles key untouched", () => {
    // The repair direction the validator must leave open: this is the same
    // styles declaration, and it is now fine because the realization changed.
    const styles = { indicator: { width: { literal: "16px", platforms: ["web"] } } };
    const c = base({
      cssPrefix: "checkbox",
      name: "Checkbox",
      anatomy: {
        parts: ["root", "indicator"],
        dom: { tag: "span", part: "root", children: [{ tag: "span", part: "indicator" }] },
      },
      styles,
    } as Partial<ComponentContract>);
    expect(validateStylesCarrierReachability(c)).toEqual([]);
  });

  it("skips part carriers when the contract has no anatomy.dom", () => {
    const c = base({
      cssPrefix: "card",
      name: "Card",
      anatomy: { parts: ["root", "media"] },
      styles: { media: { display: { literal: "block", platforms: ["web"] } } },
    } as Partial<ComponentContract>);
    expect(validateStylesCarrierReachability(c)).toEqual([]);
  });

  it("a data-* marked surface part passes WITHOUT manufacturing a __part class", () => {
    // The anchored-surface family carries `trigger`/`content` on a
    // `data-<prefix>-<part>` marker and emits no part class: the trigger may be
    // the consumer's adopted element and the content is portaled out of the
    // root. A carrier vocabulary that only understood BEM would report these as
    // unreachable and push authors to add a fake `__content` class to appease
    // the gate. Non-class carriers have to be first-class.
    const c = base({
      cssPrefix: "tooltip",
      name: "Tooltip",
      surface: {
        kind: "tooltip",
        presence: "ephemeral",
        modality: "non-blocking",
        anchor: { part: "trigger", relation: "describedby" },
        content: { part: "content", interactive: false },
        positioning: { strategy: "anchored" },
        openTriggers: ["hover", "focus"],
        dismissal: ["escape", "blur"],
      },
      anatomy: {
        parts: ["root", "trigger", "content"],
        details: { trigger: { role: "trigger" }, content: { role: "content" } },
        dom: { tag: "span", part: "root" },
      },
      styles: { content: { color: { literal: "red", platforms: ["web"] } } },
    } as unknown as Partial<ComponentContract>);

    const carriers = carriersOf(c);
    expect(carriers.partSelectors.get("content")).toBe(".tooltip [data-tooltip-content]");
    expect(carriers.classes.has("tooltip__content")).toBe(false);
    // Determinate parts, so nothing is being skipped for lack of a dom tree —
    // the key genuinely reaches its marker instead of a BEM class.
    expect(carriers.partsDeterminate).toBe(true);
    expect(validateStylesCarrierReachability(c)).toEqual([]);
  });

  it("does not adjudicate selector material this component does not own", () => {
    // A consumer/global descendant is a different question (does the selector
    // match at runtime?) and claiming authority over it would produce findings
    // the validator cannot justify.
    const c = base({
      anatomy: { parts: ["root"], dom: { tag: "div", part: "root" } },
      styles: { ".test .some-consumer-class": { color: { literal: "red", platforms: ["web"] } } },
    } as Partial<ComponentContract>);
    expect(validateStylesCarrierReachability(c)).toEqual([]);
  });

  it("the `root` key is not adjudicated — emission never expands it", () => {
    // `computeCssBlocks` skips `root`; it IS the base block. Expanding it here
    // would invent a `.test__root` carrier nothing ever asks for.
    const c = base({
      anatomy: { parts: ["root"], dom: { tag: "div", part: "root" } },
      styles: { root: { color: { literal: "red", platforms: ["web"] } } },
    } as Partial<ComponentContract>);
    expect(validateStylesCarrierReachability(c)).toEqual([]);
  });

  it("DIRECTION: an emitted variant class with no CSS rule is not a finding here", () => {
    // Checkbox.size sm/md/lg emit `.checkbox--sm` etc. with no rule anywhere.
    // That is the INVERSE problem (a declared visual distinction nobody
    // painted) and belongs to the variant-style census, not to this validator.
    // Folding the two together is how a gate acquires false positives it can
    // only silence by emitting meaningless CSS.
    const c = base({
      cssPrefix: "checkbox",
      variants: { size: ["sm", "md", "lg"] },
      props: {
        styled: { members: [{ name: "size", propType: { kind: "ref", to: "CheckboxSize" } }] },
      },
      anatomy: { parts: ["root"], dom: { tag: "input", part: "root" } },
      styles: {},
    } as Partial<ComponentContract>);
    expect(validateStylesCarrierReachability(c)).toEqual([]);
  });
});

describe("corpus consistency — the derivation must not UNDER-claim", () => {
  it("every part class the React emitter places is a derived carrier", () => {
    // One-directional cross-check against emitted source. The generated
    // component is not the authority here — it is the calibration oracle for
    // the one direction where being wrong produces false findings: if an
    // emitter places `.markdown__codeBlock` and the derivation does not know
    // it, the rail reports live CSS as dead. (Over-claiming is the opposite
    // failure and is covered by the fixtures above, which is why this
    // assertion is a subset check and not an equality.)
    const components = readdirSync(CONTRACTS)
      .filter((d) => statSync(resolve(CONTRACTS, d)).isDirectory())
      .filter((d) => existsSync(resolve(CONTRACTS, d, `${d}.contract.json`)))
      .sort();
    expect(components.length).toBeGreaterThan(40);

    const underClaimed: string[] = [];
    for (const name of components) {
      const contract = loadCorpusContract(name);
      const srcPath = resolve(REACT, name, `${name}.tsx`);
      if (!existsSync(srcPath)) continue;
      const prefix = getCssPrefix(contract);
      const carriers = carriersOf(contract);
      const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const placed = new Set(
        [...readFileSync(srcPath, "utf8").matchAll(new RegExp(`${esc}__([A-Za-z0-9]+)`, "g"))].map(
          (m) => m[1],
        ),
      );
      for (const part of placed) {
        if (!carriers.classes.has(`${prefix}__${part}`)) {
          underClaimed.push(`${name}: emitter places .${prefix}__${part}, derivation does not`);
        }
      }
    }
    expect(underClaimed).toEqual([]);
  });
});
