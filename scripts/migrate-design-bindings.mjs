/** Deterministic adoption of the common visual vocabulary; values and selectors stay unchanged. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DESIGN_PROPERTIES, buildDesignBindings, requiresDesignBinding } from '../packages/ds-codegen/dist/design-properties.js';
import { listComponentContracts, findComponentStyles } from '../packages/ds-codegen/dist/contracts-fs.js';
const write = process.argv.includes('--write');
const report = [];
for (const discovered of listComponentContracts(path.resolve('packages/ds-contracts'))) {
  const styleFile = findComponentStyles(discovered);
  if (!styleFile) continue;
  const contract = JSON.parse(fs.readFileSync(discovered.absPath, 'utf8'));
  const styles = JSON.parse(fs.readFileSync(styleFile.absPath, 'utf8'));
  const prefix = contract.name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();
  let added = 0;
  for (const [selector, block] of Object.entries(styles)) {
    for (const [property, entry] of Object.entries(block)) {
      const definition = DESIGN_PROPERTIES[property];
      // Structural layout is opt-in. Intrinsic sizing literals stay fixed;
      // already token-backed sizing is an existing authored design choice.
      if (!requiresDesignBinding(property, entry) || entry.design) continue;
      if (entry.literal === undefined && entry.fallback === undefined) throw new Error(`${contract.name}/${selector}/${property}: missing fallback`);
      const scope = /^[a-zA-Z][a-zA-Z0-9]*$/.test(selector)
        ? selector.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
        : `condition-${createHash('sha256').update(selector).digest('hex').slice(0,12)}`;
      entry.design = { property: definition.property, slot: `${prefix}.design.${scope}.${definition.property}` };
      added++;
    }
  }
  const bindings = buildDesignBindings({ ...contract, styles });
  report.push({component: contract.name, added, bindings: bindings.length});
  if (write && added) fs.writeFileSync(styleFile.absPath, `${JSON.stringify(styles,null,2)}\n`);
}
console.log(JSON.stringify({mode:write?'write':'check',components:report, added:report.reduce((n,c)=>n+c.added,0),bindings:report.reduce((n,c)=>n+c.bindings,0)},null,2));
if (!write && report.some(c=>c.added)) process.exitCode=1;
