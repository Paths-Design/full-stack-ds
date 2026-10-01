import type { ComponentContract } from './contract.js';
import { normalizeStates } from './contract.js';

/** CSS states supplement contract state channels; variant names never imply state. */
const cssStates = ['hover', 'active', 'focus', 'focus-visible', 'disabled', 'visited', 'checked', 'indeterminate', 'selected', 'pressed', 'invalid', 'valid', 'loading', 'readonly', 'validating', 'dragged', 'open', 'closed', 'expanded', 'collapsed'];

export function componentTokenRenames(contract: Pick<ComponentContract, 'tokens' | 'states'>): Record<string, string> {
  const tokens = contract.tokens ?? {};
  const states = new Set([...cssStates, ...normalizeStates(contract.states).flat]);
  const renames: Record<string, string> = {};
  for (const slot of Object.keys(tokens)) {
    if (!slot.endsWith('.default')) continue;
    const base = slot.slice(0, -'.default'.length);
    const hasStateSibling = Object.keys(tokens).some(other => other.startsWith(`${base}.`) && states.has(other.slice(base.length + 1)));
    if (hasStateSibling) continue;
    if (tokens[base]) throw new Error(`Token rename collision: ${slot} and ${base}`);
    renames[slot] = base;
  }
  return renames;
}
