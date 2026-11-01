#!/usr/bin/env node
/**
 * GPUI ↔ web consistency audit and regression ratchet.
 *
 * Answers, mechanically: how much of the contract does each generated target
 * express, and where does GPUI diverge from the React/Vue/Svelte trio?
 *
 * Derived per component from the contract + sidecars (via the compiled IR) and
 * from the generated artifacts:
 *
 *   parts     — declared anatomy parts that appear in the target artifact
 *               (web: the BEM block class; GPUI: the part debug selector)
 *   props     — declared props that appear in the target's generated API
 *               (web: the generated props block; GPUI: generated builders)
 *   behavior  — components carrying control/channel/event facts whose control
 *               is realized in the target
 *   a11y      — components authoring role/aria facts whose artifact carries
 *               role/aria attributes
 *
 * The committed baseline (`packages/ds-gpui/web-consistency-baseline.json`)
 * ratchets the measurement: `--check` fails when any component/target loses a
 * realized fact (GPUI or web) and when baseline and corpus diverge in either
 * direction, so divergence cannot silently grow and progress must be
 * rebaselined deliberately.
 *
 * Modes:
 *   --check     (default) compare against the baseline; exit 1 on regression
 *   --write     rewrite the baseline + human report
 *   --self-test prove the ratchet detects a regression and a stale entry
 *   --verbose   print the per-component matrix
 *
 * Output: docs/internal/gpui-web-consistency/consistency.{json,md} (ignored).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DIST = path.join(ROOT, 'packages/ds-codegen/dist');
const CONTRACTS = path.join(ROOT, 'packages/ds-contracts');
const OUT_DIR = path.join(ROOT, 'docs/internal/gpui-web-consistency');
const BASELINE = path.join(ROOT, 'packages/ds-gpui/web-consistency-baseline.json');
const SCHEMA = 'fsds.gpui-web-consistency.v1';
const TARGETS = ['react', 'vue', 'svelte'];
const MODE = process.argv.includes('--write')
  ? 'write'
  : process.argv.includes('--self-test')
    ? 'self-test'
    : 'check';
const VERBOSE = process.argv.includes('--verbose');

let buildComponentIR;
let loadBoxModelPrimitive;
let mergeBoxModelDefaults;
try {
  ({ buildComponentIR } = await import(path.join(DIST, 'ir.js')));
  ({ loadBoxModelPrimitive, mergeBoxModelDefaults } = await import(path.join(DIST, 'box-model.js')));
} catch (error) {
  console.error(
    'FATAL: could not import the compiled codegen IR from',
    DIST,
    '\nBuild codegen first: pnpm exec turbo run build --filter=@full-stack-ds/codegen',
  );
  console.error(String(error));
  process.exit(2);
}

const boxModel = loadBoxModelPrimitive(CONTRACTS);
const componentsDir = path.join(CONTRACTS, 'components');
const names = fs
  .readdirSync(componentsDir)
  .filter(name => fs.existsSync(path.join(componentsDir, name, `${name}.contract.json`)))
  .sort();
const corpus = new Map(
  names.map(name => {
    const contract = JSON.parse(fs.readFileSync(path.join(componentsDir, name, `${name}.contract.json`), 'utf8'));
    for (const sidecar of ['tokens', 'styles']) {
      const file = path.join(componentsDir, name, `${name}.${sidecar}.json`);
      if (fs.existsSync(file)) contract[sidecar] = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    contract.tokens = mergeBoxModelDefaults(contract.tokens, boxModel, contract.morphology);
    return [name, contract];
  }),
);

const TARGET_CONFIG = {
  react: { dir: 'packages/ds-react/src/components', handler: /\bon[A-Z][A-Za-z]*\s*=/ },
  vue: { dir: 'packages/ds-vue/src/components', handler: /@[A-Za-z]+\s*=|v-on:/ },
  svelte: { dir: 'packages/ds-svelte/src/components', handler: /\bon[a-z]+\s*=|on:[a-z]+=/ },
};

function loadContract(name) {
  const contract = JSON.parse(fs.readFileSync(path.join(componentsDir, name, `${name}.contract.json`), 'utf8'));
  for (const sidecar of ['tokens', 'styles']) {
    const file = path.join(componentsDir, name, `${name}.${sidecar}.json`);
    if (fs.existsSync(file)) contract[sidecar] = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  contract.tokens = mergeBoxModelDefaults(contract.tokens, boxModel, contract.morphology);
  return contract;
}

function walkNodes(ir) {
  const nodes = [];
  const visit = node => {
    nodes.push(node);
    (node.children ?? []).forEach(visit);
  };
  if (ir.dom) visit(ir.dom);
  return nodes;
}

function declaredParts(ir) {
  return [...new Set(walkNodes(ir).map(node => node.part ?? 'root'))];
}

function declaredProps(ir) {
  return ir.styledProps.map(prop => prop.name);
}

function behaviorFacts(ir) {
  const nodes = walkNodes(ir);
  const wires = nodes.reduce((sum, node) => sum + Object.keys(node.events ?? {}).length, 0);
  const channels = (ir.behavior?.normalizedChannels ?? []).length;
  return wires + channels + (ir.compositeControl ? 1 : 0) + (ir.surface ? 1 : 0) + (ir.interaction ? 1 : 0);
}

/** Declared by-reference children, in anatomy pre-order. */
function declaredRefs(ir) {
  return walkNodes(ir).filter(node => node.componentRef).map(node => node.componentRef);
}

