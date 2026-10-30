import type { NativeGlyphPath } from "../native-glyph-catalog.js";

export type GlyphCommand =
  | { kind: "M" | "L"; x: number; y: number }
  | { kind: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { kind: "Z" };
export interface GlyphPathPlan {
  fill: boolean;
  stroke: boolean;
  fillRule: "nonzero" | "evenodd";
  strokeWidth: number;
  lineCap: "butt" | "round" | "square";
  lineJoin: "miter" | "round" | "bevel";
  fillCommands: GlyphCommand[];
  strokeCommands: GlyphCommand[];
}
interface Point { x: number; y: number }
const fail = (detail: string): never => { throw new Error("UNITY_GLYPH_PATH_UNSUPPORTED: " + detail); };
const finite = (value: number): number => Number.isFinite(value) ? value : fail("non-finite geometry");
const point = (x: number, y: number): Point => ({ x: finite(x), y: finite(y) });
const midpoint = (a: Point, b: Point): Point => point((a.x + b.x) / 2, (a.y + b.y) / 2);

function tokens(source: string): (string | number)[] {
  const result: (string | number)[] = [];
  const token = /[A-Za-z]|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
  let index = 0;
  while (index < source.length) {
    const whitespace = /^[\s,]+/.exec(source.slice(index));
    if (whitespace) index += whitespace[0].length;
    if (index === source.length) break;
    token.lastIndex = index;
    const match = token.exec(source);
    if (!match) return fail("invalid token at " + index);
    result.push(/^[A-Za-z]$/.test(match[0]) ? match[0] : finite(Number(match[0])));
    index = token.lastIndex;
  }
  return result;
}

/** SVG endpoint-arc conversion, segmented to at most 45 degrees per cubic. */
function arc(from: Point, to: Point, rxInput: number, ryInput: number,
  degrees: number, large: number, sweep: number): GlyphCommand[] {
  if ((large !== 0 && large !== 1) || (sweep !== 0 && sweep !== 1)) fail("arc flag");
  let rx = Math.abs(rxInput), ry = Math.abs(ryInput);
  if (from.x === to.x && from.y === to.y) return [];
  if (!rx || !ry) return [{ kind: "L", ...to }];
  const phi = degrees * Math.PI / 180;
  const cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (from.x - to.x) / 2, dy = (from.y - to.y) / 2;
  const xp = cos * dx + sin * dy, yp = -sin * dx + cos * dy;
  const scale = xp * xp / (rx * rx) + yp * yp / (ry * ry);
  if (scale > 1) { rx *= Math.sqrt(scale); ry *= Math.sqrt(scale); }
  const rx2 = rx * rx, ry2 = ry * ry;
  const denominator = rx2 * yp * yp + ry2 * xp * xp;
  const coefficient = (large === sweep ? -1 : 1) *
    Math.sqrt(Math.max(0, (rx2 * ry2 - denominator) / denominator));
  const cxp = coefficient * rx * yp / ry, cyp = coefficient * -ry * xp / rx;
  const cx = cos * cxp - sin * cyp + (from.x + to.x) / 2;
  const cy = sin * cxp + cos * cyp + (from.y + to.y) / 2;
  const ux = (xp - cxp) / rx, uy = (yp - cyp) / ry;
  const vx = (-xp - cxp) / rx, vy = (-yp - cyp) / ry;
  const start = Math.atan2(uy, ux);
  let delta = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const count = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 4)));
  const step = delta / count;
  const at = (angle: number): Point => point(
    cx + rx * Math.cos(angle) * cos - ry * Math.sin(angle) * sin,
    cy + rx * Math.cos(angle) * sin + ry * Math.sin(angle) * cos);
  const tangent = (angle: number): Point => point(
    -rx * Math.sin(angle) * cos - ry * Math.cos(angle) * sin,
    -rx * Math.sin(angle) * sin + ry * Math.cos(angle) * cos);
  const out: GlyphCommand[] = [];
  for (let i = 0; i < count; i++) {
    const a = start + step * i, b = a + step;
    const p0 = i === 0 ? from : at(a), p3 = i === count - 1 ? to : at(b);
    const da = tangent(a), db = tangent(b), k = 4 / 3 * Math.tan(step / 4);
    out.push({ kind: "C",
      x1: finite(p0.x + k * da.x), y1: finite(p0.y + k * da.y),
      x2: finite(p3.x - k * db.x), y2: finite(p3.y - k * db.y), x: p3.x, y: p3.y });
  }
  return out;
}

/** Normalize the currently authored SVG M/L/H/V/A/Z vocabulary to absolute commands. */
export function parseGlyphCommands(source: string): GlyphCommand[] {
  const input = tokens(source);
  if (input[0] !== "M" && input[0] !== "m") fail("path must start with moveto");
  const out: GlyphCommand[] = [];
  let index = 0, command = "";
  let current = point(0, 0), subpath = current;
  const number = (): number => {
    const value = input[index++];
    return typeof value === "number" ? value : fail("missing argument for " + command);
  };
  while (index < input.length) {
    if (typeof input[index] === "string") command = input[index++] as string;
    else if (!command) fail("missing command");
    const upper = command.toUpperCase(), relative = command !== upper;
    const endpoint = (): Point => {
      const x = number(), y = number();
      return point(x + (relative ? current.x : 0), y + (relative ? current.y : 0));
    };
    if (upper === "Z") {
      out.push({ kind: "Z" });
      current = subpath;
      command = "";
      continue;
    }
    if (!["M", "L", "H", "V", "A"].includes(upper)) fail("command " + command);
    if (index === input.length || typeof input[index] !== "number") fail("missing argument for " + command);
    if (upper === "M" || upper === "L") {
      current = endpoint();
      out.push({ kind: upper, ...current });
      if (upper === "M") { subpath = current; command = relative ? "l" : "L"; }
    } else if (upper === "H") {
      current = point(number() + (relative ? current.x : 0), current.y);
      out.push({ kind: "L", ...current });
    } else if (upper === "V") {
      current = point(current.x, number() + (relative ? current.y : 0));
      out.push({ kind: "L", ...current });
    } else {
      const rx = number(), ry = number(), rotation = number(), large = number(), sweep = number();
      const to = endpoint();
      out.push(...arc(current, to, rx, ry, rotation, large, sweep));
      current = to;
    }
  }
  return out;
}

