// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useFsdsTheme } from "../../tokens";
import { createRadioGroupStyles } from "./RadioGroup.styles";
// @generated:end

// @generated:start types
export type RadioGroupOption = { value: string; label: string; disabled?: boolean; description?: string };
export type RadioGroupOrientation = "vertical" | "horizontal";
// @generated:end

// @generated:start props
export interface RadioGroupProps {
  options: RadioGroupOption[];
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  ariaLabel?: string;
  orientation?: RadioGroupOrientation;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function RadioGroup({
  options = [{"value":"alpha","label":"Alpha"},{"value":"beta","label":"Beta"}],
  value: controlledSelection,
  ariaLabel,
  defaultValue = "",
  onChange,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: RadioGroupProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createRadioGroupStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledSelection, setUncontrolledSelection] = useState<string>((defaultValue ?? "") as string);
  const selection = controlledSelection !== undefined ? controlledSelection : uncontrolledSelection;
  const setSelectionValue = useCallback((next: string) => {
    if (controlledSelection === undefined) setUncontrolledSelection(next);
    onChange?.(next);
  }, [controlledSelection, onChange]);

  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel ?? ariaLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
      accessibilityRole="radiogroup"
    >
      {(options ?? []).map((item, index) => (
          <Pressable
            key={index}
            disabled={item.disabled}
            accessibilityLabel={item.label}
            onPress={() => setSelectionValue(item.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: Boolean(item.value === selection), disabled: item.disabled }}
            style={[styles.item, { flexDirection: "row", alignItems: "center", minHeight: 44 }]}
          >
            <RNText accessible={false}>{item.value === selection ? "◉ " : "○ "}</RNText>
            <View
              style={styles.label}
            >
              <RNText>{item.label}</RNText>
            </View>
          </Pressable>
        ))}
    </View>
  );
}
// @generated:end
