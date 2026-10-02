/**
 * Framework emitter contract.
 *
 * The codegen pipeline is `validatedContract -> ComponentIR -> emitter -> files`.
 * This module defines the strategy interface that lets every framework
 * (React, Vue, Lit, Svelte, Angular, Figma) plug in without changing the core CLI.
 *
 * We deliberately avoid a class hierarchy or DI container — emitters are
 * factory functions that return a small object of pure handlers. The CLI
 * looks emitters up by `id` from a registry.
 */

import type { ComponentIR } from "./ir.js";
import type { PrimitiveIR } from "./primitive-contract.js";

export type BuiltinTargetId =
  | "react"
  | "vue"
  | "lit"
  | "svelte"
  | "angular"
  | "figma"
  | "react-native"
  | "swiftui"
  | "jetpack-compose"
  | "unity"
  | "godot"
  | "gpui";
export type TargetId = string;

/**
 * One generated file. `relativePath` is relative to the target package's
 * `src/components/` (or equivalent root). Emitters never resolve absolute
 * paths — the CLI joins them with each target's package root.
 */
export interface GeneratedFile {
  relativePath: string;
  contents: string;
  /**
   * Hint about whether the file is "preservable" — i.e. the CLI should
   * skip rewriting it when an existing on-disk version contains
   * hand-authored enhancements.
   */
  preservable?: boolean;
}

export interface EmitOptions {
  /** Absolute filesystem path to the output package's components root. */
  componentsRoot: string;
  /** Absolute filesystem path to the contracts directory (read-only). */
  contractsRoot: string;
  /** Per-target naming overrides. */
  naming?: {
    /** File name for the components barrel (defaults to `index.ts`). */
    barrelFile?: string;
  };
}

/**
 * Strategy interface for a framework emitter. Each emitter is responsible
 * for translating a `ComponentIR` into framework-specific files.
 *
 * Per-target file extensions and discovery (e.g. `.tsx` vs `.vue`) are
 * declared via `discoverComponentIds`, so the CLI's barrel logic stays
 * target-agnostic.
 *
 * Preservation across regenerations is handled centrally by the CLI via
 * `preserve.ts` section markers; emitters do not implement skip logic.
 */
export interface FrameworkEmitter {
  readonly id: TargetId;

  /** Files representing the component implementation (TSX, SFC, etc.). */
  emitComponent(ir: ComponentIR, opts: EmitOptions): GeneratedFile[];

  /** Files representing the component test suite. */
  emitTests(ir: ComponentIR, opts: EmitOptions): GeneratedFile[];

  /**
   * Files representing the shared layout primitive (Stack), lowered from the
   * primitive contract IR into this framework's idiomatic source. Paths are
   * relative to the target package's primitives root (a sibling of the
   * components root). Optional — targets that do not emit a web primitive
   * (figma, react-native) omit it. Emitters must derive all layout facts
   * (class prefix, display map, axis map, token gap) from the IR, never from
   * hand-authored per-primitive lore.
   */
  emitPrimitives?(ir: PrimitiveIR, opts: EmitOptions): GeneratedFile[];

  /**
   * True when this target realizes IR content-transform facts (the web DOM
   * targets) and therefore ships the shared transform runtime — the
   * byte-identical `highlight/tokenize.ts` module — in its primitives root.
   * Targets that degrade transforms to plain text (figma, react-native,
   * non-web prototypes) omit it. The CLI writes the runtime once per build
   * for every shipping target, mirroring `emitPrimitives` — unconditional
   * emission keeps the five package copies identical by construction
   * (FEAT-CODEBLOCK-HIGHLIGHT-01 invariant).
   */
  readonly shipsContentTransformRuntime?: boolean;

  /**
   * Files representing the component's behavior hook/composable/service.
   * Optional — emitters that don't have a separate behavior unit (or
   * contracts without behavior fields) return `[]` or omit the method.
   */
  emitHook?(ir: ComponentIR, opts: EmitOptions): GeneratedFile[];

  /**
   * Body of the components barrel file given a list of component names.
   * Optionally receives the absolute components root so emitters that need
   * to enumerate per-component sub-files (e.g. Vue compound-part SFCs that
   * each live in their own `.vue` file) can scan the filesystem.
   */
  emitBarrel(componentNames: string[], componentsRoot?: string): string;

  /** Identify which components currently exist in the target's package. */
  discoverComponentIds(componentsRoot: string): string[];
}

/** Built-in target ids. Registry admission is data-driven; this is not the full target universe. */
export const KNOWN_TARGETS: readonly BuiltinTargetId[] = [
  "react",
  "vue",
  "lit",
  "svelte",
  "angular",
  "figma",
  "react-native",
  "swiftui",
  "jetpack-compose",
  "unity",
  "godot",
  "gpui",
];

export function isBuiltinTargetId(value: string): value is BuiltinTargetId {
  return (KNOWN_TARGETS as readonly string[]).includes(value);
}

export function assertTargetIdSyntax(value: string): void {
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(value)) {
    throw new Error(
      `Target id "${value}" must be lowercase identifier text: letters, numbers, '.', '_', '-'.`,
    );
  }
}

/**
 * Parse a CLI `--target=<value>` argument. Accepts a single id, a
 * comma-separated list, or `all`. Returns the deduplicated, ordered list
 * of requested targets, or throws on invalid input.
 */
export function parseTargetArg(
  raw: string | undefined,
  available: readonly TargetId[],
): TargetId[] {
  if (available.length === 0) {
    throw new Error("No targets are registered.");
  }
  if (!raw || raw.length === 0) {
    return available.includes("react") ? ["react"] : [available[0]!];
  }
  if (raw === "all") return [...available];

  const requested = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const result: TargetId[] = [];
  const seen = new Set<TargetId>();
  for (const entry of requested) {
    assertTargetIdSyntax(entry);
    if (!available.includes(entry)) {
      throw new Error(
        `Target "${entry}" is not registered. Registered targets: ${available.join(", ")}.`,
      );
    }
    if (!seen.has(entry)) {
      seen.add(entry);
      result.push(entry);
    }
  }
  return result;
}
