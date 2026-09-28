import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "./contract.js";
import { buildComponentIR } from "./ir.js";
import { generateReactComponentSource } from "./frameworks/react/component-source.js";
import { generateVueComponentSource } from "./frameworks/vue/component-source.js";
import { generateSvelteComponentSource } from "./frameworks/svelte/component-source.js";
import { generateAngularComponentSource } from "./frameworks/angular/component-source.js";
import { generateLitComponentSource } from "./frameworks/lit/component-source.js";
import { createContractValidator } from "./validate.js";

function load(): ComponentContract {
  const read = (suffix: string) => JSON.parse(readFileSync(resolve(__dirname, `../../ds-contracts/components/Carousel/Carousel.${suffix}.json`), "utf8"));
  return { ...read("contract"), tokens: read("tokens"), styles: read("styles") };
}
describe("contract-bound sequence composition", () => {
  it("derives a consumed dwell token and two projections of the same advance budget", () => {
    const sequence = buildComponentIR(load()).motion.sequence!;
    expect(sequence.timing).toEqual({ durationProp: "duration", autoPlayProp: "autoPlay", durationToken: "carousel.timing.advance", defaultMs: 6000 });
    expect(sequence.progress.map(p => [p.driver.source, p.effect])).toEqual([["sequence.advance", "elapsed-width"], ["sequence.advance", "elapsed-ring"]]);
    expect(sequence.transition).toMatchObject({ durationMs: 250, referenceWidth: 320, minMultiplier: 0.5, maxMultiplier: 2, easing: "cubic-bezier(0.4, 0, 0.2, 1)" });
    expect(sequence.realization).toEqual({ web: "sequence-budget", nonWeb: "unrealized" });
  });
  it("lowers renamed parts and channels through every web backend without Carousel lore", () => {
    const contract = load();
    contract.name = "FeatureSequence";
    contract.channels!.position = contract.channels!.slide;
    delete contract.channels!.slide;
    contract.sequence!.channel = "position";
    const ir = buildComponentIR(contract);
    const outputs = [
      JSON.stringify(generateReactComponentSource(ir, "../../primitives")), JSON.stringify(generateVueComponentSource(ir)),
      JSON.stringify(generateSvelteComponentSource(ir)), JSON.stringify(generateAngularComponentSource(ir)), JSON.stringify(generateLitComponentSource(ir)),
    ];
    for (const source of outputs) {
      expect(source).toContain("sequence");
      expect(source).toContain("setPosition");
      expect(source).toContain("elapsed-ring");
      expect(source).not.toContain("setSlide");
    }
  });
  it.each([
    ["missing movement token", (c: ComponentContract) => { c.motion!.sequenceTransition!.durationToken = "missing"; }],
    ["invalid size profile", (c: ComponentContract) => { c.motion!.sequenceTransition!.size.minMultiplier = 3; }],
    ["wrong transition owner", (c: ComponentContract) => { c.motion!.sequenceTransition!.target.part = "root"; }],
    ["no sequence", (c: ComponentContract) => { delete c.sequence; }],
    ["wrong channel", (c: ComponentContract) => { c.sequence!.channel = "missing"; }],
    ["missing duration prop", (c: ComponentContract) => { c.sequence!.timing.durationProp = "missing"; }],
    ["missing dwell token", (c: ComponentContract) => { c.sequence!.timing.durationToken = "missing"; }],
    ["aliased controls", (c: ComponentContract) => { c.sequence!.previous = c.sequence!.next; }],
    ["unknown progress target", (c: ComponentContract) => { c.motion!.progress![0].target.part = "missing"; }],
    ["duplicate progress owner", (c: ComponentContract) => { c.motion!.progress!.push(c.motion!.progress![0]); }],
    ["ignore preference", (c: ComponentContract) => { c.motion!.reducedMotion = "ignore"; }],
    ["invalid steps", (c: ComponentContract) => { c.motion!.progress![0].reducedMotion.steps = 0; }],
    ["authored competing transform", (c: ComponentContract) => { c.styles!.fill.transform = { literal: "scaleX(0.5)", platforms: ["web"] }; }],
  ] as const)("rejects %s", (_name, mutate) => {
    const contract = load(); mutate(contract);
    expect(() => buildComponentIR(contract)).toThrow(/SEQUENCE_INVALID/);
  });
  it("schema rejects independent timing on a visual projection", () => {
    const contract = load();
    Object.assign(contract.motion!.progress![0], { duration: 9000 });
    const validator = createContractValidator({ contractsRoot: resolve(__dirname, "../../ds-contracts") });
    expect(validator.validateComponent(contract).ok).toBe(false);
  });
});
