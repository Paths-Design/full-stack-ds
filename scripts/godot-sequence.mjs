import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'tmp/godot-sequence', crypto.randomUUID());
const project = path.join(out, 'project');
fs.mkdirSync(project, { recursive: true });
fs.cpSync(path.join(root, 'packages/ds-godot/addons'), path.join(project, 'addons'), { recursive: true });
fs.copyFileSync(path.join(root, 'packages/ds-godot/verification/sequence_budget.gd'), path.join(project, 'sequence_budget.gd'));
fs.copyFileSync(path.join(root, 'packages/ds-godot/verification/sequence.gd'), path.join(project, 'sequence.gd'));
fs.copyFileSync(path.join(root, 'packages/ds-godot/verification/sequence_render.gd'), path.join(project, 'sequence_render.gd'));
const { buildComponentIR } = await import('../packages/ds-codegen/dist/ir.js');
const { createGodotEmitter } = await import('../packages/ds-codegen/dist/frameworks/godot/factory.js');
const base = path.join(root, 'packages/ds-contracts/components/Carousel/Carousel');
const contract = JSON.parse(fs.readFileSync(base + '.contract.json', 'utf8'));
contract.tokens = JSON.parse(fs.readFileSync(base + '.tokens.json', 'utf8'));
contract.styles = JSON.parse(fs.readFileSync(base + '.styles.json', 'utf8'));
for (const file of createGodotEmitter().emitComponent(buildComponentIR(contract), { componentsRoot: '', contractsRoot: '' })) {
  const target = path.join(project, 'addons/full_stack_ds/components', file.relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, file.contents);
}
fs.writeFileSync(path.join(project, 'project.godot'), 'config_version=5\n[application]\nconfig/name="Sequence verification"\n[rendering]\nrenderer/rendering_method="gl_compatibility"\n');
const godot = process.env.GODOT ?? '/Applications/Godot.app/Contents/MacOS/Godot';
console.log('Evidence:', out);
for (const script of ['sequence_budget', 'sequence']) {
const parsed = spawnSync(godot, ['--headless', '--path', project, '--check-only', '--script', `res://addons/full_stack_ds/runtime/${script}.gd`], { encoding: 'utf8', timeout: 15000 });
const parseLog = (parsed.stdout ?? '') + (parsed.stderr ?? '');
fs.writeFileSync(path.join(out, script + '-parse.log'), parseLog);
if (parsed.error || parsed.status !== 0 || /SCRIPT ERROR|Parse Error/.test(parseLog)) throw new Error(parseLog);
const result = spawnSync(godot, ['--headless', '--path', project, '--script', `res://${script}.gd`], { encoding: 'utf8', timeout: 60000 });
const log = (result.stdout ?? '') + (result.stderr ?? '');
fs.writeFileSync(path.join(out, script + '.log'), log);
process.stdout.write(log);
if (result.error || result.status !== 0 || /SCRIPT ERROR|Parse Error|Assertion failed/.test(log)) throw new Error('Godot sequence verification failed');
const receipt = log.split('\n').filter(line => line.startsWith('{')).map(line => JSON.parse(line)).find(value => value.kind.startsWith('godot-sequence'));
if (!receipt?.passed) throw new Error('Missing passing sequence receipt');
fs.writeFileSync(path.join(out, script + '-receipt.json'), JSON.stringify({ ...receipt, inputs: Object.fromEntries(['runtime/sequence_budget.gd', 'runtime/sequence.gd', 'runtime/budget_progress.gd', 'components/Carousel/Carousel.gd'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(project, 'addons/full_stack_ds', file))).digest('hex')])) }, null, 2) + '\n');
}
if (process.argv.includes('--render')) {
  const result = spawnSync(godot, ['--path', project, '--script', 'res://sequence_render.gd'], { env: { ...process.env, FSDS_ENGINE_OUT: out }, encoding: 'utf8', timeout: 60000 });
  const log = (result.stdout ?? '') + (result.stderr ?? '');
  fs.writeFileSync(path.join(out, 'render.log'), log);
  process.stdout.write(log);
  if (result.error || result.status !== 0 || /SCRIPT ERROR|Parse Error/.test(log)) throw new Error('Rendered sequence verification failed');
  const receipt = JSON.parse(fs.readFileSync(path.join(out, 'render-receipt.json'), 'utf8'));
  const observedMotion = receipt.effectiveReducedMotion ? receipt.distinctIntermediateEdges === 0 : receipt.distinctIntermediateEdges >= 3;
  if (!receipt.passed || !observedMotion) throw new Error('Rendered movement did not match the observed native preference');
}
if (process.argv.includes('--mutations')) {
  const controls = [
    { name: 'linear-size-scaling', file: 'runtime/sequence.gd', from: 'sqrt(viewport.size.x / float(profile.referenceWidth))', to: 'viewport.size.x / float(profile.referenceWidth)', test: 'sequence' },
    { name: 'content-minimum', file: 'runtime/sequence.gd', from: 'minimum = minimum.max(slide.body.get_combined_minimum_size())', to: 'minimum = Vector2(0, 160)', test: 'sequence' },
    { name: 'system-motion-preference', file: 'runtime/sequence.gd', from: 'reduced_motion or system_motion_preference == 1', to: 'reduced_motion', test: 'sequence' },
    { name: 'acknowledgement', file: 'runtime/sequence_budget.gd', from: 'valid() and playing and not pending and pauses', to: 'valid() and playing and pauses', test: 'sequence_budget' },
    { name: 'stale-completion', file: 'runtime/sequence_budget.gd', from: 'if owner == revision: resume', to: 'if true: resume', test: 'sequence_budget' },
    { name: 'progress-steps', file: 'runtime/budget_progress.gd', from: 'floorf(bounded * steps) / steps if reduced_motion else bounded', to: 'bounded', test: 'sequence' },
    { name: 'pointer-intent', file: 'runtime/sequence.gd', from: '_rotation_intent = not budget.playing if rotation_button.is_visible_in_tree() and rotation_button.get_global_rect().has_point(event.position) else null', to: '_rotation_intent = null', test: 'sequence' },
    { name: 'spatial-snap', file: 'runtime/sequence.gd', from: 'lerpf(target.start, target.end, eased)', to: 'target.end', test: 'sequence' },
    { name: 'size-cap', file: 'runtime/sequence.gd', from: 'float(profile.maxMultiplier)', to: '1000.0', test: 'sequence' },
    { name: 'channel-binding', file: 'components/Carousel/Carousel.gd', from: '\\"valueProp\\":\\"index\\"', to: '\\"valueProp\\":\\"wrongIndex\\"', test: 'sequence' },
  ];
  const receipts = [];
  for (const control of controls) {
    const mutantProject = path.join(out, 'mutants', control.name);
    fs.cpSync(project, mutantProject, { recursive: true });
    const file = path.join(mutantProject, 'addons/full_stack_ds', control.file);
    const original = fs.readFileSync(file, 'utf8');
    if (original.split(control.from).length !== 2) throw new Error(`Mutation input not unique: ${control.name}`);
    fs.writeFileSync(file, original.replace(control.from, control.to));
    const run = spawnSync(godot, ['--headless', '--path', mutantProject, '--script', `res://${control.test}.gd`], { encoding: 'utf8', timeout: 60000 });
    const log = (run.stdout ?? '') + (run.stderr ?? '');
    fs.writeFileSync(path.join(out, control.name + '-mutant.log'), log);
    const receipt = log.split('\n').filter(line => line.startsWith('{')).map(line => JSON.parse(line)).find(value => value.kind.startsWith('godot-sequence'));
    // A parser error, crash or timeout is not a behavioral kill.
    const killed = !run.error && run.status === 1 && !/SCRIPT ERROR|Parse Error/.test(log) && receipt?.passed === false && receipt.failures.length > 0;
    receipts.push({ name: control.name, killed, failures: receipt?.failures ?? [] });
  }
  fs.writeFileSync(path.join(out, 'mutations.json'), JSON.stringify(receipts, null, 2) + '\n');
  console.log(JSON.stringify({ mutations: receipts }));
  if (receipts.some(receipt => !receipt.killed)) throw new Error('A sequence behavioral mutation survived or failed inconclusively');
}
