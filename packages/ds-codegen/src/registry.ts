/**
 * Framework emitter registry.
 *
 * Targets are configured here so the CLI can ask "which packages do you
 * generate into for `react`/`vue`/...". Each executable target binds a
 * `FrameworkEmitter` to an output package root.
 *
 * The registry also records declared target-pack metadata for non-executable
 * local packs. Those packs may be validated and described, but they are not
 * returned from `available()` and cannot be selected for generation until a
 * later executable adapter slice admits them.
 */
import fs from "node:fs";
import { createGpuiEmitter } from "./frameworks/gpui/factory.js";
import { createGodotEmitter } from "./frameworks/godot/factory.js";
import { createUnityEmitter } from "./frameworks/unity/factory.js";
import path from "node:path";
import type { BuiltinTargetId, FrameworkEmitter, TargetId } from "./emitter.js";
import { createAngularEmitter } from "./frameworks/angular/factory.js";
import { createFigmaEmitter } from "./frameworks/figma/factory.js";
import { createJetpackComposeEmitter } from "./frameworks/jetpack-compose/factory.js";
import { createLitEmitter } from "./frameworks/lit/factory.js";
import { createReactNativeEmitter } from "./frameworks/react-native/factory.js";
import { createReactEmitter } from "./frameworks/react/factory.js";
import { createSvelteEmitter } from "./frameworks/svelte/factory.js";
import { createSwiftUIEmitter } from "./frameworks/swift/swiftui/factory.js";
import { createVueEmitter } from "./frameworks/vue/factory.js";
import { readReactStackImportFromPrimitiveContract } from "./primitive-contract.js";
import { getBuiltinTargetPackManifest } from "./target-packs/builtin.js";
import {
  configuredBuiltinTargets,
  configuredLocalTargets,
  loadTargetRegistryConfigV1,
} from "./target-packs/config.js";
import {
  loadLocalTargetPackManifestV1,
  type LocalTargetPackManifestLoadResultV1,
} from "./target-packs/local.js";
import {
  assertTargetPackManifestV1,
  type TargetPackManifestV1,
} from "./target-packs/manifest.js";
import type { FrameworkId } from "./validation/types.js";

export interface TargetBinding {
  id: TargetId;
  emitter: FrameworkEmitter;
  /** Rail framework id when this target participates in the current five-framework admission rail. */
  railFrameworkId?: FrameworkId;
  /** Governed target-pack manifest that describes this target's contract. */
  targetPack: TargetPackManifestV1;
  /** Absolute path to the components root for this target. */
  componentsRoot: string;
  /** File name for the components barrel within the components root. */
  barrelFile: string;
  /**
   * Declared-admission allowlist from fsds.targets.json (`components`),
   * when the target declares one. Full-corpus generation runs filter to
   * this set; explicit component requests do not.
   */
  admittedComponents?: readonly string[];
}

export interface TargetDeclaration {
  id: TargetId;
  sourceKind: "builtin" | "local";
  executable: boolean;
  targetPack: TargetPackManifestV1;
  local?: LocalTargetPackManifestLoadResultV1;
}

export interface RegistryOptions {
  /** Absolute path to the workspace root (where `packages/` lives). */
  workspaceRoot: string;
  /** Absolute path to the contracts directory. */
  contractsRoot: string;
  /**
   * Built-in targets requested explicitly by the current CLI invocation.
   * These become executable for this run without joining the configured
   * default target set that powers --target=all.
   */
  explicitBuiltinTargets?: readonly BuiltinTargetId[];
}

export interface TargetRegistry {
  /** Executable targets selectable by `--target`. */
  available(): TargetId[];
  /** All declared target packs, including metadata-only local packs. */
  declared(): TargetId[];
  get(id: TargetId): TargetBinding;
  has(id: TargetId): boolean;
  describe(id: TargetId): TargetPackManifestV1;
  describeDeclaration(id: TargetId): TargetDeclaration;
}

