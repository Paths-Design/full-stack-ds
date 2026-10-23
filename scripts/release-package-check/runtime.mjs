// Each format runs in its own process, with root and primitive entries together.
// Mixing providers and consumers across public entries must preserve context.
export function runtimeFixture(format) {
  return `import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const load = ${format === "esm" ? "specifier => import(specifier)" : "async specifier => require(specifier)"};
const react = await load('@full-stack-ds/react');
const primitives = await load('@full-stack-ds/react/primitives');
for (const name of ['Stack', 'FsdsMessagesProvider', 'useFsdsMessages', 'PortalTargetProvider']) {
  assert.equal(react[name], primitives[name], name + ' must preserve identity between public entries');
}
const React = await load('react');
const { renderToStaticMarkup } = await load('react-dom/server');
function Consumer() {
  const messages = react.useFsdsMessages('ReleaseProbe', { label: 'Untranslated' });
  return React.createElement('span', null, messages.label);
}
assert.equal(renderToStaticMarkup(React.createElement(primitives.FsdsMessagesProvider, {
  messages: { ReleaseProbe: { label: 'Prêt à publier' } },
}, React.createElement(Consumer))), '<span>Prêt à publier</span>');
const vue = await load('@full-stack-ds/vue');
assert.equal(typeof vue.Button.setup, 'function');
const lit = await load('@full-stack-ds/lit');
const litPrimitives = await load('@full-stack-ds/lit/primitives');
assert.equal(lit.StackElement, litPrimitives.StackElement);
assert.equal(customElements.get('fsds-stack'), lit.StackElement);
assert.equal(customElements.get('fsds-button'), lit.ButtonElement);
const { resolveIcon } = await import('@full-stack-ds/iconography');
assert.equal(resolveIcon('alarm', 24).name, 'alarm');
assert.equal(resolveIcon('missing-icon', 24), undefined);
const { default: tokens } = await import('@full-stack-ds/tokens/generated/resolved.tokens.json', { with: { type: 'json' } });
assert.equal(tokens.core.color.datavis.viridis['1'].$value, '#440154');
console.log('${format}: public entry identities, translated context, registrations, icon lookup and JSON verified');
`;
}