function authoredA11y(contract, ir) {
  const nodes = walkNodes(ir);
  const attrs = nodes.reduce((sum, node) => {
    const keys = [...Object.keys(node.attrs ?? {}), ...Object.keys(node.bindings ?? {})];
    return sum + keys.filter(key => key === 'role' || key.startsWith('aria-')).length;
  }, 0);
  return Boolean(contract.a11y?.role) || Boolean(contract.a11y?.label) || attrs > 0;
}

function readTargetSource(relative) {
  const files = [];
  const walk = dir => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (!/__tests__|\.css$/.test(file)) files.push(file);
    }
  };
  walk(path.join(ROOT, relative));
  return files.map(file => fs.readFileSync(file, 'utf8')).join('\n');
}

function generatedPropsBlock(source) {
  const start = source.indexOf('@generated:start props');
  if (start < 0) return '';
  const end = source.indexOf('@generated:end', start);
  return source.slice(start, end < 0 ? source.length : end);
}

const snake = name => name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

/** Measure one component across the four targets against its declared facts. */
function measureComponent(name) {
  const contract = loadContract(name);
  const ir = buildComponentIR(contract, { allContracts: corpus });
  const prefix = ir.cssPrefix;
  const parts = declaredParts(ir);
  const props = declaredProps(ir);
  const behavior = behaviorFacts(ir);
  const a11y = authoredA11y(contract, ir);

  const refs = declaredRefs(ir);
  const row = {
    declared: { parts: parts.length, props: props.length, behavior, a11y, refs: refs.length },
    targets: {},
  };

  for (const [target, config] of Object.entries(TARGET_CONFIG)) {
    const source = readTargetSource(path.join(config.dir, name));
    if (!source) {
      row.targets[target] = null;
      continue;
    }
    const propsText = generatedPropsBlock(source);
    const renderedRefs = refs.reduce((sum, type) => sum + Math.min(1, (source.match(new RegExp(`<${type}[\\s/>]`, 'g')) ?? []).length), 0);
    row.targets[target] = {
      parts: parts.filter(part => source.includes(part === 'root' ? prefix : `${prefix}__${part}`)).length,
      props: props.filter(prop => new RegExp(`(^|[\\s,{])${prop}\\??\\s*:`).test(propsText)).length,
      behavior: behavior === 0 ? 1 : config.handler.test(source) || /use[A-Z][A-Za-z]*\(/.test(source) ? 1 : 0,
      a11y: a11y && /role=|aria-/.test(source) ? 1 : 0,
      refs: renderedRefs,
    };
  }

  const gpuiDir = path.join(ROOT, 'packages/ds-gpui/src/components', name);
  const gpuiSource = fs.existsSync(path.join(gpuiDir, `${name}.rs`)) ? fs.readFileSync(path.join(gpuiDir, `${name}.rs`), 'utf8') : '';
  const receiptFile = path.join(gpuiDir, 'capabilities.json');
  const receipt = fs.existsSync(receiptFile) ? JSON.parse(fs.readFileSync(receiptFile, 'utf8')) : null;
  const gpuiParts = [
    ...new Set(
      [...gpuiSource.matchAll(/"([a-z0-9-]+)"\.to_string\(\)/g)]
        .map(match => match[1])
        .filter(selector => selector.startsWith(`${prefix}-`))
        .map(selector => selector.slice(prefix.length + 1)),
    ),
  ];
  const builders = new Set([...gpuiSource.matchAll(/pub fn ([a-z][a-z0-9_]*)\s*\(\s*mut self/g)].map(match => match[1]));
  const setters = new Set([...gpuiSource.matchAll(/pub fn (set_[a-z0-9_]+)\s*\(/g)].map(match => match[1]));
  row.targets.gpui = {
    parts: gpuiParts.filter(part => parts.includes(part)).length,
    props: props.filter(prop => builders.has(snake(prop)) || setters.has(`set_${snake(prop)}`)).length,
    // Value controls emit ChangeRequest; action controls invoke a stored callback.
    behavior: behavior === 0 ? 1 : /impl EventEmitter<ChangeRequest>|crate::callback::invoke\(|child\.set_on_/.test(gpuiSource) ? 1 : 0,
    a11y: a11y && /role=|aria-/.test(gpuiSource) ? 1 : 0,
    refs: Math.min(refs.length, (gpuiSource.match(/Option<gpui::Entity<crate::components::/g) ?? []).length),
  };
  row.styleOmissions = receipt?.styleOmissions?.length ?? 0;
  row.omittedFacts = receipt?.omittedFacts?.length ?? 0;
  row.operation = receipt?.operation ?? 'missing-receipt';
  return { name, ...row };
}

const components = Object.fromEntries(names.map(name => [name, measureComponent(name)]));
const aggregates = { declared: { parts: 0, props: 0, behavior: 0, a11y: 0, refs: 0 }, targets: {} };
for (const row of Object.values(components)) {
  aggregates.declared.parts += row.declared.parts;
  aggregates.declared.props += row.declared.props;
  aggregates.declared.behavior += row.declared.behavior > 0 ? 1 : 0;
  aggregates.declared.a11y += row.declared.a11y ? 1 : 0;
  aggregates.declared.refs += row.declared.refs;
}
for (const target of [...TARGETS, 'gpui']) {
  aggregates.targets[target] = { parts: 0, props: 0, behavior: 0, a11y: 0, refs: 0, present: 0 };
  for (const row of Object.values(components)) {
    const value = row.targets[target];
    if (!value) continue;
    aggregates.targets[target].present += 1;
    aggregates.targets[target].parts += value.parts;
    aggregates.targets[target].props += value.props;
    aggregates.targets[target].behavior += row.declared.behavior > 0 && value.behavior ? 1 : 0;
    aggregates.targets[target].a11y += row.declared.a11y && value.a11y ? 1 : 0;
    aggregates.targets[target].refs += value.refs;
  }
}

const baselineDocument = {
  schema: SCHEMA,
  note: 'Measured from contract/IR facts and generated artifacts. Regressions fail audit:gpui-web-consistency; progress is rebaselined with write:gpui-web-consistency.',
  components: Object.fromEntries(
    Object.entries(components).map(([name, row]) => [
      name,
      { declared: row.declared, targets: row.targets },
    ]),
  ),
  aggregates,
};

const DIMENSIONS = ['parts', 'props', 'behavior', 'a11y', 'refs'];

function describe(list) {
  return list.length ? list.slice(0, 12).join(', ') + (list.length > 12 ? ` (+${list.length - 12})` : '') : '-';
}

/** Compare a measured document to a baseline; returns { failures, improvements }. */
function diffAgainstBaseline(current, baseline) {
  const failures = [];
  const improvements = [];
  const baselineComponents = baseline.components ?? {};
  for (const name of Object.keys(baselineComponents)) {
    if (!current.components[name]) failures.push(`stale baseline entry: ${name} is no longer in the corpus`);
  }
  for (const [name, row] of Object.entries(current.components)) {
    const before = baselineComponents[name];
    if (!before) {
      failures.push(`missing baseline entry: ${name} (run write:gpui-web-consistency deliberately)`);
      continue;
    }
    for (const target of [...TARGETS, 'gpui']) {
      const was = before.targets?.[target];
      const now = row.targets?.[target];
      if (!was && !now) continue;
      if (was && !now) failures.push(`${name}/${target}: target output disappeared`);
      else if (!was && now) improvements.push(`${name}/${target}: target output appeared`);
      else {
        for (const dimension of DIMENSIONS) {
          if (now[dimension] < was[dimension]) failures.push(`${name}/${target}: ${dimension} regressed ${was[dimension]} -> ${now[dimension]}`);
          else if (now[dimension] > was[dimension]) improvements.push(`${name}/${target}: ${dimension} improved ${was[dimension]} -> ${now[dimension]}`);
        }
      }
    }
  }
  return { failures, improvements };
}

function reportMarkdown(document) {
  const lines = [
    '# GPUI ↔ web consistency',
    '',
    'Generated by `scripts/gpui-web-consistency-audit.mjs`. Do not hand-edit.',
    '',
    '| target | parts | props | behavior (components) | a11y (components) | references |',
    '|---|---|---|---|---|---|',
  ];
  for (const [target, value] of Object.entries(document.aggregates.targets)) {
    lines.push(
      `| ${target} | ${value.parts}/${document.aggregates.declared.parts} | ${value.props}/${document.aggregates.declared.props} | ${value.behavior}/${document.aggregates.declared.behavior} | ${value.a11y}/${document.aggregates.declared.a11y} | ${value.refs}/${document.aggregates.declared.refs} |`,
    );
  }
  lines.push('', '| component | gpui parts/props/beh/a11y/refs | react | vue | svelte |', '|---|---|---|---|---|');
  const format = value => (value ? `${value.parts}/${value.props}/${value.behavior}/${value.a11y}/${value.refs}` : 'missing');
  for (const [name, row] of Object.entries(document.components)) {
    lines.push(`| ${name} | ${format(row.targets.gpui)} | ${format(row.targets.react)} | ${format(row.targets.vue)} | ${format(row.targets.svelte)} |`);
  }
  return lines.join('\n') + '\n';
}

if (MODE === 'self-test') {
  const current = JSON.parse(JSON.stringify(baselineDocument));
  const baseline = JSON.parse(JSON.stringify(baselineDocument));
  const first = Object.keys(current.components)[0];
  const before = current.components[first].targets.gpui.parts;
  current.components[first].targets.gpui.parts = Math.max(0, before - 1);
  const regression = diffAgainstBaseline(current, baseline);
  const detected = regression.failures.some(failure => failure.includes(`${first}/gpui: parts regressed`));
  // A corpus entry absent from the baseline must ask for a deliberate rebaseline.
  const extraCorpus = JSON.parse(JSON.stringify(baselineDocument));
  extraCorpus.components['NotAComponent'] = { declared: {}, targets: {} };
  const stale = diffAgainstBaseline(extraCorpus, baselineDocument).failures.some(failure => failure.includes('missing baseline entry: NotAComponent'));
  const removedCurrent = JSON.parse(JSON.stringify(baselineDocument));
  delete removedCurrent.components[first];
  const removed = diffAgainstBaseline(removedCurrent, baseline).failures.some(failure => failure.includes(`stale baseline entry: ${first}`));
  if (!detected || !stale || !removed) {
    console.error(`GPUI_CONSISTENCY_SELFTEST_FAIL: regression=${detected} stale=${stale} removed=${removed}`);
    process.exit(1);
  }
  console.log('GPUI_CONSISTENCY_SELFTEST_PASS: regression, stale-entry and removed-entry detection all fire.');
  process.exit(0);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'consistency.json'), JSON.stringify(baselineDocument, null, 2) + '\n');
fs.writeFileSync(path.join(OUT_DIR, 'consistency.md'), reportMarkdown(baselineDocument));

if (MODE === 'write') {
  fs.writeFileSync(BASELINE, JSON.stringify(baselineDocument, null, 2) + '\n');
  console.log(`GPUI_WEB_CONSISTENCY_BASELINE_WRITTEN: ${path.relative(ROOT, BASELINE)}`);
  console.log(`report: ${path.relative(ROOT, path.join(OUT_DIR, 'consistency.md'))}`);
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
if (baseline.schema !== SCHEMA) {
  console.error(`GPUI_CONSISTENCY_BASELINE_SCHEMA: expected ${SCHEMA}, found ${baseline.schema}`);
  process.exit(2);
}
const { failures, improvements } = diffAgainstBaseline(baselineDocument, baseline);

for (const [target, value] of Object.entries(baselineDocument.aggregates.targets)) {
  console.log(
    `${target.padEnd(7)} parts ${value.parts}/${baselineDocument.aggregates.declared.parts}  props ${value.props}/${baselineDocument.aggregates.declared.props}  behavior ${value.behavior}/${baselineDocument.aggregates.declared.behavior}  a11y ${value.a11y}/${baselineDocument.aggregates.declared.a11y}  refs ${value.refs}/${baselineDocument.aggregates.declared.refs}`,
  );
}
if (VERBOSE) {
  for (const [name, row] of Object.entries(baselineDocument.components)) {
    const format = value => (value ? `${value.parts}/${value.props}/${value.behavior}/${value.a11y}/${value.refs}` : 'missing');
    console.log(`${name.padEnd(14)} gpui ${format(row.targets.gpui).padEnd(11)} react ${format(row.targets.react).padEnd(11)} vue ${format(row.targets.vue).padEnd(11)} svelte ${format(row.targets.svelte)}`);
  }
}
if (improvements.length) {
  console.log(`\nratchet can be tightened (improvements not yet rebaselined): ${describe(improvements)}`);
}
if (failures.length) {
  console.error(`\nGPUI_WEB_CONSISTENCY_REGRESSION: ${failures.length} regression(s)`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log('\nGPUI_WEB_CONSISTENCY_PASS: no component lost a realized fact against the committed baseline.');
