// @generated:start imports
import { type ReactNode, type RefObject } from "react";
import { useAnchorToggle, usePortal } from "../../primitives/hooks";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseToastOptions {
  /** Controlled "open" value. */
  open?: boolean;
  /** Called when "open" changes. */
  onOpenChange?: (value: boolean) => void;
}

export interface UseToastResult {
  open: boolean;
  setOpen: (next: boolean) => void;
  panelRef: RefObject<HTMLDivElement | null>;
  anchorRef: RefObject<HTMLElement | null>;
  renderInPortal: (node: ReactNode) => ReactNode;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useToast(options: UseToastOptions = {}): UseToastResult {
  // anchor + panel refs come from useAnchorToggle below.
  const anchorToggle = useAnchorToggle({
    open: options.open,
    defaultOpen: false,
    onOpenChange: options.onOpenChange,
  });

  const portal = usePortal({
    enabled: true,
  });

  return {
    open: anchorToggle.open,
    setOpen: anchorToggle.setOpen,
    anchorRef: anchorToggle.anchorRef,
    panelRef: anchorToggle.panelRef as RefObject<HTMLDivElement | null>,
    renderInPortal: portal.render,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
