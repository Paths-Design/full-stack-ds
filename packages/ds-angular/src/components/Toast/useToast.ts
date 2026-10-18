// @generated:start imports
import { type DestroyRef, type Signal } from "@angular/core";
import { createAnchorToggle } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseToastOptions {
  open?: () => boolean | undefined;
  onOpenChange?: (value: boolean) => void;
  destroyRef: DestroyRef;
}

export interface UseToastResult {
  open: Signal<boolean>;
  setOpen: (next: boolean) => void;
  panelRef: { nativeElement: HTMLElement | null };
  anchorRef: { nativeElement: HTMLElement | null };
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useToast(options: UseToastOptions): UseToastResult {
  const anchorToggle = createAnchorToggle({
    open: options.open,
    defaultOpen: false,
    onOpenChange: options.onOpenChange,
    destroyRef: options.destroyRef,
  });

  return {
    open: anchorToggle.open,
    setOpen: anchorToggle.setOpen,
    anchorRef: anchorToggle.anchorRef,
    panelRef: anchorToggle.panelRef,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
