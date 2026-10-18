// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
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
  value?: Date | Date[] | null;
  defaultValue?: Date | Date[] | null;
  onChange?: (value: Date | Date[] | null) => void;
  mode?: CalendarMode;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  locale?: string;
  shouldCloseOnSelect?: boolean;
  days?: Date[];
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
const isEntrySelected = (candidate: unknown, current: unknown): boolean => {
  if (current === null || current === undefined) return false;
  const list = Array.isArray(current) ? current : [current];
  return list.some((entry) =>
    typeof entry === "object" && entry !== null && "getTime" in entry
      ? (entry as Date).getTime() === (candidate as Date).getTime()
      : entry === candidate);
};

const CalendarMessages = { caption: "Calendar", previousMonth: "Previous month", nextMonth: "Next month", gridLabel: "Calendar" };

export function Calendar({
  caption: captionProp,
  value: controlledValue,
  days,
  defaultValue = undefined,
  onChange,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: CalendarProps) {
  const fsdsMessages = useFsdsMessages("Calendar", CalendarMessages);
  const caption = captionProp ?? fsdsMessages.caption;
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createCalendarStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledValue, setUncontrolledValue] = useState<Date | Date[] | null>((defaultValue ?? undefined) as Date | Date[] | null);
  const value = controlledValue ?? uncontrolledValue;
  const setValueValue = useCallback((next: Date | Date[] | null) => {
    if (controlledValue === undefined) setUncontrolledValue(next);
    onChange?.(next);
  }, [controlledValue, onChange]);

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
          accessibilityRole="button"
        />
        <View
          style={styles.caption}
        >
          <RNText>{caption}</RNText>
        </View>
        <Pressable
          style={styles.nav}
          accessibilityLabel={fsdsMessages.nextMonth}
          accessibilityRole="button"
        />
      </View>
      <View
        style={styles.grid}
        accessibilityLabel={fsdsMessages.gridLabel}
      >
        <View
          style={styles.root}
        >
          <View
            style={styles.root}
          >
            {(days ?? []).map((item, index) => (
                <View
                  key={index}
                  style={styles.cell}
                >
                  <Pressable
                    style={[styles.day, isEntrySelected(item, value) ? styles.day_state_selected : undefined]}
                    onPress={() => setValueValue(item)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isEntrySelected(item, value) }}
                  >
                    <RNText>{item.getDate()}</RNText>
                  </Pressable>
                </View>
              ))}
          </View>
        </View>
      </View>
    </View>
  );
}
// @generated:end
