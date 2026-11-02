/** Read-only Godot capability accounting.
 *
 * Emitted source is NOT semantic or runtime admission. Every contract and
 * sidecar leaf carries the disposition the committed support boundary assigns
 * it (lowered / pending / refused); a component's receipt says which props the
 * emitted plan drops. The audit joins those views through four obligations:
 *
 *   1. ledger totality — every leaf of an admitted component is classified by
 *      a non-catch-all rule;
 *   2. receipt totality — every prop a receipt drops is named in that receipt's
 *      own omissions/non-claims (a silent drop is a defect);
 *   3. shape variance — a dropped prop the target boundary marks `lowered` is
 *      recorded as `{prop, rule}` variance, never fatal: the ledger is
 *      per-target while a plan shape may legitimately realize less;
 *   4. inventory drift — a fresh inventory must equal the committed
 *      `packages/ds-godot/verification/capability-inventory.json`.
 *
 * `--check` is the gate (exit 0 on variance-only findings); `--write`
 * regenerates the inventory.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { ComponentContract } from "../../contract.js";
import type { FrameworkEmitter } from "../../emitter.js";
import { findComponentStyles, findComponentTokens, listComponentContracts } from "../../contracts-fs.js";
import { buildComponentIR } from "../../ir.js";
import { createGodotEmitter } from "./factory.js";
import {
  classifyLeaves,
  classifyProp,
  escape,
  godotAllowlist,
  loadBoundary,
  loadContractWithSidecars,
  type GodotBoundary,
  type GodotDisposition,
  type ClassifiedLeaf,
} from "./boundary.js";

/** The minimal emitter surface the audit drives; injectable so refusals are testable. */
export type GodotEmitter = Pick<FrameworkEmitter, "emitComponent">;

export const INVENTORY_RELATIVE_PATH = "packages/ds-godot/verification/capability-inventory.json";
export const inventoryPath = (root: string): string => path.join(root, INVENTORY_RELATIVE_PATH);

/** The receipt fields that matter for the prop-axis audit. */
export interface GodotReceipt {
  operation: string | null;
  /** Props the emitted plan drops; the receipt names them under `excluded`. */
  excluded: string[];
  /** Named non-claims the receipt carries (`omissions`, else `fidelityGaps`). */
  nonClaims: string[];
  proof: string | null;
}

/** The receipt as the committed inventory stores it: the prop-axis facts, not the prose. */
export interface GodotStoredReceipt {
  operation: string | null;
  excluded: string[];
  proof: string | null;
  /** Number of named non-claims; the text is audit-time input, not inventory state. */
  nonClaimCount: number;
}

/** Compact per-component boundary account: counts plus a classification digest. */
export interface GodotBoundaryAccount {
  counts: Record<GodotDisposition, number>;
  /** sha256 over every classified leaf of the component (contract + sidecars). */
  digest: string;
}

export interface GodotCapabilityRecord {
  component: string;
  admitted: boolean;
  emitted: boolean;
  operation: string | null;
  diagnostic: string | null;
  contractSha256: string;
  sidecarSha256: Record<string, string>;
  receipt: GodotStoredReceipt | null;
  /** Planner/shape variance: boundary `lowered`, receipt excludes it. */
  variance: { prop: string; rule: string }[];
  boundary: GodotBoundaryAccount;
}

export interface GodotCapabilityInventory {
  schema: "godot-capability-inventory.v1";
  limitations: string;
  boundary: {
    schema: string;
    rules: number;
    corpusComponents: number;
    counts: Record<GodotDisposition, number>;
    deadRules: string[];
  };
  /** Number of planner/shape variances across the admitted set. */
  variances: number;
  components: GodotCapabilityRecord[];
}

const sha256 = (data: Buffer | string): string => createHash("sha256").update(data).digest("hex");
const stable = (records: readonly (readonly (string | number)[])[]): string =>
  sha256(records.map(record => record.join("\t")).sort().join("\n"));

/**
 * The corpus map the IR builder needs to resolve `componentRef` nodes (a
 * sequence references its pager, a composite its parts). Best-effort, exactly
 * like the CLI: a malformed contract is simply absent and reports elsewhere.
 */
export function corpusContracts(root: string): Map<string, ComponentContract> {
  const corpus = new Map<string, ComponentContract>();
  for (const entry of listComponentContracts(path.join(root, "packages/ds-contracts"))) {
    try {
      const parsed = JSON.parse(fs.readFileSync(entry.absPath, "utf8")) as ComponentContract;
      if (parsed && typeof parsed.name === "string") corpus.set(parsed.name, parsed);
    } catch {
      // A malformed contract has no IR to account for; validation reports it.
    }
  }
  return corpus;
}

