#!/usr/bin/env node
/**
 * RETOKEN-TOKEN-AUDIT-01 — static audit + gate for the retoken-page token scope.
 *
 * Modes:
 *   node scripts/audit-retoken-tokens.mjs                 gate (default): inventory vs committed
 *                                                         baseline, adjudication completeness, literal
 *                                                         census, parity entries, contrast pairs. Exit 0 clean.
 *   node scripts/audit-retoken-tokens.mjs --emit          print a fresh baseline skeleton for adjudication
 *   node scripts/audit-retoken-tokens.mjs --fallbacks     print the unset-design-var default-chain trace
 *
 * Static only — no browser. Runtime load-bearing verdicts come from
 * scripts/retoken-token-probe.mjs and are recorded in the baseline.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = 'e2e/fixtures/retoken-pages/theme.css';
const BASELINE = 'e2e/fixtures/retoken-pages/token-audit-baseline.json';
const COMPONENTS = 'packages/ds-react/src/components';
const TOKENS_CSS = 'packages/ds-tokens/generated/tokens.css';

const argv = process.argv.slice(2);
const emit = argv.includes('--emit');
const fallbacksMode = argv.includes('--fallbacks');

// ---------- theme.css parsing ----------

function parseCss(text) {
  // Returns [{selector, media, line, decls: [{prop, value}]}]; small brace walker.
  const rules = [];
  const stack = [{ selector: null, media: null }];
  let buffer = '';
  let line = 1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\n') line++;
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 1;
      continue;
    }
    if (ch === '{') {
      const prelude = buffer.trim();
      const parent = stack[stack.length - 1];
      if (prelude.startsWith('@media')) {
        stack.push({ selector: null, media: prelude });
      } else {
        stack.push({ selector: prelude, media: parent.media, line });
      }
      buffer = '';
      continue;
    }
    if (ch === '}') {
      const frame = stack.pop();
      if (frame.selector && buffer.includes(':')) {
        const decls = [];
        for (const part of buffer.split(';')) {
          const idx = part.indexOf(':');
          if (idx === -1) continue;
          decls.push({ prop: part.slice(0, idx).trim(), value: part.slice(idx + 1).trim() });
        }
        if (decls.length) rules.push({ selector: frame.selector, media: frame.media || null, line: frame.line, decls });
      }
      buffer = '';
      continue;
    }
    buffer += ch;
  }
  return rules;
}

const themeText = readFileSync(path.join(root, CSS), 'utf8');
const rules = parseCss(themeText);

const fsdsEntries = [];
const pageVars = { base: {}, spotify: {}, pinterest: {} };
for (const rule of rules) {
  for (const { prop, value } of rule.decls) {
    if (prop.startsWith('--fsds-')) {
      fsdsEntries.push({
        key: `${rule.selector}|${rule.media ?? ''}|${prop}`,
        selector: rule.selector, media: rule.media, prop, value,
        kind: /var\(/.test(value) ? 'ref' : 'literal',
      });
    } else if (prop.startsWith('--page-') || prop.startsWith('--retoken-')) {
      const scope = rule.selector === '.spotify' ? 'spotify' : rule.selector === '.pinterest' ? 'pinterest' : 'base';
      pageVars[scope][prop] = value;
    }
  }
}

function resolveValue(value, page) {
  // Resolve --page-*/--retoken-* refs in page order base -> page; returns final string.
  let out = value;
  for (let i = 0; i < 6; i++) {
    const m = out.match(/var\((--(?:page|retoken)-[a-z0-9-]+)\)/);
    if (!m) break;
    const replacement = pageVars[page][m[1]] ?? pageVars.base[m[1]] ?? m[1];
    out = out.replace(m[0], replacement);
  }
  return out;
}

// ---------- component design-var default chains ----------

function componentNames() {
  const names = new Set();
  for (const page of ['pages.tsx', 'pinterest.tsx', 'spotify.tsx']) {
    const text = readFileSync(path.join(root, 'e2e/fixtures/retoken-pages', page), 'utf8');
    for (const m of text.matchAll(/<([A-Z][A-Za-z0-9]+)/g)) names.add(m[1]);
    for (const m of text.matchAll(/import \{([^}]*)\} from '\.\.\/\.\.\/\.\.\/packages\/ds-react\/src\/components'/g))
      for (const n of m[1].split(',').map(s => s.trim()).filter(Boolean)) names.add(n);
  }
  return [...names].filter(n => n !== 'Popover' || true);
}

