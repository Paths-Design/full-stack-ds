import assert from 'node:assert/strict';
import test from 'node:test';
import { audit, classify } from './audit.mjs';

const completed = () => ({ id: 'EXAMPLE-01', lifecycle_state: 'closed', resolution: 'completed',
  acceptance: [{ id: 'A1' }], evidence: [{ criterion_id: 'A1', status: 'pass', evidence_ref: 'inspected receipt' }] });

test('closure and a pass badge cannot manufacture evidence adequacy', () => {
  const good = completed();
  assert.equal(classify(good).contribution, 'recorded-completion-needs-proof-review');
  assert.equal(classify(good).independentlyVerified, false);
  for (const evidence of [[], [{ criterion_id: 'A1', status: 'pass' }],
    [{ criterion_id: 'A1', status: 'fail', evidence_ref: 'failure' }],
    [{ criterion_id: 'A1', status: 'unchecked', evidence_ref: 'not executed' }],
    [{ criterion_id: 'A1', status: 'waived', waiver_reason: 'not proven' }],
    [...good.evidence, ...good.evidence], [...good.evidence, { criterion_id: 'A9', status: 'pass' }]]) {
    assert.equal(classify({ ...good, evidence }).contribution, 'no-completion-inference');
  }
  assert.equal(classify({ ...good, acceptance: [] }).contribution, 'no-completion-inference');
  assert.equal(classify({ ...good, resolution: undefined }).contribution, 'no-completion-inference');
  assert.equal(classify({ ...good, lifecycle_state: 'active' }).contribution, 'open-investigation');
});

test('real analytical outcomes retain the distinctions that changed the program', () => {
  const records = new Map(audit().map(s => [s.id, s]));
  const browser = records.get('REL-COMPOSITE-BROWSER-BOUNDARY-02');
  assert.equal(browser.contribution, 'recorded-completion-needs-proof-review');
  assert.equal(browser.independentlyVerified, false);
  const abandoned = records.get('REL-RETAIN-INCIDENCE-01');
  assert.equal(abandoned.contribution, 'abandoned-inspect-negative-result-or-gap');
  assert.equal(abandoned.acceptance[0].status, 'waived');
  assert.match(abandoned.acceptance[0].waiverReason, /ACCEPTANCE CRITERION WAS NOT MET/);
  for (const id of ['REL-PROJECTION-COMBINATORS-01', 'REL-INCIDENCE-WITNESS-01']) {
    assert.equal(records.get(id).contribution, 'historical-follow-successor');
  }
  const incidence = records.get('REL-INCIDENCE-WITNESS-01');
  assert.ok(incidence.closureReferences.includes('REL-PRIMITIVE-SUPPORT-01'));
  assert.equal(incidence.successors, null); // Prose reference, not a structured edge.
  assert.equal(records.get('REL-VIEW-ALGEBRA-01').contribution, 'open-investigation');
});
