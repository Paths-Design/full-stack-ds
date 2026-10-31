#!/usr/bin/env node
/**
 * Cross-engine parity check for the Orion N5 pause-menu example.
 *
 * The three lanes (gpui, unity, godot) each capture the same 1280x800 states into
 * `tmp/game-pause-menu/<engine>/` (or any root selected with --root). This tool:
 *   1. samples fixed pixels (colour probes + geometry probes) and compares them
 *      with the colours declared in fixtures/parity-layout.json. Geometry probes
 *      pin region extents and the switch pill: the arc point at (x+12, y+2) is
 *      filled on a stadium but background on an ellipse, and the thumb centre
 *      proves the 24 px circular thumb;
 *   2. computes pairwise RMSE between the three engines' captures per state;
 *   3. writes labelled engine montages and pairwise difference images.
 *
 * Usage:
 *   node examples/game-pause-menu/parity-check.mjs \
 *     --root /abs/path/to/tmp/game-pause-menu \
 *     --out  /abs/path/to/tmp/game-pause-menu/parity
 *
 * Requires ImageMagick (`magick`) on PATH. Exit code 0 when every probe matches
 * and every pairwise RMSE is below --max-rmse (default 0.14); 1 otherwise. Font
 * rasterisation is excluded from parity, so RMSE is a coarse structural signal,
 * not a pass/fail on glyphs.
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
const tolerance = Number(arg('tolerance', '18'));

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

const TAB_X = { map: 0, progress: 320, abilities: 640, settings: 960 };

/** Active-tab fill + neighbours, shared by every state. */
function tabProbes(state) {
  const x = TAB_X[state];
  const probes = [
    [x + 3, 107, 'signal', 'active tab top-left fill'],
    [x + 317, 157, 'signal', 'active tab bottom-right fill'],
  ];
  const neighbour = x === 0 ? 323 : x - 3;
  probes.push([neighbour, 132, 'charcoal', 'inactive tab background beside active tab']);
  return probes;
}

const SWITCH_ON = { x: 1176, y: 232 };
const SWITCH_OFF = { x: 1176, y: 472 };
const SETTING_SWITCH_ON = { x: 552, y: 222 };

const COMMON = [
  [4, 4, 'charcoal', 'header background'],
  [4, 780, 'ink', 'footer background'],
];

