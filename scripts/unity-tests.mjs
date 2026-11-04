/** Real Unity package-import + EditMode lane. No mock Unity assemblies.
 * UNITY_EDITOR selects the editor binary; generated project, logs and results
 * stay under the ignored scratch directory and are never package source.
 *
 * Two passes share the scratch project. The consumer pass holds only the
 * embedded package, so a shipped case that needs anything staged fails there,
 * as it would in a consumer project. The harness pass adds what only this
 * script can create (a contract host compiled under a new name, the sample
 * imported with its script) and runs the shipped cases beside Tests/Harness~. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
const dirt = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
if (revision.status !== 0 || dirt.status !== 0) throw new Error('Cannot identify Unity pilot source state');
const evidence = path.resolve(root, 'tmp', 'unity-pilot');
const project = path.join(evidence, 'project');
const provenance = path.join(evidence, 'provenance.json');
fs.rmSync(provenance, { force: true });
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
const editorVersion = editor.match(/\/Editor\/([^/]+)\/Unity\.app\//)?.[1] ?? '6000.5.3f1';
const assets = path.join(project, 'Assets');
const packageSource = path.join(root, 'packages/ds-unity');
const destination = path.join(project, 'Packages/com.fullstackds.ui');
const versionFile = path.join(project, 'ProjectSettings/ProjectVersion.txt');
fs.mkdirSync(path.dirname(versionFile), { recursive: true });
fs.mkdirSync(path.join(project, 'Packages'), { recursive: true });
// One scratch project serves any installed Editor; a Library written by another version is not reusable.
if (fs.existsSync(versionFile) && !fs.readFileSync(versionFile, 'utf8').includes(`m_EditorVersion: ${editorVersion}\n`)) {
  fs.rmSync(path.join(project, 'Library'), { recursive: true, force: true });
}
fs.writeFileSync(versionFile, `m_EditorVersion: ${editorVersion}\n`);
fs.writeFileSync(path.join(project, 'Packages/manifest.json'), JSON.stringify({
  dependencies: { 'com.unity.test-framework': '1.7.0', 'com.unity.modules.uielements': '1.0.0' },
}, null, 2));

// Assets is recreated for each pass, so a fixture left by an earlier pass or
// run cannot satisfy a case in this one.
function resetHost() {
  fs.rmSync(assets, { recursive: true, force: true });
  fs.mkdirSync(assets, { recursive: true });
  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(packageSource, destination, { recursive: true });
}
const stagedAssets = () => fs.readdirSync(assets).filter(name => !name.endsWith('.meta')).sort();

function runPass(pass, witnesses = []) {
  const suffix = pass === 'consumer' ? '' : `-${pass}`;
  const results = path.join(evidence, `results${suffix}.xml`);
  const log = path.join(evidence, `editor${suffix}.log`);
  fs.rmSync(results, { force: true });
  const staged = stagedAssets();
  console.log(`Unity ${pass} pass: ${editor}\nProject: ${project}\nStaged under Assets: ${JSON.stringify(staged)}\nLog: ${log}`);
  const env = { ...process.env, FSDS_UNITY_SCREENSHOTS: path.join(evidence, 'screenshots') };
  const run = spawnSync(editor, ['-batchmode', '-projectPath', project, '-runTests', '-testPlatform', 'EditMode', '-testResults', results, '-logFile', log], { stdio: 'inherit', timeout: 600_000, env });
  if (run.error) throw run.error;
  if (!fs.existsSync(results)) {
    const output = fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '';
    const reason = /No valid Unity Editor license found/.test(output) ? 'Activate an Editor license in Unity Hub before running this lane.' : 'Unity exited before producing test results.';
    throw new Error(`${reason} Exit ${run.status}; inspect ${log}`);
  }
  const xml = fs.readFileSync(results, 'utf8');
  const summary = xml.match(/<test-run\b[^>]*>/)?.[0];
  console.log(summary);
  const leaked = stagedAssets().filter(name => !staged.includes(name));
  const missing = witnesses.filter(name => !new RegExp(`<test-case [^>]*fullname="[^"]*\\.${name}"[^>]*result="Passed"`).test(xml));
  if (leaked.length > 0) console.error(`A case left assets behind in the host: ${leaked.join(', ')}`);
  if (missing.length > 0) console.error(`Harness witnesses did not pass: ${missing.join(', ')}`);
  // A skip would let a case pass here that does not hold in a consumer, so it fails the lane.
  const passed = run.status === 0 && !!summary?.includes('result="Passed"') && /passed="[1-9]\d*"/.test(summary)
    && /\bskipped="0"/.test(summary) && /\binconclusive="0"/.test(summary) && leaked.length === 0 && missing.length === 0;
  return { staged, leaked, missing, resultsSha256: crypto.createHash('sha256').update(xml).digest('hex'), summary, passed };
}

resetHost();
const passes = { consumer: runPass('consumer') };
if (passes.consumer.passed) {
  resetHost();
  // Compile a renamed contract host into the imported package and mount it from
  // UXML. This is a consumer probe, not a committed generated target artifact.
  const { buildComponentIR } = await import('../packages/ds-codegen/dist/ir.js');
  const { createUnityEmitter } = await import('../packages/ds-codegen/dist/frameworks/unity/factory.js');
  const accordion = JSON.parse(fs.readFileSync(path.join(root, 'packages/ds-contracts/components/Accordion/Accordion.contract.json'), 'utf8'));
  const iconContract = JSON.parse(fs.readFileSync(path.join(root, 'packages/ds-contracts/components/Icon/Icon.contract.json'), 'utf8'));
  const synthetic = buildComponentIR(accordion, { allContracts: new Map([[accordion.name, accordion], [iconContract.name, iconContract]]) });
  synthetic.name = 'SyntheticGroup';
  for (const file of createUnityEmitter().emitComponent(synthetic, { componentsRoot: '', contractsRoot: path.join(root, 'packages/ds-contracts') })) {
    const target = path.join(destination, 'Runtime/Components', file.relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.contents);
  }
  // Import the sample as an actual consumer, committed metas and script included.
  fs.cpSync(path.join(packageSource, 'Samples~/InteractiveControls'), path.join(assets, 'InteractiveControls'), { recursive: true });
  fs.cpSync(path.join(packageSource, 'Tests/Harness~'), path.join(assets, 'Harness'), { recursive: true });
  passes.harness = runPass('harness', ['RenamedContractHostComposesItsIconAcrossUxmlReload', 'ImportedSampleScriptCompilesInTheConsumerAssembly', 'ShowcaseFindsTheSampleSheetAtItsImportedPath']);
}
fs.writeFileSync(provenance, JSON.stringify({
  editor,
  editorVersion,
  sourceRevision: revision.stdout.trim(),
  sourceDirty: dirt.stdout.trim().length > 0,
  passes,
}, null, 2));
if (!passes.consumer.passed || !passes.harness?.passed) process.exit(1);
