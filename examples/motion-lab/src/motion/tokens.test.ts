import { describe, expect, it } from "vitest";

import { cubicBezierEase } from "./bezier.js";
import {
  MotionTokenError,
  motionProperty,
  parseCubicBezier,
  parseDurationMs,
  prefersReducedMotion,
  readMotionTokens,
} from "./tokens.js";

describe("parseDurationMs", () => {
  it.each([
    ["0ms", 0],
    ["50ms", 50],
    ["83ms", 83],
    ["333ms", 333],
    ["1000ms", 1000],
    ["1500ms", 1500],
    ["0.5s", 500],
    ["  250ms  ", 250],
  ])("parses %s into %d ms", (value, expected) => {
    expect(parseDurationMs(value)).toBe(expected);
  });

  it("throws on unitless numbers (fail-loud probe)", () => {
    expect(() => parseDurationMs("250")).toThrow(MotionTokenError);
  });

  it("throws on non-duration strings (fail-loud probe)", () => {
    expect(() => parseDurationMs("fast")).toThrow(MotionTokenError);
    expect(() => parseDurationMs("")).toThrow(MotionTokenError);
    expect(() => parseDurationMs("cubic-bezier(0.4, 0, 0.2, 1)")).toThrow(MotionTokenError);
  });
});

describe("parseCubicBezier", () => {
  it("parses the standard FSDS easing", () => {
    expect(parseCubicBezier("cubic-bezier(0.4, 0, 0.2, 1)")).toEqual({
      x1: 0.4,
      y1: 0,
      x2: 0.2,
      y2: 1,
    });
  });

  it("tolerates whitespace and negative or overshooting y values", () => {
    expect(parseCubicBezier("cubic-bezier( 0.3 , 0 , 0.1 , 1.25 )")).toEqual({
      x1: 0.3,
      y1: 0,
      x2: 0.1,
      y2: 1.25,
    });
  });

  it("rejects non-bezier easings (fail-loud probe)", () => {
    expect(() => parseCubicBezier("ease-in")).toThrow(MotionTokenError);
    expect(() => parseCubicBezier("linear")).toThrow(MotionTokenError);
    expect(() => parseCubicBezier("")).toThrow(MotionTokenError);
  });

  it("rejects x control points outside [0, 1]", () => {
    expect(() => parseCubicBezier("cubic-bezier(1.5, 0, 0.2, 1)")).toThrow(MotionTokenError);
    expect(() => parseCubicBezier("cubic-bezier(-0.1, 0, 0.2, 1)")).toThrow(MotionTokenError);
  });
});

describe("cubicBezierEase", () => {
  it("returns exact endpoints and clamps outside [0, 1]", () => {
    const ease = cubicBezierEase({ x1: 0.4, y1: 0, x2: 0.2, y2: 1 });
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(-0.5)).toBe(0);
    expect(ease(1.5)).toBe(1);
  });

  it("is the identity for the linear token curve", () => {
    const linear = cubicBezierEase({ x1: 0, y1: 0, x2: 1, y2: 1 });
    for (const p of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      expect(linear(p)).toBeCloseTo(p, 6);
    }
  });

  it("keeps motion.easing.standard monotonic non-decreasing", () => {
    const standard = cubicBezierEase({ x1: 0.4, y1: 0, x2: 0.2, y2: 1 });
    let previous = 0;
    for (let i = 1; i <= 100; i += 1) {
      const value = standard(i / 100);
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = value;
    }
  });

  it("sits below the diagonal at midpoint for quick-exit (late progress)", () => {
    // Hand-checked against the Bernstein components: x(t)=0.5 near t≈0.21,
    // where y ≈ 0.11 — the (1, 0) control point holds progress down early.
    const quickExit = cubicBezierEase({ x1: 1, y1: 0, x2: 1, y2: 1 });
    expect(quickExit(0.5)).toBeLessThan(0.5);
  });

  it("preserves deliberate y overshoot for motion.easing.bounce", () => {
    const bounce = cubicBezierEase({ x1: 0.3, y1: 0, x2: 0.1, y2: 1.25 });
    const peak = Math.max(...Array.from({ length: 99 }, (_, i) => bounce((i + 1) / 100)));
    expect(peak).toBeGreaterThan(1);
  });
});

describe("readMotionTokens", () => {
  const styleLike = (vars: Record<string, string>): { getPropertyValue: (name: string) => string } => ({
    getPropertyValue: (name: string) => vars[name] ?? "",
  });

  it("resolves durations, easings, staggers, and dwell from a style source", () => {
    const tokens = readMotionTokens(
      styleLike({
        [motionProperty.duration("medium2")]: "333ms",
        [motionProperty.easing("soft-enter")]: "cubic-bezier(0, 0, 0.7, 1)",
        [motionProperty.easing("linear")]: "cubic-bezier(0, 0, 1, 1)",
        [motionProperty.stagger("sm")]: "30ms",
        [motionProperty.dwell("medium")]: "6000ms",
        [motionProperty.delay("long")]: "150ms",
      }),
    );
    expect(tokens.durationMs("medium2")).toBe(333);
    expect(tokens.easingCurve("soft-enter")).toEqual({ x1: 0, y1: 0, x2: 0.7, y2: 1 });
    expect(tokens.ease("linear")(0.25)).toBeCloseTo(0.25, 6);
    expect(tokens.staggerMs("sm")).toBe(30);
    expect(tokens.dwellMs("medium")).toBe(6000);
    expect(tokens.delayMs("long")).toBe(150);
  });

  it("throws, naming the property, when a motion token is unset (fail-loud probe)", () => {
    const tokens = readMotionTokens(styleLike({}));
    expect(() => tokens.durationMs("medium2")).toThrow(/--fsds-core-motion-duration-medium2/);
  });

  it("throws when no style source exists (node, no injection)", () => {
    const tokens = readMotionTokens(null);
    expect(() => tokens.durationMs("medium2")).toThrow(MotionTokenError);
  });
});

describe("prefersReducedMotion", () => {
  it("defaults to false outside a browser (node test environment)", () => {
    expect(prefersReducedMotion()).toBe(false);
  });
});