const DASH_TOLERANCE = 0.001;
function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
  const t = length2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2)) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function flattenCubic(a: Point, b: Point, c: Point, d: Point, depth = 0): Point[] {
  if (Math.max(distanceToSegment(b, a, d), distanceToSegment(c, a, d)) <= DASH_TOLERANCE) return [d];
  if (depth >= 24) fail("dash curve precision");
  const ab = midpoint(a, b), bc = midpoint(b, c), cd = midpoint(c, d);
  const abc = midpoint(ab, bc), bcd = midpoint(bc, cd), center = midpoint(abc, bcd);
  return [...flattenCubic(a, ab, abc, center, depth + 1), ...flattenCubic(center, bcd, cd, d, depth + 1)];
}
function dashed(commands: GlyphCommand[], raw: string | number | undefined): GlyphCommand[] {
  if (raw === undefined || raw === "none") return commands;
  const source = String(raw).trim();
  if (!source || !/^[\d.eE+\-,\s]+$/.test(source)) fail("strokeDasharray");
  let pattern = source.split(/[\s,]+/).map(Number);
  if (pattern.some(n => !Number.isFinite(n) || n <= 0)) fail("strokeDasharray values");
  if (pattern.length % 2) pattern = [...pattern, ...pattern];
  if (commands.some(c => c.kind === "Z")) fail("closed dashed subpath");
  const out: GlyphCommand[] = [];
  let current = point(0, 0), dashIndex = 0, remaining = pattern[0]!, penDown = false;
  const advance = (): void => { dashIndex = (dashIndex + 1) % pattern.length; remaining = pattern[dashIndex]!; penDown = false; };
  const line = (to: Point): void => {
    const from = current, length = Math.hypot(to.x - from.x, to.y - from.y);
    let consumed = 0;
    while (consumed + 1e-10 < length) {
      if (remaining <= 1e-10) advance();
      const step = Math.min(remaining, length - consumed);
      const begin = point(from.x + (to.x - from.x) * consumed / length, from.y + (to.y - from.y) * consumed / length);
      consumed += step;
      const end = point(from.x + (to.x - from.x) * consumed / length, from.y + (to.y - from.y) * consumed / length);
      if (dashIndex % 2 === 0) {
        if (!penDown) out.push({ kind: "M", ...begin });
        out.push({ kind: "L", ...end });
        penDown = true;
      } else penDown = false;
      remaining -= step;
    }
    current = to;
  };
  for (const command of commands) {
    if (command.kind === "M") { current = command; dashIndex = 0; remaining = pattern[0]!; penDown = false; }
    else if (command.kind === "L") line(command);
    else if (command.kind === "C") for (const to of flattenCubic(current, point(command.x1, command.y1), point(command.x2, command.y2), command)) line(to);
  }
  return out;
}

/** Refuse path paint or geometry the UI Toolkit renderer cannot carry. */
export function projectGlyphPath(source: NativeGlyphPath, inheritedFill: "none" | "currentColor" = "none"): GlyphPathPlan {
  const allowed = new Set(["d", "fill", "stroke", "strokeWidth", "strokeLineCap", "strokeLineJoin", "strokeDasharray", "fillRule"]);
  for (const key of Object.keys(source)) if (!allowed.has(key)) fail("attribute " + key);
  if (typeof source.d !== "string") return fail("missing path data");
  const paint = (value: string | number | undefined, fallback: string): boolean => {
    const resolved = value ?? fallback;
    if (resolved !== "none" && resolved !== "currentColor") fail("paint " + resolved);
    return resolved === "currentColor";
  };
  const choice = <T extends string>(value: string | number | undefined, fallback: T, choices: readonly T[]): T =>
    value === undefined ? fallback : typeof value === "string" && choices.includes(value as T) ? value as T : fail("option " + value);
  const strokeWidth = Number(source.strokeWidth ?? 1);
  if (!Number.isFinite(strokeWidth) || strokeWidth < 0) fail("strokeWidth");
  const commands = parseGlyphCommands(source.d);
  return {
    fill: paint(source.fill, inheritedFill),
    stroke: paint(source.stroke, "none") && strokeWidth > 0,
    fillRule: choice(source.fillRule, "nonzero", ["nonzero", "evenodd"]),
    strokeWidth,
    lineCap: choice(source.strokeLineCap, "butt", ["butt", "round", "square"]),
    lineJoin: choice(source.strokeLineJoin, "miter", ["miter", "round", "bevel"]),
    fillCommands: commands,
    strokeCommands: dashed(commands, source.strokeDasharray),
  };
}
