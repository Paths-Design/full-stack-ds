import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runId = crypto.randomUUID();
const out = path.join(root, 'tmp/godot-sequence', crypto.randomUUID());
const project = path.join(out, 'project');
fs.mkdirSync(project, { recursive: true });
fs.cpSync(path.join(root, 'packages/ds-godot/addons'), path.join(project, 'addons'), { recursive: true });
fs.copyFileSync(path.join(root, 'packages/ds-godot/verification/sequence_budget.gd'), path.join(project, 'sequence_budget.gd'));
fs.copyFileSync(path.join(root, 'packages/ds-godot/verification/sequence.gd'), path.join(project, 'sequence.gd'));
fs.copyFileSync(path.join(root, 'packages/ds-godot/verification/sequence_render.gd'), path.join(project, 'sequence_render.gd'));
fs.copyFileSync(path.join(root, 'packages/ds-godot/verification/sequence_accessibility.gd'), path.join(project, 'sequence_accessibility.gd'));
const { buildComponentIR } = await import('../packages/ds-codegen/dist/ir.js');
const { createGodotEmitter } = await import('../packages/ds-codegen/dist/frameworks/godot/factory.js');
const { listComponentContracts } = await import('../packages/ds-codegen/dist/contracts-fs.js');
const corpus = new Map(listComponentContracts(path.join(root, 'packages/ds-contracts')).map(entry => {
  const contract = JSON.parse(fs.readFileSync(entry.absPath, 'utf8'));
  for (const kind of ['tokens', 'styles']) {
    const sidecar = entry.absPath.replace('.contract.json', `.${kind}.json`);
    if (fs.existsSync(sidecar)) contract[kind] = JSON.parse(fs.readFileSync(sidecar, 'utf8'));
  }
  return [contract.name, contract];
}));
const contract = corpus.get('Carousel');
for (const file of createGodotEmitter().emitComponent(buildComponentIR(contract, { allContracts: corpus }), { componentsRoot: '', contractsRoot: '' })) {
  const target = path.join(project, 'addons/full_stack_ds/components', file.relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, file.contents);
}
fs.writeFileSync(path.join(project, 'project.godot'), 'config_version=5\n[application]\nconfig/name="Sequence verification"\n[rendering]\nrenderer/rendering_method="gl_compatibility"\n');
fs.writeFileSync(path.join(project, 'sequence_render_cli.gd'), 'extends SceneTree\nfunc _initialize() -> void:\n\troot.add_child.call_deferred(load("res://sequence_render.gd").new())\n');
fs.writeFileSync(path.join(project, 'sequence_accessibility_cli.gd'), 'extends SceneTree\nfunc _initialize() -> void:\n\troot.add_child.call_deferred(load("res://sequence_accessibility.gd").new())\n');
const godot = process.env.GODOT ?? '/Applications/Godot.app/Contents/MacOS/Godot';
console.log('Evidence:', out);
if (process.argv.includes('--inspect-ax')) {
  const phase = process.env.FSDS_SEQUENCE_PHASE ?? 'moving';
  if (!['moving', 'transfer'].includes(phase)) throw new Error('Unknown accessibility inspection phase');
  const control = process.argv.includes('--ax-control');
  const wrapperPath = path.join(project, 'addons/full_stack_ds/runtime/sequence_slide.gd');
  if (control) {
    const source = fs.readFileSync(wrapperPath, 'utf8');
    if (source.split('not accessibility_current').length !== 2) throw new Error('Accessibility control input is not unique');
    fs.writeFileSync(wrapperPath, source.replace('not accessibility_current', 'false'));
  }
  fs.writeFileSync(path.join(out, 'accessibility-config.json'), JSON.stringify({ runId, phase, control, wrapperSha256: crypto.createHash('sha256').update(fs.readFileSync(wrapperPath)).digest('hex') }, null, 2) + '\n');
  const inspection = spawnSync(godot, ['--accessibility', 'always', '--path', project, '--script', 'res://sequence_accessibility_cli.gd'], { env: { ...process.env, FSDS_ENGINE_OUT: out, FSDS_ENGINE_RUN: runId, FSDS_SEQUENCE_PHASE: phase }, encoding: 'utf8', timeout: 120000 });
  const log = (inspection.stdout ?? '') + (inspection.stderr ?? '');
  fs.writeFileSync(path.join(out, 'accessibility-inspection.log'), log);
  if (inspection.error || inspection.status !== 0 || /SCRIPT ERROR|Parse Error/.test(log)) throw new Error('Accessibility inspection failed to run');
  console.log('Inspection ended. Native accessibility-tree assertions require an external inspector; no automatic accessibility pass is claimed.');
  process.exit(0);
}
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
fs.writeFileSync(path.join(out, script + '-receipt.json'), JSON.stringify({ ...receipt, inputs: Object.fromEntries(['runtime/sequence_budget.gd', 'runtime/sequence.gd', 'runtime/sequence_slide.gd', 'runtime/budget_progress.gd', 'components/Carousel/Carousel.gd'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(project, 'addons/full_stack_ds', file))).digest('hex')])) }, null, 2) + '\n');
}
function checkRenderReceipt(directory, exported) {
  const receipt = JSON.parse(fs.readFileSync(path.join(directory, 'render-receipt.json'), 'utf8'));
  const observedMotion = receipt.effectiveReducedMotion ? receipt.distinctIntermediateEdges === 0 : receipt.distinctIntermediateEdges >= 3;
  if (!receipt.passed || !observedMotion || receipt.runId !== runId || receipt.exported !== exported) throw new Error('Rendered receipt did not establish this run and executable kind');
  return receipt;
}
if (process.argv.includes('--render') || process.argv.includes('--export')) {
  const result = spawnSync(godot, ['--path', project, '--script', 'res://sequence_render_cli.gd'], { env: { ...process.env, FSDS_ENGINE_OUT: out, FSDS_ENGINE_RUN: runId }, encoding: 'utf8', timeout: 60000 });
  const log = (result.stdout ?? '') + (result.stderr ?? '');
  fs.writeFileSync(path.join(out, 'render.log'), log);
  process.stdout.write(log);
  if (result.error || result.status !== 0 || /SCRIPT ERROR|Parse Error/.test(log)) throw new Error('Rendered sequence verification failed');
  checkRenderReceipt(out, false);
}
if (process.argv.includes('--export')) {
  fs.writeFileSync(path.join(project, 'main.gd'), 'extends Node\nfunc _ready() -> void:\n\tvar probe := "sequence_accessibility" if OS.get_environment("FSDS_SEQUENCE_PHASE") in ["moving", "transfer"] else "sequence_render"\n\tadd_child(load("res://" + probe + ".gd").new())\n');
  fs.writeFileSync(path.join(project, 'main.tscn'), '[gd_scene load_steps=2 format=3]\n[ext_resource type="Script" path="res://main.gd" id="1"]\n[node name="SequenceProbe" type="Node"]\nscript=ExtResource("1")\n');
  const settings = path.join(project, 'project.godot');
  fs.writeFileSync(settings, fs.readFileSync(settings, 'utf8').replace('[application]', '[application]\nrun/main_scene="res://main.tscn"').replace('[rendering]', '[rendering]\ntextures/vram_compression/import_etc2_astc=true'));
  fs.writeFileSync(path.join(project, 'export_presets.cfg'), '[preset.0]\nname="macOS"\nplatform="macOS"\nrunnable=true\nexport_filter="all_resources"\ninclude_filter="*.json"\nexclude_filter=""\nexport_path=""\n[preset.0.options]\napplication/bundle_identifier="org.fullstackds.carousel.probe"\ncodesign/codesign=0\n');
  const archive = path.join(out, 'Carousel.zip');
  for (const [tag, args] of [['import', ['--editor', '--import']], ['export', ['--export-debug', 'macOS', archive]]]) {
    const run = spawnSync(godot, ['--headless', '--path', project, ...args], { encoding: 'utf8', timeout: 180000 });
    const log = (run.stdout ?? '') + (run.stderr ?? '');
    fs.writeFileSync(path.join(out, `${tag}.log`), log);
    if (run.error || run.status !== 0 || /SCRIPT ERROR|Parse Error|Assertion failed/.test(log)) throw new Error(`${tag} failed; inspect ${out}`);
  }
  const extracted = path.join(out, 'exported');
  const unzip = spawnSync('unzip', ['-q', archive, '-d', extracted], { encoding: 'utf8' });
  if (unzip.error || unzip.status !== 0) throw new Error('Cannot extract exported Carousel app');
  const apps = fs.readdirSync(extracted).filter(name => name.endsWith('.app'));
  if (apps.length !== 1) throw new Error('Expected one freshly exported app');
  const bin = path.join(extracted, apps[0], 'Contents/MacOS');
  const executable = path.join(bin, fs.readdirSync(bin)[0]);
  const witness = path.join(out, 'exported-witness');
  fs.mkdirSync(witness);
  const player = spawnSync(executable, [], { cwd: extracted, env: { ...process.env, FSDS_ENGINE_OUT: witness, FSDS_ENGINE_RUN: runId, FSDS_SEQUENCE_PHASE: '' }, encoding: 'utf8', timeout: 60000 });
  const log = (player.stdout ?? '') + (player.stderr ?? '');
  fs.writeFileSync(path.join(witness, 'player.log'), log);
  if (player.error || player.status !== 0 || /SCRIPT ERROR|Parse Error|Assertion failed/.test(log)) throw new Error('Exported Carousel failed; inspect its player log');
  const receipt = checkRenderReceipt(witness, true);
  if (receipt.executable !== executable) throw new Error('Receipt did not come from the freshly exported executable');
  fs.writeFileSync(path.join(witness, 'provenance.json'), JSON.stringify({ runId, executable, archiveSha256: crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex'), inputs: JSON.parse(fs.readFileSync(path.join(out, 'sequence-receipt.json'), 'utf8')).inputs }, null, 2) + '\n');
  console.log(JSON.stringify({ exported: true, distinctIntermediateEdges: receipt.distinctIntermediateEdges, executable, witness }));
}
if (process.argv.includes('--mutations')) {
  const controls = [
    { name: 'current-slide-accessibility', file: 'runtime/sequence.gd', from: 'slides[i].wrapper.accessibility_current = i == budget.index and budget.count > 0', to: 'slides[i].wrapper.accessibility_current = true', test: 'sequence' },
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
