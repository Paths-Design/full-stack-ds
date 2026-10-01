import { useState } from "react";
import { Button, CodeBlock, Details, Stack } from "@full-stack-ds/react";
import witnesses from "virtual:fsds/analytical-composite";
import { carriedParts, decodeCompositeReadback } from "../../../packages/ds-codegen/src/analytical/composite-artifacts.js";
import type { CarriedComposite, CarriedView, CompositeMetricArtifact } from "../../../packages/ds-codegen/src/analytical/composite-artifacts.js";

type Key = CompositeMetricArtifact["carrier"]["datasets"][number]["result"]["observations"][number]["key"];
const sameKey = (a: Key, b: Key) => a.length === b.length && a.every(x => b.some(y => x.field === y.field && x.value === y.value));

function bindings(node: CarriedComposite, path: number[] = []): Array<CarriedView & { view: string }> {
  return carriedParts(node).flatMap((part, i) => part.kind === "qualified"
    ? [{ ...part, view: [...path, i].join(".") }]
    : bindings(part.composite, [...path, i]));
}

function MetricTree({ artifact, node, path = [], keys }: { artifact: CompositeMetricArtifact; node: CarriedComposite; path?: number[]; keys?: Key[] }) {
  const verdict = path.length ? artifact.carrier.judgment.parts.find(p => JSON.stringify(p.path) === JSON.stringify(path))?.verdict : artifact.carrier.judgment.verdict;
  if (verdict?.kind !== "retained") return <p>Geometry unavailable: carried standing is not retained.</p>;
  if (node.combinator === "facet") return <>{verdict.panels?.map((panel, i) => {
    const panelKeys: Key[] = panel.keys.map(k => JSON.parse(k));
    return <section data-panel key={i} style={{ borderTop: "1px solid var(--color-border, #777)", padding: "16px 0", marginBottom: 16 }}>
      <h4 data-panel-label>{node.partition}: {JSON.stringify(panel.value)}</h4>
      {node.parts.map((p, j) => p.kind === "composite" && <MetricTree key={j} artifact={artifact} node={p.composite} path={[...path, j]} keys={panelKeys.filter(k => !keys || keys.some(x => sameKey(x, k)))} />)}
    </section>;
  })}</>;
  if (node.combinator === "layer") return <>{verdict.ranges?.map((range, i) => {
    const views = node.parts.flatMap((p, j) => p.kind === "qualified" && range.members.includes(p.field) && artifact.carrier.datasets.find(d => d.id === p.dataset)?.result.fieldFacts[p.field]?.bounds?.lower === range.lower && artifact.carrier.datasets.find(d => d.id === p.dataset)?.result.fieldFacts[p.field]?.bounds?.upper === range.upper ? [{ ...p, view: [...path, j].join(".") }] : []);
    const first = views[0];
    if (first?.kind !== "qualified") return null;
    const result = artifact.carrier.datasets.find(d => d.id === first.dataset)!.result;
    const rows = result.observations.filter(o => !keys || keys.some(k => sameKey(k, o.key)));
    const { x, width } = artifact.viewport;
    return <div key={i} data-range-group data-layer={path.join(".")}>
      <p data-range>{JSON.stringify(range)}</p>
      {rows.map((o, j) => <div data-mark-row key={j} style={{ marginBottom: 12 }}>
        <code data-key>{JSON.stringify(o.key)}</code>
        <svg role="img" aria-label="Carried bounded range" viewBox={`${x} 0 ${width} ${20 + views.length * 14}`} preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 20 + views.length * 14 }}>
          <line data-dataset={first.dataset} aria-label={`${range.lower} → ${range.upper}`} x1={o.positions[range.lower]} x2={o.positions[range.upper]} y1={8} y2={8} stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" />
          {views.map((v, k) => {
            if (v.kind !== "qualified") return null;
            const observation = artifact.carrier.datasets.find(d => d.id === v.dataset)!.result.observations.find(x => sameKey(x.key, o.key))!;
            return <ellipse key={k} data-view={v.view} data-dataset={v.dataset} aria-label={v.field} cx={observation.positions[v.field]} cy={22 + k * 14} rx={width / 140} ry={5} fill={k % 2 ? "#c14a08" : "#275dc9"}><title>{v.dataset}/{v.field} (view {v.view})</title></ellipse>;
          })}
        </svg>
        <p>{range.lower} — {range.upper}; members top to bottom: {views.map((v, k) => <span key={k} style={{ color: k % 2 ? "#c14a08" : "#275dc9", marginRight: 12 }}>{v.dataset}/{v.field} (view {v.view})</span>)}</p>
      </div>)}
    </div>;
  })}{node.parts.map((p, i) => p.kind === "composite" && <MetricTree key={i} artifact={artifact} node={p.composite} path={[...path, i]} keys={keys} />)}</>;
  return <>{carriedParts(node).map((p, i) => p.kind === "composite" && <MetricTree key={i} artifact={artifact} node={p.composite} path={[...path, i]} keys={keys} />)}</>;
}

