// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useDateGrid } from "../../primitives/hooks/useDateGrid";
import { useFsdsTheme } from "../../tokens";
import { createCalendarStyles } from "./Calendar.styles";
import { useFsdsMessages } from "../../primitives/messages";
// @generated:end

// @generated:start types
export type CalendarMode = "single" | "range";
// @generated:end

// @generated:start props
export interface CalendarProps {
  caption?: string;
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  value?: Date | Date[] | null;
  defaultValue?: Date | Date[] | null;
  onChange?: (value: Date | Date[] | null) => void;
  mode?: CalendarMode;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  locale?: string;
  shouldCloseOnSelect?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
const CalendarMessages = { previousMonth: "Previous month", nextMonth: "Next month" };

export function Calendar({
  caption,
  month: controlledMonth,
  value: controlledValue,
  mode = "single",
  disabled,
  minDate,
  maxDate,
  locale = "en-US",
  defaultValue = undefined,
  onChange,
  defaultMonth = undefined,
  onMonthChange,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: CalendarProps) {
  const fsdsMessages = useFsdsMessages("Calendar", CalendarMessages);
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createCalendarStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledValue, setUncontrolledValue] = useState<Date | Date[] | null>((defaultValue ?? undefined) as Date | Date[] | null);
  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;
  const setValueValue = useCallback((next: Date | Date[] | null) => {
    if (controlledValue === undefined) setUncontrolledValue(next);
    onChange?.(next);
  }, [controlledValue, onChange]);

  const [uncontrolledMonth, setUncontrolledMonth] = useState<Date>((defaultMonth ?? undefined) as Date);
  const month = controlledMonth !== undefined ? controlledMonth : uncontrolledMonth;
  const setMonthValue = useCallback((next: Date) => {
    if (controlledMonth === undefined) setUncontrolledMonth(next);
    onMonthChange?.(next);
  }, [controlledMonth, onMonthChange]);

  const dateGrid = useDateGrid({ value: value, month: month, mode: mode, locale: locale, minDate: minDate, maxDate: maxDate, disabled: disabled, caption: caption, onValueChange: setValueValue, onMonthChange: setMonthValue });
  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <View
        style={styles.header}
      >
        <Pressable
          style={styles.nav}
          accessibilityLabel={fsdsMessages.previousMonth}
          disabled={String(dateGrid.state.previousDisabled) === "true"}
          onPress={dateGrid.previous}
          accessibilityRole="button"
          accessibilityState={{ disabled: String(dateGrid.state.previousDisabled) === "true" }}
        >
          <View
            accessible={false}
          >
            <RNText>{"‹"}</RNText>
          </View>
        </Pressable>
        <View
          style={styles.caption}
          accessibilityLiveRegion="polite"
        >
          <RNText>{dateGrid.state.caption}</RNText>
        </View>
        <Pressable
          style={styles.nav}
          accessibilityLabel={fsdsMessages.nextMonth}
          disabled={String(dateGrid.state.nextDisabled) === "true"}
          onPress={dateGrid.next}
          accessibilityRole="button"
          accessibilityState={{ disabled: String(dateGrid.state.nextDisabled) === "true" }}
        >
          <View
            accessible={false}
          >
            <RNText>{"›"}</RNText>
          </View>
        </Pressable>
      </View>
      <View
        style={styles.grid}
        accessibilityLabel={dateGrid.state.caption}
      >
        <View
        >
          <View
          >
            {(dateGrid.state.weekdays ?? []).map((item, index) => (
                <View
                  key={index}
                  style={styles.weekday}
                  accessibilityLabel={item.long}
                >
                  <View
                  >
                    <RNText>{item.short}</RNText>
                  </View>
                </View>
              ))}
          </View>
        </View>
        <View
        >
          {(dateGrid.state.weeks ?? []).map((week, row) => (
              <View
                key={row}
              >
                {(week.days ?? []).map((day, column) => (
                    <Pressable
                      key={column}
                      style={[styles.day, day.selected ? styles.day_state_selected : undefined]}
                      accessibilityLabel={day.fullLabel}
                      disabled={String(day.disabled) === "true"}
                      onPress={() => dateGrid.select(day)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: String(day.selected) === "true", disabled: String(day.disabled) === "true" }}
                    >
                      <View
                      >
                        <RNText>{day.label}</RNText>
                      </View>
                    </Pressable>
                  ))}
              </View>
            ))}
        </View>
      </View>
    </View>
  );
}
// @generated:end
