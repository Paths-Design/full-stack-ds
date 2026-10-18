// @generated:start imports
import { type DestroyRef, type Signal } from "@angular/core";
import { createControllableState } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseDetailsOptions {
  open?: () => boolean | undefined;
  defaultOpen?: boolean;
  onOpenChange?: (value: boolean) => void;
  destroyRef: DestroyRef;
}

export interface UseDetailsResult {
  open: Signal<boolean>;
  setOpen: (next: boolean) => void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useDetails(options: UseDetailsOptions): UseDetailsResult {
  const { value: open, set: setOpen } = createControllableState<boolean>({
    controlled: options.open,
    defaultValue: options.defaultOpen ?? false,
    onChange: options.onOpenChange,
  });

  return {
    open,
    setOpen,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
