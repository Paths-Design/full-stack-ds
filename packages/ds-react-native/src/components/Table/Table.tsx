// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Text as RNText, View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { useFsdsTheme } from "../../tokens";
import { createTableStyles } from "./Table.styles";
// @generated:end

// @generated:start types

// @generated:end

// @generated:start props
export interface TableProps {
  responsive?: boolean;
  ariaLabel?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Table({
  ariaLabel,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: TableProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createTableStyles(fsdsTheme), [fsdsTheme]);
  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <View
        style={styles.container}
        accessibilityLabel={ariaLabel}
      >
        {typeof children === "string" ? <RNText style={styles.rootText}>{children}</RNText> : children}
      </View>
    </View>
  );
}
// @generated:end
