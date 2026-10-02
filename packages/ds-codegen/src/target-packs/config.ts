import fs from "node:fs";
import path from "node:path";
import { KNOWN_TARGETS, assertTargetIdSyntax, isBuiltinTargetId } from "../emitter.js";
import type { BuiltinTargetId } from "../emitter.js";

export const TARGET_REGISTRY_CONFIG_SCHEMA_VERSION = "fsds.target-registry.v1" as const;
export const TARGET_REGISTRY_CONFIG_FILENAME = "fsds.targets.json" as const;

export type TargetRegistryConfigSourceV1 =
  | { kind: "builtin" }
  | {
      kind: "local";
      /** Package root relative to the workspace root. */
      packageRoot: string;
      /** Manifest path relative to packageRoot. */
      manifest: string;
    };

export interface TargetRegistryConfigTargetV1 {
  id: string;
  source: TargetRegistryConfigSourceV1;
  /**
   * Declared-admission allowlist: the only components full-corpus runs
   * (`--target=all`, bare `generate`, `governed:rail`) emit for this
   * target. Absent = full corpus. Explicit single-component requests
   * bypass the allowlist and surface the emitter's own errors — the
   * allowlist scopes default generation, never silences fail-loud.
   */
  components?: readonly string[];
}

export interface TargetRegistryConfigV1 {
  schemaVersion: typeof TARGET_REGISTRY_CONFIG_SCHEMA_VERSION;
  targets: readonly TargetRegistryConfigTargetV1[];
}

export const DEFAULT_TARGET_REGISTRY_CONFIG: TargetRegistryConfigV1 = {
  schemaVersion: TARGET_REGISTRY_CONFIG_SCHEMA_VERSION,
  // The no-fsds.targets.json fallback preserves the historical builtin set by
  // excluding React Native and SwiftUI. In this repository the committed
  // registry is authoritative and includes both; do not infer current target
  // selection from this missing-config fallback.
  targets: KNOWN_TARGETS.filter((id) => id !== "react-native" && id !== "swiftui" && id !== "unity" && id !== "godot" && id !== "gpui").map((id) => ({
    id,
    source: { kind: "builtin" },
  })),
};

export type LoadedTargetRegistryConfigV1 = {
  config: TargetRegistryConfigV1;
  path: string | null;
};

export function loadTargetRegistryConfigV1(workspaceRoot: string): LoadedTargetRegistryConfigV1 {
  const configPath = path.join(workspaceRoot, TARGET_REGISTRY_CONFIG_FILENAME);
  if (!fs.existsSync(configPath)) {
    return { config: DEFAULT_TARGET_REGISTRY_CONFIG, path: null };
  }
  const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8")) as unknown;
  assertTargetRegistryConfigV1(parsed);
  return { config: parsed, path: configPath };
}

export function assertTargetRegistryConfigV1(
  value: unknown,
): asserts value is TargetRegistryConfigV1 {
  const config = asRecord(value, "registry config");
  if (config.schemaVersion !== TARGET_REGISTRY_CONFIG_SCHEMA_VERSION) {
    throw new Error(
      `schemaVersion must be ${JSON.stringify(TARGET_REGISTRY_CONFIG_SCHEMA_VERSION)}.`,
    );
  }
  const targets = assertArray(config.targets, "targets");
  if (targets.length === 0) {
    throw new Error("targets must include at least one target.");
  }
  const seen = new Set<string>();
  for (const [index, target] of targets.entries()) {
    assertConfigTarget(target, `targets[${index}]`);
    const id = (target as TargetRegistryConfigTargetV1).id;
    if (seen.has(id)) {
      throw new Error(`Duplicate target id in registry config: ${id}.`);
    }
    seen.add(id);
    const components = (target as TargetRegistryConfigTargetV1).components;
    if (components !== undefined) {
      const componentSeen = new Set<string>();
      for (const [cIndex, component] of components.entries()) {
        if (typeof component !== "string" || component.length === 0) {
          throw new Error(`targets[${index}].components[${cIndex}] must be a non-empty string.`);
        }
        if (componentSeen.has(component)) {
          throw new Error(`Duplicate component "${component}" in targets[${index}].components.`);
        }
        componentSeen.add(component);
      }
    }
  }
}

export function configuredBuiltinTargets(config: TargetRegistryConfigV1): BuiltinTargetId[] {
  const ids: BuiltinTargetId[] = [];
  for (const target of config.targets) {
    if (target.source.kind !== "builtin") continue;
    if (!isBuiltinTargetId(target.id)) {
      throw new Error(
        `Target "${target.id}" is declared as builtin but is not one of: ${KNOWN_TARGETS.join(", ")}.`,
      );
    }
    ids.push(target.id);
  }
  return ids;
}

export function configuredLocalTargets(
  config: TargetRegistryConfigV1,
): TargetRegistryConfigTargetV1[] {
  return config.targets.filter((target) => target.source.kind === "local");
}

function assertConfigTarget(value: unknown, fieldPath: string): void {
  const target = asRecord(value, fieldPath);
  const id = assertNonEmptyString(target.id, `${fieldPath}.id`);
  assertTargetIdSyntax(id);
  const source = asRecord(target.source, `${fieldPath}.source`);
  if (source.kind === "builtin") {
    return;
  }
  if (source.kind === "local") {
    assertRelativePath(
      assertNonEmptyString(source.packageRoot, `${fieldPath}.source.packageRoot`),
      `${fieldPath}.source.packageRoot`,
    );
    assertRelativePath(
      assertNonEmptyString(source.manifest, `${fieldPath}.source.manifest`),
      `${fieldPath}.source.manifest`,
    );
    return;
  }
  throw new Error(`${fieldPath}.source.kind must be builtin or local.`);
}

function assertRelativePath(value: string, fieldPath: string): void {
  if (path.isAbsolute(value)) {
    throw new Error(`${fieldPath} must be a relative path.`);
  }
  const normalized = path.posix.normalize(value.replace(/\\/g, "/"));
  if (normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`${fieldPath} must not escape its root.`);
  }
}

function asRecord(value: unknown, fieldPath: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${fieldPath} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function assertArray(value: unknown, fieldPath: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldPath} must be an array.`);
  }
  return value;
}

function assertNonEmptyString(value: unknown, fieldPath: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${fieldPath} must be a non-empty string.`);
  }
  return value;
}
