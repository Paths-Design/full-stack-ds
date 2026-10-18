// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Text as RNText, View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { useFsdsTheme } from "../../tokens";
import { createChipStyles } from "./Chip.styles";
import { useFsdsMessages } from "../../primitives/messages";
import { Button } from "../Button/Button";
// @generated:end

// @generated:start types
export type ChipType = "button" | "submit" | "reset";
export type ChipVariant = "default" | "selected" | "dismissible";
export type ChipSize = "small" | "medium" | "large";
// @generated:end

// @generated:start props
export interface ChipProps {
  type?: ChipType;
  variant?: ChipVariant;
  size?: ChipSize;
  disabled?: boolean;
  icon?: ReactNode;
  title?: string;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  ariaPressed?: boolean;
  onClick?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
const ChipMessages = { dismiss: "Remove" };

export function Chip({
  type,
  variant,
  size,
  disabled,
  icon,
  ariaLabel,
  ariaExpanded,
  ariaPressed,
  onClick,
  dismissible,
  onDismiss,
  dismissLabel: dismissLabelProp,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: ChipProps) {
  const fsdsMessages = useFsdsMessages("Chip", ChipMessages);
  const dismissLabel = dismissLabelProp ?? fsdsMessages.dismiss;
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createChipStyles(fsdsTheme), [fsdsTheme]);
  const variantStyleForVariant = variant !== undefined ? ({ "selected": styles.root_variant_selected } as Record<string, ViewStyle | undefined>)[variant] : undefined;
  const variantStyleForSize = size !== undefined ? ({ "small": styles.root_variant_small, "medium": styles.root_variant_medium, "large": styles.root_variant_large } as Record<string, ViewStyle | undefined>)[size] : undefined;
  const iconStyleForSize = size !== undefined ? ({ "small": styles.icon_variant_small, "medium": styles.icon_variant_medium, "large": styles.icon_variant_large } as Record<string, ViewStyle | undefined>)[size] : undefined;
  return (
    <View
      testID={testID}
      style={[styles.root, variantStyleForVariant, variantStyleForSize, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <Button
        type={type}
        disabled={disabled}
        ariaLabel={ariaLabel}
        ariaExpanded={ariaExpanded}
        ariaPressed={ariaPressed}
        variant="ghost"
        onClick={onClick}
      >
        {icon ? (
        <View
          style={[styles.icon, iconStyleForSize]}
          accessible={false}
        >
          <RNText>{icon}</RNText>
        </View>
        ) : null}
        <View
          style={styles.text}
        >
          {typeof children === "string" ? <RNText>{children}</RNText> : children}
        </View>
      </Button>
      {dismissible ? (
      <Button
        disabled={disabled}
        ariaLabel={dismissLabel}
        type="button"
        variant="ghost"
        onClick={onDismiss}
      />
      ) : null}
    </View>
  );
}
// @generated:end
