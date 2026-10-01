// @generated:start imports
import type { AccessibilityRole, StyleProp, TextStyle } from "react-native";
import { View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { NativeGlyph } from "../../primitives/glyph";
import { useFsdsTheme } from "../../tokens";
import { createIconStyles } from "./Icon.styles";
// @generated:end

// @generated:start types

// @generated:end

// @generated:start props
export interface IconProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  decorative?: boolean;
  ariaLabel?: string;
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Icon({
  name,
  size = "md",
  decorative = true,
  ariaLabel,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: IconProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createIconStyles(fsdsTheme), [fsdsTheme]);
  const variantStyleForSize = size !== undefined ? ({ "sm": styles.root_variant_sm, "md": styles.root_variant_md, "lg": styles.root_variant_lg, "xl": styles.root_variant_xl } as Record<string, TextStyle | undefined>)[size] : undefined;
  return (
    <View
      testID={testID}
      style={[styles.root, variantStyleForSize, style]}
      accessibilityRole={(((decorative ? "presentation" : "img") === "presentation" ? "none" : (decorative ? "presentation" : "img")) as AccessibilityRole)}
      accessible={!(String((decorative ? "true" : "false")) === "true")}
      accessibilityLabel={accessibilityLabel ?? ariaLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <NativeGlyph name={name ?? ""} size={({"sm":16,"md":20,"lg":24,"xl":32} as Record<string, number>)[String(size)]}
        frameStyle={[styles.root, variantStyleForSize, style]}
      />
    </View>
  );
}
// @generated:end
