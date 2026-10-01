import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { observe } from './observe.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'tmp/analytical-peer-proof');
fs.mkdirSync(out, { recursive: true });
const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
const run = (label, args) => {
  const r = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  fs.writeFileSync(path.join(out, `${label}.log`), `${r.stdout ?? ''}${r.stderr ?? ''}`);
  if (r.error || r.signal) throw r.error ?? new Error(`${label}: ${r.signal}`);
  return r.status;
};
if (run('build', ['node_modules/typescript/bin/tsc', '-p', 'packages/ds-codegen/tsconfig.json']) !== 0) throw new Error('fresh compilation failed');
if (run('baseline', ['--test', 'scripts/analytical-peer-probe/proof.test.mjs']) !== 0) throw new Error('baseline failed');
for (const variant of ['baseline', 'changed-value', 'changed-loss', 'changed-population', 'reordered', 'contradicted', 'missing', 'empty']) {
  const label = variant === 'baseline' ? 'output' : variant;
  if (run(label, ['scripts/analytical-peer-probe/run.mjs', variant]) !== 0) throw new Error(`consumer failed: ${variant}`);
  const artifact = JSON.parse(fs.readFileSync(path.join(out, `${label}.log`), 'utf8'));
  fs.writeFileSync(path.join(out, `${label}.observed.json`), `${JSON.stringify(artifact.kind === 'peer-text-probe' ? observe(artifact.text) : { disposition: artifact.kind }, null, 2)}\n`);
}
const compiled = path.join(root, 'packages/ds-codegen/dist/analytical/peer-text-probe.js');
const original = fs.readFileSync(compiled, 'utf8');
const needle = '${json(dataset.id)} at view';
if (original.split(needle).length !== 2) throw new Error('dataset-binding control must target exactly one compiled expression');
let control;
try {
  fs.writeFileSync(compiled, original.replace(needle, '${json("d0")} at view'));
  control = run('producer-control', ['--test', '--test-name-pattern=A1 actual compiled', 'scripts/analytical-peer-probe/proof.test.mjs']);
  const log = fs.readFileSync(path.join(out, 'producer-control.log'), 'utf8');
  if (control !== 1 || !/not ok.*A1 actual compiled/.test(log) || !log.includes('ERR_ASSERTION') || !log.includes("'d1'")) throw new Error('producer binding defect was not rejected by the independent facts');
} finally { fs.writeFileSync(compiled, original); }
if (fs.readFileSync(compiled, 'utf8') !== original) throw new Error('compiled control was not restored');
const hash = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const files = ['packages/ds-codegen/src/analytical/peer-text-probe.ts', 'packages/ds-codegen/dist/analytical/peer-text-probe.js',
  'scripts/analytical-peer-probe/fixture.mjs', 'scripts/analytical-peer-probe/observe.mjs', 'scripts/analytical-peer-probe/proof.test.mjs',
  'scripts/analytical-peer-probe/run.mjs', 'scripts/analytical-peer-probe/run-proof.mjs'];
const { digestOf, PEER_TEXT_BASIS, compositeOutputDigest } = await import('../../packages/ds-codegen/dist/analytical/authority.js');
const receipt = { recordedAt: new Date().toISOString(), revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  sourceStatus: execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: root, encoding: 'utf8' }).trim(),
  result: 'fresh compiled consumer passed; producer identity control rejected; compiled bytes restored',
  baselineExit: 0, controlExit: control, compositeOutputDigest: compositeOutputDigest(),
  peerTextDigest: digestOf(PEER_TEXT_BASIS, path.join(root, 'packages/ds-codegen/src/analytical')),
  hashes: Object.fromEntries(files.map(f => [f, hash(f)])) };
fs.writeFileSync(path.join(out, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(receipt.result);