function findReceipt(files: { relativePath: string; contents: string }[]): string | undefined {
  return files.find(file => file.relativePath.endsWith("/capabilities.json"))?.contents;
}

/**
 * Emit one contract in memory and join its capability receipt with the
 * boundary classification of that contract. A component the current planner
 * refuses is reported as `emitted: false` with the typed diagnostic; the audit
 * turns that into a violation instead of crashing.
 */
function accountDetailed(
  root: string,
  name: string,
  boundary: GodotBoundary,
  emitter: GodotEmitter,
  corpus: Map<string, ComponentContract>,
  allowlist: Set<string>,
): { record: GodotCapabilityRecord; receipt: GodotReceipt | null } {
  const contract = loadContractWithSidecars(root, name);
  const ir = buildComponentIR(contract, { allContracts: corpus });
  let diagnostic: string | null = null;
  let receiptText: string | undefined;
  try {
    const files = emitter.emitComponent(ir, {
      componentsRoot: path.join(root, "packages/ds-godot/addons/full_stack_ds/components"),
      contractsRoot: path.join(root, "packages/ds-contracts"),
    });
    receiptText = findReceipt(files);
  } catch (error) {
    diagnostic = error instanceof Error ? error.message : String(error);
  }
  const classified = classifyLeaves(contract, boundary);
  const counts: Record<GodotDisposition, number> = { lowered: 0, pending: 0, refused: 0 };
  for (const leaf of classified) counts[leaf.disposition as GodotDisposition]++;
  const entry = listComponentContracts(path.join(root, "packages/ds-contracts")).find(candidate => candidate.name === name);
  if (!entry) throw new Error(`GODOT_INVENTORY_UNKNOWN_COMPONENT: ${name}`);
  const sidecarHashes: Record<string, string> = {};
  for (const [kind, found] of [["tokens", findComponentTokens(entry)], ["styles", findComponentStyles(entry)]] as const) {
    if (found) sidecarHashes[kind] = sha256(fs.readFileSync(found.absPath));
  }
  let receipt: GodotReceipt | null = null;
  if (receiptText !== undefined) {
    const parsed = JSON.parse(receiptText) as {
      operation?: unknown; excluded?: unknown; excludedProps?: unknown; proof?: unknown; omissions?: unknown; fidelityGaps?: unknown;
    };
    const excluded = Array.isArray(parsed.excluded) ? parsed.excluded : Array.isArray(parsed.excludedProps) ? parsed.excludedProps : [];
    const claims = [parsed.omissions, parsed.fidelityGaps]
      .filter((value): value is unknown[] => Array.isArray(value))
      .flat()
      .filter((value): value is string => typeof value === "string");
    receipt = {
      operation: typeof parsed.operation === "string" ? parsed.operation : null,
      excluded: excluded.filter((prop): prop is string => typeof prop === "string"),
      nonClaims: [...new Set(claims)],
      proof: typeof parsed.proof === "string" ? parsed.proof : null,
    };
  }
  const record: GodotCapabilityRecord = {
    component: name,
    admitted: allowlist.has(name),
    emitted: diagnostic === null && receipt !== null,
    operation: receipt?.operation ?? null,
    diagnostic: diagnostic ?? (receipt === null ? "no capability receipt emitted" : null),
    contractSha256: sha256(fs.readFileSync(entry.absPath)),
    sidecarSha256: sidecarHashes,
    receipt: receipt && {
      operation: receipt.operation,
      excluded: receipt.excluded,
      proof: receipt.proof,
      nonClaimCount: receipt.nonClaims.length,
    },
    variance: receipt ? receiptAccount(name, receipt, boundary,
      receipt.operation === "text-input" || receipt.operation === "associated-label" ? classified : undefined)
      .variance.map(({ prop, rule }) => ({ prop, rule })) : [],
    boundary: {
      counts,
      digest: stable(classified.map(leaf => [leaf.keyed, leaf.disposition, leaf.rule ?? "", leaf.source])),
    },
  };
  return { record, receipt };
}

/** Emit one contract in memory and return its compact inventory record. */
export function accountComponent(
  root: string,
  name: string,
  boundary: GodotBoundary = loadBoundary(),
  emitter: GodotEmitter = createGodotEmitter(),
  corpus: Map<string, ComponentContract> = corpusContracts(root),
  allowlist: Set<string> = new Set(godotAllowlist(root)),
): GodotCapabilityRecord {
  return accountDetailed(root, name, boundary, emitter, corpus, allowlist).record;
}

