import { describe, expect, it } from 'vitest';
import type { ComponentContract } from '../contract.js';
import { validateComponentDesignPolicy } from './component-design-policy.js';

describe('component design semantic policy', () => {
  it('rejects missing bindings and base slots incorrectly named as state defaults', () => {
    const contract: ComponentContract = { name: 'Example', tokens: { 'example.size.default': { literal: '8px' } },
      styles: { root: { color: { literal: '#123456' } } } };
    expect(validateComponentDesignPolicy(contract)).toEqual([
      { pointer: '/styles/root/color', message: '[DESIGN_BINDING_MISSING] Common Web design decision needs an independent property binding.' },
      { pointer: '/tokens/example.size.default', message: '[COMPONENT_TOKEN_NAME] example.size.default has no state sibling; use example.size.' },
    ]);
    contract.tokens = { 'example.size': { literal: '8px' } };
    contract.styles!.root.color.design = { property: 'foreground.color', slot: 'example.design.root.foreground.color' };
    expect(validateComponentDesignPolicy(contract)).toEqual([]);
  });
});
