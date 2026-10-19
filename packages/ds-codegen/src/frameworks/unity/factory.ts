import fs from "node:fs";
import path from "node:path";
import type { FrameworkEmitter } from "../../emitter.js";
import type { ComponentIR } from "../../ir.js";
import { buildComponentIR } from "../../ir.js";
import { admitContract, loadBoundary, type ClassifiedLeaf, type ContractWithSidecars } from "./boundary.js";
import { identifier, pascal, rootPublicMembers, walkComponent } from "./walker.js";

export { unityLowering } from "./behaviors.js";
export type { UnityBehavior, UnityLowering } from "./behaviors.js";

const quote = (s: string): string => JSON.stringify(s);

/**
 * Realisation check behind the support boundary: a `lowered` rule that declares
 * `realizes` must hold for the control the emitter produces for THIS component.
 * A prop in a lowered family that the root class never emits, a second
 * channel, or an event not carried by the selected channel's change prop
 * would otherwise pass admission and be dropped silently.
 */
export function assertRealized(contract: ContractWithSidecars, ir: ComponentIR, classified: ClassifiedLeaf[]): void {
  const { lowering, source } = walkComponent(ir);
  const { behavior, channel } = lowering;
  const emitted = rootPublicMembers(source, ir.name);
  const rules = new Map(loadBoundary().rules.map(r => [r.id, r]));
  const events = (contract as { events?: Record<string, { emittedVia?: string[] }> }).events ?? {};
  const failures = new Set<string>();
  for (const leaf of classified) {
    if (leaf.source !== "contract" || leaf.disposition !== "lowered" || !leaf.rule) continue;
    const rule = rules.get(leaf.rule);
    if (!rule?.realizes) continue;
    const member = leaf.keyed.match(/^\/props\/[^/]+\/members\/[^/:]+:([^/]+)\//)?.[1];
    const channelKey = leaf.keyed.match(/^\/channels\/([^/]+)/)?.[1];
    const eventKey = leaf.keyed.match(/^\/events\/([^/]+)/)?.[1];
    let ok: boolean;
    let subject: string;
    switch (rule.realizes) {
      case "emitted-property":
        ok = member !== undefined && emitted.has(pascal(member)); subject = `prop ${member}`; break;
      case "selected-channel-member":
        ok = member !== undefined && [channel.valueProp, channel.defaultValueProp, channel.changeHandlerProp].includes(member); subject = `prop ${member}`; break;
      case "selected-channel":
        ok = channelKey === channel.name; subject = `channel ${channelKey}`; break;
      case "channel-change-event":
        ok = eventKey !== undefined && (events[eventKey]?.emittedVia ?? []).includes(channel.changeHandlerProp); subject = `event ${eventKey}`; break;
    }
    if (!ok) failures.add(`${subject} (rule ${rule.id} claims ${rule.realizes})`);
  }
  if (failures.size) throw new Error(`UNITY_BOUNDARY_UNREALIZED: ${ir.name} on ${behavior} does not realise ${[...failures].join("; ")}`);
}

export function createUnityEmitter(): FrameworkEmitter {
  return {
    id: "unity",
    // Support boundary gate (support-boundary.json): every contract and sidecar
    // leaf must carry a disposition; an allowlisted component may not rest on a
    // catch-all; every lowered family that declares a realisation must hold for
    // the classes this component gets. Admission only — the IR is built here to
    // check the claim, and lowering still reads the IR exclusively.
    admitContract: (contract, context) => {
      const classified = admitContract(contract, context);
      assertRealized(contract, buildComponentIR(contract), classified);
    },
    emitComponent: ir => [{ relativePath: `${identifier(ir.name)}/${ir.name}.cs`, contents: walkComponent(ir).source }],
    emitTests: () => [], // Independent Unity EditMode oracles live outside generated source.
    emitBarrel: names => `// Generated component catalog.\nnamespace FullStackDS\n{\n    public static class ComponentCatalog\n    {\n        public static readonly string[] Names = { ${names.sort().map(quote).join(", ")} };\n    }\n}\n`,
    discoverComponentIds: root => fs.existsSync(root) ? fs.readdirSync(root).filter(n => fs.existsSync(path.join(root, n, `${n}.cs`))).sort() : [],
  };
}
