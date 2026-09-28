import { Card, Carousel, Chip, CodeSnippet, Details, Stack, Stat, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@full-stack-ds/react";
import type { Bundle, TargetCensus } from "../types/data";
import { buildHref } from "../router";

interface HomeProps {
  bundle: Bundle;
}

/** Presentation-only metadata keyed by census target id. Existence, counts and
 * parity come from `bundle.census` (build-time); this map only supplies labels,
 * dots and blurbs for targets that actually exist. Targets with no package
 * (e.g. the old UIKit card) simply never appear because they're not censused. */
const TARGET_PRESENTATION: Record<
  string,
  { label: string; short: string; dot: string; blurb: string }
> = {
  react: { label: "React 19", short: "React", dot: "lang-react", blurb: "TSX, hooks, controllable state." },
  vue: { label: "Vue 3", short: "Vue", dot: "lang-vue", blurb: "SFC with composition API." },
  svelte: { label: "Svelte 5", short: "Svelte", dot: "lang-svelte", blurb: "Svelte 5 runes ($props, $derived)." },
  angular: { label: "Angular 17+", short: "Angular", dot: "lang-angular", blurb: "Standalone components + signals." },
  lit: { label: "Lit 3", short: "Lit", dot: "lang-lit", blurb: "Lit 3 with reactive controllers." },
  "react-native": { label: "React Native", short: "React Native", dot: "lang-react", blurb: "TSX, hooks, native primitives." },
  swiftui: { label: "SwiftUI", short: "SwiftUI", dot: "lang-swift", blurb: "View structs, @Binding state." },
  figma: { label: "Figma", short: "Figma", dot: "lang-figma", blurb: "Descriptor-driven component sets." },
};

function present(id: string) {
  return TARGET_PRESENTATION[id] ?? { label: id, short: id, dot: "", blurb: "" };
}

/** Canonical display order for the web targets (matches docs/prose), so the
 * lede and cards read in the familiar order rather than registry order. */
const WEB_ORDER = ["react", "vue", "svelte", "angular", "lit"];

export function Home({ bundle }: HomeProps) {
  const census = bundle.census;
  const targets = census?.targets ?? [];
  const web = targets
    .filter((t) => t.family === "web")
    .sort((a, b) => WEB_ORDER.indexOf(a.id) - WEB_ORDER.indexOf(b.id));
  const beyond = targets.filter((t) => t.family !== "web");
  const fullParity = targets.filter((t) => t.parity === "full");

  // Parity matrix columns: every target that ships components (web + native).
  const matrixCols = [...web, ...beyond.filter((t) => t.family === "native")];
  const presenceSets: Record<string, Set<string>> = {};
  for (const t of matrixCols) {
    presenceSets[t.id] = new Set(census?.presence?.[t.id] ?? []);
  }

  const componentCount = census?.components ?? bundle.components.length;
  const generatedFiles = census?.generatedFiles ?? 0;
  const foundationTokens = census?.foundationTokens ?? bundle.foundationTokens.length;
  const icons = census?.icons ?? 0;
  const primitives = census?.primitives ?? [];
  const emitterOnly = census?.emitterOnly ?? [];

  const webNames = web.map((t) => present(t.id).short).join(", ");
  const samples = bundle.components.slice(0, 6);

  const renderCard = (t: TargetCensus) => {
    const p = present(t.id);
    return (
      <Card key={t.id} density="inset">
        <Stack
          variant="horizontal"
          className="stack-gap-05"
          style={{ alignItems: "center" }}
        >
          <span
            className={`lang-dot ${p.dot}`}
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "currentColor",
            }}
          />
          <strong style={{ fontSize: "var(--fsds-core-typography-ramp-4)" }}>
            {p.label}
          </strong>
        </Stack>
        <p
          className="muted"
          style={{
            marginTop: "var(--fsds-core-spacing-size-05)",
            marginBottom: 0,
            fontSize: "var(--fsds-core-typography-ramp-2)",
          }}
        >
          {p.blurb}
        </p>
        {t.family !== "web" && t.componentsShipped > 0 && (
          <p
            className="muted"
            style={{
              marginTop: "var(--fsds-core-spacing-size-02)",
              marginBottom: 0,
              fontSize: "var(--fsds-core-typography-ramp-1)",
            }}
          >
            {t.componentsShipped}/{componentCount} components
            {t.allowlisted ? " · allowlisted" : ""}
          </p>
        )}
      </Card>
    );
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "var(--fsds-core-spacing-size-06)",
  } as const;

  return (
    <div className="page">
      <p className="page-eyebrow">A falsifiable architectural claim</p>
      <h1 className="page-title">
        The components are the demo.
        <br />
        The claim is the project.
      </h1>
      <p className="page-lede">
        Every component on this site is described by a single JSON contract;{" "}
        {web.length} web framework emitters ({webNames})
        {beyond.length > 0 &&
          ` plus ${beyond.map((t) => present(t.id).short).join(", ")}`}{" "}
        read it and produce idiomatic, native source for each runtime. But the
        component corpus is the existence proof, not the project: the same
        discipline — one authority, governed composition, target-specific
        projections, observable drift — is applied to design tokens,
        iconography, analytical relations, this documentation site, and the
        evidence that attests all of it. Compare targets side-by-side here,
        trace every line back to the field that produced it, and read the
        research program in <code>docs/research-program.md</code>.
      </p>
      <p className="muted" style={{ marginTop: "calc(-1 * var(--fsds-core-spacing-size-05))" }}>
        Why one contract, {web.length} frameworks, {primitives.length === 1 ? "one primitive" : `${primitives.length} primitives`}?
        Because a family of artifacts should fall out of a generative substrate
        — the constraint exists to test an architectural claim about
        compositional systems generally. Read it on the{" "}
        <a href={buildHref({ kind: "architecture" })}>Architecture</a> page. The
        numbers below are censused from the <CodeSnippet text="packages/" /> tree at build
        time, so they always reflect what is actually here.
      </p>

      <section className="section" aria-label="Explore the system">
        <h2 className="section-title">Explore the system</h2>
        <Carousel slides={["Browse components", "Explore tokens", "Read the architecture"]} label="Explore the system" duration={null}>
          <Card><h3>Build with composed parts</h3><p>Browse component anatomy, properties, and working examples.</p><a href={buildHref({ kind: "component", name: "Carousel", tab: "design" })}>Explore Carousel</a></Card>
          <Card><h3>Follow a design decision</h3><p>Trace reusable values through the token system.</p><a href="#/tokens">Explore tokens</a></Card>
          <Card><h3>Understand the contract</h3><p>See how shared semantics become framework components.</p><a href="#/architecture">Read the architecture</a></Card>
        </Carousel>
      </section>

      <div className="home-stats">
        <div className="home-stat">
          <Stat size="lg">{componentCount}</Stat>
          <div className="home-stat-label">Components</div>
        </div>
        <div className="home-stat">
          <Stat size="lg">{fullParity.length}</Stat>
          <div className="home-stat-label">Targets at full parity</div>
        </div>
        <div className="home-stat">
          <Stat size="lg">{generatedFiles}</Stat>
          <div className="home-stat-label">Generated files indexed</div>
        </div>
        <div className="home-stat">
          <Stat size="lg">{foundationTokens}</Stat>
          <div className="home-stat-label">Foundation tokens</div>
        </div>
        <div className="home-stat">
          <Stat size="lg">{icons}</Stat>
          <div className="home-stat-label">Governed icons</div>
        </div>
        <div className="home-stat">
          <Stat size="lg">{primitives.length}</Stat>
          <div className="home-stat-label">Primitives</div>
        </div>
      </div>

      <section className="section">
        <Stack as="header" variant="horizontal" className="section-header stack-gap-06">
          <h2 className="section-title">Target frameworks</h2>
          <span className="section-meta">in-browser preview, all {web.length}</span>
        </Stack>
        <div style={gridStyle}>{web.map(renderCard)}</div>

        <Stack as="header" variant="horizontal" className="section-header stack-gap-06">
          <h2 className="section-title">Beyond the web</h2>
          <span className="section-meta">code-only previews</span>
        </Stack>
        <div style={gridStyle}>{beyond.map(renderCard)}</div>

        {emitterOnly.length > 0 && (
          <p className="muted" style={{ marginTop: "var(--fsds-core-spacing-size-05)" }}>
            Experimental emitters (codegen only, no component package yet):{" "}
            {emitterOnly.join(", ")}.
          </p>
        )}
      </section>

      <section className="section">
        <Stack as="header" variant="horizontal" className="section-header stack-gap-06">
          <h2 className="section-title">Parity matrix</h2>
          <span className="section-meta">which target ships which component</span>
        </Stack>
        <Details
          summary={`Show the ${componentCount} × ${matrixCols.length} targets × components matrix`}
        >
          <div style={{ overflowX: "auto", marginTop: "var(--fsds-core-spacing-size-05)" }}>
            <Table ariaLabel={`Parity matrix — ${componentCount} components × ${matrixCols.length} targets`}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell scope="col" style={{ textAlign: "left" }}>
                    Component
                  </TableHeaderCell>
                  {matrixCols.map((t) => (
                    <TableHeaderCell key={t.id} scope="col">
                      {present(t.id).short}
                    </TableHeaderCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {bundle.components.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell style={{ textAlign: "left" }}>{c.name}</TableCell>
                    {matrixCols.map((t) => (
                      <TableCell
                        key={t.id}
                        style={{
                          textAlign: "center",
                          color: presenceSets[t.id]?.has(c.name)
                            ? "var(--fsds-core-color-palette-red-500, #d9292b)"
                            : "rgba(127,127,127,0.25)",
                        }}
                      >
                        {presenceSets[t.id]?.has(c.name) ? "●" : "·"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Details>
      </section>

      <section className="section">
        <Stack as="header" variant="horizontal" className="section-header stack-gap-06">
          <h2 className="section-title">Start exploring</h2>
          <a
            className="muted"
            href={buildHref({
              kind: "component",
              name: "Button",
              tab: "design",
            })}
          >
            See Button →
          </a>
        </Stack>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "var(--fsds-core-spacing-size-06)",
          }}
        >
          {samples.map((c) => (
            <a
              key={c.name}
              className="home-sample-link"
              href={buildHref({
                kind: "component",
                name: c.name,
                tab: "design",
              })}
              style={{ display: "block" }}
            ><Card className="showcase-card showcase-card--inset">
              <Stack
                variant="horizontal"
                className="stack-gap-05"
                style={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <strong>{c.name}</strong>
                <Chip size="small">{c.contract.layer}</Chip>
              </Stack>
              <p
                className="muted"
                style={{
                  marginTop: "var(--fsds-core-spacing-size-05)",
                  marginBottom: 0,
                  fontSize: "var(--fsds-core-typography-ramp-2)",
                }}
              >
                {c.contract.description ?? "—"}
              </p>
            </Card></a>
          ))}
        </div>
      </section>
    </div>
  );
}
