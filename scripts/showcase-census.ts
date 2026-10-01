import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { createDefaultRegistry } from "../packages/ds-codegen/src/registry";
import { loadTargetRegistryConfigV1 } from "../packages/ds-codegen/src/target-packs/config";
import { readPrimitiveIR } from "../packages/ds-codegen/src/primitive-contract";
import { inspectTargetOutputs } from "../src/consumption/showcase-census";
import type { Census, ComponentBundle, TargetCensus } from "../src/types/data";

async function countFiles(dir: string): Promise<number> {
  if (!existsSync(dir)) return 0;
  const entries = await readdir(dir, { withFileTypes: true });
  const counts = await Promise.all(entries.map((entry) =>
    entry.isDirectory() ? countFiles(path.join(dir, entry.name)) : 1,
  ));
  return counts.reduce((sum, count) => sum + count, 0);
}

/** Registry bindings own identities and output roots; this only observes disk. */
export async function buildCensus(
  rootDir: string,
  components: ComponentBundle[],
  foundationTokenCount: number,
): Promise<Census> {
  const contractsRoot = path.join(rootDir, "packages/ds-contracts");
  const registry = createDefaultRegistry({ workspaceRoot: rootDir, contractsRoot });
  const { config } = loadTargetRegistryConfigV1(rootDir);
  const targets: TargetCensus[] = [];
  const presence: Record<string, string[]> = {};
  let generatedFiles = 0;
  for (const configured of config.targets) {
    // Missing declarations fail visibly rather than silently shrinking the census.
    const declaration = registry.describeDeclaration(configured.id);
    const pack = declaration.targetPack;
    const family = pack.target.family === "web-dom" ? "web"
      : pack.outputs.fileKinds.includes("descriptor") ? "descriptor" : "native";
    const binding = declaration.executable ? registry.get(configured.id) : null;
    const observed = binding
      ? await inspectTargetOutputs(binding.componentsRoot, components.map((c) => c.name), family === "descriptor")
      : { names: [], sourceCoverage: "none" as const };
    presence[configured.id] = observed.names;
    if (binding) generatedFiles += await countFiles(binding.componentsRoot);
    targets.push({
      id: configured.id,
      label: pack.target.label,
      family,
      componentsShipped: observed.names.length,
      sourceCoverage: observed.sourceCoverage,
      allowlisted: configured.components !== undefined,
      executable: declaration.executable,
      railAdmitted: binding?.railFrameworkId !== undefined,
    });
  }
  const iconDir = path.join(rootDir, "packages/ds-iconography/icons");
  const icons = existsSync(iconDir)
    ? (await readdir(iconDir, { withFileTypes: true })).filter((entry) => entry.isDirectory()).length : 0;
  return {
    components: components.length,
    primitives: [readPrimitiveIR(contractsRoot).name],
    geometryDefaults: existsSync(path.join(contractsRoot, "primitives/BoxModel.primitive.json")),
    icons,
    foundationTokens: foundationTokenCount,
    componentTokenDeclarations: components.reduce((sum, c) => sum + Object.keys(c.contract.tokens ?? {}).length, 0),
    generatedFiles,
    targets,
    presence,
  };
}
