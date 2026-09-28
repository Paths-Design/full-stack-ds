
import { createPresenceBudget } from "../presence-budget.js";

export interface AutoDismissOptions {
  open: () => boolean;
  durationMs: () => number | null | undefined;
  onDismiss: () => void;
  pauseOnInteraction?: boolean;
  reducedMotionSteps?: number;
}

export function createAutoDismiss(options: AutoDismissOptions) {
  const budget = createPresenceBudget(() => options.onDismiss(), options.reducedMotionSteps);
  const sync = () => budget.sync(options.open(), options.durationMs());
  const interaction = (fn: () => void) => () => {
    if (options.pauseOnInteraction !== false) fn();
  };
  return { ...budget, sync,
    bindProgress: (el: HTMLElement) => {
      budget.bindProgress(el);
      return { destroy: () => budget.bindProgress(null) };
    },
    pauseListeners: {
      onpointerenter: interaction(() => budget.pause("hover")),
      onpointerleave: interaction(() => budget.resume("hover")),
      onfocusin: interaction(() => budget.pause("focus")),
      onfocusout: (event?: { currentTarget: EventTarget | null; relatedTarget: EventTarget | null }) => {
        if (options.pauseOnInteraction !== false) budget.focusOut(event);
      },
    },
  };
}
export type AutoDismissResult = ReturnType<typeof createAutoDismiss>;
