// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { BackHandler, Modal, Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { MotionPart, MotionPartScope } from "../../primitives/motion-parts";
import { useFsdsTheme } from "../../tokens";
import { createSheetStyles } from "./Sheet.styles";
// @generated:end

// @generated:start types
export type SheetSide = "top" | "right" | "bottom" | "left";
// @generated:end

// @generated:start props
export interface SheetProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: SheetSide;
  modal?: boolean;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  slots?: {
    title?: ReactNode;
    description?: ReactNode;
    footer?: ReactNode;
  };
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Sheet({
  open: controlledOpenness,
  modal = true,
  ariaLabel,
  defaultOpen = false,
  onOpenChange,
  slots,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: SheetProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createSheetStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledOpenness, setUncontrolledOpenness] = useState<boolean>((defaultOpen ?? false) as boolean);
  const openness = controlledOpenness ?? uncontrolledOpenness;
  const setOpennessValue = useCallback((next: boolean) => {
    if (controlledOpenness === undefined) setUncontrolledOpenness(next);
    onOpenChange?.(next);
  }, [controlledOpenness, onOpenChange]);

  useEffect(() => {
    if (modal || !openness) return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setOpennessValue(false);
      return true;
    });
    return () => subscription.remove();
  }, [modal, openness, setOpennessValue]);

  const surfaceTree = (
<MotionPartScope>{motionParts => (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      {openness && modal ? (
<MotionPart projection={motionParts["overlay"]} style={styles.overlay}>
      <Pressable
        style={styles.overlay}
        onPress={() => setOpennessValue(false)}
        accessible={false}
      />
</MotionPart>
      ) : null}
      {openness ? (
      <View
        style={styles.content}
        accessibilityLabel={ariaLabel}
      >
        <View
          style={styles.header}
        >
          <View
            style={styles.title}
          >
            {slots?.title}
          </View>
          <RNText
            style={styles.description}
            accessibilityRole="text"
          >
            {slots?.description}
          </RNText>
          <Pressable
            style={styles.close}
            onPress={() => setOpennessValue(false)}
            accessibilityRole="button"
          />
        </View>
        <View
          style={styles.body}
        >
          {typeof children === "string" ? <RNText>{children}</RNText> : children}
        </View>
        <View
          style={styles.footer}
        >
          {slots?.footer}
        </View>
      </View>
      ) : null}
    </View>
)}</MotionPartScope>
  );
  if (!modal) return openness ? surfaceTree : null;
  return (
    <Modal
      visible={Boolean(openness)}
      transparent
      animationType="slide"
      onRequestClose={() => setOpennessValue(false)}
    >
      {surfaceTree}
    </Modal>
  );
}
// @generated:end
