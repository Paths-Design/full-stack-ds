import { sequenceBudgetContract, type SequenceTestRunner } from "../../../../ds-react/src/primitives/hooks/__tests__/sequence-budget.contract";
import { createSequenceBudget } from "../sequence-budget";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

// Angular's package uses Jest. Adapt clock/global utilities at the harness
// boundary so the same behavioral assertions run under its actual runner.
const originals = new Map<string, PropertyDescriptor | undefined>();
const vi = {
  ...jest,
  stubGlobal(name: string, value: unknown) {
    if (!originals.has(name)) originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
  },
  unstubAllGlobals() {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
    originals.clear();
  },
};
sequenceBudgetContract("angular", createSequenceBudget,
  { afterEach, beforeEach, describe, expect, it, vi } as unknown as SequenceTestRunner);
