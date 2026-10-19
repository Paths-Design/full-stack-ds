// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useFsdsTheme } from "../../tokens";
import { createCheckboxStyles } from "./Checkbox.styles";
// @generated:end

// @generated:start types
export type CheckboxSize = "sm" | "md" | "lg";
// @generated:end

// @generated:start props
export interface CheckboxProps {
  size?: CheckboxSize;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
  name?: string;
  value?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Checkbox({
  checked: controlledChecked,
  indeterminate,
  disabled,
  defaultChecked = false,
  onChange,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: CheckboxProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createCheckboxStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledChecked, setUncontrolledChecked] = useState<boolean>((defaultChecked ?? false) as boolean);
  const checked = controlledChecked !== undefined ? controlledChecked : uncontrolledChecked;
  const setCheckedValue = useCallback((next: boolean) => {
    if (controlledChecked === undefined) setUncontrolledChecked(next);
    onChange?.(next);
  }, [controlledChecked, onChange]);

  return (
    <Pressable
      testID={testID}
      style={[styles.root, styles.input, style]}
      disabled={disabled}
      onPress={() => setCheckedValue(!checked)}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: indeterminate ? "mixed" : Boolean(checked), disabled: disabled }}
    >
      <View style={[styles.indicator, checked || indeterminate ? styles.indicator_checked : undefined]}>
        <RNText style={styles.indicatorMark}>{indeterminate ? "-" : checked ? "x" : ""}</RNText>
      </View>
      {typeof children === "string" ? <RNText style={styles.label}>{children}</RNText> : children}
    </Pressable>
  );
}
// @generated:end
