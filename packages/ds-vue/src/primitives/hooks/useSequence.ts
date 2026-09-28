import { onBeforeUnmount, watchEffect } from "vue";
import { createSequenceBudget, type SequenceConfig, type SequenceOptions } from "../sequence-budget.js";
export function useSequence(config: SequenceConfig, options: () => SequenceOptions) {
  const sequence = createSequenceBudget(config);
  watchEffect(() => sequence.sync(options()), { flush: "post" });
  onBeforeUnmount(sequence.destroy);
  return sequence;
}
