/** Component token consumption gate. No debt ledger, reseed mode, or exceptions.
 * Source obligations must have a consumer; emitted declarations must lead to a
 * property read. Semantic vocabulary is outside this component-scoped gate. */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listComponentContracts } from '../../packages/ds-codegen/dist/contracts-fs.js';
import { mergeBoxModelDefaults } from '../../packages/ds-codegen/dist/box-model.js';
import { analyzeCssTokenConsumption } from '../../packages/ds-codegen/dist/css-token-consumption.js';
import { inspectComponentTokenConsumption, validateComponentTokenConsumption } from '../../packages/ds-codegen/dist/validation/component-token-consumption.js';

import { nativeSlotArguments, nativeTokenScopes, nativeTokenDefinitionNames, composeTokenReads, consumedComposeTokenScopes, composeTokenDefinitions } from '../../packages/ds-codegen/dist/frameworks/native-token-consumption.js';
import { reactNativeTokenReads, consumedNativeTokenScopes, reactNativeTokenDefinitionNames } from '../../packages/ds-codegen/dist/frameworks/react-native/token-consumption.js';
import { loadTargetRegistryConfigV1 } from '../../packages/ds-codegen/dist/target-packs/config.js';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WEB = ['react', 'vue', 'svelte', 'angular', 'lit'];
const json = path => JSON.parse(readFileSync(path, 'utf8'));

/** Roots come from real properties, so unused alias chains cannot self-credit. */
export function auditWebArtifact(slots, sheets) {
  const graph = analyzeCssTokenConsumption(sheets);
  return [
    ...slots.filter(slot => slot.web && !graph.consumed.has(slot.cssVar))
      .map(slot => `Missing property consumer: ${slot.slot}`),
    ...[...graph.declarations.keys()].filter(name => !graph.consumed.has(name))
      .map(name => `Unconsumed emitted declaration: ${name}`),
    ...graph.cycles.map(cycle => `Cyclic declaration: ${cycle.join(' -> ')}`),
  ];
}

/** Native dictionaries contain exactly the names reached by emitted lookups. */
export function auditNativeDefinitions(scopes, emitted) {
  const expected = new Set(scopes.flatMap(scope => scope.values.map(value => value.name)));
  return [
    ...[...emitted].filter(name => !expected.has(name)).map(name => `Unconsumed emitted declaration: ${name}`),
    ...[...expected].filter(name => !emitted.has(name)).map(name => `Missing consumed definition: ${name}`),
  ];
}

/** State identity matters for direct Compose lookups. */
export function auditComposeDefinitions(scopes, emitted) {
  const expected = new Set(scopes.flatMap(scope => scope.values.map(value => `${scope.scope}/${value.name}`)));
  const actual = new Set(emitted.map(value => `${value.scope}/${value.key}`));
  return [
    ...[...actual].filter(key => !expected.has(key)).map(key => `Unconsumed emitted declaration: ${key}`),
    ...[...expected].filter(key => !actual.has(key)).map(key => `Missing consumed definition: ${key}`),
  ];
}

/** An unresolved read must not disappear when definitions are projected. */
export function auditNativeReads(reads, definitions, suffixes = false) {
  return [...reads].filter(read => ![...definitions].some(name =>
    name === read || (suffixes && name.endsWith(`.${read}`))))
    .map(read => `Missing definition for native read: ${read}`);
}

export function auditComposeReads(reads, definitions) {
  return reads.filter(read => !definitions.some(definition => definition.key === read.name &&
    (read.scope === undefined || read.scope === definition.scope)))
    .map(read => `Missing definition for native read: ${read.scope ?? '*'}/${read.name}`);
}

