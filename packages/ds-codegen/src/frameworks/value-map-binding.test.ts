import { describe, expect, it } from "vitest";
import type { ComponentContract } from "../contract.js";
import { buildComponentIR } from "../ir.js";
import { generateAngularComponentSource } from "./angular/component-source.js";
import { generateLitComponentSource } from "./lit/component-source.js";
import { generateReactNativeComponentSource } from "./react-native/component-source.js";
import { generateReactComponentSource } from "./react/component-source.js";
import { generateSvelteComponentSource } from "./svelte/component-source.js";
import { generateVueComponentSource } from "./vue/component-source.js";

function fixture(): ReturnType<typeof buildComponentIR> {
  const icon = {
    name: "Icon",
    layer: "primitive",
    anatomy: { parts: ["root"] },
    props: {
      designed: {
        members: [
          { name: "name", propType: { kind: "string" }, required: true },
          { name: "size", propType: { kind: "string" } },
          { name: "decorative", propType: { kind: "boolean" }, default: true },
        ],
      },
    },
  } as unknown as ComponentContract;
  const status = {
    name: "Status",
    layer: "primitive",
    category: "feedback",
    types: {
      StatusIntent: {
        kind: "union",
        values: ["info", "success", "warning", "danger", "error"],
      },
    },
    anatomy: {
      parts: ["root", "icon", "label"],
      dom: {
        tag: "span",
        part: "root",
        children: [
          {
            componentRef: "fsds.Icon",
            part: "icon",
            attrs: { size: "sm" },
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
          { tag: "span", part: "label", children: [{ tag: "children" }] },
        ],
      },
    },
    props: {
      designed: {
        members: [
          {
            name: "status",
            propType: { kind: "ref", to: "StatusIntent" },
            required: true,
          },
        ],
      },
    },
  } as unknown as ComponentContract;
  return buildComponentIR(status, {
    allContracts: new Map([
      [status.name, status],
      [icon.name, icon],
    ]),
  });
}

describe("value-map component composition", () => {
  it("lowers Status-to-Icon composition through every admitted emitter", () => {
    const ir = fixture();
    const sources = [
      generateReactComponentSource(ir, "../../primitives"),
      generateVueComponentSource(ir),
      generateSvelteComponentSource(ir),
      generateAngularComponentSource(ir),
      generateLitComponentSource(ir),
      generateReactNativeComponentSource(ir).componentFile,
    ];

    for (const source of sources) {
      expect(source).toMatch(/Icon|fsds-icon/);
      expect(source).toContain("triangle-alert");
      expect(source).toContain("check");
      expect(source).toContain("info");
      expect(source).toContain("status");
    }
  });
});
