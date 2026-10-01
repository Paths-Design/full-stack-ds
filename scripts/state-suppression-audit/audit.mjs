/**
 * State-suppression rail (RAIL-STATE-SUPPRESSION-01) — read-only.
 *
 * A third obligation axis, independent of the two existing styling rails.
 *
 * A contract may declare that one state dimension SUPPRESSES another category:
 *
 *   "availability": { "values": ["enabled", "disabled"],
 *                     "suppresses": { "categories": ["interaction"] } }
 *
 * That is a claim about rendered behaviour: while disabled, no interaction-state
 * styling applies. The generated CSS honours it only if every property set under
 * an interaction pseudo is either (a) also set in the suppressing state's block,
 * so the later, equal-specificity rule wins it back, or (b) guarded so the
 * interaction selector cannot match a suppressed element at all.
 *
 * WHY THIS NEEDS ITS OWN RAIL. The pseudo-state audit asks "is `disabled`
 * realized at all?" — for Button the answer is yes, a `:disabled` block exists,
 * so it scores realized. Realization and suppression are independent: the block
 * can exist and still reset only some of what `:hover` set. Button's `:hover`
 * sets `border-color`; its `:disabled` block sets `background-color` and
 * `color`. Both selectors are (0,2,0), `:disabled` is later, so it wins the two
 * it declares — and nothing wins back the border. A disabled Button hovered
 * shifts its border to #888889 while every existing gate stays green.
 *
 * REACHABILITY. Not every leak can manifest. On a native form control a
 * natively-disabled element cannot match `:focus-visible` or `:active` — the
 * browser will not focus or activate it — so those leaks are unreachable there
 * and reporting them with equal weight would bury the ~7 real ones in ~30 of
 * noise. `:hover` DOES match disabled elements. On a non-form-control root the
 * disabled state is necessarily an ARIA/class convention, the element stays
 * focusable, and every interaction pseudo is reachable.
 *
 * Both reachable and unreachable leaks are ledgered — the ratchet is about
 * accounting, not severity — but each entry records which it is, so a burn-down
 * slice can start where the user-visible defects are.
 *
 * Scope, mirroring the sibling audits: classification is against the generated
 * React CSS only (the reference framework; all five web families lower from the
 * same IR). Read-only — this rail changes no contract, no styling, no artifact.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { diffLedger, loadLedger, reportRatchet } from "../lib/ledger-ratchet.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const CONTRACTS = resolve(REPO, "packages/ds-contracts/components");
const REACT = resolve(REPO, "packages/ds-react/src/components");
const OUT_DIR = resolve(REPO, "docs/internal/state-suppression-audit");
const LEDGER_PATH = resolve(HERE, "known-leaks.json");

/** Interaction pseudos the codegen can emit, per DERIVABLE_STATE_TO_PSEUDO. */
const INTERACTION_PSEUDOS = [":hover", ":active", ":focus-visible", ":focus"];

/**
 * Elements for which `disabled` is a native attribute. Only on these can a
 * disabled element be excluded from focus/activation by the UA — which is what
 * makes `:focus-visible` / `:active` leaks unreachable there.
 */
const NATIVE_DISABLEABLE = new Set([
  "button",
  "input",
  "select",
  "textarea",
  "fieldset",
  "optgroup",
  "option",
]);

/** Elements that take keyboard focus without an author-supplied tabindex. */
const NATIVELY_FOCUSABLE = new Set(["a", "button", "input", "select", "textarea", "summary"]);

/**
 * Can this pseudo ever match this root while the suppressing state is active?
 *
 * Two independent conditions, and conflating them overstates the finding:
 *   1. Can the element match the pseudo AT ALL? `:focus-visible` and `:active`
 *      need a focusable/activatable element — a plain <div> root matches
 *      neither, no matter what the disabled state is.
 *   2. Can it still match WHILE suppressed? A natively-disabled form control is
 *      removed from focus and activation, so those pseudos go dead there;
 *      `:hover` keeps matching in every engine we target.
 *
 * An honest `unreachable` is worth more than an inflated `reachable`: the whole
 * point of grading these is that a burn-down starts with the leaks a user can
 * actually see.
 */
function leakReachability(pseudo, rootTag, hasTabIndex) {
  const nativelyDisableable = NATIVE_DISABLEABLE.has(rootTag);
  if (pseudo === ":hover") {
    // Hover matches anything paintable, disabled or not.
    return "reachable";
  }
  const focusable = NATIVELY_FOCUSABLE.has(rootTag) || hasTabIndex;
  if (pseudo === ":focus-visible" || pseudo === ":focus") {
    if (!focusable) return "unreachable-not-focusable";
    return nativelyDisableable ? "unreachable-disabled-not-focusable" : "reachable";
  }
  if (pseudo === ":active") {
    if (!focusable) return "unreachable-not-activatable";
    return nativelyDisableable ? "unreachable-disabled-not-activatable" : "reachable";
  }
  return "reachable";
}

const readJSON = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
const readText = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

export function suppressionLeakId(row) {
  return `${row.component} ${row.pseudo} ${row.property}`;
}

/**
 * Properties declared directly inside blocks introduced by `selector`.
 *
 * Brace-matched rather than regex-sliced so a nested block (a media query, a
 * `:has()` inside the state block) doesn't truncate the scan at the first `}`.
 */
