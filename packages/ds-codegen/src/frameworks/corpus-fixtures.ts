import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ComponentContract } from "../contract.js";
import { componentsDir } from "../contracts-fs.js";
import { buildComponentIR, type ComponentIR } from "../ir.js";

/**
 * Corpus-backed fixture helpers for framework emitter tests.
 *
 * The contract corpus (packages/ds-contracts/components) is the authority
 * for component shape. Loading the real contract — instead of a synthetic
 * trimmed copy — keeps emitter tests honest about the IR shapes the
 * generators actually meet: compound containers (Tabs), guarded open
 * channels (Select), dismissal triggers (Dialog), and surface taxonomies
 * (Popover/Toast) all carry facts that hand-built fixtures tend to lose.
 */

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

export function loadCorpusContract(name: string): ComponentContract {
  const contractPath = path.join(
    REPO_ROOT,
    "packages/ds-contracts/components",
    name,
    `${name}.contract.json`,
  );
  const contract = JSON.parse(fs.readFileSync(contractPath, "utf8")) as ComponentContract;
  for (const kind of ["tokens", "styles"] as const) {
    const sidecar = contractPath.replace(".contract.json", `.${kind}.json`);
    if (fs.existsSync(sidecar)) contract[kind] = JSON.parse(fs.readFileSync(sidecar, "utf8"));
  }
  return contract;
}

export function corpusIR(name: string): ComponentIR {
  return buildComponentIR(loadCorpusContract(name));
}

/**
 * Component names discovered by the contract loader's corpus walk —
 * the same authority `pnpm run docs:check-claims` derives the
 * component-count marker from. Never a hand-maintained list.
 */
export function allCorpusComponentNames(): string[] {
  return fs
    .readdirSync(componentsDir(path.join(REPO_ROOT, "packages/ds-contracts")), {
      withFileTypes: true,
    })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}
