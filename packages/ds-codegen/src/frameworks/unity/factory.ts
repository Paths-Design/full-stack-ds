import fs from "node:fs";
import path from "node:path";
import type { FrameworkEmitter } from "../../emitter.js";
import type { ComponentIR, NormalizedChannelIR } from "../../ir.js";
import { isPartAnchoredSurface, resolveAnchoredSurfacePolicy } from "../../semantics.js";
import { buildComponentIR } from "../../ir.js";
import { admitContract, loadBoundary, type ClassifiedLeaf, type ContractWithSidecars } from "./boundary.js";

const quote = (s: string): string => JSON.stringify(s);
const pascal = (s: string): string => s.replace(/(^|[-_])([a-z])/g, (_, _sep: string, c: string) => c.toUpperCase());
const identifier = (s: string): string => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)) throw new Error(`UNITY_IDENTIFIER: ${s}`);
  return s;
};

/** Source: IR control/interaction/attachment axes. Applies by value model,
 * operation and attachment, never identity. Extend when new axes are admitted.
 *
 * Each shared runtime base realises some facts unconditionally (AnchoredSurface
 * always reparents to the panel root; ItemGroup always runs arrow navigation),
 * so the dispatcher refuses a contract whose declared focus strategy, portal,
 * presence or content facts the selected base would contradict. Those refusals
 * are what let the support boundary call the matching families `lowered`. */
export function unityLowering(ir: ComponentIR): { base: string; channel: NormalizedChannelIR; selection: boolean } {
  const focus = ir.behavior.focus?.strategy;
  const portal = ir.behavior.portal?.enabled === true;
  const refuseFocus = (base: string): never => { throw new Error(`UNITY_UNSUPPORTED_FOCUS: ${ir.name} declares focus.strategy ${JSON.stringify(focus)}, which ${base} does not realise`); };
  if (ir.surface) {
    if (!isPartAnchoredSurface(ir.surface) || ir.surface.modality !== "non-blocking" ||
        ir.surface.openTriggers.join() !== "click" || ir.interaction?.triggers[0]?.operation !== "toggle" ||
        ir.surface.dismissal.some(d => !["escape", "outside-click", "blur"].includes(d))) {
      throw new Error(`UNITY_UNSUPPORTED_SURFACE: ${ir.name}`);
    }
    // AnchoredSurface reparents a persistent, focusable ScrollView to the panel
    // root and detaches it on close; a surface declaring otherwise is refused.
    if (!portal || ir.surface.presence !== "persistent" || ir.surface.content?.interactive !== true || ir.interaction.presence !== "unmount") {
      throw new Error(`UNITY_UNSUPPORTED_SURFACE: ${ir.name} declares portal/presence/content facts AnchoredSurface does not realise`);
    }
    if (focus !== undefined && focus !== "none") refuseFocus("AnchoredSurface");
    return { base: "AnchoredSurface", channel: ir.interaction.channel, selection: false };
  }
  if (portal) throw new Error(`UNITY_UNSUPPORTED_PORTAL: ${ir.name} enables a portal but only anchored surfaces reparent content`);
  if (ir.formControl?.valueModel === "boolean") {
    if (focus !== undefined && focus !== "auto") refuseFocus("BooleanControl");
    return { base: "BooleanControl", channel: ir.formControl.channel, selection: false };
  }
  const interaction = ir.interaction;
  if (interaction?.triggers.length === 1 && ["select", "toggle-item"].includes(interaction.triggers[0]!.operation)) {
    if (interaction.presence !== "hidden") throw new Error(`UNITY_UNSUPPORTED_INTERACTION: ${ir.name} declares presence ${JSON.stringify(interaction.presence)}, which ItemGroup does not realise`);
    if (focus !== "roving" && focus !== "manual") refuseFocus("ItemGroup");
    return { base: "ItemGroup", channel: interaction.channel, selection: true };
  }
  throw new Error(`UNITY_UNSUPPORTED_INTERACTION: ${ir.name}`);
}

/**
 * Realisation check behind the support boundary: a `lowered` rule that declares
 * `realizes` must hold for the control the emitter produces for THIS component.
 * A prop in a lowered family that the selected base never emits, a second
 * channel, or an event not carried by the selected channel's change prop would
 * otherwise pass admission and be dropped silently.
 */