/** One accounting pass: the inventory document plus the full receipts the audit needs. */
function accountAll(root: string, boundary: GodotBoundary, emitter: GodotEmitter) {
  const allowlist = godotAllowlist(root);
  const entries = listComponentContracts(path.join(root, "packages/ds-contracts"));
  if (!entries.length) throw new Error("GODOT_INVENTORY_EMPTY_CORPUS");
  for (const name of allowlist) if (!entries.some(entry => entry.name === name)) throw new Error(`GODOT_INVENTORY_UNKNOWN_COMPONENT: ${name}`);
  const audit = corpusAudit(root, boundary);
  const corpus = corpusContracts(root);
  const admitted = new Set(allowlist);
  const receipts = new Map<string, GodotReceipt | null>();
  const components = [...allowlist].sort().map(name => {
    const detailed = accountDetailed(root, name, boundary, emitter, corpus, admitted);
    receipts.set(name, detailed.receipt);
    return detailed.record;
  });
  const document: GodotCapabilityInventory = {
    schema: "godot-capability-inventory.v1",
    limitations:
      "API presence is not semantic support. A lowered disposition states the family has a lowering; pending and refused leaves block full-parity claims, and a component's emitted flag says whether the planner admits it at all. variance records plan-shape exclusions of target-lowered facts; it is a recorded disagreement, not support. Regenerate with --write; --check fails on drift.",
    boundary: {
      schema: boundary.schema,
      rules: boundary.rules.length,
      corpusComponents: audit.entries.length,
      counts: audit.counts,
      deadRules: audit.deadRules,
    },
    variances: components.reduce((total, record) => total + record.variance.length, 0),
    components,
  };
  return { document, receipts };
}

/** A named non-claim line mentions a prop as a word (e.g. `size: ...`). */
const namesProp = (line: string, prop: string): boolean =>
  new RegExp(`(^|[^A-Za-z0-9_$])${prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9_$]|$)`).test(line);

export interface ReceiptAccount {
  /** Fatal receipt defects: an excluded prop no adjudicated rule names, or a
   *  drop the receipt does not name in its omissions/non-claims. */
  violations: string[];
  /** Recorded shape variance: the target boundary says `lowered`, the shape
   *  does not realize it. Visible in the inventory; never fatal. */
  variance: { component: string; prop: string; rule: string }[];
}

/**
 * Receipt-to-boundary agreement for one component. Three obligations:
 *  1. every excluded prop must be named by an adjudicated (non-catch-all) rule;
 *  2. every excluded prop must be named in the receipt's own non-claims
 *     (`omissions`, else `fidelityGaps`) — a silently dropped prop is a defect;
 *  3. an exclusion of a `lowered` prop is a recorded variance, not a failure.
 */
export function receiptAccount(component: string, receipt: GodotReceipt, boundary: GodotBoundary = loadBoundary(), classified?: ClassifiedLeaf[]): ReceiptAccount {
  const violations: string[] = [];
  const variance: { component: string; prop: string; rule: string }[] = [];
  for (const prop of receipt.excluded) {
    let classification: ReturnType<typeof classifyProp>;
    try {
      const contextual = classified?.find(leaf => leaf.source === "contract" && leaf.keyed.includes("/members/") && leaf.keyed.endsWith(`:${escape(prop)}/name`));
      classification = contextual && contextual.rule && contextual.disposition !== "unclassified"
        ? { disposition: contextual.disposition, rule: contextual.rule, catchAll: contextual.catchAll }
        : classifyProp(boundary, prop);
    } catch (error) {
      violations.push(`receipt ${component}: excluded prop ${prop} is not named by an adjudicated boundary rule (${error instanceof Error ? error.message : String(error)})`);
      continue;
    }
    if (classification.catchAll) {
      violations.push(`receipt ${component}: excluded prop ${prop} is not named by an adjudicated boundary rule (catch-all ${classification.rule})`);
      continue;
    }
    if (!receipt.nonClaims.some(line => namesProp(line, prop))) {
      violations.push(`receipt ${component}: excluded prop ${prop} is not named in the receipt's omissions/non-claims (silent drop)`);
    }
    if (classification.disposition === "lowered") variance.push({ component, prop, rule: classification.rule });
  }
  return { violations, variance };
}

