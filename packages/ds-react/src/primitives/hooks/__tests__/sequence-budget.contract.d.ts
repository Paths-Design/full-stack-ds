import type * as Vitest from "vitest";
import type { createSequenceBudget } from "../../sequence-budget";
export type SequenceTestRunner = Pick<typeof Vitest, "afterEach" | "beforeEach" | "describe" | "expect" | "it" | "vi">;
export declare function sequenceBudgetContract(name: string, create: typeof createSequenceBudget, { afterEach, beforeEach, describe, expect, it, vi }: SequenceTestRunner): void;
