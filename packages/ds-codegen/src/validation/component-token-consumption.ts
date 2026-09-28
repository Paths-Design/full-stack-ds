import type { ComponentContract } from "../contract.js";
import { buildComponentIR } from "../ir.js";
import { webTokenConsumption } from "../css.js";
import { resolveSurfaceAutoDismiss } from "../semantics.js";
import { tokenSlug } from "../token-path.js";
import type { ValidationIssue } from "../validate.js";
import { generateReactNativeComponentSource } from "../frameworks/react-native/component-source.js";
import { consumedNativeTokenScopes, reactNativeTokenReads } from "../frameworks/react-native/token-consumption.js";

import { nativeSlotArguments, nativeTokenScopes, composeTokenReads, consumedComposeTokenScopes } from "../frameworks/native-token-consumption.js";
import { generateJetpackComposeComponentSource } from "../frameworks/jetpack-compose/component-source.js";
import { generateJetpackComposeSurfaceFiles, isSurfaceComponent } from "../frameworks/jetpack-compose/surface-emit.js";
import { createSwiftUIEmitter } from "../frameworks/swift/swiftui/factory.js";

import { loadTargetRegistryConfigV1 } from "../target-packs/config.js";

export function inspectComponentTokenConsumption(contract: ComponentContract, workspaceRoot = process.cwd()) {
  const { config } = loadTargetRegistryConfigV1(workspaceRoot);
  const admitted = (id: string) => config.targets.some(target => target.id === id &&
    target.source.kind === "builtin" && (!target.components || target.components.includes(contract.name)));
  const ir = buildComponentIR(contract);
  const web = webTokenConsumption(ir);
  const nativeFiles = generateReactNativeComponentSource(ir);
  const native = new Set([
    ...(admitted("react-native") ? consumedNativeTokenScopes(ir, reactNativeTokenReads([nativeFiles.componentFile, nativeFiles.stylesFile])) : []),
    // Surfaces do not flow through the component-source dispatcher; they emit
    // through the surface emitter (FEAT-COMPOSE-ANCHORED-SURFACES-01).
    ...(admitted("jetpack-compose")
      ? consumedComposeTokenScopes(
          ir,
          composeTokenReads(
            isSurfaceComponent(ir)
              ? generateJetpackComposeSurfaceFiles(ir).componentFile
              : generateJetpackComposeComponentSource(ir),
          ),
        )
      : []),
    ...(admitted("swiftui") ? nativeTokenScopes(ir, nativeSlotArguments(createSwiftUIEmitter().emitComponent(ir, { componentsRoot: "packages/ds-swiftui/Sources/DsSwiftUI/Components", contractsRoot: "packages/ds-contracts" }).map(file => file.contents).join("\n"), ["colorSlot", "pxSlot"]), true) : []),
  ].flatMap(scope => scope.values.map(value => value.name)));
  const behavior = new Set<string>();
  if (ir.motion.sequence) behavior.add(ir.motion.sequence.timing.durationToken);
  if (ir.motion.sequence?.transition) {
    behavior.add(ir.motion.sequence.transition.durationToken);
    behavior.add(ir.motion.sequence.transition.easingToken);
  }
  // This is the same capability-selected policy the timer emitters consume.
  // Reading a compiled default is distinct from reading a CSS runtime override.
  const autoDismiss = resolveSurfaceAutoDismiss(ir);
  if (autoDismiss?.tokenSlot && autoDismiss.defaultMs !== undefined &&
      ir.behavior.normalizedChannels.some(channel => channel.valueType === "boolean")) {
    behavior.add(autoDismiss.tokenSlot);
  }
  const pointer = (key: string) => key.replace(/~/g, "~0").replace(/\//g, "~1");
  const declared = new Map<string, string>();
  for (const name of Object.keys(contract.tokens ?? {})) declared.set(name, `/tokens/${name}`);
  for (const [selector, block] of Object.entries(contract.styles ?? {})) {
    for (const [property, entry] of Object.entries(block)) {
      if (property.includes(".")) declared.set(property, `/styles/${pointer(selector)}/${pointer(property)}`);
      if (entry.design) declared.set(entry.design.slot, `/styles/${pointer(selector)}/${pointer(property)}/design`);
    }
  }
  const slots = [...declared].map(([slot, path]) => ({
    slot, path, cssVar: `--${tokenSlug(slot)}`,
    web: web.consumed.has(`--${tokenSlug(slot)}`),
    native: native.has(slot),
    behavior: behavior.has(slot),
  }));
  return { slots, web, ir };
}

/** No debt allowance: an unused component declaration is a contract error. */
export function validateComponentTokenConsumption(contract: ComponentContract, workspaceRoot = process.cwd()): ValidationIssue[] {
  const { slots, web } = inspectComponentTokenConsumption(contract, workspaceRoot);
  const declaredVars = new Set(slots.map(slot => slot.cssVar));
  return [
    ...slots.filter(slot => !slot.web && !slot.native && !slot.behavior).map(slot => ({
      pointer: slot.path,
      message: `[COMPONENT_TOKEN_UNCONSUMED] ${slot.slot} has no property or behavior consumer; remove the declaration or bind the supported decision.`,
    })),
    // Raw custom-property declarations in style blocks cannot bypass the
    // sidecar obligation merely by omitting a dotted token name.
    ...[...web.declarations.keys()].filter(name => !declaredVars.has(name) && !web.consumed.has(name)).map(name => ({
      pointer: "/styles",
      message: `[COMPONENT_TOKEN_UNCONSUMED] ${name} has no property consumer; remove the declaration or bind the supported decision.`,
    })),
    ...web.cycles.map(cycle => ({
      pointer: "/tokens",
      message: `[COMPONENT_TOKEN_CYCLE] ${cycle.join(" -> ")}`,
    })),
  ];
}
