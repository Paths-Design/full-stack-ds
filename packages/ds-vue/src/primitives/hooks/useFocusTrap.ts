import { onBeforeUnmount, watchEffect, type Ref } from "vue";
import { createFocusTrapLifecycle, type FocusTarget } from "../focus-trap";

export interface UseFocusTrapOptions {
  active: Ref<boolean>;
  initialFocusRef?: Ref<HTMLElement | null>;
  returnFocusRef?: Ref<HTMLElement | null>;
  initialFocus?: () => FocusTarget;
  returnFocus?: () => FocusTarget;
}

/** Reconcile focus after Vue commits its conditional/teleported panel. */
export function useFocusTrap(containerRef: Ref<HTMLElement | null>, options: UseFocusTrapOptions): void {
  const lifecycle = createFocusTrapLifecycle({
    getActive: () => options.active.value,
    getContainer: () => containerRef.value,
    getInitialFocus: () => options.initialFocus?.() ?? options.initialFocusRef?.value,
    getReturnFocus: () => options.returnFocus?.() ?? options.returnFocusRef?.value,
  });
  watchEffect(lifecycle.update, { flush: "post" });
  onBeforeUnmount(lifecycle.dispose);
}
