// @generated:start imports
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { renderTextChildren } from "../../primitives/text-children";
import { useFsdsTheme } from "../../tokens";
import { createBlockquoteStyles } from "./Blockquote.styles";
// @generated:end

// @generated:start types
export type BlockquoteVariant = "default" | "bordered" | "highlighted";
export type BlockquoteSize = "sm" | "md" | "lg";
// @generated:end

// @generated:start props
export interface BlockquoteProps {
  cite?: string;
  variant?: BlockquoteVariant;
  size?: BlockquoteSize;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Blockquote({
  variant,
  size,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: BlockquoteProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createBlockquoteStyles(fsdsTheme), [fsdsTheme]);
  const variantStyleForVariant = variant !== undefined ? ({ "default": styles.root_variant_default, "bordered": styles.root_variant_bordered, "highlighted": styles.root_variant_highlighted } as Record<string, ViewStyle | undefined>)[variant] : undefined;
  const textVariantStyleForVariant = variant !== undefined ? ({ "highlighted": styles.rootText_variant_highlighted } as Record<string, TextStyle | undefined>)[variant] : undefined;
  const textVariantStyleForSize = size !== undefined ? ({ "sm": styles.rootText_variant_sm, "md": styles.rootText_variant_md, "lg": styles.rootText_variant_lg } as Record<string, TextStyle | undefined>)[size] : undefined;
  return (
    <View
      testID={testID}
      style={[styles.root, variantStyleForVariant, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      {renderTextChildren(children, { style: [styles.rootText, textVariantStyleForVariant, textVariantStyleForSize] })}
    </View>
  );
}
// @generated:end
