import fs from "node:fs";
import path from "node:path";
import type { FrameworkEmitter } from "../../emitter.js";
import type { ComponentIR } from "../../ir.js";
import { buildComponentIR } from "../../ir.js";
import { admitContract, loadBoundary, type ClassifiedLeaf, type ContractWithSidecars } from "./boundary.js";
import { triggerParts } from "./behaviors.js";
import { identifier, pascal, rootPublicMembers, walkComponent } from "./walker.js";

export { unityLowering } from "./behaviors.js";
export type { UnityBehavior, UnityLowering } from "./behaviors.js";

const quote = (s: string): string => JSON.stringify(s);

/** The anatomy node a keyed `/anatomy/dom/(children/<key>/)*…` pointer names:
 * the last `children/<key>` segment, or the dom root. Keys are part names for
 * part-carrying nodes (see boundary.ts keyedLeaves). */
function domNodeKey(keyed: string, ir: ComponentIR): string | undefined {
  const segments = keyed.split("/").slice(1);
  if (segments[0] !== "anatomy" || segments[1] !== "dom") return undefined;
  let key = ir.dom?.part;
  for (let i = 2; i < segments.length - 1; i++) if (segments[i] === "children") key = segments[i + 1];
  return key;
}

/**
 * Realisation check behind the support boundary: a `lowered` rule that declares
 * `realizes` must hold for the control the emitter produces for THIS component.
 * A prop in a lowered family that the root class never emits, a second
 * channel, an event not carried by the selected channel's change prop, or an
 * anatomy binding the selected behavior does not consume would otherwise pass
 * admission and be dropped silently.
 */
export function assertRealized(contract: ContractWithSidecars, ir: ComponentIR, classified: ClassifiedLeaf[]): void {
  const { lowering, source } = walkComponent(ir);
  const { behavior, channel } = lowering;
  const emitted = rootPublicMembers(source, ir.name);
  const triggers = triggerParts(ir);
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
    const binding = typeof leaf.value === "string" ? leaf.value : "";
    const node = domNodeKey(leaf.keyed, ir);
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
      case "selected-channel-binding":
        // The behavior's state class realises a binding to the selected
        // channel's value only on a trigger part it owns.
        ok = binding === `channel:${channel.name}.value` && node !== undefined && triggers.has(node); subject = `binding ${leaf.keyed}`; break;
      case "bound-prop-property":
        ok = binding.startsWith("prop:") && node !== undefined && triggers.has(node) && emitted.has(pascal(binding.slice(5))); subject = `binding ${leaf.keyed}`; break;
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
