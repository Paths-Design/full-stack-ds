/**
 * Framework-neutral FSDS motion-token adapter for the motion-lab lanes.
 *
 * Everything a lane animates reads its timing from the token graph at
 * consumption time. The web lanes read the `--fsds-core-motion-*` custom
 * properties that `@full-stack-ds/tokens/tokens.css` lowers onto `:root`
 * (so a brand or override that retimes the graph retimes these effects
 * with zero lane changes); the native lanes consume constants generated
 * from the committed `resolved.tokens.json` by
 * `tools/gen-native-motion-tokens.mjs`.
 *
 * Failure policy is fail-loud: a missing or malformed token throws
 * `MotionTokenError` naming the custom property. A silently defaulted
 * duration is exactly the drift the design system's motion-realization
 * audit exists to catch internally — a consumer lane must not introduce a
 * quieter version of the same defect.
 */

import { cubicBezierEase, type BezierCurve, type EaseFunction } from "./bezier.js";

export { cubicBezierEase };
export type { BezierCurve, EaseFunction };

export class MotionTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MotionTokenError";
  }
}

export type DurationKey =
  | "instant"
  | "short1"
  | "short2"
  | "short3"
  | "short"
  | "medium0"
  | "medium1"
  | "medium2"
  | "medium3"
  | "medium"
  | "long0"
  | "long1"
  | "long2"
  | "long3"
  | "long"
  | "extra-long1";

export type EasingKey =
  | "standard"
  | "emphasized-in"
  | "emphasized-out"
  | "quick-enter"
  | "quick-exit"
  | "soft-enter"
  | "soft-exit"
  | "continuous"
  | "bounce"
  | "linear";

export type StaggerKey = "xs" | "sm" | "slow" | "md" | "lg";
export type DwellKey = "short" | "medium" | "long";
export type DelayKey = "none" | "short" | "medium" | "long";

/** Custom-property names exactly as `@full-stack-ds/tokens/tokens.css` lowers them. */
export const motionProperty = {
  duration: (key: DurationKey) => `--fsds-core-motion-duration-${key}`,
  easing: (key: EasingKey) => `--fsds-core-motion-easing-${key}`,
  stagger: (key: StaggerKey) => `--fsds-core-motion-stagger-${key}`,
  dwell: (key: DwellKey) => `--fsds-core-motion-dwell-${key}`,
  delay: (key: DelayKey) => `--fsds-core-motion-delay-${key}`,
} as const;

const DURATION_RE = /^(-?\d+(?:\.\d+)?)(ms|s)$/;

/** Parse a CSS duration token value into milliseconds. Throws on anything else. */
export function parseDurationMs(value: string): number {
  const match = DURATION_RE.exec(value.trim());
  if (!match) {
    throw new MotionTokenError(`Not a CSS duration: ${JSON.stringify(value)}`);
  }
  const amount = Number(match[1]);
  return match[2] === "ms" ? amount : amount * 1000;
}

const BEZIER_RE =
  /^cubic-bezier\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/;

/**
 * Parse a CSS `cubic-bezier(...)` token value. Throws on any other spelling
 * and on x control points outside [0, 1] (CSS requires x in [0, 1] so the
 * curve stays a function of progress; y may overshoot — `bounce` does).
 */
export function parseCubicBezier(value: string): BezierCurve {
  const match = BEZIER_RE.exec(value.trim());
  if (!match) {
    throw new MotionTokenError(`Not a cubic-bezier(): ${JSON.stringify(value)}`);
  }
  const [x1, y1, x2, y2] = match.slice(1).map(Number) as [number, number, number, number];
  if (!(x1 >= 0 && x1 <= 1 && x2 >= 0 && x2 <= 1)) {
    throw new MotionTokenError(
      `cubic-bezier() x control points must be within [0, 1]: ${JSON.stringify(value)}`,
    );
  }
  return { x1, y1, x2, y2 };
}

/** Minimal shape of `CSSStyleDeclaration` this adapter needs (testable without a DOM). */
export interface StyleLike {
  getPropertyValue(propertyName: string): string;
}

export interface MotionTokenSet {
  durationMs(key: DurationKey): number;
  easingCurve(key: EasingKey): BezierCurve;
  ease(key: EasingKey): EaseFunction;
  staggerMs(key: StaggerKey): number;
  dwellMs(key: DwellKey): number;
  delayMs(key: DelayKey): number;
  rawValue(propertyName: string): string;
}

/**
 * Read the FSDS motion token set from a computed style (defaults to the
 * document root). Every accessor resolves a `--fsds-core-motion-*` custom
 * property at call time — nothing is cached, so runtime token overrides
 * (brand layers, custom-property edits) retune effects live.
 */
export function readMotionTokens(style?: StyleLike | null): MotionTokenSet {
  const source: StyleLike | null =
    style ?? (typeof document !== "undefined" ? getComputedStyle(document.documentElement) : null);
  const raw = (name: string): string => {
    if (!source) {
      throw new MotionTokenError(
        `No computed style available to read ${name} — pass a StyleLike or run where a document exists.`,
      );
    }
    const value = source.getPropertyValue(name);
    if (!value.trim()) {
      throw new MotionTokenError(
        `FSDS motion token ${name} is not set — import "@full-stack-ds/tokens/tokens.css" before reading motion tokens.`,
      );
    }
    return value.trim();
  };
  return {
    durationMs: (key) => parseDurationMs(raw(motionProperty.duration(key))),
    easingCurve: (key) => parseCubicBezier(raw(motionProperty.easing(key))),
    ease: (key) => cubicBezierEase(parseCubicBezier(raw(motionProperty.easing(key)))),
    staggerMs: (key) => parseDurationMs(raw(motionProperty.stagger(key))),
    dwellMs: (key) => parseDurationMs(raw(motionProperty.dwell(key))),
    delayMs: (key) => parseDurationMs(raw(motionProperty.delay(key))),
    rawValue: raw,
  };
}

/** Milliseconds → seconds (the unit GSAP timelines speak). */
export const seconds = (ms: number): number => ms / 1000;

/**
 * Reduced-motion preference for the current environment. Defaults to
 * false where `matchMedia` does not exist (SSR, Node) — lanes substitute
 * their settled presentation under a `true` result.
 */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}
