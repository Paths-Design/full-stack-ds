import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composedComponents, inspectComponentReferences, inspectComposeTokens, REFERENCE_DIVERGENCES } from './compose-parity-diff.mjs';

const definition = (key, scope = 'root', fields = 'fallback = "8px",') =>
  `"${scope}" to mapOf("${key}" to ComponentTokenDefinition(name = "${key}", cssVar = "--fsds-${key.replaceAll('.', '-')}", ${fields})),`;
const fixture = (changes = {}) => ({
  name: 'Example',
  component: 'fun Example(modifier: Modifier = Modifier) { val x = exampleTokenScopes["root"]?.get("example.width") }',
  tokens: definition('example.width'),
  rnTokens: 'name: "example.width", cssVar: "--fsds-example-width", name: "box-model.gap", cssVar: "--fsds-box-model-gap",',
  rnStyles: 'const gap = tokens.root?.["box-model.gap"];',
  ...changes,
});

test('different consumed target vocabularies are valid', () => {
  assert.deepEqual(inspectComposeTokens(fixture()), []);
  assert.deepEqual(inspectComposeTokens(fixture({ rnTokens: '', rnStyles: '' })), []);
});
test('a missing definition or a definition in the wrong state cannot satisfy a read', () => {
  assert.deepEqual(inspectComposeTokens(fixture({ tokens: '' })), ['DEAD LOOKUP root/example.width']);
  assert.deepEqual(inspectComposeTokens(fixture({ tokens: definition('example.width', 'checked') })), [
    'UNCONSUMED checked/example.width', 'DEAD LOOKUP root/example.width',
  ]);
});
test('unconsumed baggage is rejected in either a new name or an unread state', () => {
  assert.deepEqual(inspectComposeTokens(fixture({ tokens: definition('example.width') + definition('unused') })), ['UNCONSUMED root/unused']);
  assert.deepEqual(inspectComposeTokens(fixture({ tokens: definition('example.width') + definition('example.width', 'hover') })), ['UNCONSUMED hover/example.width']);
});
test('shared identity drift, malformed identity and unresolvable entries are rejected', () => {
  assert.match(inspectComposeTokens(fixture({ rnTokens: 'name: "example.width", cssVar: "--fsds-wrong",' }))[0], /SHARED IDENTITY/);
  assert.match(inspectComposeTokens(fixture({ tokens: definition('example.width').replace('name = "example.width"', 'name = "wrong"') }))[0], /INVALID IDENTITY/);
  assert.deepEqual(inspectComposeTokens(fixture({ tokens: definition('example.width', 'root', '') })), ['UNRESOLVABLE root/example.width: no ref, literal or fallback']);
  for (const fields of ['literal = "0",', 'ref = "semantic.size",', 'fallback = "0",']) {
    assert.deepEqual(inspectComposeTokens(fixture({ tokens: definition('example.width', 'root', fields) })), []);
  }
});
test('a supported styling role cannot disappear even if its definition disappears too', () => {
  assert.deepEqual(inspectComposeTokens(fixture({ rnStyles: 'tokens.root?.["example.color.background.default"]' })), [
    'USAGE DIVERGENCE static: example.color.background.default',
  ]);
});
test('layered branch reads are covered and unrelated strings do not credit consumption', () => {
  const input = fixture({
    component: 'fun Example(modifier: Modifier = Modifier) { layeredSlot(when (size) { Small -> "example.small"; Large -> "example.large" }) }',
    tokens: definition('example.small') + definition('example.large', 'variant_large'),
  });
  assert.deepEqual(inspectComposeTokens(input), []);
  assert.deepEqual(inspectComposeTokens({ ...input, tokens: definition('example.small') }), ['DEAD LOOKUP layered/example.large']);
  assert.deepEqual(inspectComposeTokens(fixture({ component: 'fun Example(modifier: Modifier = Modifier) { /* layeredSlot("example.width") */ val label = when (x) { X -> "example.width" } }' })), ['UNCONSUMED root/example.width']);
});
test('content propagation and modifier ordering remain obligations', () => {
  const input = fixture({
    component: 'fun Example(modifier: Modifier = Modifier, content: @Composable () -> Unit) { layeredSlot("example.color.foreground.primary") }',
    tokens: definition('example.color.foreground.primary'),
  });
  assert.deepEqual(inspectComposeTokens(input), ['CONTENT COLOR: missing LocalFsdsContentColor']);
  assert.deepEqual(inspectComposeTokens({ ...input, component: input.component.replace('layeredSlot(', 'LocalFsdsContentColor; layeredSlot(') }), []);
  assert.deepEqual(inspectComposeTokens(fixture({ component: fixture().component.replace('modifier: Modifier = Modifier', 'size: Int = 8, modifier: Modifier = Modifier') })), ['MODIFIER ORDER: modifier must be first optional']);
});

