import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildComponentIR } from "../../ir.js";
import { generateSvelteSurfaceTestFiles } from "./surface-tests.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = () => resolve(__dirname, "../../../../..");

function loadContract(name: string): unknown {
  const folder = resolve(repoRoot(), "packages/ds-contracts/components", name);
  const contract = JSON.parse(
    readFileSync(resolve(folder, `${name}.contract.json`), "utf8"),
  ) as { name: string };
  for (const sidecar of ["tokens", "styles"]) {
    const p = resolve(folder, `${name}.${sidecar}.json`);
    if (existsSync(p)) {
      (contract as Record<string, unknown>)[sidecar] = JSON.parse(readFileSync(p, "utf8"));
    }
  }
  return contract;
}

function irFor(name: string) {
  return buildComponentIR(loadContract(name) as Parameters<typeof buildComponentIR>[0]);
}

describe("svelte surface-tests — anchored surfaces", () => {
  it("emits the test and fixture files for Tooltip", () => {
    const files = generateSvelteSurfaceTestFiles(irFor("Tooltip"));
    expect(files.testFile).toContain("@generated:start");
    expect(files.fixtureFile.length).toBeGreaterThan(0);
  });

  it("emits for the part-key-lowered Popover", () => {
    const files = generateSvelteSurfaceTestFiles(irFor("Popover"));
    expect(files.testFile).toContain("@generated:start");
  });

  it("CODEGEN-EMIT-LINT-HYGIENE-01: augments vitest's Assertion with a referenced T", () => {
    const files = generateSvelteSurfaceTestFiles(irFor("Tooltip"));

    expect(files.testFile).toContain(`interface Assertion<T> {`);
    expect(files.testFile).toContain(`toHaveNoViolations(expected?: T): void;`);
    expect(files.testFile).not.toContain(`toHaveNoViolations(): void;`);
  });

  it("CODEGEN-EMIT-LINT-HYGIENE-01: drops container bindings orphaned by the portal rewrite", () => {
    const files = generateSvelteSurfaceTestFiles(irFor("Popover"));
    const body = files.testFile;

    // Content-only it-blocks: the mountDefault call carries no destructure.
    expect(body).toContain("    mountDefault({ defaultOpen: true });");
    // Trigger-query tests keep reading `container` — destructure preserved.
    expect(body).toMatch(/const \{ container \} = mountDefault\(/);
    // Per-block invariant (mirrors dropOrphanedContainerBindings): every
    // remaining destructure is followed by another container reference
    // before its it-block closes.
    const marker = "const { container } = mountDefault(";
    for (let i = body.indexOf(marker); i !== -1; i = body.indexOf(marker, i + 1)) {
      const blockEnd = body.indexOf("\n  });", i);
      const rest = body.slice(i + marker.length, blockEnd === -1 ? body.length : blockEnd);
      expect(rest, `destructure at offset ${i} must still be read`).toMatch(/\bcontainer\b/);
    }
  });
});
