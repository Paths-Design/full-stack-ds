// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useFsdsTheme } from "../../tokens";
import { createWalkthroughStyles } from "./Walkthrough.styles";
import { useFsdsMessages } from "../../primitives/messages";
// @generated:end

// @generated:start types
export type WalkthroughPlacement = "top" | "bottom" | "left" | "right" | "auto";
export type WalkthroughStepSpec = { anchor: string; title: string; description?: string };
// @generated:end

// @generated:start props
export interface WalkthroughProps {
  steps?: WalkthroughStepSpec[];
  index?: number;
  defaultIndex?: number;
  onStepChange?: (index: number) => void;
  onComplete?: () => void;
  onSkip?: () => void;
  label?: string;
  storageKey?: string;
  autoStart?: boolean;
  closeOnOutsideClick?: boolean;
  placement?: WalkthroughPlacement;
  onPrevious?: () => void;
  onNext?: () => void;
  previousDisabled?: boolean;
  nextLabel?: string;
  progressLabel?: string;
  slots?: {
    title?: ReactNode;
    description?: ReactNode;
  };
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
const WalkthroughMessages = { tourLabel: "Feature tour", skip: "Skip", skipTour: "Skip tour", previous: "Previous", previousStep: "Previous step", next: "Next" };

export function Walkthrough({
  steps = [{"anchor":"#step-1","title":"Welcome to the tour"},{"anchor":"#step-2","title":"Browse your dashboard"},{"anchor":"#step-3","title":"Configure preferences"}],
  index: controlledStep,
  onSkip,
  label: labelProp,
  onPrevious,
  onNext,
  previousDisabled = false,
  nextLabel: nextLabelProp,
  progressLabel,
  defaultIndex = 0,
  onStepChange,
  slots,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: WalkthroughProps) {
  const fsdsMessages = useFsdsMessages("Walkthrough", WalkthroughMessages);
  const label = labelProp ?? fsdsMessages.tourLabel;
  const nextLabel = nextLabelProp ?? fsdsMessages.next;
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createWalkthroughStyles(fsdsTheme), [fsdsTheme]);
  const [, setUncontrolledStep] = useState<number>((defaultIndex ?? 0) as number);
  const setStepValue = useCallback((next: number) => {
    if (controlledStep === undefined) setUncontrolledStep(next);
    onStepChange?.(next);
  }, [controlledStep, onStepChange]);

  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <View
        style={styles.content}
      >
        <View
          style={styles.title}
          accessibilityLabel={label}
        >
          {slots?.title}
        </View>
        <RNText
          style={styles.description}
          accessibilityRole="text"
        >
          {slots?.description}
        </RNText>
      </View>
      <View
        style={styles.controls}
      >
        <Pressable
          style={styles.skip}
          accessibilityLabel={fsdsMessages.skipTour}
          onPress={() => onSkip?.()}
          accessibilityRole="button"
        >
          <RNText>{fsdsMessages.skip}</RNText>
        </Pressable>
        <Pressable
          style={styles.prev}
          accessibilityLabel={fsdsMessages.previousStep}
          disabled={previousDisabled}
          onPress={() => onPrevious?.()}
          accessibilityRole="button"
          accessibilityState={{ disabled: previousDisabled }}
        >
          <RNText>{fsdsMessages.previous}</RNText>
        </Pressable>
        <View
          style={styles.dots}
        >
          {(steps ?? []).map((item, index) => (
              <Pressable
                key={index}
                style={styles.dot}
                accessibilityLabel={item.title}
                onPress={() => setStepValue(index)}
                accessibilityRole="button"
              />
            ))}
        </View>
        <View
          style={styles.counter}
        >
          <RNText>{progressLabel}</RNText>
        </View>
        <Pressable
          style={styles.next}
          accessibilityLabel={nextLabel}
          onPress={() => onNext?.()}
          accessibilityRole="button"
        >
          <RNText>{nextLabel}</RNText>
        </Pressable>
      </View>
    </View>
  );
}
// @generated:end
