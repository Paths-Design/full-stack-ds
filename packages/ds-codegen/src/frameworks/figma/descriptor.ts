import type { DesignBindingIR } from '../../design-properties.js';
import type { MotionIR } from '../../ir.js';
export const FIGMA_COMPONENT_DESCRIPTOR_SCHEMA_VERSION = 1 as const;
export const FIGMA_COMPONENT_DESCRIPTOR_SOURCE = "@full-stack-ds/codegen/frameworks/figma" as const;

export type FigmaComponentDescriptorV1 = {
  schemaVersion: typeof FIGMA_COMPONENT_DESCRIPTOR_SCHEMA_VERSION;
  source: typeof FIGMA_COMPONENT_DESCRIPTOR_SOURCE;
  component: {
    name: string;
    cssPrefix: string;
    rootElement: string;
    effectiveRole: string | null;
  };
  anatomy: Array<{
    name: string;
    semanticElement: string | null;
    nativeTag: string | null;
    isCompound: boolean;
    isRootOnly: boolean;
    layoutVariant: "horizontal" | "vertical" | null;
  }>;
  props: Array<{
    name: string;
    safeName: string;
    type: string;
    required: boolean;
    description: string | null;
    defaultExpr: string | null;
    nodeKind: string | null;
  }>;
  /** Binding metadata only; live Figma editing is not asserted. */
  designBindings?: DesignBindingIR[];
  /** Additive v1 metadata. These are source facts, not Figma prototype actions. */
  motion?: {
    realization: "descriptor-only";
    facts: MotionIR;
  };
  variants: Record<string, string[]>;
  states: unknown;
  classRecipe: unknown;
  root: unknown;
  css: {
    blocks: unknown;
    keyframes: unknown;
  };
  behavior: {
    channels: unknown;
    dismissalTriggers: unknown;
    events: unknown;
    form: unknown;
    focus: unknown;
    portal: unknown;
  };
  surface: unknown;
  pagedSet?: { realization: "descriptor-only"; facts: { channel: string; itemsProp: string; countProp?: string; disabledProp?: string } };
  figma: {
    intendedUse: "figma-library-materialization";
    documentationFrame: string;
    componentSetName: string;
    propertySource: "IR styledProps + variants + states + behavior";
  };
};

export function assertFigmaComponentDescriptorV1(
  descriptor: unknown,
): asserts descriptor is FigmaComponentDescriptorV1 {
  if (!isRecord(descriptor)) {
    throw new Error("Figma descriptor must be an object.");
  }
  if (descriptor.schemaVersion !== FIGMA_COMPONENT_DESCRIPTOR_SCHEMA_VERSION) {
    throw new Error("Figma descriptor schemaVersion must be 1.");
  }
  if (descriptor.source !== FIGMA_COMPONENT_DESCRIPTOR_SOURCE) {
    throw new Error("Figma descriptor source is not governed by the figma emitter.");
  }
  if (!isRecord(descriptor.component)) {
    throw new Error("Figma descriptor component block is required.");
  }
  assertString(descriptor.component.name, "component.name");
  assertString(descriptor.component.cssPrefix, "component.cssPrefix");
  assertString(descriptor.component.rootElement, "component.rootElement");
  assertNullableString(descriptor.component.effectiveRole, "component.effectiveRole");

  assertArray(descriptor.anatomy, "anatomy");
  for (const [index, part] of descriptor.anatomy.entries()) {
    if (!isRecord(part)) throw new Error(`anatomy[${index}] must be an object.`);
    assertString(part.name, `anatomy[${index}].name`);
    assertNullableString(part.semanticElement, `anatomy[${index}].semanticElement`);
    assertNullableString(part.nativeTag, `anatomy[${index}].nativeTag`);
    assertBoolean(part.isCompound, `anatomy[${index}].isCompound`);
    assertBoolean(part.isRootOnly, `anatomy[${index}].isRootOnly`);
    if (part.layoutVariant !== null && part.layoutVariant !== "horizontal" && part.layoutVariant !== "vertical") {
      throw new Error(`anatomy[${index}].layoutVariant must be horizontal, vertical, or null.`);
    }
  }

  assertArray(descriptor.props, "props");
  for (const [index, prop] of descriptor.props.entries()) {
    if (!isRecord(prop)) throw new Error(`props[${index}] must be an object.`);
    assertString(prop.name, `props[${index}].name`);
    assertString(prop.safeName, `props[${index}].safeName`);
    assertString(prop.type, `props[${index}].type`);
    assertBoolean(prop.required, `props[${index}].required`);
    assertNullableString(prop.description, `props[${index}].description`);
    assertNullableString(prop.defaultExpr, `props[${index}].defaultExpr`);
    assertNullableString(prop.nodeKind, `props[${index}].nodeKind`);
  }

  if (!isRecord(descriptor.variants)) {
    throw new Error("variants must be an object.");
  }
  for (const [name, values] of Object.entries(descriptor.variants)) {
    assertArray(values, `variants.${name}`);
    for (const [index, value] of values.entries()) {
      assertString(value, `variants.${name}[${index}]`);
    }
  }

  if (!isRecord(descriptor.css)) throw new Error("css block is required.");
  if (descriptor.pagedSet !== undefined) {
    if (!isRecord(descriptor.pagedSet) || descriptor.pagedSet.realization !== "descriptor-only" || !isRecord(descriptor.pagedSet.facts)) throw new Error("pagedSet must contain descriptor-only normalized facts.");
    assertString(descriptor.pagedSet.facts.channel, "pagedSet.facts.channel");
    assertString(descriptor.pagedSet.facts.itemsProp, "pagedSet.facts.itemsProp");
  }
  if (descriptor.motion !== undefined) {
    if (!isRecord(descriptor.motion) || descriptor.motion.realization !== "descriptor-only") {
      throw new Error("motion.realization must be descriptor-only.");
    }
    const facts = descriptor.motion.facts;
    if (!isRecord(facts)) throw new Error("motion.facts must contain normalized MotionIR metadata.");
    assertBoolean(facts.honorsReducedMotion, "motion.facts.honorsReducedMotion");
    if (![null, "respect", "disable", "reduce", "ignore"].includes(facts.reducedMotion as string | null)) {
      throw new Error("motion.facts.reducedMotion must retain the normalized preference policy.");
    }
    assertArray(facts.transitions, "motion.facts.transitions");
    assertArray(facts.loops, "motion.facts.loops");
    for (const name of ["sequence", "countdown"] as const) {
      if (facts[name] !== null && !isRecord(facts[name])) throw new Error(`motion.facts.${name} must be an object or null.`);
    }
  }
  if (!isRecord(descriptor.behavior)) throw new Error("behavior block is required.");
  if (!isRecord(descriptor.figma)) throw new Error("figma block is required.");
  if (descriptor.figma.intendedUse !== "figma-library-materialization") {
    throw new Error("figma.intendedUse must be figma-library-materialization.");
  }
  assertString(descriptor.figma.documentationFrame, "figma.documentationFrame");
  assertString(descriptor.figma.componentSetName, "figma.componentSetName");
  if (descriptor.figma.propertySource !== "IR styledProps + variants + states + behavior") {
    throw new Error("figma.propertySource must cite the governed IR source.");
  }
}

function assertString(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${path} must be a non-empty string.`);
  }
}

function assertNullableString(value: unknown, path: string): asserts value is string | null {
  if (value !== null && typeof value !== "string") {
    throw new Error(`${path} must be a string or null.`);
  }
}

function assertBoolean(value: unknown, path: string): asserts value is boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${path} must be a boolean.`);
  }
}

function assertArray(value: unknown, path: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
