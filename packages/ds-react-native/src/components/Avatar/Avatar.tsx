// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Text as RNText, View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { useFsdsTheme } from "../../tokens";
import { createAvatarStyles } from "./Avatar.styles";
import { Image } from "../Image/Image";
// @generated:end

// @generated:start types

// @generated:end

// @generated:start props
export interface AvatarProps {
  src?: string;
  name: string;
  initials?: string;
  priority?: boolean;
  size?: "small" | "medium" | "large" | "extra-large";
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Avatar({
  src,
  name,
  initials,
  size,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: AvatarProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createAvatarStyles(fsdsTheme), [fsdsTheme]);
  const variantStyleForSize = size !== undefined ? ({ "small": styles.root_variant_small, "medium": styles.root_variant_medium, "large": styles.root_variant_large, "extra-large": styles.root_variant_extra_large } as Record<string, ViewStyle | undefined>)[size] : undefined;
  return (
    <View
      testID={testID}
      style={[styles.root, variantStyleForSize, style]}
      accessibilityLabel={accessibilityLabel ?? name}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      {src ? (
      <Image
        src={src}
        alt={""}
      />
      ) : null}
      {initials ? (
      <View
        style={styles.initials}
      >
        <RNText style={styles.rootText}>{initials}</RNText>
      </View>
      ) : null}
    </View>
  );
}
// @generated:end
