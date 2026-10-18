import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildComponentIR } from "../../ir.js";
import { generateReactSurfaceTest } from "./surface-tests.js";

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

describe("react surface-tests — anchored surfaces", () => {
  it("emits the test and fixture files for Tooltip", () => {
    const source = generateReactSurfaceTest(irFor("Tooltip"));
    expect(source).toContain("@generated:start");
  });

  it("emits for the part-key-lowered Popover", () => {
    const source = generateReactSurfaceTest(irFor("Popover"));
    expect(source).toContain("@generated:start");
  });

  it("CODEGEN-EMIT-LINT-HYGIENE-01: augments vitest's Assertion with a referenced T", () => {
    const source = generateReactSurfaceTest(irFor("Tooltip"));

    expect(source).toContain(`interface Assertion<T> {`);
    expect(source).toContain(`toHaveNoViolations(expected?: T): void;`);
    expect(source).not.toContain(`Assertion<_T>`);
    expect(source).not.toContain("eslint-disable");
  });
});