export function AnalyticalCompositePreview() {
  const [index, setIndex] = useState(0);
  const witness = witnesses[index];
  const carrier = witness.readback && decodeCompositeReadback(witness.readback);
  return <section data-composite-preview aria-label="Selected composite output" style={{ margin: "24px 0", padding: 24, border: "1px solid #777" }}>
    <h2>Selected composite output</h2>
    <p>Bounded consumer witnesses, separate from the corpus below. Bounds and members share a position scale. Host standing is carried; its frame is not drawn. Row order implies no trend.</p>
    <Stack variant="horizontal" role="group" aria-label="Witness" className="stack-gap-04" style={{ flexWrap: "wrap" }}>{witnesses.map((w, i) => <Button size="small" variant="ghost" ariaPressed={index === i} onClick={() => setIndex(i)} key={w.name}>{w.name}</Button>)}</Stack>
    <p>Readback: <span data-disposition>{witness.status}{witness.reason && `: ${witness.reason}`}</span></p>
    {witness.metricStatus && <p data-metric-disposition>Metric: {witness.metricStatus}{witness.metricReason && `: ${witness.metricReason}`}</p>}
    {carrier && <>
      <p data-standing>Composition: {carrier.judgment.verdict.kind}; {carrier.datasets.map(d => `${d.id}: ${d.result.judgment.standing}`).join("; ")}</p>
      {witness.metric && <>
        <p data-scale>origin: {witness.metric.scale.origin}; units per value: {witness.metric.scale.unitsPerValue}</p>
        <MetricTree artifact={witness.metric} node={witness.metric.carrier.composition} />
      </>}
      <h3>Structured readback</h3>
      <table data-bindings style={{ borderSpacing: "12px 4px", textAlign: "left" }}><caption>View bindings</caption><thead><tr>{["View", "Dataset", "Field", "Lower", "Upper"].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{bindings(carrier.composition).map(v => {
        const bounds = carrier.datasets.find(d => d.id === v.dataset)!.result.fieldFacts[v.field]?.bounds;
        return <tr key={v.view}>{[v.view, v.dataset, v.field, bounds?.lower ?? "none", bounds?.upper ?? "none"].map((value, i) => <td key={i}>{value}</td>)}</tr>;
      })}</tbody></table>
      {carrier.datasets.map(d => <div key={d.id} data-readback>
        <h4><span data-dataset-label>{d.id}</span>: {d.result.relation}</h4>
        <div style={{ overflowX: "auto" }}><table style={{ width: "100%" }}><thead><tr><th>Typed grain</th>{Object.keys(d.result.fields).map(f => <th key={f}>{f}</th>)}</tr></thead>
          <tbody>{d.result.observations.map((o, i) => <tr key={i}><td><code>{JSON.stringify(o.key)}</code></td>{Object.keys(d.result.fields).map(f => <td key={f}>{JSON.stringify(o.values[f] ?? o.key.find(k => k.field === f)?.value) ?? "uncarried"}</td>)}</tr>)}</tbody></table></div>
      </div>)}
      <Details summary="Carried declarations and composition"><CodeBlock language="json" code={JSON.stringify({ authority: carrier.authority, composition: carrier.composition, fields: carrier.datasets.map(d => d.result.fields), judgment: carrier.judgment }, null, 2)} /></Details>
    </>}
  </section>;
}
