#!/usr/bin/env node
/**
 * Cross-engine parity check for the Orion N5 pause-menu example.
 *
 * The three lanes (gpui, unity, godot) each capture the same 1280x800 states into
 * `tmp/game-pause-menu/<engine>/` (or any root selected with --root). This tool:
 *   1. samples fixed pixels from the shared parity geometry and compares them with
 *      the colours declared in fixtures/parity-layout.json (tolerance in 0-255);
 *   2. locates large solid-colour regions (map field, drawer, active tab, switch
 *      track) and compares their bounding boxes/areas with the parity geometry —
 *      this is what catches a 64x32 pill rendering as a 48x24 oval;
 *   3. computes pairwise RMSE between the three engines' captures per state;
 *   4. writes labelled engine montages and pairwise difference images.
 *
 * Usage:
 *   node examples/game-pause-menu/parity-check.mjs \
 *     --root /abs/path/to/tmp/game-pause-menu \
 *     --out  /abs/path/to/tmp/game-pause-menu/parity
 *
 * Requires ImageMagick (`magick`) on PATH. Exit code 0 when every probe/region
 * check matches and every pairwise RMSE is below --max-rmse (default 0.14); 1
 * otherwise. Font rasterisation is excluded from parity, so RMSE is a coarse
 * structural signal, not a pass/fail on glyphs.
 */
import { spawnSync } from 'node:child_process';
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
    [4, 780, 'ink', 'footer background'],
  ],
};

/**
 * Region checks per state. Each locates the bounding box of `color` inside
 * `searchRect` and compares it with `expect` (absolute image bbox) and,
 * optionally, the filled area fraction (stadium vs ellipse).
 */
const REGIONS = {
  map: [
    { name: 'map field', color: 'sage', search: [0, 0, 1280, 800], expect: [40, 232, 840, 480], tol: 3 },
    { name: 'active MAP tab', color: 'signal', search: [0, 104, 1280, 56], expect: [0, 104, 320, 56], tol: 2 },
    { name: 'switch ON track', color: 'signal', search: [1160, 224, 96, 64], expect: [1176, 232, 64, 32], tol: 2, area: { min: 0.5, max: 0.95 } },
    { name: 'switch OFF track', color: 'graphite', search: [1160, 464, 96, 64], expect: [1176, 472, 64, 32], tol: 2, area: { min: 0.5, max: 0.95 } },
  ],
  progress: [
    { name: 'faction drawer', color: 'paper', search: [0, 0, 1280, 800], expect: [24, 176, 560, 552], tol: 3 },
    { name: 'active PROGRESS tab', color: 'signal', search: [0, 104, 1280, 56], expect: [320, 104, 320, 56], tol: 2 },
    { name: 'ACCESS chip', color: 'signal', search: [1040, 232, 200, 40], expect: [1080, 240, 76, 22], tol: 2 },
  ],
  abilities: [
    { name: 'active ABILITIES tab', color: 'signal', search: [0, 104, 1280, 56], expect: [640, 104, 320, 56], tol: 2 },
  ],
  settings: [
    { name: 'active SETTINGS tab', color: 'signal', search: [0, 104, 1280, 56], expect: [960, 104, 320, 56], tol: 2 },
    { name: 'general switch ON track', color: 'signal', search: [520, 208, 120, 64], expect: [552, 222, 64, 32], tol: 2, area: { min: 0.5, max: 0.95 } },
  ],
};

