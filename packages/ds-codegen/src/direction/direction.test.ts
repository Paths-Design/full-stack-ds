import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isRtl } from "./direction.js";

const repoRoot = resolve(__dirname, "../../../..");

afterEach(() => {
  document.body.replaceChildren();
});

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.querySelector<HTMLElement>("#target")!;
}

describe("isRtl", () => {
  it("reads left-to-right when no ancestor declares a direction", () => {
    expect(isRtl(mount(`<div><button id="target"></button></div>`))).toBe(false);
  });

  it("reads the nearest dir attribute, so an inner ltr region overrides an rtl page", () => {
    expect(isRtl(mount(`<div dir="rtl"><span><button id="target"></button></span></div>`))).toBe(true);
    expect(isRtl(mount(`<div dir="rtl"><div dir="ltr"><button id="target"></button></div></div>`))).toBe(false);
  });

  it("crosses a shadow root to the direction its host sits in", () => {
    const host = mount(`<div dir="rtl"><span id="target"></span></div>`);
    const button = document.createElement("button");
    host.attachShadow({ mode: "open" }).append(button);
    expect(isRtl(button)).toBe(true);
  });

  it("reads left-to-right for a target with no DOM ancestry", () => {
    expect(isRtl(null)).toBe(false);
    expect(isRtl({} as EventTarget)).toBe(false);
  });
});

describe("direction runtime copies", () => {
  it("ship byte-identical in every package that reads the inline direction", () => {
    const source = readFileSync(resolve(repoRoot, "packages/ds-codegen/src/direction/direction.ts"), "utf8");
    for (const pkg of ["ds-react", "ds-vue", "ds-svelte", "ds-angular", "ds-lit", "ds-react-native"]) {
      const copy = readFileSync(resolve(repoRoot, `packages/${pkg}/src/primitives/direction/direction.ts`), "utf8");
      expect(copy, pkg).toBe(source);
    }
  });
});