type BuiltinTargetBindingInput = Omit<TargetBinding, "id" | "targetPack"> & {
  id: BuiltinTargetId;
};

/**
 * Build the default registry. Built-in targets without a corresponding
 * workspace package (e.g. before `packages/ds-vue` exists) are simply omitted
 * from executable availability. Local target packs are loaded as governed
 * metadata only and deliberately remain non-executable for this slice.
 */
export function createDefaultRegistry(opts: RegistryOptions): TargetRegistry {
  const loadedConfig = loadTargetRegistryConfigV1(opts.workspaceRoot);
  const configuredTargets = new Set([
    ...configuredBuiltinTargets(loadedConfig.config),
    ...(opts.explicitBuiltinTargets ?? []),
  ]);
  const bindings = new Map<TargetId, TargetBinding>();
  const declarations = new Map<TargetId, TargetDeclaration>();
  const declaredComponents = (id: string): readonly string[] | undefined =>
    loadedConfig.config.targets.find((t) => t.id === id)?.components;

  // React target
  const reactRoot = path.join(
    opts.workspaceRoot,
    "packages",
    "ds-react",
    "src",
    "components",
  );
  if (configuredTargets.has("react")) {
    registerBuiltinTarget(bindings, declarations, {
      id: "react",
      railFrameworkId: "react",
      emitter: createReactEmitter({
        stackImportRelative: readReactStackImportFromPrimitiveContract(
          opts.contractsRoot,
        ),
      }),
      componentsRoot: reactRoot,
      barrelFile: "index.ts",
      admittedComponents: declaredComponents("react"),
    });
  }

  // Vue target — registered only when the package exists on disk.
  const vueRoot = path.join(
    opts.workspaceRoot,
    "packages",
    "ds-vue",
    "src",
    "components",
  );
  if (
    configuredTargets.has("vue") &&
    workspaceExists(path.join(opts.workspaceRoot, "packages", "ds-vue"))
  ) {
    registerBuiltinTarget(bindings, declarations, {
      id: "vue",
      railFrameworkId: "vue",
      emitter: createVueEmitter(),
      componentsRoot: vueRoot,
      barrelFile: "index.ts",
      admittedComponents: declaredComponents("vue"),
    });
  }

  // Angular target
  const angularRoot = path.join(
    opts.workspaceRoot,
    "packages",
    "ds-angular",
    "src",
    "components",
  );
  if (
    configuredTargets.has("angular") &&
    workspaceExists(path.join(opts.workspaceRoot, "packages", "ds-angular"))
  ) {
    registerBuiltinTarget(bindings, declarations, {
      id: "angular",
      railFrameworkId: "angular",
      emitter: createAngularEmitter(),
      componentsRoot: angularRoot,
      barrelFile: "index.ts",
      admittedComponents: declaredComponents("angular"),
    });
  }

  // Lit target
  const litRoot = path.join(
    opts.workspaceRoot,
    "packages",
    "ds-lit",
    "src",
    "components",
  );
  if (
    configuredTargets.has("lit") &&
    workspaceExists(path.join(opts.workspaceRoot, "packages", "ds-lit"))
  ) {
    registerBuiltinTarget(bindings, declarations, {
      id: "lit",
      railFrameworkId: "lit",
      emitter: createLitEmitter(),
      componentsRoot: litRoot,
      barrelFile: "index.ts",
      admittedComponents: declaredComponents("lit"),
    });
  }

  // Svelte target
  const svelteRoot = path.join(
    opts.workspaceRoot,
    "packages",
    "ds-svelte",
    "src",
    "components",
  );
  if (
    configuredTargets.has("svelte") &&
    workspaceExists(path.join(opts.workspaceRoot, "packages", "ds-svelte"))
  ) {
    registerBuiltinTarget(bindings, declarations, {
      id: "svelte",
      railFrameworkId: "svelte",
      emitter: createSvelteEmitter(),
      componentsRoot: svelteRoot,
      barrelFile: "index.ts",
      admittedComponents: declaredComponents("svelte"),
    });
  }

  // Figma target — descriptor output consumed by the desktop plugin package.
  const figmaRoot = path.join(
    opts.workspaceRoot,
    "packages",
    "ds-figma-plugin",
    "src",
    "generated",
    "components",
  );
  if (
    configuredTargets.has("figma") &&
    workspaceExists(path.join(opts.workspaceRoot, "packages", "ds-figma-plugin"))
  ) {
    registerBuiltinTarget(bindings, declarations, {
      id: "figma",
      emitter: createFigmaEmitter(),
      componentsRoot: figmaRoot,
      barrelFile: "index.ts",
      admittedComponents: declaredComponents("figma"),
    });
  }

  // React Native target — default-rail native target when declared in
  // fsds.targets.json. Still experimental in maturity because simulator/device
  // runtime and native visual parity are outside the current rail.
  const reactNativeRoot = path.join(
    opts.workspaceRoot,
    "packages",
    "ds-react-native",
    "src",
    "components",
  );
  if (
    configuredTargets.has("react-native") &&
    workspaceExists(path.join(opts.workspaceRoot, "packages", "ds-react-native"))
  ) {
    registerBuiltinTarget(bindings, declarations, {
      id: "react-native",
      railFrameworkId: "react-native",
      emitter: createReactNativeEmitter(),
      componentsRoot: reactNativeRoot,
      barrelFile: "index.ts",
      admittedComponents: declaredComponents("react-native"),
    });
  }

  // SwiftUI target — registered in fsds.targets.json and therefore selected
  // by --target=all, with that registry's component allowlist bounding corpus
  // emission. No railFrameworkId: registration/default selection do not make
  // it a member of the AdmissionDescriptor rail. The output root is a SwiftPM
  // package (Package.swift marker), not a pnpm workspace package.
  const swiftUIRoot = path.join(
    opts.workspaceRoot,
    "packages",
    "ds-swiftui",
    "Sources",
    "DsSwiftUI",
    "Components",
  );
  if (
    configuredTargets.has("swiftui") &&
    workspaceExists(path.join(opts.workspaceRoot, "packages", "ds-swiftui"))
  ) {
    registerBuiltinTarget(bindings, declarations, {
      id: "swiftui",
      emitter: createSwiftUIEmitter(),
      componentsRoot: swiftUIRoot,
      barrelFile: "Components.generated.swift",
      admittedComponents: declaredComponents("swiftui"),
    });
  }

  // Jetpack Compose target — registered in fsds.targets.json and selected by
  // --target=all under its component allowlist, the Compose twin of the
  // SwiftUI registration. No railFrameworkId: it remains outside the
  // AdmissionDescriptor rail. The output root is a Gradle package
  // (settings.gradle.kts marker), not a pnpm workspace package.
  const jetpackComposeRoot = path.join(
    opts.workspaceRoot,
    "packages",
    "ds-jetpack-compose",
    "library",
    "src",
    "main",
    "kotlin",
    "com",
    "fullstackds",
    "components",
  );
  if (
    configuredTargets.has("jetpack-compose") &&
    workspaceExists(
      path.join(opts.workspaceRoot, "packages", "ds-jetpack-compose"),
    )
  ) {
    registerBuiltinTarget(bindings, declarations, {
      id: "jetpack-compose",
      emitter: createJetpackComposeEmitter(),
      componentsRoot: jetpackComposeRoot,
      barrelFile: "Components.generated.kt",
      admittedComponents: declaredComponents("jetpack-compose"),
    });
  }

  if (configuredTargets.has("unity") && workspaceExists(path.join(opts.workspaceRoot, "packages/ds-unity"))) {
    registerBuiltinTarget(bindings, declarations, {
      id: "unity",
      emitter: createUnityEmitter(),
      componentsRoot: path.join(opts.workspaceRoot, "packages/ds-unity/Runtime/Components"),
      barrelFile: "Components.generated.cs",
      admittedComponents: declaredComponents("unity"),
    });
  }

  if (configuredTargets.has("godot") && workspaceExists(path.join(opts.workspaceRoot, "packages/ds-godot"))) {
    registerBuiltinTarget(bindings, declarations, {
      id: "godot",
      emitter: createGodotEmitter(),
      componentsRoot: path.join(opts.workspaceRoot, "packages/ds-godot/addons/full_stack_ds/components"),
      barrelFile: "catalog.gd",
      admittedComponents: declaredComponents("godot"),
    });
  }

  if (configuredTargets.has("gpui") && workspaceExists(path.join(opts.workspaceRoot, "packages/ds-gpui"))) {
    registerBuiltinTarget(bindings, declarations, {
      id: "gpui",
      emitter: createGpuiEmitter(),
      componentsRoot: path.join(opts.workspaceRoot, "packages/ds-gpui/src/components"),
      barrelFile: "mod.rs",
      admittedComponents: declaredComponents("gpui"),
    });
  }

  for (const target of configuredLocalTargets(loadedConfig.config)) {
    registerLocalTargetDeclaration(declarations, opts.workspaceRoot, target);
  }

  return {
    available() {
      return [...bindings.keys()];
    },
    declared() {
      return [...declarations.keys()];
    },
    get(id) {
      const b = bindings.get(id);
      if (!b) throw new Error(`Target "${id}" is not executable.`);
      return b;
    },
    has(id) {
      return bindings.has(id);
    },
    describe(id) {
      return getDeclaration(declarations, id).targetPack;
    },
    describeDeclaration(id) {
      return getDeclaration(declarations, id);
    },
  };
}

