// @generated:start imports
import type { AccessibilityRole, StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { MotionPart, MotionPartScope } from "../../primitives/motion-parts";
import { useFsdsTheme } from "../../tokens";
import { createSkeletonStyles } from "./Skeleton.styles";
// @generated:end

// @generated:start types
export type SkeletonVariant = "block" | "text" | "avatar" | "media" | "dataviz" | "actions";
export type SkeletonAnimate = "shimmer" | "wipe" | "pulse" | "none";
export type SkeletonDensity = "compact" | "regular" | "spacious";
export type SkeletonRadius = "sm" | "md" | "lg";
// @generated:end

// @generated:start props
export interface SkeletonProps {
  variant?: SkeletonVariant;
  animate?: SkeletonAnimate;
  density?: SkeletonDensity;
  aspectRatio?: string;
  lines?: number;
  radius?: SkeletonRadius;
  decorative?: boolean;
  ariaLabel?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Skeleton({
  variant = "block",
  animate = "shimmer",
  lines,
  decorative = true,
  ariaLabel,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: SkeletonProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createSkeletonStyles(fsdsTheme), [fsdsTheme]);
  const variantStyleForVariant = variant !== undefined ? ({ "block": styles.root_variant_block, "text": styles.root_variant_text, "avatar": styles.root_variant_avatar, "media": styles.root_variant_media, "dataviz": styles.root_variant_dataviz, "actions": styles.root_variant_actions } as Record<string, ViewStyle | undefined>)[variant] : undefined;
  const variantStyleForAnimate = animate !== undefined ? ({ "wipe": styles.root_variant_wipe } as Record<string, ViewStyle | undefined>)[animate] : undefined;
  return (
<MotionPartScope>{motionParts => (
    <View
      testID={testID}
      style={[styles.root, variantStyleForVariant, variantStyleForAnimate, style]}
      accessibilityRole={(((decorative ? "presentation" : "status") === "presentation" ? "none" : (decorative ? "presentation" : "status")) as AccessibilityRole)}
      accessible={!(String((decorative ? "true" : "false")) === "true")}
      accessibilityLabel={accessibilityLabel ?? ariaLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
      accessibilityState={{ busy: String((decorative ? "false" : "true")) === "true" }}
    >
      {lines ? (
      <View
        style={styles.stack}
      >
        {Array.from({ length: Number(lines ?? 0) }).map((_, index) => (
            <View
              key={index}
              style={styles.row}
            >
<MotionPart projection={motionParts["shape"]} index={index} style={styles.shape}>
              <View
                style={styles.shape}
                accessible={false}
              />
</MotionPart>
            </View>
          ))}
      </View>
      ) : null}
    </View>
)}</MotionPartScope>
  );
}
// @generated:end
