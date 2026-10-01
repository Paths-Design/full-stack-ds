#!/usr/bin/env node
/**
 * RAIL-WEB-STYLE-CARRIER-REACHABILITY-01 — forward carrier-reachability rail.
 *
 * Asks one question of every contract in the corpus: **does each authored
 * style selector require only component-owned carriers the Web-DOM IR can
 * actually produce?** A selector that names a carrier nothing ever gets
 * compiles into all five web packages and matches zero elements — invisible to
 * every existing rail, because the dead-slot audit asks whether a token slot
 * has a `var()` consumer and here the consumer exists; it just sits in a rule
 * that never fires.
 *
 * The adjudication is NOT here. This script imports
 * `validateStylesCarrierReachability` from compiled `ds-codegen/dist` and only
 * ledgers what it returns. Re-implementing the carrier vocabulary in a script
 * is how a rail and its generator drift into disagreeing while both stay
 * green — the mistake `scripts/variant-style-audit` made by mirroring
 * `computeTaintedAxes`.
 *
 * Two-directional ratchet against `known-unreachable.json`: a new finding
 * fails, a stale entry fails, changed finding identity fails. The ledger is
 * seeded from what the live corpus derives — no count is frozen into the gate.
 *
 * What a ledger entry MEANS: authored CSS requires a carrier the current
 * realization does not produce. It is NOT a licence to delete the declaring
 * contract surface. Resolution may be selector repair, realization repair, or
 * independently justified contract retirement, adjudicated per case
 * (FIX-DEAD-SLOT-UNRENDERED-PART-AUTHORITY-01).
 *
 * Usage:   node scripts/carrier-reachability-audit/audit.mjs [--reseed]
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { diffLedger, loadLedger, reportRatchet } from "../lib/ledger-ratchet.mjs";
import { validateStylesCarrierReachability } from "../../packages/ds-codegen/dist/validation/styles.js";
import { expandOptionsForContract, expandStylesKey } from "../../packages/ds-codegen/dist/ir.js";
import { getCssPrefix } from "../../packages/ds-codegen/dist/contract.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const CONTRACTS = resolve(REPO, "packages/ds-contracts/components");
const OUT_DIR = resolve(REPO, "docs/internal/carrier-reachability-audit");
const LEDGER_PATH = resolve(HERE, "known-unreachable.json");

/**
 * Ledger identity. The carrier is part of the id on purpose: repairing one
 * unreachable carrier in a key that requires two must surface as one burned
 * entry and one surviving one, not as a single entry that silently changed
 * meaning.
 */
export function unreachableId(row) {
  return `${row.component} ${row.key} -> .${row.carrier}`;
}

const readJSON = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);

export const ALL_COMPONENTS = () =>
  readdirSync(CONTRACTS)
    .filter((d) => statSync(resolve(CONTRACTS, d)).isDirectory())
    .filter((d) => existsSync(resolve(CONTRACTS, d, `${d}.contract.json`)))
    .sort();

/**
 * Load a contract with its styles and timing-token sidecars,
 * mirroring what `cli.ts` does before semantic validation runs. Schema
 * validation is deliberately skipped — `generate:validate` already gates it,
 * and duplicating it here would give this rail a second opinion about contract
 * validity.
 */
export function loadMergedContract(name) {
  const contract = readJSON(resolve(CONTRACTS, name, `${name}.contract.json`));
  if (!contract) return null;
  const styles = readJSON(resolve(CONTRACTS, name, `${name}.styles.json`));
  if (styles) contract.styles = styles;
  const tokens = readJSON(resolve(CONTRACTS, name, `${name}.tokens.json`));
  if (tokens) contract.tokens = tokens;
  return contract;
}

/**
 * One row per unreachable carrier, derived from the validator's issues.
 *
 * The rail reads the carrier back out of the diagnostic rather than
 * recomputing it, so there is exactly one place that decides what is
 * unreachable. If the message format changes, this throws — a silently
 * emptied ledger would read as a clean burn-down.
 */
export function collectFindings(components = ALL_COMPONENTS()) {
  const rows = [];
  for (const name of components) {
    const contract = loadMergedContract(name);
    if (!contract) continue;
    for (const issue of validateStylesCarrierReachability(contract)) {
      const key = issue.pointer
        .replace(/^\/styles\//, "")
        .replace(/~1/g, "/")
        .replace(/~0/g, "~");
      const carrier = /component-owned carrier "\.([^"]+)"/.exec(issue.message)?.[1];
      // Recomputed through the SAME helpers the validator uses, rather than
      // scraped out of the prose: a selector can contain quotes
      // (`[data-token="plain"]`), and parsing it back out of the message both
      // truncated those and created a second, weaker copy of the expansion.
      const selector = expandStylesKey(
        key,
        getCssPrefix(contract),
        expandOptionsForContract(contract, getCssPrefix(contract)),
      );
      if (!carrier) {
        throw new Error(
          `[carrier-reachability] ${name}: could not read the carrier out of a validator ` +
            `message. The rail parses the diagnostic it ledgers, so a message-format change ` +
            `must fail loudly here rather than silently emptying the ledger.\n  ${issue.message}`,
        );
      }
      rows.push({
        component: name,
        key,
        selector,
        carrier,
        kind: carrier.includes("__") ? "part" : "modifier",
        message: issue.message,
      });
    }
  }
  return rows;
}

