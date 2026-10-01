import { RelationalStructure } from '../../packages/ds-codegen/dist/analytical/relation-model.js';
import { bindOperation, EXPERIMENT_TARGET, qualifyRelation } from '../../packages/ds-codegen/dist/analytical/projection.js';
import { selectCompositeProgram } from '../../packages/ds-codegen/dist/analytical/composite-selection.js';

export function fixture(variant = 'baseline') {
  const quantity = () => ({ transformation: 'ratio', unit: { units: ['u'] } });
  const structure = RelationalStructure.parse({ relations: { samples: {
    grain: ['site', 'day'], fields: {
      site: { transformation: 'nominal' }, day: { transformation: 'nominal' },
      lo: quantity(), hi: quantity(),
      a: { ...quantity(), bounds: { lower: 'lo', upper: 'hi' } },
      b: { ...quantity(), bounds: { lower: 'lo', upper: 'hi' } }, note: { transformation: 'nominal' },
    },
  } } });
  let first = [
    { site: 'west', day: 1, lo: 0, hi: 10, a: 2, b: 4, note: 'alpha' },
    { site: 'west', day: '1', lo: 0, hi: 10, a: 3, b: 5, note: 'beta' },
  ];
  let second = first.map((r, i) => ({ ...r, a: 6 - i, b: 8 - i, note: 'other' }));
  if (variant === 'changed-value') first[0].a = 4;
  if (variant === 'changed-loss') first[0].note = 'a different unrecoverable value';
  const loss = /^loss-([01])-([01])-(a|b|note)$/.exec(variant);
  if (loss) (loss[1] === '0' ? first : second)[Number(loss[2])][loss[3]] = loss[3] === 'note' ? 'changed' : 9;
  if (variant === 'changed-population') { first = first.slice(0, 1); second = second.slice(0, 1); }
  if (variant === 'reordered') { first.reverse(); second.reverse(); }
  if (variant === 'contradicted') first[0].a = 11;
  if (variant === 'empty') { first = []; second = []; }
  if (!loss && !['baseline', 'changed-value', 'changed-loss', 'changed-population', 'reordered', 'contradicted', 'empty', 'missing'].includes(variant)) throw new Error(`unknown fixture variant: ${variant}`);
  const q0 = qualifyRelation(structure, 'samples', variant === 'missing' ? undefined : first);
  const q1 = qualifyRelation(structure, 'samples', second);
  const host = { coordinate: 'cartesian', dimension: 'position', measure: 'length', baseline: 'zero',
    task: 'magnitude-comparison', claims: [],
    operation: bindOperation(structure, { relation: 'samples', field: 'a', op: 'sum', along: ['day'] }) };
  const input = { structure, inventory: EXPERIMENT_TARGET, composite: {
    combinator: 'embed', host, budget: ['position'], cellBaseline: 'zero', part: { kind: 'composite', composite: {
      combinator: 'facet', partition: 'site', policy: { position: 'shared' }, parts: [{ kind: 'composite', composite: {
        combinator: 'layer', sharing: { position: 'shared' }, parts: [
          { kind: 'qualified', result: q0, field: 'a', channel: 'position' },
          { kind: 'qualified', result: q1, field: 'b', channel: 'position' },
        ],
      } }],
    } },
  } };
  return { input, first, second, selected: selectCompositeProgram(input, { kind: 'readback' }) };
}
