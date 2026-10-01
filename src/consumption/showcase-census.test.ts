// @vitest-environment node
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectTargetOutputs } from "./showcase-census";

const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function fixture(outputs: Record<string, string[]>): string {
  const root = mkdtempSync(path.join(tmpdir(), "showcase-census-"));
  fixtures.push(root);
  for (const [name, files] of Object.entries(outputs)) {
    const dir = path.join(root, name);
    mkdirSync(dir);
    for (const file of files) writeFileSync(path.join(dir, file), "");
  }
  return root;
}

describe("showcase source coverage", () => {
  it("cannot substitute a foreign directory for a missing corpus component", async () => {
    const dir = fixture({ Button: ["Button.tsx"], Foreign: ["Foreign.tsx"] });
    expect(await inspectTargetOutputs(dir, ["Button", "Dialog"])).toEqual({
      names: ["Button"], sourceCoverage: "partial",
    });
  });
  it("does not count empty directories or tests as component sources", async () => {
    const dir = fixture({ Button: [], Dialog: ["Dialog.test.tsx"] });
    expect(await inspectTargetOutputs(dir, ["Button", "Dialog"])).toEqual({
      names: [], sourceCoverage: "none",
    });
  });
  it("recognizes a complete native source corpus without claiming runtime parity", async () => {
    const dir = fixture({ Button: ["Button.kt"], Dialog: ["Dialog.kt"] });
    expect(await inspectTargetOutputs(dir, ["Dialog", "Button"])).toEqual({
      names: ["Dialog", "Button"], sourceCoverage: "full",
    });
  });
  it("counts Figma descriptors separately from component sources", async () => {
    const dir = fixture({ Button: ["Button.figma.json"] });
    expect(await inspectTargetOutputs(dir, ["Button"], true)).toEqual({
      names: ["Button"], sourceCoverage: "full",
    });
    expect(await inspectTargetOutputs(dir, ["Button"])).toEqual({
      names: [], sourceCoverage: "none",
    });
  });
  it("reports absent and empty output roots without inventing full coverage", async () => {
    const dir = fixture({});
    expect(await inspectTargetOutputs(path.join(dir, "absent"), ["Button"])).toEqual({
      names: [], sourceCoverage: "none",
    });
    expect(await inspectTargetOutputs(dir, [])).toEqual({
      names: [], sourceCoverage: "none",
    });
  });
});
