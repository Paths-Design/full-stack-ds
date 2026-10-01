import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';

// Canonical governance is shared by linked worktrees; source remains at cwd.
export function governanceRoot(cwd = process.cwd()) {
  return path.dirname(execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd, encoding: 'utf8' }).trim());
}

export function classify(spec) {
  const records = spec.evidence ?? [];
  const acceptance = (spec.acceptance ?? []).map(ac => {
    const matches = records.filter(e => e.criterion_id === ac.id);
    const e = matches.length === 1 ? matches[0] : null;
    return { id: ac.id, status: e?.status ?? (matches.length ? 'ambiguous' : 'missing'),
      reference: e?.evidence_ref ?? null, waiverReason: e?.waiver_reason ?? null,
      commit: e?.commit_sha ?? null };
  });
  const unknownCriteria = records.filter(e => !acceptance.some(ac => ac.id === e.criterion_id)).map(e => e.criterion_id);
  const complete = acceptance.length > 0 && new Set(acceptance.map(a => a.id)).size === acceptance.length
    && unknownCriteria.length === 0 && acceptance.every(a => a.status === 'pass' && typeof a.reference === 'string' && a.reference.trim());
  let contribution = 'open-investigation';
  if (spec.lifecycle_state === 'closed' || spec.lifecycle_state === 'archived') {
    if (spec.resolution === 'superseded') contribution = 'historical-follow-successor';
    else if (spec.resolution === 'abandoned') contribution = 'abandoned-inspect-negative-result-or-gap';
    else if (spec.resolution === 'completed' && complete) contribution = 'recorded-completion-needs-proof-review';
    else contribution = 'no-completion-inference';
  }
  return { id: spec.id, title: spec.title, lifecycleState: spec.lifecycle_state,
    resolution: spec.resolution ?? null, acceptance, unknownCriteria, contribution,
    // Preserve declaration and prose separately: a mentioned ID is not a successor edge.
    successors: spec.successors ?? null,
    closureNotes: spec.closure_notes ?? null,
    closureReferences: [...new Set((spec.closure_notes ?? '').match(/\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+-\d+\b/g) ?? [])],
    independentlyVerified: false };
}

export function audit(root = governanceRoot()) {
  const dir = path.join(root, '.caws/specs');
  return fs.readdirSync(dir).filter(f => /^(REL-|DOC-ANALYTICAL-|SHOWCASE-ANALYTICAL-).*\.ya?ml$/.test(f)).sort()
    .map(f => ({ ...classify(yaml.load(fs.readFileSync(path.join(dir, f), 'utf8'))), source: `.caws/specs/${f}` }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  console.log(JSON.stringify({ authority: 'derived audit; no acceptance writes or evidence execution',
    sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    governanceRoot: governanceRoot(),
    governanceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: governanceRoot(), encoding: 'utf8' }).trim(),
    observedAt: new Date().toISOString(), specs: audit() }, null, 2));
}
