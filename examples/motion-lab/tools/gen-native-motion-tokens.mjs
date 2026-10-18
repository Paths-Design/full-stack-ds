#!/usr/bin/env node
/**
 * Generate the motion-lab native token constants from the committed token
 * graph (packages/ds-tokens/generated/resolved.tokens.json — a public export
 * of @full-stack-ds/tokens).
 *
 * The native lanes must not hardcode timing any more than the web lanes do:
 * this script lowers the same `core.motion.*` facts the web reads as CSS
 * custom properties into Swift and Kotlin constants, committed beside the
 * lanes that consume them.
 *
 * The generated files carry PURE DATA (durations in milliseconds, bezier
 * control points). Mapping a curve onto a platform animation type
 * (`Animation.timingCurve` / `CubicBezierEasing`) lives in lane code, so the
 * committed constants stay framework-neutral.
 *
 * Regenerate with:  node examples/motion-lab/tools/gen-native-motion-tokens.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../..");
const resolvedPath = join(repo, "packages/ds-tokens/generated/resolved.tokens.json");

const graph = JSON.parse(readFileSync(resolvedPath, "utf8"));
const motion = graph?.core?.motion;
if (!motion) throw new Error(`core.motion group not found in ${resolvedPath}`);

const camel = (key) => key.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

const lookup = (node, segments) => {
  let cursor = node;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = cursor[segment] ?? cursor[camel(segment)];
  }
  return cursor;
};

const pick = (group, key) => {
  const groupNode = motion[group];
  // The token graph flattens to kebab-case CSS names from two different
  // shapes: single camelCase keys (emphasizedIn -> emphasized-in) and
  // nested groups (quick.enter -> quick-enter, extra.long1 -> extra-long1).
  // Try each candidate shape; fail loud when none carry a $value.
  const candidates = [[key], [camel(key)], key.split("-")];
  for (const segments of candidates) {
    const found = lookup(groupNode, segments);
    if (found && typeof found.$value === "string") return found.$value;
  }
  throw new Error(`motion token core.motion.${group}.${key} is missing or not a string`);
};

const toMs = (value, path) => {
  const match = /^(-?\d+(?:\.\d+)?)(ms|s)$/.exec(value);
  if (!match) throw new Error(`core.motion.${path} is not a duration: ${JSON.stringify(value)}`);
  return match[2] === "ms" ? Number(match[1]) : Number(match[1]) * 1000;
};

const toBezier = (value, path) => {
  const match = /^cubic-bezier\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/.exec(value);
  if (!match) throw new Error(`core.motion.${path} is not a cubic-bezier: ${JSON.stringify(value)}`);
  const [x1, y1, x2, y2] = match.slice(1).map(Number);
  return { x1, y1, x2, y2 };
};

const pascal = (key) => {
  const c = camel(key);
  return c.charAt(0).toUpperCase() + c.slice(1);
};

const DURATIONS = ["instant", "short1", "short2", "short3", "short", "medium0", "medium1", "medium2", "medium3", "medium", "long0", "long1", "long2", "long3", "long", "extra-long1"];
const EASINGS = ["standard", "emphasized-in", "emphasized-out", "quick-enter", "quick-exit", "soft-enter", "soft-exit", "continuous", "bounce", "linear"];
const STAGGERS = ["xs", "sm", "slow", "md", "lg"];
const DWELLS = ["short", "medium", "long"];
const DELAYS = ["none", "short", "medium", "long"];

const durations = DURATIONS.map((key) => ({ key, name: camel(key), ms: toMs(pick("duration", key, `duration.${key}`), `duration.${key}`) }));
const easings = EASINGS.map((key) => ({ key, name: camel(key), ...toBezier(pick("easing", key, `easing.${key}`), `easing.${key}`) }));
const staggers = STAGGERS.map((key) => ({ key, name: camel(key), ms: toMs(pick("stagger", key, `stagger.${key}`), `stagger.${key}`) }));
const dwells = DWELLS.map((key) => ({ key, name: camel(key), ms: toMs(pick("dwell", key, `dwell.${key}`), `dwell.${key}`) }));
const delays = DELAYS.map((key) => ({ key, name: camel(key), ms: toMs(pick("delay", key, `delay.${key}`), `delay.${key}`) }));

const seconds = (ms) => (ms / 1000).toFixed(4).replace(/0+$/, "").replace(/\.$/, ".0");

const swift = `// GENERATED FILE — do not edit by hand.
// Source: packages/ds-tokens/generated/resolved.tokens.json (core.motion.*)
// Regenerate: node examples/motion-lab/tools/gen-native-motion-tokens.mjs
//
// Pure data: durations in milliseconds, easing control points. Mapping onto
// SwiftUI animation types lives in MotionLabApp.swift.

/// Cubic-bézier control points exactly as authored in the FSDS token graph
/// (the same values the web lowers as \`--fsds-core-motion-easing-*\`).
public struct FsdsMotionCurve: Sendable {
    public let x1: Double
    public let y1: Double
    public let x2: Double
    public let y2: Double

    public init(x1: Double, y1: Double, x2: Double, y2: Double) {
        self.x1 = x1
        self.y1 = y1
        self.x2 = x2
        self.y2 = y2
    }
}

public enum FsdsMotionTokens {
    public enum Duration {
${durations.map((d) => `        /// ${d.key} (${d.ms}ms)\n        public static let ${d.name}: Double = ${seconds(d.ms)}`).join("\n")}
    }

    public enum Easing {
${easings.map((e) => `        /// ${e.key}\n        public static let ${e.name} = FsdsMotionCurve(x1: ${e.x1}, y1: ${e.y1}, x2: ${e.x2}, y2: ${e.y2})`).join("\n")}
    }

    public enum Stagger {
${staggers.map((s) => `        /// ${s.key} (${s.ms}ms)\n        public static let ${s.name}: Double = ${seconds(s.ms)}`).join("\n")}
    }

    public enum Dwell {
${dwells.map((d) => `        /// ${d.key} (${d.ms}ms)\n        public static let ${d.name}: Double = ${seconds(d.ms)}`).join("\n")}
    }

    public enum Delay {
${delays.map((d) => `        /// ${d.key} (${d.ms}ms)\n        public static let ${d.name}: Double = ${seconds(d.ms)}`).join("\n")}
    }
}
`;

const swiftPath = join(repo, "examples/motion-lab/swift/Sources/MotionLab/Generated/FsdsMotionTokens.swift");
mkdirSync(dirname(swiftPath), { recursive: true });
writeFileSync(swiftPath, swift);

const kotlin = `// GENERATED FILE — do not edit by hand.
// Source: packages/ds-tokens/generated/resolved.tokens.json (core.motion.*)
// Regenerate: node examples/motion-lab/tools/gen-native-motion-tokens.mjs
//
// Pure data: durations in milliseconds, easing control points. Mapping onto
// Compose animation types lives in the lane stations.

package com.fullstackds.examples.motionlab

/** Cubic-bézier control points exactly as authored in the FSDS token graph
 * (the same values the web lowers as \`--fsds-core-motion-easing-*\`). */
