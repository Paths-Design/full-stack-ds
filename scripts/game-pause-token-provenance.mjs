#!/usr/bin/env node
/**
 * Design-token provenance gate for the game-pause-menu parity authority.
 *
 * The app authority (`examples/game-pause-menu/fixtures/parity-layout.json`) is
 * the rendered-value source for the three native lanes. This gate proves that
 * every authority colour and every authority type size is traceable to the
 * token graph (`packages/ds-tokens/generated/resolved.tokens.json`) plus the
 * Orion brand layer (`packages/ds-tokens/src/brands/orion.tokens.json`):
 *
 *   colors[name]      == resolve(colorTokens[name].token, colorTokens[name].mode)
 *   type[key]         == resolve(typeTokens[key].token)
 *
 * Brand tokens may add semantic roles that only a brand mode defines (surface
 * moss, status alert/clear, graphic type sizes); they are resolved from the
 * brand file so the authority has no parallel palette values.
 *
 * Exit: 0 when every value has a resolvable provenance, 1 otherwise.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => JSON.parse(readFileSync(join(root, rel), "utf8"));
const authority = read("examples/game-pause-menu/fixtures/parity-layout.json");
const resolved = read("packages/ds-tokens/generated/resolved.tokens.json");
const brand = read("packages/ds-tokens/src/brands/orion.tokens.json");
const brandId = brand?.$brand?.name ?? "orion";

const REM_PX = 16;
const failures = [];

function walk(node, trail, visit) {
  if (!node || typeof node !== "object") return;
  if ("$value" in node) { visit(trail.join("."), node); return; }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue;
    walk(child, [...trail, key], visit);
  }
}

/** Brand leaves keyed by the semantic token name the token build emits. */
const brandLeaves = new Map();
walk(brand, [], (path, node) => {
  if (path === "" || path === "components") return;
  brandLeaves.set(`semantic.${path}`, node);
});

const resolvedLeaves = new Map();
walk(resolved, [], (path, node) => resolvedLeaves.set(path, node));

function pickThemeValue(value, mode) {
  if (value && typeof value === "object" && !Array.isArray(value) && ("light" in value || "dark" in value)) {
    return mode === "light" ? value.light : value.dark;
  }
  return value;
}

function toPx(value) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "value" in value && "unit" in value) {
    if (value.unit === "px") return value.value;
    if (value.unit === "rem") return value.value * REM_PX;
    return undefined;
  }
  if (typeof value === "string") {
    const match = /^(-?[\d.]+)(px|rem)$/.exec(value.trim());
    if (!match) return undefined;
    return Number(match[1]) * (match[2] === "rem" ? REM_PX : 1);
  }
  return undefined;
}

function resolveToken(token, mode = "dark") {
  const brandNode = brandLeaves.get(token);
  if (brandNode) {
    const extensions = brandNode.$extensions ?? {};
    const extensionsValue = mode === "light" ? extensions["fsds.light"] : extensions["fsds.dark"];
    return { source: `${brandId}:brand`, value: pickThemeValue(extensionsValue ?? brandNode.$value, mode) };
  }
  const resolvedNode = resolvedLeaves.get(token);
  if (resolvedNode) return { source: "resolved", value: pickThemeValue(resolvedNode.$value, mode) };
  return undefined;
}

function normalizeColor(value) {
  if (typeof value !== "string") return undefined;
  const match = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/.exec(value.trim());
  return match ? `#${match[1].toLowerCase()}` : undefined;
}

const colors = authority.colors ?? {};
const colorTokens = authority.colorTokens ?? {};
for (const name of Object.keys(colors)) {
  const provenance = colorTokens[name];
  if (!provenance?.token) { failures.push(`color "${name}" has no colorTokens provenance`); continue; }
  const resolvedToken = resolveToken(provenance.token, provenance.mode ?? "dark");
  if (!resolvedToken) { failures.push(`color "${name}": token ${provenance.token} does not resolve in resolved graph or ${brandId} brand`); continue; }
  const expected = normalizeColor(resolvedToken.value);
  const actual = normalizeColor(colors[name]);
  if (!expected) { failures.push(`color "${name}": token ${provenance.token} does not resolve to a colour (${JSON.stringify(resolvedToken.value)})`); continue; }
  if (expected !== actual) failures.push(`color "${name}" = ${colors[name]} but ${provenance.token} (${provenance.mode ?? "dark"}) = ${expected}`);
}
for (const name of Object.keys(colorTokens)) {
  if (!(name in colors)) failures.push(`colorTokens has provenance for unknown colour "${name}"`);
}

const type = authority.type ?? {};
const typeTokens = authority.typeTokens ?? {};
for (const key of Object.keys(type)) {
  const provenance = typeTokens[key];
  if (!provenance?.token) { failures.push(`type "${key}" has no typeTokens provenance`); continue; }
  const resolvedToken = resolveToken(provenance.token, provenance.mode ?? "dark");
  if (!resolvedToken) { failures.push(`type "${key}": token ${provenance.token} does not resolve`); continue; }
  const expected = toPx(resolvedToken.value);
  const actual = Number(type[key]);
  if (expected === undefined || Number.isNaN(expected)) { failures.push(`type "${key}": token ${provenance.token} does not resolve to a size (${JSON.stringify(resolvedToken.value)})`); continue; }
  if (Math.abs(expected - actual) > 0.001) failures.push(`type "${key}" = ${actual}px but ${provenance.token} = ${expected}px`);
}
for (const key of Object.keys(typeTokens)) {
  if (!(key in type)) failures.push(`typeTokens has provenance for unknown type key "${key}"`);
}

if (failures.length) {
  console.error(`game-pause token provenance: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  FAIL ${failure}`);
  process.exit(1);
}
console.log(`game-pause token provenance: ${Object.keys(colors).length} colour(s) and ${Object.keys(type).length} type value(s) resolve through ${brandId} / resolved token graph`);