function run(args) {
  const result = spawnSync('magick', args, { encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function samplePixels(file, probes) {
  const format = probes.map(([x, y]) => `%[pixel:p{${x},${y}}]`).join('|');
  const { stdout } = run([file, '-format', format, 'info:']);
  return stdout.trim().split('|').map((token) => {
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
  const result = run(['compare', '-metric', 'RMSE', a, b, 'null:']);
  const match = /\(([\d.]+)\)/.exec(`${result.stderr}${result.stdout}`);
  if (!match) throw new Error('unexpected compare output');
  return Number(match[1]);
}

const mask = (file, [x, y, w, h], hex) => [
  file,
  '-crop', `${w}x${h}+${x}+${y}`, '+repage',
  '-fuzz', '8%',
  '-fill', 'black', '-opaque', hex,
  '-fill', 'white', '+opaque', hex,
];

function regionBox(file, [x, y, w, h], hex) {
  const { stdout } = run([...mask(file, [x, y, w, h], hex), '-trim', '-format', '%@', 'info:']);
  const m = /^(\d+)x(\d+)\+(\d+)\+(\d+)$/.exec(stdout.trim());
  if (!m) throw new Error(`unexpected trim box ${stdout} in ${file}`);
  return [x + Number(m[3]), y + Number(m[4]), Number(m[1]), Number(m[2])];
}

function regionAreaFraction(file, [x, y, w, h], hex) {
  const { stdout } = run([...mask(file, [x, y, w, h], hex), '-format', '%[fx:mean]', 'info:']);
  // Mask: matched colour is black (0), everything else white (1). Black fraction = 1 - mean.
  return 1 - Number(stdout.trim());
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
  for (let i = 0; i < LANES.length; i++) {
    const lane = LANES[i];
    const pixels = samplePixels(files[i], PROBES[state]);
    PROBES[state].forEach(([x, y, expectedName], index) => {
      const expected = hexToRgb(color(expectedName));
      const actual = pixels[index];
      const delta = distance(actual, expected);
      results.push({ state, lane, probe: [x, y], expected: color(expectedName), actual: `rgb(${actual.join(',')})`, delta });
      if (delta > tolerance) {
        failures.push(`${state}/${lane}: probe (${x},${y}) expected ${expectedName} ${color(expectedName)}, got rgb(${actual.join(',')}) (delta ${delta} > ${tolerance})`);
      }
    });
    for (const region of REGIONS[state] ?? []) {
      const hex = color(region.color);
      const box = regionBox(files[i], region.search, hex);
      const ok = box.every((value, index) => Math.abs(value - region.expect[index]) <= region.tol);
      results.push({ state, lane, region: region.name, expected: region.expect, actual: box, ok });
      if (!ok) {
        failures.push(`${state}/${lane}: region "${region.name}" expected box ${region.expect.join('x')}, got ${box.join('x')} (tol ${region.tol})`);
      }
      if (region.area) {
        const fraction = regionAreaFraction(files[i], region.search, hex);
        const okArea = fraction >= region.area.min && fraction <= region.area.max;
        results.push({ state, lane, region: region.name, areaFraction: Number(fraction.toFixed(3)), ok: okArea });
        if (!okArea) {
          failures.push(`${state}/${lane}: region "${region.name}" fill fraction ${fraction.toFixed(3)} outside [${region.area.min}, ${region.area.max}]`);
        }
      }
    }
  }

  const labelled = LANES.flatMap((lane) => ['-label', lane, join(root, lane, `${state}.png`)]);
  run([
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
    run(['compare', '-compose', 'difference', join(root, a, `${state}.png`), join(root, b, `${state}.png`), join(out, `${state}-diff-${a}-${b}.png`)]);
  }
}

writeFileSync(join(out, 'parity-report.json'), JSON.stringify({ root, out, maxRmse, tolerance, results, failures }, null, 2));
const probeCount = results.filter((r) => 'probe' in r).length;
const regionCount = results.filter((r) => 'region' in r && 'actual' in r).length;
console.log(`parity: ${probeCount} colour probe(s), ${regionCount} region check(s), ${results.filter((r) => 'rmse' in r).length} RMSE pair(s), ${failures.length} failure(s)`);
console.log(`report: ${join(out, 'parity-report.json')}`);
console.log(`montages: ${out}`);
if (failures.length) {
  for (const failure of failures) console.error(`  FAIL ${failure}`);
  process.exit(1);
}