data class FsdsMotionCurve(
    val x1: Float,
    val y1: Float,
    val x2: Float,
    val y2: Float,
)

object FsdsMotionTokens {
    object Duration {
${durations.map((d) => `        /** ${d.key} (${d.ms}ms) */\n        const val ${pascal(d.name)}: Long = ${d.ms}L`).join("\n")}
    }

    object Easing {
${easings.map((e) => `        /** ${e.key} */\n        val ${pascal(e.name)} = FsdsMotionCurve(${e.x1}f, ${e.y1}f, ${e.x2}f, ${e.y2}f)`).join("\n")}
    }

    object Stagger {
${staggers.map((s) => `        /** ${s.key} (${s.ms}ms) */\n        const val ${pascal(s.name)}: Long = ${s.ms}L`).join("\n")}
    }

    object Dwell {
${dwells.map((d) => `        /** ${d.key} (${d.ms}ms) */\n        const val ${pascal(d.name)}: Long = ${d.ms}L`).join("\n")}
    }

    object Delay {
${delays.map((d) => `        /** ${d.key} (${d.ms}ms) */\n        const val ${pascal(d.name)}: Long = ${d.ms}L`).join("\n")}
    }
}
`;

const kotlinPath = join(repo, "examples/motion-lab/compose/src/main/kotlin/com/fullstackds/examples/motionlab/Generated/FsdsMotionTokens.kt");
mkdirSync(dirname(kotlinPath), { recursive: true });
writeFileSync(kotlinPath, kotlin);

console.log(`generated ${durations.length} durations, ${easings.length} easings, ${staggers.length} staggers, ${dwells.length} dwells, ${delays.length} delays`);
console.log(`  ${swiftPath}`);
console.log(`  ${kotlinPath}`);
