// @generated:start imports
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { renderTextChildren } from "../../primitives/text-children";
import { useFsdsTheme } from "../../tokens";
import { createStatStyles } from "./Stat.styles";
// @generated:end

// @generated:start types
export type StatSize = "sm" | "md" | "lg";
export type StatTrend = "up" | "down" | "neutral";
// @generated:end

// @generated:start props
export interface StatProps {
  size?: StatSize;
  trend?: StatTrend;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Stat({
  size = "md",
  trend,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: StatProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createStatStyles(fsdsTheme), [fsdsTheme]);
  const textVariantStyleForSize = size !== undefined ? ({ "sm": styles.rootText_variant_sm, "lg": styles.rootText_variant_lg } as Record<string, TextStyle | undefined>)[size] : undefined;
  const textVariantStyleForTrend = trend !== undefined ? ({ "up": styles.rootText_variant_up, "down": styles.rootText_variant_down, "neutral": styles.rootText_variant_neutral } as Record<string, TextStyle | undefined>)[trend] : undefined;
  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      {renderTextChildren(children, { style: [styles.rootText, textVariantStyleForSize, textVariantStyleForTrend] })}
    </View>
  );
}
// @generated:end
