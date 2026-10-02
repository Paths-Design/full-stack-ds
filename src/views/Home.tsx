import { Card, Carousel, Chip, CodeSnippet, Details, Stack, Stat, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@full-stack-ds/react";
import type { Bundle, TargetCensus } from "../types/data";
import { buildHref } from "../router";

interface HomeProps {
  bundle: Bundle;
}

/** Presentation-only metadata keyed by census target id. Existence, counts and
 * source coverage come from `bundle.census` (build-time); this map only supplies labels,
 * dots and blurbs. Registered metadata-only targets remain visible with no
 * source coverage; unknown target ids use the registry label. */
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
  "jetpack-compose": { label: "Jetpack Compose", short: "Jetpack Compose", dot: "", blurb: "Kotlin composables, allowlisted source." },
  unity: { label: "Unity UI Toolkit", short: "Unity", dot: "", blurb: "C# and UI Toolkit, bounded engine pilot." },
  gpui: { label: "GPUI", short: "GPUI", dot: "", blurb: "Styled Rust entities, token themes and native input; GPUI 0.2.2." },
  godot: { label: "Godot Control", short: "Godot", dot: "", blurb: "GDScript and Control scenes, bounded engine pilot." },
  figma: { label: "Figma", short: "Figma", dot: "lang-figma", blurb: "Descriptor-driven component sets." },
};

function present(target: TargetCensus) {
  return TARGET_PRESENTATION[target.id] ?? { label: target.label, short: target.label, dot: "", blurb: "" };
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
  const fullCoverage = targets.filter((t) => t.family !== "descriptor" && t.sourceCoverage === "full");

  // Source coverage columns: component targets; descriptors remain separate.
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

  const webNames = web.map((t) => present(t).short).join(", ");
  const samples = bundle.components.slice(0, 6);

  const renderCard = (t: TargetCensus) => {
    const p = present(t);
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
            {t.componentsShipped}/{componentCount} {t.family === "descriptor" ? "descriptors" : "component sources"}
            {t.allowlisted ? " · allowlisted" : ""}
          </p>
        )}
        <p className="muted">
          {t.railAdmitted ? "Admission rail target" : t.executable ? "Outside the admission rail" : "Metadata only · emission unavailable"}
        </p>
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
        {web.length} web framework emitters ({webNames}) read it and produce
        framework source. Registered native and engine targets emit their
        supported component sources; Figma receives descriptors. The
        component corpus is the existence proof, not the project: the same
        discipline — one authority, governed composition, target-specific
        projections, observable drift — is applied to design tokens,
        iconography, analytical relations, this documentation site, and the
        evidence for those bounded projections. Compare targets side-by-side here,
        trace every line back to the field that produced it, and read the
        research program in <code>docs/research-program.md</code>.
      </p>
      <p className="muted" style={{ marginTop: "calc(-1 * var(--fsds-core-spacing-size-05))" }}>
        Why one contract, {web.length} frameworks, {primitives.length === 1 ? "one rendered primitive" : `${primitives.length} rendered primitives`}?
        Because a family of artifacts should fall out of a generative substrate
        — the constraint exists to test an architectural claim about
        compositional systems generally. Read it on the{" "}
        <a href={buildHref({ kind: "architecture" })}>Architecture</a> page. The
        numbers below are censused from the <CodeSnippet text="packages/" /> tree at build
        time. Source presence establishes corpus coverage; admission and runtime
        checks establish separate, bounded facts.
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
          <Stat size="lg">{fullCoverage.length}</Stat>
          <div className="home-stat-label">Targets with full corpus source coverage</div>
        </div>
        <div className="home-stat">
          <Stat size="lg">{generatedFiles}</Stat>
          <div className="home-stat-label">Files in target output trees</div>
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
          <div className="home-stat-label">Rendered primitives</div>
        </div>
      </div>

      {census?.geometryDefaults && <p className="muted">BoxModel supplies shared geometry defaults separately from the rendered Stack primitive.</p>}

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

      </section>

      <section className="section">
        <Stack as="header" variant="horizontal" className="section-header stack-gap-06">
          <h2 className="section-title">Source coverage matrix</h2>
          <span className="section-meta">which target ships which component</span>
        </Stack>
        <Details
          summary={`Show the ${componentCount} × ${matrixCols.length} targets × components matrix`}
        >
          <div style={{ overflowX: "auto", marginTop: "var(--fsds-core-spacing-size-05)" }}>
            <Table ariaLabel={`Source coverage matrix — ${componentCount} components × ${matrixCols.length} targets`}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell scope="col" style={{ textAlign: "left" }}>
                    Component
                  </TableHeaderCell>
                  {matrixCols.map((t) => (
                    <TableHeaderCell key={t.id} scope="col">
                      {present(t).short}
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
