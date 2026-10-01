/**
 * Token-reference resolvability rail (RAIL-TOKEN-REFERENCE-RESOLVABILITY-01).
 *
 * THE QUESTION THIS ASKS, AND WHY IT REPLACED THE OTHER ONE.
 *
 * `tokens:check-usage:gate` asked "is every declared token referenced?" That is
 * the wrong health question for this repo's token architecture. Per
 * docs/architecture/tokens-architecture.md, the base and semantic scopes are
 * VOCABULARY: they exist to be drawn from by path, and the brand layer may ship
 * a full palette ramp for later use. A ramp shipped ahead of its consumer is
 * unreferenced by definition, so gating on reference COUNT makes a stated
 * purpose of the layer fail the build. It did: replacing a brand persona
 * orphaned 26 palette stops and blocked the push, with nothing actually broken.
 *
 * The inverse is the real question: does every reference RESOLVE? A
 * `var(--fsds-x)` naming something the graph never declares does not error —
 * CSS silently falls back to the literal second argument. The binding renders,
 * the value is usually right, and the token layer is decorative for that
 * property. No existing gate can see it. The dead-slot rail asks whether a slot
 * has a `var()` consumer; here the consumer exists and reads a name nothing
 * declares.
 *
 * The known population is a naming-convention seam: codegen preserves a
 * contract's `resolvesTo` casing verbatim, so
 * `semantic.shape.control.border.defaultWidth` emits
 * `--fsds-semantic-shape-control-border-defaultWidth`, while the token build
 * kebab-cases the same token to `...-default-width`. The names never meet.
 *
 * NON-CLAIM (spec A4). This rail is NOT a superset of the gate it replaces. The
 * old gate could notice a semantic token that lost its last consumer; this one
 * cannot. That signal is not preserved anywhere. It is dropped deliberately —
 * it could not distinguish an accidental binding deletion from an intentional
 * brand redesign, and it proved that by firing on the latter — but it is a real
 * loss and is recorded as such rather than implied away.
 *
 * SCOPE. Classification covers the generated global token CSS plus generated
 * React component CSS. The component surface mirrors the sibling styling
 * rails: all five web families lower from the same IR, so a name mismatch in
 * the IR surfaces identically in each. The global sheet must be checked too:
 * theme/brand/density layers can read graph names without any component CSS
 * participating, and omitting that surface previously let broken density
 * aliases pass. Contract-declared design overrides are intentionally unset;
 * they are admitted only with an emitted fallback. Every nested fallback
 * reference is still checked, so that exception cannot hide a graph typo. Read-only — this rail changes no token, contract, or artifact.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildDesignBindings } from "../../packages/ds-codegen/dist/design-properties.js";
import { diffLedger, loadLedger, reportRatchet } from "../lib/ledger-ratchet.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const REACT = resolve(REPO, "packages/ds-react/src/components");
const PRIMITIVES = resolve(REPO, "packages/ds-react/src/primitives");
const GLOBAL_TOKENS = resolve(REPO, "packages/ds-tokens/generated/tokens.css");
const OUT_DIR = resolve(REPO, "docs/internal/token-resolvability-audit");
const LEDGER_PATH = resolve(HERE, "known-unresolvable.json");

const readText = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

/** Custom-property declarations: `--fsds-foo:` on the left of a colon. */
export function declaredNames(css) {
  const names = new Set();
  for (const m of css.matchAll(/(--fsds-[A-Za-z0-9_-]+)\s*:/g)) names.add(m[1]);
  return names;
}

/**
 * Custom-property READS: `var(--fsds-foo, fallback)`.
 *
 * The fallback is captured alongside the name because it is the whole point of
 * the finding — an unresolvable reference is invisible precisely because the
 * fallback renders something plausible. Reporting the name without the value it
 * silently resolved to would understate what a reader needs to adjudicate it.
 */
