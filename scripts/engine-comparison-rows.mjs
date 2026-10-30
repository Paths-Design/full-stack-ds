/** Select the frozen shared trace rows without accepting missing or altered cases. */
export function requireFrozenTraceRows(receipt, expected, runId, label, exported) {
  if (!Array.isArray(expected) || new Set(expected.map(row => row.id)).size !== expected.length) {
    throw new Error('Frozen trace fixture has duplicate or missing IDs');
  }
  if (receipt?.runId !== runId || receipt.passed !== true) {
    throw new Error(`Trace receipt identity or pass status mismatch: ${label}`);
  }
  if (typeof exported === 'boolean' && receipt.exported !== exported) {
    throw new Error(`Trace receipt runtime/export identity mismatch: ${label}`);
  }
  if (!Array.isArray(receipt.rows)) throw new Error(`Trace rows missing: ${label}`);
  const ids = new Set(expected.map(row => row.id));
  const actual = receipt.rows.filter(row => ids.has(row.id));
  if (actual.length !== expected.length || actual.some((row, index) =>
    row.id !== expected[index].id || JSON.stringify(row.states) !== JSON.stringify(expected[index].states))) {
    throw new Error(`Frozen trace mismatch: ${label}`);
  }
  return actual;
}
