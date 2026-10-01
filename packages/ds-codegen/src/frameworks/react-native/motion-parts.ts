import type { ComponentIR, DomNodeIR } from "../../ir.js";

const ports = (ir: ComponentIR) => ir.motion.ports ?? [];

export function nativeMotionImports(rendered: string): string {
  const names = ["MotionPart", "MotionPartScope", "MotionPartsProvider"]
    .filter(name => new RegExp(`<${name}[\\s>]`).test(rendered));
  return names.length ? `import { ${names.join(", ")} } from "../../primitives/motion-parts";` : "";
}

function projection(ir: ComponentIR, ordinal: number): string {
  const sequence = ir.motion.sequence!;
  const binding = sequence.progress[ordinal];
  const prop = ir.styledProps.find(prop => prop.name === binding.when?.axis)?.safeName;
  const presented = binding.when ? `${JSON.stringify(binding.when.values)}.includes(${prop} ?? "")` : "true";
  return `{ effect: ${JSON.stringify(binding.effect)}, elapsed: sequence.elapsed, reducedMotion: sequence.reducedMotion, steps: ${binding.reducedMotion.steps}, visible: sequence.valid && sequence.timed && ${presented}${sequence.progressHosts[ordinal] === "picker" ? ", activeIndex: sequence.index" : ""} }`;
}

export function nativeMotionRoot(ir: ComponentIR, rendered: string): string {
  const receives = ports(ir).some(port => !ir.motion.sequence?.progress.some(binding =>
    !binding.target.componentPart && binding.target.part === port.part));
  return ports(ir).length ? `<MotionPartScope>{${receives ? "motionParts" : "_motionParts"} => (\n${rendered}\n)}</MotionPartScope>` : rendered;
}

export function nativeMotionInstance(ir: ComponentIR, node: DomNodeIR, rendered: string): string {
  const entries = ir.motion.sequence?.progress.flatMap((binding, index) => binding.target.componentPart && binding.target.componentPart === node.part
    ? [`${JSON.stringify(binding.target.part)}: ${projection(ir, index)}`] : []) ?? [];
  return entries.length ? `<MotionPartsProvider value={{ ${entries.join(", ")} }}>\n${rendered}\n</MotionPartsProvider>` : rendered;
}

function repeatedIndex(node: DomNodeIR | undefined, part: string, current?: string): string | undefined {
  if (!node) return undefined;
  const index = node.iteration?.indexVar ?? current;
  if (node.part === part) return index;
  if (node.componentInstance) return undefined;
  for (const child of node.children) {
    const found = repeatedIndex(child, part, index);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function nativeMotionPart(ir: ComponentIR, node: DomNodeIR, style: string, rendered: string): string {
  const port = ports(ir).find(port => port.part === node.part);
  if (!port) return rendered;
  const local = ir.motion.sequence?.progress.findIndex(binding => !binding.target.componentPart && binding.target.part === node.part) ?? -1;
  const value = local < 0 ? `motionParts[${JSON.stringify(port.part)}]` : projection(ir, local);
  const index = port.repeated ? repeatedIndex(ir.dom, port.part) : undefined;
  if (port.repeated && index === undefined) throw new Error(`NATIVE_MOTION_PORT_INVALID: ${ir.name}.${port.part} has no iteration index`);
  return `<MotionPart projection={${value}}${index ? ` index={${index}}` : ""} style={${style}}>\n${rendered}\n</MotionPart>`;
}
