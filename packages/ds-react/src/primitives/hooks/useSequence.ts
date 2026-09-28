import { useEffect, useRef } from "react";
import { createSequenceBudget, type SequenceConfig, type SequenceOptions } from "../sequence-budget.js";
export function useSequence(config: SequenceConfig, options: SequenceOptions) {
  const controller = useRef<ReturnType<typeof createSequenceBudget> | null>(null);
  if (!controller.current) controller.current = createSequenceBudget(config);
  const sequence = controller.current;
  useEffect(() => { sequence.sync(options); });
  useEffect(() => () => sequence.destroy(), [sequence]);
  return sequence;
}
