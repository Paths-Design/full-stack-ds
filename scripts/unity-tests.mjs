/** Real Unity package-import + EditMode lane. No mock Unity assemblies.
 * UNITY_EDITOR selects the editor binary; generated project, logs and results
 * stay under tmp/unity-pilot and are never package source. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = path.join(root, 'tmp/unity-pilot/project');
const evidence = path.join(root, 'tmp/unity-pilot');
const editor = process.env.UNITY_EDITOR ?? '/Applications/Unity/Hub/Editor/6000.5.3f1/Unity.app/Contents/MacOS/Unity';
if (!fs.existsSync(editor)) throw new Error('Set UNITY_EDITOR to an installed Unity 6 Editor executable.');
// Optional compiler-only diagnostic. It cannot stand in for Editor execution.
if (process.argv.includes('--compile-only')) {
  const resources = path.resolve(path.dirname(editor), '../Resources');
  const scripting = path.join(resources, 'Scripting');
  const sdkRoot = path.join(scripting, 'DotNetSdk');
  const sdk = fs.readdirSync(path.join(sdkRoot, 'sdk')).sort().at(-1);
  const out = path.join(evidence, 'compile');
  // Generator output is diagnostic evidence; clear it so removed classes do not linger.
  fs.rmSync(path.join(out, 'uxml'), { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'uxml'), { recursive: true });
  const dlls = dir => fs.readdirSync(dir).filter(n => n.endsWith('.dll')).map(n => path.join(dir, n));
  const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith('.cs') ? [path.join(dir, e.name)] : []);
  const references = [...dlls(path.join(scripting, 'NetStandard/ref/2.1.0')), ...dlls(path.join(scripting, 'Managed/UnityEngine'))];
  const compile = (name, sources, extra = [], generator = false) => {
    const output = path.join(out, name + '.dll');
    const args = ['-nologo', '-target:library', '-langversion:9', '-out:' + output, ...[...references, ...extra].map(p => '-r:' + p), ...sources];
    if (generator) args.push('-analyzer:' + path.join(resources, 'BuildPipeline/Unity.SourceGenerators/Unity.UIToolkit.SourceGenerator.dll'), '-generatedfilesout:' + path.join(out, 'uxml'));
    const rsp = path.join(out, name + '.rsp');
    fs.writeFileSync(rsp, args.map(a => JSON.stringify(a)).join('\n'));
    const run = spawnSync(path.join(sdkRoot, 'dotnet'), [path.join(sdkRoot, 'sdk', sdk, 'Roslyn/bincore/csc.dll'), '@' + rsp], { stdio: 'inherit' });
    if (run.error) throw run.error;
    if (run.status !== 0) process.exit(run.status ?? 1);
    return output;
  };
  const runtime = compile('FullStackDS.Runtime', files(path.join(root, 'packages/ds-unity/Runtime')), [], true);
  compile('FullStackDS.Editor', files(path.join(root, 'packages/ds-unity/Editor')), [runtime]);
  compile('FullStackDS.Sample', files(path.join(root, 'packages/ds-unity/Samples~/InteractiveControls')), [runtime]);
  console.log('Runtime + Unity UXML source generation, Editor showcase and runtime sample compiled against real Unity assemblies. Editor execution NOT performed.');
  process.exit(0);
}
fs.mkdirSync(path.join(project, 'Assets'), { recursive: true });
fs.writeFileSync(path.join(project, 'Assets/RuntimeTheme.tss'), '@import url("unity-theme://default");\n');
fs.mkdirSync(path.join(project, 'ProjectSettings'), { recursive: true });
fs.mkdirSync(path.join(project, 'Packages'), { recursive: true });
fs.writeFileSync(path.join(project, 'ProjectSettings/ProjectVersion.txt'), 'm_EditorVersion: 6000.5.3f1\n');
fs.writeFileSync(path.join(project, 'Packages/manifest.json'), JSON.stringify({
  dependencies: { 'com.unity.test-framework': '1.7.0', 'com.unity.modules.uielements': '1.0.0' },
  testables: ['com.fullstackds.ui'],
}, null, 2));
const destination = path.join(project, 'Packages/com.fullstackds.ui');
fs.rmSync(destination, { recursive: true, force: true });
fs.cpSync(path.join(root, 'packages/ds-unity'), destination, { recursive: true });
// Import the sample as an actual consumer, not just ignored Samples~ bytes.
fs.cpSync(path.join(root, 'packages/ds-unity/Samples~/InteractiveControls'), path.join(project, 'Assets/InteractiveControls'), { recursive: true });
const results = path.join(evidence, 'results.xml');
fs.rmSync(results, { force: true });
const log = path.join(evidence, 'editor.log');
console.log(`Unity package lane: ${editor}\nProject: ${project}\nLog: ${log}`);
const run = spawnSync(editor, ['-batchmode', '-projectPath', project, '-runTests', '-testPlatform', 'EditMode', '-testResults', results, '-logFile', log], { stdio: 'inherit', timeout: 600_000 });
if (run.error) throw run.error;
if (!fs.existsSync(results)) {
  const output = fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '';
  const reason = /No valid Unity Editor license found/.test(output) ? 'Activate an Editor license in Unity Hub before running this lane.' : 'Unity exited before producing test results.';
  throw new Error(`${reason} Exit ${run.status}; inspect ${log}`);
}
const xml = fs.readFileSync(results, 'utf8');
const summary = xml.match(/<test-run\b[^>]*>/)?.[0];
console.log(summary);
if (run.status !== 0 || !summary?.includes('result="Passed"') || !/passed="[1-9]\d*"/.test(summary)) process.exit(1);
