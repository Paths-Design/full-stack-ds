// Explicit closure verification for REL-ANALYTICAL-CAPABILITY-CONTRACT-01.
// Not an ordinary admission gate: history, remote availability and this slice's
// scoped diff are intentionally checked here, not imposed on future features.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import yaml from 'js-yaml';
import { governanceRoot } from './audit.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = 'a2925fe77066785752a16570cef459f967d7fbf6';
const proof = 'c30015eca722d81ef43246a0e2805c853f7ead2e';
const run = (bin, args, cwd = root) => {
  const env = { ...process.env, NO_COLOR: '1' };
  delete env.NODE_TEST_CONTEXT; // Child test runners must execute their own tests.
  return execFileSync(bin, args, { cwd, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
};
const git = (...args) => run('git', args);
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const at = (revision, file) => git('show', `${revision}:${file}`);
const spec = id => yaml.load(fs.readFileSync(path.join(governanceRoot(root), '.caws/specs', `${id}.yaml`), 'utf8'));
const contract = 'docs/architecture/analytical-capability-contract.md';

test('A1 durable definitions have one tracked authority without promoting working history', () => {
  const paths = git('ls-files', 'docs').trim().split('\n').filter(p => p.endsWith('.md'));
  for (let i = 1; i <= 6; i++) {
    const matches = paths.flatMap(p => [...read(p).matchAll(new RegExp(`^## M${i} — .+$`, 'gm'))].map(() => p));
    assert.deepEqual(matches, [contract]);
  }
  const text = read(contract);
  assert.match(text, /milestone numbers describe claims, not a waterfall execution schedule/);
  assert.match(text, /historical progress remain machine-local/);
  assert.doesNotMatch(text, /M[1-6] (?:is currently|completed as of)|resume instructions:/i);
  for (const p of ['docs/internal/analytical-long-tail-charter.md', 'docs/internal/analytical-relation-roadmap.md']) {
    assert.equal(git('ls-files', '--', p), '');
    assert.match(git('check-ignore', '--', p), /docs\/internal\//);
  }
});

test('A2 reconciliation changed only the analytical snapshot row and names bounded evidence', () => {
  const file = 'docs/current-implementation-snapshot.md';
  const before = at(`${source}^`, file).split('\n');
  const after = at(source, file).split('\n');
  assert.equal(before.length, after.length);
  const changed = before.flatMap((line, i) => line !== after[i] ? [i] : []);
  assert.equal(changed.length, 1);
  const row = after[changed[0]];
  assert.match(row, /^\| Analytical relations and compositional projection /);
  for (const claim of ['REL-EMBED-COMPOSITE-BUDGET-01', 'REL-COMPOSITE-BROWSER-BOUNDARY-02', 'whole-system M4 remain partial', 'separate active']) assert.ok(row.includes(claim), claim);
  assert.doesNotMatch(row, /embed.*returns.*unproven/);
  for (const file of ['graph-projection.test.ts', 'projection.test.ts', 'projection-boundaries.test.ts', 'composite-output.test.ts']) {
    assert.ok(at(source, `packages/ds-codegen/src/analytical/${file}`).includes('expect('), file);
  }
  for (const id of ['REL-RELATION-M2-VERIFICATION-01', 'REL-SOURCE-GRAIN-02', 'REL-EMBED-COMPOSITE-BUDGET-01', 'REL-COMPOSITE-BROWSER-BOUNDARY-02']) {
    assert.equal(spec(id).resolution, 'completed');
    assert.ok(spec(id).evidence.every(e => e.status === 'pass'));
  }
});

test('A3 outcome audit rejects closure-only and inadequate-evidence inferences', () => {
  const output = run(process.execPath, ['--test', 'scripts/analytical-capability-audit/audit.test.mjs']);
  assert.match(output, /# pass 2\b/);
  assert.match(output, /# fail 0\b/);
});

test('A4 conditional preservation is independent of frozen-basis completion', () => {
  const sourceText = read('packages/ds-codegen/src/analytical/subtraction.ts').replace(/^\s*\*\s?/gm, '');
  assert.match(sourceText, /a coordinate a later stage admits does not reopen it/);
  assert.match(sourceText, /must not be\s+wired into ordinary repo admission/);
  const ledger = JSON.parse(at(source, 'packages/ds-contracts/analytical-fixtures/subtraction-stage2.json'));
  for (const coordinate of ['field.bounds.lower#incidence', 'field.bounds.upper#incidence']) {
    assert.equal(ledger.verdicts[coordinate].disposition, 'unresolved');
  }
  // The proposed consumer preserves declared bounds, not their primitive status.
  const probe = spec('REL-PEER-TEXT-RESIDUE-PROBE-01');
  assert.ok(probe.invariants.some(i => i.includes('conditional on declared carried facts')));
  assert.ok(probe.invariants.some(i => i.includes('No Stage-2 necessity')));
  const output = run(process.execPath, ['node_modules/vitest/vitest.mjs', 'run',
    'packages/ds-codegen/src/analytical/subtraction.test.ts', '-t',
    'the basis is frozen|slice obligation|gate covers every basis']);
  assert.match(output, /8 passed/);
  assert.doesNotMatch(read('.github/workflows/ci.yml'), /analytical:subtraction/);
});

test('A5 unchanged browser proof has a successful remote run and retained artifact', () => {
  const paths = ['packages/ds-codegen/src/analytical', 'scripts/analytical-composite-preview.ts',
    'scripts/analytical-browser-proof.mjs', 'e2e/analytical-composite.spec.ts', 'e2e/analytical-observer.ts',
    'src/components/analytical', 'playwright.analytical.config.ts', '.github/workflows/analytical-browser.yml'];
  assert.equal(git('diff', '--name-only', proof, source, '--', ...paths), '');
  const code = at(proof, 'scripts/analytical-browser-proof.mjs');
  assert.match(code, /control !== 1.*shared scale distance/);
  assert.match(code, /guard !== 1.*Node analytical module entered the browser bundle/);
  const repo = 'repos/Paths-Design/full-stack-ds';
  const status = JSON.parse(run('gh', ['api', `${repo}/actions/runs/36895859647`]));
  assert.equal(status.head_sha, proof);
  assert.equal(status.conclusion, 'success');
  const jobs = JSON.parse(run('gh', ['api', `${repo}/actions/runs/36895859647/jobs`]));
  const steps = jobs.jobs.find(j => j.name === 'analytical-browser').steps;
  assert.equal(steps.find(s => s.name === 'Run pnpm run e2e:analytical').conclusion, 'success');
  const artifacts = JSON.parse(run('gh', ['api', `${repo}/actions/runs/36895859647/artifacts`]));
  const artifact = artifacts.artifacts.find(a => a.id === 11179293251);
  assert.equal(artifact.name, `analytical-browser-${proof}`);
  assert.equal(artifact.expired, false);
  assert.equal(spec('REL-COMPOSITE-BROWSER-BOUNDARY-02').resolution, 'completed');
});

test('A6 next probe precommits discriminating outcomes without milestone promotion', () => {
  const file = '.caws/specs/REL-PEER-TEXT-RESIDUE-PROBE-01.yaml';
  const creation = git('log', '--format=%H', '--diff-filter=A', '--', file).trim();
  assert.ok(creation.length >= 40);
  const p = yaml.load(at(creation, file));
  assert.equal(p.lifecycle_state, 'draft');
  const criteria = p.acceptance.map(a => `${a.given} ${a.when} ${a.then}`).join('\n');
  for (const phrase of ['two distinct snapshots sharing typed keys', 'numeric totals remain unchanged',
    'independent output observer', 'unsupported task claims', 'informative without milestone promotion']) assert.ok(criteria.includes(phrase), phrase);
  assert.equal(git('ls-tree', '--name-only', creation, '--',
    'packages/ds-codegen/src/analytical/peer-text-probe.ts'), '');
});
