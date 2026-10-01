// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { BackHandler, Modal, Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { MotionPart, MotionPartScope } from "../../primitives/motion-parts";
import { useFsdsTheme } from "../../tokens";
import { createDialogStyles } from "./Dialog.styles";
// @generated:end

// @generated:start types
export type DialogSize = "sm" | "md" | "lg" | "xl" | "full";
// @generated:end

// @generated:start props
export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  size?: DialogSize;
  dismissible?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdropClick?: boolean;
  initialFocus?: string;
  returnFocus?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  slots?: {
    title?: ReactNode;
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
export function Dialog({
  open: controlledOpenness,
  modal = true,
  closeOnEscape = true,
  closeOnBackdropClick = true,
  ariaLabel,
  defaultOpen = false,
  onOpenChange,
  slots,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: DialogProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createDialogStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledOpenness, setUncontrolledOpenness] = useState<boolean>((defaultOpen ?? false) as boolean);
  const openness = controlledOpenness ?? uncontrolledOpenness;
  const setOpennessValue = useCallback((next: boolean) => {
    if (controlledOpenness === undefined) setUncontrolledOpenness(next);
    onOpenChange?.(next);
  }, [controlledOpenness, onOpenChange]);

  useEffect(() => {
    if (modal || !openness) return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!(closeOnEscape ?? true)) return false;
      setOpennessValue(false);
      return true;
    });
    return () => subscription.remove();
  }, [modal, openness, setOpennessValue, closeOnEscape]);

  const surfaceTree = (
<MotionPartScope>{motionParts => (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      {openness && modal ? (
<MotionPart projection={motionParts["backdrop"]} style={styles.backdrop}>
      <Pressable
        style={styles.backdrop}
        onPress={() => { if (closeOnBackdropClick ?? true) setOpennessValue(false); }}
        accessible={false}
      />
</MotionPart>
      ) : null}
      {openness ? (
      <View
        style={styles.modal}
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
          <Pressable
            style={styles.closeButton}
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
      animationType="fade"
      onRequestClose={() => { if (closeOnEscape ?? true) setOpennessValue(false); }}
    >
      {surfaceTree}
    </Modal>
  );
}
// @generated:end
