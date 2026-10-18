// @generated:start imports
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Text as RNText, View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { useFsdsTheme } from "../../tokens";
import { createAlertStyles } from "./Alert.styles";
import { useFsdsMessages } from "../../primitives/messages";
import { Button } from "../Button/Button";
// @generated:end

// @generated:start types
export type AlertIntent = "info" | "success" | "warning" | "danger";
export type AlertLevel = "inline" | "section" | "page";
// @generated:end

// @generated:start props
export interface AlertProps {
  intent?: AlertIntent;
  level?: AlertLevel;
  dismissible?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
  icon?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
const AlertMessages = { dismiss: "Dismiss" };

export function Alert({
  intent,
  level,
  dismissible,
  onDismiss,
  dismissLabel: dismissLabelProp,
  icon,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: AlertProps) {
  const fsdsMessages = useFsdsMessages("Alert", AlertMessages);
  const dismissLabel = dismissLabelProp ?? fsdsMessages.dismiss;
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createAlertStyles(fsdsTheme), [fsdsTheme]);
  const variantStyleForIntent = intent !== undefined ? ({ "info": styles.root_variant_info, "success": styles.root_variant_success, "warning": styles.root_variant_warning, "danger": styles.root_variant_danger } as Record<string, ViewStyle | undefined>)[intent] : undefined;
  const textVariantStyleForIntent = intent !== undefined ? ({ "info": styles.rootText_variant_info, "success": styles.rootText_variant_success, "warning": styles.rootText_variant_warning, "danger": styles.rootText_variant_danger } as Record<string, TextStyle | undefined>)[intent] : undefined;
  const variantStyleForLevel = level !== undefined ? ({ "inline": styles.root_variant_inline, "section": styles.root_variant_section, "page": styles.root_variant_page } as Record<string, ViewStyle | undefined>)[level] : undefined;
  const textVariantStyleForLevel = level !== undefined ? ({ "inline": styles.rootText_variant_inline, "section": styles.rootText_variant_section, "page": styles.rootText_variant_page } as Record<string, TextStyle | undefined>)[level] : undefined;
  return (
    <View
      testID={testID}
      style={[styles.root, variantStyleForIntent, variantStyleForLevel, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
      accessibilityRole="alert"
    >
      {icon ? (
      <View
        style={styles.icon}
        accessible={false}
      >
        <RNText>{icon}</RNText>
      </View>
      ) : null}
      {typeof children === "string" ? <RNText style={[styles.rootText, textVariantStyleForIntent, textVariantStyleForLevel]}>{children}</RNText> : children}
      {dismissible ? (
      <Button
        ariaLabel={dismissLabel}
        type="button"
        onClick={onDismiss}
      />
      ) : null}
    </View>
  );
}
// @generated:end
