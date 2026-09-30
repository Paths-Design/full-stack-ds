// @generated:start imports
import { createControllableState, createDismissal, createFocusTrap, createScrollLock } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseSheetOptions {
  open?: () => boolean | undefined;
  defaultOpen?: () => boolean | undefined;
  onOpenChange?: () => ((value: boolean) => void) | undefined;
  /** When false the surface is non-blocking: no focus trap, no scroll lock. */
  modal?: () => boolean | undefined;
}

export interface UseSheetResult {
  readonly openness: boolean;
  setOpenness(next: boolean): void;
  panelRef: { el: HTMLElement | null };
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useSheet(opts: UseSheetOptions = {}): UseSheetResult {
  const opennessState = createControllableState<boolean>({
    controlled: opts.open,
    defaultValue: opts.defaultOpen?.() ?? false,
    onChange: (v) => opts.onOpenChange?.()?.(v),
  });

  const panelRef = { el: null as HTMLElement | null };
  createFocusTrap({ getActive: () => opennessState.value && (opts.modal?.() ?? true), containerRef: panelRef,
  });

  createScrollLock(() => opennessState.value && (opts.modal?.() ?? true));

  createDismissal({
    open: () => opennessState.value,
    closeOnEscape: () => true,
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
