/** Qualifies paper schemas/examples only. No document reducer or runtime admission. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { qualifyVisual } from './verify-visual.mjs';

// Reuse the repository's existing validator dependency; no new package/install.
const require = createRequire(new URL('../../ds-codegen/package.json', import.meta.url));
const Ajv2020 = require('ajv/dist/2020.js').default;
const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const read = (path) => JSON.parse(readFileSync(resolve(here, path), 'utf8'));
const schemaFiles = readdirSync(here).filter((name) => name.endsWith('.schema.json')).sort();
const schemas = schemaFiles.map(read);

function compiler(definitions) {
  const ajv = new Ajv2020({ allErrors: true, strict: true, useDefaults: false, coerceTypes: false, removeAdditional: false });
  for (const schema of definitions) {
    assert.equal(ajv.validateSchema(schema), true, `invalid schema: ${schema.$id}`);
    ajv.addSchema(schema);
  }
  // Compile all, including definitions that might otherwise be unreachable.
  for (const schema of definitions) assert.ok(ajv.getSchema(schema.$id), schema.$id);
  return ajv;
}

const ajv = compiler(schemas);
const validator = (name, engine = ajv) => engine.getSchema(schemas.find((s) => s.$id.endsWith('/' + name + '.schema.json')).$id);
function accepted(name, value, label, engine = ajv) {
  const before = JSON.stringify(value);
  const validate = validator(name, engine);
  assert.equal(validate(value), true, `${label}: ${JSON.stringify(validate.errors)}`);
  assert.equal(JSON.stringify(value), before, `${label}: validation changed authored input`);
}
function rejected(name, value, label, keyword) {
  const before = JSON.stringify(value);
  const validate = validator(name);
  assert.equal(validate(value), false, `${label}: unexpectedly accepted`);
  assert.ok(validate.errors.some((error) => error.keyword === keyword), `${label}: wrong rejection ${JSON.stringify(validate.errors)}`);
  assert.equal(JSON.stringify(value), before, `${label}: rejection changed authored input`);
}

const project = read('examples/project.json');
const document = read('examples/document.json');
const profile = read('examples/defaults.json');
const plan = read('examples/prototype-plan.json');
const ledger = read('design-ledger.json');
const definition = read('examples/button.definition.json');
const expectations = read('examples/expectations.json');
const lines = readFileSync(resolve(here, 'examples/page.jsonl'), 'utf8').trimEnd().split('\n').map(JSON.parse);
const primary = [['project', project], ['document', document], ['default-profile', profile], ['prototype-plan', plan], ['design-ledger', ledger], ['definition', definition], ['paper-expectations', expectations]];
for (const [name, value] of primary) accepted(name, value, name);
for (const [index, line] of lines.entries()) accepted('page-record', line, `log line ${index + 1}`);
for (const entry of [...project.pages, ...project.sources]) assert.ok(existsSync(resolve(repo, entry.path)), `missing example dependency ${entry.path}`);
const emptyProject = structuredClone(project);
emptyProject.pages = []; emptyProject.sources = []; emptyProject.tokenContext.sourceIds = [];
accepted('project', emptyProject, 'project before any canvas or token source exists');
const emptyDocument = structuredClone(document);
for (const key of ['compositions', 'nodes', 'scenes', 'tracks', 'sequences', 'annotations']) emptyDocument[key] = [];
accepted('document', emptyDocument, 'empty scratch page');
const staticDocument = structuredClone(document); staticDocument.tracks = [];
accepted('document', staticDocument, 'static scene needs no endpoint keys');
for (const binding of [
  { kind: 'literal', valueType: 'number', value: 0 },
  { kind: 'literal', valueType: 'boolean', value: false },
  { kind: 'literal', valueType: 'string', value: '' },
]) {
  const candidate = structuredClone(document);
  candidate.nodes[1].properties['appearance.example'] = binding;
  accepted('document', candidate, `present ${binding.valueType}`);
}
const dim = (value) => ({ kind: 'literal', valueType: 'dimension', value: { value, unit: 'px' } });
const opacity = structuredClone(document);
opacity.tracks[0].target.property = 'appearance.opacity'; opacity.tracks[0].coordinateSpace = 'none';
opacity.tracks[0].keyframes[0].value = { kind: 'literal', valueType: 'number', value: 1 };
accepted('document', opacity, 'one opacity key with implicit base');
const explicitStart = structuredClone(document);
const start = structuredClone(explicitStart.tracks[0].keyframes[0]);
start.id = 'key.start'; start.at = { kind: 'ticks', ticks: 0 }; start.value = dim(4);
explicitStart.tracks[0].keyframes.unshift(start);
accepted('document', explicitStart, 'explicit zero-time key');
const nested = structuredClone(document);
const nestedButton = structuredClone(nested.nodes[4]); nestedButton.id = 'node.nested';
nested.nodes.push(nestedButton); nested.compositions[0].nodeIds.push(nestedButton.id);
nested.nodes[1].slotBindings[0].nodeIds = [nestedButton.id];
accepted('document', nested, 'independently identified nested consumer');
const emptySlot = structuredClone(document); emptySlot.nodes[1].slotBindings[0].nodeIds = [];
accepted('document', emptySlot, 'explicit empty slot differs from inherited absence');
const partOverride = structuredClone(document);
partOverride.nodes[1].partOverrides = [{ partId: 'label', properties: { 'typography.fontSize': dim(18) } }];
accepted('document', partOverride, 'declared non-root part override');
// All operation branches have a positive shape example; this does not execute them.
const edit = lines.find(l => l.transactionId === 'tx.key').action.operations[0];
for (const operation of [
  { ...edit, kind: 'add-keyframe' },
  { id: 'op.removeTrack', owner: edit.owner, kind: 'remove-track', sceneId: 'scene.A', trackId: 'track.buttonX' },
]) accepted('edit-operation', operation, operation.kind);

const invalid = [];
function neighbor(name, source, label, keyword, alter) {
  const value = structuredClone(source); alter(value);
  invalid.push({ name, value, label, keyword });
}
neighbor('document', document, 'old draft is not silently reinterpreted', 'const', v => { v.schemaVersion = '0.1.0'; });
neighbor('document', document, 'canvas creation cannot carry generated source', 'unevaluatedProperties', v => { v.nodes[1].codeCounterpart = 'Button.tsx'; });
neighbor('document', document, 'framework objects do not enter core', 'unevaluatedProperties', v => { v.nodes[1].reactElement = {}; });
neighbor('document', document, 'reset is absence not null', 'type', v => { v.nodes[1].properties['appearance.opacity'] = null; });
neighbor('document', document, 'typed binding is not a type-description string', 'type', v => { v.nodes[1].parameterBindings.label = 'string // default: Continue'; });
neighbor('document', document, 'dimension cannot omit unit', 'required', v => { delete v.nodes[0].properties['sizing.width'].value.unit; });
neighbor('document', document, 'composition has explicit member custody', 'required', v => { delete v.compositions[0].nodeIds; });
neighbor('document', document, 'scene references composition not direct root', 'additionalProperties', v => { v.scenes[0].rootNodeId = 'node.frameA'; });
neighbor('document', document, 'scene cannot snapshot a boundary marker', 'additionalProperties', v => { v.scenes[0].endKeyframe = {}; });
neighbor('document', document, 'scene duration is positive', 'minimum', v => { v.scenes[0].durationTicks = 0; });
neighbor('document', document, 'empty tracks are not authored', 'minItems', v => { v.tracks[0].keyframes = []; });
neighbor('document', document, 'key identity survives edits', 'required', v => { delete v.tracks[0].keyframes[0].id; });
neighbor('document', document, 'normalized offsets are retired', 'additionalProperties', v => { v.tracks[0].keyframes[0].offset = 1; });
neighbor('document', document, 'duration key time cannot use length units', 'enum', v => { v.tracks[0].keyframes[0].at = { kind: 'binding', binding: { kind: 'literal', valueType: 'duration', value: { value: 20, unit: 'px' } } }; });
neighbor('document', document, 'key time requires duration token', 'const', v => { v.tracks[0].keyframes[0].at.binding.valueType = 'number'; });
neighbor('document', document, 'negative key time refuses', 'minimum', v => { v.tracks[0].keyframes[0].at = { kind: 'ticks', ticks: -1 }; });
neighbor('document', document, 'fractional ticks refuse', 'type', v => { v.tracks[0].keyframes[0].at = { kind: 'ticks', ticks: 0.5 }; });
neighbor('document', document, 'translation keys require dimensions', 'const', v => { v.tracks[0].keyframes[0].value = { kind: 'literal', valueType: 'number', value: 20 }; });
neighbor('document', opacity, 'opacity stays within semantic range', 'maximum', v => { v.tracks[0].keyframes[0].value.value = 1.1; });
neighbor('document', opacity, 'opacity is not a spatial translation', 'const', v => { v.tracks[0].coordinateSpace = 'parent'; });
neighbor('document', document, 'visibility cannot interpolate continuously', 'const', v => { v.tracks[1].keyframes[0].interpolation = 'linear'; });
neighbor('document', document, 'visibility cannot carry fractional truth', 'type', v => { v.tracks[1].keyframes[0].value.value = 0.5; });
neighbor('document', document, 'Bezier X control is bounded', 'maximum', v => { v.tracks[0].keyframes[0].easing = { kind: 'literal', valueType: 'cubicBezier', value: [1.2, 0, 0.6, 1] }; });
neighbor('document', document, 'unselected blending refuses', 'const', v => { v.tracks[0].composition = 'add'; });
neighbor('document', document, 'crossfade needs later transition design', 'const', v => { v.sequences[0].transitions[0].kind = 'crossfade'; });
neighbor('document', document, 'instance supplied children have one edge representation', 'maxItems', v => { v.nodes[1].children = [{ nodeId: 'node.arrow' }]; });
neighbor('document', document, 'root cannot have a second override spelling', 'not', v => { v.nodes[1].partOverrides = [{ partId: 'root', properties: {} }]; });
neighbor('project', project, 'absolute dependency path refuses', 'pattern', v => { v.sources[0].path = '/tmp/tokens.json'; });
neighbor('project', project, 'dependency traversal refuses', 'pattern', v => { v.sources[0].path = 'tokens/../../other.json'; });
neighbor('project', project, 'timebase is positive', 'minimum', v => { v.timebase.ticksPerSecond = 0; });
neighbor('prototype-plan', plan, 'unsupported output cannot silently omit', 'const', v => { v.unsupportedPolicy = 'ignore'; });
neighbor('page-record', lines[2], 'accepted transaction needs revision expectation', 'required', v => { delete v.expectedRevision; });
neighbor('page-record', lines[2], 'selection is not persisted in an edit', 'additionalProperties', v => { v.action.selectedKeyframeId = 'key.arrival'; });
neighbor('page-record', lines[3], 'undo names its prior transaction', 'required', v => { delete v.action.history.ofTransactionId; });
neighbor('page-record', lines.find(l => l.transactionId === 'tx.undoInsert'), 'insertion inverse requires undo context', 'const', v => { v.action.history = { kind: 'edit' }; });
neighbor('edit-operation', edit, 'every edit names its composition owner', 'required', v => { delete v.owner; });
neighbor('edit-operation', edit, 'instance edits cannot write shared definitions', 'const', v => { v.owner.kind = 'definition'; });
neighbor('document', document, 'slot child IDs are structured not null', 'type', v => { v.nodes[1].slotBindings[0].nodeIds = null; });
neighbor('definition', definition, 'published property has a consumer identity', 'required', v => { delete v.parts[0].properties[0].consumerId; });
neighbor('definition', definition, 'definition rejects unknown internal bags', 'additionalProperties', v => { v.runtimeTree = {}; });
neighbor('paper-expectations', expectations, 'paper oracle is not runtime evidence', 'const', v => { v.basis = 'observed-runtime'; });
neighbor('design-ledger', ledger, 'runtime claim requires evidence', 'minItems', v => { v.records[0].runtimeStatus = 'bounded-evidence'; });
neighbor('design-ledger', ledger, 'partial design names remaining work', 'minItems', v => { v.records[0].remainingDesign = []; });
for (const test of invalid) rejected(test.name, test.value, test.label, test.keyword);

// Weakened-schema controls prove sensitivity to these four designated defects.
function sensitivity(label, change) {
  const weakened = structuredClone(schemas); change(weakened);
  const bad = invalid.find(c => c.label === label);
  accepted(bad.name, bad.value, `sensitivity: ${label}`, compiler(weakened));
}
sensitivity('canvas creation cannot carry generated source', defs => { delete defs.find(s => s.$id.endsWith('/visual-node.schema.json')).$defs.node.unevaluatedProperties; });
sensitivity('duration key time cannot use length units', defs => { defs.find(s => s.$id.endsWith('/common.schema.json')).$defs.binding.oneOf.find(b => b.properties.valueType?.const === 'duration').properties.value.properties.unit.enum.push('px'); });
sensitivity('empty tracks are not authored', defs => { defs.find(s => s.$id.endsWith('/motion.schema.json')).$defs.track.properties.keyframes.minItems = 0; });
sensitivity('key identity survives edits', defs => { const key = defs.find(s => s.$id.endsWith('/motion.schema.json')).$defs.keyframe.oneOf[0]; key.required = key.required.filter(k => k !== 'id'); });

// Original-fixture custody only: these checks are not a general graph checker.
assert.deepEqual(document.compositions.map(c => [c.id, c.rootNodeId]), [['composition.A', 'node.frameA'], ['composition.B', 'node.frameB']]);
assert.deepEqual(document.nodes[1].definitionRef, document.nodes[4].definitionRef);
assert.equal(document.nodes[1].definitionRef.definitionId, definition.id);
assert.equal(document.nodes[1].parameterBindings.label.value, 'Next');
assert.deepEqual(document.nodes[4].parameterBindings, {});
assert.deepEqual(document.nodes[1].slotBindings[0].nodeIds, ['node.arrow']);
assert.equal(document.tracks[0].keyframes[0].at.binding.path, 'motion.arrival');
assert.equal(document.tracks[0].keyframes[0].value.path, 'motion.endX');
assert.equal(lines.find(l => l.transactionId === 'tx.base').action.operations[0].kind, 'set-binding');
assert.equal(lines.find(l => l.transactionId === 'tx.key').action.operations[0].keyframe.id, 'key.arrival');
assert.deepEqual(lines.find(l => l.transactionId === 'tx.undoRemove').action.operations[0].track, document.tracks[0]);
const txIds = new Set(lines.slice(1).map(l => l.transactionId));
assert.equal(txIds.size, lines.length - 1, 'duplicate example transaction');
for (const [index, line] of lines.slice(1).entries()) {
  assert.equal(line.expectedRevision, index); assert.equal(line.revision, index + 1);
  if (line.action.history?.ofTransactionId) assert.ok(lines.slice(1, index + 1).some(l => l.transactionId === line.action.history.ofTransactionId), 'history target precedes example compensation');
}
// Check duplicate/orphan oracle records and Markdown/JSON table agreement, not an evaluator.
const caseIds = new Set(expectations.cases.map(c => c.id));
assert.equal(caseIds.size, expectations.cases.length);
const prose = readFileSync(resolve(repo, 'docs/architecture/design/shared-document-model/worked-expectations.md'), 'utf8');
for (const c of expectations.cases) {
  assert.ok(prose.includes(`| ${c.id} |`), `oracle lacks independent prose ${c.id}`);
  if (c.kind === 'animation') {
    const row = prose.split('\n').find(l => l.startsWith(`| ${c.id} |`)).split('|').map(x => x.trim());
    assert.equal(row.length, 9, `oracle table column count ${c.id}`);
    assert.deepEqual(c.samples, [0, 10, 20, 100].map((atTicks, i) => ({ atTicks, x: Number(row[i + 3]) })), `oracle table drift ${c.id}`);
    assert.equal(c.baseX, Number(row[7]), `base table drift ${c.id}`);
  }
  if (c.kind === 'history') { assert.ok(txIds.has(c.transactionId)); assert.ok(txIds.has(c.undoTransactionId)); }
}

// Ledger integrity is a separate paper-record check, not document graph validation.
const byId = new Map(ledger.records.map((r) => [r.id, r]));
assert.equal(byId.size, ledger.records.length, 'duplicate requirement identity');
const current = new Map();
for (const change of ledger.changes) {
  assert.ok(byId.has(change.requirementId), `unknown change target ${change.requirementId}`);
  assert.equal(change.from, current.get(change.requirementId) ?? null, `discontinuous design history ${change.requirementId}`);
  current.set(change.requirementId, change.to);
}
for (const record of ledger.records) {
  assert.equal(record.runtimeStatus, 'not-implemented', `paper slice cannot claim runtime ${record.id}`);
  assert.deepEqual(record.runtimeRefs, [], `paper slice has no runtime evidence ${record.id}`);
  assert.equal(current.get(record.id), record.designCoverage, `missing/stale history ${record.id}`);
  for (const decision of record.decisionRefs) {
    const path = resolve(repo, decision);
    const fromRoot = relative(repo, path);
    assert.ok(!isAbsolute(fromRoot) && fromRoot !== '..' && !fromRoot.startsWith('../') && existsSync(path), `missing/outside decision ${decision}`);
  }
  for (const target of record.blocks ?? []) assert.ok(byId.has(target), `unknown blocking requirement ${record.id}: ${target}`);
}

const expectedConcepts = ['FontResolutionAndShaping', 'CanvasHitTestingAndSnapping', 'DefinitionInterfaceExposure', 'GeneralExtractionReferenceRepair', 'AdvancedLayoutResolution', 'TokenScopeEvolution', 'ProjectChangeDurability', 'DefinitionSourceAdapter', 'PreviewAndOutputAgreement'];
assert.deepEqual(ledger.records.filter(r => r.conceptName).map(r => r.conceptName).sort(), expectedConcepts.sort());
assert.deepEqual(ledger.crosswalk.map(r => r.id).sort(), [...Array.from({ length: 12 }, (_, i) => `handoff.${i + 1}`), ...Array.from({ length: 16 }, (_, i) => `workflow.${i + 1}`)].sort());
for (const entry of ledger.crosswalk) {
  for (const id of entry.requirementIds) assert.ok(byId.has(id), `unknown crosswalk requirement ${entry.id}: ${id}`);
  for (const path of [...entry.decisionRefs, ...entry.schemaRefs, ...entry.exampleRefs]) {
    const fromRoot = relative(repo, resolve(repo, path));
    assert.ok(!isAbsolute(fromRoot) && fromRoot !== '..' && !fromRoot.startsWith('../') && existsSync(resolve(repo, path)), `missing/outside crosswalk source ${entry.id}: ${path}`);
  }
}

const visual = qualifyVisual({ accepted, rejected, compiler, schemas, read, here, repo });
console.log(`Paper qualification passed: ${schemas.length} schemas, ${primary.length + lines.length + visual.primary} primary example records, ${invalid.length + visual.invalid} schema-rejected neighbors, ${visual.probes} original-fixture rejected neighbors, ${4 + visual.controls} sensitivity controls, ${ledger.records.length} ledger requirements.`);
console.log('Not verified: general graph/definition compatibility, operation admission/inverses, JSONL reduction/durability, token conformance/resolution, inheritance/layout/motion evaluation, adapters, source persistence, or prototype output.');
