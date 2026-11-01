import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.env.FSDS_ENGINE_OUT ?? path.resolve(root,'tmp','godot-pilot',crypto.randomUUID());
if (!path.isAbsolute(out)) throw new Error('FSDS_ENGINE_OUT must be an absolute path');
const runId = process.env.FSDS_ENGINE_RUN ?? crypto.randomUUID();
const revision = spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});
if(revision.status!==0)throw new Error('Cannot identify Godot pilot source revision');
const sourceRevision = revision.stdout.trim();
const dirt = spawnSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'});
if(dirt.status!==0)throw new Error('Cannot identify Godot pilot source tree state');
const project = path.join(out,'project');
fs.mkdirSync(project,{recursive:true});
fs.cpSync(path.join(root,'packages/ds-godot/addons'),path.join(project,'addons'),{recursive:true});
const verification = path.join(root,'packages/ds-godot/verification');
for(const name of ['main.gd','roundtrip.gd']) fs.copyFileSync(path.join(verification,name),path.join(project,name));
// Roundtrip fixtures may load sibling verification scripts by res:// path.
fs.mkdirSync(path.join(project,'verification'),{recursive:true});
for(const name of fs.readdirSync(verification).filter(name=>name.endsWith('.gd'))) fs.copyFileSync(path.join(verification,name),path.join(project,'verification',name));
fs.copyFileSync(path.join(verification,'glyph_main.tscn'),path.join(project,'verification/glyph_main.tscn'));
fs.copyFileSync(path.join(verification,'spinner_main.tscn'),path.join(project,'verification/spinner_main.tscn'));
fs.copyFileSync(path.join(root,'packages/ds-godot/fixtures/traces.json'),path.join(project,'traces.json'));
// A separate changed-token fixture checks emitted resource values in Godot.
const {buildComponentIR}=await import('../packages/ds-codegen/dist/ir.js');
const {createGodotEmitter}=await import('../packages/ds-codegen/dist/frameworks/godot/factory.js');
function emitProbe(ir) {
 for(const file of createGodotEmitter().emitComponent(ir,{componentsRoot:'',contractsRoot:''})) {
  const target=path.join(project,'addons/full_stack_ds/components',file.relativePath);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,file.contents);
 }
}
const contractDir=path.join(root,'packages/ds-contracts/components/Accordion');
const contract=JSON.parse(fs.readFileSync(path.join(contractDir,'Accordion.contract.json'),'utf8'));
contract.tokens=JSON.parse(fs.readFileSync(path.join(contractDir,'Accordion.tokens.json'),'utf8'));
contract.styles=JSON.parse(fs.readFileSync(path.join(contractDir,'Accordion.styles.json'),'utf8'));
const probe=buildComponentIR(contract); probe.name='TokenProbe';
for(const fact of probe.tokenFacts) if(fact.rawValue?.match(/^#[0-9a-f]{6}$/i)) fact.rawValue='#123456';
emitProbe(probe);
const syntheticGroup=structuredClone(contract);
const syntheticRef=syntheticGroup.anatomy.dom.children[0].children[0].children[0].children[1];
syntheticRef.attrs.ariaLabel='Synthetic indicator';
const iconContract=JSON.parse(fs.readFileSync(path.join(root,'packages/ds-contracts/components/Icon/Icon.contract.json'),'utf8'));
const syntheticIR=buildComponentIR(syntheticGroup,{allContracts:new Map([[syntheticGroup.name,syntheticGroup],[iconContract.name,iconContract]])});
syntheticIR.name='SyntheticGroup';
emitProbe(syntheticIR);
for(const name of ['Text','Divider']) {
 // Exercise the copied package artifacts; probe emission must not replace them.
 const componentDir=path.join(project,'addons/full_stack_ds/components',name);
 for(const file of [`${name}.gd`,`${name}.tscn`,'theme.tres','capabilities.json']) {
  const artifact=path.join(componentDir,file);
  if(!fs.existsSync(artifact)) throw new Error(`Missing packaged ${name} artifact: ${artifact}`);
 }
 const base=path.join(root,'packages/ds-contracts/components',name,name);
 const source=JSON.parse(fs.readFileSync(base+'.contract.json','utf8'));
 source.tokens=JSON.parse(fs.readFileSync(base+'.tokens.json','utf8'));
 source.styles=JSON.parse(fs.readFileSync(base+'.styles.json','utf8'));
 const ir=buildComponentIR(source);
 if(name==='Divider') {
  ir.name='RuleProbe';
  for(const fact of ir.tokenFacts) if(fact.name==='divider.color') fact.rawValue='#123456';
  emitProbe(ir);
 }
}
const actionBase=path.join(root,'packages/ds-contracts/components/Button/Button');
const defaultedAction=JSON.parse(fs.readFileSync(actionBase+'.contract.json','utf8'));
defaultedAction.name='DefaultedAction';
defaultedAction.tokens=JSON.parse(fs.readFileSync(actionBase+'.tokens.json','utf8'));
defaultedAction.styles=JSON.parse(fs.readFileSync(actionBase+'.styles.json','utf8').replaceAll('button.design','defaulted-action.design'));
for(const name of ['disabled','loading']) {
 const member=defaultedAction.props.designed.members.find(prop=>prop.name===name);
 if(!member)throw new Error('Missing action default probe prop: '+name);
 member.default=true;
}
emitProbe(buildComponentIR(defaultedAction));

fs.writeFileSync(path.join(project,'project.godot'),'config_version=5\n[application]\nconfig/name="Full Stack DS Godot Pilot"\nrun/main_scene="res://main.tscn"\n[display]\nwindow/size/viewport_width=960\nwindow/size/viewport_height=800\n[rendering]\nrenderer/rendering_method="gl_compatibility"\ntextures/vram_compression/import_etc2_astc=true\nenvironment/defaults/default_clear_color=Color(0.12,0.14,0.18,1)\n');
fs.writeFileSync(path.join(project,'main.tscn'),'[gd_scene load_steps=2 format=3]\n[ext_resource type="Script" path="res://main.gd" id="1"]\n[node name="Pilot" type="Control"]\nlayout_mode=3\nanchors_preset=15\nanchor_right=1.0\nanchor_bottom=1.0\nscript=ExtResource("1")\n');
const godot = process.env.GODOT ?? '/Applications/Godot.app/Contents/MacOS/Godot';
const env = {...process.env,FSDS_ENGINE_OUT:out,FSDS_ENGINE_RUN:runId};
function run(args, tag, extra={}) {
 const r=spawnSync(godot,['--path',project,...args],{env:{...env,...extra},encoding:'utf8',timeout:180000});
 const log=(r.stdout??'')+(r.stderr??''); fs.writeFileSync(path.join(out,tag+'.log'),log);
 if(r.error || r.status !== 0 || /SCRIPT ERROR|Parse Error|Assertion failed/.test(log)) throw new Error(`${tag} failed: ${log.slice(-4000)}`);
 return log;
}
function glyphReceipt(log, exported) {
 const line=log.split(/\r?\n/).find(line=>line.startsWith('FSDS_GLYPH_RESULT '));
 if(!line)throw new Error('Missing executed glyph probe');
 const receipt=JSON.parse(line.slice('FSDS_GLYPH_RESULT '.length));
 if(receipt.runId!==runId||receipt.passed!==true||receipt.exported!==exported||receipt.failures.length)
  throw new Error('Failed or mismatched glyph probe: '+JSON.stringify(receipt));
 return receipt;
}
function spinnerReceipt(log, exported) {
 const line=log.split(/\r?\n/).find(line=>line.startsWith('FSDS_SPINNER_RESULT '));
 if(!line)throw new Error('Missing executed spinner probe');
 const receipt=JSON.parse(line.slice('FSDS_SPINNER_RESULT '.length));
 if(receipt.runId!==runId||receipt.passed!==true||receipt.exported!==exported||receipt.failures.length||receipt.size!==24||receipt.thickness!==4||receipt.accentPixels<4||receipt.trackPixels<11)
  throw new Error('Failed or mismatched spinner probe: '+JSON.stringify(receipt));
 return receipt;
}
console.log('Evidence:',out);
run(['--headless','--editor','--import'],'import');
for(const mode of ['write','read']) {
 const log=run(['--headless','--editor','--script','res://roundtrip.gd'],mode,{FSDS_ROUNDTRIP:mode});
 if(!log.includes('FSDS_ROUNDTRIP_OK')) throw new Error('Missing scene roundtrip witness');
}
run([], 'runtime');
glyphReceipt(run(['res://verification/glyph_main.tscn'],'glyph-runtime'), false);
spinnerReceipt(run(['res://verification/spinner_main.tscn'],'spinner-runtime'), false);
const receipt=JSON.parse(fs.readFileSync(path.join(out,'godot.json'),'utf8'));
if(receipt.runId!==runId || !receipt.passed) throw new Error('Invalid runtime receipt');
fs.copyFileSync(path.join(out,'godot.json'),path.join(out,'godot-runtime.json'));
fs.writeFileSync(path.join(out,'provenance.json'),JSON.stringify({runId,godot,sourceRevision,sourceDirty:dirt.stdout.trim().length>0,tracesSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(project,'traces.json'))).digest('hex')},null,2));
console.log(JSON.stringify(receipt));

