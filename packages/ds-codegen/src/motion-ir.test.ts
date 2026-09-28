import { generateReactComponentSource } from "./frameworks/react/component-source.js";
import { generateVueComponentSource } from "./frameworks/vue/component-source.js";
import { generateSvelteComponentSource } from "./frameworks/svelte/component-source.js";
import { generateAngularComponentSource } from "./frameworks/angular/component-source.js";
import { generateLitComponentSource } from "./frameworks/lit/component-source.js";
import { generateReactNativeComponentSource } from "./frameworks/react-native/component-source.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ComponentContract } from "./contract.js";
import { emitCss, emitLitInlineCss, webTokenConsumption } from "./css.js";
import { buildComponentIR } from "./ir.js";

import { createContractValidator } from "./validate.js";

function loadContract(name: string): ComponentContract {
  return JSON.parse(readFileSync(
    resolve(__dirname, "../../ds-contracts/components", name, `${name}.contract.json`),
    "utf8",
  )) as ComponentContract;
}

describe("motion declaration custody", () => {
  it("carries a real legacy trigger without interpreting its mismatched state vocabulary", () => {
    const ir = buildComponentIR(loadContract("Accordion"));
    expect(ir.motion.transitions[0]).toEqual({
      name: "expand",
      trigger: "openness=collapsed→expanded",
      realization: "declaration-only",
      phase: "enter",
      properties: ["height", "opacity"],
      durationRef: "accordion.motion.duration",
      easingRef: "accordion.motion.easing",
    });
    expect(ir.motion.transitions[1].trigger).toBe("openness=expanded→collapsed");
  });

  it.each([undefined, "", "  custom event → next  ", "open=false→true"])(
    "preserves absent or arbitrary trigger %j without granting execution",
    (trigger) => {
      const contract = loadContract("Accordion");
      contract.name = "UnfamiliarDisclosure";
      contract.motion = {
        transitions: [{ name: "respond", ...(trigger === undefined ? {} : { trigger }) }],
      };
      expect(buildComponentIR(contract).motion.transitions).toEqual([{
        name: "respond",
        trigger: trigger ?? null,
        realization: "declaration-only",
        phase: null,
        properties: [],
        durationRef: null,
        easingRef: null,
      }]);
    },
  );

  it("keeps undeclared motion empty and preserves default reduced-motion handling", () => {
    const contract = loadContract("Accordion");
    delete contract.motion;
    expect(buildComponentIR(contract).motion).toEqual({
      countdown: null,
      loops: [],
      reducedMotion: null,
      honorsReducedMotion: true,
      transitions: [],
    });
  });

  it("does not turn a carried trigger into emitted animation behavior", () => {
    const contract = loadContract("Skeleton");
    contract.tokens = JSON.parse(readFileSync(
      resolve(__dirname, "../../ds-contracts/components/Skeleton/Skeleton.tokens.json"), "utf8",
    ));
    const before = emitCss(buildComponentIR(contract));
    expect(before).toContain("@keyframes");
    contract.motion = {
      ...contract.motion,
      transitions: [{
        name: "new-entry",
        trigger: "mounted",
        phase: "enter",
        properties: ["opacity"],
        duration: "unresolved.duration",
      }],
    };
    const ir = buildComponentIR(contract);
    expect(ir.motion.transitions[0].trigger).toBe("mounted");
    expect(ir.motion.transitions[0].realization).toBe("declaration-only");
    expect(emitCss(ir)).toBe(before);
  });
});

const contractsRoot = resolve(__dirname, "../../ds-contracts");
function load(name = "Spinner"): ComponentContract {
  const dir = resolve(contractsRoot, "components", name);
  const read = (suffix: string) => JSON.parse(readFileSync(resolve(dir, `${name}.${suffix}.json`), "utf8"));
  return { ...read("contract"), tokens: read("tokens"), styles: read("styles") };
}