/** A surface fixture whose Kotlin carries the given host markers plus one
 *  ordinary read, and whose RN styles consume exactly one chrome role. */
const surfaceFixture = (markers, roleKey) => fixture({
  component: `fun Example(modifier: Modifier = Modifier) { ${markers} val x = exampleTokenScopes["root"]?.get("example.width") }`,
  rnStyles: `tokens.root?.["${roleKey}"];`,
});

/** Surface shapes whose Kotlin carries a host marker the lower-level paths
 *  also test for. A centered surface may carry a search field; an anchored
 *  surface is a `Popup(` host; a viewport-edge surface is a `ComposeDialog(`
 *  host — so each must be classified by its own marker, not by the reused
 *  one, or its chrome-role claim becomes vacuous. */
const SURFACE_CASES = [
  ['centeredSurface', 'ComposeDialog(onDismissRequest = {}) { BasicTextField(value = "", onValueChange = {}) }', 'command.color.border'],
  ['anchoredSurface', 'Popup(onDismissRequest = {}) { onGloballyPositioned { } }', 'popover.color.border'],
  ['edgeSurface', 'ComposeDialog(onDismissRequest = {}) { Box(Modifier.fillMaxSize()) }', 'sheet.color.border'],
];

for (const [path, markers, roleKey] of SURFACE_CASES) {
  test(`a ${path} is classified by its own host, not by a host it reuses`, () => {
    assert.deepEqual(inspectComposeTokens(surfaceFixture(markers, roleKey)), [
      `USAGE DIVERGENCE ${path}: ${roleKey}`,
    ]);
  });
  test(`the ${path} chrome role is satisfiable, so the divergence above is not an artifact`, () => {
    assert.deepEqual(inspectComposeTokens({
      ...surfaceFixture(markers, roleKey),
      tokens: definition('example.width') + definition(roleKey),
      component: surfaceFixture(markers, roleKey).component.replace('val x =', `layeredSlot("${roleKey}"); val x =`),
    }), []);
  });
}

/** A date-grid fixture: the committed date substrate is the class marker, and
 *  the role key below is claimed only by the date-grid path — the static,
 *  prop-text and expandable roles all accept a bare `.background`/`.radius`
 *  vocabulary and would let this key go unchecked. */
const dateGridFixture = (body) => fixture({
  component: `fun Example(modifier: Modifier = Modifier) { val dateGrid = FsdsDateGrid.compute(emptyList(), null, false, "en-US"); ${body}; val x = exampleTokenScopes["root"]?.get("example.width") }`,
  rnStyles: 'tokens.root?.["calendar.color.day.selected.background"];',
});

test('a date grid is classified by its substrate call, not as a text-bearing leaf', () => {
  assert.deepEqual(inspectComposeTokens(dateGridFixture('BasicText(text = "")')), [
    'USAGE DIVERGENCE dateGrid: calendar.color.day.selected.background',
  ]);
});
test('the date-grid chrome role is satisfiable, so the divergence above is not an artifact', () => {
  assert.deepEqual(inspectComposeTokens({
    ...dateGridFixture('layeredSlot("calendar.color.day.selected.background")'),
    tokens: definition('example.width') + definition('calendar.color.day.selected.background'),
  }), []);
});

