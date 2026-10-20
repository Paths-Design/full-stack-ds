import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Execute the real audit against a minimal consumer fixture. These cases pin
// supplied-vs-unset classification, not runtime consumption or visual quality.
const root=mkdtempSync(path.join(os.tmpdir(),'fsds-retoken-audit-'));
const sheet='e2e/fixtures/retoken-pages/pinterest.css';
const baseline='e2e/fixtures/retoken-pages/token-audit-baseline.json';
const variable='--fsds-tooltip-design-content-foreground-color';
const write=(file,text)=>{mkdirSync(path.dirname(path.join(root,file)),{recursive:true});writeFileSync(path.join(root,file),text);};
const run=()=>spawnSync(process.execPath,['scripts/audit-retoken-tokens.mjs'],{cwd:root,encoding:'utf8'});
try {
  write('scripts/audit-retoken-tokens.mjs',readFileSync(new URL('./audit-retoken-tokens.mjs',import.meta.url),'utf8'));
  write('e2e/fixtures/retoken-pages/theme.css','');
  write('e2e/fixtures/retoken-pages/pages.tsx',"import { Tooltip } from '../../../packages/ds-react/src/components';");
  write('e2e/fixtures/retoken-pages/pinterest.tsx','');
  write('packages/ds-react/src/components/Tooltip/Tooltip.css',`.tooltip { color: var(${variable}, #fafafa); }`);
  write('packages/ds-tokens/generated/tokens.css','');
  write(baseline,JSON.stringify({declarations:{},fallbackLedger:{}}));
  write(sheet,`.pin-tooltip { ${variable}: #fff; }`);
  const supplied=run();
  assert.equal(supplied.status,0,supplied.stderr);
  assert.match(supplied.stdout,/all adjudicated/);

  write(sheet,'');
  const unset=run();
  assert.equal(unset.status,1,unset.stdout+unset.stderr);
  assert.match(unset.stderr,/unset tooltip var --fsds-tooltip-design-content-foreground-color falls back to literal #fafafa and is not ledgered/);

  write(baseline,JSON.stringify({declarations:{},fallbackLedger:{[variable]:{decision:'Inherited by intent in this test consumer'}}}));
  const inherited=run();
  assert.equal(inherited.status,0,inherited.stderr);
  rmSync(path.join(root,sheet));
  const missing=run();
  assert.notEqual(missing.status,0);
  assert.match(missing.stderr,/ENOENT/);
  console.log('retoken token audit selftest: supplied, unset, ledgered and missing-sheet cases passed');
} finally {
  rmSync(root,{recursive:true,force:true});
}
