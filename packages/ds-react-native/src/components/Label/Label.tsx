// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { renderTextChildren } from "../../primitives/text-children";
import { useFsdsTheme } from "../../tokens";
import { createLabelStyles } from "./Label.styles";
// @generated:end

// @generated:start types

// @generated:end

// @generated:start props
export interface LabelProps {
  htmlFor?: string;
  form?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Label({
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: LabelProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createLabelStyles(fsdsTheme), [fsdsTheme]);
  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      {renderTextChildren(children, { style: styles.rootText })}
    </View>
  );
}
// @generated:end
