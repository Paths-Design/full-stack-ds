import type { TokenFactIR } from "./ir.js";
import { getCssPrefix, type ComponentContract, type ContractDomNode, type ContractMotionProgress, type ContractSequence, type ContractPartAddress } from "./contract.js";

export interface SequenceIR extends ContractSequence {
  timing: ContractSequence["timing"] & { defaultMs: number };
  progress: ContractMotionProgress[];
  progressHosts: Array<"picker" | "next" | "other" | "unresolved">;
  selectors: { picker: string; progress: string[] };
  composition: "resolved" | "unresolved";
  transition?: { durationToken: string; easingToken: string; durationMs: number; easing: string; referenceWidth: number; minMultiplier: number; maxMultiplier: number };
  realization: { web: "sequence-budget"; nonWeb: "unrealized" };
}

/** Normalize owned sequence parts once; backends only lower these facts. */
export function buildSequence(contract: ComponentContract, tokens: TokenFactIR[], allContracts?: ReadonlyMap<string, ComponentContract>): SequenceIR | null {
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
  const prefix = getCssPrefix(contract);
  const instances: ContractDomNode[] = [];
  const collectInstances = (node: ContractDomNode) => {
    if (node.componentRef) { instances.push(node); return; }
    node.children?.forEach(collectInstances);
  };
  collectInstances(dom);
  const address = (input: string | ContractPartAddress) => {
    const value = typeof input === "string" ? { part: input } : input;
    if (!value.componentPart) return { node: owned(value.part), owner: contract, selector: `.${prefix}__${value.part}` };
    const matches = instances.filter(node => node.part === value.componentPart);
    const instance = matches[0];
    if (matches.length !== 1 || !instance?.componentRef) return fail(`component part ${value.componentPart} must be one local component instance`);
    const target = allContracts?.get(instance.componentRef.replace(/^fsds\./, ""));
    const tree = target && !Array.isArray(target.anatomy) ? target.anatomy?.dom : undefined;
    if (!allContracts) return { node: undefined, owner: undefined, instance,
      selector: `.${prefix}__${value.componentPart} .${getCssPrefix({ name: instance.componentRef.replace(/^fsds\./, "") } as ComponentContract)}__${value.part}` };
    if (!target || !tree) return fail(`component part ${value.componentPart} requires a resolved contract corpus`);
    const leaves: ContractDomNode[] = [];
    const walkTarget = (node: ContractDomNode) => { if (node.componentRef) return; leaves.push(node); node.children?.forEach(walkTarget); };
    walkTarget(tree);
    const selected = leaves.filter(node => node.part === value.part);
    if (selected.length !== 1 || selected[0] === tree) return fail(`composed part ${value.part} must be one target-owned non-root node`);
    return { node: selected[0], owner: target, instance, selector: `.${prefix}__${value.componentPart} .${getCssPrefix(target)}__${value.part}` };
  };
  const names = [sequence.viewport, sequence.previous, sequence.next, sequence.rotation];
  if (new Set([...names, JSON.stringify(sequence.picker)]).size !== names.length + 1) fail("control and viewport parts must be distinct");
  for (const part of names.slice(1)) if (owned(part).tag !== "button") fail(`${part} must be a native button`);
  if (!owned(sequence.viewport).children?.some(n => n.tag === "children")) fail("viewport must project consumer children");
  const resolvedPicker = address(sequence.picker);
  const picker = resolvedPicker.node;
  if (picker && (picker.tag !== "button" || picker.iterate?.kind !== "array")) fail("picker must iterate items on a native button");
  if (picker && resolvedPicker.instance && resolvedPicker.owner) {
    const source = picker.iterate!.source.replace(/^prop:/, "");
    if (resolvedPicker.instance.bindings?.[source] !== `prop:${sequence.itemsProp}`) fail("composed picker must receive sequence items");
    const channel = Object.values(resolvedPicker.owner.channels ?? {}).find(channel =>
      resolvedPicker.instance!.bindings?.[channel.value] === `channel:${sequence.channel}.value` &&
      resolvedPicker.instance!.events?.[channel.onChange.replace(/^on./, value => value.slice(2).toLowerCase())] === `channel:${sequence.channel}.onChange`);
    if (!channel || channel.valueType !== "number") fail("composed picker must share the numeric sequence channel and callback");
  } else if (picker && picker.iterate!.source !== `prop:${sequence.itemsProp}`) fail("picker must iterate sequence items");
  const progressSelectors: string[] = [];
  const progressHosts: SequenceIR["progressHosts"] = [];
  const contains = (parent: ContractDomNode, child: ContractDomNode): boolean =>
    parent === child || (!parent.componentRef && Boolean(parent.children?.some(node => contains(node, child))));
  const targets = new Set<string>();
  for (const binding of progress) {
    const resolved = address(binding.target);
    const node = resolved.node;
    progressSelectors.push(resolved.selector);
    // Resolve ancestry in the owning contract, including a composed child.
    // Native backends must not reconstruct it from web selectors or part names.
    progressHosts.push(!node ? "unresolved" :
      picker && resolved.owner === resolvedPicker.owner && resolved.instance === resolvedPicker.instance && contains(picker, node) ? "picker" :
      resolved.owner === contract && contains(owned(sequence.next), node) ? "next" : "other");
    if (targets.has(resolved.selector) || (!binding.target.componentPart && names.includes(binding.target.part))) fail("progress targets must be distinct decorations");
    targets.add(resolved.selector);
    if (node && (node.attrs?.["aria-hidden"] !== "true" || node.content || node.children?.length)) fail("progress must be empty and decorative");
    if (binding.driver.kind !== "budget" || binding.driver.source !== "sequence.advance" ||
        !["elapsed-width", "elapsed-ring"].includes(binding.effect) || binding.reducedMotion.kind !== "steps" ||
        !Number.isInteger(binding.reducedMotion.steps) || binding.reducedMotion.steps < 2 || binding.reducedMotion.steps > 20 ||
        contract.motion?.reducedMotion === "ignore") fail("unsupported progress policy");
    if (contract.motion?.loops?.some(l => l.target.part === binding.target.part) || contract.motion?.countdown?.target.part === binding.target.part) fail("competing motion owner");
    if (Object.keys(resolved.owner?.styles?.[binding.target.part] ?? {}).some(p => /^(transform|scale|animation|transition)(-|$)/.test(p) && p !== "transform-origin")) fail("authored motion competes for progress");
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
  return { ...sequence, composition: allContracts || (!resolvedPicker.instance && progress.every(p => !p.target.componentPart)) ? "resolved" : "unresolved", selectors: { picker: resolvedPicker.selector, progress: progressSelectors }, timing: { ...sequence.timing, defaultMs }, progress, progressHosts, ...(normalizedTransition ? { transition: normalizedTransition } : {}), realization: { web: "sequence-budget", nonWeb: "unrealized" } };
}

/** CSS-part addressing is derived here rather than reconstructed by each emitter. */
export function sequenceConfig(sequence: SequenceIR, prefix: string): string {
  if (sequence.composition === "unresolved") throw new Error("[SEQUENCE_INVALID] Emitting composed sequence behavior requires the resolved contract corpus");
  return JSON.stringify({
    labels: sequence.labels,
    delegatedPicker: typeof sequence.picker === "string" || !sequence.picker.componentPart,
    transition: sequence.transition && {
      durationMs: sequence.transition.durationMs, easing: sequence.transition.easing,
      referenceWidth: sequence.transition.referenceWidth,
      minMultiplier: sequence.transition.minMultiplier, maxMultiplier: sequence.transition.maxMultiplier,
    },
    parts: Object.fromEntries((["viewport", "previous", "next", "rotation", "picker"] as const).map(key => [key, key === "picker" ? sequence.selectors.picker : `.${prefix}__${sequence[key]}`])),
    progress: sequence.progress.map((p, index) => ({ selector: sequence.selectors.progress[index], effect: p.effect, steps: p.reducedMotion.steps })),
  });
}
