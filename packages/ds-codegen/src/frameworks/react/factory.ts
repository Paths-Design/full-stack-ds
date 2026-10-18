import { emitBoxModelBoundaryCss } from '../../box-model.js';
import { INTERACTION_RUNTIME_SOURCE } from "../../interaction-runtime.js";
/**
 * React FrameworkEmitter implementation.
 *
 * Translates `ComponentIR` into the file shape the `@full-stack-ds/react`
 * package expects. Every emitted file carries `@generated`/`@custom`
 * preservation markers (see `preserve.ts`); the CLI merges new output
 * with existing content section-by-section so hand-authored regions
 * survive regeneration.
 */
import fs from "node:fs";
import path from "node:path";
import { emitCss, emitTokensCss } from "../../css.js";
import type {
  EmitOptions,
  FrameworkEmitter,
  GeneratedFile,
} from "../../emitter.js";
import type { ComponentIR } from "../../ir.js";
import type { PrimitiveIR } from "../../primitive-contract.js";
import { hasMarkers, splitSections } from "../../preserve.js";
import { generateReactComponentSource } from "./component-source.js";
import {
  generateReactStackPrimitiveCss,
  generateReactStackPrimitiveSource,
} from "./primitive-source.js";
import { generateReactHookSource } from "./hook-source.js";
import { generateBarrel, generateReactTest } from "./tests.js";
import { isSurfaceComponent } from "./surface-emit.js";

export interface ReactEmitterOptions {
  /**
   * Relative import path from each generated component folder to the Stack
   * primitive module. Resolved by the CLI from `Stack.primitive.json`.
   */
  stackImportRelative: string;
}

export function createReactEmitter(
  options: ReactEmitterOptions,
): FrameworkEmitter {
  const { stackImportRelative } = options;

  return {
    id: "react",
    shipsContentTransformRuntime: true,

    emitComponent(ir: ComponentIR, _opts: EmitOptions): GeneratedFile[] {
      const tsx = generateReactComponentSource(ir, stackImportRelative);
      const css = emitCss(ir);
      const tokensCss = emitTokensCss(ir);
      return [
        {
          relativePath: `${ir.name}/${ir.name}.tsx`,
          contents: tsx,
          preservable: true,
        },
        {
          relativePath: `${ir.name}/${ir.name}.css`,
          contents: css,
          preservable: true,
        },
        {
          // Two-hop indirection slot declarations. Imported by .css
          // at the top of the file; brands/themes override slots here.
          relativePath: `${ir.name}/${ir.name}.tokens.css`,
          contents: tokensCss,
          preservable: true,
        },
      ];
    },

    emitTests(ir: ComponentIR, opts: EmitOptions): GeneratedFile[] {
      return [
        {
          relativePath: `${ir.name}/__tests__/${ir.name}.test.tsx`,
          contents: generateReactTest(ir, {
            preservedCustomTests: readPreservedCustomTests(
              path.join(
                opts.componentsRoot,
                ir.name,
                "__tests__",
                `${ir.name}.test.tsx`,
              ),
            ),
          }),
          preservable: true,
        },
      ];
    },

    emitPrimitives(ir: PrimitiveIR, _opts: EmitOptions): GeneratedFile[] {
      const base = ir.name.toLowerCase();
      return [
        { relativePath: "box-model.css", contents: emitBoxModelBoundaryCss() },
        { relativePath: "interaction.ts", contents: INTERACTION_RUNTIME_SOURCE },
        {
          relativePath: `${base}.tsx`,
          contents: generateReactStackPrimitiveSource(ir),
        },
        {
          relativePath: `${base}.css`,
          contents: generateReactStackPrimitiveCss(ir),
        },
      ];
    },

    emitHook(ir: ComponentIR, _opts: EmitOptions): GeneratedFile[] {
      // Surface-family components import substrate hooks
      // (useAnchoredSurface) directly from the primitives package
      // and do NOT emit a per-component useX hook. The compound
      // source owns its own state plumbing.
      if (isSurfaceComponent(ir)) return [];
      const source = generateReactHookSource(ir);
      if (!source) return [];
      return [
        {
          relativePath: `${ir.name}/use${ir.name}.ts`,
          contents: source,
          preservable: true,
        },
      ];
    },

    emitBarrel(componentNames: string[]): string {
      return generateBarrel(componentNames);
    },

    discoverComponentIds(componentsRoot: string): string[] {
      if (!fs.existsSync(componentsRoot)) return [];
      return fs.readdirSync(componentsRoot).filter((d) => {
        const tsx = path.join(componentsRoot, d, `${d}.tsx`);
        return fs.existsSync(tsx);
      });
    },
  };
}

/**
 * Concatenated `@custom` region bodies of an existing generated file, or
 * "" when absent/legacy. tests.ts scans this text so a preserved
 * hand-written suite keeps the imports it renders. CODEGEN-EMIT-LINT-HYGIENE-01.
 */
function readPreservedCustomTests(absPath: string): string {
  let existing: string;
  try {
    existing = fs.readFileSync(absPath, "utf-8");
  } catch {
    return "";
  }
  if (!hasMarkers(existing)) return "";
  return splitSections(existing)
    .filter(
      (s) => s.kind === "custom" && s.id !== undefined && s.body.trim().length > 0,
    )
    .map((s) => s.body)
    .join("\n");
}
