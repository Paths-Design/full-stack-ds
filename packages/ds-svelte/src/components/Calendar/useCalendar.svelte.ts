// @generated:start imports
import { createControllableState, createDismissal } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseCalendarOptions {
  value?: () => Date | Date[] | null | undefined;
  defaultValue?: () => Date | Date[] | null | undefined;
  onChange?: () => ((value: Date | Date[] | null) => void) | undefined;
  month?: () => Date | undefined;
  defaultMonth?: () => Date | undefined;
  onMonthChange?: () => ((value: Date) => void) | undefined;
  shouldCloseOnSelect?: () => boolean | undefined;
}

export interface UseCalendarResult {
  readonly value: Date | Date[] | null;
  setValue(next: Date | Date[] | null): void;
  readonly month: Date;
  setMonth(next: Date): void;
  panelRef: { el: HTMLElement | null };
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useCalendar(opts: UseCalendarOptions = {}): UseCalendarResult {
  const valueState = createControllableState<Date | Date[] | null>({
    controlled: opts.value,
    defaultValue: opts.defaultValue?.() ?? undefined as never,
    onChange: (v) => opts.onChange?.()?.(v),
  });

  const monthState = createControllableState<Date>({
    controlled: opts.month,
    defaultValue: opts.defaultMonth?.() ?? undefined as never,
    onChange: (v) => opts.onMonthChange?.()?.(v),
  });

  const panelRef = { el: null as HTMLElement | null };
  createDismissal({
    open: () => true,
    closeOnEscape: () => true,
    onDismiss: () => { void 0; },
  });

  return {
    get value() { return valueState.value; },
    setValue(v) { valueState.set(v); },
    get month() { return monthState.value; },
    setMonth(v) { monthState.set(v); },
    panelRef,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
