// @generated:start imports
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Linking, Pressable, Text as RNText } from "react-native";
import { type ReactNode, useMemo } from "react";
import { useFsdsTheme } from "../../tokens";
import { createLinksStyles } from "./Links.styles";
// @generated:end

// @generated:start types
export type LinkActivationEvent = { readonly defaultPrevented: boolean; preventDefault(): void };
export type LinkTarget = "_self" | "_blank" | "_parent" | "_top";
export type LinkSize = "small" | "medium" | "large";
// @generated:end

// @generated:start props
export interface LinksProps {
  href?: string;
  target?: LinkTarget;
  rel?: string;
  size?: LinkSize;
  disabled?: boolean;
  onClick?: (event: LinkActivationEvent) => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Links({
  href,
  size,
  disabled,
  onClick,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: LinksProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createLinksStyles(fsdsTheme), [fsdsTheme]);
  const textVariantStyleForSize = size !== undefined ? ({ "small": styles.rootText_variant_small, "medium": styles.rootText_variant_medium, "large": styles.rootText_variant_large } as Record<string, TextStyle | undefined>)[size] : undefined;
  return (
    <Pressable
      testID={testID}
      style={[styles.root, style]}
      disabled={String(disabled) === "true"}
      onPress={(event) => { if (String(disabled) === "true" || event.defaultPrevented) return; onClick?.(event); if (!event.defaultPrevented && href) void Linking.openURL(String(href)); }}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
      accessibilityRole="link"
      accessibilityState={{ disabled: String(disabled) === "true" }}
    >
      {typeof children === "string" ? <RNText style={[styles.rootText, textVariantStyleForSize, (String(disabled) === "true") ? styles.rootText_state_disabled : undefined]}>{children}</RNText> : children}
    </Pressable>
  );
}
// @generated:end