test('a named-slot composer is classified by its region signature, not as a text leaf', () => {
  const slot = (name) => `${name}: (@Composable () -> Unit)? = null`;
  const input = fixture({
    component: `fun Example(modifier: Modifier = Modifier, ${slot('label')}, ${slot('control')}, ${slot('help')}, ${slot('error')}) { BasicText(text = "") ; val x = exampleTokenScopes["root"]?.get("example.width") }`,
    rnStyles: 'tokens.root?.["field.color.invalid-text"];',
  });
  assert.deepEqual(inspectComposeTokens(input), [
    'USAGE DIVERGENCE namedSlotComposer: field.color.invalid-text',
  ]);
  assert.deepEqual(inspectComposeTokens({
    ...input,
    tokens: definition('example.width') + definition('field.color.invalid-text'),
    component: input.component.replace('val x =', 'layeredSlot("field.color.invalid-text"); val x ='),
  }), []);
});

test('projected controls claim canonical padding edges and typography loss cannot erase its obligation', () => {
  assert.deepEqual(inspectComposeTokens(fixture({
    component: fixture().component.replace('val x =', 'FsdsButtonScope; val x ='),
    rnStyles: 'tokens.root?.["box-model.padding-inline-end"]; tokens.root?.["box-model.padding-block-end"];',
  })), [
    'USAGE DIVERGENCE button: box-model.padding-inline-end',
    'USAGE DIVERGENCE button: box-model.padding-block-end',
  ]);
  assert.deepEqual(inspectComposeTokens(fixture({
    rnTokens: 'name: "text.size.md", cssVar: "--fsds-text-size-md",',
    rnStyles: 'tokens.root?.["text.size.md"];',
  })), ['USAGE DIVERGENCE static: text.size.md']);
});

test('a composed component is imported by the package it is named for, not a family substrate', () => {
  assert.deepEqual(composedComponents([
    'import com.fullstackds.components.button.Button',
    'import com.fullstackds.components.button.ButtonVariant',
    'import com.fullstackds.components.toggle.FsdsToggle',
    'import com.fullstackds.components.date.FsdsDate',
    'import com.fullstackds.components.glyph.FsdsGlyphIcon',
  ].join('\n')), ['Button']);
});

test('a declared component reference is realized, ledgered, or reported', () => {
  const contract = { anatomy: { dom: { tag: 'span', part: 'action', componentRef: 'fsds.Button' } } };
  const unrealized = inspectComponentReferences({ name: 'Probe', contract, component: 'fun Probe() { }', ledger: {} });
  assert.deepEqual(unrealized, [
    'UNREALIZED REFERENCE Probe:action: the contract declares a reference to Button and the emitted source never calls it',
  ]);
  assert.deepEqual(inspectComponentReferences({ name: 'Probe', contract, component: 'fun Probe() { Button() }', ledger: {} }), []);
  assert.deepEqual(inspectComponentReferences({ name: 'Probe', contract, component: 'fun Probe() { }', ledger: { 'Probe:action': 'why' } }), []);
  // The ledger is two-directional: realizing a listed reference is a stale entry.
  assert.deepEqual(inspectComponentReferences({ name: 'Probe', contract, component: 'fun Probe() { Button() }', ledger: { 'Probe:action': 'why' } }), [
    'STALE REFERENCE LEDGER Probe:action: the reference to Button is realized — remove the entry',
  ]);
});

test('every ledgered reference names a real declared reference, so a typo cannot hide a drop', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  const root = join(import.meta.dirname, '..');
  for (const key of Object.keys(REFERENCE_DIVERGENCES)) {
    const [name, part] = key.split(':');
    const path = join(root, 'packages', 'ds-contracts', 'components', name, `${name}.contract.json`);
    assert.ok(existsSync(path), `ledger entry ${key} names no contract`);
    const contract = JSON.parse(readFileSync(path, 'utf8'));
    const parts = [];
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (typeof node.componentRef === 'string') parts.push(node.part ?? '(unparted)');
      (node.children ?? []).forEach(walk);
    };
    walk(contract.anatomy?.dom);
    assert.ok(parts.includes(part), `ledger entry ${key} names no declared reference`);
  }
});
