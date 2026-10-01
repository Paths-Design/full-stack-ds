/** Bounded experiment, not a CI gate or a baseline of accepted defects.
 * Run after codegen and token builds. Exit 0 means measurements completed;
 * inspect report.json for findings. Missing evidence/prerequisites fail closed.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { chromium } from '@playwright/test';
import { listComponentContracts } from '../packages/ds-codegen/dist/contracts-fs.js';
import { mergeBoxModelDefaults, emitBoxModelBoundaryCss } from '../packages/ds-codegen/dist/box-model.js';
import { buildComponentIR, computeCssBlocks } from '../packages/ds-codegen/dist/ir.js';
import { emitCss, emitTokensCss } from '../packages/ds-codegen/dist/css.js';
import { createContractValidator } from '../packages/ds-codegen/dist/validate.js';
import { generateReactNativeComponentSource } from '../packages/ds-codegen/dist/frameworks/react-native/component-source.js';
import { createSwiftUIEmitter } from '../packages/ds-codegen/dist/frameworks/swift/swiftui/factory.js';
import { generateJetpackComposeComponentSource, generateJetpackComposeTokensFile } from '../packages/ds-codegen/dist/frameworks/jetpack-compose/component-source.js';
import { toFigmaComponentDescriptor } from '../packages/ds-codegen/dist/frameworks/figma/factory.js';
import { validateComponentTokenConsumption } from '../packages/ds-codegen/dist/validation/component-token-consumption.js';
import { validateContractSemantics } from '../packages/ds-codegen/dist/validation/semantic.js';
import { validateContractTokens } from '../packages/ds-codegen/dist/validation/tokens.js';
import { validateContractStyles, validateStylesSelectorCollisions } from '../packages/ds-codegen/dist/validation/styles.js';
import { validateContractFallbackCompleteness, validateContractFallbackStale } from '../packages/ds-codegen/dist/validation/fallback-completeness.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const targets = json(resolve(ROOT, 'fsds.targets.json')).targets;
const validator = createContractValidator({ contractsRoot: resolve(ROOT, 'packages/ds-contracts') });
const require = createRequire(import.meta.url);

export function withoutDesign(contract) {
  const result = structuredClone(contract);
  for (const block of Object.values(result.styles ?? {})) for (const entry of Object.values(block)) delete entry.design;
  return result;
}

export function compareArtifacts(before, after) {
  assert.deepEqual(Object.keys(before).sort(), Object.keys(after).sort(), 'Both runs must measure the same targets');
  assert.ok(Object.keys(before).length > 0, 'An empty target set is not evidence');
  return Object.fromEntries(Object.keys(before).map(target => [target, {
    before: hash(before[target]), after: hash(after[target]), equal: hash(before[target]) === hash(after[target]),
  }]));
}

function load(entry) {
  const contract = json(entry.absPath);
  assert.equal(validator.validateComponent(contract).ok, true, entry.name);
  for (const side of ['tokens', 'styles']) {
    const file = entry.absPath.replace('.contract.json', `.${side}.json`);
    contract[side] = existsSync(file) ? json(file) : {};
    const result = side === 'tokens' ? validator.validateTokens(contract[side]) : validator.validateStyles(contract[side]);
    assert.equal(result.ok, true, JSON.stringify(result));
  }
  contract.tokens = mergeBoxModelDefaults(contract.tokens, undefined, contract.morphology);
  return contract;
}

function nativeArtifacts(ir) {
  const admitted = id => targets.some(target => target.id === id && (!target.components || target.components.includes(ir.name)));
  const out = {};
  if (admitted('react-native')) out['react-native'] = generateReactNativeComponentSource(ir);
  if (admitted('swiftui')) out.swiftui = createSwiftUIEmitter().emitComponent(ir, {}).map(file => file.contents).join('\n');
  if (admitted('jetpack-compose')) out['jetpack-compose'] = {
    component: generateJetpackComposeComponentSource(ir), tokens: generateJetpackComposeTokensFile(ir),
  };
  return out;
}

// Execute real token resolution and generated style construction. Only the RN
// registration boundary is replaced; this is not a device/layout measurement.
function evaluateTs(source, dependencies = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    throw new Error(`Unmeasured dependency: ${name}`);
  } });
  return module.exports;
}

function nativeStyles(files, theme) {
  const runtime = evaluateTs(readFileSync(resolve(ROOT, 'packages/ds-react-native/src/tokens/index.tsx'), 'utf8'));
  const tokens = evaluateTs(files.tokensFile, { '../../tokens': runtime });
  const styles = evaluateTs(files.stylesFile, {
    '../../tokens': runtime, './Card.tokens': tokens, 'react-native': { StyleSheet: { create: value => value } },
  });
  return JSON.parse(JSON.stringify(styles.createCardStyles(theme)));
}

async function webFacts(page, contract, overrides = {}) {
  const ir = buildComponentIR(contract);
  const css = [emitBoxModelBoundaryCss(), emitTokensCss(ir), emitCss(ir)].join('\n').replace(/^@import[^;]+;/gm, '');
  await page.setContent('<div class="card" data-fsds-component="card" data-fsds-box><div class="card__media"></div><div id="overflow-witness"></div></div>');
  await page.addStyleTag({ content: css });
  await page.addStyleTag({ content: '.card {position:relative;width:200px;height:100px;padding:0;border:0;gap:0; margin:40px; --fsds-box-model-padding:0;} .card__media {width:60px;height:40px;} #overflow-witness {position:absolute;left:210px;top:20px;width:20px;height:20px;background:red;}' });
  await page.locator('.card').evaluate((element, values) => {
    for (const [name, value] of Object.entries(values)) element.style.setProperty(name, value);
  }, overrides);
  return page.locator('.card').evaluate(element => {
    const style = getComputedStyle(element), bounds = element.getBoundingClientRect();
    return { radius: style.borderTopLeftRadius, overflow: style.overflow,
      mediaRadius: getComputedStyle(element.querySelector('.card__media')).borderTopLeftRadius,
      outsideChildHit: document.elementFromPoint(bounds.left + 220, bounds.top + 30)?.id === 'overflow-witness' };
  });
}

export async function runRecon(out) {
  mkdirSync(out, { recursive: true });
  const write = (name, value) => writeFileSync(resolve(out, name), typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
  const entries = listComponentContracts(resolve(ROOT, 'packages/ds-contracts'));
  assert.ok(entries.length > 0, 'Missing corpus');
  const corpus = entries.map(load);
  const allContracts = new Map(corpus.map(contract => [contract.name, contract]));
  const erasure = corpus.map(contract => {
    const before = buildComponentIR(contract), after = buildComponentIR(withoutDesign(contract));
    const figmaBefore = toFigmaComponentDescriptor(before), figmaAfter = toFigmaComponentDescriptor(after);
    return { component: contract.name, bindings: before.designBindings.length,
      native: compareArtifacts(nativeArtifacts(before), nativeArtifacts(after)),
      defaultsEqual: hash(before.cssBlocks) === hash(after.cssBlocks),
      tokenScopesEqual: hash(before.tokenScopes) === hash(after.tokenScopes),
      figmaDefaultsEqual: hash(figmaBefore.css) === hash(figmaAfter.css) };
  });
  write('metadata-erasure.json', erasure);
  const card = corpus.find(contract => contract.name === 'Card');
  assert.ok(card, 'Missing Card witness');
  const files = nativeArtifacts(buildComponentIR(card));
  assert.ok(files.swiftui && files['react-native'], 'Card requires both native targets');
  write('Card.swift', files.swiftui);
  write('Card.styles.ts', files['react-native'].stylesFile);
  const browser = await chromium.launch({ headless: true });
  const chromiumVersion = browser.version();
  let web, clippingReport;
  const clipping = {};
  try {
    const page = await browser.newPage();
    web = { defaults: await webFacts(page, card), erased: await webFacts(page, withoutDesign(card)),
      absolute: await webFacts(page, card, { '--fsds-card-size-radius': '20px' }),
      percentage: await webFacts(page, card, { '--fsds-card-size-radius': '50%' }),
      independentMedia: await webFacts(page, card, { '--fsds-card-design-media-shape-radius': '23px' }) };
    // Both inputs explicitly request all declared platforms. Changing only this
    // property must change clipping, or be rejected as unsupported.
    for (const overflow of ['visible', 'hidden']) {
      const input = structuredClone(card);
      input.styles.root.overflow = { literal: overflow, platforms: ['web', 'ios', 'android'],
        design: { property: 'layout.overflow', slot: 'card.design.root.layout.overflow' } };
      const validation = validator.validateStyles(input.styles);
      assert.equal(validation.ok, true, JSON.stringify(validation));
      const validationIssues = [
        ...validateContractSemantics(input, { allContracts }), ...validateContractTokens(input),
        ...validateContractStyles(input), ...validateStylesSelectorCollisions(input),
        ...validateContractFallbackCompleteness(input), ...validateContractFallbackStale(input),
        ...validateComponentTokenConsumption(input, ROOT),
      ];
      clipping[overflow] = { schemaAccepted: validation.ok,
        validationIssues,
        platformCss: Object.fromEntries(['web', 'ios', 'android'].map(platformTarget => [platformTarget,
          computeCssBlocks(input, 'card', { platformTarget }).find(block => block.selector === '.card')?.declarations.overflow])),
        web: await webFacts(page, input), native: nativeArtifacts(buildComponentIR(input)),
        erasedNative: nativeArtifacts(buildComponentIR(withoutDesign(input))) };
    }
    assert.equal(clipping.visible.web.outsideChildHit, true, 'Visible clipping control must expose the outside child');
    assert.equal(clipping.hidden.web.outsideChildHit, false, 'Hidden clipping control must suppress the outside child');
    clippingReport = { visible: clipping.visible.web, hidden: clipping.hidden.web,
      schemaAccepted: ['visible', 'hidden'].every(value => clipping[value].schemaAccepted),
      validationIssues: { visible: clipping.visible.validationIssues, hidden: clipping.hidden.validationIssues },
      platformCss: { visible: clipping.visible.platformCss, hidden: clipping.hidden.platformCss },
      nativeComparison: compareArtifacts(clipping.visible.native, clipping.hidden.native),
      erasedNativeComparison: compareArtifacts(clipping.visible.erasedNative, clipping.hidden.erasedNative) };
    write('clipping.json', clippingReport);
    await page.screenshot({ path: resolve(out, 'clipping-hidden.png') });
  } finally { await browser.close(); }
  const rn = Object.fromEntries(['8px', '20px', '50%'].map(value => [value,
    nativeStyles(files['react-native'], { tokens: { 'card.size.radius': value } }).root.borderRadius]));
  rn.independentMedia = nativeStyles(files['react-native'], { tokens: { 'card.design.media.shape.radius': '23px' } });
  write('web.json', web);
  write('react-native.json', rn);

  // Render freshly emitted Card through the real SwiftUI/AppKit host. A separate
  // process per override makes an unsupported-value precondition observable.
  write('main.swift', `import Foundation
import SwiftUI
import AppKit
let value = CommandLine.arguments[1]
let theme = FsdsTheme(tokens: [
 "card.size.radius": .string(value),
 "card.color.background.default": .string("#00ff00"),
 "card.size.statusAccent.width": .number(0),
 "box-model.padding-block-start": .number(0),
 "box-model.padding-inline-start": .number(0),
 "box-model.gap": .number(0)
])
let witness = Color(.sRGB, red: 1, green: 0, blue: 0, opacity: 1)
let card = Card(content: {
 Color.clear.frame(width: 200, height: 100)
  .overlay(witness.frame(width: 20, height: 20)
    .overlay(witness.frame(width: 20, height: 20).offset(x: 110)))
}).environment(\\.fsdsTheme, theme)
let host = NSHostingView(rootView: ZStack { Color.white; card }.frame(width: 280, height: 140))
host.frame = NSRect(x: 0, y: 0, width: 280, height: 140)
host.layoutSubtreeIfNeeded()
let rep = host.bitmapImageRepForCachingDisplay(in: host.bounds)!
host.cacheDisplay(in: host.bounds, to: rep)
let pixel = rep.colorAt(x: 250, y: 70)!.usingColorSpace(.sRGB)!
let corner = rep.colorAt(x: 42, y: 2)!.usingColorSpace(.sRGB)!
let reference = rep.colorAt(x: 140, y: 70)!.usingColorSpace(.sRGB)!
precondition(reference.redComponent > 0.9 && reference.greenComponent < 0.5, "Missing interior paint control")
try rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
let data = try JSONSerialization.data(withJSONObject: ["rendered": true,
 "outsideChildPainted": abs(pixel.redComponent - reference.redComponent) < 0.02 && abs(pixel.greenComponent - reference.greenComponent) < 0.02 && abs(pixel.blueComponent - reference.blueComponent) < 0.02,
 "squareCornerPainted": corner.greenComponent > 0.9 && corner.redComponent < 0.1,
 "outsidePixel": [pixel.redComponent, pixel.greenComponent, pixel.blueComponent]], options: [.sortedKeys])
print(String(data: data, encoding: .utf8)!)
`);
  const swift = {};
  const field = corpus.find(contract => contract.name === 'Field');
  assert.ok(field, 'Missing Field composer');
  const mainTemplate = readFileSync(resolve(out, 'main.swift'), 'utf8');
  for (const [mode, source] of Object.entries({ defaults: files.swiftui,
    visible: clipping.visible.native.swiftui, hidden: clipping.hidden.native.swiftui,
    field: nativeArtifacts(buildComponentIR(field)).swiftui })) {
    const mainPath = resolve(out, mode, 'main.swift');
    mkdirSync(dirname(mainPath), { recursive: true });
    writeFileSync(mainPath, mode === 'field' ? mainTemplate
      .replace('Card(content:', 'FsdsField(control:')
      .replaceAll('card.size.radius', 'field.radius')
      .replaceAll('card.color.background.default', 'field.color.bg')
      .replace('x: 42, y: 2', 'x: 42, y: 22') : mainTemplate);
    write(`${mode === 'field' ? 'Field' : 'Card'}-${mode}.swift`, source);
    const executable = resolve(out, `swift-${mode}-probe`);
    execFileSync('swiftc', [resolve(ROOT, 'packages/ds-swiftui/Sources/DsSwiftUI/Tokens/FsdsTheme.swift'),
      resolve(out, `${mode === 'field' ? 'Field' : 'Card'}-${mode}.swift`), mainPath, '-o', executable], { encoding: 'utf8', timeout: 120000 });
    swift[mode] = {};
    for (const value of ['defaults', 'field'].includes(mode) ? ['0px', '8px', '20px', '50%'] : ['20px']) {
      const run = spawnSync(executable, [value, resolve(out, `swift-${mode}-${value}.png`)], { encoding: 'utf8', timeout: 30000 });
      if (run.error) throw run.error;
      write(`swift-${mode}-${value}.stderr`, run.stderr);
      if (run.status === 0) swift[mode][value] = JSON.parse(run.stdout);
      else {
        assert.match(run.stderr, /FSDS_SWIFTUI_RADIUS_UNSUPPORTED/, 'Unexpected native execution failure');
        swift[mode][value] = { rejected: true, signal: run.signal, status: run.status };
      }
    }
  }
  clippingReport.rnRuntime = Object.fromEntries(['visible', 'hidden'].map(mode => [mode,
    nativeStyles(clipping[mode].native['react-native']).root.overflow]));
  write('clipping.json', clippingReport);
  write('swift.json', swift);
  assert.deepEqual(web.defaults, web.erased, 'Metadata removal must retain the sampled Web defaults');
  assert.equal(web.absolute.radius, '20px', 'Absolute radius positive control');
  assert.equal(web.independentMedia.radius, web.defaults.radius, 'Part override must leave root unchanged');
  assert.equal(web.independentMedia.mediaRadius, '23px', 'Part override positive control');
  assert.equal(rn['20px'], 20, 'RN absolute radius positive control');
  assert.equal(swift.defaults['20px'].rendered, true, 'Swift absolute radius positive control');
  assert.equal(swift.defaults['0px'].rendered, true, 'Swift zero radius positive control');
  assert.equal(swift.defaults['0px'].squareCornerPainted, true, 'Zero radius corner positive control');
  assert.equal(swift.defaults['20px'].squareCornerPainted, false, 'Absolute radius must affect rendered geometry');
  assert.equal(swift.field['0px'].squareCornerPainted, true, 'Field zero radius positive control');
  assert.equal(swift.field['20px'].squareCornerPainted, false, 'Field radius must affect rendered geometry');

  const nativeOnly = structuredClone(card);
  nativeOnly.styles.root['border-radius'].platforms = ['ios'];
  let nativeOnlyRejection = null;
  try { buildComponentIR(nativeOnly); } catch (error) { nativeOnlyRejection = error.message; }
  const tracked = execFileSync('git', ['ls-files', 'packages/ds-codegen/src', 'packages/ds-contracts', 'packages/ds-react-native/src/tokens', 'packages/ds-swiftui/Sources/DsSwiftUI/Tokens', 'fsds.targets.json'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n');
  const sourceHashes = Object.fromEntries(tracked.map(file => [file, hash(readFileSync(resolve(ROOT, file), 'utf8'))]));
  write('source-hashes.json', sourceHashes);
  const report = { schema: 'fsds.design-contract-recon.v1',
    head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    sourceHash: hash(sourceHashes), probeHash: hash(readFileSync(fileURLToPath(import.meta.url), 'utf8')),
    node: process.version, chromium: chromiumVersion,
    swiftCompiler: execFileSync('swiftc', ['--version'], { encoding: 'utf8' }).trim(),
    measuredComponents: erasure.length, measuredBindings: erasure.reduce((sum, row) => sum + row.bindings, 0),
    metadataChangedNative: erasure.filter(row => Object.values(row.native).some(result => !result.equal)).map(row => row.component),
    metadataChangedDefaults: erasure.filter(row => !row.defaultsEqual || !row.tokenScopesEqual || !row.figmaDefaultsEqual).map(row => row.component),
    nativeOnlyRejection, web, rnRadius: { absolute: rn['20px'], percentage: rn['50%'] }, swift,
    clipping: clippingReport,
    ceiling: 'Web facts use Chromium and generated CSS on a controlled DOM; RN observes style construction; Swift renders freshly emitted Card and Field on a macOS host; this is not iOS device geometry. Corpus erasure compares emitted bytes, not native behavior.',
  };
  write('report.json', report);
  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputArg = process.argv.find(arg => arg.startsWith('--out='));
  await runRecon(outputArg ? resolve(outputArg.slice(6)) : resolve(ROOT, 'tmp/design-contract-recon'));
}
