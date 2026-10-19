// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useFsdsTheme } from "../../tokens";
import { createToastStyles } from "./Toast.styles";
import { resolveToastTokens } from "./Toast.tokens";
import { useFsdsMessages } from "../../primitives/messages";
// @generated:end

// @generated:start types
export type ToastVariant = "info" | "success" | "warning" | "error";
export type ToastPoliteness = "polite" | "assertive";
// @generated:end

// @generated:start props
export interface ToastProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  variant?: ToastVariant;
  politeness?: ToastPoliteness;
  duration?: number | null;
  slots?: {
    action?: ReactNode;
  };
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
const ToastMessages = { regionLabel: "Notifications", dismiss: "Dismiss" };

export function Toast({
  open: controlledOpen,
  title,
  politeness = "polite",
  duration,
  onOpenChange,
  slots,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: ToastProps) {
  const fsdsMessages = useFsdsMessages("Toast", ToastMessages);
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createToastStyles(fsdsTheme), [fsdsTheme]);
  const tokens = useMemo(() => resolveToastTokens(fsdsTheme), [fsdsTheme]);
  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>((false) as boolean);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpenValue = useCallback((next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }, [controlledOpen, onOpenChange]);

  const autoDismissDuration = duration === undefined ? (tokens.root?.["toast.timing.auto-dismiss"] as number | undefined) : duration;
  useEffect(() => {
    if (!open || typeof autoDismissDuration !== "number" || autoDismissDuration <= 0) return;
    const timer = setTimeout(() => setOpenValue(false), autoDismissDuration);
    return () => clearTimeout(timer);
  }, [open, autoDismissDuration, setOpenValue]);

  return (
    <View
      testID={testID}
      style={[styles.viewport, style]}
      accessibilityLabel={accessibilityLabel ?? fsdsMessages.regionLabel}
      accessibilityLiveRegion={politeness}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      {open ? (
      <View
        style={styles.item}
      >
        <View
          style={styles.row}
        >
          {title ? (
          <View
            style={styles.title}
          >
            <RNText>{title}</RNText>
          </View>
          ) : null}
          <View
            style={styles.description}
          >
            {typeof children === "string" ? <RNText>{children}</RNText> : children}
          </View>
          {slots?.action ? (
          <View
            style={styles.action}
          >
            {slots?.action}
          </View>
          ) : null}
          <Pressable
            style={styles.close}
            accessibilityLabel={fsdsMessages.dismiss}
            onPress={() => setOpenValue(!open)}
            accessibilityRole="button"
          />
        </View>
      </View>
      ) : null}
    </View>
  );
}
// @generated:end
