import type { ComponentContract, ContractDomNode, ContractMotionLoop } from "./contract.js";
import type { PartIR, TokenFactIR } from "./ir.js";

export interface MotionLoopIR {
  name: string;
  target: PartIR;
  driver: "repeat";
  when?: { variant: string; equals: string };
  effect: ContractMotionLoop["effect"];
  timing: {
    duration: TokenFactIR;
    multiplier: number;
    easing: { token: TokenFactIR } | { cubicBezier: [number, number, number, number] };
  };
  reducedMotion: { value: number };
  /** Capability statement, not a promise that every registered target executes it. */
  realization: { web: "css-keyframes"; nonWeb: "unrealized" };
}

/** Contract facts only. No component names, selectors, or animation-library objects. */
export function buildMotionLoops(
  contract: ComponentContract, parts: PartIR[], tokens: TokenFactIR[],
): MotionLoopIR[] {
  const loops = contract.motion?.loops ?? [];
  if (!loops.length) return [];
  const fail = (message: string): never => {
    throw new Error(`[MOTION_LOOP_INVALID] ${contract.name}: ${message}`);
  };
  if (contract.motion?.reducedMotion && contract.motion.reducedMotion !== "respect") {
    fail("loops require respect or omitted global reducedMotion; each loop supplies a static value");
  }
  const anatomy = contract.anatomy;
  if (!anatomy || Array.isArray(anatomy) || !anatomy.dom) {
    return fail("loops require explicit anatomy.dom targets");
  }
  const rendered = new Set<string>();
  const walk = (node: ContractDomNode) => {
    if (node.componentRef) return;
    if (node.part) rendered.add(node.part);
    for (const child of node.children ?? []) walk(child);
  };
  walk(anatomy.dom);
  const names = new Set<string>();
  const token = (name: string): TokenFactIR => {
    const fact = tokens.find((entry) => entry.name === name);
    if (!fact?.rawValue) return fail(`unresolved timing token "${name}"`);
    return fact;
  };
  const bezier = (values: number[]) => values.length === 4 && values.every(Number.isFinite) &&
    values[0] >= 0 && values[0] <= 1 && values[2] >= 0 && values[2] <= 1;
  return loops.map((loop, index) => {
    if (!/^[a-z][a-z0-9-]*$/.test(loop.name) || names.has(loop.name)) {
      fail(`invalid or duplicate loop name "${loop.name}"`);
    }
    names.add(loop.name);
    if (loop.driver.kind !== "repeat") fail("unsupported driver");
    const target = parts.find((part) => part.name === loop.target.part);
    if (!target || !rendered.has(target.name) || target.isCompound) {
      return fail(`target "${loop.target.part}" must be a rendered, owned anatomy part`);
    }
    if (loop.when && !contract.variants?.[loop.when.variant]?.includes(loop.when.equals)) {
      fail(`unknown variant selection "${loop.when.variant}=${loop.when.equals}"`);
    }
    if (!["opacity", "rotation"].includes(loop.effect.kind)) fail("unsupported effect");
    const validValue = (value: number) => Number.isFinite(value) &&
      (loop.effect.kind !== "opacity" || (value >= 0 && value <= 1));
    const frames = loop.effect.keyframes;
    if (frames.length < 2 || frames[0].offset !== 0 || frames[frames.length - 1]?.offset !== 1 ||
        frames.some((frame, i) => !Number.isFinite(frame.offset) ||
          frame.offset < 0 || frame.offset > 1 || (i > 0 && frame.offset <= frames[i - 1].offset) ||
          !validValue(frame.value)) || !validValue(loop.reducedMotion.value)) {
      fail("keyframes require strictly increasing offsets from 0 to 1 and valid effect/static values");
    }
    const duration = token(loop.timing.duration.token);
    const durationMatch = duration.rawValue!.match(/^(\d+(?:\.\d+)?)(ms|s)$/);
    const multiplier = loop.timing.duration.multiplier ?? 1;
    if (!durationMatch || !Number.isFinite(Number(durationMatch[1])) || Number(durationMatch[1]) <= 0 ||
        !Number.isFinite(multiplier) || multiplier <= 0) fail("duration and multiplier must be positive");
    let easing: MotionLoopIR["timing"]["easing"];
    if ("token" in loop.timing.easing) {
      const fact = token(loop.timing.easing.token);
      const match = fact.rawValue!.match(/^cubic-bezier\(([^)]+)\)$/);
      if (!match || match[1].split(",").some((v) => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(v.trim())) ||
          !bezier(match[1].split(",").map(Number))) fail("easing token must resolve to cubic-bezier");
      easing = { token: fact };
    } else {
      if (!bezier(loop.timing.easing.cubicBezier)) fail("invalid cubicBezier");
      easing = { cubicBezier: [...loop.timing.easing.cubicBezier] };
    }
    for (const previous of loops.slice(0, index)) {
      // Only disjoint values on the SAME variant axis establish exclusivity.
      const exclusive = previous.when && loop.when &&
        previous.when.variant === loop.when.variant && previous.when.equals !== loop.when.equals;
      if (previous.target.part === target.name && !exclusive) {
        fail(`overlapping animation owners "${previous.name}" and "${loop.name}" on "${target.name}"`);
      }
    }
    return {
      name: loop.name, target, driver: "repeat",
      ...(loop.when ? { when: { ...loop.when } } : {}),
      effect: { kind: loop.effect.kind, keyframes: frames.map((frame) => ({ ...frame })) },
      timing: { duration, multiplier, easing },
      reducedMotion: { ...loop.reducedMotion },
      realization: { web: "css-keyframes", nonWeb: "unrealized" },
    };
  });
}