const corpusAudit = (root: string, boundary: GodotBoundary) => {
  const entries = listComponentContracts(path.join(root, "packages/ds-contracts"));
  const counts: Record<GodotDisposition, number> = { lowered: 0, pending: 0, refused: 0 };
  const used = new Set<string>();
  const unclassified: { component: string; leaf: string }[] = [];
  const catchAll: { component: string; leaf: string; rule: string }[] = [];
  for (const entry of entries) {
    for (const leaf of classifyLeaves(loadContractWithSidecars(root, entry.name), boundary)) {
      if (leaf.disposition === "unclassified") { unclassified.push({ component: entry.name, leaf: `${leaf.source}:${leaf.keyed}` }); continue; }
      counts[leaf.disposition]++;
      used.add(leaf.rule!);
      if (leaf.catchAll) catchAll.push({ component: entry.name, leaf: `${leaf.source}:${leaf.keyed}`, rule: leaf.rule! });
    }
  }
  const deadRules = boundary.rules.filter(rule => !used.has(rule.id) && rule.catchAll !== true).map(rule => rule.id);
  return { entries, counts, unclassified, catchAll, deadRules };
};

export function inventory(root: string, boundary: GodotBoundary = loadBoundary(), emitter: GodotEmitter = createGodotEmitter()): GodotCapabilityInventory {
  return accountAll(root, boundary, emitter).document;
}

// --------------------------------------------------------------- audit ------

export interface GodotCapabilityAudit {
  counts: Record<GodotDisposition | "unclassified", number>;
  unclassified: { component: string; leaf: string }[];
  catchAll: { component: string; leaf: string; rule: string }[];
  deadRules: string[];
  unemitted: { component: string; message: string }[];
  receiptViolations: string[];
  variance: { component: string; prop: string; rule: string }[];
  drift: string[];
  violations: string[];
}

/** Compare a freshly generated inventory with the committed one. */
export function compareInventory(fresh: GodotCapabilityInventory, committed: GodotCapabilityInventory): string[] {
  const drift: string[] = [];
  if (committed.schema !== fresh.schema) drift.push(`inventory schema ${committed.schema ?? "<missing>"} does not match ${fresh.schema}`);
  for (const key of ["schema", "rules", "corpusComponents"] as const) {
    if (JSON.stringify(committed.boundary?.[key]) !== JSON.stringify(fresh.boundary[key]))
      drift.push(`inventory boundary.${key} drifted: committed ${JSON.stringify(committed.boundary?.[key])}, fresh ${JSON.stringify(fresh.boundary[key])}`);
  }
  for (const disposition of ["lowered", "pending", "refused"] as const) {
    if (committed.boundary?.counts?.[disposition] !== fresh.boundary.counts[disposition])
      drift.push(`inventory boundary.counts.${disposition} drifted: committed ${committed.boundary?.counts?.[disposition]}, fresh ${fresh.boundary.counts[disposition]}`);
  }
  if (JSON.stringify(committed.boundary?.deadRules ?? []) !== JSON.stringify(fresh.boundary.deadRules))
    drift.push(`inventory boundary.deadRules drifted: ${JSON.stringify(committed.boundary?.deadRules)} -> ${JSON.stringify(fresh.boundary.deadRules)}`);
  if (committed.variances !== fresh.variances)
    drift.push(`inventory variances drifted: committed ${committed.variances}, fresh ${fresh.variances}`);
  const committedComponents = new Map((committed.components ?? []).map(record => [record.component, record]));
  const freshComponents = new Map(fresh.components.map(record => [record.component, record]));
  for (const name of freshComponents.keys()) {
    if (!committedComponents.has(name)) drift.push(`inventory drift: component ${name} is admitted but not in the committed inventory`);
  }
  for (const name of committedComponents.keys()) {
    if (!freshComponents.has(name)) drift.push(`inventory drift: component ${name} is admitted but not in the committed inventory`);
  }
  for (const [name, record] of freshComponents) {
    const committedRecord = committedComponents.get(name);
    if (!committedRecord) continue;
    for (const key of [
      "admitted", "emitted", "operation", "diagnostic", "contractSha256", "sidecarSha256", "receipt", "variance",
    ] as const) {
      if (JSON.stringify(committedRecord[key]) === JSON.stringify(record[key])) continue;
      drift.push(`inventory drift: ${name} ${key}: committed ${JSON.stringify(committedRecord[key])}, fresh ${JSON.stringify(record[key])}`);
    }
    for (const key of ["counts", "digest"] as const) {
      if (JSON.stringify(committedRecord.boundary?.[key]) === JSON.stringify(record.boundary[key])) continue;
      drift.push(`inventory drift: ${name} boundary.${key}: committed ${JSON.stringify(committedRecord.boundary?.[key])}, fresh ${JSON.stringify(record.boundary[key])}`);
    }
  }
  return drift;
}

