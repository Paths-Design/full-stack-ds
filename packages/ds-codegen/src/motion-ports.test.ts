import { describe, expect, it } from "vitest";
import type { ComponentContract } from "./contract.js";
import { buildMotionPorts } from "./motion-ports.js";

const contract = {
  name: "PositionChoices",
  anatomy: { dom: { tag: "div", part: "root", children: [
    { tag: "button", part: "choice", iterate: { kind: "array", source: "prop:items" }, children: [
      { tag: "span", part: "paint", attrs: { "aria-hidden": "true" } },
      { tag: "span", part: "label", attrs: { "aria-hidden": "true" }, content: "iter:item" },
    ] },
    { tag: "span", part: "plain" },
    { tag: "span", part: "ring", attrs: { "aria-hidden": "true" } },
    { componentRef: "fsds.Child", part: "child", children: [{ tag: "span", part: "foreign", attrs: { "aria-hidden": "true" } }] },
  ] } },
} as ComponentContract;

describe("motion part boundaries", () => {
  it("exports only owned empty decorations and preserves repeated ownership", () => {
    expect(buildMotionPorts(contract)).toEqual([{ part: "paint", repeated: true }, { part: "ring", repeated: false }]);
  });
  it("does not offer a part already owned by a local animation", () => {
    const local = structuredClone(contract);
    local.motion = { loops: [{ target: { part: "paint" } }], countdown: { target: { part: "ring" } } } as ComponentContract["motion"];
    expect(buildMotionPorts(local)).toEqual([]);
  });
});
