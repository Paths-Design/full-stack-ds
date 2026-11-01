import { describe, expect, it } from "vitest";
import type { AuthoredPropType, ComponentContract, ContractTypeDef } from "./contract.js";
import { loadCorpusContract } from "./frameworks/corpus-fixtures.js";
import { derivePreviewPropSamples } from "./preview-prop-samples.js";

function withPayload(type: string, types: Record<string, ContractTypeDef> = {}): ComponentContract {
  const contract = structuredClone(loadCorpusContract("Postcard"));
  contract.props!.styled!.members!.push({ name: "payload", type, required: true });
  contract.types = { ...contract.types, ...types };
  return contract;
}

describe("build-side preview prop samples", () => {
  it("projects the real required Postcard objects without changing its public contract", () => {
    const contract = loadCorpusContract("Postcard");
    const before = JSON.stringify(contract);
    const projection = derivePreviewPropSamples(contract);
    expect(projection).toEqual({ values: {
      postId: "Example", author: { name: "Example", handle: "Example", avatar: "Example" },
      timestamp: "Example", stats: { likes: 0, replies: 0, reposts: 0 },
    }, unsupported: {} });
    expect(JSON.parse(JSON.stringify(projection))).toEqual(projection);
    expect(JSON.stringify(contract)).toBe(before);
    expect(contract.props!.styled!.members!.filter(member => ["author", "stats"].includes(member.name)).map(member => member.required)).toEqual([true, true]);
  });

  it("constructs nested properties, aliases and literals while omitting optional unsupported fields", () => {
    const projection = derivePreviewPropSamples(withPayload("Envelope", {
      Envelope: { kind: "alias", alias: "{ title: string; score: number; enabled: boolean; kind: ('first' | 'second'); count: Count; tags: string[]; nested: { low: -2; empty: null; yes: true }; optional?: Date }" },
      Count: { kind: "alias", alias: "number | string" },
    }));
    expect(projection.values.payload).toEqual({ title: "Example", score: 0, enabled: false, kind: "first", count: 0, tags: [], nested: { low: -2, empty: null, yes: true } });
    expect(projection.unsupported).toEqual({});
  });

  it("chooses a constructible union branch without leaking recursion or failure into sibling branches", () => {
    const projection = derivePreviewPropSamples(withPayload("Choice", {
      Choice: { kind: "alias", alias: "Choice | Missing | { value: string }" },
    }));
    expect(projection.values.payload).toEqual({ value: "Example" });
    expect(projection.unsupported).toEqual({});
  });

  it("resolves aliases independently for repeated sibling fields", () => {
    const projection = derivePreviewPropSamples(withPayload("{ first: Label; second: Label }", { Label: { kind: "alias", alias: "{ text: string }" } }));
    expect(projection.values.payload).toEqual({ first: { text: "Example" }, second: { text: "Example" } });
    expect(projection.unsupported).toEqual({});
  });

  it.each([
    ["Missing", "unknown alias Missing"],
    ["{ present: string; missing: Missing }", "missing: unknown alias Missing"],
    ["{ when: Date }", "when: unknown alias Date"],
    ["{ [key: string]: number }", "object requires property-only members"],
    ["{ run(): void }", "object requires property-only members"],
    ["{ [Symbol.iterator]: string }", "object requires property-only members"],
    ["{ value: string; value: number }", "ambiguous object key value"],
    ["{ '__proto__': string }", "ambiguous object key __proto__"],
    ["{ constructor: string }", "ambiguous object key constructor"],
    ["{ prototype: string }", "ambiguous object key prototype"],
    ["{ callback: () => void }", "callback: unsupported type syntax FunctionType"],
    ["{ a: string } & { b: number }", "unsupported type syntax IntersectionType"],
    ["Promise<string>", "unsupported type syntax TypeReference"],
    ["bigint", "unsupported type syntax BigIntKeyword"],
    ["any", "unsupported type syntax AnyKeyword"],
    ["string; globalThis.__previewSampleExecuted = true", "malformed type expression"],
    ["{ broken:", "malformed type expression"],
  ])("refuses %s as a required JSON fixture instead of producing a partial value", (type, reason) => {
    const result = derivePreviewPropSamples(withPayload(type));
    expect(Object.prototype.hasOwnProperty.call(result.values, "payload")).toBe(false);
    expect(result.unsupported.payload).toBe(reason);
    expect(Object.prototype.hasOwnProperty.call(globalThis, "__previewSampleExecuted")).toBe(false);
  });

  it("terminates direct and mutual recursive required objects", () => {
    const cases: Record<string, ContractTypeDef>[] = [
      { Loop: { kind: "alias", alias: "Loop" } },
      { Loop: { kind: "alias", alias: "{ child: Other }" }, Other: { kind: "alias", alias: "{ parent: Loop }" } },
    ];
    for (const types of cases) {
      const result = derivePreviewPropSamples(withPayload("Loop", types));
      expect(result.values).not.toHaveProperty("payload");
      expect(result.unsupported.payload).toContain("recursive alias Loop");
    }
  });

  it("does not construct optional or defaulted props across any prop group", () => {
    const contract = withPayload("string");
    contract.props!.styled!.members!.find(member => member.name === "payload")!.default = "authored";
    contract.props!.designed = { members: [{ name: "optional", propType: { kind: "ref", to: "Unknown" } }, { name: "required", required: true, propType: { kind: "union", of: [{ kind: "callback", params: [], returns: { kind: "void" } }, { kind: "literal", value: false }] } }] };
    contract.props!.constrained = { members: [{ name: "count", propType: { kind: "number" }, required: true }] };
    const result = derivePreviewPropSamples(contract);
    expect(result.values.required).toBe(false);
    expect(result.values.count).toBe(0);
    expect(result.values).not.toHaveProperty("optional");
    expect(result.values).not.toHaveProperty("payload");
    expect(result.unsupported).toEqual({});
  });

  it("bounds deeply nested alias and structured union inputs", () => {
    const aliases: Record<string, ContractTypeDef> = {};
    for (let i = 0; i < 100; i++) aliases[`Level${i}`] = { kind: "alias", alias: i === 99 ? "string" : `Level${i + 1}` };
    const nested = derivePreviewPropSamples(withPayload("Level0", aliases));
    expect(nested.values).not.toHaveProperty("payload");
    expect(nested.unsupported.payload).toContain("type nesting exceeds preview limit");
    let propType: AuthoredPropType = { kind: "string" };
    for (let i = 0; i < 100; i++) propType = { kind: "union", of: [propType] };
    const contract = withPayload("string");
    const member = contract.props!.styled!.members!.find(input => input.name === "payload")!;
    delete member.type;
    member.propType = propType;
    const structured = derivePreviewPropSamples(contract);
    expect(structured.values).not.toHaveProperty("payload");
    expect(structured.unsupported.payload).toBe("no JSON-constructible union member");
  });
});