function designVarChains() {
  // { 'button': { 'design-root-background-fill': {var, fallbackTerminal} } }
  const tokensCss = readFileSync(path.join(root, TOKENS_CSS), 'utf8');
  const tokenMap = new Map();
  for (const m of tokensCss.matchAll(/(--fsds-[a-z0-9-]+)\s*:\s*([^;]+);/g)) tokenMap.set(m[1], m[2].trim());

  function terminalOf(expr, depth = 0) {
    if (depth > 8) return expr.trim();
    const inner = expr.match(/var\((--fsds-[a-z0-9-]+)(?:\s*,\s*([^()]*))?\)/);
    if (!inner) return expr.trim();
    if (inner[2] !== undefined) return terminalOf(inner[2], depth + 1);
    return tokenMap.has(inner[1]) ? terminalOf(tokenMap.get(inner[1]), depth + 1) : `unresolved:${inner[1]}`;
  }

  const chains = {};
  for (const name of componentNames()) {
    const dir = path.join(root, COMPONENTS, name);
    let files;
    try {
      files = readdirSafe(dir);
    } catch { continue; }
    const map = {};
    for (const file of files) {
      const text = readFileSync(path.join(dir, file), 'utf8');
      for (const m of text.matchAll(/var\((--fsds-[a-z0-9]+-design-[a-z0-9-]+)\s*,\s*(\(\s*)?/g)) {
        // Extract the full balanced fallback for this var occurrence.
        const start = m.index + 4; // after 'var('
        let depth = 1, i = start;
        while (i < text.length && depth > 0) {
          if (text[i] === '(') depth++;
          else if (text[i] === ')') depth--;
          i++;
        }
        const inner = text.slice(start, i - 1);
        const comma = splitTopLevel(inner);
        const varName = m[1];
        const fallback = comma.length > 1 ? comma.slice(1).join(',') : '';
        if (!(varName in map) || map[varName].fallback === '') {
          map[varName] = { var: varName, fallback: fallback.trim(), terminal: terminalOf(fallback || varName) };
        }
      }
    }
    if (Object.keys(map).length) chains[name.toLowerCase()] = map;
  }
  return chains;
}

function readdirSafe(dir) {
  try {
    return readdirSync(dir).filter(f => f.endsWith('.css'));
  } catch {
    return [];
  }
}

function splitTopLevel(expr) {
  const parts = [];
  let depth = 0, cur = '';
  for (const ch of expr) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts;
}

// ---------- literal census + parity candidates ----------

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const literalEntries = fsdsEntries.filter(e => e.kind === 'literal' && HEX.test(e.value));
const refEntries = fsdsEntries.filter(e => e.kind === 'ref');

function parityCandidates() {
  // Cross-implementation parity: compare the page-scope selectors only
  // (.retoken shared base, .spotify, .pinterest). Region-class overrides of
  // base slots are per-region styling, not cross-page parity questions.
  const PAGE_SCOPES = new Set(['.retoken', '.spotify', '.pinterest']);
  const out = [];
  const byProp = new Map();
  for (const e of fsdsEntries) {
    if (!PAGE_SCOPES.has(e.selector)) continue;
    if (!byProp.has(e.prop)) byProp.set(e.prop, []);
    byProp.get(e.prop).push(e);
  }
  for (const [prop, list] of byProp) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.media !== b.media) continue;
        if (resolveValue(a.value, 'spotify') !== resolveValue(b.value, 'spotify')) {
          out.push({ prop, base: a.selector, override: b.selector, baseValue: a.value, overrideValue: b.value });
        }
      }
    }
  }
  return out;
}

