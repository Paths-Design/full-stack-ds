import { describe, expect, it } from 'vitest';
import { matchesTokenRole } from './token-role.js';

describe('native rest token role grammar', () => {
  it('selects neutral or explicit default-state paint without selecting other states', () => {
    expect(matchesTokenRole('avatar.color.background', '.color.background')).toBe(true);
    expect(matchesTokenRole('button.color.background.default', '.color.background')).toBe(true);
    expect(matchesTokenRole('button.color.background.hover', '.color.background')).toBe(false);
    expect(matchesTokenRole('avatar.color.background', '.color.background.default')).toBe(true);
    expect(matchesTokenRole('avatar.size.small', '.size')).toBe(false);
    expect(matchesTokenRole('avatar.size', '.size')).toBe(true);
  });
});
