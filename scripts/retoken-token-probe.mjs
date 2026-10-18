#!/usr/bin/env node
/**
 * RETOKEN-TOKEN-AUDIT-01 — runtime load-bearing probe for the retoken token scope.
 *
 * For every --fsds-* declaration in the committed baseline, remove it in-page
 * (custom property: unset !important) and watch used CSS properties on the
 * matched elements and their descendants. No used-property change anywhere
 * => 'dead' candidate; any change => 'load-bearing'.
 *
 * Usage: node scripts/retoken-token-probe.mjs --url http://localhost:5173/e2e/fixtures/retoken-pages/index.html?page=spotify [--baseline <path>]
 * Prints JSON { key: verdict } to stdout. Requires a running dev server.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const baselinePath = args.includes('--baseline')
  ? args[args.indexOf('--baseline') + 1]
  : 'e2e/fixtures/retoken-pages/token-audit-baseline.json';

const baseline = JSON.parse(readFileSync(path.resolve(root, baselinePath), 'utf8'));
const declarations = Object.entries(baseline.declarations)
  .filter(([, rec]) => !/^dead-removed/.test(rec.verdict ?? ''))
  .map(([key]) => {
    const [selector, , prop] = key.split('|');
    return { key, selector, prop };
  });

const WATCH = [
  'background-color', 'color', 'border-top-width', 'border-top-color', 'border-radius', 'font-size', 'font-weight',
  'line-height', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right', 'gap',
  'min-height', 'min-width', 'width', 'height', 'box-shadow', 'opacity', 'object-fit',
  'aspect-ratio', 'letter-spacing', 'outline-color', 'outline-width', 'fill', 'stroke',
];
const MAX_NODES = 600;

const browser = await chromium.launch();
const results = {};

for (const pageKind of ['spotify', 'pinterest', 'pinterest&pin=0']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`http://localhost:5173/e2e/fixtures/retoken-pages/index.html?page=${pageKind}`);
  await page.waitForSelector('.retoken');
  if (pageKind.includes('pin=')) {
    // Open the pin overflow menu so .pin-menu (portal content) is present for probing.
    try { await page.click('[aria-label^="More options"]', { timeout: 3000 }); } catch { /* menu click is best-effort; .pin-menu probes report no-match without it */ }
  }
  // Kill transitions/animations so synchronous computed reads do not race them.
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });

  const scoped = declarations;

  for (const decl of scoped) {
    // State-conditioned slots (hover/active/focus/disabled/condition) style a state the
    // resting page never shows; classify statically instead of probing.
    if (/@media|(-(hover|active|focus|disabled)-|design-condition-)/.test(`${decl.prop} ${decl.key}`)) {
      if (!(decl.key in results)) results[decl.key] = 'state-conditioned';
      continue;
    }
    const verdict = await page.evaluate(async ({ selector, prop, maxNodes, watch }) => {
      const nodes = [];
      const push = el => { if (el && el.nodeType === 1 && nodes.length < maxNodes) nodes.push(el); };
      let roots;
      try { roots = [...document.querySelectorAll(selector)]; } catch { return 'invalid-selector'; }
      if (roots.length === 0) return 'no-match';
      for (const r of roots) { push(r); r.querySelectorAll('*').forEach(push); }
      const snap = () => nodes.map(el => {
        const cs = getComputedStyle(el);
        return watch.map(p => cs.getPropertyValue(p)).join('|');
      }).join('!');
      const before = snap();
      const style = document.createElement('style');
      style.textContent = `${selector} { ${prop}: unset !important; }`;
      document.head.appendChild(style);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const after = snap();
      style.remove();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return before === after ? 'dead' : 'load-bearing';
    }, { selector: decl.selector, prop: decl.prop, maxNodes: MAX_NODES, watch: WATCH });
    const significant = verdict === 'load-bearing' || verdict === 'dead';
    if (!significant) continue;
    if (!(decl.key in results) || results[decl.key] === 'dead') results[decl.key] = verdict;
  }
  await page.close();
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
