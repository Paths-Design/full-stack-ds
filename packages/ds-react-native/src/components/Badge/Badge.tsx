// @generated:start imports
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Text as RNText, View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { useFsdsTheme } from "../../tokens";
import { createBadgeStyles } from "./Badge.styles";
// @generated:end

// @generated:start types
export type BadgeVariant = "default" | "status" | "counter" | "tag";
export type BadgeIntent = "info" | "success" | "warning" | "danger";
export type BadgeSize = "sm" | "md" | "lg";
// @generated:end

// @generated:start props
export interface BadgeProps {
  variant?: BadgeVariant;
  intent?: BadgeIntent;
  size?: BadgeSize;
  icon?: ReactNode;
  showStatusIcon?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Badge({
  variant,
  intent,
  size,
  icon,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: BadgeProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createBadgeStyles(fsdsTheme), [fsdsTheme]);
  const variantStyleForVariant = variant !== undefined ? ({ "counter": styles.root_variant_counter, "tag": styles.root_variant_tag } as Record<string, ViewStyle | undefined>)[variant] : undefined;
  const textVariantStyleForVariant = variant !== undefined ? ({ "counter": styles.rootText_variant_counter } as Record<string, TextStyle | undefined>)[variant] : undefined;
  const variantStyleForIntent = intent !== undefined ? ({ "info": styles.root_variant_info, "success": styles.root_variant_success, "warning": styles.root_variant_warning, "danger": styles.root_variant_danger } as Record<string, ViewStyle | undefined>)[intent] : undefined;
  const textVariantStyleForIntent = intent !== undefined ? ({ "info": styles.rootText_variant_info, "success": styles.rootText_variant_success, "warning": styles.rootText_variant_warning, "danger": styles.rootText_variant_danger } as Record<string, TextStyle | undefined>)[intent] : undefined;
  const variantStyleForSize = size !== undefined ? ({ "sm": styles.root_variant_sm, "md": styles.root_variant_md, "lg": styles.root_variant_lg } as Record<string, ViewStyle | undefined>)[size] : undefined;
  const textVariantStyleForSize = size !== undefined ? ({ "sm": styles.rootText_variant_sm, "md": styles.rootText_variant_md, "lg": styles.rootText_variant_lg } as Record<string, TextStyle | undefined>)[size] : undefined;
  const iconStyleForSize = size !== undefined ? ({ "sm": styles.icon_variant_sm, "md": styles.icon_variant_md, "lg": styles.icon_variant_lg } as Record<string, ViewStyle | undefined>)[size] : undefined;
  return (
    <View
      testID={testID}
      style={[styles.root, variantStyleForVariant, variantStyleForIntent, variantStyleForSize, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      {icon ? (
      <View
        style={[styles.icon, iconStyleForSize]}
        accessible={false}
      >
        <RNText style={[styles.rootText, textVariantStyleForVariant, textVariantStyleForIntent, textVariantStyleForSize]}>{icon}</RNText>
      </View>
      ) : null}
      <View
        style={styles.content}
      >
        {typeof children === "string" ? <RNText style={[styles.rootText, textVariantStyleForVariant, textVariantStyleForIntent, textVariantStyleForSize]}>{children}</RNText> : children}
      </View>
    </View>
  );
}
// @generated:end