fs.writeFileSync(path.join(project,'export_presets.cfg'), `[preset.0]
name="macOS"
platform="macOS"
runnable=true
export_filter="all_resources"
include_filter="*.json"
exclude_filter=""
export_path=""
[preset.0.options]
application/bundle_identifier="org.fullstackds.pilot"
codesign/codesign=0
`);
const exported=path.join(out,'Pilot.zip');
run(['--headless','--export-debug','macOS',exported],'export');
const unzip=spawnSync('unzip',['-q',exported,'-d',path.join(out,'exported')],{encoding:'utf8'});
if(unzip.status!==0)throw new Error('Cannot extract exported app');
const app=fs.readdirSync(path.join(out,'exported')).find(n=>n.endsWith('.app'));
if(!app)throw new Error('Missing exported application');
const binDir=path.join(out,'exported',app,'Contents/MacOS');
const executable=path.join(binDir,fs.readdirSync(binDir)[0]);
fs.unlinkSync(path.join(out,'godot.json'));
const player=spawnSync(executable,[],{env,encoding:'utf8',timeout:180000});
fs.writeFileSync(path.join(out,'exported.log'),(player.stdout??'')+(player.stderr??''));
if(player.error||player.status!==0)throw new Error('Exported Player failed');
const final=JSON.parse(fs.readFileSync(path.join(out,'godot.json'),'utf8'));
if(final.runId!==runId||!final.passed||!final.exported)throw new Error('Exported receipt mismatch');
// Re-export the same copied package with the dedicated glyph scene as the
// entry point. The ordinary trace and glyph pixels each execute in a fresh
// macOS Player instead of inheriting the other's assertions.
fs.writeFileSync(path.join(project,'project.godot'),fs.readFileSync(path.join(project,'project.godot'),'utf8').replace(
 'run/main_scene="res://main.tscn"','run/main_scene="res://verification/glyph_main.tscn"'));