export function propertiesUnder(css, selector) {
  const found = new Set();
  const opener = new RegExp(`&?${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`, "g");
  for (const match of css.matchAll(opener)) {
    let index = match.index + match[0].length;
    let depth = 1;
    const start = index;
    while (depth > 0 && index < css.length) {
      if (css[index] === "{") depth += 1;
      else if (css[index] === "}") depth -= 1;
      index += 1;
    }
    const body = css.slice(start, index - 1);
    // Only top-level declarations of this block: strip nested blocks first.
    const flattened = body.replace(/\{[^{}]*\}/g, "");
    for (const decl of flattened.matchAll(/(^|[;{\s])([a-z-]+)\s*:/g)) found.add(decl[2]);
  }
  return found;
}

/** Does the sheet guard interaction selectors against the suppressed state? */
export function guardsAgainstDisabled(css) {
  return /:not\(\s*:disabled\s*\)|:not\(\s*\[disabled\]\s*\)|:not\(\s*\[aria-disabled=/.test(css);
}

export function auditComponent(component) {
  const contract = readJSON(resolve(CONTRACTS, component, `${component}.contract.json`));
  const dimensions = contract?.states?.dimensions;
  if (!dimensions || typeof dimensions !== "object") return null;

  const suppressing = Object.entries(dimensions).find(([, dim]) =>
    (dim?.suppresses?.categories ?? []).includes("interaction"),
  );
  if (!suppressing) return null;

  const css = readText(resolve(REACT, component, `${component}.css`));
  if (!css) return null;

  const rootTag = contract?.anatomy?.dom?.tag;
  const rootAttrs = contract?.anatomy?.dom?.attrs ?? {};
  const hasTabIndex = "tabindex" in rootAttrs || "tabIndex" in rootAttrs;
  const guarded = guardsAgainstDisabled(css);
  const suppressedProps = propertiesUnder(css, ":disabled");

  const leaks = [];
  for (const pseudo of INTERACTION_PSEUDOS) {
    for (const property of propertiesUnder(css, pseudo)) {
      if (suppressedProps.has(property)) continue; // won back by the later rule
      if (guarded) continue; // selector cannot match a suppressed element
      leaks.push({
        component,
        dimension: suppressing[0],
        pseudo,
        property,
        rootTag: rootTag ?? "unknown",
        reachability: leakReachability(pseudo, rootTag, hasTabIndex),
      });
    }
  }
  return { component, rootTag, guarded, suppressedProps: [...suppressedProps], leaks };
}

export function runAudit() {
  const components = readdirSync(CONTRACTS).sort();
  const results = [];
  for (const name of components) {
    const r = auditComponent(name);
    if (r) results.push(r);
  }
  return results;
}

const RUN_DIRECTLY =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (RUN_DIRECTLY) {
  const results = runAudit();
  const leaks = results.flatMap((r) => r.leaks);
  const reachable = leaks.filter((l) => l.reachability === "reachable");

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    resolve(OUT_DIR, "state-suppression-matrix.json"),
    JSON.stringify(
      {
        spec: "RAIL-STATE-SUPPRESSION-01",
        componentsDeclaringSuppression: results.length,
        guarded: results.filter((r) => r.guarded).length,
        leaks: leaks.length,
        reachableLeaks: reachable.length,
        results,
      },
      null,
      2,
    ) + "\n",
  );

  const md = [
    "# State-suppression matrix",
    "",
    "`RAIL-STATE-SUPPRESSION-01` — read-only. A contract that declares `suppresses.categories: [\"interaction\"]` claims that no interaction-state styling applies while suppressed. The CSS honours it only if every property set under an interaction pseudo is also set in the suppressing block (winning it back at equal specificity) or the interaction selector is guarded against the suppressed state.",
    "",
    "Independent of the pseudo-state rail: a dimension can be **realized** (a `:disabled` block exists) and its suppression contract **violated** at the same time, which is why this is its own axis.",
    "",
    "**Reachability.** On a native form-control root a natively-disabled element cannot match `:focus-visible` or `:active`, so those leaks are unreachable there; `:hover` still matches. On any other root the disabled state is an ARIA/class convention and every interaction pseudo is reachable.",
    "",
    `Components declaring suppression: **${results.length}** · guarded: **${results.filter((r) => r.guarded).length}** · leaks: **${leaks.length}** (reachable: **${reachable.length}**)`,
    "",
    "| component | root | dim | pseudo | property | reachability |",
    "|---|---|---|---|---|---|",
  ];
  for (const l of leaks) {
    md.push(
      `| ${l.component} | \`<${l.rootTag}>\` | \`${l.dimension}\` | \`${l.pseudo}\` | \`${l.property}\` | ${l.reachability} |`,
    );
  }
  writeFileSync(resolve(OUT_DIR, "state-suppression-matrix.md"), md.join("\n") + "\n");

  console.log(
    `\nRAIL-STATE-SUPPRESSION-01 — ${results.length} component(s) declare interaction suppression, ${results.filter((r) => r.guarded).length} guarded, ${leaks.length} leak(s) (${reachable.length} reachable)`,
  );
  console.log(`Report: ${resolve(OUT_DIR, "state-suppression-matrix.md")}\n`);

  const ledger = loadLedger(LEDGER_PATH, ["component", "pseudo", "property"]);
  const { unledgered, stale } = diffLedger({ current: leaks, ledger, idOf: suppressionLeakId });
  const code = reportRatchet({
    label: "state-suppression",
    current: leaks,
    unledgered,
    stale,
    idOf: suppressionLeakId,
  });
  if (code !== 0) process.exit(code);
}
