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
  const value = controlledValue ?? uncontrolledValue;
  const setValueValue = useCallback((next: Date | Date[] | null) => {
    if (controlledValue === undefined) setUncontrolledValue(next);
    onChange?.(next);
  }, [controlledValue, onChange]);

  const [uncontrolledMonth, setUncontrolledMonth] = useState<Date>((defaultMonth ?? undefined) as Date);
  const month = controlledMonth ?? uncontrolledMonth;
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
          onPress={dateGrid.previous}
          accessibilityRole="button"
          accessibilityState={{ disabled: String(dateGrid.state.previousDisabled) === "true" }}
        >
          <View
            style={styles.root}
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
          onPress={dateGrid.next}
          accessibilityRole="button"
          accessibilityState={{ disabled: String(dateGrid.state.nextDisabled) === "true" }}
        >
          <View
            style={styles.root}
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
          style={styles.root}
        >
          <View
            style={styles.root}
          >
            {(dateGrid.state.weekdays ?? []).map((item, index) => (
                <View
                  key={index}
                  style={styles.weekday}
                  accessibilityLabel={item.long}
                >
                  <View
                    style={styles.root}
                  >
                    <RNText>{item.short}</RNText>
                  </View>
                </View>
              ))}
          </View>
        </View>
        <View
          style={styles.root}
        >
          {(dateGrid.state.weeks ?? []).map((week, row) => (
              <View
                key={row}
                style={styles.root}
              >
                {(week.days ?? []).map((day, column) => (
                    <View
                      key={column}
                      style={styles.cell}
                      accessibilityState={{ selected: String(day.selected) === "true" }}
                    >
                      <Pressable
                        style={[styles.day, day.selected ? styles.day_state_selected : undefined]}
                        accessibilityLabel={day.fullLabel}
                        onPress={() => dateGrid.select(day)}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: String(day.disabled) === "true", selected: day.selected }}
                      >
                        <RNText>{day.label}</RNText>
                      </Pressable>
                    </View>
                  ))}
              </View>
            ))}
        </View>
      </View>
    </View>
  );
}
// @generated:end
