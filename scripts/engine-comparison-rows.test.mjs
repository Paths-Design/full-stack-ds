import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requireFrozenTraceRows } from './engine-comparison-rows.mjs';

const expected = [
  { id: 'switch', states: ['false', 'true'] },
  { id: 'tabs', states: ['a', 'b'] },
];
const receipt = rows => ({ runId: 'run-1', passed: true, exported: false, rows });

test('shared rows match exactly while target-specific observations remain in the receipt', () => {
  const rows = [expected[0], { id: 'native-pixel', color: '123456' }, expected[1]];
  assert.deepEqual(requireFrozenTraceRows(receipt(rows), expected, 'run-1', 'runtime', false), expected);
});

test('missing, duplicated, reordered and changed shared rows are rejected', () => {
  const cases = [
    [expected[0]],
    [expected[0], expected[0], expected[1]],
    [expected[1], expected[0]],
    [expected[0], { id: 'tabs', states: ['a', 'a'] }],
  ];
  for (const rows of cases) {
    assert.throws(() => requireFrozenTraceRows(receipt(rows), expected, 'run-1', 'runtime', false), /Frozen trace mismatch: runtime/);
  }
});

test('run identity, pass state and runtime/export identity are required', () => {
  assert.throws(() => requireFrozenTraceRows(receipt(expected), expected, 'wrong-run', 'runtime', false), /identity or pass status mismatch/);
  assert.throws(() => requireFrozenTraceRows({ ...receipt(expected), passed: false }, expected, 'run-1', 'runtime', false), /identity or pass status mismatch/);
  assert.throws(() => requireFrozenTraceRows(receipt(expected), expected, 'run-1', 'export', true), /runtime\/export identity mismatch/);
});

test('the frozen fixture itself must have unique IDs', () => {
  assert.throws(() => requireFrozenTraceRows(receipt(expected), [expected[0], expected[0]], 'run-1', 'runtime', false), /duplicate or missing IDs/);
});
