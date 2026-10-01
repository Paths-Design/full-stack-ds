import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import type { TargetCensus } from "../types/data";

/** Presence establishes a named output file, never compilation or runtime parity. */
export async function inspectTargetOutputs(
  dir: string,
  corpus: readonly string[],
  descriptor = false,
): Promise<{ names: string[]; sourceCoverage: TargetCensus["sourceCoverage"] }> {
  const names: string[] = [];
  if (existsSync(dir)) {
    for (const name of corpus) {
      const componentDir = path.join(dir, name);
      if (!existsSync(componentDir)) continue;
      const files = await readdir(componentDir, { withFileTypes: true });
      const found = files.some((file) => file.isFile() && (descriptor
        ? file.name === `${name}.figma.json`
        : file.name.startsWith(`${name}.`) &&
          /^(?:component\.)?(?:tsx|ts|vue|svelte|swift|kt|cs|gd)$/.test(file.name.slice(name.length + 1))));
      if (found) names.push(name);
    }
  }
  return {
    names,
    sourceCoverage: corpus.length > 0 && names.length === corpus.length
      ? "full" : names.length > 0 ? "partial" : "none",
  };
}

