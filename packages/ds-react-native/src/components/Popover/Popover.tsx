// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Dimensions, Modal, Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { useFsdsTheme } from "../../tokens";
import { createPopoverStyles } from "./Popover.styles";
// @generated:end

// @generated:start types
export type PopoverPlacement = "top" | "bottom" | "left" | "right" | "auto";
// @generated:end

// @generated:start props
export interface PopoverProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: PopoverPlacement;
  disabled?: boolean;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  closeOnBlur?: boolean;
  content?: ReactNode;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Popover({
  open: controlledOpen,
  placement,
  disabled,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  defaultOpen = false,
  onOpenChange,
  content,
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: PopoverProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createPopoverStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>((defaultOpen ?? false) as boolean);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpenValue = useCallback((next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }, [controlledOpen, onOpenChange]);

  const anchorRef = useRef<View>(null);
  const [anchorRect, setAnchorRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const openFromAnchor = useCallback(() => {
    if (disabled) return;
    const node = anchorRef.current;
    if (!node) {
      setOpenValue(true);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      setAnchorRect({ x, y, width, height });
      setOpenValue(true);
    });
  }, [disabled, setOpenValue]);
  const contentPosition = (() => {
    if (!anchorRect) return { position: "absolute" as const, left: 0, top: 0 };
    const gap = 8;
    const windowSize = Dimensions.get("window");
    if (placement === "top") return { position: "absolute" as const, left: anchorRect.x, bottom: windowSize.height - anchorRect.y + gap };
    if (placement === "left") return { position: "absolute" as const, right: windowSize.width - anchorRect.x + gap, top: anchorRect.y };
    if (placement === "right") return { position: "absolute" as const, left: anchorRect.x + anchorRect.width + gap, top: anchorRect.y };
    void windowSize;
    return { position: "absolute" as const, left: anchorRect.x, top: anchorRect.y + anchorRect.height + gap };
  })();

  return (
    <>
      <Pressable
        ref={anchorRef}
        testID={testID}
        style={[styles.trigger, style]}
        disabled={disabled}
        onPress={() => { if (open) { setOpenValue(false); } else { openFromAnchor(); } }}
        accessibilityLabel={accessibilityLabel}
        accessibilityLabelledBy={accessibilityLabelledBy}
        accessibilityState={{ expanded: Boolean(open) }}
      >
        {typeof children === "string" ? <RNText>{children}</RNText> : children}
      </Pressable>
      <Modal
        visible={Boolean(open)}
        transparent
        animationType="fade"
        onRequestClose={() => { if (closeOnEscape ?? true) setOpenValue(false); }}
      >
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={() => { if (closeOnOutsideClick ?? true) setOpenValue(false); }}
          accessible={false}
        >
          <View style={[styles.content, contentPosition]}>
            {typeof content === "string" ? <RNText>{content}</RNText> : content}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
// @generated:end