function registerBuiltinTarget(
  bindings: Map<TargetId, TargetBinding>,
  declarations: Map<TargetId, TargetDeclaration>,
  binding: BuiltinTargetBindingInput,
): void {
  const targetPack = getBuiltinTargetPackManifest(binding.id);
  assertTargetPackManifestV1(targetPack);
  if (targetPack.target.id !== binding.id) {
    throw new Error(
      `Target-pack manifest id ${targetPack.target.id} does not match registry id ${binding.id}.`,
    );
  }
  const executableBinding = { ...binding, targetPack };
  bindings.set(binding.id, executableBinding);
  declarations.set(binding.id, {
    id: binding.id,
    sourceKind: "builtin",
    executable: true,
    targetPack,
  });
}

function registerLocalTargetDeclaration(
  declarations: Map<TargetId, TargetDeclaration>,
  workspaceRoot: string,
  target: Parameters<typeof loadLocalTargetPackManifestV1>[1],
): void {
  const loaded = loadLocalTargetPackManifestV1(workspaceRoot, target);
  declarations.set(target.id, {
    id: target.id,
    sourceKind: "local",
    executable: false,
    targetPack: loaded.targetPack,
    local: loaded,
  });
}

function getDeclaration(
  declarations: Map<TargetId, TargetDeclaration>,
  id: TargetId,
): TargetDeclaration {
  const declaration = declarations.get(id);
  if (!declaration) throw new Error(`Target "${id}" is not declared.`);
  return declaration;
}

/**
 * A target package exists when it carries a workspace marker. pnpm packages
 * mark with `package.json`; SwiftPM packages (non-pnpm output roots) mark
 * with `Package.swift`; Gradle packages mark with `settings.gradle.kts`.
 * Existing pnpm target gating is unchanged — a package without any marker is
 * still omitted from executable availability.
 */
function workspaceExists(packageRoot: string): boolean {
  return (
    fs.existsSync(path.join(packageRoot, "package.json")) ||
    fs.existsSync(path.join(packageRoot, "Package.swift")) ||
    fs.existsSync(path.join(packageRoot, "settings.gradle.kts")) ||
    fs.existsSync(path.join(packageRoot, "Cargo.toml"))
  );
}
