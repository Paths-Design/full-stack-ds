// @generated:start imports
import { type DestroyRef, type Signal } from "@angular/core";
import { createControllableState, createDismissal } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseCalendarOptions {
  value?: () => Date | Date[] | null | undefined;
  defaultValue?: Date | Date[] | null;
  onChange?: (value: Date | Date[] | null) => void;
  shouldCloseOnSelect?: boolean;
  destroyRef: DestroyRef;
}

export interface UseCalendarResult {
  value: Signal<Date | Date[] | null>;
  setValue: (next: Date | Date[] | null) => void;
  panelRef: { nativeElement: HTMLElement | null };
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useCalendar(options: UseCalendarOptions): UseCalendarResult {
  const { value: value, set: setValue } = createControllableState<Date | Date[] | null>({
    controlled: options.value,
    defaultValue: options.defaultValue ?? undefined as never,
    onChange: options.onChange,
  });

  const panelRef: { nativeElement: HTMLElement | null } = { nativeElement: null };
  createDismissal({
    open: () => true,
    closeOnEscape: () => true,
    onDismiss: () => { void 0; },
    destroyRef: options.destroyRef,
  });

  return {
    value,
    setValue,
    panelRef,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
