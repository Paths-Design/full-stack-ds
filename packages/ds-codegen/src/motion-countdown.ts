import type { ComponentContract, ContractDomNode, ContractMotionCountdown } from "./contract.js";
import type { PartIR } from "./ir.js";

export interface MotionCountdownIR extends Omit<ContractMotionCountdown, "target"> {
  target: PartIR;
  realization: { web: "presence-budget"; nonWeb: "unrealized" };
}

/** Bind one decorative target to an existing authoritative surface budget. */
export function buildMotionCountdown(contract: ComponentContract, parts: PartIR[]): MotionCountdownIR | null {
  const binding = contract.motion?.countdown;
  if (!binding) return null;
  const fail = (message: string): never => { throw new Error(`[MOTION_COUNTDOWN_INVALID] ${contract.name}: ${message}`); };
  const surface = contract.surface;
  const prop = surface?.timing?.autoDismissProp;
  if (!prop || !surface?.dismissal?.includes("timeout") ||
      !contract.props?.styled?.members?.some((member) => member.name === prop) ||
      !Object.values(contract.channels ?? {}).some((channel) => channel.valueType === "boolean")) {
    fail("requires a surface auto-dismiss prop, timeout dismissal and Boolean visibility channel");
  }
  if (binding.driver.kind !== "budget" || binding.driver.source !== "surface.autoDismiss" ||
      binding.effect !== "remaining-width" || binding.reducedMotion.kind !== "steps" ||
      !Number.isInteger(binding.reducedMotion.steps) || binding.reducedMotion.steps < 2 || binding.reducedMotion.steps > 20 ||
      contract.motion?.reducedMotion === "ignore") fail("unsupported driver, effect or reduced-motion policy");
  const target = parts.find((part) => part.name === binding.target.part);
  const dom = !Array.isArray(contract.anatomy) ? contract.anatomy?.dom : undefined;
  const nodes: ContractDomNode[] = [];
  const walk = (node: ContractDomNode) => {
    if (node.componentRef) return;
    if (node.part === binding.target.part) nodes.push(node);
    for (const child of node.children ?? []) walk(child);
  };
  if (dom) walk(dom);
  if (!target || target.isCompound || nodes.length !== 1 || nodes[0] === dom ||
      nodes[0].attrs?.["aria-hidden"] !== "true" || nodes[0].children?.length || nodes[0].content) {
    return fail("target must be one owned, empty, decorative non-root anatomy part");
  }
  if (contract.motion?.loops?.some((loop) => loop.target.part === target.name)) fail("countdown and loop compete for target");
  const declarations = contract.styles?.[target.name];
  if (declarations && Object.keys(declarations).some((property) => /^(transform|scale|animation|transition)(-|$)/.test(property) && property !== "transform-origin")) {
    fail("authored motion competes for countdown target");
  }
  return { ...binding, target, realization: { web: "presence-budget", nonWeb: "unrealized" } };
}
