// @generated:start imports
import { type ReactNode, type RefObject, useRef } from "react";
import { useControllableState, useDismissal, useFocusTrap, usePortal, useScrollLock } from "../../primitives/hooks";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseDialogOptions {
  /** Controlled "openness" value. */
  open?: boolean;
  /** Initial uncontrolled "openness" value. */
  defaultOpen?: boolean;
  /** Called when "openness" changes. */
  onOpenChange?: (value: boolean) => void;
  /** Whether "escape" dismissal is enabled. */
  closeOnEscape?: boolean;
  /** Whether "overlayClick" dismissal is enabled. */
  closeOnBackdropClick?: boolean;
  /** When false the surface is non-blocking: no focus trap, no scroll lock. */
  modal?: boolean;
  /** CSS selector or element ID used by the focus policy. */
  initialFocus?: string;
  /** CSS selector or element ID used by the focus policy. */
  returnFocus?: string;
}

export interface UseDialogResult {
  openness: boolean;
  setOpenness: (next: boolean) => void;
  panelRef: RefObject<HTMLDivElement | null>;
  renderInPortal: (node: ReactNode) => ReactNode;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useDialog(options: UseDialogOptions = {}): UseDialogResult {
  const [openness, setOpenness] = useControllableState<boolean>({
    controlled: options.open,
    defaultValue: options.defaultOpen ?? false,
    onChange: options.onOpenChange,
  });

  const panelRef = useRef<HTMLDivElement>(null);
  useDismissal({
    open: openness,
    onDismiss: () => setOpenness(false),
    closeOnEscape: options.closeOnEscape !== false,
  });

  useFocusTrap(panelRef, {
    active: openness && (options.modal ?? true),
    initialFocus: options.initialFocus,
    returnFocus: options.returnFocus,
  });

  useScrollLock(openness && (options.modal ?? true));

  const portal = usePortal({
    enabled: true,
  });

  return {
    openness,
    setOpenness,
    panelRef,
    renderInPortal: portal.render,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
