// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Text as RNText, View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { renderTextChildren } from "../../primitives/text-children";
import { useFsdsTheme } from "../../tokens";
import { createFieldStyles } from "./Field.styles";
// @generated:end

// @generated:start types
export type FieldStatus = "idle" | "validating" | "valid" | "invalid";
// @generated:end

// @generated:start props
export interface FieldProps {
  name: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  validate?: ((value: string, context: { name: string; touched: boolean; dirty: boolean }) => string | string[] | null | Promise<string | string[] | null>);
  status?: FieldStatus;
  validating?: boolean;
  slots?: {
    label?: ReactNode;
    control?: ReactNode;
    help?: ReactNode;
    error?: ReactNode;
    validatingIndicator?: ReactNode;
  };
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Field({
  validating,
  slots,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: FieldProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createFieldStyles(fsdsTheme), [fsdsTheme]);
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
        <RNText
          style={styles.label}
          accessibilityRole="text"
        >
          {slots?.label}
        </RNText>
      </View>
      <View
        style={styles.control}
      >
        {renderTextChildren(slots?.control)}
      </View>
      <View
        style={styles.meta}
      >
        <RNText
          style={styles.help}
          accessibilityRole="text"
        >
          {slots?.help}
        </RNText>
        <RNText
          style={styles.error}
          accessibilityRole="text"
        >
          {slots?.error}
        </RNText>
        {validating ? (
        <RNText
          style={styles.validatingIndicator}
          accessibilityRole="text"
        >
          {slots?.validatingIndicator}
        </RNText>
        ) : null}
      </View>
    </View>
  );
}
// @generated:end
