// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { useFsdsTheme } from "../../tokens";
import { createCarouselStyles } from "./Carousel.styles";
import { Icon } from "../Icon/Icon";
// @generated:end

// @generated:start types
export type CarouselIndicator = "pagination" | "next" | "both";
// @generated:end

// @generated:start props
export interface CarouselProps {
  slides?: string[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  autoPlay?: boolean;
  duration?: number | null;
  indicator?: CarouselIndicator;
  label?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Carousel({
  slides = [],
  label = "Featured content",
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: CarouselProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createCarouselStyles(fsdsTheme), [fsdsTheme]);
  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <Pressable
        style={styles.rotation}
        accessibilityRole="button"
      >
        <RNText>{"Start slide rotation"}</RNText>
      </Pressable>
      <View
        style={styles.viewport}
      >
        {typeof children === "string" ? <RNText>{children}</RNText> : children}
      </View>
      <View
        style={styles.controls}
      >
        <Pressable
          style={styles.previous}
          accessibilityRole="button"
        >
          <Icon
            name="arrow-left"
            size="sm"
          />
        </Pressable>
        <View
          style={styles.pagination}
        >
          {(slides ?? []).map((item, index) => (
              <Pressable
                key={index}
                style={styles.picker}
                accessibilityLabel={item}
                accessibilityRole="button"
              >
                <View
                  style={styles.marker}
                  accessible={false}
                >
                  <View
                    style={styles.fill}
                    accessible={false}
                  />
                </View>
              </Pressable>
            ))}
        </View>
        <Pressable
          style={styles.next}
          accessibilityRole="button"
        >
          <View
            style={styles.ring}
            accessible={false}
          />
          <Icon
            name="arrow-right"
            size="sm"
          />
        </Pressable>
      </View>
    </View>
  );
}
// @generated:end
