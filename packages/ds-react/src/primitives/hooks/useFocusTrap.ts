import { type RefObject, useLayoutEffect, useRef } from "react";
import { createFocusTrapLifecycle, type FocusTarget } from "../focus-trap";

export interface UseFocusTrapOptions {
  active: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  initialFocus?: FocusTarget;
  returnFocus?: FocusTarget;
}

/** Follow the mounted panel and preserve one return target per activation. */
export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  options: UseFocusTrapOptions,
): void {
  const latest = useRef({ containerRef, options });
  latest.current = { containerRef, options };
  const lifecycle = useRef<ReturnType<typeof createFocusTrapLifecycle> | null>(null);
  if (!lifecycle.current) {
    lifecycle.current = createFocusTrapLifecycle({
      getActive: () => latest.current.options.active,
      getContainer: () => latest.current.containerRef.current,
      getInitialFocus: () => latest.current.options.initialFocus ?? latest.current.options.initialFocusRef?.current,
      getReturnFocus: () => latest.current.options.returnFocus ?? latest.current.options.returnFocusRef?.current,
    });
  }
  // Reconcile the actual node after every commit, without restarting an
  // unchanged trap when a parent rerenders.
  useLayoutEffect(() => { lifecycle.current?.update(); });
  useLayoutEffect(() => () => lifecycle.current?.dispose(), []);
}
