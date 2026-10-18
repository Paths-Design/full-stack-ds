/**
 * SwiftUI FrameworkEmitter.
 *
 * Targets SwiftUI: each component emits a `View` struct (+ optional
 * `ObservableObject` behavior class) into a `${Name}.swift` file. Compound
 * parts (e.g. `DialogHeader`) become sibling `View` structs in the same
 * file, paralleling the Vue/Svelte single-file convention.
 *
 * Registered as an explicit-only builtin target (`--target=swiftui`): the
 * emitter implements the native-collapse path only (Switch/ToggleSwitch via
 * `native-toggle-affordance`); multi-part anatomy and anchored surfaces
 * throw explicit not-implemented errors, so corpus-wide generation and
 * default-rail admission stay out of scope until those paths exist.
 *
 * Deliberate emissions gaps in this slice:
 *   - Tests return `[]`: an XCTest file cannot live inside the SwiftPM
 *     library target (it would fail to link). Generated tests arrive with
 *     a dedicated test target in a later slice.
 *   - No behavior files: the controllable-state channel pattern lives
 *     inside the View struct (Binding + @State + onChange), so
 *     `generateSwiftUIHookSource` returns null until a component needs a
 *     shared ObservableObject (focus trap, portal, dismissal).
 */
import fs from "node:fs";
import path from "node:path";
import type {
  EmitOptions,
  FrameworkEmitter,
  GeneratedFile,
} from "../../../emitter.js";
import type { ComponentIR } from "../../../ir.js";
import type { PrimitiveIR } from "../../../primitive-contract.js";
import { generateSwiftUIComponentSource } from "./component-source.js";
import { generateSwiftUIPrimitiveFiles } from "./primitive-source.js";
import { generateGlyphCatalogFile } from "./icon-glyph.js";
import { generateSwiftUIHookSource } from "./hook-source.js";
import { generateSwiftUIBarrel } from "./barrel.js";
import {
  generateSwiftUISurfaceFiles,
  isSurfaceComponent,
} from "./surface-emit.js";
import { collectCorpusMessages, generateXcstrings } from "../../../message-catalog.js";

/** Relative to the `Sources/DsSwiftUI/primitives` root: `packages/ds-swiftui/Localization/`. */
export const SWIFTUI_XCSTRINGS_RELATIVE_PATH = "../../../Localization/FsdsComponents.xcstrings";

export function createSwiftUIEmitter(): FrameworkEmitter {
  return {
    id: "swiftui",

    emitComponent(ir: ComponentIR, _opts: EmitOptions): GeneratedFile[] {
      if (isSurfaceComponent(ir)) {
        const surfaceFiles = generateSwiftUISurfaceFiles(ir);
        return [
          {
            relativePath: `${ir.name}/${ir.name}.swift`,
            contents: surfaceFiles.componentFile,
            preservable: true,
          },
        ];
      }
      const source = generateSwiftUIComponentSource(ir);
      return [
        {
          relativePath: `${ir.name}/${ir.name}.swift`,
          contents: source,
          preservable: true,
        },
      ];
    },

    emitTests(_ir: ComponentIR, _opts: EmitOptions): GeneratedFile[] {
      return [];
    },

    emitHook(ir: ComponentIR, _opts: EmitOptions): GeneratedFile[] {
      if (isSurfaceComponent(ir)) {
        const surfaceFiles = generateSwiftUISurfaceFiles(ir);
        if (!surfaceFiles.behaviorFile) return [];
        return [
          {
            relativePath: `${ir.name}/${ir.name}Behavior.swift`,
            contents: surfaceFiles.behaviorFile,
            preservable: true,
          },
        ];
      }
      const source = generateSwiftUIHookSource(ir);
      if (!source) return [];
      return [
        {
          relativePath: `${ir.name}/${ir.name}Behavior.swift`,
          contents: source,
          preservable: true,
        },
      ];
    },

    emitBarrel(componentNames: string[], componentsRoot?: string): string {
      return generateSwiftUIBarrel(componentNames, componentsRoot);
    },

    emitPrimitives(ir: PrimitiveIR, opts: EmitOptions): GeneratedFile[] {
      // Written to the `primitives/` root (sibling of `Components/`) by the
      // CLI's shared substrate pass; single-module SwiftPM target, so the
      // primitive is visible to every component without imports. The glyph
      // catalog rides the same channel — a shared substrate (like
      // FsdsTheme) that every iconGlyph surface composes. The reference
      // string catalog is corpus-wide too; it lands at the package root's
      // Localization/ directory, outside the SwiftPM target, because it is a
      // template host apps copy and translate — not a library resource.
      const files = [
        ...generateSwiftUIPrimitiveFiles(ir),
        ...(generateGlyphCatalogFile() ? [generateGlyphCatalogFile()!] : []),
      ];
      if (opts.contractsRoot) {
        files.push({
          relativePath: SWIFTUI_XCSTRINGS_RELATIVE_PATH,
          contents: generateXcstrings(collectCorpusMessages(opts.contractsRoot)),
        });
      }
      return files;
    },

    discoverComponentIds(componentsRoot: string): string[] {
      // SwiftPM compiles every .swift file under the target directory as one
      // module, so there is no import barrel to maintain — discovery exists
      // to list what the generator owns on disk (and gate barrel emission).
      if (!fs.existsSync(componentsRoot)) return [];
      const ids: string[] = [];
      for (const entry of fs.readdirSync(componentsRoot, {
        withFileTypes: true,
      })) {
        if (!entry.isDirectory()) continue;
        const source = path.join(componentsRoot, entry.name, `${entry.name}.swift`);
        if (fs.existsSync(source)) {
          ids.push(entry.name);
        }
      }
      return ids.sort();
    },
  };
}
