import type { TokenFactIR } from "./ir.js";
import type { ComponentContract, ContractDomNode, ContractMotionProgress, ContractSequence } from "./contract.js";

export interface SequenceIR extends ContractSequence {
  timing: ContractSequence["timing"] & { defaultMs: number };
  progress: ContractMotionProgress[];
  transition?: { durationToken: string; easingToken: string; durationMs: number; easing: string; referenceWidth: number; minMultiplier: number; maxMultiplier: number };
  realization: { web: "sequence-budget"; nonWeb: "unrealized" };
}

/** Normalize owned sequence parts once; backends only lower these facts. */
export function buildSequence(contract: ComponentContract, tokens: TokenFactIR[]): SequenceIR | null {
  const sequence = contract.sequence;
  const progress = contract.motion?.progress ?? [];
  const fail = (message: string): never => { throw new Error(`[SEQUENCE_INVALID] ${contract.name}: ${message}`); };
  if (!sequence) {
    if (progress.length || contract.motion?.sequenceTransition) fail("progress requires a sequence budget");
    return null;
  }
  if (contract.surface || contract.interaction) fail("sequence cannot share root ownership with a surface or interaction controller");
  if (contract.channels?.[sequence.channel]?.valueType !== "number") fail("requires a numeric index channel");
  const props = contract.props?.styled?.members ?? [];
  for (const name of [sequence.itemsProp, sequence.timing.durationProp, sequence.timing.autoPlayProp]) {
    if (!props.some(p => p.name === name)) fail(`unknown prop ${name}`);
  }
  const duration = tokens.find(t => t.name === sequence.timing.durationToken)?.rawValue;
  const match = duration?.match(/^(\d+(?:\.\d+)?)(ms|s)$/);
  if (!match || !Number.isFinite(Number(match[1])) || Number(match[1]) <= 0) return fail("unresolved or invalid dwell token");
  const defaultMs = Number(match[1]) * (match[2] === "s" ? 1000 : 1);
  const dom = !Array.isArray(contract.anatomy) ? contract.anatomy?.dom : undefined;
  if (!dom) return fail("requires owned DOM anatomy");
  const nodes: ContractDomNode[] = [];
  const walk = (node: ContractDomNode) => { if (node.componentRef) return; nodes.push(node); node.children?.forEach(walk); };
  walk(dom);
  const owned = (part: string) => {
    const matches = nodes.filter(n => n.part === part);
    if (matches.length !== 1 || matches[0] === dom) return fail(`part ${part} must be one owned non-root node`);
    return matches[0];
  };
  const names = [sequence.viewport, sequence.previous, sequence.next, sequence.rotation, sequence.picker];
  if (new Set(names).size !== names.length) fail("control and viewport parts must be distinct");
  for (const part of names.slice(1)) if (owned(part).tag !== "button") fail(`${part} must be a native button`);
  if (!owned(sequence.viewport).children?.some(n => n.tag === "children")) fail("viewport must project consumer children");
  const picker = owned(sequence.picker);
  if (picker.iterate?.source !== `prop:${sequence.itemsProp}` || picker.iterate.kind !== "array") fail("picker must iterate sequence items");
  const targets = new Set<string>();
  for (const binding of progress) {
    const node = owned(binding.target.part);
    if (targets.has(binding.target.part) || names.includes(binding.target.part)) fail("progress targets must be distinct decorations");
    targets.add(binding.target.part);
    if (node.attrs?.["aria-hidden"] !== "true" || node.content || node.children?.length) fail("progress must be empty and decorative");
    if (binding.driver.kind !== "budget" || binding.driver.source !== "sequence.advance" ||
        !["elapsed-width", "elapsed-ring"].includes(binding.effect) || binding.reducedMotion.kind !== "steps" ||
        !Number.isInteger(binding.reducedMotion.steps) || binding.reducedMotion.steps < 2 || binding.reducedMotion.steps > 20 ||
        contract.motion?.reducedMotion === "ignore") fail("unsupported progress policy");
    if (contract.motion?.loops?.some(l => l.target.part === binding.target.part) || contract.motion?.countdown?.target.part === binding.target.part) fail("competing motion owner");
    if (Object.keys(contract.styles?.[binding.target.part] ?? {}).some(p => /^(transform|scale|animation|transition)(-|$)/.test(p) && p !== "transform-origin")) fail("authored motion competes for progress");
  }
  const transition = contract.motion?.sequenceTransition;
  let normalizedTransition: SequenceIR["transition"];
  if (transition) {
    if (transition.target.part !== sequence.viewport || transition.target.scope !== "children" ||
        transition.driver.kind !== "channel" || transition.driver.source !== "sequence.index" ||
        transition.effect !== "slide-inline" || transition.reducedMotion !== "instant" ||
        contract.motion?.reducedMotion === "ignore") fail("unsupported sequence transition binding");
    const value = tokens.find(t => t.name === transition.durationToken)?.rawValue?.match(/^(\d+(?:\.\d+)?)(ms|s)$/);
    const easing = tokens.find(t => t.name === transition.easingToken)?.rawValue;
    const bezier = easing?.match(/^cubic-bezier\(([^)]+)\)$/)?.[1].split(",").map(Number);
    const size = transition.size;
    if (!value || !Number.isFinite(Number(value[1])) || Number(value[1]) <= 0 ||
        !bezier || bezier.length !== 4 || !bezier.every(Number.isFinite) || bezier[0] < 0 || bezier[0] > 1 || bezier[2] < 0 || bezier[2] > 1 ||
        !Object.values(size).every(v => Number.isFinite(v) && v > 0) || size.minMultiplier > size.maxMultiplier) return fail("invalid transition timing or size profile");
    normalizedTransition = { ...size, durationToken: transition.durationToken, easingToken: transition.easingToken,
      durationMs: Number(value[1]) * (value[2] === "s" ? 1000 : 1), easing: easing! };
  }
  return { ...sequence, timing: { ...sequence.timing, defaultMs }, progress, ...(normalizedTransition ? { transition: normalizedTransition } : {}), realization: { web: "sequence-budget", nonWeb: "unrealized" } };
}

/** CSS-part addressing is derived here rather than reconstructed by each emitter. */
export function sequenceConfig(sequence: SequenceIR, prefix: string): string {
  return JSON.stringify({
    labels: sequence.labels,
    transition: sequence.transition && {
      durationMs: sequence.transition.durationMs, easing: sequence.transition.easing,
      referenceWidth: sequence.transition.referenceWidth,
      minMultiplier: sequence.transition.minMultiplier, maxMultiplier: sequence.transition.maxMultiplier,
    },
    parts: Object.fromEntries((["viewport", "previous", "next", "rotation", "picker"] as const).map(key => [key, `.${prefix}__${sequence[key]}`])),
    progress: sequence.progress.map(p => ({ selector: `.${prefix}__${p.target.part}`, effect: p.effect, steps: p.reducedMotion.steps })),
  });
}
