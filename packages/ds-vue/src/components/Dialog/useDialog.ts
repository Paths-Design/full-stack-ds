// @generated:start imports
import { computed, ref, type Ref } from "vue";
import { useControllableState, useDismissal, useFocusTrap, useScrollLock } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseDialogOptions {
  open?: () => boolean | undefined;
  defaultOpen?: boolean;
  onOpenChange?: (value: boolean) => void;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  initialFocus?: () => string | undefined;
  returnFocus?: () => string | undefined;
  /** When false the surface is non-blocking: no focus trap, no scroll lock. */
  modal?: () => boolean | undefined;
}

export interface UseDialogResult {
  openness: Ref<boolean>;
  setOpenness: (next: boolean) => void;
  panelRef: Ref<HTMLElement | null>;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useDialog(options: UseDialogOptions = {}): UseDialogResult {
  const { value: openness, set: setOpenness } = useControllableState<boolean>({
    controlled: options.open,
    defaultValue: options.defaultOpen ?? false,
    onChange: options.onOpenChange,
  });

  const panelRef = ref<HTMLElement | null>(null);
  const blocking = computed(() => openness.value && (options.modal?.() ?? true));
  useFocusTrap(panelRef, {
    active: blocking,
    initialFocus: options.initialFocus,
    returnFocus: options.returnFocus,
  });

  useScrollLock(blocking);

  useDismissal({
    open: () => openness.value,
    closeOnEscape: () => options.closeOnEscape,
    onDismiss: () => setOpenness(false),
  });

  return {
    openness,
    setOpenness,
    panelRef,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
