import type { ComponentContract, ContractDomNode } from "./contract.js";

export interface MotionPortIR {
  part: string;
  repeated: boolean;
}

/** Empty decorative anatomy is the addressable boundary for an external
 * projection. A port supplies no clock, effect or timing policy of its own.
 */
export function buildMotionPorts(contract: ComponentContract): MotionPortIR[] {
  const root = !Array.isArray(contract.anatomy) ? contract.anatomy?.dom : undefined;
  if (!root) return [];
  const ports: MotionPortIR[] = [];
  const visit = (node: ContractDomNode, repeated: boolean) => {
    if (node.componentRef) return;
    const iterated = repeated || Boolean(node.iterate);
    if (node !== root && node.part && node.attrs?.["aria-hidden"] === "true" &&
        !node.content && !node.children?.length &&
        !contract.motion?.loops?.some(loop => loop.target.part === node.part) &&
        contract.motion?.countdown?.target.part !== node.part) {
      ports.push({ part: node.part, repeated: iterated });
    }
    node.children?.forEach(child => visit(child, iterated));
  };
  visit(root, false);
  return ports;
}
