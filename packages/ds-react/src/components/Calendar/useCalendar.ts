// @generated:start imports
import { useControllableState, useDismissal } from "../../primitives/hooks";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseCalendarOptions {
  /** Controlled "value" value. */
  value?: Date | Date[] | null;
  /** Initial uncontrolled "value" value. */
  defaultValue?: Date | Date[] | null;
  /** Called when "value" changes. */
  onChange?: (value: Date | Date[] | null) => void;
  /** Controlled "month" value. */
  month?: Date;
  /** Initial uncontrolled "month" value. */
  defaultMonth?: Date;
  /** Called when "month" changes. */
  onMonthChange?: (value: Date) => void;
  /** Selecting a date closes the popup (controlled by shouldCloseOnSelect). */
  shouldCloseOnSelect?: boolean;
}

export interface UseCalendarResult {
  value: Date | Date[] | null;
  setValue: (next: Date | Date[] | null) => void;
  month: Date;
  setMonth: (next: Date) => void;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useCalendar(options: UseCalendarOptions = {}): UseCalendarResult {
  const [value, setValue] = useControllableState<Date | Date[] | null>({
    controlled: options.value,
    defaultValue: options.defaultValue ?? undefined as never,
    onChange: options.onChange,
  });

  const [month, setMonth] = useControllableState<Date>({
    controlled: options.month,
    defaultValue: options.defaultMonth ?? undefined as never,
    onChange: options.onMonthChange,
  });

  return {
    value,
    setValue,
    month,
    setMonth,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
