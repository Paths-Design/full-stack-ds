import type { BuiltinTargetId } from "../emitter.js";
import type { TargetPackManifestV1 } from "./manifest.js";
import { TARGET_PACK_MANIFEST_SCHEMA_VERSION } from "./manifest.js";

const WEB_DOM_CAPABILITIES = {
  components: true,
  tests: true,
  behavior: true,
  compoundParts: true,
  surface: true,
  tokens: "css-custom-properties",
  customRegions: true,
} as const;

const SAFE_BUILTIN_PERMISSIONS = {
  filesystem: "package-output-only",
  network: false,
  postinstall: false,
} as const;

export const BUILTIN_TARGET_PACKS: Readonly<Record<BuiltinTargetId, TargetPackManifestV1>> = {
  gpui: {
    schemaVersion: TARGET_PACK_MANIFEST_SCHEMA_VERSION,
    target: { id: "gpui", family: "native-view", label: "GPUI", maturity: "experimental" },
    compatibility: { codegenProtocol: "builtin-framework-emitter-v1", componentIR: "ComponentIR@v1", targetFamilyIR: "gpui-styled-anatomy@v1" },
    entrypoints: { emitter: "packages/ds-codegen/src/frameworks/gpui/factory.ts" },
    outputs: { componentsRoot: "src/components", barrelFile: "mod.rs", fileKinds: ["component-source", "barrel"] },
    capabilities: { components: true, tests: false, behavior: true, compoundParts: false, surface: false, tokens: "native-theme-module", customRegions: false },
    permissions: SAFE_BUILTIN_PERMISSIONS,
    admission: {
      commands: [{ check: "gpui-native-checks", command: ["node", "scripts/gpui-pilot.mjs"], scope: { packageRoot: "packages/ds-gpui/", extensions: [".rs"], coverage: "covered_by_package_check" } }],
      knownGaps: ["Registry allowlist only, pinned to published GPUI 0.2.2; outside the TypeScript admission rail and CI.", "Native checks record source inputs and named tests. A separate gallery witness is required for rendered pixels; full accessibility, form integration, arbitrary compound composition, upstream-main compatibility and cross-platform parity remain unverified. Excluded props and unsupported styles are listed in generated capability receipts."],
    },
  },
  godot: {
    schemaVersion: TARGET_PACK_MANIFEST_SCHEMA_VERSION,
    target: { id: "godot", family: "native-view", label: "Godot Control", maturity: "experimental" },
    compatibility: { codegenProtocol: "builtin-framework-emitter-v1", componentIR: "ComponentIR@v1", targetFamilyIR: "godot-control@pilot" },
    entrypoints: { emitter: "packages/ds-codegen/src/frameworks/godot/factory.ts" },
    outputs: { componentsRoot: "addons/full_stack_ds/components", barrelFile: "catalog.gd", fileKinds: ["component-source", "barrel"] },
    capabilities: { components: true, tests: false, behavior: true, compoundParts: true, surface: true, tokens: "native-theme-module", customRegions: false },
    permissions: SAFE_BUILTIN_PERMISSIONS,
    admission: {
      commands: [{ check: "godot-runtime-export", command: ["node", "scripts/godot-pilot.mjs"], scope: { packageRoot: "packages/ds-godot/", extensions: [".gd", ".tscn", ".tres"], coverage: "covered_by_package_check" } }],
      knownGaps: ["Pilot allowlist only; outside the TypeScript admission rail. Godot runtime/export checks are explicit local lanes, not CI.", "Only frozen semantic traces and loaded Theme foreground fallback values are covered. Other props, styling, accessibility and physical input remain outside admission."],
    },
  },
  unity: {
    schemaVersion: TARGET_PACK_MANIFEST_SCHEMA_VERSION,
    target: { id: "unity", family: "native-view", label: "Unity UI Toolkit", maturity: "experimental" },
    compatibility: { codegenProtocol: "builtin-framework-emitter-v1", componentIR: "ComponentIR@v1", targetFamilyIR: "unity-ui-toolkit@pilot" },
    entrypoints: { emitter: "packages/ds-codegen/src/frameworks/unity/factory.ts" },
    outputs: { componentsRoot: "Runtime/Components", barrelFile: "Components.generated.cs", fileKinds: ["component-source", "barrel"] },
    capabilities: { components: true, tests: false, behavior: true, compoundParts: true, surface: true, tokens: "native-theme-module", customRegions: false },
    permissions: SAFE_BUILTIN_PERMISSIONS,
    admission: {
      commands: [{ check: "unity-editmode", command: ["node", "scripts/unity-tests.mjs"], scope: { packageRoot: "packages/ds-unity/", extensions: [".cs", ".uxml"], coverage: "covered_by_package_check" } }],
      knownGaps: ["Pilot allowlist only; outside the TypeScript admission rail. Unity Editor tests are an explicit local lane, not CI.", "A separate explicit local lane witnesses a macOS Player on Unity 6000.5.3f1; other platforms and the declared minimum version remain unverified. No screen-reader, controller-input, full styling/motion or visual parity claim. Token geometry uses declared fallback values."],
    },
  },
  react: {
    schemaVersion: TARGET_PACK_MANIFEST_SCHEMA_VERSION,
    target: {
      id: "react",
      family: "web-dom",
      label: "React",
      maturity: "builtin",
    },
    compatibility: {
      codegenProtocol: "builtin-framework-emitter-v1",
      componentIR: "ComponentIR@v1",
      targetFamilyIR: "web-dom@current-inline",
    },
    entrypoints: {
      emitter: "packages/ds-codegen/src/frameworks/react/factory.ts",
    },
    outputs: {
      componentsRoot: "src/components",
      barrelFile: "index.ts",
      fileKinds: ["component-source", "behavior-source", "test-source", "style-source", "barrel"],
    },
    capabilities: WEB_DOM_CAPABILITIES,
    permissions: SAFE_BUILTIN_PERMISSIONS,
  },
  vue: {
    schemaVersion: TARGET_PACK_MANIFEST_SCHEMA_VERSION,
    target: {
      id: "vue",
      family: "web-dom",
      label: "Vue",
      maturity: "builtin",
    },
    compatibility: {
      codegenProtocol: "builtin-framework-emitter-v1",
      componentIR: "ComponentIR@v1",
      targetFamilyIR: "web-dom@current-inline",
    },
    entrypoints: {
      emitter: "packages/ds-codegen/src/frameworks/vue/factory.ts",
    },
    outputs: {
      componentsRoot: "src/components",
      barrelFile: "index.ts",
      fileKinds: ["component-source", "behavior-source", "test-source", "style-source", "barrel"],
    },
    capabilities: WEB_DOM_CAPABILITIES,
    permissions: SAFE_BUILTIN_PERMISSIONS,
  },
  lit: {
    schemaVersion: TARGET_PACK_MANIFEST_SCHEMA_VERSION,
    target: {
      id: "lit",
      family: "web-dom",
      label: "Lit",
      maturity: "builtin",
    },
    compatibility: {
      codegenProtocol: "builtin-framework-emitter-v1",
      componentIR: "ComponentIR@v1",
      targetFamilyIR: "web-dom@current-inline",
    },
    entrypoints: {
      emitter: "packages/ds-codegen/src/frameworks/lit/factory.ts",
    },
    outputs: {
      componentsRoot: "src/components",
      barrelFile: "index.ts",
      fileKinds: ["component-source", "behavior-source", "test-source", "style-source", "barrel"],
    },
    capabilities: WEB_DOM_CAPABILITIES,
    permissions: SAFE_BUILTIN_PERMISSIONS,
  },
  svelte: {
    schemaVersion: TARGET_PACK_MANIFEST_SCHEMA_VERSION,
    target: {
      id: "svelte",
      family: "web-dom",
      label: "Svelte",
      maturity: "builtin",
    },
    compatibility: {
      codegenProtocol: "builtin-framework-emitter-v1",
      componentIR: "ComponentIR@v1",
      targetFamilyIR: "web-dom@current-inline",
    },
    entrypoints: {
      emitter: "packages/ds-codegen/src/frameworks/svelte/factory.ts",
    },
    outputs: {
      componentsRoot: "src/components",
      barrelFile: "index.ts",
      fileKinds: ["component-source", "behavior-source", "test-source", "style-source", "barrel"],
    },
    capabilities: WEB_DOM_CAPABILITIES,
    permissions: SAFE_BUILTIN_PERMISSIONS,
  },
  angular: {
    schemaVersion: TARGET_PACK_MANIFEST_SCHEMA_VERSION,
    target: {
      id: "angular",
      family: "web-dom",
      label: "Angular",
      maturity: "builtin",
    },
    compatibility: {
      codegenProtocol: "builtin-framework-emitter-v1",
      componentIR: "ComponentIR@v1",
      targetFamilyIR: "web-dom@current-inline",
    },
    entrypoints: {
      emitter: "packages/ds-codegen/src/frameworks/angular/factory.ts",
    },
    outputs: {
      componentsRoot: "src/components",
      barrelFile: "index.ts",
      fileKinds: ["component-source", "behavior-source", "test-source", "style-source", "barrel"],
    },
    capabilities: WEB_DOM_CAPABILITIES,
    permissions: SAFE_BUILTIN_PERMISSIONS,
  },
  figma: {
    schemaVersion: TARGET_PACK_MANIFEST_SCHEMA_VERSION,
    target: {
      id: "figma",
      family: "design-tool",
      label: "Figma",
      maturity: "builtin",
    },
    compatibility: {
      codegenProtocol: "builtin-framework-emitter-v1",
      componentIR: "ComponentIR@v1",
      targetFamilyIR: "design-tool@descriptor-v1",
    },
    entrypoints: {
      emitter: "packages/ds-codegen/src/frameworks/figma/factory.ts",
    },
    outputs: {
      componentsRoot: "src/generated/components",
      barrelFile: "index.ts",
      fileKinds: ["descriptor", "documentation", "barrel"],
    },
    capabilities: {
      components: true,
      tests: false,
      behavior: false,
      compoundParts: true,
      surface: true,
      tokens: "descriptor-only",
      customRegions: false,
    },
    permissions: SAFE_BUILTIN_PERMISSIONS,
    admission: {
      commands: [
        {
          check: "typecheck",
          command: ["pnpm", "--filter", "@full-stack-ds/figma-plugin", "run", "typecheck"],
          scope: {
            packageRoot: "packages/ds-figma-plugin/",
            extensions: [".ts", ".json"],
            coverage: "covered_by_package_check",
          },
        },
      ],
      knownGaps: [
        "Admits descriptor registry/package integration only; does not prove live Figma canvas mutation, library publication, or MCP tool availability.",
      ],
    },
  },
  "react-native": {
    schemaVersion: TARGET_PACK_MANIFEST_SCHEMA_VERSION,
    target: {
      id: "react-native",
      family: "native-view",
      label: "React Native",
      maturity: "experimental",
    },
    compatibility: {
      codegenProtocol: "builtin-framework-emitter-v1",
      componentIR: "ComponentIR@v1",
      targetFamilyIR: "native-view@react-native-experimental",
    },
    entrypoints: {
      emitter: "packages/ds-codegen/src/frameworks/react-native/factory.ts",
    },
    outputs: {
      componentsRoot: "src/components",
      barrelFile: "index.ts",
      fileKinds: ["component-source", "test-source", "style-source", "token-source", "barrel"],
    },
    capabilities: {
      components: true,
      tests: true,
      behavior: false,
      compoundParts: false,
      surface: true,
      tokens: "native-theme-module",
      customRegions: true,
    },
    permissions: SAFE_BUILTIN_PERMISSIONS,
    admission: {
      commands: [
        {
          check: "typecheck",
          command: ["pnpm", "--filter", "@full-stack-ds/react-native", "run", "typecheck"],
          scope: {
            packageRoot: "packages/ds-react-native/",
            extensions: [".ts", ".tsx", ".json"],
            coverage: "covered_by_package_check",
          },
        },
        {
          check: "runtime",
          command: ["pnpm", "--filter", "@full-stack-ds/react-native", "run", "test"],
          scope: {
            packageRoot: "packages/ds-react-native/",
            extensions: [".ts", ".tsx"],
            coverage: "covered_by_package_check",
          },
        },
      ],
      knownGaps: [
        "Default-rail native target: included in --target=all, governed:rail, and generated-tree drift checks, but still experimental because simulator/device runtime behavior, native visual parity, and platform accessibility parity are not proven.",
        "Presence surfaces are admitted for Dialog/Sheet, Toast, Tooltip, and Popover through generated RN render tests; anchored collision handling, Walkthrough/coachmark, and compound-part emission remain unadmitted.",
        "Part-scoped variant styling and boolean-modifier styling remain residual parity work.",
      ],
    },
  },
  swiftui: {
    schemaVersion: TARGET_PACK_MANIFEST_SCHEMA_VERSION,
    target: {
      id: "swiftui",
      family: "native-view",
      label: "SwiftUI",
      maturity: "experimental",
    },
    compatibility: {
      codegenProtocol: "builtin-framework-emitter-v1",
      componentIR: "ComponentIR@v1",
      targetFamilyIR: "native-view@swiftui-collapse-only",
    },
    entrypoints: {
      emitter: "packages/ds-codegen/src/frameworks/swift/swiftui/factory.ts",
    },
    outputs: {
      componentsRoot: "Sources/DsSwiftUI/Components",
      barrelFile: "Components.generated.swift",
      fileKinds: ["component-source", "barrel"],
    },
    capabilities: {
      components: true,
      tests: false,
      behavior: false,
      compoundParts: false,
      surface: false,
      tokens: "native-theme-module",
      customRegions: true,
    },
    permissions: SAFE_BUILTIN_PERMISSIONS,
    admission: {
      commands: [
        {
          check: "compile",
          command: ["swift", "build", "--package-path", "packages/ds-swiftui"],
          scope: {
            packageRoot: "packages/ds-swiftui/",
            extensions: [".swift"],
            coverage: "not_selected",
          },
        },
      ],
      knownGaps: [
        "Explicit-only target: selectable via --target=swiftui but not in fsds.targets.json, --target=all, governed:rail, or any CI drift diff. Default-rail admission is a later spec.",
        "Only the native-collapse path is implemented (native-toggle-affordance: Switch, ToggleSwitch). Multi-part anatomy and anchored surfaces throw explicit not-implemented errors.",
        "No XCTest target; no behavior files; no shared FsdsTheme token module — size values inline per component from typed token facts.",
        "The declared swift-build admission command requires a macOS toolchain and is not executed by any rail lane yet.",
      ],
    },
  },
  "jetpack-compose": {
    schemaVersion: TARGET_PACK_MANIFEST_SCHEMA_VERSION,
    target: {
      id: "jetpack-compose",
      family: "native-view",
      label: "Jetpack Compose",
      maturity: "experimental",
    },
    compatibility: {
      codegenProtocol: "builtin-framework-emitter-v1",
      componentIR: "ComponentIR@v1",
      targetFamilyIR: "native-view@compose-collapse-only",
    },
    entrypoints: {
      emitter:
        "packages/ds-codegen/src/frameworks/jetpack-compose/factory.ts",
    },
    outputs: {
      componentsRoot:
        "library/src/main/kotlin/com/fullstackds/components",
      barrelFile: "Components.generated.kt",
      fileKinds: ["component-source", "barrel"],
    },
    capabilities: {
      components: true,
      tests: false,
      behavior: false,
      compoundParts: false,
      surface: false,
      tokens: "native-theme-module",
      customRegions: true,
    },
    permissions: SAFE_BUILTIN_PERMISSIONS,
    admission: {
      commands: [
        {
          check: "compile",
          command: [
            "./gradlew",
            "-p",
            "packages/ds-jetpack-compose",
            ":library:compileKotlin",
            "--no-daemon",
          ],
          scope: {
            packageRoot: "packages/ds-jetpack-compose/",
            extensions: [".kt"],
            coverage: "not_selected",
          },
        },
      ],
      knownGaps: [
        "Explicit-only target: selectable via --target=jetpack-compose; outside rail verification and CI drift diffs in this slice (no railFrameworkId). The fsds.targets.json components allowlist gates full-corpus runs to Switch and ToggleSwitch; explicit requests bypass it. Default-rail admission is a later spec.",
        "Only the native-collapse path is implemented (native-toggle-affordance: Switch, ToggleSwitch). Multi-part anatomy and anchored surfaces throw explicit not-implemented errors.",
        "Declared Android ladder — rung 1 of 3 (this slice): Gradle + Compose Multiplatform (JVM) compilation against the real androidx.compose-compatible runtime, no hand-authored stubs. Rung 2 (full Android SDK + Gradle compile lane) and rung 3 (runtime admission — Robolectric or instrumented) are reserved follow-up specs.",
        "Rung 1 non-claims: JVM compilation is not Android compilation — no Android resource linking, AGP validation, or Android Lint; JVM artifacts are not Android-compiled artifacts; no emulator/device execution; no runtime behavioral claims.",
        "No generated test target; no behavior files; no shared Compose theme/token module — size values inline per component (md from contract token facts; sm/lg framework-grammar defaults pending token-graph coverage).",
        "The declared gradlew admission command requires network on first run (Gradle distribution + Maven artifact bootstrap) and is not executed by any rail lane yet.",
      ],
    },
  },
};

export function getBuiltinTargetPackManifest(id: BuiltinTargetId): TargetPackManifestV1 {
  return BUILTIN_TARGET_PACKS[id];
}
