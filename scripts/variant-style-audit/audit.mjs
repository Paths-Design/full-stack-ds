#!/usr/bin/env node
import { getCssPrefix } from "../../packages/ds-codegen/dist/contract.js";
/**
 * VARIANT-STYLE-REALIZATION-AUDIT-01 — variant/style realization audit.
 *
 * READ-ONLY. For every component, it cross-checks the variant AXES declared in
 * the contract (`variants`) against the CSS that actually realizes them, and
 * flags the "declared variant axis → no visual realization" defect class
 * (Spinner being the canary: 3 axes declared, the classes emitted, but no
 * consuming selector exists).
 *
 * Realization mechanism in this design system: the base `.<prefix>` rule
 * consumes CSS vars (e.g. `var(--fsds-button-color-background-default)`); a
 * variant class re-scopes those vars in `<Name>.tokens.css`
 * (`.button--primary { --fsds-button-color-background-default: …; }`) or sets
 * properties directly in `<Name>.css`. So a variant VALUE is REALIZED iff a
 * `.<prefix>--<value>` selector exists in EITHER generated CSS file.
 *
 * Default-awareness (false-positive control): the DEFAULT value of an axis is
 * realized by the base `.<prefix>` rule and needs no per-value selector. Only a
 * NON-DEFAULT value with no consuming selector is a genuine gap.
 *
 * Out of scope: pseudo-state styling (:hover/:focus/disabled/invalid/checked) —
 * that is the separate state/pseudo-styling rail. This audit covers `variants`.
 *
 * Usage: node scripts/variant-style-audit/audit.mjs
 * Output: docs/internal/variant-style-audit/variant-style-matrix.{json,md}
 */
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { diffLedger, loadLedger, reportRatchet } from "../lib/ledger-ratchet.mjs";
import { buildComponentIR, deriveWebDomCarriers } from "../../packages/ds-codegen/dist/ir.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const CONTRACTS = resolve(REPO, "packages/ds-contracts/components");
const REACT = resolve(REPO, "packages/ds-react/src/components");
const OUT_DIR = resolve(REPO, "docs/internal/variant-style-audit");

const readJSON = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
const readText = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

export const ALL_COMPONENTS = () =>
  readdirSync(CONTRACTS)
    .filter((d) => statSync(resolve(CONTRACTS, d)).isDirectory())
    .filter((d) => existsSync(resolve(CONTRACTS, d, `${d}.contract.json`)))
    .sort();

const PROP_BUCKETS = ["designed", "constrained", "restricted", "styled", "hook"];

/** Default value for a variant axis = the keyed prop's declared default, if any. */
function variantDefault(contract, dim) {
  for (const b of PROP_BUCKETS) {
    for (const m of contract.props?.[b]?.members ?? []) {
      if (m?.name === dim && m.default !== undefined) return String(m.default);
    }
  }
  return null; // unknown — no value is treated as base-covered
}

/** Component identity comes from the contract, not optional root slot declarations. */
function cssPrefix(component) {
  return getCssPrefix(readJSON(resolve(CONTRACTS, component, `${component}.contract.json`)));
}

/**
 * Does a `.<prefix>--<suffix>` selector exist (boundary-safe, so --sm ≠ --small)?
 * `suffix` is the bare value for non-colliding axes (`sm`) or the axis-qualified
 * form for colliding axes (`size-sm`), so the same matcher recognizes both the
 * legacy and the namespaced realization shapes.
 */
