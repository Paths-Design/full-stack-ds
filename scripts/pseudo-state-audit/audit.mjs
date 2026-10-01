#!/usr/bin/env node
import { getCssPrefix } from "../../packages/ds-codegen/dist/contract.js";
/**
 * PSEUDO-STATE-STYLING-RAIL-01 — pseudo/state styling realization audit.
 *
 * READ-ONLY. The state counterpart of the variant-style audit
 * (`scripts/variant-style-audit/audit.mjs`). For every component it derives the
 * declared STATE obligations from the contract's `states.dimensions` (categories
 * interaction / availability / selection / validation / visibility) plus the
 * empty-field input-prompt pseudo for text inputs, and checks whether the
 * generated React CSS realizes each via the SAME vocabulary the codegen emits:
 * a derivable pseudo-class, an ARIA-attribute selector, a BEM modifier, or the
 * `:has(.<prefix>__input:<state>)` wrapper used by input-backed components.
 *
 * It changes no contract, codegen, emitter, generated artifact, or visual
 * style — it only classifies and reports the gaps for later realization batches.
 *
 * Realization vocabulary (mirrors `DERIVABLE_STATE_TO_PSEUDO` in ir.ts and the
 * non-derivable BEM fallback the emitter uses):
 *   - derivable interaction/availability/selection states → `.<prefix><pseudo>`
 *     (e.g. hover → `:hover`, focus → `:focus-visible`, disabled → `:disabled`,
 *     checked → `:checked`); ARIA-derived → `[aria-expanded="true"]` etc.
 *   - input-backed components realize the inner-input state on the host via
 *     `:has(.<prefix>__input:<pseudo>)`.
 *   - non-derivable states (validation valid/invalid, visibility open) realize
 *     via a BEM modifier `.<prefix>--<value>` (optionally on a compound, or as a
 *     part modifier `.<prefix>__<part>--<value>`).
 *
 * False-positive controls (the obligation is NOT a gap when):
 *   - the value is the dimension's `initial` (base-covered, no selector);
 *   - the value is channel-driven (`derivesFrom[v].channel`) — surfaced via a
 *     data-state/aria binding, not a CSS class;
 *   - the value's interaction category is suppressed by an active availability
 *     dimension (`suppresses.categories`);
 *   - the dimension is a plain interaction axis with no authored styling intent;
 *   - the component root declares `focus.strategy = "none"` (no focus styling
 *     obligation on the root).
 *
 * Usage:  node scripts/pseudo-state-audit/audit.mjs
 * Output: docs/internal/pseudo-state-audit/pseudo-state-matrix.{json,md}
 */
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { diffLedger, loadLedger, reportRatchet } from "../lib/ledger-ratchet.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const CONTRACTS = resolve(REPO, "packages/ds-contracts/components");
const REACT = resolve(REPO, "packages/ds-react/src/components");
const OUT_DIR = resolve(REPO, "docs/internal/pseudo-state-audit");
const LEDGER_PATH = resolve(HERE, "known-gaps.json");

/** Ledger identity for a state obligation gap. */
export function pseudoGapId(row) {
  return `${row.component} ${row.dim} ${row.value}`;
}

const readJSON = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
const readText = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

export const ALL_COMPONENTS = () =>
  readdirSync(CONTRACTS)
    .filter((d) => statSync(resolve(CONTRACTS, d)).isDirectory())
    .filter((d) => existsSync(resolve(CONTRACTS, d, `${d}.contract.json`)))
    .sort();

/**
 * The codegen's derivable state → CSS selector table. Mirrors
 * `DERIVABLE_STATE_TO_PSEUDO` in packages/ds-codegen/src/ir.ts. A state value
 * in this table is realized by `.<prefix><selector>`; anything else is a
 * non-derivable BEM-modifier state.
 */
