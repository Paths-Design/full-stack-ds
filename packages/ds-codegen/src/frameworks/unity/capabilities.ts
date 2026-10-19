/** Read-only accounting. Emitted API is NOT semantic or runtime admission.
 * Every contract and sidecar leaf carries the disposition the committed
 * support boundary assigns it (lowered / pending / refused); a component's
 * `status` says whether the dispatcher applies those lowerings at all. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { listComponentContracts, findComponentStyles, findComponentTokens } from "../../contracts-fs.js";
import { buildComponentIR } from "../../ir.js";
import { assertRealized, createUnityEmitter, STYLESHEET_RESOURCE, unityLowering } from "./factory.js";
import { THEME_COMPONENT, type UnsupportedEntry } from "./uss.js";
import { rootPublicMembers } from "./walker.js";
import {
  auditBoundary,
  classifyContract,
  escape,
  loadBoundary,
  loadContractWithSidecars,
  unityAllowlist,
  type Boundary,
  type BoundaryAudit,
  type BoundaryDisposition,
  type ClassifiedLeaf,
  type ContractWithSidecars,
} from "./boundary.js";

export function declaredLeaves(value: unknown, prefix = ""): string[] {
  if (value !== null && typeof value === "object" && Object.keys(value).length) {
    return Object.entries(value).flatMap(([key, child]) => declaredLeaves(child, `${prefix}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`));
  }
  return [prefix];
}

export interface LeafObligation {
  pointer: string;
  keyed: string;
  disposition: BoundaryDisposition | "unclassified";
  rule: string | null;
  catchAll?: true;
}
export interface PropBoundary {
  rule: string | null;
  disposition: BoundaryDisposition | "unclassified";
  via?: string;
  phase?: string;
  reason?: string;
  catchAll?: true;
}

const obligation = (leaf: ClassifiedLeaf): LeafObligation => ({
  pointer: leaf.pointer, keyed: leaf.keyed, disposition: leaf.disposition, rule: leaf.rule, ...(leaf.catchAll ? { catchAll: true as const } : {}),
});

export function accountComponent(contract: ContractWithSidecars, admitted: boolean) {
  const ir = buildComponentIR(contract);
  let source = "", adapter: string | null = null, diagnostic: string | null = null;
  try {
    adapter = unityLowering(ir).behavior;
    source = createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot: "" })[0]!.contents;
  } catch (error) { diagnostic = error instanceof Error ? error.message : String(error); }
  // Only the root class's members are the component's prop surface; compound
  // sub-elements carry their own pairing keys.
  const publicProperties = [...rootPublicMembers(source, ir.name)];
  const boundary = loadBoundary();
  const classified = classifyContract(contract, boundary);
  // Lowered families that declare a realisation must hold for this component's
  // control; a failure is reported here and refuses generation at admission.
  let unrealized: string | null = null;
  if (!diagnostic) {
    try { assertRealized(contract, ir, classified); } catch (error) { unrealized = error instanceof Error ? error.message : String(error); }
  }
  return {
    component: ir.name, admitted, adapter, diagnostic, unrealized,
    status: diagnostic ? "unsupported-shape" : admitted ? "pilot-partial" : "unadmitted-candidate",
    proof: "source-accounting-only",
    props: ir.styledProps.map(prop => {
      const name = prop.name.replace(/(^|[-_])([a-z])/g, (_, _sep: string, c: string) => c.toUpperCase());
      // The member's `name` leaf carries the family rule for the whole prop.
      const leaf = classified.find(l => l.source === "contract" && /^\/props\/[^/]+\/members\/[^/]+$/.test(l.keyed.replace(/\/name$/, "")) && l.keyed.endsWith(`:${prop.name}/name`));
      const rule = leaf?.rule ? boundary.rules.find(r => r.id === leaf.rule) : undefined;
      const account: PropBoundary = { rule: leaf?.rule ?? null, disposition: leaf?.disposition ?? "unclassified" };
      if (rule?.via) account.via = rule.via;
      if (rule?.phase) account.phase = rule.phase;
      if (rule?.reason) account.reason = rule.reason;
      if (leaf?.catchAll) account.catchAll = true;
      return { name: prop.name, disposition: publicProperties.includes(name) ? "emitted-api" : "not-emitted", defaultExpr: prop.defaultExpr ?? null, boundary: account };
    }),
    // Deliberately no blanket claim based on the selected adapter: every
    // anatomy, state, binding, accessibility and interaction leaf is listed
    // individually with the boundary rule that classifies it.
    obligations: classified.filter(l => l.source === "contract").map(obligation),
    sidecarObligations: {
      tokens: classified.filter(l => l.source === "tokens").map(obligation),
      styles: classified.filter(l => l.source === "styles").map(obligation),
    },
  };
}

export function inventory(root: string) {
  const registry = JSON.parse(fs.readFileSync(path.join(root, "fsds.targets.json"), "utf8")) as { targets: { id: string; components?: string[] }[] };
  const target = registry.targets.find(t => t.id === "unity");
  if (!target?.components) throw new Error("UNITY_INVENTORY_ALLOWLIST_REQUIRED");
  const entries = listComponentContracts(path.join(root, "packages/ds-contracts"));
  if (!entries.length) throw new Error("UNITY_INVENTORY_EMPTY_CORPUS");
  for (const name of target.components) if (!entries.some(e => e.name === name)) throw new Error(`UNITY_INVENTORY_UNKNOWN_COMPONENT: ${name}`);
  return entries.map(entry => {
    const bytes = fs.readFileSync(entry.absPath);
    const contract = JSON.parse(bytes.toString()) as ContractWithSidecars;
    const sidecars = [["tokens", findComponentTokens(entry)], ["styles", findComponentStyles(entry)]] as const;
    const sidecarHashes: Record<string, string> = {};
    for (const [kind, found] of sidecars) {
      if (!found) continue;
      const data = fs.readFileSync(found.absPath);
      contract[kind] = JSON.parse(data.toString());
      sidecarHashes[kind] = createHash("sha256").update(data).digest("hex");
    }
    return { ...accountComponent(contract, target.components!.includes(entry.name)), contractSha256: createHash("sha256").update(bytes).digest("hex"), sidecarSha256: sidecarHashes };
  });
}

/** The unsupported ledger the Unity emitter generates beside Controls.uss. */
export const unsupportedLedgerPath = (root: string): string => path.join(root, "packages/ds-unity", `${STYLESHEET_RESOURCE}.unsupported.json`);