const LEDGER_COMMENT =
  "Forward carrier-reachability ledger (RAIL-WEB-STYLE-CARRIER-REACHABILITY-01). An entry means: authored CSS requires a component-owned carrier the current Web-DOM realization does not produce, so the rule matches nothing. It does NOT mean the contract surface is stale — deleting the declaration is one of three possible resolutions (selector repair, realization repair, independently justified contract retirement) and requires evidence sourced independently of the generated output (FIX-DEAD-SLOT-UNRENDERED-PART-AUTHORITY-01). Two-directional ratchet: the rail fails on a new finding, on an entry that no longer reproduces, and on changed finding identity — the carrier is part of the id, so repairing one carrier of a two-carrier key cannot silently re-point an entry. Seeded from what the live corpus derives; no count is frozen into the gate. Re-derive with --reseed; never hand-edit the derived fields.";

function renderReport(findings) {
  return [
    "# Web-DOM style-carrier reachability",
    "",
    "`RAIL-WEB-STYLE-CARRIER-REACHABILITY-01` — an authored style selector may claim only a component-owned carrier the Web-DOM IR can produce. Carrier vocabulary comes from `deriveWebDomCarriers` (IR authority: `classRecipe` for modifier spelling, the `anatomy.dom` walk for part carriers, `expandOptionsForContract` for `data-*` markers). This script re-implements none of it.",
    "",
    "**What a row means:** authored CSS requires a carrier the current realization does not produce, so the rule matches nothing. **What it does not mean:** that the contract side is stale. Resolution may be selector repair, realization repair, or independently justified contract retirement — adjudicate per case (`FIX-DEAD-SLOT-UNRENDERED-PART-AUTHORITY-01`).",
    "",
    "**Non-claims.** A reachable carrier proves only that a rule has a producible attachment point. It does not prove the rule wins the cascade, changes computed style, supplies content the part needs, or realizes the intended visual distinction. Pseudo-class host satisfiability, `aria-*` truth and suppression guards stay with the element-awareness and pseudo-state rails. Contracts with no `anatomy.dom` (Card, Popover, Tooltip) have an UNKNOWN producible part set and are skipped for part carriers: absence of information is not evidence of a defect.",
    "",
    "**Direction.** This rail asks only whether authored CSS demands an impossible carrier. An emitted variant class with no matching CSS rule is the inverse problem and lives in `scripts/variant-style-audit/`.",
    "",
    `Findings: **${findings.length}** across **${new Set(findings.map((r) => r.component)).size}** component(s).`,
    "",
    "| component | styles key | expands to | unreachable carrier | kind |",
    "|---|---|---|---|---|",
    ...findings.map(
      (r) => `| ${r.component} | \`${r.key}\` | \`${r.selector}\` | \`.${r.carrier}\` | ${r.kind} |`,
    ),
    "",
  ].join("\n");
}

const RUN_DIRECTLY =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (RUN_DIRECTLY) {
  const reseed = process.argv.includes("--reseed");
  const findings = collectFindings();

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(resolve(OUT_DIR, "carrier-reachability.md"), renderReport(findings));

  if (reseed) {
    const existing = existsSync(LEDGER_PATH)
      ? JSON.parse(readFileSync(LEDGER_PATH, "utf8"))
      : { gaps: [] };
    const priorById = new Map((existing.gaps ?? []).map((g) => [unreachableId(g), g]));
    const gaps = findings.map((r) => {
      const prior = priorById.get(unreachableId(r));
      return {
        component: r.component,
        key: r.key,
        carrier: r.carrier,
        kind: r.kind,
        selector: r.selector,
        spec: prior?.spec ?? "RAIL-WEB-STYLE-CARRIER-REACHABILITY-01",
        note:
          prior?.note ??
          "Seeded at rail birth; standing debt, not yet adjudicated. Resolution direction is open — see the ledger $comment.",
      };
    });
    writeFileSync(
      LEDGER_PATH,
      JSON.stringify({ $comment: LEDGER_COMMENT, gaps }, null, 2) + "\n",
    );
    console.log(
      `[carrier-reachability] reseeded ${gaps.length} ledger entr(ies); spec/note provenance preserved by id.`,
    );
  }

  const ledger = loadLedger(LEDGER_PATH, ["component", "key", "carrier"]);
  const { unledgered, stale } = diffLedger({
    current: findings,
    ledger,
    idOf: unreachableId,
  });
  console.log(
    `\nRAIL-WEB-STYLE-CARRIER-REACHABILITY-01 — ${ALL_COMPONENTS().length} components, ${findings.length} unreachable carrier(s)`,
  );
  console.log(`Report: ${resolve(OUT_DIR, "carrier-reachability.md")}\n`);
  process.exit(
    reportRatchet({
      label: "carrier-reachability",
      current: findings,
      unledgered,
      stale,
      idOf: unreachableId,
    }),
  );
}
