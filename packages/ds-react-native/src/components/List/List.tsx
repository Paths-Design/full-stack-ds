// @generated:start imports
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { renderTextChildren } from "../../primitives/text-children";
import { useFsdsTheme } from "../../tokens";
import { createListStyles } from "./List.styles";
// @generated:end

// @generated:start types
export type ListElement = "ul" | "ol" | "dl";
export type ListVariant = "default" | "unstyled" | "inline" | "divided" | "spaced";
export type ListMarker = "default" | "none" | "disc" | "circle" | "square" | "decimal" | "alpha" | "roman";
export type ListSpacing = "none" | "sm" | "md" | "lg";
export type ListSize = "sm" | "md" | "lg";
// @generated:end

// @generated:start props
export interface ListProps {
  as?: ListElement;
  variant?: ListVariant;
  marker?: ListMarker;
  spacing?: ListSpacing;
  size?: ListSize;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function List({
  variant = "default",
  size,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: ListProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createListStyles(fsdsTheme), [fsdsTheme]);
  const variantStyleForVariant = variant !== undefined ? ({ "inline": styles.root_variant_variant_inline } as Record<string, ViewStyle | undefined>)[variant] : undefined;
  const textVariantStyleForSize = size !== undefined ? ({ "sm": styles.rootText_variant_size_sm, "md": styles.rootText_variant_size_md, "lg": styles.rootText_variant_size_lg } as Record<string, TextStyle | undefined>)[size] : undefined;
  return (
    <View
      testID={testID}
      style={[styles.root, variantStyleForVariant, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      {renderTextChildren(children, { style: [styles.rootText, textVariantStyleForSize] })}
    </View>
  );
}
// @generated:end
