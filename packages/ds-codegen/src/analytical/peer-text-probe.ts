import { lowerSelectedComposite, selectCompositeRealization } from "./composite-selection.js";
import type { CompositeSelection } from "./composite-selection.js";
import { carriedParts } from "./composite-artifacts.js";
import type { CarriedComposite, CompositeReadbackArtifact } from "./composite-artifacts.js";
import type { DerivedFacetPanel } from "./projection.js";

type Key = Array<[string, string | number]>;
type Layout = 'lines' | 'paragraphs';
type TaskLoss = { path: string; task: string; reason: string };
export interface PeerTextProbe {
  kind: 'peer-text-probe';
  scope: 'bounded view statements; not complete carrier recovery or host-task realization';
  text: string;
  loss: { values: Array<{ dataset: string; key: Key; field: string }>; tasks: TaskLoss[] };
  residue: { layout: Layout; traversal: string };
}
type PeerOutput = Exclude<CompositeSelection, { kind: 'selected' }> | PeerTextProbe
  | { kind: 'unsupported'; reason: string; readback: CompositeReadbackArtifact };
const json = JSON.stringify;
const name = (p: number[]) => p.length ? p.join('.') : 'root';
const grain = (key: Key) => json([...key].sort((a, b) => a[0].localeCompare(b[0])).map(([field, value]) => ({ field, value })));
class TextSupportError extends Error {}

/** Experimental consumer: source declarations and qualification never enter here. */
export function producePeerText(selection: CompositeSelection, layout: Layout = 'lines'): PeerOutput {
  if (selection.kind !== 'selected') return structuredClone(selection);
  const selected = selectCompositeRealization(selection.program, { kind: 'readback' });
  if (selected.kind !== 'selected') return selected;
  const artifact = lowerSelectedComposite(selected.program);
  if (artifact.kind !== 'composite-readback') throw new Error('readback selection did not lower to readback');
  if (layout !== 'lines' && layout !== 'paragraphs') return { kind: 'unsupported', reason: 'unknown text layout', readback: artifact };
  const { carrier } = artifact;
  const records: string[] = [], hosts: string[] = [], tasks: TaskLoss[] = [];
  const used = new Map<string, Set<string>>();
  const verdict = (path: number[]) => path.length ? carrier.judgment.parts.find(p => json(p.path) === json(path))?.verdict : carrier.judgment.verdict;
  type PanelScope = { partition: string; panels: readonly DerivedFacetPanel[] };
  const walk = (node: CarriedComposite, path: number[], scopes: PanelScope[]) => {
    const reading = verdict(path);
    if (reading?.kind !== 'retained') throw new TextSupportError('carried composition standing unavailable');
    if (node.combinator === 'embed') {
      hosts.push(`Host at ${json(name(path))} requests ${json(node.host.task)}; this summary does not realize that task.`);
      tasks.push({ path: name(path), task: node.host.task, reason: 'host operation and comparison task are not realized by this bounded summary' });
    }
    if (node.combinator === 'facet') {
      if (!reading.panels) throw new TextSupportError('carried facet panels unavailable');
      scopes = [...scopes, { partition: node.partition, panels: reading.panels }];
    }
    carriedParts(node).forEach((part, i) => {
      const viewPath = [...path, i];
      if (part.kind === 'composite') { walk(part.composite, viewPath, scopes); return; }
      const dataset = carrier.datasets.find(d => d.id === part.dataset);
      if (!dataset || dataset.result.judgment.standing !== 'qualified') throw new TextSupportError('qualified dataset unavailable');
      const q = dataset.result, bounds = q.fieldFacts[part.field]?.bounds;
      const range = reading.ranges?.find(r => r.members.includes(part.field) && r.lower === bounds?.lower && r.upper === bounds?.upper);
      if (node.combinator !== 'layer' || !bounds || !range) throw new TextSupportError('summary requires a carried bounded-range group');
      const fields = [part.field, bounds.lower, bounds.upper];
      const units = fields.map(f => q.fields[f]?.unit);
      const unit = units[0]?.units?.[0];
      if (typeof unit !== 'string' || units.some(u => u?.perRow || u?.units?.length !== 1 || u.units[0] !== unit)) throw new TextSupportError('summary requires one declared common unit');
      for (const observation of q.observations) {
        const key: Key = observation.key.map(p => [p.field, p.value]);
        const panels = scopes.map(s => {
          const matches = s.panels.filter(p => p.keys.includes(grain(key)));
          if (matches.length !== 1) throw new TextSupportError('carried panel identity unavailable');
          return [s.partition, matches[0]!.value];
        });
        const values = fields.map(f => observation.values[f]);
        if (!values.every(v => typeof v === 'number' && Number.isFinite(v))) throw new TextSupportError('finite bounded values unavailable');
        const identity = json([dataset.id, grain(key)]);
        const present = used.get(identity) ?? new Set<string>();
        fields.forEach(f => present.add(f)); used.set(identity, present);
        records.push(`In dataset ${json(dataset.id)} at view ${json(name(viewPath))}, grain ${json(key)}, panels ${json(panels)}: ${json(part.field)} is ${values[0]} ${json(unit)}, between ${json(bounds.lower)} (${values[1]}) and ${json(bounds.upper)} (${values[2]}).`);
      }
    });
  };
  try { walk(carrier.composition, [], []); }
  catch (error) {
    if (!(error instanceof TextSupportError)) throw error;
    return { kind: 'unsupported', reason: error.message, readback: artifact };
  }
  const omitted: PeerTextProbe['loss']['values'] = [];
  for (const d of carrier.datasets) for (const o of d.result.observations) {
    const key: Key = o.key.map(p => [p.field, p.value]);
    const present = used.get(json([d.id, grain(key)])) ?? new Set();
    for (const field of Object.keys(o.values)) if (!present.has(field) && !d.result.grain.includes(field)) omitted.push({ dataset: d.id, key, field });
  }
  const statements = [
    `Analytical summary: composition retained; ${records.length} records; ${hosts.length} hosts; ${carrier.datasets.length} datasets.`,
    ...carrier.datasets.map(d => `Dataset ${json(d.id)} is ${json(d.result.judgment.standing)} for relation ${json(d.result.relation)}.`),
    ...hosts, ...records,
  ];
  return { kind: 'peer-text-probe', scope: 'bounded view statements; not complete carrier recovery or host-task realization',
    text: statements.join(layout === 'lines' ? '\n' : '\n\n'), loss: { values: omitted, tasks },
    residue: { layout, traversal: 'composition and supplied observation order; no analytical ordering claim' } };
}