export const DERIVABLE_STATE_TO_PSEUDO = {
  hover: ":hover",
  focus: ":focus-visible",
  "focus-visible": ":focus-visible",
  "focus-within": ":focus-within",
  active: ":active",
  visited: ":visited",
  disabled: ":disabled",
  "read-only": ":read-only",
  checked: ":checked",
  indeterminate: ":indeterminate",
  expanded: '[aria-expanded="true"]',
  pressed: '[aria-pressed="true"]',
  selected: '[aria-selected="true"]',
};

/** Component identity comes from the contract, not optional root slot declarations. */
function cssPrefix(component) {
  return getCssPrefix(readJSON(resolve(CONTRACTS, component, `${component}.contract.json`)));
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Is a derivable state's pseudo/ARIA selector present in the CSS? The codegen
 * emits `.<prefix>:hover` (often nested as `&:hover`) and
 * `.<prefix>[aria-expanded="true"]`. We look for the prefix-anchored form OR,
 * for input-backed components, the `:has(.<prefix>__input:<pseudo>)` wrapper.
 * The pseudo itself (e.g. `:hover`) anywhere on a prefix-qualified selector is
 * sufficient evidence of realization — the audit credits any valid form (A3).
 */
function hasDerivableRealization(cssText, prefix, selector) {
  // selector is `:hover` / `:focus-visible` / `[aria-expanded="true"]` / etc.
  // 1. Prefix-anchored: `.prefix:hover` or `.prefix__part:hover` or nested `&:hover`.
  //    A pseudo on any prefix-scoped selector counts; an attribute selector
  //    `[aria-expanded="true"]` likewise. We require the pseudo/attr token to
  //    appear at least once in the component's stylesheet.
  if (selector.startsWith("[")) {
    // ARIA attribute selector — match the attribute name+value verbatim.
    return new RegExp(escRe(selector)).test(cssText);
  }
  // Pseudo-class. Match the pseudo token bounded so `:focus` ≠ `:focus-visible`.
  const re = new RegExp(`${escRe(selector)}(?![A-Za-z-])`);
  if (!re.test(cssText)) return false;
  // Must be prefix-qualified or inside a `:has(.prefix__…)` / `&:` nested rule.
  // All component CSS is prefix-scoped, so presence of the pseudo token is a
  // strong signal; tighten by requiring the prefix to appear in the file.
  return new RegExp(`\\.${escRe(prefix)}`).test(cssText);
}

/** Is a `:has(.<prefix>__input:<pseudo>)` input-backed wrapper present? */
function hasInputBackedRealization(cssText, prefix, pseudo) {
  if (!pseudo.startsWith(":")) return false;
  const re = new RegExp(`:has\\(\\.${escRe(prefix)}__input${escRe(pseudo)}(?![A-Za-z-])`);
  return re.test(cssText);
}

/**
 * Is a non-derivable state realized via a BEM modifier? The codegen emits
 * `.<prefix>--<value>` (possibly on a compound `.<prefix>--<value> .<prefix>__part`)
 * or a part modifier `.<prefix>__<part>--<value>`. Boundary-safe so
 * `--valid` ≠ `--validating`.
 */
function hasBemModifierRealization(cssText, prefix, value) {
  const v = escRe(value);
  // `.prefix--value`  or  `.prefix__anything--value`
  const re = new RegExp(`\\.${escRe(prefix)}(?:__[A-Za-z0-9_-]+)?--${v}(?![A-Za-z0-9_-])`);
  return re.test(cssText);
}

/**
 * A dimension may bind a value to an explicit ARIA attribute via
 * `a11y.attribute` + `a11y.values` (e.g. selection.checked → aria-checked=true).
 * That contract-declared attribute is the authoritative realization form for
 * that value — the codegen emits `[<attribute>="<ariaValue>"]`, which takes
 * priority over the static DERIVABLE_STATE_TO_PSEUDO default. Returns the
 * `[attr="val"]` selector fragment, or null when the value has no a11y binding.
 */
function ariaSelectorFor(a11y, value) {
  if (!a11y?.attribute) return null;
  const ariaValue = a11y.values?.[value];
  if (ariaValue === undefined) return null;
  return `[${a11y.attribute}="${ariaValue}"]`;
}

/**
 * The expected CSS realization for a state value, expressed as the codegen
 * would emit it. Used for the report's "expected" column and to pick which
 * detector applies. A contract-declared ARIA attribute wins over the table.
 */
export function expectedRealization(prefix, value, inputBacked, a11y) {
  const aria = ariaSelectorFor(a11y, value);
  if (aria) {
    if (inputBacked) return `:has(.${prefix}__input${aria})`;
    return `.${prefix}${aria}`;
  }
  const pseudo = DERIVABLE_STATE_TO_PSEUDO[value];
  if (pseudo) {
    if (inputBacked && pseudo.startsWith(":")) return `:has(.${prefix}__input${pseudo})`;
    return `.${prefix}${pseudo}`;
  }
  return `.${prefix}--${value}`;
}

/**
 * Native HTML state attributes some components style directly (e.g. the
 * `<details open>` attribute → `[open]`, a disabled control → `[disabled]`).
 * These are a valid realization form distinct from the BEM modifier or the
 * ARIA attribute, so the audit must credit them too.
 */
const NATIVE_STATE_ATTRS = {
  open: "[open]",
  disabled: "[disabled]",
  checked: "[checked]",
  "read-only": "[readonly]",
  hidden: "[hidden]",
};

/**
 * Detect realization of a single state value across all valid forms (A3).
 * Returns true if ANY of: a contract-declared ARIA-attribute selector, a native
 * HTML state attribute, the derivable pseudo/ARIA default, the input-backed
 * `:has` wrapper, or a non-derivable BEM modifier is present.
 */
function detectRealization(cssText, prefix, value, inputBacked, a11y) {
  // Contract-declared ARIA attribute (authoritative): `[attr="val"]`, possibly
  // wrapped in `:has(.prefix__input[attr="val"])` for input-backed hosts.
  const aria = ariaSelectorFor(a11y, value);
  if (aria) {
    if (new RegExp(escRe(aria)).test(cssText)) return true;
    if (inputBacked && new RegExp(`:has\\(\\.${escRe(prefix)}__input${escRe(aria)}`).test(cssText)) return true;
    // fall through — the value may ALSO be realized via a pseudo/BEM form.
  }
  // Native HTML state attribute (e.g. `[open]`).
  const native = NATIVE_STATE_ATTRS[value];
  if (native && new RegExp(escRe(native)).test(cssText)) return true;
  // Non-native hosts carry `disabled` as the ARIA attribute form — the same
  // host-aware lowering the emitter applies (expandOptionsForContract) and
  // the suppression guard emits (suppressionGuardFor). `:disabled` only
  // matches native form controls, so crediting only that form would mark
  // every div/span/a-host realization a gap while its honest selector sits
  // right there in the CSS. The attribute must carry the RESTYLE, not merely
  // appear inside a `:not(…)` suppression guard — Chip's hover guard mentions
  // the attribute while its disabled restyle is genuinely missing, and
  // crediting the guard would green a real gap (the locked test pins this).
  if (
    value === "disabled" &&
    /(?<!:not\()\[aria-disabled="true"\]/.test(cssText)
  ) {
    return true;
  }
  const pseudo = DERIVABLE_STATE_TO_PSEUDO[value];
  if (pseudo) {
    if (inputBacked && hasInputBackedRealization(cssText, prefix, pseudo)) return true;
    if (hasDerivableRealization(cssText, prefix, pseudo)) return true;
    // A pseudo-state value may also be authored as a BEM modifier
    // (e.g. Tabs `selected` realized as `.tabs__tab--active`); credit that too.
    return hasBemModifierRealization(cssText, prefix, value);
  }
  return hasBemModifierRealization(cssText, prefix, value);
}

const INTERACTION_PSEUDO_CATEGORIES = new Set(["interaction"]);

/**
 * An input-backed component renders a native `<input>` part and styles the host
 * off the inner input's pseudo-state (Switch/Checkbox). Detected structurally:
 * an `input` anatomy part exists.
 */
function isInputBacked(contract) {
  const parts = contract.anatomy?.parts ?? [];
  return Array.isArray(parts) && parts.includes("input");
}

/** Is this a text-input component subject to the empty-field prompt obligation? */
function isTextInput(contract, component) {
  // Heuristic mirroring the codegen: a native text input part, not a checkbox/radio.
  const dom = JSON.stringify(contract.anatomy?.dom ?? {});
  const hasTextInput = /"tag":\s*"input"/.test(dom) && !/"type":\s*"(checkbox|radio)"/.test(dom);
  return hasTextInput && (component === "Input" || component === "TextField" || /field|input/i.test(component));
}

export function classify(component) {
  const contract = readJSON(resolve(CONTRACTS, component, `${component}.contract.json`)) ?? {};
  const prefix = cssPrefix(component);
  const css = readText(resolve(REACT, component, `${component}.css`));
  const tokensCss = readText(resolve(REACT, component, `${component}.tokens.css`));
  const both = css + "\n" + tokensCss;

  const dimsObj = contract.states?.dimensions ?? {};
  const inputBacked = isInputBacked(contract);
  const focusStrategyNone = contract.focus?.strategy === "none";

  // Which interaction categories are suppressed when an availability dimension
  // is active (e.g. availability=disabled suppresses interaction styling).
  const suppressedCategories = new Set();
  for (const dim of Object.values(dimsObj)) {
    for (const cat of dim?.suppresses?.categories ?? []) suppressedCategories.add(cat);
  }

  // Styling intent (false-positive control, spec invariant): an INTERACTION
  // dimension's values are only candidate gaps when the component authors SOME
  // interaction-state styling — any `:hover`/`:focus(-visible)`/`:active`
  // selector in the generated CSS, OR a state key in styles.json. A component
  // that styles no interaction state at all (e.g. Avatar) declares the standard
  // interaction taxonomy as boilerplate and carries no styling obligation, so
  // its interaction dims are behavioral, not gaps. Non-interaction categories
  // (availability/selection/validation/visibility) always carry intent — a
  // declared disabled/invalid/open state is a real obligation to realize.
  const stylesJson = readJSON(resolve(CONTRACTS, component, `${component}.styles.json`)) ?? {};
  const stylesKeys = Object.keys(stylesJson);
  const authorsInteractionStyling =
    /:hover|:focus-visible|:focus\b|:active/.test(both) ||
    stylesKeys.some((k) => /hover|focus|active/i.test(k));

  const dims = [];
  for (const [dimName, dim] of Object.entries(dimsObj)) {
    if (!dim || !Array.isArray(dim.values)) continue;
    const category = dim.category ?? "unknown";
    const initial = dim.initial;
    const rows = [];
    for (const raw of dim.values) {
      const value = String(raw);
      const isInitial = initial !== undefined && value === String(initial);
      // Channel-driven (behavioral, not a CSS gap — spec: JS-driven disclosure
      // channels). True when ANY of:
      //   - a per-value `derivesFrom[v].channel` binding;
      //   - the dimension `effect` is "channel";
      //   - a per-value `valueEffects[v]` of "channel" or "overlay" (e.g. Sheet
      //     openness: open→overlay, opening/closing→channel) — runtime-managed
      //     visibility, not a static selector;
      //   - the category is "visibility" or "motion" (open/closed, entering/
      //     leaving, visible/hidden are disclosure/animation channels by nature).
      const valueEffect = dim.valueEffects?.[value];
      const channelDriven =
        Boolean(dim.derivesFrom?.[value]?.channel) ||
        dim.effect === "channel" ||
        valueEffect === "channel" ||
        valueEffect === "overlay" ||
        category === "visibility" ||
        category === "motion";
      const expected = expectedRealization(prefix, value, inputBacked, dim.a11y);
      const realized = detectRealization(both, prefix, value, inputBacked, dim.a11y);

      // Suppressed: an interaction-category value whose styling is suppressed by
      // an active availability dimension. The codegen legitimately omits it, so
      // it is neither a realization nor a gap — it's behavioral.
      const suppressed =
        INTERACTION_PSEUDO_CATEGORIES.has(category) && suppressedCategories.has(category) && !realized;

      // focus.strategy=none roots carry no focus obligation on the root.
      const focusExempt = focusStrategyNone && category === "interaction" && /focus/.test(value);

      // No-styling-intent: an interaction value on a component that authors zero
      // interaction-state styling. The interaction taxonomy is declared as
      // boilerplate, not a styling obligation — behavioral, not a gap.
      const noStylingIntent =
        category === "interaction" && !authorsInteractionStyling && !realized;

      // Classification:
      //   realized   — a valid selector exists
      //   base       — the initial value (covered by the base rule)
      //   behavioral — channel-driven / suppressed / focus-exempt / no-intent: not a CSS gap
      //   gap        — a non-initial, non-behavioral obligation with no selector
      let status;
      if (isInitial) status = "base";
      else if (realized) status = "realized";
      else if (channelDriven || suppressed || focusExempt || noStylingIntent) status = "behavioral";
      else status = "gap";

      rows.push({ value, category, expected, status, ...(channelDriven ? { channelDriven: true } : {}) });
    }
    dims.push({
      dim: dimName,
      category,
      initial: initial !== undefined ? String(initial) : null,
      values: rows,
      realizedCount: rows.filter((r) => r.status === "realized").length,
      gaps: rows.filter((r) => r.status === "gap").map((r) => r.value),
      total: rows.length,
    });
  }

  // The empty-field input-prompt pseudo obligation, for text inputs only. The
  // codegen never emits `:placeholder-shown` (only `::placeholder` text styling),
  // so this is the canary gap. We credit it realized ONLY if a real
  // `:placeholder-shown` selector exists — `::placeholder` does NOT count.
  let promptObligation = null;
  if (isTextInput(contract, component)) {
    const realized = /:placeholder-shown/.test(both);
    promptObligation = {
      value: "empty-prompt",
      category: "prompt",
      expected: `.${prefix}:placeholder-shown` + " (or " + `.${prefix}__input:placeholder-shown)`,
      status: realized ? "realized" : "gap",
    };
  }

  return {
    component,
    prefix,
    inputBacked,
    focusStrategyNone,
    dims,
    promptObligation,
  };
}

/** Flatten a classification into its gap obligations for the summary. */
function gapsOf(c) {
  const out = [];
  for (const d of c.dims) for (const g of d.gaps) out.push({ dim: d.dim, category: d.category, value: g });
  if (c.promptObligation?.status === "gap") out.push({ dim: "prompt", category: "prompt", value: "empty-prompt" });
  return out;
}

// ---- run (only when executed directly; importable for the locked test) ----
const RUN_DIRECTLY = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (RUN_DIRECTLY) {
  const components = ALL_COMPONENTS().map(classify);
  const withStates = components.filter((c) => c.dims.length > 0 || c.promptObligation);

  const failing = [];
  for (const c of withStates) {
    const gaps = gapsOf(c);
    if (gaps.length) failing.push({ component: c.component, gaps });
  }

  const totalObligations = withStates.reduce(
    (n, c) => n + c.dims.reduce((m, d) => m + d.total, 0) + (c.promptObligation ? 1 : 0),
    0,
  );
  const realizedCount = withStates.reduce(
    (n, c) =>
      n +
      c.dims.reduce((m, d) => m + d.values.filter((v) => v.status === "realized").length, 0) +
      (c.promptObligation?.status === "realized" ? 1 : 0),
    0,
  );
  const gapCount = failing.reduce((n, f) => n + f.gaps.length, 0);

  mkdirSync(OUT_DIR, { recursive: true });
  const json = {
    spec: "PSEUDO-STATE-STYLING-RAIL-01",
    componentsWithStates: withStates.length,
    totalObligations,
    realized: realizedCount,
    gaps: gapCount,
    failing,
    components: withStates,
  };
  writeFileSync(resolve(OUT_DIR, "pseudo-state-matrix.json"), JSON.stringify(json, null, 2) + "\n");

  const md = [];
  md.push("# Pseudo/state styling realization matrix");
  md.push("");
  md.push(
    "`PSEUDO-STATE-STYLING-RAIL-01` — read-only. Each declared state obligation (from `states.dimensions`, plus the empty-field input prompt for text inputs) is classified against the generated React CSS using the codegen's realization vocabulary: a derivable pseudo-class (`:hover`/`:focus-visible`/`:disabled`/`:checked`), an ARIA-attribute selector (`[aria-expanded=\"true\"]`), the `:has(.<prefix>__input:<state>)` input wrapper, or a BEM modifier (`.<prefix>--<value>`). An obligation is **realized** if any valid form exists, **base** if it is the dimension's initial value, **behavioral** if it is channel-driven / suppressed / focus-exempt (not a CSS gap), or a **gap** otherwise.",
  );
  md.push("");
  md.push(
    `Components with states: **${withStates.length}** · obligations: **${totalObligations}** · realized: **${realizedCount}** · gaps: **${gapCount}**`,
  );
  md.push("");
  md.push("## Gaps — declared state obligations with no realization");
  md.push("");
  if (failing.length) {
    md.push("| component | dim | category | value | expected selector |");
    md.push("|---|---|---|---|---|");
    for (const f of failing) {
      const c = withStates.find((x) => x.component === f.component);
      for (const g of f.gaps) {
        const exp =
          g.dim === "prompt"
            ? c.promptObligation.expected
            : c.dims.find((d) => d.dim === g.dim)?.values.find((v) => v.value === g.value)?.expected ?? "—";
        md.push(`| ${f.component} | \`${g.dim}\` | ${g.category} | \`${g.value}\` | \`${exp}\` |`);
      }
    }
  } else md.push("_none_");
  md.push("");
  md.push("## Full matrix (per component)");
  md.push("");
  for (const c of withStates) {
    md.push(`### ${c.component}  \`.${c.prefix}\`${c.inputBacked ? " · input-backed" : ""}${c.focusStrategyNone ? " · focus:none" : ""}`);
    md.push("");
    md.push("| dim | category | initial | values (✓ realized · ✗ gap · ∘ base · ~ behavioral) |");
    md.push("|---|---|---|---|");
    for (const d of c.dims) {
      const cells = d.values
        .map((v) => {
          const mark = v.status === "realized" ? "✓" : v.status === "gap" ? "✗" : v.status === "base" ? "∘" : "~";
          return `${v.value}${mark}`;
        })
        .join(" ");
      md.push(`| \`${d.dim}\` | ${d.category} | ${d.initial ?? "—"} | ${cells} |`);
    }
    if (c.promptObligation) {
      const v = c.promptObligation;
      const mark = v.status === "realized" ? "✓" : "✗";
      md.push(`| \`prompt\` | prompt | — | empty-prompt${mark} |`);
    }
    md.push("");
  }
  writeFileSync(resolve(OUT_DIR, "pseudo-state-matrix.md"), md.join("\n") + "\n");

  console.log(
    `\nPSEUDO-STATE-STYLING-RAIL-01 — ${withStates.length} components with states, ${totalObligations} obligations, ${realizedCount} realized, ${gapCount} gaps`,
  );
  console.log(`Report: ${resolve(OUT_DIR, "pseudo-state-matrix.md")}\n`);

  // --- ratchet: the ledger may only shrink truthfully ---
  const current = failing.flatMap((f) => f.gaps.map((g) => ({ component: f.component, ...g })));
  const ledger = loadLedger(LEDGER_PATH, ["component", "dim", "value"]);
  const { unledgered, stale } = diffLedger({ current, ledger, idOf: pseudoGapId });
  const code = reportRatchet({
    label: "pseudo-state",
    current,
    unledgered,
    stale,
    idOf: pseudoGapId,
  });
  if (code !== 0) process.exit(code);
}