describe("part-bound repeating motion", () => {
  it("binds rotation to the Spinner visual, with token timing and a static reduced state", () => {
    const ir = buildComponentIR(load());
    const loop = ir.motion.loops[0];
    expect(loop.target.name).toBe("visual");
    expect(loop.effect).toEqual({
      kind: "rotation", keyframes: [{ offset: 0, value: 0 }, { offset: 1, value: 360 }],
    });
    expect(loop.timing.duration.name).toBe("spinner.anim.duration");
    expect(loop.reducedMotion.value).toBe(0);
    expect(loop.realization).toEqual({ web: "css-keyframes", nonWeb: "unrealized" });
    const css = emitCss(ir);
    expect(css).toContain("fsds-spinner-spin calc(var(--fsds-spinner-anim-duration, 800ms) * 1)");
    expect(css).toContain("rotate(360deg)");
    expect(css).toContain(".spinner__visual { animation: none; transform: rotate(0deg); }");
    expect(emitLitInlineCss(ir)).toContain("@keyframes fsds-spinner-spin");
    expect(emitLitInlineCss(ir)).toContain(".spinner__visual { animation: none; transform: rotate(0deg); }");
    expect(webTokenConsumption(ir).consumed.has("--fsds-spinner-anim-duration")).toBe(true);
  });

  it("selects exclusive Skeleton opacity loops and leaves the wipe on its legacy path", () => {
    const ir = buildComponentIR(load("Skeleton"));
    expect(ir.motion.loops.map((loop) => [loop.target.name, loop.when?.equals, loop.timing.multiplier]))
      .toEqual([["root", "shimmer", 2], ["root", "pulse", 3]]);
    const css = emitCss(ir);
    expect(css).toContain("fsds-skeleton-shimmer");
    expect(css).toContain("fsds-skeleton-pulse");
    expect(css).toContain("@keyframes skeleton-wipe");
    expect(css).not.toContain("@keyframes skeleton-shimmer");
    expect(css).toContain(".skeleton--pulse { animation: none; opacity: 1; }");
  });

  it("uses declared parts and class-recipe variant prefixes for an unfamiliar component", () => {
    const c = JSON.parse(JSON.stringify(load("Skeleton")).replaceAll("skeleton", "unfamiliar")) as ComponentContract;
    c.name = "Unfamiliar";
    c.variants!.density = ["shimmer", "regular"];
    const ir = buildComponentIR(c);
    const css = emitCss(ir);
    expect(css).toContain("@keyframes fsds-unfamiliar-shimmer");
    expect(css).toContain(".unfamiliar--animate-shimmer { animation: none; opacity: 1; }");
  });

  const bad: Array<[string, (c: ComponentContract) => void, string]> = [
    ["unknown part", c => { c.motion!.loops![0].target.part = "missing"; }, "rendered, owned"],
    ["unrendered part", c => { if (!c.anatomy || Array.isArray(c.anatomy)) throw new Error("fixture anatomy"); c.anatomy.parts.push("ghost"); c.motion!.loops![0].target.part = "ghost"; }, "rendered, owned"],
    ["unknown variant", c => { c.motion!.loops![0].when = { variant: "size", equals: "giant" }; }, "unknown variant"],
    ["unknown token", c => { c.motion!.loops![0].timing.duration.token = "missing"; }, "unresolved timing token"],
    ["wrong duration type", c => { c.tokens!["spinner.anim.duration"] = { literal: "red" }; }, "duration"],
    ["overflow duration", c => { c.tokens!["spinner.anim.duration"] = { literal: "9".repeat(400) + "ms" }; }, "duration"],
    ["empty curve component", c => { c.tokens!["spinner.anim.easing"] = { literal: "cubic-bezier(0,,1,1)" }; c.motion!.loops![0].timing.easing = { token: "spinner.anim.easing" }; }, "easing"],
    ["zero duration", c => { c.tokens!["spinner.anim.duration"] = { literal: "0ms" }; }, "duration"],
    ["bad offsets", c => { c.motion!.loops![0].effect.keyframes[1].offset = 0; }, "offsets"],
    ["opacity outside range", c => { c.motion!.loops![0].effect.kind = "opacity"; }, "effect/static"],
    ["bad static value", c => { c.motion!.loops![0].reducedMotion.value = NaN; }, "effect/static"],
    ["bad curve", c => { c.motion!.loops![0].timing.easing = { cubicBezier: [2, 0, 1, 1] }; }, "cubicBezier"],
    ["infinite multiplier", c => { c.motion!.loops![0].timing.duration.multiplier = Infinity; }, "multiplier"],
    ["duplicate name", c => { c.motion!.loops!.push(structuredClone(c.motion!.loops![0])); }, "duplicate"],
    ["overlapping owners", c => { c.motion!.loops!.push({ ...structuredClone(c.motion!.loops![0]), name: "another" }); }, "overlapping"],
    ["unsupported global policy", c => { c.motion!.reducedMotion = "ignore"; }, "require respect"],
  ];
  it.each(bad)("rejects %s", (_name, mutate, cause) => {
    const c = load();
    mutate(c);
    expect(() => buildComponentIR(c)).toThrow(cause);
  });

  it("rejects a second authored animation writer on the bound target", () => {
    const c = load();
    c.styles!.visual.animation = { literal: "other 1s infinite", platforms: ["web"] };
    expect(() => emitCss(buildComponentIR(c))).toThrow("[MOTION_LOOP_OWNER]");
  });

  it("schema rejects unknown driver/effect fields instead of accepting a no-op program", () => {
    const validator = createContractValidator({ contractsRoot });
    const raw = JSON.parse(readFileSync(resolve(contractsRoot, "components/Spinner/Spinner.contract.json"), "utf8"));
    expect(validator.validateComponent(raw).ok).toBe(true);
    raw.motion.loops[0].driver.kind = "gesture";
    expect(validator.validateComponent(raw).ok).toBe(false);
    raw.motion.loops[0].driver.kind = "repeat";
    raw.motion.loops[0].effect.kind = "pathMorph";
    expect(validator.validateComponent(raw).ok).toBe(false);
  });
});


