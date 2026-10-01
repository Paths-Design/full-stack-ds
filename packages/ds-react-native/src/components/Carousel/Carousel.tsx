// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useFsdsTheme } from "../../tokens";
import { createCarouselStyles } from "./Carousel.styles";
import { resolveCarouselTokens } from "./Carousel.tokens";
import { useSequence, SequenceChildren } from "../../primitives/useSequence";
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
  index: controlledSlide,
  autoPlay = false,
  duration,
  label = "Featured content",
  defaultIndex = 0,
  onIndexChange,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: CarouselProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createCarouselStyles(fsdsTheme), [fsdsTheme]);
  const tokens = useMemo(() => resolveCarouselTokens(fsdsTheme), [fsdsTheme]);
  const [uncontrolledSlide, setUncontrolledSlide] = useState<number>((defaultIndex ?? 0) as number);
  const slide = controlledSlide ?? uncontrolledSlide;
  const setSlideValue = useCallback((next: number) => {
    if (controlledSlide === undefined) setUncontrolledSlide(next);
    onIndexChange?.(next);
  }, [controlledSlide, onIndexChange]);

  const sequence = useSequence({
    index: slide, labels: slides,
    autoPlay: autoPlay,
    durationMs: duration === undefined ? Number(tokens.root?.["carousel.timing.advance"] ?? 6000) : duration,
    onIndexChange: setSlideValue,
  }, children);
  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      onTouchStart={sequence.touchStart}
      onTouchEnd={sequence.touchEnd}
      onTouchCancel={sequence.touchEnd}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <Pressable
        style={styles.rotation}
        disabled={!sequence.valid}
        onFocus={sequence.stop}
        onPressIn={sequence.rotatePressIn}
        onPress={sequence.rotate}
        accessibilityLabel={sequence.playing ? "Stop slide rotation" : "Start slide rotation"}
        accessibilityRole="button"
        accessibilityState={{ disabled: !sequence.valid }}
      >
        <RNText>{sequence.playing ? "Stop slide rotation" : "Start slide rotation"}</RNText>
      </Pressable>
      <View
        style={styles.viewport}
      >
        <SequenceChildren sequence={sequence} labels={slides} />
      </View>
      <View
        style={styles.controls}
      >
        <Pressable
          style={styles.previous}
          disabled={!sequence.valid}
          onFocus={sequence.stop}
          onPress={sequence.previous}
          accessibilityLabel="Previous slide"
          accessibilityRole="button"
          accessibilityState={{ disabled: !sequence.valid }}
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
                disabled={!sequence.valid}
                onFocus={sequence.stop}
                onPress={() => sequence.select(index)}
                accessibilityLabel={item}
                accessibilityRole="button"
                accessibilityState={{ disabled: !sequence.valid, selected: index === sequence.index }}
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
          disabled={!sequence.valid}
          onFocus={sequence.stop}
          onPress={sequence.next}
          accessibilityLabel="Next slide"
          accessibilityRole="button"
          accessibilityState={{ disabled: !sequence.valid }}
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
