#!/usr/bin/env node
/**
 * Audit the committed capture goldens against the source-design oracle.
 *
 * This is deliberately separate from parity-check.mjs: parity-check asks
 * "do the three lanes agree with each other?"; this audit asks "does the design
 * match the supplied Orion N5 reference?" The current answer is recorded in
 * evidence/oracle-report.json, including where it does not match. The audit is
 * report-only by default; `--enforce` turns the declared composition bands into
 * a failing gate once the composition is actually fixed.
 *
 * Usage:
 *   node scripts/game-pause-oracle-audit.mjs
 *   node scripts/game-pause-oracle-audit.mjs --enforce
 *
 * Requires ImageMagick (`magick`).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const laneRoot = join(repo, "examples/game-pause-menu");
const oraclePath = join(laneRoot, "fixtures/orion-style-oracle.json");
const goldenRoot = join(laneRoot, "evidence/goldens");
const defaultOut = join(laneRoot, "evidence/oracle-report.json");

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
};
const out = resolve(arg("out", defaultOut));
const enforce = process.argv.includes("--enforce");
const oracle = JSON.parse(readFileSync(oraclePath, "utf8"));
const lanes = ["gpui", "unity", "godot"];
const states = oracle.composition.states;

// Classifier anchors are the reference anchors plus the app-only warm cream
// that the reference does not use. A colour farther than this distance from
// every anchor is counted as "other".
const creamAnchors = [
  { family: "cream", hex: "#E9E5D8" },
  { family: "cream", hex: "#EEEBE0" },
  { family: "cream", hex: "#F4F1E6" },
];
const anchors = [...oracle.paletteAnchors, ...creamAnchors].map((anchor) => ({
  family: anchor.family,
  rgb: [1, 3, 5].map((offset) => parseInt(anchor.hex.slice(offset, offset + 2), 16)),
}));
const nearestFamily = (rgb) => {
  let best = { family: "other", distance: Number.POSITIVE_INFINITY };
  for (const anchor of anchors) {
    const distance = Math.hypot(
      rgb[0] - anchor.rgb[0],
      rgb[1] - anchor.rgb[1],
      rgb[2] - anchor.rgb[2],
    );
    if (distance < best.distance) best = { family: anchor.family, distance };
  }
  return best.distance <= 40 ? best.family : "other";
};

function magick(args) {
  const result = spawnSync("magick", args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`magick ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout;
}

function shares(file) {
  const histogram = magick([file, "-resize", "320x320", "-colors", "48", "-format", "%c", "histogram:info:-"]);
  const totals = { ink: 0, mint: 0, grey: 0, orange: 0, cream: 0, other: 0 };
  let total = 0;
  for (const line of histogram.split("\n")) {
    const match = /^\s*(\d+):\s*\(([\d.]+),([\d.]+),([\d.]+)/.exec(line);
    if (!match) continue;
    const count = Number(match[1]);
    const rgb = [2, 3, 4].map((i) => Number(match[i]));
    totals[nearestFamily(rgb)] += count;
    total += count;
  }
  if (total === 0) throw new Error(`empty histogram for ${file}`);
  const result = {};
  for (const [family, count] of Object.entries(totals)) result[family] = Number((count / total).toFixed(3));
  return result;
}

const referenceShares = oracle.composition.referenceShares;
const bands = oracle.composition.bands;
const results = [];
const violations = [];
for (const lane of lanes) {
  for (const state of states) {
    const file = join(goldenRoot, lane, `${state}.webp`);
    if (!existsSync(file)) {
      violations.push({ lane, state, family: "golden", message: `missing golden ${file}` });
      continue;
    }
    const observed = shares(file);
    const stateViolations = [];
    for (const [family, band] of Object.entries(bands)) {
      const value = observed[family] ?? 0;
      const [min, max] = band;
      if (value < min || value > max) {
        stateViolations.push({
          family,
          observed: value,
          band,
          direction: value < min ? "below" : "above",
        });
      }
    }
    results.push({ lane, state, shares: observed, referenceShares, violations: stateViolations });
    for (const violation of stateViolations) violations.push({ lane, state, ...violation });
  }
}

const report = {
  schema: "game-pause-menu.oracle-report.v1",
  oracle: "examples/game-pause-menu/fixtures/orion-style-oracle.json",
  referenceImages: oracle.source.images.map((image) => ({ description: image.description, sha256: image.sha256 })),
  method:
    "Quantise each committed golden to 48 colours at 320x320, classify each quantised colour to the nearest reference/app anchor within RGB distance 40, and compare the resulting family shares with the oracle's reference-derived bands.",
  bands,
  referenceShares,
  manualCriteria: {
    displayTypography: oracle.typography,
    graphicLanguage: oracle.graphicLanguage,
  },
  results,
  summary: {
    lanes: lanes.length,
    states: states.length,
    observations: results.length,
    violationCount: violations.length,
    cleanObservations: results.filter((result) => result.violations.length === 0).length,
    overall: violations.length === 0 ? "meets-composition-bands" : "does-not-meet-composition-bands",
  },
  violations,
  claimBoundary: oracle.claimBoundary,
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);

const failingFamilies = {};
for (const violation of violations) failingFamilies[violation.family] = (failingFamilies[violation.family] ?? 0) + 1;
console.log(`oracle audit: ${results.length} lane/state observation(s), ${violations.length} composition violation(s), ${report.summary.cleanObservations} clean`);
console.log(`oracle bands: ${Object.entries(bands).map(([f, [min, max]]) => `${f} ${min}-${max}`).join(", ")}`);
console.log(`failing families: ${Object.entries(failingFamilies).map(([f, n]) => `${f}×${n}`).join(", ") || "none"}`);
console.log(`report: ${out}`);
if (violations.length && enforce) {
  for (const violation of violations) console.error(`  ORACLE FAIL ${violation.lane}/${violation.state}: ${violation.family} ${violation.observed} outside ${violation.band.join("-")}`);
  process.exit(1);
}
