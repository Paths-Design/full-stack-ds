#!/usr/bin/env node
/**
 * Variant slot redirection migration.
 *
 * Converts the variant-keyed slot pattern in component tokens/styles to
 * the slot-redirection pattern documented in
 * docs/architecture/design/box-model-primitive.md.
 *
 * Before (Button):
 *   tokens.json: button.color.background.{default, primary, secondary, ...}
 *   styles.json: "--primary": { background-color: { resolvesTo: button.color.background.primary } }
 *
 * After:
 *   tokens.json: button.color.background.default (canonical)
 *   styles.json: "--primary": { button.color.background.default: { resolvesTo: <semantic.path the .primary slot used to point to> } }
 *
 * The script runs in two phases per component:
 *
 *   Phase 1 — identify slot families.
 *     A "family" is a set of slots sharing a prefix path with different
 *     terminal segments. e.g. `button.color.background.{default, primary,
 *     secondary, hover, disabled}` is one family. A family is migratable
 *     iff it has a `default` sibling, which is treated as the canonical.
 *
 *     Families without a `default` (e.g. `switch.size.{sm,md,lg}.track.width`)
 *     are reported and skipped. Human creates the canonical name
 *     (or renames `md` → `default`) and reruns.
 *
 *   Phase 2 — rewrite styles.json entries that read the variant slots
 *     and remove the variant slots from tokens.json.
 *
 *     For each variant slot in a migratable family (any sibling that
 *     isn't the canonical), the script:
 *     - finds every styles.json entry with `resolvesTo: "<variant slot>"`
 *     - replaces it with a slot-path entry that redefines the canonical:
 *       `{ <canonical slot>: { resolvesTo: <variant slot's resolvesTo>, fallback: <its fallback> } }`
 *     - drops the variant slot from tokens.json
 *
 * Heuristic limits:
 *   - The script only touches color / size / text / motion families that
 *     have a clear `.default` canonical. Families with anatomy-part
 *     infixes (e.g. `switch.color.track.background` vs `...checked`)
 *     are handled — the family's prefix is everything before the last
 *     segment, so the canonical is `switch.color.track.background`
 *     and the variants are `switch.color.track.background.{checked, disabled}`.
 *   - State-keyed terminal segments (hover/active/focus/disabled/checked)
 *     get the same treatment — those redirections land at state selectors
 *     in styles.json (which it already does, just at a different key).
 *
 * Usage:
 *   node scripts/migrate-variants-to-styles.mjs                       # all components
 *   node scripts/migrate-variants-to-styles.mjs Button Switch         # specific
 *   node scripts/migrate-variants-to-styles.mjs --dry-run             # report only
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const COMPONENTS_DIR = path.join(REPO_ROOT, "packages", "ds-contracts", "components");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ONLY = new Set(args.filter((a) => !a.startsWith("--")));

// Last-segment names treated as canonical, ordered by preference. The
// first hit in a family wins:
//   - `default` is the kind/state canonical (Button's primary/secondary
//     kinds canonicalize to `default`)
//   - `medium` is the size canonical (Button's small/medium/large sizes
//     canonicalize to `medium`)
//   - `md` is the legacy size canonical (some components author
//     `sm/md/lg` instead of `small/medium/large`). Treated as canonical
//     when no `default` or `medium` exists.
//   - `primary` is the *fallback* canonical for families that don't have
//     an explicit `default`, `medium`, or `md`. By convention in this
//     codebase, when a family looks like `<prefix>.color.foreground.{primary,
//     secondary, ...}`, `primary` IS the conceptual default — there's no
//     toggle between primary and something else; `primary` just names
//     the semantic layer. Six components (Details, OTP, Postcard,
//     Shuttle, Text, Truncate, ...) use this convention.
//   - `lg` is a last-resort canonical for families that use `sm/md/lg`
//     but where the contract authors `lg` as the default consumer
//     (Skeleton uses `skeleton.radius.lg` in its root styles even
//     though `md` exists as a member). Pick `lg` only when nothing
//     earlier matches.
//
// All non-`default`/`medium` canonicals are CONDITIONAL: they only count
// as canonical when no earlier-preferred name exists in the same family.
// e.g. Button's `--primary` kind variant is NOT canonical because Button
// has an explicit `default` already.
const CANONICAL_KEYS = ["default", "medium", "md", "primary", "lg"];

// Recognized VARIANT suffixes — last-segment names that mark a family
// member as a kind/size variant the script should migrate into a slot
// redirection at the variant selector scope. A family is treated as a
// variant family only when at least one non-canonical member's last
// segment is in this set. Co-prefixed slots without a variant suffix
// are independent concepts (e.g. `button.size.radius` and
// `button.size.border` aren't variants of each other).
//
// IMPORTANT: state names (hover, active, focus, disabled, checked,
// pressed, selected, indeterminate, on, off, etc.) are NOT in this
// set. State slots are first-class named siblings of the default slot
// — `button.color.background.{default, hover, active, disabled}` are
// FOUR parallel slots, not one canonical with three state-scope
// redirections. The state pseudo-class rules in `.css`
// (e.g. `.button:hover { background-color: var(--...-hover); }`) read
// the state-specific slot. Variants redefine ALL state slots at
// variant scope. See docs/architecture/design/box-model-primitive.md state-layering rule.
const VARIANT_SUFFIXES = new Set([
  // size variants
  "small", "medium", "large", "xs", "sm", "md", "lg", "xl",
  // kind variants
  "primary", "secondary", "tertiary", "quaternary", "destructive",
  "ghost", "outline", "link", "danger", "brand", "subtle", "default",
  // category-of-message variants
  "error", "warning", "success", "info",
]);

// State suffixes that the script leaves alone — these stay as
// first-class siblings of the default slot. The structural state
// pseudo-class rule reads the state-specific slot; variants redefine
// all state slots at variant scope.
const STATE_SUFFIXES = new Set([
  "hover", "active", "focus", "focus-visible", "disabled",
  "checked", "indeterminate", "selected", "pressed", "expanded",
  "loading", "on", "off",
]);

function listComponents() {
  return readdirSync(COMPONENTS_DIR)
    .filter((n) => statSync(path.join(COMPONENTS_DIR, n)).isDirectory())
    .sort();
}

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf-8"));
}

function writeJson(p, data) {
  writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/**
 * Group slot keys into families. A family is identified by everything
 * EXCEPT the last segment of the dotted path. A family's canonical is
 * picked in two passes:
 *
 *   1. Collect every member by prefix.
 *   2. For each family, pick the canonical by walking CANONICAL_KEYS in
 *      order and choosing the first member whose last segment matches.
 *      `default` and `medium` beat `primary`; if a family has neither,
 *      and a member's last segment is `primary`, that's the canonical.
 *
 * This two-pass approach catches the "primary is the conceptual default"
 * convention without breaking Button (where `--primary` is one of many
 * kind variants, and `default` exists as the real canonical).
 *
 * Returns: Map<family-prefix, { canonical: slot-name | null, variants: slot-name[] }>
 */
