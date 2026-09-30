import { effect, type Signal, type DestroyRef } from '@angular/core';
import { createFocusTrapLifecycle, type FocusTarget } from '../focus-trap.js';

export interface FocusTrapOptions {
  active: Signal<boolean>;
  destroyRef: DestroyRef;
  getInitialFocus?: () => FocusTarget;
  getReturnFocus?: () => FocusTarget;
}

export function createFocusTrap(
  containerRef: { nativeElement: HTMLElement | null },
  opts: FocusTrapOptions,
): void {
  const lifecycle = createFocusTrapLifecycle({
    ...opts,
    getActive: () => opts.active(),
    getContainer: () => containerRef.nativeElement,
  });
  const watcher = effect(lifecycle.update);
  opts.destroyRef.onDestroy(() => { watcher.destroy(); lifecycle.dispose(); });
}
