import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { listComponentContracts } from "../../contracts-fs.js";
import { auditContract, gpuiAllowlist, loadContractWithSidecars, validateBoundary } from "./boundary.js";
import boundaryJson from "./support-boundary.json" with { type: "json" };

const root = path.resolve(__dirname, "../../../../..");
const contractsRoot = path.join(root, "packages/ds-contracts");

describe("GPUI support boundary", () => {
  const boundary = validateBoundary(boundaryJson);

  it("is a total ledger for every admitted component", () => {
    const admitted = gpuiAllowlist(root);
    const violations: string[] = [];
    for (const name of admitted) {
      for (const violation of auditContract(loadContractWithSidecars(root, name), boundary)) {
        violations.push(`${name}: ${violation.kind} ${violation.source}:${violation.pointer}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("adjudicates every corpus contract, admitted or not", () => {
    const violations: string[] = [];
    for (const entry of listComponentContracts(contractsRoot)) {
      for (const violation of auditContract(loadContractWithSidecars(root, entry.name), boundary)) {
        violations.push(`${entry.name}: ${violation.kind} ${violation.source}:${violation.pointer}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("refuses to classify a leaf family the ledger does not adjudicate", () => {
    const contract = loadContractWithSidecars(root, "Switch") as unknown as Record<string, unknown>;
    contract.unadjudicatedFamily = { invented: true };
    const violations = auditContract(contract as never, boundary);
    expect(violations).toEqual([{ pointer: "/unadjudicatedFamily/invented", source: "contract", rule: "unadjudicated", kind: "catch-all" }]);
  });

  it("admits exactly the corpus the Unity target admits", () => {
    const registry = JSON.parse(fs.readFileSync(path.join(root, "fsds.targets.json"), "utf8")) as { targets: { id: string; components?: string[] }[] };
    const unity = registry.targets.find(target => target.id === "unity")!.components!;
    expect(gpuiAllowlist(root)).toEqual(unity);
  });

  it("keeps a terminal catch-all that refuses unadjudicated families", () => {
    const last = boundary.rules[boundary.rules.length - 1]!;
    expect(last.catchAll).toBe(true);
    expect(last.disposition).toBe("refused");
    expect(boundary.rules.filter(rule => rule.catchAll)).toHaveLength(1);
  });
});