function groupByFamily(tokens, cssPrefix) {
  // Pass 1: bucket every member by prefix.
  const allMembers = new Map(); // prefix → string[]
  for (const key of Object.keys(tokens)) {
    if (!key.startsWith(`${cssPrefix}.`)) continue; // skip box-model.* and others
    const segments = key.split(".");
    if (segments.length < 3) continue; // need at least <prefix>.<dim>.<key>
    const prefix = segments.slice(0, -1).join(".");
    let bucket = allMembers.get(prefix);
    if (!bucket) {
      bucket = [];
      allMembers.set(prefix, bucket);
    }
    bucket.push(key);
  }

  // Pass 2: pick canonical per family by CANONICAL_KEYS preference order.
  const families = new Map();
  for (const [prefix, members] of allMembers.entries()) {
    const lastSegments = new Map(members.map((m) => [m.split(".").pop(), m]));
    let canonical = null;
    for (const candidate of CANONICAL_KEYS) {
      if (lastSegments.has(candidate)) {
        canonical = lastSegments.get(candidate);
        break;
      }
    }
    // Exclude state-suffix members from the variant set. State slots
    // are first-class siblings of the default — they don't get rewritten
    // into slot redirections; the structural state pseudo-class rules
    // in .css read them directly.
    const variants = (
      canonical ? members.filter((m) => m !== canonical) : members.slice()
    ).filter((m) => !STATE_SUFFIXES.has(m.split(".").pop()));
    families.set(prefix, { canonical, variants });
  }
  return families;
}

