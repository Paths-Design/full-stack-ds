// @generated:start imports
import { type DestroyRef, type Signal } from "@angular/core";
import { createControllableState, createDismissal } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseWalkthroughOptions {
  index?: () => number | undefined;
  defaultIndex?: number;
  onStepChange?: (value: number) => void;
  closeOnOutsideClick?: boolean;
  destroyRef: DestroyRef;
}

export interface UseWalkthroughResult {
  step: Signal<number>;
  setStep: (next: number) => void;
  panelRef: { nativeElement: HTMLElement | null };
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useWalkthrough(options: UseWalkthroughOptions): UseWalkthroughResult {
  const { value: step, set: setStep } = createControllableState<number>({
    controlled: options.index,
    defaultValue: options.defaultIndex ?? 0,
    onChange: options.onStepChange,
  });

  const panelRef: { nativeElement: HTMLElement | null } = { nativeElement: null };
  createDismissal({
    open: () => true,
    closeOnEscape: () => true,
    onDismiss: () => { void 0; },
    destroyRef: options.destroyRef,
  });

  return {
    step,
    setStep,
    panelRef,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
