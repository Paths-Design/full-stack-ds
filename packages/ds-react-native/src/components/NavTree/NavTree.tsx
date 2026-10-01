// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Linking, Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { NativeGlyph } from "../../primitives/glyph";
import { useFsdsTheme } from "../../tokens";
import { createNavTreeStyles } from "./NavTree.styles";
// @generated:end

// @generated:start types
export type NavTreeIconSize = "sm" | "md";
// @generated:end

// @generated:start props
export interface NavTreeProps {
  label: string;
  href?: string;
  icon?: string;
  iconSize?: NavTreeIconSize;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function NavTree({
  label,
  href,
  icon,
  iconSize = "sm",
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: NavTreeProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createNavTreeStyles(fsdsTheme), [fsdsTheme]);
  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <View
        style={styles.heading}
      >
        {icon ? (
        <View
          style={styles.icon}
          accessible={false}
        >
          <NativeGlyph name={icon ?? ""} size={({"sm":16,"md":20} as Record<string, number>)[String(iconSize)]}
          />
        </View>
        ) : null}
        {href ? (
        <Pressable
          style={styles.headingLink}
          onPress={() => { if (href) void Linking.openURL(String(href)); }}
          accessibilityRole="link"
        >
          <RNText>{label}</RNText>
        </Pressable>
        ) : null}
        {!(href) ? (
        <View
          style={styles.headingLabel}
        >
          <RNText>{label}</RNText>
        </View>
        ) : null}
      </View>
      <View
        style={styles.list}
      >
        {typeof children === "string" ? <RNText>{children}</RNText> : children}
      </View>
    </View>
  );
}
// @generated:end
