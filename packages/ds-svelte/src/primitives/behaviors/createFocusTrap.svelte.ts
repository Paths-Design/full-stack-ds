import { onMount } from 'svelte';
import { createFocusTrapLifecycle, type FocusTarget } from '../focus-trap.js';

export interface FocusTrapOptions {
  getActive: () => boolean;
  containerRef: { el: HTMLElement | null };
  getInitialFocus?: () => FocusTarget;
  getReturnFocus?: () => FocusTarget;
}

export function createFocusTrap(opts: FocusTrapOptions): void {
  const lifecycle = createFocusTrapLifecycle({
    ...opts,
    getContainer: () => opts.containerRef.el,
  });
  $effect(lifecycle.update);
  onMount(() => { lifecycle.update(); return lifecycle.dispose; });
}
