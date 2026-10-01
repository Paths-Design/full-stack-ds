import { sequenceBudgetContract } from "./sequence-budget.contract";
import * as runner from "vitest";
import { createSequenceBudget as react } from "../../sequence-budget";
import { createSequenceBudget as vue } from "../../../../../ds-vue/src/primitives/sequence-budget";
import { createSequenceBudget as svelte } from "../../../../../ds-svelte/src/primitives/sequence-budget";
import { createSequenceBudget as angular } from "../../../../../ds-angular/src/primitives/sequence-budget";
import { createSequenceBudget as lit } from "../../../../../ds-lit/src/primitives/sequence-budget";

for (const [name, create] of Object.entries({ react, vue, svelte, angular, lit })) {
  sequenceBudgetContract(name, create, runner);
}
