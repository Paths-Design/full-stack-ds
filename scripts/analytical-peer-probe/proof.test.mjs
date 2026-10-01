import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fixture } from './fixture.mjs';
import { observe } from './observe.mjs';
import { producePeerText } from '../../packages/ds-codegen/dist/analytical/peer-text-probe.js';

// Fixed before the consumer. These facts are not recovered from its carrier.
const expected = {
  issues: [],
  datasets: [{ id: 'd0', standing: 'qualified', relation: 'samples' }, { id: 'd1', standing: 'qualified', relation: 'samples' }],
  tasks: [{ path: 'root', task: 'magnitude-comparison', realized: false }],
  records: [
    ['d0', '0.0.0', 1, 'a', 2], ['d0', '0.0.0', '1', 'a', 3],
    ['d1', '0.0.1', 1, 'b', 8], ['d1', '0.0.1', '1', 'b', 7],
  ].map(([dataset, view, day, field, value]) => ({ dataset, view, key: [['site', 'west'], ['day', day]],
    panels: [['site', 'west']], field, value, unit: 'u', lower: { field: 'lo', value: 0 }, upper: { field: 'hi', value: 10 } })),
};
const output = (variant = 'baseline', layout = 'lines') => producePeerText(fixture(variant).selected, layout);
const read = artifact => { assert.equal(artifact.kind, 'peer-text-probe'); return observe(artifact.text); };
const normalized = observed => ({ ...observed, records: [...observed.records].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) });

test('A1 actual compiled consumer preserves scoped identities and bounded facts', () => {
  const artifact = JSON.parse(execFileSync(process.execPath, ['scripts/analytical-peer-probe/run.mjs'], { cwd: new URL('../..', import.meta.url), encoding: 'utf8' }));
  assert.deepEqual(read(artifact), expected);
  assert.equal(Object.hasOwn(artifact, 'carrier'), false);
});

test('A2 output-only observation detects plausible identity range and task corruption', () => {
  const baseline = output();
  assert.deepEqual(read(baseline), expected);
  const mutations = [
    s => s.replace('In dataset "d0"', 'In dataset "d1"'),
    s => s.replace('at view "0.0.0"', 'at view "0.0.1"'),
    s => s.replace('between "lo" (0)', 'between "hi" (0)'),
    s => s.replace('requests "magnitude-comparison"', 'requests "value-lookup"'),
    s => s.replace('["day",1]', '["day","1"]'),
  ];
  for (const mutate of mutations) {
    const observed = observe(mutate(baseline.text));
    assert.equal(observed.records.reduce((n, r) => n + r.value, 0), 20);
    assert.notDeepEqual(observed, expected);
  }
  for (const broken of [baseline.text.split('\n').slice(1).join('\n'), baseline.text.replace(/Host at[^\n]+\n/, ''), baseline.text.replace('is 2 "u"', 'is NaN "u"')]) {
    assert.notDeepEqual(observe(broken).issues, []);
  }
});

test('A3 actual information loss is distinct from presentation residue and unsupported tasks', () => {
  const artifact = output();
  assert.deepEqual(artifact, output('changed-loss')); // Different note value is genuinely unrecoverable.
  for (const d of [0, 1]) for (const row of [0, 1]) for (const field of [d === 0 ? 'b' : 'a', 'note']) {
    assert.deepEqual(output(`loss-${d}-${row}-${field}`), artifact);
  }
  assert.equal(artifact.loss.values.length, 8);
  assert.deepEqual(artifact.loss.values, [
    ['d0', 1, 'b'], ['d0', 1, 'note'], ['d0', '1', 'b'], ['d0', '1', 'note'],
    ['d1', 1, 'a'], ['d1', 1, 'note'], ['d1', '1', 'a'], ['d1', '1', 'note'],
  ].map(([dataset, day, field]) => ({ dataset, key: [['site', 'west'], ['day', day]], field })));
  assert.deepEqual(artifact.loss.values.filter(v => v.dataset === 'd0' && v.key[1][1] === 1).map(v => v.field).sort(), ['b', 'note']);
  assert.deepEqual(artifact.loss.tasks, [{ path: 'root', task: 'magnitude-comparison', reason: 'host operation and comparison task are not realized by this bounded summary' }]);
  assert.deepEqual(artifact.residue, { layout: 'lines', traversal: 'composition and supplied observation order; no analytical ordering claim' });
  assert.equal(artifact.loss.values.some(v => ['a', 'lo', 'hi'].includes(v.field) && v.dataset === 'd0'), false);
});

test('A4 semantic changes affect claims while formatting and detached mutation preserve custody', () => {
  assert.equal(read(output('changed-value')).records[0].value, 4);
  assert.equal(read(output('changed-population')).records.length, 2);
  assert.deepEqual(read(output('baseline', 'paragraphs')), expected);
  assert.notEqual(output('baseline', 'paragraphs').text, output().text);
  assert.deepEqual(normalized(read(output('reordered'))), normalized(expected));
  assert.notEqual(output('reordered').text, output().text);
  assert.equal(output('baseline', { baseline: 3 }).kind, 'unsupported'); // A semantic change cannot enter through layout.
  const { input, selected, first } = fixture();
  assert.equal(selected.kind, 'selected');
  const original = structuredClone(selected.program.carrier);
  const before = producePeerText(selected);
  first[0].a = 99; input.composite.host.task = 'value-lookup';
  assert.deepEqual(producePeerText(selected), before);
  before.loss.values[0].field = 'forged'; before.text = 'forged';
  assert.deepEqual(selected.program.carrier, original);
  assert.deepEqual(read(producePeerText(selected)), expected);
});

test('A5 non-selected dispositions cannot manufacture a textual peer', () => {
  for (const [variant, kind] of [['contradicted', 'refused'], ['missing', 'unproven'], ['empty', 'nothing-to-realize']]) {
    const result = output(variant);
    assert.equal(result.kind, kind);
    assert.equal(Object.hasOwn(result, 'text'), false);
  }
  assert.throws(() => producePeerText({ kind: 'selected', program: { intent: { kind: 'readback' }, carrier: {} } }), /minted/);
});

test('A6 the observed peer states its scope without promoting a milestone or task', () => {
  const artifact = output();
  assert.deepEqual(read(artifact), expected);
  assert.equal(artifact.scope, 'bounded view statements; not complete carrier recovery or host-task realization');
  assert.equal(artifact.loss.tasks.length, 1);
  assert.equal(artifact.loss.values.length, 8);
  assert.equal(Object.hasOwn(artifact, 'milestoneComplete'), false);
});
