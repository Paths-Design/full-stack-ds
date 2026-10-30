import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildComponentIR } from './ir.js';
import { loadBoxModelPrimitive, mergeBoxModelDefaults } from './box-model.js';
import type { ComponentContract } from './contract.js';
const root = path.resolve(__dirname, '../../..');
function fixture(name: string): ComponentContract {
 const directory = path.join(root, 'packages/ds-contracts/components', name);
 const contract = JSON.parse(fs.readFileSync(path.join(directory, `${name}.contract.json`), 'utf8'));
 for (const sidecar of ['tokens', 'styles']) contract[sidecar] = JSON.parse(fs.readFileSync(path.join(directory, `${name}.${sidecar}.json`), 'utf8'));
 contract.tokens = mergeBoxModelDefaults(contract.tokens, loadBoxModelPrimitive(path.join(root, 'packages/ds-contracts')), contract.morphology);
 return contract;
}
describe('typed native style rules', () => {
 it('preserves checked and size predicates together and targets the destination part', () => {
  const facts = buildComponentIR(fixture('Switch')).nativeStyleRules!;
  const on = facts.rules.find(rule => rule.sourceKey === '.switch--sm:has(.switch__input:checked) .switch__thumb')!;
  expect(on.part).toBe('thumb');
  expect(on.predicates).toEqual([{kind:'checked',value:true,ownerPart:'input'},{kind:'variant',axis:'size',value:'sm'}]);
  expect(on.declarations).toContainEqual({property:'translate',value:'16px',token:'switch.size.sm.thumb.translate.on'});
  expect(facts.rules.find(rule => rule.sourceKey === '.switch:has(.switch__input:checked) .switch__track')!.declarations)
   .toContainEqual({property:'switch.color.track.background',value:'#d92d2e',token:'semantic.color.foreground.accent'});
 });
 it('keeps pseudo anatomy separate and mixed after checked in source order', () => {
  const marks = buildComponentIR(fixture('Checkbox')).nativeStyleRules!.rules.filter(rule => rule.part === 'indicator' && rule.pseudo === 'after');
  expect(marks).toHaveLength(3);
  expect(marks[1]!.predicates).toEqual([{kind:'checked',value:true,ownerPart:'input'}]);
  expect(marks[2]!.predicates).toEqual([{kind:'indeterminate',value:true,ownerPart:'input'}]);
  expect(marks[2]!.declarations).toContainEqual({property:'width',value:'8px',platforms:['web']});
 });
 it('carries structural box consumers', () => {
  const rules = buildComponentIR(fixture('Switch')).nativeStyleRules!.rules;
  expect(rules[1]!.declarations).toContainEqual({property:'padding-inline-start',value:'8px',token:'box-model.padding-inline-start'});
  expect(rules.find(rule => rule.sourceKey==='--sm')!.declarations).toContainEqual({property:'box-model.min-height',value:'24px',token:'semantic.action.size.small.min-height'});
 });
 it('normalizes the styles.json `--<modifier> __<part>` shorthand to the modifier ancestor of the part', () => {
  const facts = buildComponentIR(fixture('Tabs')).nativeStyleRules!;
  const list = facts.rules.find(rule => rule.sourceKey === '--underline __list')!;
  expect(list.part).toBe('list');
  expect(list.predicates).toEqual([{kind:'variant',axis:'appearance',value:'underline'}]);
  expect(list.declarations).toContainEqual({property:'border-bottom-color',value:'#d92d2e',token:'tabs.color.underline.active',designSlot:'tabs.design.condition-eb5f7091f8d8.border.bottom.color'});
  expect(facts.rules.find(rule => rule.sourceKey === '--vertical __indicator')).toMatchObject({part:'indicator',predicates:[{kind:'variant',axis:'orientation',value:'vertical'}]});
  expect(facts.rules.find(rule => rule.sourceKey === '--pills __tab')).toMatchObject({part:'tab',predicates:[{kind:'variant',axis:'appearance',value:'pills'}]});
  // A web-template state class on the part is not a contract state fact and stays refused.
  expect(facts.unsupported.map(u => u.sourceKey).sort()).toEqual(['--pills __tab--active', 'tab--active']);
 });
 it('retains visible content and its descendant as presence predicates', () => {
  const facts = buildComponentIR(fixture('Accordion')).nativeStyleRules!;
  expect(facts.rules.find(rule => rule.sourceKey === '.accordion__content:not([hidden])')).toMatchObject({
   part: 'content', predicates: [{kind:'present',ownerPart:'content'}],
  });
  expect(facts.rules.find(rule => rule.sourceKey === '.accordion__content:not([hidden]) .accordion__contentInner')).toMatchObject({
   part: 'contentInner', predicates: [{kind:'present',ownerPart:'content'}],
  });
 });
 it('normalizes a bare `__<part>` key to the part and leaves unknown parts refused', () => {
  const contract = fixture('Tabs');
  contract.styles!['__panel'] = {'opacity':{literal:'0.5',platforms:['web']}};
  contract.styles!['--vertical __missing'] = {'opacity':{literal:'0',platforms:['web']}};
  const facts = buildComponentIR(contract).nativeStyleRules!;
  expect(facts.rules.find(rule => rule.sourceKey === '__panel')).toEqual({sourceKey:'__panel',part:'panel',predicates:[],declarations:[{property:'opacity',value:'0.5',platforms:['web']}]});
  expect(facts.unsupported).toContainEqual({sourceKey:'--vertical __missing',reason:'selector outside normalized native grammar'});
 });
 it('retains unknown selectors as diagnostics instead of guessing unconditional style', () => {
  const contract = fixture('Switch'); contract.styles!['.switch > .other:future'] = {'opacity':{literal:'0',platforms:['web']}};
  const facts = buildComponentIR(contract).nativeStyleRules!;
  expect(facts.unsupported).toContainEqual({sourceKey:'.switch > .other:future',reason:'selector outside normalized native grammar'});
  expect(facts.rules.some(rule => rule.sourceKey.includes('future'))).toBe(false);
 });
 it('normalizes native host keyboard policy independently of component identity', () => {
  for (const name of ['Switch','Checkbox']) expect(buildComponentIR(fixture(name)).formControl!.activationKeys).toEqual(['Space']);
  expect(buildComponentIR(fixture('ToggleSwitch')).formControl!.activationKeys).toEqual(['Space','Enter']);
 });
});
