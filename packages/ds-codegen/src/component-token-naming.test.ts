import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { componentTokenRenames } from './component-token-naming.js';
import { listComponentContracts } from './contracts-fs.js';

describe('component token state and variant naming', () => {
  it('reserves default for a declared state sibling family, not size variants or mutable base slots', () => {
    const literal = { literal: '8px' };
    expect(componentTokenRenames({ tokens: {
      'example.size.default': literal, 'example.size.small': literal,
      'example.color.background.default': literal, 'example.color.background.hover': literal,
      'example.color.border.default': literal, 'example.color.border.selected': literal,
      'example.gap.default': literal,
    } })).toEqual({ 'example.size.default': 'example.size', 'example.gap.default': 'example.gap' });
  });
  it('refuses to overwrite an existing neutral address during migration', () => {
    expect(() => componentTokenRenames({ tokens: { 'example.size.default': { literal: '8px' }, 'example.size': { literal: '12px' } } })).toThrow('Token rename collision');
  });
  it('keeps the public corpus normalized without compatibility declarations', () => {
    const corpus = listComponentContracts(resolve(__dirname, '../../ds-contracts'));
    expect(corpus.length).toBeGreaterThan(0);
    const pending = corpus.flatMap(entry => {
      const contract = JSON.parse(readFileSync(entry.absPath, 'utf8'));
      const sidecar = entry.absPath.replace('.contract.json', '.tokens.json');
      // Token sidecars are optional; contracts without declarations still participate.
      contract.tokens = existsSync(sidecar) ? JSON.parse(readFileSync(sidecar, 'utf8')) : contract.tokens;
      return Object.keys(componentTokenRenames(contract));
    });
    expect(pending).toEqual([]);
  });
});
