import { emitBoxModelBoundaryCss } from '../../box-model.js';
import { INTERACTION_RUNTIME_SOURCE } from "../../interaction-runtime.js";
/**
 * Vue 3 FrameworkEmitter (proof-of-concept).
 *
 * This emitter exists to validate that `ComponentIR` carries enough
 * framework-neutral information to produce a non-React target. Output
 * shape is a Single File Component (`.vue`) that composes the Vue
 * `Stack` primitive declared in `@full-stack-ds/vue/primitives`.
 *
 * Scope of this stub:
 *   - Component template + scoped style block.
 *   - Class recipe driven by `ComponentIR.classRecipe`.
 *   - Variant props with defaults.
 *   - No behavior generation (focus, keyboard, etc.) — those remain
 *     normalized metadata in IR until a real Vue consumer needs them.
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
import { collectContentTransforms } from "../../ir.js";
import { vueHighlightParts } from "../highlight-web-parts.js";
import type { PrimitiveIR } from "../../primitive-contract.js";
import {
  generateVueComponentSource,
  generateVueCompoundPartSource,
  generateVueCompoundStateParts,
  generateVueDisclosureStateParts,
} from "./component-source.js";
import { generateVueStackPrimitiveSource } from "./primitive-source.js";
import { generateVueHookSource } from "./hook-source.js";
import { generateVueBarrel } from "./barrel.js";
import { generateVueTest } from "./tests.js";
import { isCompoundStateContainer, isDisclosureContainer } from "../react/hook-source.js";
import {
  generateVueSurfaceFiles,
  isSurfaceComponent,
} from "./surface-emit.js";
import { generateVueSurfaceTest } from "./surface-tests.js";

export function createVueEmitter(): FrameworkEmitter {
  return {
    id: "vue",
    shipsContentTransformRuntime: true,

    emitComponent(ir: ComponentIR, _opts: EmitOptions): GeneratedFile[] {
      // F-2C-1: Presence-surface family — emits the compound API as
      // three SFCs (root, Trigger, Content) plus a composable in the
      // emitHook step.
      if (isSurfaceComponent(ir)) {
        const surfaceFiles = generateVueSurfaceFiles(ir);
        const css = emitCss(ir);
        const tokensCss = emitTokensCss(ir);
        return [
          { relativePath: `${ir.name}/${ir.name}.vue`, contents: surfaceFiles.rootSfc, preservable: true },
          { relativePath: `${ir.name}/${ir.name}.css`, contents: css, preservable: true },
          { relativePath: `${ir.name}/${ir.name}.tokens.css`, contents: tokensCss, preservable: true },
          { relativePath: `${ir.name}/${ir.name}Trigger.vue`, contents: surfaceFiles.triggerSfc, preservable: true },
          { relativePath: `${ir.name}/${ir.name}Content.vue`, contents: surfaceFiles.contentSfc, preservable: true },
        ];
      }
      const sfc = generateVueComponentSource(ir);
      const css = emitCss(ir);
      const tokensCss = emitTokensCss(ir);
      const files: GeneratedFile[] = [
        {
          relativePath: `${ir.name}/${ir.name}.vue`,
          contents: sfc,
          preservable: true,
        },
        {
          relativePath: `${ir.name}/${ir.name}.css`,
          contents: css,
          preservable: true,
        },
        {
          relativePath: `${ir.name}/${ir.name}.tokens.css`,
          contents: tokensCss,
          preservable: true,
        },
      ];
      for (const transform of collectContentTransforms(ir.dom)) {
        if (transform.transform !== "highlight" || !transform.linePart || !transform.gutterPart) continue;
        for (const part of vueHighlightParts(ir, transform)) {
          files.push({ relativePath: `${ir.name}/${part.name}.vue`, contents: part.content, preservable: false });
        }
      }

      if (isDisclosureContainer(ir)) {
        // Repeated-disclosure container (Accordion): emit Item/Trigger/Content
        // SFCs wired via provide/inject disclosure context.
        for (const part of generateVueDisclosureStateParts(ir)) {
          files.push({
            relativePath: `${ir.name}/${part.name}.vue`,
            contents: part.content,
            preservable: true,
          });
        }
      } else if (isCompoundStateContainer(ir)) {
        // Compound-state-container: emit sub-component SFCs (List, Tab, Panel)
        // that are wired via provide/inject context.
        for (const part of generateVueCompoundStateParts(ir)) {
          files.push({
            relativePath: `${ir.name}/${part.name}.vue`,
            contents: part.content,
            preservable: true,
          });
        }
      } else {
        // Legacy compound parts (e.g. ModalHeader, ModalBody) — each becomes
        // its own .vue file because SFCs only export their default component.
        for (const part of ir.compoundParts) {
          const subName = `${ir.name}${part.name[0].toUpperCase()}${part.name.slice(1)}`;
          files.push({
            relativePath: `${ir.name}/${subName}.vue`,
            contents: generateVueCompoundPartSource(ir.cssPrefix, part),
            preservable: true,
          });
        }
      }
      return files;
    },

    emitTests(ir: ComponentIR, _opts: EmitOptions): GeneratedFile[] {
      if (isSurfaceComponent(ir)) {
        return [
          {
            relativePath: `${ir.name}/__tests__/${ir.name}.test.ts`,
            contents: generateVueSurfaceTest(ir),
            preservable: true,
          },
        ];
      }
      return [
        {
          relativePath: `${ir.name}/__tests__/${ir.name}.test.ts`,
          contents: generateVueTest(ir),
          preservable: true,
        },
      ];
    },

    emitPrimitives(ir: PrimitiveIR, _opts: EmitOptions): GeneratedFile[] {
      return [
        { relativePath: "box-model.css", contents: emitBoxModelBoundaryCss() },
        { relativePath: "interaction.ts", contents: INTERACTION_RUNTIME_SOURCE },
        {
          relativePath: `${ir.name}.vue`,
          contents: generateVueStackPrimitiveSource(ir),
        },
      ];
    },

    emitHook(ir: ComponentIR, _opts: EmitOptions): GeneratedFile[] {
      if (isSurfaceComponent(ir)) {
        const surfaceFiles = generateVueSurfaceFiles(ir);
        return [
          {
            relativePath: `${ir.name}/use${ir.name}.ts`,
            contents: surfaceFiles.composable,
            preservable: true,
          },
        ];
      }
      const source = generateVueHookSource(ir);
      if (!source) return [];
      return [
        {
          relativePath: `${ir.name}/use${ir.name}.ts`,
          contents: source,
          preservable: true,
        },
      ];
    },

    emitBarrel(componentNames: string[], componentsRoot?: string): string {
      return generateVueBarrel(componentNames, componentsRoot);
    },

    discoverComponentIds(componentsRoot: string): string[] {
      if (!fs.existsSync(componentsRoot)) return [];
      return fs.readdirSync(componentsRoot).filter((d) => {
        const sfc = path.join(componentsRoot, d, `${d}.vue`);
        return fs.existsSync(sfc);
      });
    },
  };
}
