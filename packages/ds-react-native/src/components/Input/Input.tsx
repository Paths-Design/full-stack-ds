// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { TextInput } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useFsdsTheme } from "../../tokens";
import { createInputStyles } from "./Input.styles";
// @generated:end

// @generated:start types

// @generated:end

// @generated:start props
export interface InputProps {
  type?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  name?: string;
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
export function Input({
  type,
  value: controlledValue,
  placeholder,
  disabled,
  ariaLabel,
  ariaLabelledby,
  defaultValue = "",
  onChange,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: InputProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createInputStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledValue, setUncontrolledValue] = useState<string>((defaultValue ?? "") as string);
  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;
  const setValueValue = useCallback((next: string) => {
    if (controlledValue === undefined) setUncontrolledValue(next);
    onChange?.(next);
  }, [controlledValue, onChange]);

  return (
    <TextInput
      testID={testID}
      style={[styles.root, disabled ? styles.root_state_disabled : undefined, style]}
      secureTextEntry={type === "password"}
      value={String(value ?? "")}
      editable={!(disabled)}
      placeholder={placeholder}
      accessibilityLabel={accessibilityLabel ?? ariaLabel}
      accessibilityLabelledBy={accessibilityLabelledBy ?? ariaLabelledby}
      onChangeText={(next: string) => setValueValue(next)}
      accessibilityState={{ disabled: disabled }}
    />
  );
}
// @generated:end
