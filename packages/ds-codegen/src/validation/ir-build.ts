/**
 * The IR build as a semantic check. Normalizing a contract validates facts no
 * schema can express (message references and params, sequence part ownership,
 * channel and prop references), and each failure throws. `generate:check`
 * runs this first and reports the failure as a DRIFT issue for that contract,
 * so one broken contract neither crashes the pass nor hides the rest.
 */
import type { ComponentContract } from "../contract.js";
import { buildComponentIR } from "../ir.js";
import type { ValidationIssue } from "../validate.js";

export function validateContractIr(
  contract: ComponentContract,
  allContracts?: ReadonlyMap<string, ComponentContract>,
): ValidationIssue[] {
  try {
    buildComponentIR(structuredClone(contract), { allContracts });
    return [];
  } catch (err) {
    return [{ pointer: "/", message: err instanceof Error ? err.message : String(err) }];
  }
}