export function assertRealized(contract: ContractWithSidecars, ir: ComponentIR, classified: ClassifiedLeaf[]): void {
  const { base, channel } = unityLowering(ir);
  const emitted = new Set([...componentSource(ir).matchAll(/public (?:new )?(?:bool|string) (\w+) \{/g)].map(m => m[1]!));
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
  if (failures.size) throw new Error(`UNITY_BOUNDARY_UNREALIZED: ${ir.name} on ${base} does not realise ${[...failures].join("; ")}`);
}

function componentSource(ir: ComponentIR): string {
  const { base, channel, selection } = unityLowering(ir);
  const name = identifier(ir.name);
  const init: string[] = [`AddToClassList(${quote(ir.cssPrefix)});`];
  const properties: string[] = [];
  const options: Record<string, string> = {
    disabled: "Disabled", collapsible: "Collapsible", loop: "Loop", unmountInactive: "UnmountInactive",
    orientation: "Orientation", activationMode: "ActivationMode", type: "SelectionType", appearance: "Appearance",
  };
  // Source: normalized prop names/defaults plus shared interaction vocabulary.
  // These are substrate option adapters, emitted only for declared props.
  for (const prop of ir.styledProps) {
    const target = options[prop.name];
    if (!target || (!selection && prop.name !== "disabled")) continue;
    const type = prop.type === "boolean" ? "bool" : "string";
    const publicName = identifier(pascal(prop.name));
    properties.push(`        [UxmlAttribute] public ${publicName === target ? "new " : ""}${type} ${publicName} { get => base.${target}; set => base.${target} = value; }`);
    if (prop.defaultExpr !== undefined) init.push(`${target} = ${prop.defaultExpr};`);
  }
  if (selection) {
    init.push(`Configure(${quote(ir.interaction!.triggers[0]!.operation)}, ${quote(ir.interaction!.triggers[0]!.part.name)}, ${quote(ir.interaction!.content.name)}, ${quote(ir.cssPrefix)});`);
    if (!ir.styledProps.some(p => p.name === "orientation")) init.push(`Orientation = ${quote(ir.behavior.focus?.orientation ?? "horizontal")};`);
    if (!ir.styledProps.some(p => p.name === "loop")) init.push(`Loop = ${ir.behavior.focus?.wrap ?? false};`);
    properties.push('        [UxmlAttribute] public new string Value { get => base.Value; set => base.Value = value; }');
  } else {
    const prop = identifier(pascal(channel.valueProp));
    properties.push(`        [UxmlAttribute] public bool ${prop} { get => value; set => this.value = value; }`);
    if (base === "BooleanControl") {
      init.push(`Configure(${quote(ir.formControl!.part.name)}, ${quote(ir.cssPrefix)});`);
      // Source: typed sidecar fallback facts; apply by geometry suffix, not component.
      // Only the default-size toggle geometry is admitted in this pilot.
      for (const [suffix, target] of [["size.md.track.width", "TrackWidth"], ["size.md.track.height", "TrackHeight"], ["size.md.thumb.size", "ThumbSize"]]) {
        const fact = ir.tokenFacts.find(f => f.name.endsWith(`.${suffix}`));
        if (fact?.rawValue && /^\d+(?:\.\d+)?px$/.test(fact.rawValue)) init.push(`${target} = ${parseFloat(fact.rawValue)}f;`);
      }
    }
  }
  if (ir.surface) {
    init.push(`Configure(${quote(ir.surface.anchor!.part.name)}, ${quote(ir.surface.content!.part.name)}, ${quote(ir.cssPrefix)});`);
    for (const dismissal of resolveAnchoredSurfacePolicy(ir.surface).publicDismissalProps) {
      if (!dismissal.prop) continue;
      const prop = identifier(pascal(dismissal.prop));
      const def = ir.styledProps.find(p => p.name === dismissal.prop)?.defaultExpr ?? String(dismissal.defaultValue);
      properties.push(`        [UxmlAttribute] public new bool ${prop} { get => base.${prop}; set => base.${prop} = value; }`);
      init.push(`${prop} = ${def};`);
    }
    properties.push('        [UxmlAttribute] public new string Placement { get => base.Placement; set => base.Placement = value; }');
  }
  return `// Generated from ComponentIR. Regenerate with pnpm run generate:unity.\nusing UnityEngine.UIElements;\n\nnamespace FullStackDS\n{\n    [UxmlElement]\n    public partial class ${name} : ${base}\n    {\n        public const string ChannelName = ${quote(channel.name)};\n        public const string ChangeHandler = ${quote(channel.changeHandlerProp)};\n${properties.join("\n")}\n        public ${name}()\n        {\n            ${init.join("\n            ")}\n        }\n    }\n${selection ? `\n    [UxmlElement]\n    public partial class ${name}Item : SelectionItem { }\n` : ""}}\n`;
}

export function createUnityEmitter(): FrameworkEmitter {
  return {
    id: "unity",
    // Support boundary gate (support-boundary.json): every contract and sidecar
    // leaf must carry a disposition; an allowlisted component may not rest on a
    // catch-all; every lowered family that declares a realisation must hold for
    // the control this component gets. Admission only — the IR is built here to
    // check the claim, and lowering still reads the IR exclusively.
    admitContract: (contract, context) => {
      const classified = admitContract(contract, context);
      assertRealized(contract, buildComponentIR(contract), classified);
    },
    emitComponent: ir => [{ relativePath: `${identifier(ir.name)}/${ir.name}.cs`, contents: componentSource(ir) }],
    emitTests: () => [], // Independent Unity EditMode oracles live outside generated source.
    emitBarrel: names => `// Generated component catalog.\nnamespace FullStackDS\n{\n    public static class ComponentCatalog\n    {\n        public static readonly string[] Names = { ${names.sort().map(quote).join(", ")} };\n    }\n}\n`,
    discoverComponentIds: root => fs.existsSync(root) ? fs.readdirSync(root).filter(n => fs.existsSync(path.join(root, n, `${n}.cs`))).sort() : [],
  };
}
