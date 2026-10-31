#!/usr/bin/env node
/**
 * Cross-engine parity check for the Orion N5 pause-menu example.
 *
 * The three lanes (gpui, unity, godot) each capture the same 1280x800 states into
 * `tmp/game-pause-menu/<engine>/` (or any root selected with --root). This tool:
 *   1. samples fixed pixels from the shared parity geometry and compares them with
 *      the colours declared in fixtures/parity-layout.json (tolerance in 0-255);
 *   2. computes pairwise RMSE between the three engines' captures per state;
 *   3. writes labelled engine montages and pairwise difference images.
 *
 * Usage:
 *   node examples/game-pause-menu/parity-check.mjs \
 *     --root /abs/path/to/tmp/game-pause-menu \
 *     --out  /abs/path/to/tmp/game-pause-menu/parity
 *
 * Requires ImageMagick (`magick`) on PATH. Exit code 0 when every probe matches
 * and every pairwise RMSE is below --max-rmse (default 0.14); 1 otherwise.
 * Font rasterisation is explicitly excluded from parity, so RMSE is a coarse
 * structural signal, not a pass/fail on glyphs.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LANES = ['gpui', 'unity', 'godot'];
const STATES = ['map', 'progress', 'abilities', 'settings'];

const here = dirname(fileURLToPath(import.meta.url));
const layout = JSON.parse(readFileSync(join(here, 'fixtures/parity-layout.json'), 'utf8'));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const root = resolve(arg('root', join(here, '../../../tmp/game-pause-menu')));
const out = resolve(arg('out', join(root, 'parity')));
const maxRmse = Number(arg('max-rmse', '0.14'));
const tolerance = Number(arg('tolerance', '16'));

const C = layout.colors;
const hexToRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const color = (name) => {
  if (!(name in C)) throw new Error(`unknown colour key ${name}`);
  return C[name];
};

/** Probe set per state: [x, y, expected colour name, description]. */
const PROBES = {
  map: [
    [4, 4, 'charcoal', 'header background'],
    [900, 132, 'charcoal', 'inactive tab background'],
    [160, 132, 'signal', 'active MAP tab fill'],
    [4, 780, 'ink', 'footer background'],
    [200, 300, 'sage', 'map field ground'],
    [940, 300, 'charcoal', 'icon panel background'],
    [1208, 248, 'signal', 'first icon row switch ON track'],
    [1208, 488, 'graphite', 'weather-mast switch OFF track'],
  ],
  progress: [
    [4, 4, 'charcoal', 'header background'],
    [480, 132, 'signal', 'active PROGRESS tab fill'],
    [300, 420, 'paper', 'faction drawer paper ground'],
    [960, 300, 'charcoal', 'roster panel background'],
    [1118, 250, 'signal', 'ACCESS status chip fill'],
    [4, 780, 'ink', 'footer background'],
  ],
  abilities: [
    [4, 4, 'charcoal', 'header background'],
    [800, 132, 'signal', 'active ABILITIES tab fill'],
    [60, 300, 'charcoal', 'grid panel background'],
    [880, 200, 'charcoal', 'detail panel background'],
    [1000, 200, 'charcoal', 'detail panel header background'],
    [4, 780, 'ink', 'footer background'],
  ],
  settings: [
    [4, 4, 'charcoal', 'header background'],
    [1120, 132, 'signal', 'active SETTINGS tab fill'],
    [60, 200, 'charcoal', 'GENERAL panel background'],
    [680, 200, 'charcoal', 'CONTROLLER panel background'],
    [60, 500, 'charcoal', 'REMAP panel background'],
    [680, 500, 'charcoal', 'AUDIO panel background'],
    [584, 238, 'signal', 'first general switch ON track'],
    [4, 780, 'ink', 'footer background'],
  ],
};

function magick(args) {
  return execFileSync('magick', args, { encoding: 'utf8' });
}

