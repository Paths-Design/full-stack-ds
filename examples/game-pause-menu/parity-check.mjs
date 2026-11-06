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
 *     --out  /abs/path/to/tmp/game-pause-menu/parity \
 *     [--goldens examples/game-pause-menu/evidence/goldens]
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
import { compareColorProbe, mapSwitchProbes, mapPopoverColorProbes, mapPopoverTypographyProbes,
  subtitlePreviewColorProbes, subtitlePreviewTypographyProbes } from './parity-state.mjs';

const LANES = ['gpui', 'unity', 'godot'];
// All eight committed capture states are compared for pairwise RMSE and
// regression goldens. Base states carry the pinned colour/geometry and typography
// probes; map-popover also carries map geometry and every map switch is probed.
const STATES = [
  'map', 'map-popover', 'progress', 'abilities',
  'abilities-hover', 'settings', 'settings-remap-modal', 'settings-subtitle',
];
const PROBED_STATES = new Set(['map', 'map-popover', 'progress', 'abilities', 'settings']);

// The bounded claim this report supports. Do not widen this without widening
// the evidence matrix in examples/game-pause-menu/evidence/visual-review.md.
const CLAIM =
  'Bounded visual conformance across the eight captured 1280x800 states on the pinned macOS host; '
  + 'not pixel identity, not an all-states/DPI/OS/accessibility/usability parity claim.';

const here = dirname(fileURLToPath(import.meta.url));
const layout = JSON.parse(readFileSync(join(here, 'fixtures/parity-layout.json'), 'utf8'));
const icons = JSON.parse(readFileSync(join(here, 'fixtures/map-icons.json'), 'utf8')).icons;
const settings = JSON.parse(readFileSync(join(here, 'fixtures/settings.json'), 'utf8'));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const root = resolve(arg('root', join(here, '../../../tmp/game-pause-menu')));
const out = resolve(arg('out', join(root, 'parity')));
const maxRmse = Number(arg('max-rmse', '0.14'));
const tolerance = Number(arg('tolerance', '18'));
const typographyFuzz = Number(arg('type-fuzz', '30'));
const inkTolerance = Number(arg('ink-tolerance', '0.25'));
const goldens = arg('goldens', '');
const goldenRmse = Number(arg('golden-rmse', '0.02'));
// Hovered captures are sampled mid-animation in Godot/Unity; the hover state
// gets a slightly wider per-state allowance while weight/state anchors keep the
// global threshold.
const goldenTolerances = { 'abilities-hover': 0.06 };
const typography = layout.typography ?? { probes: [], probeTolerance: {} };