/**
 * Walk styles.json looking for entries whose `resolvesTo` matches any of
 * the variant slot paths in `variantSet`. Returns a list of mutations:
 *   { selector, property, oldEntry, variantSlot, canonicalSlot, kind }
 *
 * `kind` is "variant" for the normal case (entry reads a variant slot;
 * rewrite to a slot-path redefinition of the canonical pointing at the
 * variant's resolution), or "canonical-noop" for the symmetry case:
 * entries at a variant-shaped selector (e.g. `--medium` when canonical
 * is `<prefix>.medium`) that read the canonical via a CSS-property key.
 * Those rewrites preserve the slot's existing root resolution but at the
 * variant scope, so brand authors see all sibling sizes in the same
 * file (.tokens.css) and can override per-variant uniformly.
 */
function findStylesUsages(styles, variantSet, canonicalBySlot, canonicalSet) {
  const mutations = [];
  for (const [selectorKey, block] of Object.entries(styles)) {
    if (!block || typeof block !== "object") continue;
    for (const [property, entry] of Object.entries(block)) {
      if (!entry || typeof entry !== "object") continue;
      const target = entry.resolvesTo;
      if (typeof target !== "string") continue;

      if (variantSet.has(target)) {
        // Variant case: entry reads a variant slot, rewrite to redefine
        // the canonical at this selector.
        mutations.push({
          selector: selectorKey,
          property,
          oldEntry: entry,
          variantSlot: target,
          canonicalSlot: canonicalBySlot.get(target),
          kind: "variant",
        });
        continue;
      }

      // Canonical-noop case: entry reads the canonical via a CSS-property
      // key AND the selector is shaped like a variant of the canonical's
      // family. Promote to a slot-path redefinition so the selector
      // lands in tokens.css alongside its variant siblings.
      if (
        canonicalSet.has(target) &&
        !property.includes(".") &&
        isCanonicalSelectorForSlot(selectorKey, target)
      ) {
        mutations.push({
          selector: selectorKey,
          property,
          oldEntry: entry,
          variantSlot: target, // same slot — no rename
          canonicalSlot: target,
          kind: "canonical-noop",
        });
      }
    }
  }
  return mutations;
}

/**
 * Return true when `selectorKey` is the variant form of the canonical's
 * own suffix. e.g. selector `--medium` matches canonical slot
 * `button.size.padding-block.medium` (both end in `medium`).
 *
 * Conservative: only matches when the selector is a single BEM variant
 * modifier (`--<name>`) AND the name equals the canonical's last segment.
 * Skips state selectors (hover/active/disabled), compound selectors,
 * and anatomy-part selectors — the canonical-noop concern only applies
 * to value-variant selectors at the same conceptual axis as the
 * canonical's own naming (size vs size, kind vs kind, etc.).
 */
