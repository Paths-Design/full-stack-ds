import { onBeforeUnmount, watchEffect } from "vue";
import { createPresenceBudget } from "../presence-budget.js";

export interface UseAutoDismissOptions {
  open: () => boolean;
  durationMs: () => number | null | undefined;
  onDismiss: () => void;
  pauseOnInteraction?: boolean;
  reducedMotionSteps?: number;
}

export function useAutoDismiss(options: UseAutoDismissOptions) {
  const budget = createPresenceBudget(() => options.onDismiss(), options.reducedMotionSteps);
  const sync = () => budget.sync(options.open(), options.durationMs());
  const interaction = (fn: () => void) => () => {
    if (options.pauseOnInteraction !== false) fn();
  };
  watchEffect(sync);
  onBeforeUnmount(budget.destroy);
  return { ...budget, sync,
    bindProgress: (el: unknown) => budget.bindProgress(el instanceof Element ? el : null),
    pauseListeners: {
      pointerenter: interaction(() => budget.pause("hover")),
      pointerleave: interaction(() => budget.resume("hover")),
      focusin: interaction(() => budget.pause("focus")),
      focusout: (event?: { currentTarget: EventTarget | null; relatedTarget: EventTarget | null }) => {
        if (options.pauseOnInteraction !== false) budget.focusOut(event);
      },
    },
  };
}
export type UseAutoDismissResult = ReturnType<typeof useAutoDismiss>;