export function auditCorpus() {
  const entries = listComponentContracts(resolve(REPO, 'packages/ds-contracts'));
  if (!entries.length) throw new Error('Component corpus is missing or empty');
  return entries.map(entry => {
    const contract = json(entry.absPath);
    for (const side of ['tokens', 'styles']) {
      const path = entry.absPath.replace('.contract.json', `.${side}.json`);
      if (existsSync(path)) contract[side] = json(path);
    }
    contract.tokens = mergeBoxModelDefaults(contract.tokens, undefined, contract.morphology);
    const { slots, ir } = inspectComponentTokenConsumption(contract, REPO);
    const issues = validateComponentTokenConsumption(contract, REPO).map(issue => issue.message);
    for (const target of WEB) {
      const base = resolve(REPO, `packages/ds-${target}/src`);
      // readFileSync intentionally fails when an expected artifact is absent.
      const sheets = ['css', 'tokens.css'].map(ext => readFileSync(`${base}/components/${entry.name}/${entry.name}.${ext}`, 'utf8'));
      if (sheets.some(sheet => sheet.includes('@import "../../primitives/box-model.css"'))) {
        sheets.push(readFileSync(`${base}/primitives/box-model.css`, 'utf8'));
      }
      issues.push(...auditWebArtifact(slots, sheets).map(issue => `${target}: ${issue}`));
    }
    const read = path => readFileSync(resolve(REPO, path), 'utf8');
    const rn = `packages/ds-react-native/src/components/${entry.name}/${entry.name}`;
    const actualRn = reactNativeTokenReads([read(`${rn}.tsx`), read(`${rn}.styles.ts`)]);
    issues.push(...auditNativeReads(actualRn.map(read => read.name), reactNativeTokenDefinitionNames(read(`${rn}.tokens.ts`))).map(issue => `react-native: ${issue}`));
    issues.push(...auditNativeDefinitions(consumedNativeTokenScopes(ir, actualRn), reactNativeTokenDefinitionNames(read(`${rn}.tokens.ts`))).map(issue => `react-native: ${issue}`));
    for (const target of loadTargetRegistryConfigV1(REPO).config.targets) {
      if (target.components && !target.components.includes(entry.name)) continue;
      if (target.id === 'swiftui') {
        const source = read(`packages/ds-swiftui/Sources/DsSwiftUI/Components/${entry.name}/${entry.name}.swift`);
        issues.push(...auditNativeReads(nativeSlotArguments(source, ['colorSlot', 'pxSlot']), nativeTokenDefinitionNames(source), true).map(issue => `swiftui: ${issue}`));
        issues.push(...auditNativeDefinitions(nativeTokenScopes(ir, nativeSlotArguments(source, ['colorSlot', 'pxSlot']), true), nativeTokenDefinitionNames(source)).map(issue => `swiftui: ${issue}`));
      }
      if (target.id === 'jetpack-compose') {
        const base = `packages/ds-jetpack-compose/library/src/main/kotlin/com/fullstackds/components/${entry.name}/${entry.name}`;
        issues.push(...auditComposeReads(composeTokenReads(read(`${base}.kt`)), composeTokenDefinitions(read(`${base}Tokens.kt`))).map(issue => `jetpack-compose: ${issue}`));
        issues.push(...auditComposeDefinitions(consumedComposeTokenScopes(ir, composeTokenReads(read(`${base}.kt`))), composeTokenDefinitions(read(`${base}Tokens.kt`))).map(issue => `jetpack-compose: ${issue}`));
      }
    }
    return { component: entry.name, slots: slots.length,
      nativeOrBehaviorOnly: slots.filter(slot => !slot.web && (slot.native || slot.behavior)).map(slot => slot.slot), issues };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length > 2) throw new Error('This gate takes no arguments. Unused component tokens must be removed or bound.');
  const rows = auditCorpus();
  const failures = rows.flatMap(row => row.issues.map(issue => `${row.component}: ${issue}`));
  const output = resolve(REPO, 'tmp/component-token-consumption');
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'audit.json'), JSON.stringify(rows, null, 2) + '\n');
  failures.forEach(failure => console.error(failure));
  console.log(`[component-token-consumption] ${rows.length} components, ${WEB.length} web outputs each plus registered native dictionaries, ${failures.length} failures; no allowance ledger.`);
  process.exitCode = failures.length ? 1 : 0;
}
