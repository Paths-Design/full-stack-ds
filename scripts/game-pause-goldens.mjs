#!/usr/bin/env node
/**
 * Build or verify the committed image-golden set for the game-pause-menu lanes.
 *
 * The parity checker samples points and compares lanes to each other. These
 * goldens add the missing regression baseline: one losslessly encoded WebP per
 * lane and capture state, plus a manifest binding them to the authority and
 * token sources that produced them.
 *
 * Usage:
 *   node scripts/game-pause-goldens.mjs --write --captures /abs/parity-evidence
 *   node scripts/game-pause-goldens.mjs --check
 *
 * `--write` converts `<captures>/<lane>/<state>.png` into
 * `examples/game-pause-menu/evidence/goldens/<lane>/<state>.webp` and rewrites
 * `goldens.json`. `--check` validates that the committed files and hashes still
 * match the manifest and that every manifest entry decodes at 1280x800.
 *
 * Goldens are lossless WebP: the source PNG bytes are hashed, the encoded files
 * are hashed, and the parity checker compares later captures against them with
 * an RMSE threshold. Requires ImageMagick (`magick`).
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const laneRoot = join(repo, "examples/game-pause-menu");
const authorityPath = join(laneRoot, "fixtures/parity-layout.json");
const resolvedPath = join(repo, "packages/ds-tokens/generated/resolved.tokens.json");
const brandPath = join(repo, "packages/ds-tokens/src/brands/orion.tokens.json");
const goldenRoot = join(laneRoot, "evidence/goldens");
const manifestPath = join(goldenRoot, "goldens.json");

const LANES = ["gpui", "unity", "godot"];
const STATES = [
  "map", "map-popover", "progress", "abilities",
  "abilities-hover", "settings", "settings-remap-modal", "settings-subtitle",
];

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
};
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const captureRoot = resolve(arg("captures", join(repo, "tmp/parity-evidence")));
const write = process.argv.includes("--write");
const check = process.argv.includes("--check") || !write;

function magick(args) {
  const result = spawnSync("magick", args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`magick ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function writeGoldens() {
  mkdirSync(goldenRoot, { recursive: true });
  const entries = [];
  for (const lane of LANES) {
    mkdirSync(join(goldenRoot, lane), { recursive: true });
    for (const state of STATES) {
      const source = join(captureRoot, lane, `${state}.png`);
      if (!existsSync(source)) throw new Error(`missing capture ${source}`);
      const target = join(goldenRoot, lane, `${state}.webp`);
      magick([source, "-define", "webp:lossless=true", target]);
      const pngBytes = readFileSync(source);
      const webpBytes = readFileSync(target);
      const dimensions = magick([target, "-format", "%wx%h", "info:"]);
      entries.push({
        lane,
        state,
        width: Number(dimensions.split("x")[0]),
        height: Number(dimensions.split("x")[1]),
        sourcePng: { sha256: sha256(pngBytes), bytes: pngBytes.length },
        golden: { sha256: sha256(webpBytes), bytes: webpBytes.length },
      });
    }
  }
  const manifest = {
    schema: "game-pause-menu.goldens.v1",
    claim:
      "Lossless image goldens for the eight captured 1280x800 states; a regression baseline, not proof of pixel identity or full parity.",
    captures: captureRoot,
    authority: { path: "examples/game-pause-menu/fixtures/parity-layout.json", sha256: sha256(readFileSync(authorityPath)) },
    resolvedTokens: { path: "packages/ds-tokens/generated/resolved.tokens.json", sha256: sha256(readFileSync(resolvedPath)) },
    orionBrand: { path: "packages/ds-tokens/src/brands/orion.tokens.json", sha256: sha256(readFileSync(brandPath)) },
    entries,
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`wrote ${entries.length} goldens and ${manifestPath}`);
}

function checkGoldens() {
  if (!existsSync(manifestPath)) throw new Error(`missing golden manifest ${manifestPath}; run --write`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.schema !== "game-pause-menu.goldens.v1") throw new Error(`unexpected golden schema ${manifest.schema}`);
  const expected = new Set(LANES.flatMap((lane) => STATES.map((state) => `${lane}/${state}`)));
  const seen = new Set();
  const failures = [];
  const hashFile = (rel) => sha256(readFileSync(join(repo, rel)));
  if (manifest.authority.sha256 !== hashFile(manifest.authority.path)) failures.push("authority hash is stale");
  if (manifest.resolvedTokens.sha256 !== hashFile(manifest.resolvedTokens.path)) failures.push("resolved token hash is stale");
  if (manifest.orionBrand.sha256 !== hashFile(manifest.orionBrand.path)) failures.push("Orion brand hash is stale");
  for (const entry of manifest.entries) {
    const key = `${entry.lane}/${entry.state}`;
    seen.add(key);
    const file = join(goldenRoot, entry.lane, `${entry.state}.webp`);
    if (!existsSync(file)) { failures.push(`missing golden ${key}`); continue; }
    if (sha256(readFileSync(file)) !== entry.golden.sha256) failures.push(`${key}: golden bytes do not match the manifest`);
    const dimensions = magick([file, "-format", "%wx%h", "info:"]);
    if (dimensions !== `${entry.width}x${entry.height}`) failures.push(`${key}: golden decodes at ${dimensions}, expected ${entry.width}x${entry.height}`);
    if (entry.width !== 1280 || entry.height !== 800) failures.push(`${key}: expected 1280x800, got ${dimensions}`);
  }
  for (const key of expected) if (!seen.has(key)) failures.push(`manifest is missing ${key}`);
  for (const key of seen) if (!expected.has(key)) failures.push(`manifest has unknown ${key}`);
  if (failures.length) {
    for (const failure of failures) console.error(`  GOLDEN FAIL ${failure}`);
    process.exit(1);
  }
  console.log(`goldens: ${manifest.entries.length} committed images match the manifest and the current authority/token sources`);
}

try {
  if (write) writeGoldens();
  else if (check) checkGoldens();
  else throw new Error("specify --write or --check");
} catch (error) {
  console.error(`game-pause goldens: ${error.message}`);
  process.exit(1);
}