function hasVariantSelector(cssText, prefix, suffix) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\.${esc(prefix)}--${esc(suffix)}(?![A-Za-z0-9_-])`);
  return re.test(cssText);
}

/**
 * Which axes are namespaced, read off the IR rather than recomputed.
 *
 * This function used to carry its own copy of `computeTaintedAxes`, described
 * in its own comment as "mirrors the codegen so the audit and the generator
 * agree". A mirror agrees right up until it doesn't, and two copies of a naming
 * rule is how a rail and its generator drift while both stay green
 * (RAIL-WEB-STYLE-CARRIER-REACHABILITY-01). `classRecipe.valueModifiers[].
 * valuePrefix` is the generator's own answer: present means the axis collides
 * and emits `--<axis>-<value>`, absent means the bare `--<value>` shape.
 *
 * Collisions are still reported, because they are useful to a reader — but
 * they are now DERIVED from the prefixes the IR assigned, not from a second
 * pass over `variants`.
 */
export function taintedAxesFromIR(ir) {
  const tainted = new Set();
  for (const vm of ir.classRecipe.valueModifiers) {
    if (vm.valuePrefix) tainted.add(vm.propName);
  }
  return tainted;
}

const LEDGER_PATH = resolve(HERE, "known-unrealized.json");

const INVERSE_LEDGER_COMMENT =
  "Inverse (variant-realization) ledger. An entry means: the component emits this variant carrier and no CSS rule selects it, so choosing that value changes nothing. The census predicate is exactly that — RAIL-WEB-STYLE-CARRIER-REACHABILITY-01 removed the old `stylingIntent` admission rule, under which an axis only counted if someone had ALREADY authored a per-value token or `--<value>` block. That made the evidence of intent the artifact missing precisely when nobody authored the styling, and hid the worst debt (Checkbox.size, Progress.size/variant, ToggleSwitch.size all read intent=false, realized=0/n and never entered the failing set while a browser measured them as identical). `disposition` keeps that signal as TRIAGE only: `no-styling-intent` marks values likely to be structural or behavioral (placement, `as`, politeness) rather than visual debt. Until a contract fact declares a visual obligation, this ledger is a ratchet and not a semantic rejection rule — a row may be resolved by painting the value OR by establishing that the axis is non-visual and retiring the overclaim. Two-directional: a new dead knob fails, a burned entry left on the books fails. Re-derive with --reseed.";

/** Ledger identity for an unrealized variant value. */
export function unrealizedId(row) {
  return `${row.component}.${row.axis}=${row.value}`;
}

/** Values shared by two or more axes, for the collision table in the report. */
export function collisionsOf(variants) {
  const valueToAxes = new Map();
  for (const [axis, values] of Object.entries(variants)) {
    if (!Array.isArray(values)) continue;
    for (const v of values) {
      const key = String(v);
      if (!valueToAxes.has(key)) valueToAxes.set(key, new Set());
      valueToAxes.get(key).add(axis);
    }
  }
  const collisions = [];
  for (const [value, axes] of valueToAxes) {
    if (axes.size >= 2) collisions.push({ value, axes: [...axes].sort() });
  }
  return collisions;
}

export function classify(component) {
  const contract = readJSON(resolve(CONTRACTS, component, `${component}.contract.json`)) ?? {};
  const variants = contract.variants ?? {};
  const prefix = cssPrefix(component);
  const css = readText(resolve(REACT, component, `${component}.css`));
  const tokensCss = readText(resolve(REACT, component, `${component}.tokens.css`));
  const both = css + "\n" + tokensCss;

  // Styling-intent inputs: component token-key path segments + styles.json
  // variant-selector names. An axis "should be CSS-realized" only when its
  // VALUES show styling intent — a per-value component token (e.g.
  // `spinner.thickness.hairline`) or a styles.json `--value` selector. Without
  // either, the axis is behavioral / DOM-structural (mode, type, orientation,
  // as, level, placement) and legitimately needs no `.prefix--value` rule, so
  // it is NOT a realization gap. This is the false-positive control.
  const tokensJson = readJSON(resolve(CONTRACTS, component, `${component}.tokens.json`)) ?? {};
  const tokenSegments = new Set();
  for (const key of Object.keys(tokensJson)) for (const seg of key.split(".")) tokenSegments.add(seg);
  const stylesJson = readJSON(resolve(CONTRACTS, component, `${component}.styles.json`)) ?? {};
  const styleVariantNames = new Set();
  for (const sel of Object.keys(stylesJson)) {
    const m = /^--(.+)$/.exec(sel);
    if (m) styleVariantNames.add(m[1]);
  }

  // Collision substrate, read off the IR the generator built: a colliding axis
  // is realized by `.<prefix>--<axis>-<value>`, a disjoint one by the bare
  // `.<prefix>--<value>`. Both forms come from `classRecipe`, so the audit and
  // the emitters cannot disagree about spelling.
  const ir = buildComponentIR({ ...contract, tokens: tokensJson, styles: stylesJson });
  const carriers = deriveWebDomCarriers(ir, contract);
  const taintedAxes = taintedAxesFromIR(ir);
  const collisions = collisionsOf(variants);

  const dims = [];
  for (const [dim, values] of Object.entries(variants)) {
    if (!Array.isArray(values)) continue;
    const def = variantDefault(contract, dim);
    const tainted = taintedAxes.has(dim);
    // STYLING INTENT IS NO LONGER THE CENSUS PREDICATE
    // (RAIL-WEB-STYLE-CARRIER-REACHABILITY-01, AC11). It used to gate whether
    // a gap EXISTED: an axis only counted if some value already had a per-value
    // token or `--<value>` styles block. That made the evidence of intent the
    // artifact that is missing precisely when nobody ever authored the styling,
    // so the axes with the worst debt were invisible to the gate — Checkbox
    // `size`, Progress `size`/`variant`, ToggleSwitch `size` all read
    // `intent=false, realized=0/n` and never entered `failing`, while a browser
    // measured three identical checkboxes, three identical progress bars and
    // three identical switches. It survives as a DISPOSITION: useful triage for
    // which findings are likely visual debt versus behavioral axes, and useless
    // as an admission criterion.
    const stylingIntent = values.some((v) => tokenSegments.has(String(v)) || styleVariantNames.has(String(v)));
    const rows = values.map((value) => {
      const v = String(value);
      // The carrier the emitters actually place for this axis value, taken from
      // the IR — not reconstructed from the axis name and a guess at namespacing.
      const carrier = tainted ? `${prefix}--${dim}-${v}` : `${prefix}--${v}`;
      const namespacedRealized = tainted && hasVariantSelector(both, prefix, `${dim}-${v}`);
      const bareRealized = hasVariantSelector(both, prefix, v);
      const realized = tainted ? namespacedRealized : bareRealized;
      // A colliding axis realized via the ambiguous bare selector — unsafe; the
      // selector can be matched by another axis's identical value.
      const ambiguousRealization = tainted && bareRealized && !namespacedRealized;
      const isDefault = def !== null && v === def;
      // The census: a non-default value whose emitted carrier no rule selects.
      // The default is realized by the base rule and is not a gap.
      const gap = !realized && !isDefault;
      const disposition = stylingIntent ? "styling-intent" : "no-styling-intent";
      // The carrier must be one the IR says this component produces. If it is
      // not, the audit is asking about a class nothing ever carries, and the
      // finding would be about its own arithmetic rather than the corpus.
      const carrierProduced = carriers.classes.has(carrier);
      return {
        value: v,
        class: carrier,
        carrierProduced,
        realized,
        isDefault,
        gap,
        disposition,
        ...(ambiguousRealization ? { ambiguousRealization: true } : {}),
      };
    });
    const realizedCount = rows.filter((r) => r.realized).length;
    const gaps = rows.filter((r) => r.gap);
    const ambiguous = rows.filter((r) => r.ambiguousRealization);
    dims.push({
      dim,
      default: def,
      tainted,
      stylingIntent,
      values: rows,
      realizedCount,
      total: rows.length,
      fullyUnrealized: realizedCount === 0,
      gaps: gaps.map((r) => r.value),
      ...(ambiguous.length ? { ambiguousRealizations: ambiguous.map((r) => r.value) } : {}),
    });
  }
  return { component, prefix, dims, collisions, taintedAxes: [...taintedAxes].sort() };
}

// ---- run (only when executed directly; importable for the locked test) ----
const RUN_DIRECTLY = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (RUN_DIRECTLY) {
  const components = ALL_COMPONENTS().map(classify).filter((c) => c.dims.length > 0);

  const failing = []; // { component, dim, gaps, fullyUnrealized, default }
  for (const c of components) {
    for (const d of c.dims) {
      if (d.gaps.length > 0) failing.push({ component: c.component, dim: d.dim, gaps: d.gaps, fullyUnrealized: d.fullyUnrealized, default: d.default });
    }
  }

  const totalAxes = components.reduce((n, c) => n + c.dims.length, 0);
  const totalValues = components.reduce((n, c) => n + c.dims.reduce((m, d) => m + d.total, 0), 0);
  const gapValues = failing.reduce((n, f) => n + f.gaps.length, 0);
  const fullyDeadAxes = failing.filter((f) => f.fullyUnrealized);

  // Variant-class collisions (axes that share a value → namespaced emission)
  // and any realization still authored against the ambiguous bare selector.
  const collidingComponents = components
    .filter((c) => c.collisions.length > 0)
    .map((c) => ({
      component: c.component,
      taintedAxes: c.taintedAxes,
      collisions: c.collisions,
    }));
  const ambiguousFindings = [];
  for (const c of components) {
    for (const d of c.dims) {
      if (d.ambiguousRealizations?.length) {
        ambiguousFindings.push({ component: c.component, dim: d.dim, values: d.ambiguousRealizations });
      }
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const json = {
    spec: "VARIANT-STYLE-REALIZATION-AUDIT-01",
    componentsWithVariants: components.length,
    totalAxes,
    totalValues,
    failing,
    fullyUnrealizedAxes: fullyDeadAxes,
    collidingComponents,
    ambiguousRealizations: ambiguousFindings,
    components,
  };
  writeFileSync(resolve(OUT_DIR, "variant-style-matrix.json"), JSON.stringify(json, null, 2) + "\n");

  const md = [];
  md.push("# Variant/style realization matrix");
  md.push("");
  md.push("`VARIANT-STYLE-REALIZATION-AUDIT-01` — read-only. A variant VALUE is realized iff a `.<prefix>--<value>` selector exists in `<Name>.css` or `<Name>.tokens.css` (var re-scoping or direct property). The DEFAULT value is realized by the base rule and needs no per-value selector; only NON-DEFAULT values without a consuming selector are genuine gaps.");
  md.push("");
  md.push(`Components with variants: **${components.length}** · variant axes: **${totalAxes}** · values: **${totalValues}** · unrealized non-default values: **${gapValues}** · fully-dead axes: **${fullyDeadAxes.length}** · colliding components: **${collidingComponents.length}**`);
  md.push("");
  md.push("## Variant-class collisions (axes that share a value → namespaced emission)");
  md.push("");
  md.push("These axes share at least one value within the component, so a bare `.<prefix>--<value>` would be ambiguous. The codegen emits the namespaced class `.<prefix>--<axis>-<value>` for them, and realization is detected against that form. `VARIANT-CLASS-NAMESPACE-COLLISION-01`.");
  md.push("");
  if (collidingComponents.length) {
    md.push("| component | colliding value | shared by axes (now namespaced) |");
    md.push("|---|---|---|");
    for (const c of collidingComponents) {
      for (const col of c.collisions) {
        md.push(`| ${c.component} | \`${col.value}\` | ${col.axes.map((a) => `\`${a}\``).join(" × ")} |`);
      }
    }
  } else md.push("_none_");
  md.push("");
  if (ambiguousFindings.length) {
    md.push("### ⚠ Ambiguous realization — colliding axis realized via a bare selector");
    md.push("");
    md.push("A colliding axis is realized through the ambiguous `.<prefix>--<value>` form instead of `.<prefix>--<axis>-<value>`. This selector can be matched by another axis's identical value and must be rewritten to the namespaced form.");
    md.push("");
    md.push("| component | axis | values |");
    md.push("|---|---|---|");
    for (const f of ambiguousFindings) md.push(`| ${f.component} | \`${f.dim}\` | ${f.values.join(", ")} |`);
    md.push("");
  }
  md.push("## Failing — declared variant axis with no realization (fully-dead axes)");
  md.push("");
  if (fullyDeadAxes.length) {
    md.push("| component | axis | values (all unrealized) | default |");
    md.push("|---|---|---|---|");
    for (const f of fullyDeadAxes) md.push(`| ${f.component} | \`${f.dim}\` | ${f.gaps.join(", ")} | ${f.default ?? "—"} |`);
  } else md.push("_none_");
  md.push("");
  md.push("## Review — partially-realized axes (some non-default values lack a selector)");
  md.push("");
  const partial = failing.filter((f) => !f.fullyUnrealized);
  if (partial.length) {
    md.push("| component | axis | unrealized non-default values |");
    md.push("|---|---|---|");
    for (const f of partial) md.push(`| ${f.component} | \`${f.dim}\` | ${f.gaps.join(", ")} |`);
  } else md.push("_none_");
  md.push("");
  md.push("## Full matrix (per component)");
  md.push("");
  for (const c of components) {
    md.push(`### ${c.component}  \`.${c.prefix}\``);
    md.push("");
    md.push("| axis | default | values (✓ realized · ✗ gap · ·default) |");
    md.push("|---|---|---|");
    for (const d of c.dims) {
      const cells = d.values.map((v) => `${v.value}${v.realized ? "✓" : v.isDefault ? "·(default)" : "✗"}`).join(" ");
      md.push(`| \`${d.dim}\` | ${d.default ?? "—"} | ${cells} |`);
    }
    md.push("");
  }
  writeFileSync(resolve(OUT_DIR, "variant-style-matrix.md"), md.join("\n") + "\n");

  console.log(`\nVARIANT-STYLE-REALIZATION-AUDIT-01 — ${components.length} components with variants, ${totalAxes} axes, ${totalValues} values`);
  console.log(`\nFully-dead axes (declared, zero realization): ${fullyDeadAxes.length}`);
  for (const f of fullyDeadAxes) console.log(`  - ${f.component}.${f.dim}: ${f.gaps.join(", ")} (default ${f.default ?? "?"})`);
  console.log(`\nPartially-realized axes (non-default values without a selector): ${partial.length}`);
  for (const f of partial) console.log(`  - ${f.component}.${f.dim}: ${f.gaps.join(", ")}`);
  console.log(`\nVariant-class collisions (axes namespaced): ${collidingComponents.length} component(s)`);
  for (const c of collidingComponents) console.log(`  - ${c.component}: ${c.taintedAxes.join(", ")} (collide on ${c.collisions.map((x) => x.value).join(", ")})`);
  if (ambiguousFindings.length) {
    console.log(`\n⚠ Ambiguous realizations (colliding axis via bare selector): ${ambiguousFindings.length}`);
    for (const f of ambiguousFindings) console.log(`  - ${f.component}.${f.dim}: ${f.values.join(", ")}`);
  }
  console.log(`\nReport: ${resolve(OUT_DIR, "variant-style-matrix.md")}`);

  // --- inverse ledger (RAIL-WEB-STYLE-CARRIER-REACHABILITY-01) --------------
  // One row per non-default variant value whose emitted carrier no rule
  // selects. Ratcheted like the sibling styling rails so new dead knobs cannot
  // land silently and burned ones cannot linger as fiction. The `disposition`
  // rides along as triage — `no-styling-intent` marks the values most likely to
  // be structural/behavioral (placement, `as`, politeness) rather than visual
  // debt — and it decides NOTHING about whether the row exists.
  const gapRows = [];
  for (const c of components) {
    for (const d of c.dims) {
      for (const row of d.values) {
        if (!row.gap) continue;
        gapRows.push({
          component: c.component,
          axis: d.dim,
          value: row.value,
          carrier: row.class,
          disposition: row.disposition,
        });
      }
    }
  }

  if (process.argv.includes("--reseed")) {
    const prior = existsSync(LEDGER_PATH)
      ? new Map(
          (JSON.parse(readFileSync(LEDGER_PATH, "utf8")).gaps ?? []).map((g) => [unrealizedId(g), g]),
        )
      : new Map();
    writeFileSync(
      LEDGER_PATH,
      JSON.stringify(
        {
          $comment: INVERSE_LEDGER_COMMENT,
          gaps: gapRows.map((r) => {
            const p = prior.get(unrealizedId(r));
            return {
              ...r,
              spec: p?.spec ?? "RAIL-WEB-STYLE-CARRIER-REACHABILITY-01",
              note:
                p?.note ??
                "Censused at the predicate change; not yet adjudicated. Paint it, or establish that the axis is structural/behavioral and retire the visual claim.",
            };
          }),
        },
        null,
        2,
      ) + "\n",
    );
    console.log(`[variant-realization] reseeded ${gapRows.length} ledger entr(ies).`);
  }

  const ledger = loadLedger(LEDGER_PATH, ["component", "axis", "value", "carrier"]);
  const { unledgered, stale } = diffLedger({
    current: gapRows,
    ledger,
    idOf: unrealizedId,
  });
  process.exit(
    reportRatchet({
      label: "variant-realization",
      current: gapRows,
      unledgered,
      stale,
      idOf: unrealizedId,
    }),
  );
}
