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
import { generateReactNativeComponentSource } from "./frameworks/react-native/component-source.js";
import { toFigmaComponentDescriptor } from "./frameworks/figma/factory.js";
import { createContractValidator } from "./validate.js";
import { buildSequence } from "./sequence.js";

function loadPagination(): ComponentContract {
  const read = (suffix: string) => JSON.parse(readFileSync(resolve(__dirname, `../../ds-contracts/components/Pagination/Pagination.${suffix}.json`), "utf8"));
  return { ...read("contract"), tokens: read("tokens"), styles: read("styles") };
}
function build(contract: ComponentContract, pagination = loadPagination()) {
  return buildComponentIR(contract, { allContracts: new Map([["Pagination", pagination], ["Icon", JSON.parse(readFileSync(resolve(__dirname, "../../ds-contracts/components/Icon/Icon.contract.json"), "utf8"))], [contract.name, contract]]) });
}
function load(): ComponentContract {
  const read = (suffix: string) => JSON.parse(readFileSync(resolve(__dirname, `../../ds-contracts/components/Carousel/Carousel.${suffix}.json`), "utf8"));
  return { ...read("contract"), tokens: read("tokens"), styles: read("styles") };
}
describe("contract-bound sequence composition", () => {
  it("rejects an existing animation owner in a composed progress target", () => {
    const contract = load();
    const pagination = loadPagination();
    const spinner = JSON.parse(readFileSync(resolve(__dirname, "../../ds-contracts/components/Spinner/Spinner.contract.json"), "utf8")) as ComponentContract;
    const loop = structuredClone(spinner.motion!.loops![0]);
    loop.target.part = "fill";
    pagination.motion = { loops: [loop] };
    pagination.tokens![loop.timing.duration.token] = JSON.parse(readFileSync(resolve(__dirname, "../../ds-contracts/components/Spinner/Spinner.tokens.json"), "utf8"))[loop.timing.duration.token];
    expect(buildComponentIR(pagination).motion.loops.map(loop => loop.target.name)).toEqual(["fill"]);
    expect(() => buildSequence(contract, build(load()).tokenFacts, new Map([[contract.name, contract], [pagination.name, pagination]])))
      .toThrow(/competing motion owner/);
  });
  it("does not confuse a host animation with the same part name inside its child", () => {
    const contract = load();
    const pagination = loadPagination();
    const spinner = JSON.parse(readFileSync(resolve(__dirname, "../../ds-contracts/components/Spinner/Spinner.contract.json"), "utf8")) as ComponentContract;
    const loop = structuredClone(spinner.motion!.loops![0]);
    loop.target.part = "fill";
    loop.timing.duration.token = "carousel.motion.duration";
    contract.motion!.loops = [loop];
    if (!contract.anatomy || Array.isArray(contract.anatomy)) throw new Error("Expected explicit anatomy");
    contract.anatomy.parts!.push("fill");
    contract.anatomy.dom!.children!.push({ tag: "span", part: "fill", attrs: { "aria-hidden": "true" } });
    const sequence = buildSequence(contract, build(load()).tokenFacts, new Map([[contract.name, contract], [pagination.name, pagination]]));
    expect(sequence!.progressHosts).toEqual(["picker", "next"]);
  });
  it("requires resolved composed parts before emitting sequence behavior", () => {
    const ir = buildComponentIR(load());
    expect(ir.motion.sequence?.composition).toBe("unresolved");
    expect(() => generateReactComponentSource(ir, "../../primitives")).toThrow(/resolved contract corpus/);
  });
  it("keeps native local projections off unnamed composed instances", () => {
    const source = generateReactNativeComponentSource(build(load())).componentFile;
    expect(source.match(/<MotionPartsProvider /g)).toHaveLength(1);
    expect(source).toContain('<MotionPartsProvider value={{ "fill":');
    expect(source).not.toContain('<MotionPartsProvider value={{ "ring":');
    expect(source).toContain('<MotionPart projection={{ effect: "elapsed-ring"');
  });
  it("rejects composed picker callback channels with incompatible value types", () => {
    const pagination = loadPagination();
    pagination.channels!.page.valueType = "boolean";
    expect(() => build(load(), pagination)).toThrow(/numeric sequence channel|COMPONENT_CALLBACK_INVALID/);
  });
  it("rejects a composed decoration with an authored competing transform", () => {
    const pagination = loadPagination();
    pagination.styles!.fill.transform = { literal: "scaleX(0.5)", platforms: ["web"] };
    expect(() => build(load(), pagination)).toThrow(/authored motion competes/);
  });
  it("rejects a picker whose callback does not forward the owning sequence", () => {
    const contract = load();
    const dom = !Array.isArray(contract.anatomy) && contract.anatomy?.dom;
    const walk = (node: import("./contract.js").ContractDomNode) => {
      if (node.componentRef === "fsds.Pagination") node.events = {};
      node.children?.forEach(walk);
    };
    if (dom) walk(dom);
    expect(() => build(contract)).toThrow(/share the numeric sequence channel and callback/);
  });
  it("derives a consumed dwell token and two projections of the same advance budget", () => {
    const sequence = build(load()).motion.sequence!;
    expect(sequence.timing).toEqual({ durationProp: "duration", autoPlayProp: "autoPlay", durationToken: "carousel.timing.advance", defaultMs: 6000 });
    expect(sequence.progress.map(p => [p.driver.source, p.effect])).toEqual([["sequence.advance", "elapsed-width"], ["sequence.advance", "elapsed-ring"]]);
    expect(sequence.transition).toMatchObject({ durationMs: 250, referenceWidth: 320, minMultiplier: 0.5, maxMultiplier: 2, easing: "cubic-bezier(0.4, 0, 0.2, 1)" });
    expect(sequence.realization).toEqual({ web: "sequence-budget", nonWeb: "unrealized" });
  });
  it("lowers renamed parts and channels through every web backend without Carousel lore", () => {
    const contract = load();
    contract.name = "FeatureSequence";
    for (const block of Object.values(contract.styles ?? {})) {
      for (const entry of Object.values(block)) {
        if (entry.design) entry.design.slot = entry.design.slot.replace(/^carousel\./, 'feature-sequence.');
      }
    }
    contract.channels!.position = contract.channels!.slide;
    delete contract.channels!.slide;
    contract.anatomy = JSON.parse(JSON.stringify(contract.anatomy).replaceAll("channel:slide.", "channel:position."));
    contract.sequence!.channel = "position";
    const ir = build(contract);
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
  it("binds native sequence controls through the declared channel and timing props", () => {
    const contract = load();
    contract.channels!.position = contract.channels!.slide;
    delete contract.channels!.slide;
    contract.sequence!.channel = "position";
    contract.anatomy = JSON.parse(JSON.stringify(contract.anatomy).replaceAll("channel:slide.", "channel:position."));
    const ir = build(contract);
    const source = generateReactNativeComponentSource(ir).componentFile;
    expect(source).toContain("onIndexChange: setPositionValue");
    expect(source).toContain("index: position, labels: slides");
    expect(source).toContain('tokens.root?.["carousel.timing.advance"]');
    expect(source).toContain("onIndexChange={sequence.select}");
    expect(source).toContain('durationMs: Number(tokens.root?.["carousel.motion.duration"] ?? 250)');
    expect(source).toContain("onPress={sequence.next}");
    expect(source).toContain("onPress={sequence.previous}");
    expect(source).toContain("onPress={sequence.rotate}");
    expect(source).toContain("<SequenceChildren sequence={sequence}");
    expect(source).not.toContain("setSlideValue");
  });
  it("retains sequence semantics in serialized Figma metadata without claiming execution", () => {
    const contract = load();
    contract.channels!.position = contract.channels!.slide;
    delete contract.channels!.slide;
    contract.anatomy = JSON.parse(JSON.stringify(contract.anatomy).replaceAll("channel:slide.", "channel:position."));
    contract.sequence!.channel = "position";
    const ir = build(contract);
    const descriptor = JSON.parse(JSON.stringify(toFigmaComponentDescriptor(ir)));
    expect(descriptor.motion).toMatchObject({
      realization: "descriptor-only",
      facts: {
        honorsReducedMotion: true,
        sequence: {
          channel: "position", itemsProp: "slides",
          timing: { durationProp: "duration", autoPlayProp: "autoPlay", defaultMs: 6000 },
          transition: { durationMs: 250, referenceWidth: 320, minMultiplier: 0.5, maxMultiplier: 2 },
          progress: [
            { driver: { source: "sequence.advance" }, effect: "elapsed-width" },
            { driver: { source: "sequence.advance" }, effect: "elapsed-ring" },
          ],
        },
      },
    });
    expect(descriptor.motion.facts).toEqual(ir.motion);
  });
  it.each([
    ["unknown presentation axis", (c: ComponentContract) => { c.motion!.progress![0].when = { axis: "missing", values: ["pagination"] }; }],
    ["unknown presentation value", (c: ComponentContract) => { c.motion!.progress![0].when = { axis: "indicator", values: ["unknown"] }; }],
    ["empty presentation choice", (c: ComponentContract) => { c.motion!.progress![0].when = { axis: "indicator", values: [] }; }],
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
    ["authored competing transform", (c: ComponentContract) => { c.styles!.ring.transform = { literal: "scaleX(0.5)", platforms: ["web"] }; }],
  ] as const)("rejects %s", (_name, mutate) => {
    const contract = load(); mutate(contract);
    expect(() => build(contract)).toThrow(/SEQUENCE_INVALID/);
  });
  it("schema rejects independent timing on a visual projection", () => {
    const contract = load();
    Object.assign(contract.motion!.progress![0], { duration: 9000 });
    const validator = createContractValidator({ contractsRoot: resolve(__dirname, "../../ds-contracts") });
    expect(validator.validateComponent(contract).ok).toBe(false);
  });
});