/**
 * Ledger-to-boundary agreement: a declaration the generated sheet does not
 * realise must not sit behind a leaf the boundary classifies lowered. Each
 * entry of the generated ledger names the sidecar declaration it came from:
 * a styles entry the leaves under /<sourceKey>/<property>, a token entry
 * (sourceKey "tokens") those under the token path, and a refused selector
 * (uss-selector) every leaf of its styles block. An entry no sidecar leaf
 * backs is itself a violation, so the join cannot pass vacuously. No ledger
 * file (a checkout that has not generated the Unity target) yields none.
 */
export function ledgerViolations(root: string, boundary: Boundary = loadBoundary(), ledgerPath: string = unsupportedLedgerPath(root)): string[] {
  if (!fs.existsSync(ledgerPath)) return [];
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8")) as { entries: UnsupportedEntry[] };
  const classified = new Map<string, ClassifiedLeaf[]>();
  const leavesOf = (component: string): ClassifiedLeaf[] => {
    if (!classified.has(component)) classified.set(component, classifyContract(loadContractWithSidecars(root, component), boundary));
    return classified.get(component)!;
  };
  const violations: string[] = [];
  for (const entry of ledger.entries) {
    // A brand's override of a component design slot (sourceKey brand:<id>)
    // comes from the token build's @layer brand, not from a contract or
    // sidecar leaf, so the boundary has no leaf to classify for it.
    if (entry.reason === "uss-design-slot") continue;
    // Token-section rows are token-graph values, not component leaves.
    if (entry.component === THEME_COMPONENT) continue;
    const [source, prefix] = entry.reason === "uss-selector"
      ? ["styles", `/${escape(entry.sourceKey)}`]
      : entry.sourceKey === "tokens"
        ? ["tokens", `/${escape(entry.property)}`]
        : ["styles", `/${escape(entry.sourceKey)}/${escape(entry.property)}`];
    const backing = leavesOf(entry.component).filter(leaf => leaf.source === source && (leaf.pointer === prefix || leaf.pointer.startsWith(`${prefix}/`)));
    const where = `${entry.component} ${entry.sourceKey}${entry.property ? ` ${entry.property}` : ""} (${entry.reason})`;
    if (!backing.length) { violations.push(`ledger ${where}: no ${source} leaf under ${prefix}`); continue; }
    for (const leaf of backing) if (leaf.disposition === "lowered") violations.push(`ledger ${where}: ${source}:${leaf.keyed} is classified lowered by rule ${leaf.rule}`);
  }
  return violations;
}

/**
 * Corpus audit for the Unity target: the boundary audit (every leaf classified,
 * no dead rules, no allowlisted catch-all reliance), the realisation check for
 * every allowlisted component, and the generated ledger's agreement with the
 * boundary. Any entry in `violations` fails `--check`.
 */
export function auditUnityTarget(root: string, boundary: Boundary = loadBoundary()): BoundaryAudit & { unrealized: { component: string; message: string }[]; ledger: string[] } {
  const audit = { ...auditBoundary(root, boundary), unrealized: [] as { component: string; message: string }[], ledger: ledgerViolations(root, boundary) };
  audit.violations.push(...audit.ledger);
  for (const name of unityAllowlist(root)) {
    const contract = loadContractWithSidecars(root, name);
    try {
      assertRealized(contract, buildComponentIR(contract), classifyContract(contract, boundary));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      audit.unrealized.push({ component: name, message });
      audit.violations.push(`unrealized ${name}: ${message}`);
    }
  }
  return audit;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const root = path.resolve(args.find(a => !a.startsWith("--")) ?? process.cwd());
  const audit = auditUnityTarget(root);
  if (check) {
    console.log(`unity support boundary: ${JSON.stringify(audit.counts)} pending by phase ${JSON.stringify(audit.perPhase)}`);
    for (const violation of audit.violations) console.error(`  VIOLATION ${violation}`);
    console.log(audit.violations.length ? `unity support boundary: ${audit.violations.length} violation(s)` : "unity support boundary: every leaf classified, no dead rules, no allowlisted catch-all reliance, every lowered claim realised on the allowlist, no ledgered declaration classified lowered");
    process.exit(audit.violations.length ? 1 : 0);
  }
  const components = inventory(root);
  console.log(JSON.stringify({
    schema: "unity-capability-inventory.v2",
    limitations: "API presence is not semantic support. A lowered disposition states the family has a lowering; the component status says whether the dispatcher applies it. Pending and refused leaves block full-parity claims.",
    boundary: { counts: audit.counts, perPhase: audit.perPhase, violations: audit.violations },
    components,
  }, null, 2));
}
