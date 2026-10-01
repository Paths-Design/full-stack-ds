import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../contract.js";
import { validateBrandComponentOverrides } from "./brand-component-overrides.js";

function fixture(): ComponentContract {
  return {
    name: "Test", cssPrefix: "test", layer: "primitive", anatomy: { parts: ["root"] },
    props: { styled: { members: [] } },
    tokens: { "test.radius": { fallback: "8px" }, "test.orphan": { fallback: "2px" } },
    styles: { root: { "border-radius": {
      resolvesTo: "test.radius", fallback: "8px",
      design: { property: "shape.radius", slot: "test.design.root.shape.radius" },
    } } },
  } as ComponentContract;
}

describe("brand component destinations", () => {
  it('accepts a neutral base and explicit variant address without overlapping nested token leaves', () => {
    const contract = fixture();
    contract.tokens = { 'test.size': { literal: '16px' }, 'test.size.small': { literal: '12px' } };
    contract.styles = { root: { width: { resolvesTo: 'test.size', fallback: '16px' } }, '--small': { width: { resolvesTo: 'test.size.small', fallback: '12px' } } };
    expect(validateBrandComponentOverrides('Test', { size: { $type: 'dimension', $value: '20px' }, 'size.small': { $type: 'dimension', $value: '14px' } }, contract)).toEqual([]);
  });
  it("accepts consumed tokens and unset-by-default design slots, including zero values", () => {
    expect(validateBrandComponentOverrides("Test", {
      radius: { $value: "4px" },
      design: { root: { shape: { radius: { $type: "dimension", $value: 0 } } } },
    }, fixture())).toEqual([]);
  });
  it("rejects a declared but unconsumed token, a typo and the repeated component namespace", () => {
    const issues = validateBrandComponentOverrides("Test", {
      orphan: { $value: "4px" }, radiuz: { $value: "4px" }, test: { radius: { $value: "4px" } },
    }, fixture());
    expect(issues.map(issue => issue.pointer)).toEqual([
      "/components/Test/orphan", "/components/Test/radiuz", "/components/Test/test/radius",
    ]);
    expect(issues.every(issue => issue.message.includes("BRAND_COMPONENT_UNCONSUMED"))).toBe(true);
  });
  it("fails when the consumer is removed instead of permitting a compatibility declaration", () => {
    const contract = fixture();
    contract.styles = {};
    expect(validateBrandComponentOverrides("Test", { radius: { $value: "4px" } }, contract))
      .toEqual([{ pointer: "/components/Test/radius", message: "[BRAND_COMPONENT_UNCONSUMED] --fsds-test-radius has no Web property consumer in Test; use a current component token or design slot." }]);
  });
  it("rejects unknown components and malformed destinations", () => {
    expect(validateBrandComponentOverrides("Retired", {})).toEqual([
      { pointer: "/components/Retired", message: "[BRAND_COMPONENT_UNKNOWN] Retired is not a current component." },
    ]);
    expect(validateBrandComponentOverrides("Test", { radius: "4px" }, fixture())).toEqual([
      { pointer: "/components/Test/radius", message: "[BRAND_COMPONENT_INVALID] Expected a token group or a $value leaf." },
    ]);
  });
});
