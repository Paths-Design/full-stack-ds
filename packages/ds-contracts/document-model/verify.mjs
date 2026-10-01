/** Qualifies paper schemas/examples only. No document reducer or runtime admission. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const lines = readFileSync(resolve(here, 'examples/page.jsonl'), 'utf8').trimEnd().split('\n').map(JSON.parse);
for (const [name, value] of [['project', project], ['document', document], ['default-profile', profile], ['prototype-plan', plan], ['design-ledger', ledger]]) accepted(name, value, name);
for (const [index, line] of lines.entries()) accepted('page-record', line, `log line ${index + 1}`);
// The original example uses actual repository-relative source paths. Existence
// does not validate dependency bytes, revisions or token/definition semantics.
for (const entry of [...project.pages, ...project.sources]) {
  assert.ok(existsSync(resolve(repo, entry.path)), `missing example dependency ${entry.path}`);
}
const emptyProject = structuredClone(project);
emptyProject.pages = [];
emptyProject.sources = [];
emptyProject.tokenContext.sourceIds = [];
accepted('project', emptyProject, 'project before any canvas or token source exists');
const emptyDocument = structuredClone(document);
for (const key of ['roots', 'nodes', 'scenes', 'tracks', 'sequences', 'annotations']) emptyDocument[key] = [];
accepted('document', emptyDocument, 'empty scratch page is valid authored state');
const emptySequence = structuredClone(document);
emptySequence.sequences[0].occurrences = [];
emptySequence.sequences[0].transitions = [];
accepted('document', emptySequence, 'empty sequence can be authored before prototype readiness');

// Values deliberately admitted as present values; none are reset aliases.
for (const binding of [
  { kind: 'literal', valueType: 'number', value: 0 },
  { kind: 'literal', valueType: 'boolean', value: false },
  { kind: 'literal', valueType: 'string', value: '' },
]) {
  const candidate = structuredClone(document);
  candidate.nodes[1].properties['appearance.example'] = binding;
  accepted('document', candidate, `present ${binding.valueType}`);
}
const opacity = structuredClone(document);
opacity.tracks[0].target.property = 'appearance.opacity';
opacity.tracks[0].coordinateSpace = 'none';
opacity.tracks[0].keyframes = [
  { offset: 0, value: { kind: 'literal', valueType: 'number', value: 0 } },
  { offset: 1, value: { kind: 'literal', valueType: 'number', value: 1 } },
];
accepted('document', opacity, 'opacity has numeric values and no spatial coordinate');

const invalid = [];
function neighbor(name, source, label, keyword, alter) {
  const value = structuredClone(source);
  alter(value);
  invalid.push({ name, value, label, keyword });
}
neighbor('document', document, 'canvas creation cannot carry generated source', 'unevaluatedProperties', (v) => { v.nodes[1].codeCounterpart = 'Notice.tsx'; });
neighbor('document', document, 'framework objects do not enter core', 'unevaluatedProperties', (v) => { v.nodes[1].reactElement = {}; });
neighbor('document', document, 'reset is absence, not null', 'type', (v) => { v.nodes[1].properties['appearance.opacity'] = null; });
neighbor('document', document, 'typed binding is not a type-description string', 'type', (v) => { v.nodes[1].parameterBindings.label = "string // default: Ready"; });
neighbor('document', document, 'dimension cannot omit unit', 'required', (v) => { delete v.nodes[0].properties['sizing.width'].value.unit; });
neighbor('document', document, 'duration cannot use length units', 'enum', (v) => { v.tracks[0].duration = { kind: 'literal', valueType: 'duration', value: { value: 500, unit: 'px' } }; });
neighbor('document', document, 'negative duration is invalid', 'minimum', (v) => { v.tracks[0].duration = { kind: 'literal', valueType: 'duration', value: { value: -1, unit: 'ms' } }; });
neighbor('document', document, 'duration consumer requires duration token', 'const', (v) => { v.tracks[0].duration.valueType = 'number'; });
neighbor('document', document, 'translation consumer requires dimensional keys', 'const', (v) => { v.tracks[0].keyframes[0].value = { kind: 'literal', valueType: 'number', value: 0 }; });
neighbor('document', document, 'opacity is not a spatial translation', 'const', (v) => { v.tracks[0].target.property = 'appearance.opacity'; });
neighbor('document', opacity, 'opacity stays within its semantic range', 'maximum', (v) => { v.tracks[0].keyframes[1].value.value = 1.1; });
neighbor('document', document, 'normalized key stays inside interval', 'maximum', (v) => { v.tracks[0].keyframes[1].offset = 1.1; });
neighbor('document', document, 'Bezier X control is bounded', 'maximum', (v) => { v.tracks[0].easing = { kind: 'literal', valueType: 'cubicBezier', value: [1.2, 0, 0.6, 1] }; });
neighbor('document', document, 'unselected track blending refuses', 'const', (v) => { v.tracks[0].composition = 'add'; });
neighbor('document', document, 'crossfade needs a future transition design', 'const', (v) => { v.sequences[0].transitions[0].kind = 'crossfade'; });
neighbor('project', project, 'absolute dependency path refuses', 'pattern', (v) => { v.sources[0].path = '/tmp/tokens.json'; });
neighbor('project', project, 'dependency traversal refuses', 'pattern', (v) => { v.sources[0].path = 'tokens/../../other.json'; });
neighbor('project', project, 'timebase is positive', 'minimum', (v) => { v.timebase.ticksPerSecond = 0; });
neighbor('prototype-plan', plan, 'unsupported output cannot silently omit', 'const', (v) => { v.unsupportedPolicy = 'ignore'; });
neighbor('page-record', lines[2], 'accepted transaction cannot omit revision expectation', 'required', (v) => { delete v.expectedRevision; });
neighbor('design-ledger', ledger, 'runtime claim needs evidence references', 'minItems', (v) => { v.records[0].runtimeStatus = 'bounded-evidence'; });
neighbor('design-ledger', ledger, 'partial design must name remaining work', 'minItems', (v) => { v.records[0].remainingDesign = []; });
for (const test of invalid) rejected(test.name, test.value, test.label, test.keyword);

// Sensitivity controls: a weakened schema must admit its designated bad neighbor.
const openNodeSchemas = structuredClone(schemas);
const visualSchema = openNodeSchemas.find((s) => s.$id.endsWith('/visual-node.schema.json'));
delete visualSchema.$defs.node.unevaluatedProperties;
accepted('document', invalid.find((c) => c.label === 'canvas creation cannot carry generated source').value, 'open-node sensitivity control', compiler(openNodeSchemas));
const looseUnitSchemas = structuredClone(schemas);
const common = looseUnitSchemas.find((s) => s.$id.endsWith('/common.schema.json'));
const duration = common.$defs.binding.oneOf.find((b) => b.properties.valueType?.const === 'duration');
duration.properties.value.properties.unit.enum.push('px');
accepted('document', invalid.find((c) => c.label === 'duration cannot use length units').value, 'duration-unit sensitivity control', compiler(looseUnitSchemas));

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
  assert.equal(current.get(record.id), record.designCoverage, `missing/stale history ${record.id}`);
  for (const decision of record.decisionRefs) {
    const path = resolve(repo, decision);
    const fromRoot = relative(repo, path);
    assert.ok(!isAbsolute(fromRoot) && fromRoot !== '..' && !fromRoot.startsWith('../') && existsSync(path), `missing/outside decision ${decision}`);
  }
}

console.log(`Paper qualification passed: ${schemas.length} schemas, ${5 + lines.length} primary example records, ${invalid.length} rejected neighbors, 2 schema sensitivity controls, ${ledger.records.length} ledger requirements.`);
console.log('Not verified: document graph integrity, JSONL reduction/durability, token source conformance/resolution, layout/motion evaluation, adapters, source persistence, or prototype output.');
