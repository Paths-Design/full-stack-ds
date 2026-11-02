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

/** Fresh processes exercise both first-load orders against the exact installed tarballs. */
export function mixedRuntimeFixture(first) {
  return `import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const formats = ${JSON.stringify([first, first === "esm" ? "cjs" : "esm"])};
const load = async (format, name) => format === 'esm' ? import(name) : require(name);
const modules = {};
for (const format of formats) {
  modules[format] = {};
  for (const name of ['react', 'react/primitives', 'vue', 'lit', 'lit/primitives']) {
    modules[format][name] = await load(format, '@full-stack-ds/' + name);
  }
}
for (const name of Object.keys(modules.esm)) {
  for (const key of Object.keys(modules.esm[name]).filter(key => key !== '__esModule')) {
    assert.ok(Object.hasOwn(modules.cjs[name], key), name + ': missing CJS export ' + key);
    assert.equal(modules.esm[name][key], modules.cjs[name][key], name + ': mixed-format identity ' + key);
  }
}
const React = await import('react');
assert.equal(React.createElement, require('react').createElement, 'React peer must be shared');
const { renderToStaticMarkup } = await import('react-dom/server');
let reactCases = 0;
for (const providerFormat of formats) for (const hookFormat of formats) {
  for (const providerEntry of ['react', 'react/primitives']) for (const hookEntry of ['react', 'react/primitives']) {
    const provider = modules[providerFormat][providerEntry];
    const hook = modules[hookFormat][hookEntry];
    function Consumer() {
      return React.createElement('span', null, hook.useFsdsMessages('ReleaseProbe', { label: 'Untranslated' }).label);
    }
    const html = renderToStaticMarkup(React.createElement(provider.FsdsMessagesProvider, {
      messages: { ReleaseProbe: { label: 'Prêt à publier' } },
    }, React.createElement(Consumer)));
    assert.equal(html, '<span>Prêt à publier</span>', [providerFormat, providerEntry, hookFormat, hookEntry].join(':'));
    reactCases += 1;
  }
}
assert.equal(reactCases, 16);
const Vue = await import('vue');
assert.equal(Vue.h, require('vue').h, 'Vue peer must be shared');
const { renderToString } = await import('vue/server-renderer');
let vueCases = 0;
for (const providerFormat of formats) for (const hookFormat of formats) {
  const provider = modules[providerFormat].vue;
  const hook = modules[hookFormat].vue;
  const Consumer = { setup() {
    const messages = hook.useFsdsMessages('ReleaseProbe', { label: 'Untranslated' });
    return () => Vue.h('span', messages.value.label);
  } };
  const app = Vue.createSSRApp({ render: () => Vue.h(provider.FsdsMessagesProvider, {
    messages: { ReleaseProbe: { label: 'Prêt à publier' } },
  }, { default: () => Vue.h(Consumer) }) });
  assert.equal(await renderToString(app), '<!--[--><span>Prêt à publier</span><!--]-->');
  vueCases += 1;
}
assert.equal(vueCases, 4);
let litCases = 0;
for (const setterFormat of formats) for (const controllerFormat of formats) {
  const setter = modules[setterFormat].lit;
  const reader = modules[controllerFormat]['lit/primitives'];
  assert.equal(customElements.get('fsds-stack'), reader.StackElement);
  assert.equal(customElements.get('fsds-button'), setter.ButtonElement);
  let updates = 0;
  const host = { addController() {}, requestUpdate() { updates += 1; } };
  const controller = new reader.FsdsMessagesController(host, 'ReleaseProbe', { label: 'Untranslated' });
  controller.hostConnected();
  setter.setFsdsMessages({ ReleaseProbe: { label: 'Prêt à publier' } });
  assert.equal(controller.value.label, 'Prêt à publier');
  assert.equal(updates, 1);
  controller.hostDisconnected();
  setter.setFsdsMessages(undefined);
  assert.equal(controller.value.label, 'Untranslated');
  assert.equal(updates, 1, 'disconnected controllers must leave the shared listener registry');
  litCases += 1;
}
assert.equal(litCases, 4);
console.log(JSON.stringify({ node: process.version, first: formats[0], reactCases, vueCases, litCases, passed: true }));
`;
}
