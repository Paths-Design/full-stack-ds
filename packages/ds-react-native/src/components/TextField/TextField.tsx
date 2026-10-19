// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { TextInput, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useFsdsTheme } from "../../tokens";
import { createTextFieldStyles } from "./TextField.styles";
// @generated:end

// @generated:start types

// @generated:end

// @generated:start props
export interface TextFieldProps {
  type?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  ariaDescribedby?: string;
  slots?: {
    label?: ReactNode;
    description?: ReactNode;
    error?: ReactNode;
  };
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function TextField({
  type,
  value: controlledValue,
  disabled,
  defaultValue = "",
  onChange,
  slots,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: TextFieldProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createTextFieldStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledValue, setUncontrolledValue] = useState<string>((defaultValue ?? "") as string);
  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;
  const setValueValue = useCallback((next: string) => {
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
        style={styles.label}
      >
        {slots?.label}
      </View>
      <TextInput
        style={styles.field}
        secureTextEntry={type === "password"}
        value={String(value ?? "")}
        editable={!(disabled)}
        onChangeText={(next: string) => setValueValue(next)}
        accessibilityState={{ disabled: disabled }}
      />
      <View
        style={styles.description}
      >
        {slots?.description}
      </View>
      <View
        style={styles.error}
        accessibilityRole="alert"
      >
        {slots?.error}
      </View>
    </View>
  );
}
// @generated:end
