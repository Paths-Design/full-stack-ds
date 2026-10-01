import { sequenceBudgetContract } from "../../../../ds-react/src/primitives/hooks/__tests__/sequence-budget.contract";
import { createSequenceBudget } from "../sequence-budget";
import * as runner from "vitest";

sequenceBudgetContract("lit", createSequenceBudget, runner);
