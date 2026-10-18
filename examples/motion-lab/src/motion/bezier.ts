/**
 * Consumer-side cubic-bézier easing for the motion-lab example lanes.
 *
 * FSDS motion easing tokens are authored (and lowered into CSS) as
 * `cubic-bezier(x1, y1, x2, y2)` strings. GSAP accepts an arbitrary
 * `(progress) => value` function as an animation `ease`, so this module
 * turns a parsed token curve into exactly that — no GSAP plugin needed.
 *
 * The solver follows the approach browsers use for CSS transitions (and
 * GSAP's own BezierPlugin): given input progress `p` (the x axis), solve
 * the curve's x component for the bezier parameter `t`, then evaluate the
 * y component. Newton–Raphson converges in a few iterations for sane
 * curves; a bisection fallback keeps shallow-slope and overshooting
 * control points honest. `y` values outside [0, 1] are preserved —
 * `motion.easing.bounce` deliberately overshoots (y2 = 1.25).
 */

export interface BezierCurve {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type EaseFunction = (progress: number) => number;

const EPSILON = 1e-9;
const NEWTON_ITERATIONS = 4;
const BISECTION_ITERATIONS = 32;

function component(t: number, a1: number, a2: number): number {
  const u = 1 - t;
  return 3 * u * u * t * a1 + 3 * u * t * t * a2 + t * t * t;
}

function slope(t: number, a1: number, a2: number): number {
  const u = 1 - t;
  return 3 * u * u * a1 + 6 * u * t * (a2 - a1) + 3 * t * t * (1 - a2);
}

export function cubicBezierEase(curve: BezierCurve): EaseFunction {
  const { x1, x2, y1, y2 } = curve;
  return (p: number): number => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let t = p;
    for (let i = 0; i < NEWTON_ITERATIONS; i += 1) {
      const x = component(t, x1, x2) - p;
      if (Math.abs(x) < EPSILON) return component(t, y1, y2);
      const d = slope(t, x1, x2);
      if (Math.abs(d) < EPSILON) break;
      t = Math.min(1, Math.max(0, t - x / d));
    }
    let low = 0;
    let high = 1;
    t = p;
    for (let i = 0; i < BISECTION_ITERATIONS; i += 1) {
      const x = component(t, x1, x2);
      if (Math.abs(x - p) < EPSILON) break;
      if (x < p) low = t;
      else high = t;
      t = (low + high) / 2;
    }
    return component(t, y1, y2);
  };
}
