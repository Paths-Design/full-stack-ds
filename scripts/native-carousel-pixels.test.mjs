import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspectRows } from './native-carousel-pixels.mjs';

function rows(edges) {
  return Buffer.from(edges.flatMap(edge => Array.from({ length: 32 }, (_, x) => x < edge ? [36, 99, 186] : [17, 107, 75]).flat()));
}
test('requires actual progressive painted displacement between stable endpoints', () => {
  assert.equal(inspectRows(rows([32, 28, 20, 12, 0, 0]), 32, 0, 32).motion.length, 3);
  assert.equal(inspectRows(rows([32, 28, 20, 12, 2, 0, 0]), 32, 0, 32).motion.length, 3);
  assert.throws(() => inspectRows(rows([32, 32, 0, 0]), 32, 0, 32));
  assert.throws(() => inspectRows(rows([32, 20, 20, 20, 0, 0]), 32, 0, 32));
  assert.throws(() => inspectRows(rows([32, 12, 20, 28, 0, 0]), 32, 0, 32));
});
test('rejects a viewport with a missing painted strip', () => {
  const raw = rows([32, 28, 20, 12, 0, 0]);
  for (let frame = 1; frame < 4; frame++) raw.fill(255, frame * 96 + 12, frame * 96 + 36);
  assert.throws(() => inspectRows(raw, 32, 0, 32));
});
