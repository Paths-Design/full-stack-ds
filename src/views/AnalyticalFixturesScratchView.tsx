// Analytical fixture playground — scratch surface, reachable only at
// #/scratch/analytical-fixtures (not in the Sidebar nav). Three zones:
//
//   1. Fixture index — the answer-free corpus dumped from
//      packages/ds-contracts/analytical-fixtures/fixtures.jsonl by
//      scripts/sync-analytical-fixtures.mjs, grouped by id family,
//      filterable by transformation class and assertion kind.
//   2. Raw data — the selected fixture's relational structure, its evidence
//      rows with per-observation qualifiers (null kind, unit), and its L0-L2
//      assertions rendered as the questions being asked. This zone shows the
//      stimulus, never an expected answer: the binding ledger and holdout
//      stay engine-side. The shape is the stage-1.5 kernel (types.ts mirrors
//      the emitted schemas): only witnessed coordinates exist to display.
//   3. A bounded selected composite witness above the corpus inspector consumes
//      produced artifacts. It does not claim projection of the selected fixture.

import { useMemo, useState } from "react";
import { AnalyticalCompositePreview } from "../components/analytical/AnalyticalCompositePreview";
import {
  Badge,
  Button,
  Input,
  List,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@full-stack-ds/react";
import { FIXTURES } from "../data/analytical-fixtures/fixtures";
import type {
  AnalyticalFixture,
  Assertion,
  FieldDef,
  Observation,
} from "../data/analytical-fixtures/types";

// Id families, in display order. The prefix is the corpus's own grouping
// (see the stage-1 slice); "other" catches any future prefix so a new family
// can never silently vanish from the index.
const FAMILY_ORDER = [
  { prefix: null, label: "Base fixtures", hint: "the stage-1 corpus stimuli" },
  { prefix: "FX_N_", label: "Near-neighbours", hint: "legal variations, one per stage-1 diagnostic" },
  { prefix: "FX_T_", label: "Triads", hint: "satisfying + hostile pairs per obligation" },
  { prefix: "FX_S_", label: "Stress", hint: "mixed faults, heterogeneity, renaming, adversarial names" },
  { prefix: "FX_P_", label: "Structure probes", hint: "categorical-vs-ratio, binned intervals, OHLC, hierarchy, graph" },
  { prefix: "FX_H_", label: "Holdout stimuli", hint: "authored after the engine-rule digest; expectations stay engine-side" },
] as const;

function familyLabel(id: string): { label: string; hint?: string } {
  const match = FAMILY_ORDER.find((f) => f.prefix !== null && id.startsWith(f.prefix));
  return match ?? { label: FAMILY_ORDER[0].label, hint: FAMILY_ORDER[0].hint };
}

/** The assertion, rendered as the question being asked — nothing more. */
function describeAssertion(a: Assertion): string {
  switch (a.kind) {
    case "aggregate": {
      const parts = [`${a.op} of ${a.relation}.${a.field}`];
      if (a.along?.length) parts.push(`collapsed along ${a.along.join(", ")}`);
      if (a.nulls) parts.push(`nulls ${a.nulls}`);
      if (a.uncertainty) parts.push(`uncertainty ${a.uncertainty}`);
      return parts.join(", ");
    }
    case "ratio-comparison":
      return `ratio comparison over ${a.relation}.${a.field}`;
  }
}

/** Every declared trait of a field, as compact labeled chips. */
function fieldTraits(f: FieldDef): string[] {
  const t: string[] = [f.transformation];
  if (f.cyclic) t.push("cyclic");
  if (f.proportion) t.push("proportion");
  if (f.index) t.push("index");
  if (f.key) t.push("key");
  if (f.unit) {
    if (f.unit.units) t.push(`units: ${f.unit.units.join(" | ")}`);
    if (f.unit.perRow) t.push("per-row unit");
    if (f.unit.conversions?.length) t.push(`convertible: ${f.unit.conversions.join(", ")}`);
  }
  if (f.temporality) t.push(`time: ${f.temporality.kind}`);
  if (f.whole) t.push(`whole: ${typeof f.whole === "string" ? f.whole : `per row ${f.whole.perRow}`}`);
  if (f.base) t.push("base declared");
  if (f.additivity) {
    t.push(
      f.additivity.kind === "semi-additive"
        ? `additivity: semi-additive (non-additive along ${f.additivity.nonAdditiveAlong.join(", ")})`
        : `additivity: ${f.additivity.kind}`,
    );
  }
  if (f.permits?.null) t.push("permits null");
  if (f.permits?.uncertainty) t.push("permits uncertainty");
  return t;
}

/** One observation cell: the value plus its carried qualifiers as DS Badges. */
function ObservationCell({ obs }: { obs: Observation | undefined }) {
  if (obs === undefined) return <span className="muted">—</span>;
  if (typeof obs !== "object" || obs === null) {
    return <span className="afx-obs__value">{String(obs)}</span>;
  }
  return (
    <span className="afx-obs">
      {obs.value !== undefined && <span className="afx-obs__value">{String(obs.value)}</span>}
      {obs.unit && (
        <Badge size="sm" variant="tag" className="afx-badge--unit">
          {obs.unit}
        </Badge>
      )}
      {obs.null && (
        <Badge size="sm" variant="tag" className="afx-badge--null">
          {obs.null}
        </Badge>
      )}
    </span>
  );
}

function EvidenceTable({ fixture }: { fixture: AnalyticalFixture }) {
  const rows = fixture.evidence?.rows;
  if (!rows || Object.keys(rows).length === 0) {
    return <p className="muted">No evidence rows — structure and assertions only.</p>;
  }
  return (
    <>
      {Object.entries(rows).map(([relation, rowList]) => {
        const fieldNames: string[] = [];
        for (const row of rowList) {
          for (const field of Object.keys(row)) {
            if (!fieldNames.includes(field)) fieldNames.push(field);
          }
        }
        return (
          <div key={relation} className="afx-evidence">
            <h4 className="afx-evidence__title">
              rows · {relation}
              {fixture.evidence?.grainWitness?.[relation] && (
                <Badge size="sm" variant="tag" className="afx-badge--grain">
                  grain: {fixture.evidence.grainWitness[relation].join(" + ")}
                </Badge>
              )}
            </h4>
            <Table ariaLabel={`Evidence rows for ${relation}`} className="afx-table">
              <TableHead>
                <TableRow>
                  <TableHeaderCell scope="col">#</TableHeaderCell>
                  {fieldNames.map((f) => (
                    <TableHeaderCell key={f} scope="col">
                      {f}
                    </TableHeaderCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rowList.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="afx-rownum">{i + 1}</TableCell>
                    {fieldNames.map((f) => (
                      <TableCell key={f}>
                        <ObservationCell obs={row[f]} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </>
  );
}

const TRANSFORMATIONS = ["nominal", "ordinal", "interval", "ratio"] as const;

const ASSERTION_KINDS = ["aggregate", "ratio-comparison"] as const;

export function AnalyticalFixturesScratchView() {
  const [query, setQuery] = useState("");
  const [transformation, setTransformation] = useState<string>("all");
  const [assertionKind, setAssertionKind] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string>(FIXTURES[0]?.id ?? "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FIXTURES.filter((f) => {
      if (q && !f.id.toLowerCase().includes(q)) return false;
      if (transformation !== "all") {
        const classes = Object.values(f.structure.relations).flatMap((r) =>
          Object.values(r.fields).map((fd) => fd.transformation),
        );
        if (!classes.includes(transformation as (typeof TRANSFORMATIONS)[number])) return false;
      }
      if (assertionKind !== "all" && !f.assertions.some((a) => a.kind === assertionKind)) {
        return false;
      }
      return true;
    });
  }, [query, transformation, assertionKind]);

  const selected = filtered.find((f) => f.id === selectedId) ?? filtered[0] ?? null;

  const grouped = useMemo(() => {
    const groups = new Map<string, AnalyticalFixture[]>();
    for (const f of filtered) {
      const label = familyLabel(f.id).label;
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(f);
    }
    return FAMILY_ORDER.filter((f) => groups.has(f.label)).map((f) => ({
      label: f.label,
      hint: f.hint,
      fixtures: groups.get(f.label)!,
    }));
  }, [filtered]);

  return (
    <div className="page afx">
      <h1 className="page-title">Analytical fixtures — scratch</h1>
      <p className="page-lede">
        The answer-free analytical corpus, housed as raw data:{" "}
        <code>{FIXTURES.length}</code> fixtures dumped from{" "}
        <code>packages/ds-contracts/analytical-fixtures/fixtures.jsonl</code> by{" "}
        <code>scripts/sync-analytical-fixtures.mjs</code>. Stimulus only — the
        binding ledger and holdout expectations stay engine-side. Not in nav;
        reach it at <code>#/scratch/analytical-fixtures</code>. Regenerate the
        dump after the corpus changes.
      </p>

      <AnalyticalCompositePreview />
      <div className="afx-grid">
        <nav className="afx-index" aria-label="Fixture index">
          <Input
            className="afx-filter-input"
            type="search"
            placeholder="Filter by id…"
            aria-label="Filter fixtures by id"
            value={query}
            onChange={setQuery}
          />
          <div className="afx-filter-row">
            <div className="afx-filter">
              {/* DS Select's generated trigger does not display the selected
                  label, so the current value is echoed in a visible caption. */}
              <Select
                className="afx-filter-select"
                size="sm"
                defaultOpen={false}
                aria-label="Filter by transformation class"
                options={[
                  { value: "all", label: "transformation: all" },
                  ...TRANSFORMATIONS.map((s) => ({ value: s, label: `transformation: ${s}` })),
                ]}
                value={transformation}
                onChange={(v) => setTransformation(String(v))}
              />
              <p className="afx-filter-value">current: {transformation}</p>
            </div>
            <div className="afx-filter">
              <Select
                className="afx-filter-select"
                size="sm"
                defaultOpen={false}
                aria-label="Filter by assertion kind"
                options={[
                  { value: "all", label: "assertion: all" },
                  ...ASSERTION_KINDS.map((k) => ({ value: k, label: `assertion: ${k}` })),
                ]}
                value={assertionKind}
                onChange={(v) => setAssertionKind(String(v))}
              />
              <p className="afx-filter-value">current: {assertionKind}</p>
            </div>
          </div>
          <div className="afx-index__list">
            {grouped.map((group) => (
              <div key={group.label} className="afx-index__group">
                <h3 className="afx-index__group-title">
                  {group.label}
                  <Badge size="sm" variant="counter" className="afx-badge--count">
                    {group.fixtures.length}
                  </Badge>
                  {group.hint && <span className="afx-index__group-hint"> — {group.hint}</span>}
                </h3>
                {group.fixtures.map((f) => (
                  <Button
                    key={f.id}
                    type="button"
                    variant="ghost"
                    size="small"
                    className={`afx-index__item${selected?.id === f.id ? " afx-index__item--active" : ""}`}
                    ariaPressed={selected?.id === f.id}
                    onClick={() => setSelectedId(f.id)}
                  >
                    {f.id}
                  </Button>
                ))}
              </div>
            ))}
            {grouped.length === 0 && <p className="muted">No fixtures match the filters.</p>}
          </div>
        </nav>

        {selected && (
          <section className="afx-detail" aria-label={`Raw data for ${selected.id}`}>
            <h2 className="afx-detail__id">{selected.id}</h2>

            <h3 className="afx-section-title">Structure</h3>
            {Object.entries(selected.structure.relations).map(([name, rel]) => (
              <div key={name} className="afx-relation">
                <h4 className="afx-relation__name">
                  {name}
                  <Badge size="sm" variant="tag" className="afx-badge--grain">
                    grain: {rel.grain === "unknown" ? "unknown" : rel.grain.join(" + ")}
                  </Badge>
                </h4>
                <Table ariaLabel={`Declared fields of ${name}`} className="afx-table">
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell scope="col">field</TableHeaderCell>
                      <TableHeaderCell scope="col">declared traits</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(rel.fields).map(([fieldName, def]) => (
                      <TableRow key={fieldName}>
                        <TableCell className="afx-fieldname">{fieldName}</TableCell>
                        <TableCell className="afx-traits">
                          {fieldTraits(def).map((t) => (
                            <Badge key={t} size="sm" variant="tag">
                              {t}
                            </Badge>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
            <h3 className="afx-section-title">Assertions — the questions being asked</h3>
            <List className="afx-assertions">
              {selected.assertions.map((a, i) => (
                <li key={i}>{describeAssertion(a)}</li>
              ))}
            </List>

            <h3 className="afx-section-title">Evidence rows</h3>
            <EvidenceTable fixture={selected} />
          </section>
        )}

        <aside className="afx-realization" aria-label="Corpus projection boundary">
          <h3 className="afx-section-title">Realization</h3>
          <p className="afx-realization__placeholder">
            The selected output above exercises one bounded qualified range
            composition. This corpus inspector does not select a projection
            for each fixture; its assertions remain questions for the engine.
          </p>
          {selected && (
            <div className="afx-realization__pending">
              <h4>Queries a future projection must answer for {selected.id}:</h4>
              <List>
                {selected.assertions.map((a, i) => (
                  <li key={i}>{describeAssertion(a)}</li>
                ))}
              </List>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