// ---------- contrast ----------

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function luminance([r, g, b]) {
  const a = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function contrast(fg, bg) {
  const l1 = luminance(hexToRgb(fg)), l2 = luminance(hexToRgb(bg));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// ---------- baseline + gate ----------

function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }

const baselinePath = path.join(root, BASELINE);

if (fallbacksMode) {
  const chains = designVarChains();
  const setProps = new Set(fsdsEntries.map(e => e.prop));
  for (const [comp, vars] of Object.entries(chains)) {
    for (const [varName, info] of Object.entries(vars)) {
      if (setProps.has(varName)) continue;
      console.log(`${comp}\t${varName}\tfallback=${info.fallback || '(none)'}\tterminal=${info.terminal}`);
    }
  }
  process.exit(0);
}

const inventory = fsdsEntries.map(e => ({
  key: e.key, selector: e.selector, media: e.media, prop: e.prop,
  value: e.value, kind: e.kind,
  resolved: e.kind === 'ref' ? resolveValue(e.value, e.selector.includes('spotify') ? 'spotify' : e.selector.includes('pinterest') ? 'pinterest' : 'spotify') : e.value,
}));

if (emit) {
  const skeleton = {
    _comment: 'Adjudication baseline for the retoken-page token scope. Regenerate skeletons with --emit; verdicts and ledgers are maintained by hand.',
    declarations: Object.fromEntries(inventory.map(e => [e.key, { verdict: 'TODO:load-bearing|dead-removed|dead-kept', note: '' }])),
    literals: Object.fromEntries(literalEntries.map(e => [e.value.toUpperCase(), { roles: [`${e.selector} ${e.prop}`], adjudication: 'TODO:page-token|ledgered', note: '' }])),
    parity: Object.fromEntries(parityCandidates().map(p => [`${p.prop} ${p.base}->${p.override}`, { decision: 'TODO' }])),
    fallbackLedger: {},
    contrastPairs: [],
  };
  console.log(JSON.stringify(skeleton, null, 2));
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
} catch (e) {
  console.error(`FAIL baseline unreadable: ${e.message}`); process.exit(1);
}

let errors = 0;
const VALID_VERDICTS = new Set(['load-bearing', 'state-conditioned', 'dead-kept']);
const baseDecls = baseline.declarations ?? {};
for (const entry of inventory) {
  const rec = baseDecls[entry.key];
  if (!rec) { fail(`inventory entry missing from baseline: ${entry.key}`); errors++; continue; }
  if (!VALID_VERDICTS.has(rec.verdict)) { fail(`invalid verdict "${rec.verdict}" for ${entry.key} (expected ${[...VALID_VERDICTS].join('|')})`); errors++; }
  else if (rec.verdict === 'dead-kept' && !(rec.note ?? '').trim()) { fail(`dead-kept declaration requires a reason note: ${entry.key}`); errors++; }
}
const invKeys = new Set(inventory.map(e => e.key));
for (const key of Object.keys(baseDecls)) {
  if (!invKeys.has(key)) { fail(`baseline declaration no longer in theme.css (stale): ${key}`); errors++; }
}
const removedDead = new Set(baseline.removedDead ?? []);
for (const key of removedDead) {
  if (invKeys.has(key)) { fail(`declaration previously audited dead has returned to theme.css: ${key}`); errors++; }
}

const litLedger = baseline.literals ?? {};
const VALID_LIT = new Set(['ledgered', 'page-token']);
for (const e of literalEntries) {
  const hex = e.value.toUpperCase();
  const rec = litLedger[hex];
  if (!rec) { fail(`unledgered literal ${hex} at ${e.selector} ${e.prop}`); errors++; continue; }
  if (!VALID_LIT.has(rec.adjudication)) { fail(`invalid adjudication "${rec.adjudication}" for literal ${hex} (expected ${[...VALID_LIT].join('|')})`); errors++; continue; }
  if (rec.adjudication === 'page-token') {
    // Must be referenced through a named page token: some declaration uses var(--retoken-*|--page-*)
    // whose definition carries this hex.
    const definedAsToken = Object.entries({ ...pageVars.base, ...pageVars.spotify, ...pageVars.pinterest })
      .some(([, v]) => v.toUpperCase() === hex);
    const usedViaToken = refEntries.some(r => {
      const resolved = resolveValue(r.value, r.selector.includes('pinterest') ? 'pinterest' : 'spotify');
      return resolved.toUpperCase().includes(hex);
    });
    if (!definedAsToken || !usedViaToken) { fail(`literal ${hex} marked page-token but is not defined+used via a page token`); errors++; }
  }
}

for (const [key, rec] of Object.entries(baseline.parity ?? {})) {
  if (!(rec.decision ?? '').trim()) { fail(`parity entry without a decision: ${key}`); errors++; }
}
for (const cand of parityCandidates()) {
  const key = `${cand.prop} ${cand.base}->${cand.override}`;
  if (!(key in (baseline.parity ?? {}))) { fail(`unexplained cross-scope value difference: ${key} (${cand.baseValue} -> ${cand.overrideValue})`); errors++; }
}

const setProps = new Set(fsdsEntries.map(e => e.prop));
const chains = designVarChains();
const ledger = baseline.fallbackLedger ?? {};
const SINGLE_HEX = /^#[0-9a-fA-F]{3,8}$/;
for (const [comp, vars] of Object.entries(chains)) {
  for (const [varName, info] of Object.entries(vars)) {
    if (setProps.has(varName)) continue;
    // Only single-hex terminals are color-ledger scope; multi-stop shadow
    // compositions are recorded as an explicit non-claim in the attempts doc.
    if (SINGLE_HEX.test(info.terminal) && !(varName in ledger)) {
      fail(`unset ${comp} var ${varName} falls back to literal ${info.terminal} and is not ledgered`); errors++;
    }
  }
}

function resolvePair(value, page) {
  if (/^--(page|retoken)-[a-z0-9-]+$/.test(value)) {
    return pageVars[page][value] ?? pageVars.base[value] ?? value;
  }
  return resolveValue(value, page);
}

for (const pair of baseline.contrastPairs ?? []) {
  const fg = resolvePair(pair.fg, pair.page ?? 'spotify');
  const bg = resolvePair(pair.bg, pair.page ?? 'spotify');
  if (!SINGLE_HEX.test(fg) || !SINGLE_HEX.test(bg)) { fail(`contrast pair ${pair.name} does not resolve to hex (${fg} on ${bg})`); errors++; continue; }
  const ratio = contrast(fg, bg);
  const min = pair.kind === 'ui' ? 3 : 4.5;
  if (ratio < min) { fail(`contrast ${pair.name}: ${fg} on ${bg} = ${ratio.toFixed(2)} < ${min}`); errors++; }
}

if (errors === 0) console.log(`audit:retoken-tokens OK — ${inventory.length} declarations, ${Object.keys(litLedger).length} literals, ${Object.keys(baseline.parity ?? {}).length} parity entries, ${(baseline.contrastPairs ?? []).length} contrast pairs, all adjudicated`);
process.exit(process.exitCode ?? 0);
