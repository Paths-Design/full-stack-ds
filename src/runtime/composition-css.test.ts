import { describe, expect, it } from "vitest";
import type { ComponentBundle } from "../types/data";
import { compositionCss } from "./composition-css";

function component(name: string, refs: string[] = []): ComponentBundle {
  return {
    name,
    contract: { name, anatomy: { parts: ["root"], dom: {
      tag: "div", children: refs.map(name => ({ componentRef: `fsds.${name}` })),
    } } },
    sources: { vue: { css: { filename: `${name}.css`, code: `.${name} { display: flex; }` }, siblings: [] } },
  } as ComponentBundle;
}

describe("preview composition stylesheet closure", () => {
  it("retains recursively composed styles once when components repeat or refer back", () => {
    const corpus = [component("Flow", ["Choices", "Choices"]), component("Choices", ["Marker"]), component("Marker", ["Flow"])];
    expect(compositionCss(corpus, "Flow", "vue")).toBe(
      ".Marker { display: flex; }\n.Choices { display: flex; }\n.Flow { display: flex; }",
    );
  });
  it("refuses a missing composition dependency rather than silently rendering it unstyled", () => {
    expect(() => compositionCss([component("Flow", ["Missing"])], "Flow", "vue")).toThrow(/requires component Missing/);
  });
});