describe("surface-budget countdown binding", () => {
  it("binds an unfamiliar component and part to the existing budget with no new duration", () => {
    const contract = load("Toast");
    contract.name = "UnfamiliarNotice";
    for (const block of Object.values(contract.styles ?? {})) for (const entry of Object.values(block)) {
      if (entry.design) entry.design.slot = entry.design.slot.replace("toast.design.", "unfamiliar-notice.design.");
    }
    const ir = buildComponentIR(contract);
    expect(ir.motion.countdown?.target.name).toBe("progress");
    expect(ir.motion.countdown?.driver).toEqual({ kind: "budget", source: "surface.autoDismiss" });
    expect(ir.motion.countdown?.reducedMotion).toEqual({ kind: "steps", steps: 10 });
    expect(ir.motion.countdown?.realization).toEqual({ web: "presence-budget", nonWeb: "unrealized" });
    expect(ir.motion.countdown).not.toHaveProperty("timing");
    for (const source of [generateReactComponentSource(ir, "../../primitives"),
      generateVueComponentSource(ir), generateSvelteComponentSource(ir),
      generateAngularComponentSource(ir), generateLitComponentSource(ir)]) {
      expect(source).toContain("autoDismiss.bindProgress");
      expect(source).toContain("reducedMotionSteps: 10");
    }
    expect(generateReactNativeComponentSource(ir)).not.toContain("style={styles.progress}");
  });

  it.each([
    (c: ComponentContract) => { delete c.surface!.timing; },
    (c: ComponentContract) => { c.surface!.dismissal = ["close-button"]; },
    (c: ComponentContract) => { c.motion!.countdown!.target.part = "missing"; },
    (c: ComponentContract) => { c.motion!.countdown!.target.part = "item"; },
    (c: ComponentContract) => { c.motion!.countdown!.reducedMotion.steps = 0; },
    (c: ComponentContract) => { c.motion!.countdown!.reducedMotion.steps = 3.5; },
    (c: ComponentContract) => { c.motion!.reducedMotion = "ignore"; },
    (c: ComponentContract) => { c.styles!.progress.transform = { literal: "rotate(90deg)", platforms: ["web"] }; },
    (c: ComponentContract) => { c.motion!.loops = [{ ...load().motion!.loops![0], target: { part: "progress" } }]; },
  ])("rejects unresolved, unsafe or competing countdown declarations (%#)", (mutate) => {
    const contract = load("Toast");
    mutate(contract);
    expect(() => buildComponentIR(contract)).toThrow("MOTION_COUNTDOWN_INVALID");
  });

  it("does not accept an independent duration through the schema", () => {
    const contract = loadContract("Toast");
    Object.assign(contract.motion!.countdown!, { duration: 1000 });
    expect(createContractValidator({ contractsRoot }).validateComponent(contract).ok).toBe(false);
  });
});
