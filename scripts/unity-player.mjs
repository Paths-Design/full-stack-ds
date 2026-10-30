/** Fresh standalone macOS consumer. Synthetic UI events prove delivery inside
 * a Player, not physical device/input-system integration. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.platform !== 'darwin') throw new Error('This bounded witness supports macOS only.');
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
const dirt = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
if (revision.status !== 0 || dirt.status !== 0) throw new Error('Cannot identify Unity Player source state');
const runId = crypto.randomUUID();
const out = path.resolve(root, 'tmp', 'unity-player', runId);
const project = path.join(out, 'project');
const editor = process.env.UNITY_EDITOR ?? '/Applications/Unity/Hub/Editor/6000.5.3f1/Unity.app/Contents/MacOS/Unity';
const pkg = path.join(root, 'packages/ds-unity');
for (const dir of ['Assets/Editor', 'Assets/Resources', 'ProjectSettings', 'Packages']) fs.mkdirSync(path.join(project, dir), { recursive: true });
fs.writeFileSync(path.join(project, 'ProjectSettings/ProjectVersion.txt'), 'm_EditorVersion: 6000.5.3f1\n');
fs.cpSync(pkg, path.join(project, 'Packages/com.fullstackds.ui'), { recursive: true });
fs.writeFileSync(path.join(project, 'Packages/manifest.json'), JSON.stringify({ dependencies: { 'com.unity.modules.uielements': '1.0.0', 'com.unity.modules.screencapture': '1.0.0', 'com.unity.modules.imageconversion': '1.0.0' } }));
fs.copyFileSync(path.join(pkg, 'Tests/Player~/Build.cs'), path.join(project, 'Assets/Editor/Build.cs'));
fs.copyFileSync(path.join(pkg, 'Tests/Player~/PlayerWitness.cs'), path.join(project, 'Assets/PlayerWitness.cs'));
fs.copyFileSync(path.join(pkg, 'Samples~/InteractiveControls/Controls.uxml'), path.join(project, 'Assets/Resources/Controls.uxml'));
fs.copyFileSync(path.join(pkg, 'Samples~/InteractiveControls/Sample.uss'), path.join(project, 'Assets/Resources/Sample.uss'));
fs.writeFileSync(path.join(project, 'Assets/Resources/Glyph.uxml'), '<ui:UXML xmlns:ui="UnityEngine.UIElements" xmlns:ds="FullStackDS"><ds:Icon name="check" size="xl" /></ui:UXML>\n');
fs.writeFileSync(path.join(project, 'Assets/Resources/RuntimeTheme.tss'), '@import url("unity-theme://default");\n');
const app = path.join(out, 'Witness.app');
const env = { ...process.env, FSDS_PLAYER_APP: app, FSDS_PLAYER_RUN: runId, FSDS_PLAYER_EVIDENCE: out };
const hash = crypto.createHash('sha256');
function hashTree(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) { const p = path.join(dir,e.name); if(e.isDirectory()) hashTree(p); else { hash.update(path.relative(pkg,p)); hash.update(fs.readFileSync(p)); } } }
hashTree(pkg);
fs.writeFileSync(path.join(out, 'provenance.json'), JSON.stringify({runId, sourceRevision: revision.stdout.trim(), sourceDirty: dirt.stdout.trim().length > 0, packageSha256: hash.digest('hex'), editor, runnerSha256: crypto.createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex')}, null, 2));
console.log('Evidence:', out);
function run(exe, args, timeout) { const r = spawnSync(exe,args,{env,stdio:'inherit',timeout}); if(r.error) throw r.error; if(r.status !== 0) throw new Error(`${exe} exited ${r.status}; inspect ${out}`); }
run(editor, ['-batchmode','-quit','-projectPath',project,'-executeMethod','BuildWitness.Run','-logFile',path.join(out,'build.log')], 600000);
const binaries = fs.readdirSync(path.join(app,'Contents/MacOS'));
if(binaries.length !== 1) throw new Error('Ambiguous Player executable');
run(path.join(app,'Contents/MacOS',binaries[0]), ['-screen-fullscreen','0','-screen-width','640','-screen-height','800','-logFile',path.join(out,'player.log')], 120000);
const result = JSON.parse(fs.readFileSync(path.join(out,'result.json'),'utf8'));
const expected = ['standalone-process', 'packaged-panel-and-uxml', 'player-panel', 'generated-switch-initial-state', 'sample-stylesheet-resolves', 'packaged-stylesheet-resolves', 'submit-delivers-one-switch-change', 'accordion-selection', 'accordion-contract-icon-ref', 'tabs-selection', 'popover-panel-root', 'popover-layout', 'accordion-composed-icon-inherits-pixels', 'popover-escape', 'accordion-composed-icon-recolors', 'accordion-composed-icon-unknown-clears', 'icon-authored-variant', 'icon-size-prop', 'icon-authored-pixels', 'icon-inherited-color', 'icon-unknown-clears', 'icon-recovery-and-size', 'icon-uxml-resource', 'icon-uxml-reload-1', 'icon-uxml-reload-2'];
if(result.runId !== runId || result.editor !== false || result.platform !== 'OSXPlayer' || result.passed !== true || JSON.stringify(result.checks) !== JSON.stringify(expected) || !fs.existsSync(path.join(out,'player.png'))) throw new Error('Missing, mismatched or failed Player witness');
console.log(JSON.stringify(result,null,2));
