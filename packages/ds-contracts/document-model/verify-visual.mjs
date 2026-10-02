/** Original-fixture qualification only: never applies operations or evaluates a scene. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function qualifyVisual({ accepted, rejected, compiler, schemas, read, here, repo }) {
  const readVisual = n => read(`examples/visual-authoring/${n}`);
  const project = readVisual('project.json');
  const initialProject = readVisual('initial-project.json');
  const document = readVisual('document.json');
  const definitions = readVisual('definitions.json');
  const tokens = readVisual('tokens.json');
  const defaults = readVisual('defaults.json');
  const expectations = readVisual('expectations.json');
  const changes = readVisual('project-changes.json');
  const lines = readFileSync(resolve(here, 'examples/visual-authoring/page.jsonl'), 'utf8').trimEnd().split('\n').map(JSON.parse);
  const examples = [
    ['project', project], ['project', initialProject], ['document', document],
    ['document', readVisual('initial-document.json')], ['definition-source', definitions],
    ['definition-source', readVisual('initial-definitions.json')], ['authoring-token', tokens],
    ['authoring-token', readVisual('initial-tokens.json')], ['default-profile', defaults],
    ['definition', readVisual('button.definition.json')], ['definition', readVisual('banner.definition.json')],
    ['visual-expectations', expectations], ...changes.map(v => ['project-change', v]),
    ...lines.map(v => ['page-record', v]),
  ];
  for (const [kind, value] of examples) accepted(kind, value, `visual example ${kind}`);
  for (const entry of [...project.pages, ...project.sources]) assert.ok(existsSync(resolve(repo, entry.path)), entry.path);
  const fixture = { project, initialProject, document, definitions, tokens, defaults, changes, lines };

  // Bounded paper predicate for the original color/dimension cases, not a resolver.
  function eligibility(token, role, effectiveKind, expectedType, controls = {}) {
    assert.equal(token.$type, expectedType, 'PAPER_TOKEN_TYPE');
    const scope = token.$extensions?.['org.full-stack-ds.editor']?.eligibility;
    if (!scope) return;
    if (!controls.ignoreRole) assert.ok(scope.roles.includes(role), 'PAPER_TOKEN_ROLE');
    if (!controls.ignoreKind) assert.ok(scope.nodeKinds.includes(effectiveKind), 'PAPER_TOKEN_KIND');
  }
  function custody(f, controls = {}) {
    const byDefinition = new Map(f.definitions.definitions.map(d => [d.id, d]));
    assert.equal(byDefinition.size, f.definitions.definitions.length, 'PAPER_DEFINITION_DUPLICATE');
    const profiles = new Map(f.defaults.profiles.map(p => [p.id, p]));
    const allNodes = [];
    const edges = new Map();
    function reference(r) {
      assert.equal(r.sourceId, 'source.definitions', 'PAPER_DEFINITION_SOURCE');
      const target = byDefinition.get(r.definitionId);
      assert.ok(target, 'PAPER_DEFINITION_MISSING');
      assert.equal(r.version, target.version, 'PAPER_DEFINITION_VERSION');
      return target;
    }
    function graph(nodes, members, root) {
      const byNode = new Map(nodes.map(n => [n.id, n]));
      assert.equal(byNode.size, nodes.length, 'PAPER_NODE_DUPLICATE');
      assert.equal(new Set(members).size, members.length, 'PAPER_MEMBER_DUPLICATE');
      assert.deepEqual([...byNode.keys()].sort(), [...members].sort(), 'PAPER_MEMBER_CUSTODY');
      assert.ok(byNode.has(root), 'PAPER_ROOT_MISSING');
      const parents = new Map();
      for (const n of nodes) {
        assert.ok(profiles.has(n.defaultProfileRef.profileId), 'PAPER_PROFILE_MISSING');
        if (n.definitionRef) reference(n.definitionRef);
        for (const edge of n.children) {
          assert.ok(byNode.has(edge.nodeId), 'PAPER_CHILD_MISSING');
          assert.ok(!parents.has(edge.nodeId), 'PAPER_TWO_PARENTS');
          parents.set(edge.nodeId, n.id);
        }
        for (const p of n.fills ?? []) {
          if (p.color.kind !== 'token') continue;
          assert.equal(p.color.sourceId, 'source.tokens', 'PAPER_TOKEN_SOURCE');
          const token = f.tokens.tokens[p.color.path]; assert.ok(token, 'PAPER_TOKEN_MISSING');
          eligibility(token, n.kind === 'text' ? 'foreground' : 'fill', n.kind, 'color', controls);
        }
        if (n.corners?.radius.kind === 'token') {
          const b = n.corners.radius; assert.equal(b.sourceId, 'source.tokens', 'PAPER_TOKEN_SOURCE');
          assert.ok(f.tokens.tokens[b.path], 'PAPER_TOKEN_MISSING');
          eligibility(f.tokens.tokens[b.path], 'corner-radius', n.kind, 'dimension', controls);
        }
      }
      assert.ok(!parents.has(root), 'PAPER_ROOT_PARENT');
      for (const id of members) if (id !== root) assert.ok(parents.has(id), 'PAPER_UNATTACHED_BODY_MEMBER');
      allNodes.push(...nodes);
    }
    for (const c of f.document.compositions) graph(f.document.nodes.filter(n => c.nodeIds.includes(n.id)), c.nodeIds, c.rootNodeId);
    if (!controls.ignoreOwnership) {
      const members = f.document.compositions.flatMap(c => c.nodeIds);
      assert.equal(new Set(members).size, members.length, 'PAPER_COMPOSITION_DUPLICATE_OWNER');
      assert.deepEqual([...members].sort(), f.document.nodes.map(n => n.id).sort(), 'PAPER_PAGE_MEMBERSHIP');
    }
    for (const d of f.definitions.definitions) {
      assert.ok(d.body, 'PAPER_FIXTURE_BODY_MISSING');
      graph(d.body.nodes, d.body.nodeIds, d.body.rootNodeId);
      assert.equal(d.body.nodes.find(n => n.id === d.body.rootNodeId).kind, 'frame', 'PAPER_BODY_ROOT_KIND');
      edges.set(d.id, d.body.nodes.filter(n => n.definitionRef).map(n => n.definitionRef.definitionId));
    }
    assert.equal(new Set(allNodes.map(n => n.id)).size, allNodes.length, 'PAPER_CROSS_OWNER_ID_DUPLICATE');
    function visit(id, path = []) {
      assert.ok(!path.includes(id), 'PAPER_DEFINITION_CYCLE');
      for (const next of edges.get(id)) visit(next, [...path, id]);
    }
    for (const id of edges.keys()) visit(id);
    const revisions = new Map(f.initialProject.sources.map(s => [s.id, s.revision]));
    let projectRevision = f.initialProject.revision;
    const txMap = new Map(f.lines.slice(1).map(t => [t.transactionId, t]));
    assert.equal(txMap.size, f.lines.length - 1, 'PAPER_TX_DUPLICATE');
    for (const [index, t] of f.lines.slice(1).entries()) {
      assert.equal(t.expectedRevision, index, 'PAPER_PAGE_STALE');
      assert.equal(t.revision, index + 1, 'PAPER_PAGE_SEQUENCE');
    }
    const seen = new Set();
    const createdTokens = new Set();
    const createdDefinitions = new Set();
    assert.equal(new Set(f.changes.map(c => c.id)).size, f.changes.length, 'PAPER_CHANGE_DUPLICATE');
    for (const change of f.changes) {
      assert.equal(change.expectedProjectRevision, projectRevision, 'PAPER_PROJECT_STALE');
      projectRevision = change.projectRevision;
      for (const page of change.pageTransactions) {
        const t = txMap.get(page.transactionId); assert.ok(t, 'PAPER_PARTICIPANT_MISSING');
        assert.equal(page.pageId, f.document.pageId, 'PAPER_PARTICIPANT_PAGE');
        assert.equal(t.projectChangeId, change.id, 'PAPER_PARTICIPANT_LINK');
        assert.equal(t.expectedRevision, page.expectedRevision, 'PAPER_PARTICIPANT_REVISION');
        assert.equal(t.revision, page.revision, 'PAPER_PARTICIPANT_REVISION');
        assert.ok(!seen.has(t.transactionId), 'PAPER_PARTICIPANT_DUPLICATE'); seen.add(t.transactionId);
      }
      for (const source of change.sourceChanges) {
        assert.equal(source.expectedRevision, revisions.get(source.sourceId), 'PAPER_SOURCE_STALE');
        const u = change.dependencyUpdates.find(u => u.sourceId === source.sourceId);
        assert.ok(u, 'PAPER_DEPENDENCY_UPDATE_MISSING');
        assert.equal(u.fromRevision, source.expectedRevision, 'PAPER_DEPENDENCY_REVISION');
        assert.equal(u.toRevision, source.revision, 'PAPER_DEPENDENCY_REVISION');
        revisions.set(source.sourceId, source.revision);
        for (const op of source.operations) {
          assert.equal(source.kind, op.kind.includes('token') ? 'tokens' : 'definitions', 'PAPER_SOURCE_OPERATION_KIND');
          if (op.kind === 'create-token') {
            assert.ok(!createdTokens.has(op.name), 'PAPER_TOKEN_COLLISION'); createdTokens.add(op.name);
            assert.deepEqual(op.token, f.tokens.tokens[op.name], 'PAPER_CREATED_TOKEN_CUSTODY');
            const pageOps = change.pageTransactions.flatMap(p => txMap.get(p.transactionId).action.operations);
            assert.ok(pageOps.some(o => o.kind === 'set-binding' && o.binding.kind === 'token' && o.binding.sourceId === source.sourceId && o.binding.path === op.name), 'PAPER_TOKEN_BIND_PARTICIPANT');
          }
          if (op.kind === 'create-definition') {
            assert.ok(!createdDefinitions.has(op.definition.id), 'PAPER_DEFINITION_COLLISION'); createdDefinitions.add(op.definition.id);
            assert.deepEqual(op.definition.body, byDefinition.get(op.definition.id)?.body, 'PAPER_CREATED_BODY_CUSTODY');
          }
        }
      }
      const extractionOps = change.pageTransactions.flatMap(p => txMap.get(p.transactionId).action.operations).filter(o => o.kind === 'extract-definition');
      for (const op of extractionOps) {
        const receipt = change.correspondence.find(r => r.id === op.correspondenceId);
        assert.ok(receipt, 'PAPER_CORRESPONDENCE_MISSING');
        assert.equal(receipt.oldRootNodeId, op.nodeId, 'PAPER_CORRESPONDENCE_ROOT');
        assert.equal(receipt.retainedPlacementId, op.nodeId, 'PAPER_PLACEMENT_IDENTITY');
        assert.deepEqual(receipt.definitionRef, op.definitionRef, 'PAPER_CORRESPONDENCE_REFERENCE');
        const target = reference(op.definitionRef);
        assert.equal(new Set(receipt.entries.map(e => e.oldNodeId)).size, receipt.entries.length, 'PAPER_CORRESPONDENCE_DUPLICATE');
        assert.ok(receipt.entries.every(e => !receipt.entries.some(old => old.oldNodeId === e.bodyNodeId)), 'PAPER_BODY_IDS_FRESH');
        assert.deepEqual(receipt.entries.map(e => e.bodyNodeId).sort(), [...target.body.nodeIds].sort(), 'PAPER_CORRESPONDENCE_MEMBERS');
        assert.equal(receipt.entries.find(e => e.oldNodeId === op.nodeId)?.bodyNodeId, target.body.rootNodeId, 'PAPER_CORRESPONDENCE_ROOT');
      }
    }
    for (const t of txMap.values()) if (t.projectChangeId) assert.ok(seen.has(t.transactionId), 'PAPER_UNPUBLISHED_PARTICIPANT');
    assert.equal(projectRevision, f.project.revision, 'PAPER_SELECTED_PROJECT_REVISION');
    for (const s of f.project.sources) assert.equal(s.revision, revisions.get(s.id), 'PAPER_SELECTED_SOURCE_REVISION');
    assert.equal(f.project.sources.find(s => s.id === 'source.tokens').revision, f.tokens.revision);
    assert.equal(f.project.sources.find(s => s.id === 'source.definitions').revision, f.definitions.revision);
  }
  function untouched(fn, input) {
    const before = JSON.stringify(input); fn(input); assert.equal(JSON.stringify(input), before, 'paper probe mutated input');
  }
  untouched(v => custody(v), fixture);
  const invalid = [];
  function bad(name, value, label, keyword, alter) {
    const v = structuredClone(value); alter(v); invalid.push({ name, value: v, label, keyword });
  }
  bad('document', document, '0.2.0 does not silently migrate', 'const', v => { v.schemaVersion = '0.2.0'; });
  bad('document', document, 'definition placement cannot own visual overrides', 'false schema', v => { v.nodes[1].fills = definitions.definitions[0].body.nodes[0].fills; });
  bad('document', document, 'definition placement cannot flatten children', 'maxItems', v => { v.nodes[1].children = [{ nodeId: 'body.buttonText' }]; });
  bad('definition', definitions.definitions[1], 'instance cannot flatten nested Button', 'maxItems', v => { v.body.nodes[2].children = [{ nodeId: 'body.buttonText' }]; });
  bad('definition', definitions.definitions[0], 'color channels stay in range', 'maximum', v => { v.body.nodes[1].fills[0].color = { kind: 'literal', valueType: 'color', value: { colorSpace: 'srgb', components: [2, 1, 1], alpha: 1 } }; });
  bad('authoring-token', tokens, 'frame-only scope cannot be empty', 'minItems', v => { v.tokens['action-bg-primary'].$extensions['org.full-stack-ds.editor'].eligibility.nodeKinds = []; });
  bad('authoring-token', tokens, 'token metadata has declared roles', 'enum', v => { v.tokens['action-bg-primary'].$extensions['org.full-stack-ds.editor'].eligibility.roles = ['everything']; });
  bad('definition', definitions.definitions[0], 'corner dimension cannot be a color', 'const', v => { v.body.nodes[0].corners.radius.valueType = 'color'; });
  bad('definition', definitions.definitions[0], 'negative literal corners refuse', 'minimum', v => { v.body.nodes[0].corners.radius = { kind: 'literal', valueType: 'dimension', value: { value: -1, unit: 'px' } }; });
  bad('definition', definitions.definitions[1], 'space-between is a declared policy', 'enum', v => { v.body.nodes[0].layout.mainAxisAlignment = 'justifyBetween'; });
  bad('definition', definitions.definitions[1], 'fixed Button cannot silently shrink', 'const', v => { v.body.nodes[2].layoutItem.shrink = 1; });
  bad('extraction-correspondence', changes[3].correspondence[0], 'extraction receipt needs mapping', 'required', v => { delete v.entries; });
  bad('project-change', changes[0], 'source write needs expected revision', 'required', v => { delete v.sourceChanges[0].expectedRevision; });
  bad('project-change', changes[0], 'shared change needs page participant', 'minItems', v => { v.pageTransactions = []; });
  bad('project-change', changes[0], 'source changes are not file patches', 'additionalProperties', v => { v.sourceChanges[0].operations[0].filePatch = 'arbitrary'; });
  bad('project-change', changes[0], 'created-token removal is inverse only', 'const', v => { v.sourceChanges[0].operations = [{ id: 'op.remove', kind: 'remove-created-token', name: 'border-radius-md', createdByProjectChangeId: 'change.radius' }]; });
  bad('visual-expectations', expectations, 'expected tables are not runtime evidence', 'const', v => { v.basis = 'observed-runtime'; });
  for (const t of invalid) rejected(t.name, t.value, t.label, t.keyword);
  let controls = 0;
  function sensitivity(label, change) {
    const defs = structuredClone(schemas); change(defs);
    const t = invalid.find(t => t.label === label);
    accepted(t.name, t.value, `visual schema sensitivity ${label}`, compiler(defs)); controls++;
  }
  sensitivity('0.2.0 does not silently migrate', defs => { defs.find(s => s.$id.endsWith('/common.schema.json')).$defs.version = { enum: ['0.2.0', '0.3.0'] }; });
  sensitivity('definition placement cannot own visual overrides', defs => { delete defs.find(s => s.$id.endsWith('/visual-node.schema.json')).$defs.node.allOf[1].oneOf.at(-1).properties.fills; });
  sensitivity('source write needs expected revision', defs => { const s = defs.find(s => s.$id.endsWith('/project-change.schema.json')).properties.sourceChanges.items; s.required = s.required.filter(k => k !== 'expectedRevision'); });
  sensitivity('extraction receipt needs mapping', defs => { const s = defs.find(s => s.$id.endsWith('/extraction-correspondence.schema.json')); s.required = s.required.filter(k => k !== 'entries'); });
  const probes = [];
  function probe(label, code, change) {
    const v = structuredClone(fixture); change(v); const before = JSON.stringify(v);
    assert.throws(() => custody(v), { message: new RegExp(code) }, label);
    assert.equal(JSON.stringify(v), before, label); probes.push(label);
  }
  probe('duplicate composition ownership', 'PAPER_COMPOSITION_DUPLICATE_OWNER', v => { v.document.compositions.push(structuredClone(v.document.compositions[0])); });
  probe('unresolved nested definition', 'PAPER_DEFINITION_MISSING', v => { v.definitions.definitions[1].body.nodes[2].definitionRef.definitionId = 'definition.missing'; });
  probe('unresolved body token', 'PAPER_TOKEN_MISSING', v => { v.definitions.definitions[0].body.nodes[0].fills[0].color.path = 'missing'; });
  probe('stale source revision', 'PAPER_SOURCE_STALE', v => { v.changes[0].sourceChanges[0].expectedRevision = 'foreign'; });
  probe('stale page revision', 'PAPER_PAGE_STALE', v => { v.lines[2].expectedRevision = 99; });
  probe('stale project revision', 'PAPER_PROJECT_STALE', v => { v.changes[0].expectedProjectRevision = 'foreign'; });
  probe('missing dependency update', 'PAPER_DEPENDENCY_UPDATE_MISSING', v => { v.changes[0].dependencyUpdates = []; });
  probe('unpublished shared page operation', 'PAPER_PARTICIPANT_LINK', v => { delete v.lines[8].projectChangeId; });
  probe('incomplete extraction mapping', 'PAPER_CORRESPONDENCE_MEMBERS', v => { v.changes[3].correspondence[0].entries.pop(); });
  probe('wrong effective kind eligibility', 'PAPER_TOKEN_KIND', v => { v.tokens.tokens['action-bg-primary'].$extensions['org.full-stack-ds.editor'].eligibility.nodeKinds = ['text']; });
  probe('wrong role eligibility', 'PAPER_TOKEN_ROLE', v => { v.tokens.tokens['action-bg-primary'].$extensions['org.full-stack-ds.editor'].eligibility.roles = ['border']; });
  probe('two structural parents', 'PAPER_TWO_PARENTS', v => { v.definitions.definitions[1].body.nodes[0].children.push({ nodeId: 'body.bannerTitle' }); });
  probe('colliding token source name', 'PAPER_TOKEN_COLLISION', v => { v.changes[1].sourceChanges[0].operations[0].name = 'border-radius-md'; });
  probe('token creation without binding participant', 'PAPER_TOKEN_BIND_PARTICIPANT', v => { v.lines[8].action.operations[0].binding.path = 'different'; });
  const restricted = tokens.tokens['action-bg-primary'];
  untouched(t => eligibility(t, 'fill', 'frame', 'color'), restricted);
  for (const [role, kind, code] of [['border', 'frame', 'ROLE'], ['foreground', 'text', 'ROLE'], ['fill', 'shape', 'KIND']]) {
    assert.throws(() => eligibility(restricted, role, kind, 'color'), { message: new RegExp(`PAPER_TOKEN_${code}`) });
  }
  eligibility(restricted, 'border', 'frame', 'color', { ignoreRole: true });
  eligibility(restricted, 'fill', 'shape', 'color', { ignoreKind: true });
  controls += 2;
  // Every added source operation has a positive shape example. These do not execute inverses.
  const sourceEdit = structuredClone(changes[0]);
  sourceEdit.pageTransactions = [];
  sourceEdit.sourceChanges = [{ sourceId: 'source.definitions', kind: 'definitions', expectedRevision: 'd3', revision: 'd4', operations: [{ id: 'op.sourceRadius', kind: 'set-definition-binding', definitionId: 'definition.button', address: { kind: 'corner', nodeId: 'body.buttonRoot', property: 'radius' }, binding: { kind: 'literal', valueType: 'dimension', value: { value: 16, unit: 'px' } } }] }];
  sourceEdit.dependencyUpdates = [{ sourceId: 'source.definitions', fromRevision: 'd3', toRevision: 'd4' }];
  accepted('project-change', sourceEdit, 'source-only definition edit has no invented page mutation');
  for (const [kind, fields] of [
    ['remove-created-token', { name: 'border-radius-md', createdByProjectChangeId: 'change.radius' }],
    ['remove-created-definition', { definitionId: 'definition.button', createdByProjectChangeId: 'change.button' }],
  ]) {
    const inverse = structuredClone(changes[0]); inverse.history = { kind: 'undo', ofProjectChangeId: 'change.radius' };
    inverse.sourceChanges[0].operations = [{ id: 'op.inverse', kind, ...fields }];
    inverse.sourceChanges[0].kind = kind.includes('token') ? 'tokens' : 'definitions';
    accepted('project-change', inverse, `${kind} inverse shape only`);
  }
  const redo = structuredClone(changes[0]); redo.history = { kind: 'redo', ofProjectChangeId: 'change.undoRadius' };
  accepted('project-change', redo, 'redo provenance shape only');
  const textReplace = { id: 'op.replace', owner: { kind: 'composition', compositionId: 'composition.banner' }, kind: 'replace-text', nodeId: 'node.title', content: 'Revised title' };
  accepted('edit-operation', textReplace, 'explicit text replacement');
  const local = structuredClone(definitions.definitions[1]); local.body.nodes[2].corners = { linked: true, radius: { kind: 'literal', valueType: 'dimension', value: { value: 4, unit: 'px' } } };
  accepted('definition', local, 'local nested root override remains authored');
  delete local.body.nodes[2].corners; accepted('definition', local, 'reset is exact absence, not resolved literal');
  // Exact original custody, no interpolation/layout/inheritance/reducer calculations.
  assert.deepEqual(document.nodes.map(n => [n.id, n.kind]), [['node.banner', 'definition-placement'], ['node.button', 'definition-placement']]);
  assert.deepEqual(definitions.definitions[1].body.nodes[2].definitionRef, document.nodes[1].definitionRef);
  assert.deepEqual(definitions.definitions[0].body.nodes[0].corners.radius, { kind: 'token', valueType: 'dimension', sourceId: 'source.tokens', path: 'border-radius-md' });
  assert.deepEqual(definitions.definitions.map(d => d.parameters), [[], []]);
  assert.equal(defaults.profiles[0].properties['sizing.width'].value.value, 100);
  assert.deepEqual(defaults.profiles[0].fills[0].color.value.components, [1, 1, 1]);
  assert.deepEqual(expectations.layout, { title: [0, 0, 96, 20], button: [672, 0, 128, 36], spaceBetweenPx: 576 });
  const prose = readFileSync(resolve(repo, 'docs/architecture/design/shared-document-model/visual-authoring-expectations.md'), 'utf8');
  for (const s of expectations.steps) {
    const row = prose.split('\n').find(l => l.startsWith(`| ${s.step} |`)); assert.ok(row, `step table ${s.step}`);
    const cells = row.split('|').map(c => c.trim());
    assert.equal(s.afterRevision, Number(cells[2]));
    assert.deepEqual([s.projectRevision, s.tokenRevision, s.definitionRevision], cells.slice(3, 6));
    assert.equal(s.beforeRevision, s.step === 1 ? 0 : expectations.steps[s.step - 2].afterRevision);
    const txs = lines.slice(1).filter(t => s.beforeRevision < t.revision && t.revision <= s.afterRevision).map(t => t.transactionId);
    assert.deepEqual(s.transactionIds, txs);
  }
  for (const o of expectations.observations) assert.ok(prose.includes(`| ${o.id} |`), o.id);
  return { primary: examples.length, invalid: invalid.length, probes: probes.length + 3, controls };
}