const PROBES = {
  map: [
    ...COMMON,
    ...tabProbes('map'),
    [900, 150, 'charcoal', 'inactive tab background (opposite side)'],
    // Map field: filled sage exactly from (40,232) to (880,712).
    [41, 233, 'sage', 'map field top-left fill'],
    [879, 711, 'sage', 'map field bottom-right fill'],
    [39, 231, 'charcoal', 'outside map field top-left'],
    [881, 713, 'charcoal', 'outside map field bottom-right'],
    [940, 200, 'charcoal', 'icon panel background'],
    // Switch ON: pill arc filled at (x+12,y+2); ellipse would leave it background.
    [SWITCH_ON.x + 2, SWITCH_ON.y + 2, 'charcoal', 'ON switch corner outside pill'],
    [SWITCH_ON.x + 12, SWITCH_ON.y + 2, 'signal', 'ON switch stadium arc filled'],
    [SWITCH_ON.x + 4, SWITCH_ON.y + 16, 'signal', 'ON switch track left fill'],
    [SWITCH_ON.x + 48, SWITCH_ON.y + 16, 'onSignal', 'ON switch thumb centre (24px circle)'],
    [SWITCH_ON.x + 66, SWITCH_ON.y + 16, 'charcoal', 'ON switch outside track right'],
    // Switch OFF: graphite track, bone thumb on the left.
    [SWITCH_OFF.x + 2, SWITCH_OFF.y + 2, 'charcoal', 'OFF switch corner outside pill'],
    [SWITCH_OFF.x + 12, SWITCH_OFF.y + 2, 'graphite', 'OFF switch stadium arc filled'],
    [SWITCH_OFF.x + 54, SWITCH_OFF.y + 16, 'graphite', 'OFF switch track right fill'],
    [SWITCH_OFF.x + 16, SWITCH_OFF.y + 16, 'boneBright', 'OFF switch thumb centre'],
    [SWITCH_OFF.x + 66, SWITCH_OFF.y + 16, 'charcoal', 'OFF switch outside track right'],
  ],
  progress: [
    ...COMMON,
    ...tabProbes('progress'),
    [100, 150, 'charcoal', 'inactive tab background (opposite side)'],
    // Drawer paper ground (24,176,560,552).
    [25, 177, 'paper', 'drawer top-left fill'],
    [582, 726, 'paper', 'drawer bottom-right fill'],
    [23, 175, 'ink', 'outside drawer top-left'],
    [584, 730, 'ink', 'outside drawer bottom-right'],
    [960, 200, 'charcoal', 'roster panel background'],
    // ACCESS chip (1080,240,76,22).
    [1082, 242, 'signal', 'ACCESS chip top-left fill'],
    [1154, 260, 'signal', 'ACCESS chip bottom-right fill'],
    [1078, 238, 'charcoal', 'outside ACCESS chip top-left'],
    [1158, 262, 'charcoal', 'outside ACCESS chip bottom-right'],
  ],
  abilities: [
    ...COMMON,
    ...tabProbes('abilities'),
    [100, 150, 'charcoal', 'inactive tab background (opposite side)'],
    [42, 226, 'charcoal', 'grid panel background'],
    [850, 178, 'charcoal', 'detail panel background'],
    [1254, 200, 'charcoal', 'detail panel inside right edge'],
    [1258, 200, 'ink', 'outside detail panel right edge'],
    [300, 730, 'ink', 'content gap below panels'],
  ],
  settings: [
    ...COMMON,
    ...tabProbes('settings'),
    [100, 150, 'charcoal', 'inactive tab background (opposite side)'],
    // GENERAL panel (24,176,608,268) and CONTROLLER panel (648,...).
    [26, 178, 'charcoal', 'GENERAL panel top-left fill'],
    [629, 300, 'charcoal', 'GENERAL panel inside right edge'],
    [634, 300, 'ink', 'gap between top panels'],
    [300, 446, 'ink', 'gap below GENERAL panel'],
    [650, 178, 'charcoal', 'CONTROLLER panel top-left fill'],
    // REMAP (24,460) and AUDIO (648,460) panels.
    [26, 462, 'charcoal', 'REMAP panel top-left fill'],
    [650, 462, 'charcoal', 'AUDIO panel top-left fill'],
    [300, 730, 'ink', 'gap below bottom panels'],
    // General switch ON at (552,222,64,32).
    [SETTING_SWITCH_ON.x + 2, SETTING_SWITCH_ON.y + 2, 'charcoal', 'settings switch corner outside pill'],
    [SETTING_SWITCH_ON.x + 12, SETTING_SWITCH_ON.y + 2, 'signal', 'settings switch stadium arc filled'],
    [SETTING_SWITCH_ON.x + 4, SETTING_SWITCH_ON.y + 16, 'signal', 'settings switch track left fill'],
    [SETTING_SWITCH_ON.x + 48, SETTING_SWITCH_ON.y + 16, 'onSignal', 'settings switch thumb centre'],
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
    const probes = PROBES[state];
    const pixels = samplePixels(files[i], probes);
    probes.forEach(([x, y, expectedName, description], index) => {
      const expected = hexToRgb(color(expectedName));
      const actual = pixels[index];
      const delta = distance(actual, expected);
      results.push({ state, lane, x, y, expected: color(expectedName), actual: `rgb(${actual.join(',')})`, delta, description });
      if (delta > tolerance) {
        failures.push(`${state}/${lane}: ${description} at (${x},${y}) expected ${color(expectedName)}, got rgb(${actual.join(',')}) (delta ${delta} > ${tolerance})`);
      }
    });
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
const probeCount = results.filter((r) => 'description' in r).length;
console.log(`parity: ${probeCount} probe(s), ${results.filter((r) => 'rmse' in r).length} RMSE pair(s), ${failures.length} failure(s)`);
console.log(`report: ${join(out, 'parity-report.json')}`);
console.log(`montages: ${out}`);
if (failures.length) {
  for (const failure of failures) console.error(`  FAIL ${failure}`);
  process.exit(1);
}