export function readReferences(css) {
  const reads = [];
  // Match every opening independently, including nested fallback references.
  // Consuming the whole outer var() with a regex would hide its inner graph reads.
  for (const m of css.matchAll(/var\(\s*(--fsds-[A-Za-z0-9_-]+)/g)) {
    let cursor = m.index + m[0].length;
    while (/\s/.test(css[cursor] ?? '') && cursor < css.length) cursor++;
    let fallback = null;
    if (css[cursor] === ',') {
      const start = ++cursor;
      let depth = 0;
      for (; cursor < css.length; cursor++) {
        if (css[cursor] === '(') depth++;
        else if (css[cursor] === ')') { if (depth === 0) break; depth--; }
      }
      fallback = css.slice(start, cursor).trim() || null;
    }
    reads.push({ name: m[1], fallback });
  }
  return reads;
}

/**
 * Custom properties this component sets from JS as an inline style.
 *
 * These are legitimately absent from every stylesheet — Progress writes
 * `--fsds-progress-fill-width` per render. Derived from the component's own
 * source rather than hardcoded as a name list: a hand-maintained allowlist
 * would keep exempting a var long after the JS that justified it was deleted,
 * which is the same rot this rail exists to catch.
 */
export function runtimeSetNames(source) {
  const names = new Set();
  for (const m of source.matchAll(/["'](--fsds-[A-Za-z0-9_-]+)["']\s*:/g)) names.add(m[1]);
  return names;
}

/**
 * Compare CSS values for equivalence, not byte-equality: `#FAFAFA` and
 * `#fafafa` are the same paint, and a trailing-zero difference in a length is
 * not a visual change. Deliberately conservative — anything this does not
 * recognise as equal is reported as a value change, so the failure mode is an
 * over-reported review, never an under-reported restyle.
 */
export function normalizeValue(value) {
  if (value === null || value === undefined) return null;
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function unresolvableId(row) {
  return `${row.component} ${row.name}`;
}

/**
 * The value the token graph declares for `name`, as authored in tokens.css.
 *
 * Needed to answer the question that decides whether a fix is safe: repairing an
 * unresolvable reference re-points the property from its fallback literal to the
 * real token, so if the two differ the repair MOVES PIXELS. A rail that reported
 * only the broken name would let a "mechanical rename" ship a silent restyle.
 */
export function declaredValue(graph, name) {
  const values = graph.get(name);
  if (!values || values.length === 0) return null;
  // A name declared with DIFFERENT values in different blocks is theme-varying
  // (tokens.css carries light and dark). There is no single value to compare
  // against, and picking one would manufacture a confident answer from an
  // ambiguous graph — so say so instead.
  const distinct = [...new Set(values.map(normalizeValue))];
  return distinct.length === 1 ? values[0] : { ambiguous: distinct.length, values };
}

/**
 * Follow `var(--a)` → `var(--b)` → literal through the graph.
 *
 * Comparing a token's authored value against a component's fallback literal is
 * meaningless without this: semantic tokens are almost always aliases, so the
 * authored value is `var(--fsds-core-…)`, which is textually unequal to `8px`
 * no matter what it resolves to. An earlier revision of this rail skipped the
 * resolution step and reported 20 of 23 findings as value-changing purely
 * because of that — a false positive produced by the oracle, not the corpus.
 *
 * Returns null when the chain is ambiguous (theme-varying), cyclic, or bottoms
 * out on an undeclared name — all cases where "the value" is not a single fact.
 */
export function resolveChain(graph, name, seen = new Set()) {
  if (seen.has(name)) return null; // cycle — no fixed point to compare
  seen.add(name);
  const declared = declaredValue(graph, name);
  if (declared === null || typeof declared === "object") return null;
  const alias = declared.match(/^var\(\s*(--fsds-[A-Za-z0-9_-]+)\s*(?:,[^)]*)?\)$/);
  if (!alias) return declared;
  return resolveChain(graph, alias[1], seen);
}

/**
 * name -> every value it is declared with, across all blocks in the sheet.
 *
 * Multi-valued by construction rather than last-write-wins: tokens.css declares
 * theme variants of the same name, and collapsing them silently would hide the
 * ambiguity that `declaredValue` exists to report.
 */
export function buildGraph(css) {
  const graph = new Map();
  for (const m of css.matchAll(/(--fsds-[A-Za-z0-9_-]+)\s*:\s*([^;}]+)[;}]/g)) {
    const name = m[1];
    if (!graph.has(name)) graph.set(name, []);
    graph.get(name).push(m[2].trim());
  }
  return graph;
}

/**
 * Audit one CSS source against the complete set of names available to it.
 *
 * `component` is retained as the row key for ledger compatibility; for a
 * non-component source it is a stable source id such as `global:tokens.css`.
 * `candidateDeclared` stays graph-scoped so a casing suggestion never points
 * at an unrelated component-local declaration.
 */
export function auditCssReferences(
  component,
  css,
  availableDeclared,
  graph = new Map(),
  runtimeDeclared = new Set(),
  candidateDeclared = availableDeclared,
  optionalOverrides = new Set(),
) {
  const findings = new Map();
  for (const { name, fallback } of readReferences(css)) {
    if (availableDeclared.has(name)) continue;
    if (runtimeDeclared.has(name)) continue;
    if (optionalOverrides.has(name) && fallback !== null) continue;
    if (findings.has(name)) continue;

    const declaredAs = kebabCandidate(name, candidateDeclared);
    const resolved = declaredAs ? resolveChain(graph, declaredAs) : null;
    findings.set(name, {
      component,
      name,
      fallback,
      declaredAs,
      declaredAsValue: resolved,
      repairIsValuePreserving:
        resolved === null
          ? null
          : normalizeValue(resolved) === normalizeValue(fallback),
    });
  }
  return [...findings.values()];
}

export function auditComponent(component, globalDeclared, primitiveDeclared, graph = new Map()) {
  const dir = resolve(REACT, component);
  const structure = readText(resolve(dir, `${component}.css`));
  const tokens = readText(resolve(dir, `${component}.tokens.css`));
  if (!structure && !tokens) return [];

  const localDeclared = new Set([
    ...declaredNames(structure),
    ...declaredNames(tokens),
  ]);
  const runtime = runtimeSetNames(readText(resolve(dir, `${component}.tsx`)));

  const availableDeclared = new Set([
    ...localDeclared,
    ...globalDeclared,
    ...primitiveDeclared,
  ]);
  const contractDir = resolve(REPO, 'packages/ds-contracts/components', component);
  const contract = JSON.parse(readText(resolve(contractDir, `${component}.contract.json`)));
  const styleSource = readText(resolve(contractDir, `${component}.styles.json`));
  const optionalOverrides = new Set(buildDesignBindings({ ...contract, styles: styleSource ? JSON.parse(styleSource) : {} }).map(binding => binding.cssVar));
  return auditCssReferences(
    component,
    `${structure}\n${tokens}`,
    availableDeclared,
    graph,
    runtime,
    globalDeclared,
    optionalOverrides,
  );
}

/**
 * If `name` differs from a real declared name only by camelCase-vs-kebab, return
 * the declared spelling. Null when the name is missing for some other reason —
 * the two causes need different fixes, so the report must not conflate them.
 */
export function kebabCandidate(name, globalDeclared) {
  const kebab = name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  return kebab !== name && globalDeclared.has(kebab) ? kebab : null;
}

export function runAudit() {
  const graphCss = readText(GLOBAL_TOKENS);
  const graph = buildGraph(graphCss);
  const globalDeclared = declaredNames(graphCss);
  if (globalDeclared.size === 0) {
    throw new Error(
      `No --fsds-* declarations found in ${GLOBAL_TOKENS}.\n` +
        "The token graph is not built; every reference would report as unresolvable.\n" +
        "Run `pnpm -F @full-stack-ds/tokens build` first.",
    );
  }
  const primitiveDeclared = new Set();
  if (existsSync(PRIMITIVES)) {
    for (const f of readdirSync(PRIMITIVES).filter((f) => f.endsWith(".css"))) {
      for (const n of declaredNames(readText(resolve(PRIMITIVES, f)))) primitiveDeclared.add(n);
    }
  }

  const findings = [];
  findings.push(
    ...auditCssReferences(
      "global:tokens.css",
      graphCss,
      globalDeclared,
      graph,
    ),
  );
  for (const component of readdirSync(REACT).sort()) {
    findings.push(...auditComponent(component, globalDeclared, primitiveDeclared, graph));
  }
  return { findings, declaredCount: globalDeclared.size };
}

const RUN_DIRECTLY =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (RUN_DIRECTLY) {
  const { findings, declaredCount } = runAudit();
  const byName = new Map();
  for (const f of findings) {
    if (!byName.has(f.name)) byName.set(f.name, []);
    byName.get(f.name).push(f.component);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    resolve(OUT_DIR, "resolvability-matrix.json"),
    JSON.stringify(
      {
        spec: "RAIL-TOKEN-REFERENCE-RESOLVABILITY-01",
        declaredInGraph: declaredCount,
        unresolvableReferences: findings.length,
        distinctNames: byName.size,
        findings,
      },
      null,
      2,
    ) + "\n",
  );

  const md = [
    "# Token-reference resolvability matrix",
    "",
    "`RAIL-TOKEN-REFERENCE-RESOLVABILITY-01` — read-only. A generated global or component stylesheet that reads `var(--fsds-x)` where nothing declares `--fsds-x` does not error: CSS falls back to the literal, so the binding renders a plausible value while the token layer is decorative for that property.",
    "",
    "`declared as` names the kebab-cased spelling the token graph actually ships, when the miss is a casing seam. A blank there means the name is missing for some other reason and needs its own diagnosis.",
    "",
    `Declarations in the graph: **${declaredCount}** · unresolvable references: **${findings.length}** across **${byName.size}** distinct name(s)`,
    "",
    "| name | stylesheet sources | silent fallback | declared as | token value | repair |",
    "|---|---|---|---|---|---|",
  ];
  for (const [name, components] of [...byName.entries()].sort()) {
    const row = findings.find((f) => f.name === name);
    const repair =
      row.repairIsValuePreserving === null
        ? "needs diagnosis"
        : row.repairIsValuePreserving
          ? "value-preserving"
          : "**CHANGES VALUE**";
    md.push(
      `| \`${name}\` | ${components.length} (${components.slice(0, 4).join(", ")}${components.length > 4 ? ", …" : ""}) | \`${row.fallback ?? "—"}\` | ${row.declaredAs ? `\`${row.declaredAs}\`` : "—"} | \`${row.declaredAsValue ?? "—"}\` | ${repair} |`,
    );
  }
  writeFileSync(resolve(OUT_DIR, "resolvability-matrix.md"), md.join("\n") + "\n");

  console.log(
    `\nRAIL-TOKEN-REFERENCE-RESOLVABILITY-01 — ${findings.length} unresolvable reference(s) across ${byName.size} distinct name(s)`,
  );
  console.log(`Report: ${resolve(OUT_DIR, "resolvability-matrix.md")}\n`);

  const ledger = loadLedger(LEDGER_PATH, ["component", "name"]);
  const { unledgered, stale } = diffLedger({ current: findings, ledger, idOf: unresolvableId });
  const code = reportRatchet({
    label: "token-resolvability",
    current: findings,
    unledgered,
    stale,
    idOf: unresolvableId,
  });
  if (code !== 0) process.exit(code);
}
