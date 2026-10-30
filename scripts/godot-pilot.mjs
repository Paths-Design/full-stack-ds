import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.env.FSDS_ENGINE_OUT ?? path.join(root,'tmp/godot-pilot',crypto.randomUUID());
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
for(const name of ['Text','Divider']) {
 const base=path.join(root,'packages/ds-contracts/components',name,name);
 const source=JSON.parse(fs.readFileSync(base+'.contract.json','utf8'));
 source.tokens=JSON.parse(fs.readFileSync(base+'.tokens.json','utf8'));
 source.styles=JSON.parse(fs.readFileSync(base+'.styles.json','utf8'));
 const ir=buildComponentIR(source);
 emitProbe(ir);
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
console.log('Evidence:',out);
run(['--headless','--editor','--import'],'import');
for(const mode of ['write','read']) {
 const log=run(['--headless','--editor','--script','res://roundtrip.gd'],mode,{FSDS_ROUNDTRIP:mode});
 if(!log.includes('FSDS_ROUNDTRIP_OK')) throw new Error('Missing scene roundtrip witness');
}
run([], 'runtime');
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
console.log('Exported Player passed.');