const C = layout.colors;
const color = (name) => {
  if (/^#[\da-f]{6}$/i.test(name)) return name;
  if (!(name in C)) throw new Error(`unknown colour key ${name}`);
  return C[name];
};

const TAB_X = { map: 0, progress: 320, abilities: 640, settings: 960 };

/** Active-tab fill + neighbours, shared by every state. */
function tabProbes(state) {
  const x = TAB_X[state];
  const probes = [
    [x + 3, 107, 'signalDeep', 'active tab top-left fill'],
    [x + 317, 157, 'signalDeep', 'active tab bottom-right fill'],
  ];
  const neighbour = x === 0 ? 323 : x - 3;
  probes.push([neighbour, 132, 'signal', 'inactive tab background beside active tab']);
  return probes;
}

const SWITCH_ON = { x: 1176, y: 232 };
const SWITCH_OFF = { x: 1176, y: 472 };
const SETTING_SWITCH_ON = { x: 552, y: 222 };

const COMMON = [
  [4, 4, 'sage', 'header background'],
  [4, 780, 'sage', 'footer background'],
];

const PROBES = {
  map: [
    ...COMMON,
    ...tabProbes('map'),
    [900, 150, 'signal', 'inactive tab background (opposite side)'],
    // Map field: filled sage exactly from (40,232) to (880,712).
    [48, 240, 'sage', 'map field top-left fill'],
    [872, 704, 'sage', 'map field bottom-right fill'],
    [30, 222, 'charcoal', 'outside map field top-left'],
    [890, 722, 'charcoal', 'outside map field bottom-right'],
    [1000, 700, 'charcoal', 'icon panel background'],
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
    [100, 150, 'signal', 'inactive tab background (opposite side)'],
    // Drawer paper ground (24,176,560,552).
    [25, 177, 'sage', 'drawer top-left fill'],
    [582, 726, 'sage', 'drawer bottom-right fill'],
    [16, 168, 'ruleStrong', 'outside drawer top-left'],
    [584, 730, 'ruleStrong', 'outside drawer bottom-right'],
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
    [100, 150, 'signal', 'inactive tab background (opposite side)'],
    [42, 226, 'charcoal', 'grid panel background'],
    [850, 178, 'ruleStrong', 'detail panel background'],
    [1248, 200, 'ruleStrong', 'detail panel inside right edge'],
    [1258, 200, 'ruleStrong', 'outside detail panel right edge'],
    [300, 730, 'ruleStrong', 'content gap below panels'],
  ],
  settings: [
    ...COMMON,
    ...tabProbes('settings'),
    [100, 150, 'signal', 'inactive tab background (opposite side)'],
    // GENERAL panel (24,176,608,268) and CONTROLLER panel (648,...).
    [26, 178, 'ruleStrong', 'GENERAL panel top-left fill'],
    [629, 300, 'ruleStrong', 'GENERAL panel inside right edge'],
    [634, 300, 'ruleStrong', 'gap between top panels'],
    [300, 446, 'ruleStrong', 'gap below GENERAL panel'],
    [650, 178, 'ruleStrong', 'CONTROLLER panel top-left fill'],
    // REMAP (24,460) and AUDIO (648,460) panels.
    [26, 462, 'ruleStrong', 'REMAP panel top-left fill'],
    [650, 462, 'ruleStrong', 'AUDIO panel top-left fill'],
    [300, 730, 'ruleStrong', 'gap below bottom panels'],
    // General switch ON at (552,222,64,32).
    [SETTING_SWITCH_ON.x + 2, SETTING_SWITCH_ON.y + 2, 'ruleStrong', 'settings switch corner outside pill'],
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

function rmse(a, b) {
  // `magick compare` exits 1 whenever the images differ; capture stderr regardless.
  const result = run(['compare', '-metric', 'RMSE', a, b, 'null:']);
  const match = /\(([\d.]+)\)/.exec(`${result.stderr}${result.stdout}`);
  if (!match) throw new Error('unexpected compare output');
  return Number(match[1]);
}

/** Trimmed pixel bounding box of one pinned text string, or null when absent. */
function textBBox(file, probe) {
  const hex = color(probe.color);
  const result = run([
    file,
    '-crop', `${probe.w}x${probe.h}+${probe.x}+${probe.y}`, '+repage',
    '-fuzz', `${typographyFuzz}%`,
    '-transparent', hex,
    '-alpha', 'extract', '-negate',
    '-bordercolor', 'black', '-border', '1',
    '-trim', '-format', '%wx%h%O|%[fx:mean]', 'info:',
  ]);
  const match = /^(\d+)x(\d+)\+(-?\d+)\+(-?\d+)\|([\d.]+)$/.exec(result.stdout.trim());
  if (!match) return null;
  const w = parseInt(match[1], 10);
  const h = parseInt(match[2], 10);
  if (w <= 1 && h <= 1) return null;
  // -border 1 shifts the reported page offset by 1; undo it to stay in image space.
  // The trimmed mask's mean is the ink-coverage fraction inside the bbox: glyph
  // weight, not just geometry.
  return {
    x: probe.x + parseInt(match[3], 10) - 1,
    y: probe.y + parseInt(match[4], 10) - 1,
    w,
    h,
    ink: Number(match[5]),
  };
}

function bboxDelta(a, b) {
  const inkBase = Math.max(a.ink, b.ink, 0.001);
  return {
    x: Math.abs(a.x - b.x),
    y: Math.abs(a.y - b.y),
    w: Math.abs(a.w - b.w),
    h: Math.abs(a.h - b.h),
    ink: Math.abs(a.ink - b.ink) / inkBase,
  };
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
  const probes = [
    ...(PROBED_STATES.has(state) ? PROBES[state === 'map-popover' ? 'map' : state] : []),
    ...mapSwitchProbes(layout, icons, state),
    ...mapPopoverColorProbes(layout, icons, state),
    ...subtitlePreviewColorProbes(layout, settings, state),
  ];
  if (probes.length) {
    for (let i = 0; i < LANES.length; i++) {
      const lane = LANES[i];
      const pixels = samplePixels(files[i], probes);
      probes.forEach(([x, y, expectedName, description], index) => {
        const actual = pixels[index];
        const { matches, ...comparison } = compareColorProbe(probes[index], actual, C, tolerance);
        const { delta } = comparison;
        results.push({ state, lane, ...comparison });
        if (!matches) {
          failures.push(`${state}/${lane}: ${description} at (${x},${y}) expected ${color(expectedName)}, got rgb(${actual.join(',')}) (delta ${delta} > ${tolerance})`);
        }
      });
    }
  }

  // Typography parity: measure the pixel bbox of every pinned text string in
  // this state and require the three engines to agree on x/y/w/h within the
  // authority tolerance. This is a metric probe; glyph anti-aliasing may differ.
  const stateTypeProbes = [
    ...typography.probes.filter((probe) => probe.state === state),
    ...mapPopoverTypographyProbes(layout, icons, state),
    ...subtitlePreviewTypographyProbes(layout, settings, state),
  ];
  const typeTolerance = typography.probeTolerance ?? {};
  const boxesByProbe = new Map();
  for (let i = 0; i < LANES.length; i++) {
    const lane = LANES[i];
    for (const probe of stateTypeProbes) {
      const bbox = textBBox(join(root, lane, `${state}.png`), probe);
      results.push({ state, lane, kind: 'typography', probe: probe.id, text: probe.text, bbox });
      if (!bbox) {
        failures.push(`${state}/typography/${lane}: no pixels for ${probe.id} (${JSON.stringify(probe.text)}) in region ${probe.x},${probe.y} ${probe.w}x${probe.h}`);
        continue;
      }
      if (!boxesByProbe.has(probe.id)) boxesByProbe.set(probe.id, []);
      boxesByProbe.get(probe.id).push({ lane, bbox });
    }
  }
  for (const probe of stateTypeProbes) {
    const boxes = boxesByProbe.get(probe.id) ?? [];
    if (boxes.length !== LANES.length) continue;
    const [first, ...rest] = boxes;
    for (const other of rest) {
      const delta = bboxDelta(first.bbox, other.bbox);
      const limits = {
        x: typeTolerance.x ?? 3,
        y: typeTolerance.y ?? 3,
        w: typeTolerance.w ?? 4,
        h: typeTolerance.h ?? 4,
        // Body/secondary copy on paper is dominated by rasteriser AA; those
        // probes may relax ink coverage in the authority. Weight anchors keep
        // the default tolerance.
        ink: probe.inkTolerance ?? inkTolerance,
      };
      const bad = Object.entries(delta).filter(([axis, value]) => value > limits[axis]);
      if (bad.length) {
        failures.push(
          `${state}/typography/${probe.id}: ${first.lane} ${JSON.stringify(first.bbox)} vs ${other.lane} ${JSON.stringify(other.bbox)} ` +
          `exceeds ${bad.map(([axis, value]) => `${axis}+${value}>${limits[axis]}`).join(', ')} (${JSON.stringify(probe.text)})`,
        );
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

  // Committed image goldens: one per lane and state under
  // examples/game-pause-menu/evidence/goldens/<lane>/<state>.webp. These are
  // lossless WebP encodings of the reviewed captures, so a later capture is
  // compared image-for-image rather than only through point samples.
  if (goldens) {
    for (const lane of LANES) {
      const golden = join(goldens, lane, `${state}.webp`);
      if (!existsSync(golden)) {
        failures.push(`${state}/${lane}: missing committed golden ${golden}`);
        continue;
      }
      const value = rmse(files[LANES.indexOf(lane)], golden);
      const limit = goldenTolerances[state] ?? goldenRmse;
      results.push({ state, lane, kind: 'golden', golden, rmse: value, limit });
      if (value > limit) {
        failures.push(`${state}/${lane}: RMSE ${value.toFixed(4)} against committed golden > max ${limit} (${golden})`);
      }
    }
  }
}

writeFileSync(join(out, 'parity-report.json'), JSON.stringify({ claim: CLAIM, root, out, states: STATES, goldens: goldens || null, maxRmse, goldenRmse, tolerance, results, failures }, null, 2));
const probeCount = results.filter((r) => 'description' in r).length;
const typeCount = results.filter((r) => r.kind === 'typography').length;
const rmseCount = results.filter((r) => 'rmse' in r && r.kind !== 'golden').length;
const goldenCount = results.filter((r) => r.kind === 'golden').length;
console.log(`bounded parity: ${probeCount} colour probe(s), ${typeCount} typography bbox measurement(s), ${rmseCount} RMSE pair(s), ${goldenCount} golden comparison(s), ${failures.length} failure(s)`);
console.log(`claim: ${CLAIM}`);
console.log(`report: ${join(out, 'parity-report.json')}`);
console.log(`montages: ${out}`);
if (failures.length) {
  for (const failure of failures) console.error(`  FAIL ${failure}`);
  process.exit(1);
}
