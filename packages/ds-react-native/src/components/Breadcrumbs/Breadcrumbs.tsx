// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Text as RNText, View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { useFsdsTheme } from "../../tokens";
import { createBreadcrumbsStyles } from "./Breadcrumbs.styles";
import { useFsdsMessages } from "../../primitives/messages";
// @generated:end

// @generated:start types

// @generated:end

// @generated:start props
export interface BreadcrumbsProps {
  ariaLabel?: string;
  separator?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
const BreadcrumbsMessages = { navigationLabel: "Breadcrumb" };

export function Breadcrumbs({
  ariaLabel: ariaLabelProp,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: BreadcrumbsProps) {
  const fsdsMessages = useFsdsMessages("Breadcrumbs", BreadcrumbsMessages);
  const ariaLabel = ariaLabelProp ?? fsdsMessages.navigationLabel;
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createBreadcrumbsStyles(fsdsTheme), [fsdsTheme]);
  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel ?? ariaLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <View
        style={styles.list}
      >
        {typeof children === "string" ? <RNText>{children}</RNText> : children}
      </View>
    </View>
  );
}
// @generated:end
