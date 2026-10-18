// @generated:start imports
import { type Ref } from "vue";
import { useAnchorToggle } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseToastOptions {
  open?: () => boolean | undefined;
  onOpenChange?: (value: boolean) => void;
}

export interface UseToastResult {
  open: Ref<boolean>;
  setOpen: (next: boolean) => void;
  panelRef: Ref<HTMLElement | null>;
  anchorRef: Ref<HTMLElement | null>;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useToast(options: UseToastOptions = {}): UseToastResult {
  const anchorToggle = useAnchorToggle({
    open: options.open,
    defaultOpen: false,
    onOpenChange: options.onOpenChange,
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
