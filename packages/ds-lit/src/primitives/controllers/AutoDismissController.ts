import type { ReactiveController, ReactiveControllerHost } from "lit";
import { createPresenceBudget } from "../presence-budget.js";

export interface AutoDismissOptions {
  open: () => boolean;
  durationMs: () => number | null | undefined;
  onDismiss: () => void;
  pauseOnInteraction?: boolean;
  reducedMotionSteps?: number;
}

function createAutoDismiss(options: AutoDismissOptions) {
  const budget = createPresenceBudget(() => options.onDismiss(), options.reducedMotionSteps);
  const sync = () => budget.sync(options.open(), options.durationMs());
  const interaction = (fn: () => void) => () => {
    if (options.pauseOnInteraction !== false) fn();
  };
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
export class AutoDismissController implements ReactiveController {
  private budget: ReturnType<typeof createAutoDismiss>;
  constructor(host: ReactiveControllerHost, options: AutoDismissOptions) {
    this.budget = createAutoDismiss(options);
    host.addController(this);
  }
  hostUpdated() { this.budget.sync(); }
  hostDisconnected() { this.budget.destroy(); }
  sync = () => this.budget.sync();
  pause = () => this.budget.pause();
  resume = () => this.budget.resume();
  bindProgress = (el: Element | undefined) => this.budget.bindProgress(el);
  get pauseListeners() { return this.budget.pauseListeners; }
}
