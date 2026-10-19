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
import { assertRealized, createUnityEmitter, unityLowering } from "./factory.js";
import {
  auditBoundary,
  classifyContract,
  loadBoundary,
  loadContractWithSidecars,
  unityAllowlist,
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
    adapter = unityLowering(ir).base;
    source = createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot: "" })[0]!.contents;
  } catch (error) { diagnostic = error instanceof Error ? error.message : String(error); }
  const publicProperties = [...source.matchAll(/public (?:new )?(?:bool|string) (\w+) \{/g)].map(match => match[1]);
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

/**
 * Corpus audit for the Unity target: the boundary audit (every leaf classified,
 * no dead rules, no allowlisted catch-all reliance) plus the realisation check
 * for every allowlisted component. Any entry in `violations` fails `--check`.
 */
export function auditUnityTarget(root: string): BoundaryAudit & { unrealized: { component: string; message: string }[] } {
  const audit = { ...auditBoundary(root), unrealized: [] as { component: string; message: string }[] };
  for (const name of unityAllowlist(root)) {
    const contract = loadContractWithSidecars(root, name);
    try {
      assertRealized(contract, buildComponentIR(contract), classifyContract(contract));
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
    console.log(audit.violations.length ? `unity support boundary: ${audit.violations.length} violation(s)` : "unity support boundary: every leaf classified, no dead rules, no allowlisted catch-all reliance, every lowered claim realised on the allowlist");
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
