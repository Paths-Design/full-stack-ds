// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { MotionPart, MotionPartScope, MotionPartsProvider } from "../../primitives/motion-parts";
import { useFsdsTheme } from "../../tokens";
import { createCarouselStyles } from "./Carousel.styles";
import { resolveCarouselTokens } from "./Carousel.tokens";
import { useSequence, SequenceChildren } from "../../primitives/useSequence";
import { Icon } from "../Icon/Icon";
import { Pagination } from "../Pagination/Pagination";
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
  indicator = "pagination",
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
  }, children, { durationMs: Number(tokens.root?.["carousel.motion.duration"] ?? 250), easing: String(tokens.root?.["carousel.motion.easing"] ?? "cubic-bezier(0.4, 0, 0.2, 1)"), referenceWidth: 320, minMultiplier: 0.5, maxMultiplier: 2 });
  return (
<MotionPartScope>{_motionParts => (
    <View
      testID={testID}
      style={[styles.root, style]}
      onTouchStart={sequence.touchStart}
      onTouchEnd={sequence.touchEnd}
      onTouchCancel={sequence.touchEnd}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      {sequence.timed ? (
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
      ) : null}
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
<MotionPartsProvider value={{ "fill": { effect: "elapsed-width", elapsed: sequence.elapsed, reducedMotion: sequence.reducedMotion, steps: 10, visible: sequence.valid && sequence.timed && ["pagination","both"].includes(indicator ?? ""), activeIndex: sequence.index } }}>
        <Pagination
          pages={slides}
          index={slide}
          progress={(indicator === "pagination" ? "elapsed" : (indicator === "next" ? "none" : "elapsed"))}
          label="Choose slide"
          presentation="indicators"
          onIndexChange={sequence.select}
        />
</MotionPartsProvider>
        <Pressable
          style={styles.next}
          disabled={!sequence.valid}
          onFocus={sequence.stop}
          onPress={sequence.next}
          accessibilityLabel="Next slide"
          accessibilityRole="button"
          accessibilityState={{ disabled: !sequence.valid }}
        >
<MotionPart projection={{ effect: "elapsed-ring", elapsed: sequence.elapsed, reducedMotion: sequence.reducedMotion, steps: 10, visible: sequence.valid && sequence.timed && ["next","both"].includes(indicator ?? "") }} style={styles.ring}>
          <View
            style={styles.ring}
            accessible={false}
          />
</MotionPart>
          <Icon
            name="arrow-right"
            size="sm"
          />
        </Pressable>
      </View>
    </View>
)}</MotionPartScope>
  );
}
// @generated:end