function isCanonicalSelectorForSlot(selectorKey, canonicalSlot) {
  if (!selectorKey.startsWith("--")) return false;
  if (/[\s:[]/.test(selectorKey)) return false; // skip compounds / pseudos
  const selectorVariant = selectorKey.slice(2);
  const canonicalSuffix = canonicalSlot.split(".").pop();
  return selectorVariant === canonicalSuffix;
}

/**
 * Apply mutations to styles.json. Returns the mutated styles object.
 *
 * For each mutation:
 *   - At the selector, REMOVE the property→{resolvesTo:variant} entry
 *   - At the same selector, ADD a property→entry where:
 *       property = the canonical slot path (e.g. "button.color.background.default")
 *       entry = { resolvesTo: <the variant slot's resolvesTo from tokens.json>,
 *                 fallback: <same> }
 *   - If multiple mutations at the same selector redefine the SAME
 *     canonical slot, the last one wins (with a warning). This shouldn't
 *     happen in well-formed contracts but the script is defensive.
 */
function applyStylesMutations(styles, mutations, tokens) {
  const out = JSON.parse(JSON.stringify(styles)); // deep clone
  const warnings = [];
  for (const m of mutations) {
    const block = out[m.selector];
    if (!block) continue;
    // Remove the old property→entry. For "variant" mutations this removes
    // the CSS-property read of the variant slot; for "canonical-noop"
    // mutations this removes the CSS-property read of the canonical so we
    // can replace it with a slot-path redefinition.
    delete block[m.property];

    // The new entry's resolution comes from the variant slot's definition
    // in tokens.json. For canonical-noop mutations, m.variantSlot === the
    // canonical slot, so we read the canonical's own resolution and
    // redefine the slot to the same value at this selector's scope —
    // a no-op redefinition that puts the selector in tokens.css for
    // symmetry with its sibling variants.
    const variantDef = tokens[m.variantSlot];
    if (!variantDef) continue;
    const newEntry = {};
    if (typeof variantDef.resolvesTo === "string") {
      newEntry.resolvesTo = variantDef.resolvesTo;
      if (typeof variantDef.fallback === "string") {
        newEntry.fallback = variantDef.fallback;
      }
    } else if (typeof variantDef.literal === "string") {
      newEntry.literal = variantDef.literal;
      newEntry.platforms = ["web", "ios", "android"];
    }
    if (block[m.canonicalSlot] !== undefined) {
      warnings.push(
        `${m.selector}: ${m.canonicalSlot} already redefined — last assignment wins`,
      );
    }
    block[m.canonicalSlot] = newEntry;
  }
  return { styles: out, warnings };
}

function migrateComponent(name) {
  const contractPath = path.join(COMPONENTS_DIR, name, `${name}.contract.json`);
  if (!existsSync(contractPath)) return { status: "missing-contract", name };
  const contract = readJson(contractPath);
  const cssPrefix = contract.cssPrefix ?? name.toLowerCase();

  const tokensPath = path.join(COMPONENTS_DIR, name, `${name}.tokens.json`);
  const stylesPath = path.join(COMPONENTS_DIR, name, `${name}.styles.json`);
  if (!existsSync(tokensPath) || !existsSync(stylesPath)) {
    return { status: "missing-sidecars", name };
  }
  const tokens = readJson(tokensPath);
  const styles = readJson(stylesPath);

  const families = groupByFamily(tokens, cssPrefix);

  const migratable = [];
  const skipped = [];
  const canonicalBySlot = new Map(); // variant slot → canonical slot
  const variantSet = new Set();
  const canonicalSet = new Set(); // every migrated family's canonical

  // First pass: variant families that still have variants to migrate.
  for (const [prefix, fam] of families.entries()) {
    // A "family" needs at least 2 sibling members at the same prefix to
    // be considered. Single-member entries (e.g. button.text.weight,
    // button.motion.duration.fast) are not variant families even though
    // they share a prefix structure — they're just regular slots.
    const totalMembers =
      fam.variants.length + (fam.canonical !== null ? 1 : 0);
    if (totalMembers < 2) continue;
    if (fam.variants.length === 0) continue;
    // Family must contain at least one recognized variant suffix.
    // Otherwise the co-prefixed slots are independent concepts.
    const hasVariantSuffix = fam.variants.some((v) =>
      VARIANT_SUFFIXES.has(v.split(".").pop()),
    );
    if (!hasVariantSuffix) continue;
    if (!fam.canonical) {
      skipped.push({ prefix, variants: fam.variants });
      continue;
    }
    migratable.push({ prefix, canonical: fam.canonical, variants: fam.variants });
    canonicalSet.add(fam.canonical);
    for (const v of fam.variants) {
      canonicalBySlot.set(v, fam.canonical);
      variantSet.add(v);
    }
  }

  // Second pass: register every canonical-named slot in tokens.json as a
  // potential canonical-noop target — even when its sibling variants
  // were already dropped by a prior script run. This is what makes the
  // script idempotent for the canonical-noop symmetry: re-running after
  // variants are gone still sees the canonical slot and can promote a
  // `--medium`-style selector reading it into a tokens.css redefinition.
  for (const key of Object.keys(tokens)) {
    if (!key.startsWith(`${cssPrefix}.`)) continue;
    const last = key.split(".").pop();
    if (CANONICAL_KEYS.includes(last)) {
      canonicalSet.add(key);
    }
  }

  // Even when no variants remain to migrate (re-run on already-migrated
  // contracts), the canonical-noop pass may still have work to do —
  // promoting `--medium`-style selectors that read the canonical via a
  // CSS-property key into slot-path redefinitions for symmetry. Only
  // bail when BOTH variantSet and canonicalSet are empty.
  if (variantSet.size === 0 && canonicalSet.size === 0) {
    return { status: "nothing-to-migrate", name, skipped };
  }

  const mutations = findStylesUsages(
    styles,
    variantSet,
    canonicalBySlot,
    canonicalSet,
  );

  // The set of variant slots that have at least one styles.json reference.
  // Slots referenced by nothing are still removed from tokens.json (they
  // were dead code in the variant pattern). Canonical-noop mutations
  // don't count as "references" for orphan detection — they read the
  // canonical, not a variant.
  const referencedVariants = new Set(
    mutations.filter((m) => m.kind === "variant").map((m) => m.variantSlot),
  );
  const orphans = [...variantSet].filter((v) => !referencedVariants.has(v));
  const canonicalNoopCount = mutations.filter(
    (m) => m.kind === "canonical-noop",
  ).length;

  const { styles: newStyles, warnings } = applyStylesMutations(
    styles,
    mutations,
    tokens,
  );

  // Drop variant slots from tokens.json
  const newTokens = { ...tokens };
  for (const v of variantSet) delete newTokens[v];

  // Skip writes when nothing changed (idempotent re-runs should be no-ops).
  const changed = mutations.length > 0 || variantSet.size > 0;
  if (!DRY_RUN && changed) {
    writeJson(tokensPath, newTokens);
    writeJson(stylesPath, newStyles);
  }

  return {
    status: "migrated",
    name,
    families: migratable.length,
    mutations: mutations.length,
    canonicalNoops: canonicalNoopCount,
    droppedSlots: variantSet.size,
    orphans,
    skipped,
    warnings,
  };
}

const all = listComponents().filter((n) => ONLY.size === 0 || ONLY.has(n));
const results = all.map(migrateComponent);

let totalMigrated = 0;
let totalSkipped = 0;
let totalOrphans = 0;
for (const r of results) {
  switch (r.status) {
    case "migrated":
      totalMigrated++;
      console.log(
        `  ✓ ${r.name.padEnd(16)} ${r.families} family/families  ${r.mutations} styles entry/entries rewritten  ${r.droppedSlots} slot(s) dropped  ${r.canonicalNoops} canonical-noop(s)`,
      );
      if (r.orphans.length > 0) {
        totalOrphans += r.orphans.length;
        console.log(
          `             orphans (dropped, no styles ref): ${r.orphans.join(", ")}`,
        );
      }
      if (r.warnings.length > 0) {
        for (const w of r.warnings) console.log(`             ⚠ ${w}`);
      }
      if (r.skipped.length > 0) {
        for (const s of r.skipped) {
          totalSkipped++;
          console.log(
            `             ⚠ skipped family (no .default canonical): ${s.prefix}.{${s.variants.map((v) => v.split(".").pop()).join(",")}}`,
          );
        }
      }
      break;
    case "nothing-to-migrate":
      console.log(`  · ${r.name.padEnd(16)} no variant slot families found`);
      if (r.skipped.length > 0) {
        for (const s of r.skipped) {
          totalSkipped++;
          console.log(
            `             ⚠ skipped family (no .default canonical): ${s.prefix}.{${s.variants.map((v) => v.split(".").pop()).join(",")}}`,
          );
        }
      }
      break;
    case "missing-contract":
    case "missing-sidecars":
      console.log(`  · ${r.name.padEnd(16)} (${r.status})`);
      break;
  }
}

console.log(
  `\nDone${DRY_RUN ? " (dry-run, no files written)" : ""}.  ` +
    `migrated=${totalMigrated}  skipped-families=${totalSkipped}  ` +
    `orphan-slots-dropped=${totalOrphans}  total=${results.length}`,
);
