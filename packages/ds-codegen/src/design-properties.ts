/** Closed common design vocabulary. CSS is a realization mapping, not an open property bag. */
import type { ComponentContract } from './contract.js';
import { tokenSlug } from './token-path.js';

export type DesignValueType = 'color' | 'dimension' | 'number' | 'fontFamily' | 'shadow' | 'duration' | 'easing' | 'enum' | 'ratio' | 'position';
export interface DesignPropertyDefinition {
  property: string;
  group: string;
  valueType: DesignValueType;
}
const definitions: Record<string, DesignPropertyDefinition> = {};
function define(group: string, valueType: DesignValueType, properties: Record<string, string>) {
  for (const [css, name] of Object.entries(properties)) {
    definitions[css] = { property: `${group}.${name}`, group, valueType };
  }
}
define('background', 'color', { 'background-color': 'fill' });
define('foreground', 'color', { color: 'color', fill: 'fill', stroke: 'stroke' });
define('border', 'color', { 'border-color': 'color', 'border-top-color': 'top.color', 'border-bottom-color': 'bottom.color', 'border-inline-start-color': 'inline-start.color', 'border-inline-end-color': 'inline-end.color', 'border-block-start-color': 'block-start.color', 'border-block-end-color': 'block-end.color' });
define('border', 'dimension', { 'border-width': 'width', 'border-top-width': 'top.width', 'border-bottom-width': 'bottom.width', 'border-inline-start-width': 'inline-start.width', 'border-inline-end-width': 'inline-end.width', 'border-block-start-width': 'block-start.width', 'border-block-end-width': 'block-end.width' });
define('border', 'enum', { 'border-style': 'style', 'border-top-style': 'top.style', 'border-bottom-style': 'bottom.style' });
define('shape', 'dimension', { 'border-radius': 'radius', 'border-start-start-radius': 'start-start.radius', 'border-start-end-radius': 'start-end.radius', 'border-end-start-radius': 'end-start.radius', 'border-end-end-radius': 'end-end.radius' });
define('typography', 'dimension', { 'font-size': 'size', 'letter-spacing': 'tracking', 'line-height': 'line-height' });
define('typography', 'number', { 'font-weight': 'weight' });
define('typography', 'fontFamily', { 'font-family': 'family' });
define('typography', 'enum', { 'text-align': 'alignment', 'font-style': 'style' });
define('elevation', 'shadow', { 'box-shadow': 'shadow', 'text-shadow': 'text-shadow' });
define('appearance', 'number', { opacity: 'opacity' });
define('motion', 'duration', { 'transition-duration': 'duration', 'transition-delay': 'delay', 'animation-duration': 'animation-duration', 'animation-delay': 'animation-delay' });
define('motion', 'easing', { 'transition-timing-function': 'easing', 'animation-timing-function': 'animation-easing' });
define('focus', 'color', { 'outline-color': 'color' });
define('focus', 'dimension', { 'outline-width': 'width', 'outline-offset': 'offset' });
define('focus', 'enum', { 'outline-style': 'style' });
define('spacing', 'dimension', Object.fromEntries(['padding','padding-block','padding-inline','padding-block-start','padding-block-end','padding-inline-start','padding-inline-end','gap','row-gap','column-gap'].map(p=>[p,p])));
define('sizing', 'dimension', Object.fromEntries(['width','height','min-width','max-width','min-height','max-height'].map(p=>[p,p])));
// Replaced-media decisions exposed by the page-attempt witnesses. These remain
// Web DOM realization controls; native media semantics are not inferred here.
define('sizing', 'ratio', { 'aspect-ratio': 'aspect-ratio' });
define('media', 'enum', { 'object-fit': 'fit' });
define('media', 'position', { 'object-position': 'position' });
// Layout is opt-in. Migration must not turn structural invariants into theme controls.
define('layout', 'enum', { 'flex-direction': 'direction', 'align-items': 'alignment', 'justify-content': 'distribution', 'flex-wrap': 'wrap', overflow: 'overflow' });
export const DESIGN_PROPERTIES: Readonly<Record<string, DesignPropertyDefinition>> = Object.freeze(definitions);

/** Common paint decisions are editable; intrinsic geometry and layout stay opt-in. */
export function requiresDesignBinding(cssProperty: string, entry: { resolvesTo?: string; platforms?: string[] }): boolean {
  const definition = DESIGN_PROPERTIES[cssProperty];
  return !!definition && definition.group !== 'layout'
    && (definition.group !== 'sizing' || !!entry.resolvesTo)
    && (!entry.platforms || entry.platforms.includes('web'));
}

export function missingDesignBindings(contract: Pick<ComponentContract, 'styles'>): string[] {
  return Object.entries(contract.styles ?? {}).flatMap(([selector, block]) =>
    Object.entries(block).filter(([property, entry]) => requiresDesignBinding(property, entry) && !entry.design)
      .map(([property]) => `/styles/${selector}/${property}`));
}

export interface DesignBindingIR extends DesignPropertyDefinition {
  slot: string;
  cssVar: string;
  cssProperty: string;
  selectorKey: string;
  /** Expanded and suppression-guarded by the component IR. */
  selector?: string;
  /** Null for a complex selector: no guessed anatomy or state identity. */
  part: string | null;
  defaultValue: string;
  resolvesTo?: string;
  /** Editable CSS bindings; native targets keep their existing default realization. */
  editableTargets: readonly ['web'];
}

export function buildDesignBindings(contract: Pick<ComponentContract, 'name' | 'styles' | 'anatomy'>): DesignBindingIR[] {
  const prefix = contract.name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();
  const parts = Array.isArray(contract.anatomy) ? contract.anatomy : contract.anatomy?.parts ?? [];
  const slots = new Set<string>();
  const bindings: DesignBindingIR[] = [];
  for (const [selectorKey, block] of Object.entries(contract.styles ?? {})) {
    for (const [cssProperty, entry] of Object.entries(block)) {
      if (!entry.design) continue;
      const definition = DESIGN_PROPERTIES[cssProperty];
      if (!definition || definition.property !== entry.design.property) {
        throw new Error(`Design property ${entry.design.property} does not bind ${cssProperty}; expected ${definition?.property ?? 'a registered property'}`);
      }
      if (entry.platforms && !entry.platforms.includes('web')) throw new Error('Design overrides currently require a web consumer');
      const { slot } = entry.design;
      if (!slot.startsWith(`${prefix}.design.`) || !/^[a-z][a-z0-9.-]*$/.test(slot)) throw new Error(`Design slot ${slot} must use the ${prefix}.design namespace`);
      if (slots.has(slot)) throw new Error(`Duplicate design slot ${slot}: independently addressed consumers require distinct slots`);
      slots.add(slot);
      const defaultValue = entry.literal ?? entry.fallback;
      if (defaultValue === undefined || defaultValue.trim() === '') throw new Error(`Design property ${slot} requires a literal or fallback`);
      const part = selectorKey === 'root' ? 'root' : parts.includes(selectorKey) ? selectorKey : null;
      bindings.push({ ...definition, slot, cssVar: `--${tokenSlug(slot)}`, cssProperty, selectorKey, part, defaultValue, ...(entry.resolvesTo ? { resolvesTo: entry.resolvesTo } : {}), editableTargets: ['web'] });
    }
  }
  return bindings;
}
