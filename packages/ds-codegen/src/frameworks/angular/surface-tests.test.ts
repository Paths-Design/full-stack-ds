import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildComponentIR } from "../../ir.js";
import { generateAngularSurfaceTest } from "./surface-tests.js";

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

describe("angular surface-tests — anchored surfaces", () => {
  it("emits the test and fixture files for Tooltip", () => {
    const source = generateAngularSurfaceTest(irFor("Tooltip"));
    expect(source).toContain("@generated:start");
  });

  it("emits for the part-key-lowered Popover", () => {
    const source = generateAngularSurfaceTest(irFor("Popover"));
    expect(source).toContain("@generated:start");
  });

  it("scans each surface closed, and open over document.body once its content rendered", () => {
    for (const name of ["Tooltip", "Popover"]) {
      const source = generateAngularSurfaceTest(irFor(name));
      expect(source, name).toContain(`import axe from "axe-core";`);
      expect(source, name).toContain(`describe("${name} — accessibility", () => {`);
      expect(source, name).toContain(
        `    const fixture = mount();\n    await fixture.whenStable();\n    expect(getAnchor(fixture.nativeElement as HTMLElement, false)).not.toBeNull();\n    const results = await axe.run(fixture.nativeElement as HTMLElement, componentAxeOptions);`,
      );
      expect(source, name).toContain(
        `    expect(getContentEl(fixture.nativeElement as HTMLElement)).not.toBeNull();\n    const results = await axe.run(document.body, componentAxeOptions);`,
      );
    }
  });
});
