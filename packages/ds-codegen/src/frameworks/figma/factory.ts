import fs from "node:fs";
import path from "node:path";
import type {
  EmitOptions,
  FrameworkEmitter,
  GeneratedFile,
} from "../../emitter.js";
import type { ComponentIR } from "../../ir.js";
import {
  FIGMA_COMPONENT_DESCRIPTOR_SCHEMA_VERSION,
  FIGMA_COMPONENT_DESCRIPTOR_SOURCE,
  type FigmaComponentDescriptorV1,
} from "./descriptor.js";
import {
  toFigmaStackPrimitiveDescriptor,
  type StackPrimitiveContract,
} from "./primitive.js";

export function createFigmaEmitter(): FrameworkEmitter {
  return {
    id: "figma",

    emitComponent(ir: ComponentIR, _opts: EmitOptions): GeneratedFile[] {
      return [
        {
          relativePath: `${ir.name}/${ir.name}.figma.json`,
          contents: `${JSON.stringify(toFigmaComponentDescriptor(ir), null, 2)}\n`,
          preservable: false,
        },
        {
          relativePath: `${ir.name}/README.md`,
          contents: generateComponentReadme(ir),
          // Markdown is emitted without region markers; preservable would
          // freeze first-written bytes behind the legacy-skip
          // (FIX-CODEGEN-PRESERVABLE-MARKER-INVARIANT-01).
          preservable: false,
        },
      ];
    },

    emitTests(_ir: ComponentIR, _opts: EmitOptions): GeneratedFile[] {
      return [];
    },

    emitHook(_ir: ComponentIR, _opts: EmitOptions): GeneratedFile[] {
      return [];
    },

    emitBarrel(componentNames: string[], componentsRoot?: string): string {
      const componentImports = componentNames
        .map((name) => `import ${name} from "./${name}/${name}.figma.json" with { type: "json" };`)
        .join("\n");
      const componentEntries = componentNames
        .map((name) => `  ${JSON.stringify(name)}: ${name},`)
        .join("\n");

      const includePrimitive =
        componentsRoot !== undefined &&
        fs.existsSync(
          path.join(componentsRoot, "..", "primitives", "Stack", "Stack.figma.json"),
        );

      const primitiveImports = includePrimitive
        ? `import Stack from "../primitives/Stack/Stack.figma.json" with { type: "json" };\n`
        : "";
      const primitiveRegistry = includePrimitive
        ? `\nexport const figmaPrimitiveRegistry = {\n  "Stack": Stack,\n} as const;\n\nexport type FigmaPrimitiveName = keyof typeof figmaPrimitiveRegistry;\n`
        : `\nexport const figmaPrimitiveRegistry = {} as const;\n\nexport type FigmaPrimitiveName = keyof typeof figmaPrimitiveRegistry;\n`;

      return `${primitiveImports}${componentImports}\n\nexport const figmaComponentRegistry = {\n${componentEntries}\n} as const;\n\nexport type FigmaComponentName = keyof typeof figmaComponentRegistry;\n${primitiveRegistry}`;
    },

    discoverComponentIds(componentsRoot: string): string[] {
      if (!fs.existsSync(componentsRoot)) return [];
      return fs.readdirSync(componentsRoot).filter((entry) => {
        const descriptor = path.join(componentsRoot, entry, `${entry}.figma.json`);
        return fs.existsSync(descriptor);
      });
    },
  };
}

/**
 * Build the Stack primitive descriptor from the source contract. Returned as
 * an in-memory descriptor; the CLI is responsible for writing it to disk at
 * `<figma target>/generated/primitives/Stack/Stack.figma.json` (sibling of
 * `components/`).
 *
 * This is a top-level helper rather than a FrameworkEmitter method because
 * primitives are a figma-target-specific concept — other framework emitters
 * have no analog. Adding `emitPrimitive` to FrameworkEmitter would impose a
 * concept on emitters that don't model primitives this way.
 */
export function buildFigmaStackPrimitiveDescriptor(
  contractsRoot: string,
): { relativePath: string; contents: string } {
  const stackPath = path.join(contractsRoot, "primitives", "Stack.primitive.json");
  if (!fs.existsSync(stackPath)) {
    throw new Error(
      `Stack primitive contract not found at ${stackPath}; figma primitive emission requires it.`,
    );
  }
  const contract = JSON.parse(fs.readFileSync(stackPath, "utf-8")) as StackPrimitiveContract;
  const descriptor = toFigmaStackPrimitiveDescriptor(contract);
  return {
    relativePath: "primitives/Stack/Stack.figma.json",
    contents: `${JSON.stringify(descriptor, null, 2)}\n`,
  };
}

export function toFigmaComponentDescriptor(ir: ComponentIR): FigmaComponentDescriptorV1 {
  return {
    schemaVersion: FIGMA_COMPONENT_DESCRIPTOR_SCHEMA_VERSION,
    source: FIGMA_COMPONENT_DESCRIPTOR_SOURCE,
    component: {
      name: ir.name,
      cssPrefix: ir.cssPrefix,
      rootElement: ir.root.element,
      effectiveRole: ir.root.effectiveRole ?? null,
    },
    anatomy: ir.parts.map((part) => ({
      name: part.name,
      semanticElement: part.semanticElement ?? null,
      nativeTag: part.nativeTag ?? null,
      isCompound: part.isCompound,
      isRootOnly: part.isRootOnly,
      layoutVariant: part.layoutVariant ?? null,
    })),
    props: ir.styledProps.map((prop) => ({
      name: prop.name,
      safeName: prop.safeName,
      type: prop.type,
      required: prop.required,
      description: prop.description ?? null,
      defaultExpr: prop.defaultExpr ?? null,
      nodeKind: prop.nodeKind ?? null,
    })),
    designBindings: ir.designBindings,
    motion: ir.motion ? { realization: "descriptor-only", facts: ir.motion } : undefined,
    variants: ir.variants,
    states: ir.states,
    classRecipe: ir.classRecipe,
    root: ir.root,
    css: {
      blocks: ir.cssBlocks,
      keyframes: ir.keyframes,
    },
    behavior: {
      channels: ir.behavior.normalizedChannels,
      dismissalTriggers: ir.behavior.normalizedDismissalTriggers,
      events: ir.behavior.normalizedEvents,
      form: ir.behavior.form ?? null,
      focus: ir.behavior.focus ?? null,
      portal: ir.behavior.portal ?? null,
    },
    surface: ir.surface ?? null,
    figma: {
      intendedUse: "figma-library-materialization",
      documentationFrame: `${ir.name} / Documentation`,
      componentSetName: ir.name,
      propertySource: "IR styledProps + variants + states + behavior",
    },
  };
}

function generateComponentReadme(ir: ComponentIR): string {
  return `# ${ir.name}\n\nGenerated Figma descriptor for ${ir.name}.\n\nThis file is emitted by \`@full-stack-ds/codegen --target=figma\` and is intended to be consumed by \`@full-stack-ds/figma-plugin\`.\n\nThe descriptor is a transfer artifact, not the source of truth. Edit the component contract instead.\n`;
}
