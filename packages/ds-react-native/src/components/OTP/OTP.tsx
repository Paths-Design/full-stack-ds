// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { TextInput, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useFsdsTheme } from "../../tokens";
import { createOTPStyles } from "./OTP.styles";
import { useFsdsMessages } from "../../primitives/messages";
// @generated:end

// @generated:start types
export type OTPMode = "numeric" | "alphanumeric";
// @generated:end

// @generated:start props
export interface OTPProps {
  length?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  mode?: OTPMode;
  disabled?: boolean;
  readOnly?: boolean;
  label?: string;
  fieldLabel?: string;
  ariaDescribedby?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
const OTPMessages = { groupLabel: "One-time password", fieldLabel: "One-time password digit" };

export function OTP({
  length = 6,
  value: controlledValue,
  disabled,
  readOnly,
  label: labelProp,
  fieldLabel: fieldLabelProp,
  defaultValue = "",
  onChange,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: OTPProps) {
  const fsdsMessages = useFsdsMessages("OTP", OTPMessages);
  const label = labelProp ?? fsdsMessages.groupLabel;
  const fieldLabel = fieldLabelProp ?? fsdsMessages.fieldLabel;
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createOTPStyles(fsdsTheme), [fsdsTheme]);
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
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <View
        style={styles.group}
      >
        {Array.from({ length: Number(length ?? 0) }).map((_, index) => (
            <TextInput
              key={index}
              style={styles.field}
              editable={!(disabled || Boolean(readOnly))}
              accessibilityLabel={fieldLabel}
              readOnly={Boolean(readOnly)}
              onChangeText={(text: string) => setValueValue(String(value ?? '').padEnd(index, ' ').slice(0, index) + String(text ?? '').slice(-1) + String(value ?? '').slice(index + 1))}
              accessibilityState={{ disabled: disabled }}
            />
          ))}
      </View>
    </View>
  );
}
// @generated:end