const readInventory = (file: string): GodotCapabilityInventory | null => {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as GodotCapabilityInventory;
};

/**
 * Corpus audit for the Godot target: ledger totality, emission of every
 * admitted component, receipt-to-boundary agreement, and inventory drift.
 * `violations` fails `--check`; `variance` is recorded and does not.
 */
export function auditGodotTarget(root: string, options: { boundary?: GodotBoundary; inventoryFile?: string; emitter?: GodotEmitter } = {}): GodotCapabilityAudit {
  const boundary = options.boundary ?? loadBoundary();
  const emitter = options.emitter ?? createGodotEmitter();
  const audit = corpusAudit(root, boundary);
  const result: GodotCapabilityAudit = {
    counts: { ...audit.counts, unclassified: audit.unclassified.length },
    unclassified: audit.unclassified,
    catchAll: audit.catchAll,
    deadRules: audit.deadRules,
    unemitted: [],
    receiptViolations: [],
    variance: [],
    drift: [],
    violations: [],
  };
  const admitted = new Set(godotAllowlist(root));
  for (const item of audit.unclassified) result.violations.push(`unclassified ${item.component} ${item.leaf}`);
  for (const item of audit.catchAll) {
    // Catch-all reliance on a component the target admits is fatal: widening the
    // allowlist must not widen what the ledger silently refuses.
    if (admitted.has(item.component)) result.violations.push(`unadjudicated ${item.component} ${item.leaf} (catch-all ${item.rule})`);
  }
  for (const id of audit.deadRules) result.violations.push(`dead rule ${id} matches no live leaf`);
  // One accounting pass feeds both the receipt obligations and the inventory
  // comparison; a component must not be emitted twice per audit.
  const accounting = accountAll(root, boundary, emitter);
  const fresh = accounting.document;
  for (const record of fresh.components) {
    const receipt = accounting.receipts.get(record.component) ?? null;
    if (!record.emitted || !receipt) {
      const message = record.diagnostic ?? "no capability receipt emitted";
      result.unemitted.push({ component: record.component, message });
      result.violations.push(`unemitted ${record.component}: ${message}`);
      continue;
    }
    const nativeForm = receipt.operation === "text-input" || receipt.operation === "associated-label";
    const account = receiptAccount(record.component, receipt, boundary,
      nativeForm ? classifyLeaves(loadContractWithSidecars(root, record.component), boundary) : undefined);
    result.receiptViolations.push(...account.violations);
    result.violations.push(...account.violations);
    result.variance.push(...account.variance);
  }
  const committed = readInventory(options.inventoryFile ?? inventoryPath(root));
  if (!committed) {
    result.drift.push(`inventory missing at ${options.inventoryFile ?? inventoryPath(root)}; run with --write to regenerate`);
  } else {
    result.drift.push(...compareInventory(fresh, committed));
  }
  result.violations.push(...result.drift);
  return result;
}

/** Write the regenerated inventory. Returns the path written. */
export function writeInventory(root: string, boundary: GodotBoundary = loadBoundary(), file = inventoryPath(root), emitter: GodotEmitter = createGodotEmitter()): string {
  const document = inventory(root, boundary, emitter);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`);
  return file;
}

const main = (): void => {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const write = args.includes("--write");
  const root = path.resolve(args.find(argument => !argument.startsWith("--")) ?? process.cwd());
  if (write) {
    const file = writeInventory(root);
    const document = inventory(root);
    console.log(`godot capability inventory: wrote ${path.relative(root, file)} (${document.components.length} admitted component(s), boundary ${JSON.stringify(document.boundary.counts)}, variance ${document.variances})`);
    return;
  }
  if (!check) {
    console.log(JSON.stringify(inventory(root), null, 2));
    return;
  }
  const audit = auditGodotTarget(root);
  console.log(`godot support boundary: ${JSON.stringify(audit.counts)} rules ${loadBoundary().rules.length} dead ${audit.deadRules.length} shape-variance ${audit.variance.length}`);
  for (const violation of audit.violations) console.error(`  VIOLATION ${violation}`);
  console.log(
    audit.violations.length
      ? `godot capability audit: ${audit.violations.length} violation(s)`
      : "godot capability audit: every leaf classified, no admitted catch-all reliance, no dead rules, every admitted component emitted, every excluded prop adjudicated and named in its receipt, inventory matches a fresh regen (shape variance recorded, not fatal)",
  );
  process.exitCode = audit.violations.length ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
