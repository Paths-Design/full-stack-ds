// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Text as RNText, View } from "react-native";
import { type ReactNode, useMemo, useState } from "react";
import { useFsdsTheme } from "../../tokens";
import { createDetailsStyles } from "./Details.styles";
import { Icon } from "../Icon/Icon";
// @generated:end

// @generated:start types
export type DetailsVariant = "default" | "inline" | "compact";
export type DetailsIcon = "left" | "right" | "none";
// @generated:end

// @generated:start props
export interface DetailsProps {
  summary: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  variant?: DetailsVariant;
  icon?: DetailsIcon;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Details({
  summary,
  open: controlledOpen,
  disabled,
  variant = "default",
  defaultOpen = false,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: DetailsProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createDetailsStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledOpen] = useState<boolean>((defaultOpen ?? false) as boolean);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;

  const variantStyleForVariant = variant !== undefined ? ({ "inline": styles.root_variant_inline } as Record<string, ViewStyle | undefined>)[variant] : undefined;
  return (
    <View
      testID={testID}
      style={[styles.root, variantStyleForVariant, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <View
        style={styles.summary}
        accessibilityState={{ disabled: String(disabled) === "true" }}
      >
        <View
          style={styles.summaryContent}
        >
          <Icon
            name="chevron-down"
            size="sm"
          />
          <View
            style={styles.summaryText}
          >
            <RNText>{summary}</RNText>
          </View>
        </View>
      </View>
      {open ? (
      <View
        style={styles.content}
      >
        {typeof children === "string" ? <RNText>{children}</RNText> : children}
      </View>
      ) : null}
    </View>
  );
}
// @generated:end
