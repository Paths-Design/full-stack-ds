// @generated:start imports
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Text as RNText, View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { useFsdsTheme } from "../../tokens";
import { createStatusStyles } from "./Status.styles";
import { Icon } from "../Icon/Icon";
// @generated:end

// @generated:start types
export type StatusIntent = "info" | "success" | "warning" | "danger" | "error";
// @generated:end

// @generated:start props
export interface StatusProps {
  status: StatusIntent;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Status({
  status,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: StatusProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createStatusStyles(fsdsTheme), [fsdsTheme]);
  const variantStyleForStatus = status !== undefined ? ({ "info": styles.root_variant_info, "success": styles.root_variant_success, "warning": styles.root_variant_warning, "danger": styles.root_variant_danger, "error": styles.root_variant_error } as Record<string, ViewStyle | undefined>)[status] : undefined;
  const textVariantStyleForStatus = status !== undefined ? ({ "info": styles.rootText_variant_info, "success": styles.rootText_variant_success, "warning": styles.rootText_variant_warning, "danger": styles.rootText_variant_danger, "error": styles.rootText_variant_error } as Record<string, TextStyle | undefined>)[status] : undefined;
  return (
    <View
      testID={testID}
      style={[styles.root, variantStyleForStatus, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <Icon
        name={(status === "info" ? "info" : (status === "success" ? "check" : (status === "warning" ? "triangle-alert" : (status === "danger" ? "triangle-alert" : "triangle-alert"))))}
        size="sm"
      />
      <View
        style={styles.label}
      >
        {typeof children === "string" ? <RNText style={[styles.rootText, textVariantStyleForStatus]}>{children}</RNText> : children}
      </View>
    </View>
  );
}
// @generated:end
