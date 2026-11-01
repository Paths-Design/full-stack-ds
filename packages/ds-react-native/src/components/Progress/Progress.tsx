// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { renderTextChildren } from "../../primitives/text-children";
import { useFsdsTheme } from "../../tokens";
import { createProgressStyles } from "./Progress.styles";
// @generated:end

// @generated:start types
export type ProgressVariant = "linear" | "circular";
export type ProgressSize = "sm" | "md" | "lg";
export type ProgressIntent = "info" | "success" | "warning" | "danger";
// @generated:end

// @generated:start props
export interface ProgressProps {
  value?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  intent?: ProgressIntent;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number, max: number) => string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Progress({
  value,
  label,
  showValue,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: ProgressProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createProgressStyles(fsdsTheme), [fsdsTheme]);
  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityValue={{ min: 0, max: 100, now: Number(value ?? 0) }}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityLabelledBy={accessibilityLabelledBy}
      accessibilityRole="progressbar"
    >
      <View
        style={styles.track}
        accessible={false}
      >
        <View
          style={[styles.fill, { width: `${Math.max(0, Math.min(100, Number(value ?? 0)))}%` }]}
        />
      </View>
      {showValue ? (
      <View
        style={styles.value}
      >
        {renderTextChildren(children, { style: styles.rootText })}
      </View>
      ) : null}
    </View>
  );
}
// @generated:end
