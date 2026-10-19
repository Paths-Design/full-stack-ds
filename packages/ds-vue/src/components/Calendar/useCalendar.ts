// @generated:start imports
import { ref, type Ref } from "vue";
import { useControllableState, useDismissal } from "../../primitives/index.js";
// @generated:end

// @custom:start imports

// @custom:end

// @generated:start types
export interface UseCalendarOptions {
  value?: () => Date | Date[] | null | undefined;
  defaultValue?: Date | Date[] | null;
  onChange?: (value: Date | Date[] | null) => void;
  month?: () => Date | undefined;
  defaultMonth?: Date;
  onMonthChange?: (value: Date) => void;
  shouldCloseOnSelect?: boolean;
}

export interface UseCalendarResult {
  value: Ref<Date | Date[] | null>;
  setValue: (next: Date | Date[] | null) => void;
  month: Ref<Date>;
  setMonth: (next: Date) => void;
  panelRef: Ref<HTMLElement | null>;
}
// @generated:end

// @custom:start types

// @custom:end

// @generated:start hook
export function useCalendar(options: UseCalendarOptions = {}): UseCalendarResult {
  const { value: value, set: setValue } = useControllableState<Date | Date[] | null>({
    controlled: options.value,
    defaultValue: options.defaultValue ?? undefined as never,
    onChange: options.onChange,
  });

  const { value: month, set: setMonth } = useControllableState<Date>({
    controlled: options.month,
    defaultValue: options.defaultMonth ?? undefined as never,
    onChange: options.onMonthChange,
  });

  const panelRef = ref<HTMLElement | null>(null);
  useDismissal({
    open: () => true,
    closeOnEscape: () => true,
    onDismiss: () => void 0,
  });

  return {
    value,
    setValue,
    month,
    setMonth,
    panelRef,
  };
}
// @generated:end

// @custom:start trailing

// @custom:end