function samplePixels(file, probes) {
  const format = probes.map(([x, y]) => `%[pixel:p{${x},${y}}]`).join('|');
  const raw = magick([file, '-format', format, 'info:']).trim();
  // ImageMagick prints e.g. srgb(35,35,32) or srgba(239,106,60,1).
  return raw.split('|').map((token) => {
    const m = /srgba?\(([\d.]+),([\d.]+),([\d.]+)/.exec(token);
    if (!m) throw new Error(`unexpected pixel token ${token} from ${file}`);
    return [Math.round(Number(m[1])), Math.round(Number(m[2])), Math.round(Number(m[3]))];
  });
}

function distance(a, b) {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

function rmse(a, b) {
  // `magick compare` exits 1 whenever the images differ; capture stderr regardless.
  const result = spawnSync('magick', ['compare', '-metric', 'RMSE', a, b, 'null:'], { encoding: 'utf8' });
  const text = `${result.stderr ?? ''}${result.stdout ?? ''}`.trim();
  const match = /\(([\d.]+)\)/.exec(text);
  if (!match) throw new Error(`unexpected compare output: ${text}`);
  return Number(match[1]);
}

const failures = [];
const results = [];
mkdirSync(out, { recursive: true });

for (const state of STATES) {
  const files = LANES.map((lane) => join(root, lane, `${state}.png`));
  if (files.some((file) => !existsSync(file))) {
    failures.push(`${state}: missing capture for one of ${LANES.join(', ')} (${files.filter((f) => !existsSync(f)).join(', ')})`);
    continue;
  }
  const probes = PROBES[state];
  for (let i = 0; i < LANES.length; i++) {
    const lane = LANES[i];
    const pixels = samplePixels(files[i], probes);
    probes.forEach(([x, y, expectedName], index) => {
      const expected = hexToRgb(color(expectedName));
      const actual = pixels[index];
      const delta = distance(actual, expected);
      results.push({ state, lane, x, y, expected: expectedName, expectedHex: color(expectedName), actual: `rgb(${actual.join(',')})`, delta });
      if (delta > tolerance) {
        failures.push(`${state}/${lane}: probe (${x},${y}) expected ${expectedName} ${color(expectedName)}, got rgb(${actual.join(',')}) (delta ${delta} > ${tolerance})`);
      }
    });
  }

  const labelled = LANES.flatMap((lane) => ['-label', lane, join(root, lane, `${state}.png`)]);
  magick([
    'montage',
    ...labelled,
    '-tile', '3x1',
    '-geometry', '640x400+4+4',
    '-background', '#141412',
    '-fill', '#F4F1E6',
    '-pointsize', '14',
    join(out, `${state}-montage.png`),
  ]);
  const pairs = [
    ['gpui', 'unity'],
    ['unity', 'godot'],
    ['gpui', 'godot'],
  ];
  for (const [a, b] of pairs) {
    const value = rmse(join(root, a, `${state}.png`), join(root, b, `${state}.png`));
    results.push({ state, compare: `${a}/${b}`, rmse: value });
    if (value > maxRmse) {
      failures.push(`${state}: ${a}/${b} RMSE ${value.toFixed(4)} > max ${maxRmse}`);
    }
    spawnSync('magick', [
      'compare',
      '-compose', 'difference',
      join(root, a, `${state}.png`),
      join(root, b, `${state}.png`),
      join(out, `${state}-diff-${a}-${b}.png`),
    ], { encoding: 'utf8' });
  }
}

writeFileSync(join(out, 'parity-report.json'), JSON.stringify({ root, out, maxRmse, tolerance, results, failures }, null, 2));
const probeCount = results.filter((r) => 'delta' in r).length;
console.log(`parity: ${probeCount} colour probe(s), ${results.filter((r) => 'rmse' in r).length} RMSE pair(s), ${failures.length} failure(s)`);
console.log(`report: ${join(out, 'parity-report.json')}`);
console.log(`montages: ${out}`);
if (failures.length) {
  for (const failure of failures) console.error(`  FAIL ${failure}`);
  process.exit(1);
}
