/** Read-only accounting. Emitted API is NOT semantic or runtime admission.
 * All remaining contract leaves stay visible as unassessed obligations. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { listComponentContracts } from "../../contracts-fs.js";
import type { ComponentContract } from "../../contract.js";
import { buildComponentIR } from "../../ir.js";
import { createUnityEmitter, unityLowering } from "./factory.js";

export function declaredLeaves(value: unknown, prefix = ""): string[] {
  if (value !== null && typeof value === "object" && Object.keys(value).length) {
    return Object.entries(value).flatMap(([key, child]) => declaredLeaves(child, `${prefix}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`));
  }
  return [prefix];
}
export function accountComponent(contract: ComponentContract, admitted: boolean, tokens = contract.tokens) {
  const ir = buildComponentIR({ ...contract, tokens });
  let source = "", adapter: string | null = null, diagnostic: string | null = null;
  try {
    adapter = unityLowering(ir).base;
    source = createUnityEmitter().emitComponent(ir, { componentsRoot: "", contractsRoot: "" })[0]!.contents;
  } catch (error) { diagnostic = error instanceof Error ? error.message : String(error); }
  const publicProperties = [...source.matchAll(/public (?:new )?(?:bool|string) (\w+) \{/g)].map(match => match[1]);
  return {
    component: ir.name, admitted, adapter, diagnostic,
    status: diagnostic ? "unsupported-shape" : admitted ? "pilot-partial" : "unadmitted-candidate",
    proof: "source-accounting-only",
    props: ir.styledProps.map(prop => {
      const name = prop.name.replace(/(^|[-_])([a-z])/g, (_, _sep: string, c: string) => c.toUpperCase());
      return { name: prop.name, disposition: publicProperties.includes(name) ? "emitted-api" : "not-emitted", defaultExpr: prop.defaultExpr ?? null };
    }),
    // Deliberately no blanket claim based on the selected adapter. This includes
    // anatomy, state, binding, accessibility and interaction facts individually.
    obligations: declaredLeaves(contract).map(pointer => ({ pointer, disposition: "unassessed" })),
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
    const contract = JSON.parse(bytes.toString()) as ComponentContract;
    let tokens: ComponentContract["tokens"];
    const sidecars = ["tokens", "styles"].flatMap(kind => {
      const p = entry.absPath.replace(".contract.json", `.${kind}.json`);
      if (!fs.existsSync(p)) return [];
      const data = fs.readFileSync(p);
      if (kind === "tokens") tokens = JSON.parse(data.toString());
      return [{ kind, sha256: createHash("sha256").update(data).digest("hex"), obligations: declaredLeaves(JSON.parse(data.toString())).map(pointer => ({ pointer, disposition: "unassessed" })) }];
    });
    return { ...accountComponent(contract, target.components!.includes(entry.name), tokens), contractSha256: createHash("sha256").update(bytes).digest("hex"), sidecars };
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(process.argv[2] ?? process.cwd());
  const components = inventory(root);
  console.log(JSON.stringify({ schema: "unity-capability-inventory.v1", limitations: "API presence is not semantic support; unassessed obligations and not-emitted props block full-parity claims.", components }, null, 2));
}
