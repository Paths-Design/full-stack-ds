// Output-only grammar reader. No analytical model, selector, producer or fixture.
const string = '"(?:[^"\\\\]|\\\\.)*"';
const number = '(-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)';
const row = new RegExp(`^In dataset (${string}) at view (${string}), grain (.+), panels (.+): (${string}) is ${number} (${string}), between (${string}) \\(${number}\\) and (${string}) \\(${number}\\)\\.$`);
const dataset = new RegExp(`^Dataset (${string}) is (${string}) for relation (${string})\\.$`);
const task = new RegExp(`^Host at (${string}) requests (${string}); this summary does not realize that task\\.$`);

export function observe(text) {
  const lines = text.split(/\n+/).filter(Boolean), issues = [], records = [], datasets = [], tasks = [];
  const header = /^Analytical summary: composition retained; (\d+) records; (\d+) hosts; (\d+) datasets\.$/.exec(lines.shift() ?? '');
  if (!header) issues.push('missing standing or population');
  for (const line of lines) {
    try {
      let m;
      if ((m = dataset.exec(line))) datasets.push({ id: JSON.parse(m[1]), standing: JSON.parse(m[2]), relation: JSON.parse(m[3]) });
      else if ((m = task.exec(line))) tasks.push({ path: JSON.parse(m[1]), task: JSON.parse(m[2]), realized: false });
      else if ((m = row.exec(line))) {
        const record = { dataset: JSON.parse(m[1]), view: JSON.parse(m[2]), key: JSON.parse(m[3]), panels: JSON.parse(m[4]),
          field: JSON.parse(m[5]), value: Number(m[6]), unit: JSON.parse(m[7]),
          lower: { field: JSON.parse(m[8]), value: Number(m[9]) }, upper: { field: JSON.parse(m[10]), value: Number(m[11]) } };
        if (![record.value, record.lower.value, record.upper.value].every(Number.isFinite)) issues.push('nonfinite observation');
        if (!Array.isArray(record.key) || !record.key.every(p => Array.isArray(p) && p.length === 2 && typeof p[0] === 'string' && ['string', 'number'].includes(typeof p[1]))) issues.push('unreadable grain');
        records.push(record);
      } else issues.push('unreadable statement');
    } catch { issues.push('unreadable statement'); }
  }
  if (header && [records.length, tasks.length, datasets.length].some((n, i) => n !== Number(header[i + 1]))) issues.push('missing or duplicate population');
  if (datasets.some(d => d.standing !== 'qualified')) issues.push('standing');
  const identities = records.map(r => JSON.stringify([r.dataset, r.view, r.key, r.panels]));
  if (new Set(identities).size !== identities.length) issues.push('duplicate identity');
  return { issues, datasets, tasks, records };
}
