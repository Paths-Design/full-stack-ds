import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { listComponentContracts } from "../../contracts-fs.js";
import { auditContract, classifyLeaves, gpuiAllowlist, loadContractWithSidecars, validateBoundary } from "./boundary.js";
import boundaryJson from "./support-boundary.json" with { type: "json" };

const root = path.resolve(__dirname, "../../../../..");
const contractsRoot = path.join(root, "packages/ds-contracts");

describe("GPUI support boundary", () => {
  const boundary = validateBoundary(boundaryJson);
  // Building IR for the whole corpus is the expensive part; classify once and
  // assert from the cached results so both directions stay inside the timeout.
  let admittedViolations: string[] = [];
  let corpusViolations: string[] = [];
  beforeAll(() => {
    const admitted = new Set(gpuiAllowlist(root));
    for (const entry of listComponentContracts(contractsRoot)) {
      const contract = loadContractWithSidecars(root, entry.name);
      for (const violation of auditContract(contract, boundary)) {
        const line = `${entry.name}: ${violation.kind} ${violation.source}:${violation.pointer}`;
        corpusViolations.push(line);
        if (admitted.has(entry.name)) admittedViolations.push(line);
      }
    }
  }, 120000);

  it("is a total ledger for every admitted component", () => {
    expect(admittedViolations).toEqual([]);
  });

  it("adjudicates every corpus contract, admitted or not", () => {
    expect(corpusViolations).toEqual([]);
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

  it("classifies the viewport content label through the accessibility substrate boundary", () => {
    const contract = loadContractWithSidecars(root, "Table");
    const labels = classifyLeaves(contract, boundary).filter(leaf => leaf.keyed.startsWith("/props/styled/members/plain:contentLabel/"));
    expect(labels.map(leaf => leaf.keyed.split("/").at(-1)).sort()).toEqual(["defaultMessage", "description", "name", "type"]);
    for (const leaf of labels) {
      expect(leaf).toMatchObject(leaf.keyed.endsWith("/description")
        ? { rule: "documentation", disposition: "refused", catchAll: false }
        : { rule: "prop-aria-label", disposition: "substrate", catchAll: false });
    }
  });
});

describe('accessibility substrate non-claim', () => {
  it('records every accessibility family as substrate with the missing capability named', () => {
    const accessibility = validateBoundary(boundaryJson).rules.filter(rule => /(^|-)(aria|role)(-|$)|^a11y$/.test(rule.id));
    expect(accessibility.length).toBeGreaterThan(0);
    for (const rule of accessibility) {
      expect(rule.disposition).toBe('substrate');
      expect(rule.reason).toContain('a38fc8c8de6e4010fadcfde7dd111d90dfd66845');
      expect(rule.reason).toContain('accessibility');
    }
  });

  it('keeps unadjudicated families refused rather than substrate', () => {
    const catchAll = validateBoundary(boundaryJson).rules[validateBoundary(boundaryJson).rules.length - 1];
    expect(catchAll.catchAll).toBe(true);
    expect(catchAll.disposition).toBe('refused');
  });
});
