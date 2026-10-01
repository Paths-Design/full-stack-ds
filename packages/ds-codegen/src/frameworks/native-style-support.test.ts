import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildComponentIR } from "../ir.js";
import type { ComponentContract, StylePlatform } from "../contract.js";
import { generateReactNativeComponentSource } from "./react-native/component-source.js";
import { generateSwiftUIComponentSource } from "./swift/swiftui/component-source.js";

function fixture(value?: string, platforms: StylePlatform[] = ["web", "ios", "android"]) {
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../ds-contracts/components/Card");
  const read = (suffix: string) => JSON.parse(readFileSync(resolve(dir, `Card.${suffix}.json`), "utf8"));
  const contract: ComponentContract = { ...read("contract"), tokens: read("tokens"), styles: read("styles") };
  if (value) contract.styles!.root!.overflow = {
    literal: value, platforms,
    ...(platforms.includes("web") && { design: { property: "layout.overflow", slot: "card.design.root.layout.overflow" } }),
  };
  return contract;
}

describe("native root clipping support", () => {
  it.each(["visible", "hidden"])("preserves %s independently of radius and design metadata", (value) => {
    const contract = fixture(value);
    const ir = buildComponentIR(contract);
    const rn = generateReactNativeComponentSource(ir);
    expect(rn.stylesFile).toContain(`overflow: "${value}"`);
    const swift = generateSwiftUIComponentSource(ir);
    expect(swift.includes(".clipShape(")).toBe(value === "hidden");
    expect(swift).toContain(".background(background, in: RoundedRectangle(cornerRadius: radius");
    for (const block of Object.values(contract.styles!)) for (const entry of Object.values(block)) delete entry.design;
    expect(generateReactNativeComponentSource(buildComponentIR(contract))).toEqual(rn);
    expect(generateSwiftUIComponentSource(buildComponentIR(contract))).toBe(swift);
  });

  it("defaults to visible and keeps Web-only clipping off native", () => {
    const defaultIR = buildComponentIR(fixture());
    const webIR = buildComponentIR(fixture("hidden", ["web"]));
    expect(generateReactNativeComponentSource(webIR)).toEqual(generateReactNativeComponentSource(defaultIR));
    expect(generateSwiftUIComponentSource(webIR)).toBe(generateSwiftUIComponentSource(defaultIR));
    expect(generateSwiftUIComponentSource(defaultIR)).not.toContain(".clipShape(");
  });

  it("requires the normalized fact even when the contract declares no clipping", () => {
    const ir = buildComponentIR(fixture());
    delete (ir as Partial<typeof ir>).rootClipping;
    expect(() => generateReactNativeComponentSource(ir)).toThrow();
    expect(() => generateSwiftUIComponentSource(ir)).toThrow();
  });

  it("honors a single native platform without inferring it from Web CSS", () => {
    const ios = buildComponentIR(fixture("hidden", ["ios"]));
    const android = buildComponentIR(fixture("hidden", ["android"]));
    expect(generateReactNativeComponentSource(ios).stylesFile).toContain('Platform.select({ ios: "hidden", android: "visible", default: "visible" })');
    expect(generateReactNativeComponentSource(android).stylesFile).toContain('Platform.select({ ios: "visible", android: "hidden", default: "visible" })');
    expect(generateSwiftUIComponentSource(ios)).toContain(".clipShape(");
    expect(generateSwiftUIComponentSource(android)).not.toContain(".clipShape(");
  });

  it.each(["auto", "scroll", "clip", "hidden visible"])("rejects unsupported native root overflow %s", (value) => {
    const ir = buildComponentIR(fixture(value));
    expect(() => generateReactNativeComponentSource(ir)).toThrow(/NATIVE_ROOT_CLIPPING_UNSUPPORTED/);
    expect(() => generateSwiftUIComponentSource(ir)).toThrow(/NATIVE_ROOT_CLIPPING_UNSUPPORTED/);
    expect(() => generateReactNativeComponentSource(buildComponentIR(fixture(value, ["web"])))).not.toThrow();
  });

  it("does not pretend that a fallback realizes a runtime clipping token", () => {
    const contract = fixture();
    contract.styles!.root!.overflow = { resolvesTo: "card.overflow", fallback: "hidden" };
    expect(() => generateReactNativeComponentSource(buildComponentIR(contract))).toThrow(/NATIVE_ROOT_CLIPPING_UNSUPPORTED/);
  });

  it("rejects axis-specific native clipping without restricting Web declarations", () => {
    const contract = fixture("hidden");
    contract.styles!.root!["overflow-x"] = { literal: "visible", platforms: ["ios", "android"] };
    const ir = buildComponentIR(contract);
    expect(() => generateSwiftUIComponentSource(ir)).toThrow(/overflow-x/);
    expect(() => generateReactNativeComponentSource(ir)).toThrow(/overflow-x/);
  });

  it("preserves clipping without a radius token and makes radius rejection reach the composer", () => {
    const contract = fixture("hidden");
    const source = generateSwiftUIComponentSource(buildComponentIR(contract));
    expect(source).toContain('pxSlot("size.radius", requireRadius: true)');
    expect(source).toContain("fsdsRequireRadius(value, slot: suffix)");
    delete contract.tokens!["card.size.radius"];
    const square = generateSwiftUIComponentSource(buildComponentIR(contract));
    expect(square).toContain(".clipped()");
  });
});