const glyphZip=path.join(out,'GlyphPilot.zip');
run(['--headless','--export-debug','macOS',glyphZip],'glyph-export');
const glyphUnzip=spawnSync('unzip',['-q',glyphZip,'-d',path.join(out,'glyph-exported')],{encoding:'utf8'});
if(glyphUnzip.status!==0)throw new Error('Cannot extract glyph exported app');
const glyphApp=fs.readdirSync(path.join(out,'glyph-exported')).find(n=>n.endsWith('.app'));
if(!glyphApp)throw new Error('Missing glyph exported application');
const glyphBinDir=path.join(out,'glyph-exported',glyphApp,'Contents/MacOS');
const glyphExecutable=path.join(glyphBinDir,fs.readdirSync(glyphBinDir)[0]);
const glyphPlayer=spawnSync(glyphExecutable,[],{env,encoding:'utf8',timeout:180000});
const glyphPlayerLog=(glyphPlayer.stdout??'')+(glyphPlayer.stderr??'');
fs.writeFileSync(path.join(out,'glyph-exported.log'),glyphPlayerLog);
if(glyphPlayer.error||glyphPlayer.status!==0||/SCRIPT ERROR|Parse Error|Assertion failed/.test(glyphPlayerLog))
 throw new Error('Exported glyph Player failed: '+glyphPlayerLog.slice(-4000));
glyphReceipt(glyphPlayerLog,true);
fs.writeFileSync(path.join(project,'project.godot'),fs.readFileSync(path.join(project,'project.godot'),'utf8').replace(
 'run/main_scene="res://verification/glyph_main.tscn"','run/main_scene="res://verification/spinner_main.tscn"'));
run(['--headless','--editor','--import'],'spinner-import');
const spinnerZip=path.join(out,'SpinnerPilot.zip');
run(['--headless','--export-debug','macOS',spinnerZip],'spinner-export');
const spinnerUnzip=spawnSync('unzip',['-q',spinnerZip,'-d',path.join(out,'spinner-exported')],{encoding:'utf8'});
if(spinnerUnzip.status!==0)throw new Error('Cannot extract spinner exported app');
const spinnerApp=fs.readdirSync(path.join(out,'spinner-exported')).find(n=>n.endsWith('.app'));
if(!spinnerApp)throw new Error('Missing spinner exported application');
const spinnerBinDir=path.join(out,'spinner-exported',spinnerApp,'Contents/MacOS');
const spinnerExecutable=path.join(spinnerBinDir,fs.readdirSync(spinnerBinDir)[0]);
const spinnerPlayer=spawnSync(spinnerExecutable,[],{env,encoding:'utf8',timeout:180000});
const spinnerPlayerLog=(spinnerPlayer.stdout??'')+(spinnerPlayer.stderr??'');
fs.writeFileSync(path.join(out,'spinner-exported.log'),spinnerPlayerLog);
if(spinnerPlayer.error||spinnerPlayer.status!==0||/SCRIPT ERROR|Parse Error|Assertion failed/.test(spinnerPlayerLog))
 throw new Error('Exported spinner Player failed: '+spinnerPlayerLog.slice(-4000));
spinnerReceipt(spinnerPlayerLog,true);
console.log('Exported Player passed.');
