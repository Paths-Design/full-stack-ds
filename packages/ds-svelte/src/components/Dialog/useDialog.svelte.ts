// @generated:start imports
import { createControllableState, createDismissal, createFocusTrap, createScrollLock } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseDialogOptions {
  open?: () => boolean | undefined;
  defaultOpen?: () => boolean | undefined;
  onOpenChange?: () => ((value: boolean) => void) | undefined;
  closeOnEscape?: () => boolean | undefined;
  closeOnBackdropClick?: () => boolean | undefined;
  initialFocus?: () => string | undefined;
  returnFocus?: () => string | undefined;
  /** When false the surface is non-blocking: no focus trap, no scroll lock. */
  modal?: () => boolean | undefined;
}

export interface UseDialogResult {
  readonly openness: boolean;
  setOpenness(next: boolean): void;
  panelRef: { el: HTMLElement | null };
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useDialog(opts: UseDialogOptions = {}): UseDialogResult {
  const opennessState = createControllableState<boolean>({
    controlled: opts.open,
    defaultValue: opts.defaultOpen?.() ?? false,
    onChange: (v) => opts.onOpenChange?.()?.(v),
  });

  const panelRef = { el: null as HTMLElement | null };
  createFocusTrap({ getActive: () => opennessState.value && (opts.modal?.() ?? true), containerRef: panelRef,
    getInitialFocus: opts.initialFocus,
    getReturnFocus: opts.returnFocus,
  });

  createScrollLock(() => opennessState.value && (opts.modal?.() ?? true));

  createDismissal({
    open: () => opennessState.value,
    closeOnEscape: opts.closeOnEscape,
    onDismiss: () => { opennessState.set(false); },
  });

  return {
    get openness() { return opennessState.value; },
    setOpenness(v) { opennessState.set(v); },
    panelRef,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
