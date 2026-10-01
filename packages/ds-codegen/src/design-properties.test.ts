import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ComponentContract } from './contract.js';
import { buildComponentIR, computeCssBlocks } from './ir.js';
import { emitCss, emitTokensCss } from './css.js';
import { buildDesignBindings, missingDesignBindings } from './design-properties.js';
import { listComponentContracts } from './contracts-fs.js';

function card(): ComponentContract {
  const dir = resolve(__dirname, '../../ds-contracts/components/Card');
  const contract = JSON.parse(readFileSync(`${dir}/Card.contract.json`, 'utf8'));
  contract.tokens = JSON.parse(readFileSync(`${dir}/Card.tokens.json`, 'utf8'));
  contract.styles = { root: { 'border-width': { literal: '1px', platforms: ['web'], design: { property: 'border.width', slot: 'card.design.root.border.width' } } } };
  return contract;
}

describe('component design property bindings', () => {
  it('requires common paint bindings while leaving intrinsic sizing, layout and native-only styling opt-in', () => {
    const styles: ComponentContract['styles'] = { root: {
      color: { literal: '#123456' },
      width: { literal: '100%' },
      height: { resolvesTo: 'semantic.glyph.size.small.extent', fallback: '12px' },
      'flex-direction': { literal: 'column' },
      'font-size': { literal: '14px', platforms: ['ios'] },
      gap: { literal: '8px', design: { property: 'spacing.gap', slot: 'test.design.root.spacing.gap' } },
    } };
    expect(missingDesignBindings({ styles })).toEqual(['/styles/root/color', '/styles/root/height']);
  });
  it('keeps common design binding coverage complete throughout the authored corpus', () => {
    const corpus = listComponentContracts(resolve(__dirname, '../../ds-contracts'));
    expect(corpus.length).toBeGreaterThan(0);
    const missing = corpus.flatMap(entry => {
      const styles = JSON.parse(readFileSync(entry.absPath.replace('.contract.json', '.styles.json'), 'utf8'));
      return missingDesignBindings({ styles }).map(pointer => `${entry.name}${pointer}`);
    });
    expect(missing).toEqual([]);
  });
  it('keeps an override unset while rendering the authored fallback and publishing its consumer', () => {
    const ir = buildComponentIR(card());
    expect(ir.designBindings[0]).toMatchObject({ property: 'border.width', slot: 'card.design.root.border.width', selectorKey: 'root', valueType: 'dimension', defaultValue: '1px' });
    expect(emitCss(ir)).toContain('border-width: var(--fsds-card-design-root-border-width, 1px)');
    expect(emitTokensCss(ir)).not.toContain('--fsds-card-design-root-border-width:');
  });
  it('retains semantic and literal fallback when an independent media radius is unset', () => {
    const c = card();
    c.styles = { media: { 'border-radius': { resolvesTo: 'card.size.radius', fallback: '8px', design: { property: 'shape.radius', slot: 'card.design.media.shape.radius' } } } };
    expect(emitCss(buildComponentIR(c))).toContain('var(--fsds-card-design-media-shape-radius, var(--fsds-card-size-radius, 8px))');
    expect(buildDesignBindings(c)[0].part).toBe('media');
  });
  it('rejects mismatched property identities and foreign component slots', () => {
    const c = card();
    c.styles!.root['border-width'].design!.property = 'background.fill';
    expect(() => buildComponentIR(c)).toThrow(/border.width/);
    c.styles!.root['border-width'].design = { property: 'border.width', slot: 'button.design.root.border.width' };
    expect(() => buildComponentIR(c)).toThrow(/namespace/);
  });
  it('rejects accidental sharing of independently addressed consumers', () => {
    const c = card();
    c.styles!.media = structuredClone(c.styles!.root);
    expect(() => buildComponentIR(c)).toThrow(/Duplicate design slot/);
  });
  it('does not turn a web override into a native CSS expression', () => {
    const c = card();
    c.styles!.root['border-width'].platforms = ['web', 'ios'];
    expect(computeCssBlocks(c, 'card', { platformTarget: 'ios' })[0].declarations['border-width']).toBe('1px');
  });
  it('requires fallback values on new token-backed design properties', () => {
    const c = card();
    c.styles!.root['border-width'] = { resolvesTo: 'card.size.border', design: { property: 'border.width', slot: 'card.design.root.border.width' } };
    expect(() => buildComponentIR(c)).toThrow(/fallback/);
  });
});
