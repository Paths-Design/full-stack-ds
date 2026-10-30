import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {requireFrozenTraceRows} from './engine-comparison-rows.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runId=crypto.randomUUID();
const out=path.join(root,'tmp/engine-comparison',runId);
const traces=path.join(root,'packages/ds-godot/fixtures/traces.json');
fs.mkdirSync(out,{recursive:true});
const env={...process.env,FSDS_ENGINE_OUT:out,FSDS_ENGINE_RUN:runId,FSDS_ENGINE_TRACES:traces};
function run(exe,args,log){const r=spawnSync(exe,args,{cwd:root,env,encoding:'utf8',timeout:600000});fs.writeFileSync(path.join(out,log),(r.stdout??'')+(r.stderr??''));if(r.error||r.status!==0)throw new Error(`${log} failed; inspect ${out}`);}
function digestTree(relative) {
 const hash=crypto.createHash('sha256');
 function walk(dir) { for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {const p=path.join(dir,entry.name); if(entry.isDirectory())walk(p); else {hash.update(path.relative(root,p));hash.update(fs.readFileSync(p));}} }
 walk(path.join(root,relative)); return hash.digest('hex');
}
const sources=Object.fromEntries(['packages/ds-godot','packages/ds-unity','packages/ds-codegen/src/frameworks/godot','packages/ds-contracts'].map(p=>[p,digestTree(p)]));
console.log('Evidence:',out);
run(process.execPath,['scripts/godot-pilot.mjs'],'godot-runner.log');
const project=path.join(out,'unity');
for(const dir of ['Assets/Editor','Packages','ProjectSettings'])fs.mkdirSync(path.join(project,dir),{recursive:true});
fs.cpSync(path.join(root,'packages/ds-unity'),path.join(project,'Packages/com.fullstackds.ui'),{recursive:true});
fs.copyFileSync(path.join(root,'packages/ds-unity/Tests/Comparison~/EngineComparison.cs'),path.join(project,'Assets/Editor/EngineComparison.cs'));
fs.writeFileSync(path.join(project,'Assets/Editor/Comparison.asmdef'),JSON.stringify({name:'EngineComparison',references:['FullStackDS.Runtime'],includePlatforms:['Editor'],optionalUnityReferences:['TestAssemblies']}));
fs.writeFileSync(path.join(project,'Packages/manifest.json'),JSON.stringify({dependencies:{'com.unity.test-framework':'1.7.0','com.unity.modules.uielements':'1.0.0'}}));
fs.writeFileSync(path.join(project,'ProjectSettings/ProjectVersion.txt'),'m_EditorVersion: 6000.5.3f1\n');
run(process.env.UNITY_EDITOR??'/Applications/Unity/Hub/Editor/6000.5.3f1/Unity.app/Contents/MacOS/Unity',['-batchmode','-projectPath',project,'-runTests','-testPlatform','EditMode','-testFilter','FullStackDS.Tests.EngineComparison','-testResults',path.join(out,'unity.xml'),'-logFile',path.join(out,'unity.log')],'unity-process.log');
const expected=JSON.parse(fs.readFileSync(traces,'utf8')).cases.map(c=>({id:c.id,states:c.expected}));
const unity=JSON.parse(fs.readFileSync(path.join(out,'unity.json'),'utf8'));
const godotRuntime=JSON.parse(fs.readFileSync(path.join(out,'godot-runtime.json'),'utf8'));
const godotExport=JSON.parse(fs.readFileSync(path.join(out,'godot.json'),'utf8'));
requireFrozenTraceRows(unity,expected,runId,'Unity Editor');
requireFrozenTraceRows(godotRuntime,expected,runId,'Godot runtime',false);
requireFrozenTraceRows(godotExport,expected,runId,'Godot export',true);
fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify({runId,passed:true,sources,tracesSha256:crypto.createHash('sha256').update(fs.readFileSync(traces)).digest('hex'),rows:expected,boundary:'Frozen shared traces only: Unity Editor versus Godot runtime and export; target-specific rows remain separately witnessed. No physical input claim.'},null,2));
console.log('Shared traces match:',out);
