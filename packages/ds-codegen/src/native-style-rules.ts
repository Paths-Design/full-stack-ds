/** Source-bearing style facts: native emitters never parse generated CSS.
 * Each backend explicitly admits its property/selector subset. */
import type { ComponentContract, StyleEntry } from './contract.js';
import type { ClassRecipeIR } from './ir.js';
import { resolveStyleProfile } from './box-model.js';
export type NativeStylePredicateIR =
 | { kind: 'variant'; axis: string; value: string }
 | { kind: 'checked' | 'disabled' | 'indeterminate'; value: boolean; ownerPart?: string }
 | { kind: 'hover' | 'active' | 'focus'; ownerPart?: string };
export interface NativeStyleDeclarationIR { property: string; value: string; token?: string; designSlot?: string; platforms?: readonly string[] }
export interface NativeStyleRuleIR { sourceKey: string; part: string; pseudo?: 'before' | 'after'; predicates: NativeStylePredicateIR[]; declarations: NativeStyleDeclarationIR[] }
export interface NativeStyleRulesIR { rules: NativeStyleRuleIR[]; unsupported: Array<{ sourceKey: string; reason: string }> }
function declaration(property: string, entry: StyleEntry): NativeStyleDeclarationIR | undefined {
 const value = entry.literal ?? entry.fallback;
 return value === undefined ? undefined : { property, value, ...(entry.resolvesTo ? { token: entry.resolvesTo } : {}), ...(entry.design?.slot ? { designSlot: entry.design.slot } : {}), ...(entry.platforms ? { platforms: entry.platforms } : {}) };
}
/** Closed selector grammar: unknown selectors retain an explicit diagnostic. */
function selectorPlan(key: string, prefix: string, parts: string[], recipe: ClassRecipeIR, variants: Record<string, string[]>): Omit<NativeStyleRuleIR, 'declarations' | 'sourceKey'> | undefined {
 if (key === 'root') return { part: 'root', predicates: [] };
 if (parts.includes(key)) return { part: key, predicates: [] };
 const predicates: NativeStylePredicateIR[] = [];
 let selector = key;
 if (['hover', 'active', 'focus', 'disabled'].includes(key)) selector = `.${prefix}:${key}`;
 if (key.startsWith('--') || key.startsWith('[')) selector = `.${prefix}${key}`;
 const stem = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 let invalid = false;
 selector = selector.replace(new RegExp(`:has\\(\\.${stem}__([A-Za-z0-9_-]+):(checked|disabled|indeterminate|focus-visible)\\)`, 'g'), (_all, part: string, state: string) => {
  if (!parts.includes(part)) invalid = true;
  predicates.push(state === 'focus-visible' ? { kind: 'focus', ownerPart: part } : { kind: state as 'checked' | 'disabled' | 'indeterminate', value: true, ownerPart: part }); return '';
 });
 let pseudo: 'before' | 'after' | undefined;
 selector = selector.replace(/::(before|after)$/, (_all, value: 'before' | 'after') => { pseudo = value; return ''; });
 selector = selector.replace(/\[aria-checked=["']?(true|false)["']?\]/g, (_all, value: string) => { predicates.push({ kind: 'checked', value: value === 'true' }); return ''; });
 selector = selector.replace(/:(hover|active|focus-visible|focus|disabled|checked|indeterminate)\b/g, (_all, state: string, offset: number) => {
  const ownerPart = new RegExp(`\\.${stem}__([A-Za-z0-9_-]+)$`).exec(selector.slice(0, offset))?.[1] ?? 'root';
  if (['hover', 'active', 'focus', 'focus-visible'].includes(state)) predicates.push({ kind: state.startsWith('focus') ? 'focus' : state as 'hover' | 'active', ownerPart });
  else predicates.push({ kind: state as 'checked' | 'disabled' | 'indeterminate', value: true, ownerPart }); return '';
 });
 selector = selector.replace(new RegExp(`\\.${stem}--([A-Za-z0-9_-]+)`, 'g'), (_all, suffix: string) => {
  const candidates = recipe.valueModifiers.flatMap(axis => (variants[axis.propName] ?? []).filter(value => `${axis.valuePrefix ?? ''}${value}` === suffix).map(value => ({ axis: axis.propName, value })));
  const boolean = recipe.booleanModifiers.find(axis => axis.propName === suffix);
  if (candidates.length === 1) predicates.push({ kind: 'variant', ...candidates[0]! });
  else if (boolean) predicates.push({ kind: 'variant', axis: boolean.propName, value: 'true' }); else invalid = true;
  return `.${prefix}`;
 });
 if (invalid || /[:[>,]/.test(selector)) return undefined;
 const nodes = selector.trim().split(/\s+/);
 if (nodes.length > 2 || nodes.some((node, i) => i < nodes.length - 1 && node !== `.${prefix}`)) return undefined;
 const target = nodes.at(-1);
 let part: string;
 if (target === `.${prefix}`) part = 'root';
 else if (target?.startsWith(`.${prefix}__`) && parts.includes(target.slice(prefix.length + 3))) part = target.slice(prefix.length + 3);
 else return undefined;
 return { part, predicates, ...(pseudo ? { pseudo } : {}) };
}
export function buildNativeStyleRules(contract: ComponentContract, prefix: string, recipe: ClassRecipeIR): NativeStyleRulesIR {
 const parts = Array.isArray(contract.anatomy) ? contract.anatomy : contract.anatomy?.parts ?? ['root'];
 const rules: NativeStyleRuleIR[] = [];
 const unsupported: NativeStyleRulesIR['unsupported'] = [];
 const tokens = { ...resolveStyleProfile(contract.morphology)?.boxModelDefaults, ...contract.tokens };
 const declarations = Object.entries(tokens).flatMap(([property, entry]) => { const fact = declaration(property, entry); return fact ? [fact] : []; });
 rules.push({ sourceKey: 'tokens', part: 'root', predicates: [], declarations });
 const box = Object.keys(tokens).filter(name => name.startsWith('box-model.')).flatMap(name => {
  const property = name.slice('box-model.'.length), entry = tokens[name]!, value = entry.literal ?? entry.fallback;
  return !value || ['none', 'auto'].includes(value) ? [] : [{ property, value, token: name }];
 });
 const structure = Object.entries(resolveStyleProfile(contract.morphology)?.structure ?? {}).map(([property, value]) => ({ property, value }));
 rules.push({ sourceKey: 'structure', part: 'root', predicates: [], declarations: [...box, ...structure] });
 for (const [sourceKey, block] of Object.entries(contract.styles ?? {})) {
  const plan = selectorPlan(sourceKey, prefix, parts, recipe, contract.variants ?? {});
  if (!plan) { unsupported.push({ sourceKey, reason: 'selector outside normalized native grammar' }); continue; }
  const declarations = Object.entries(block).flatMap(([property, entry]) => { const fact = declaration(property, entry); return fact ? [fact] : []; });
  rules.push({ sourceKey, ...plan, declarations });
 }
 return { rules, unsupported };
}
