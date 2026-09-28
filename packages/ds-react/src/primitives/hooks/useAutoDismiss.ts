import { useEffect, useRef } from "react";
import { createPresenceBudget } from "../presence-budget.js";

export interface UseAutoDismissOptions {
  open: boolean;
  /** Positive finite active-time budget. null, undefined and zero disable it. */
  durationMs?: number | null;
  onDismiss: () => void;
  pauseOnInteraction?: boolean;
  reducedMotionSteps?: number;
}

export function useAutoDismiss(options: UseAutoDismissOptions) {
  const latest = useRef(options);
  latest.current = options;
  const budgetRef = useRef<ReturnType<typeof createPresenceBudget> | null>(null);
  if (!budgetRef.current) budgetRef.current = createPresenceBudget(
    () => latest.current.onDismiss(), options.reducedMotionSteps,
  );
  const budget = budgetRef.current;
  useEffect(() => { budget.sync(options.open, options.durationMs); }, [budget, options.open, options.durationMs]);
  useEffect(() => () => budget.destroy(), [budget]);
  const interaction = (fn: () => void) => () => {
    if (latest.current.pauseOnInteraction !== false) fn();
  };
  return {
    ...budget,
    getPauseProps: () => ({
      onPointerEnter: interaction(() => budget.pause("hover")),
      onPointerLeave: interaction(() => budget.resume("hover")),
      onFocusCapture: interaction(() => budget.pause("focus")),
      onBlurCapture: (event?: { currentTarget: EventTarget | null; relatedTarget: EventTarget | null }) => {
        if (latest.current.pauseOnInteraction !== false) budget.focusOut(event);
      },
    }),
  };
}
export type UseAutoDismissResult = ReturnType<typeof useAutoDismiss>;
