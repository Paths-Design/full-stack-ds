import type { DestroyRef } from "@angular/core";
import { createPresenceBudget } from "../presence-budget.js";

export interface AutoDismissOptions {
  open: () => boolean;
  durationMs: () => number | null | undefined;
  onDismiss: () => void;
  pauseOnInteraction?: boolean;
  reducedMotionSteps?: number;
  destroyRef: DestroyRef;
}

export function createAutoDismiss(options: AutoDismissOptions) {
  const budget = createPresenceBudget(() => options.onDismiss(), options.reducedMotionSteps);
  const sync = () => budget.sync(options.open(), options.durationMs());
  const interaction = (fn: () => void) => () => {
    if (options.pauseOnInteraction !== false) fn();
  };
  options.destroyRef.onDestroy(budget.destroy);
  return { ...budget, sync,
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
export type AutoDismissResult = ReturnType<typeof createAutoDismiss>;
