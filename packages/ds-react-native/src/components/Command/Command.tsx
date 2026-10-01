// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Modal, Pressable, TextInput, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { MotionPart, MotionPartScope } from "../../primitives/motion-parts";
import { useFsdsTheme } from "../../tokens";
import { createCommandStyles } from "./Command.styles";
import { Icon } from "../Icon/Icon";
// @generated:end

// @generated:start types

// @generated:end

// @generated:start props
export interface CommandProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  search?: string;
  defaultSearch?: string;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  searchLabel?: string;
  emptyMessage?: string;
  label?: string;
  shouldFilter?: boolean;
  filter?: ((value: string, search: string) => number) | undefined;
  slots?: {
    items?: ReactNode;
  };
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Command({
  open: controlledOpen,
  search: controlledSearch,
  placeholder = "Search...",
  searchLabel = "Search commands",
  label = "Command palette",
  defaultOpen = false,
  onOpenChange,
  defaultSearch = "",
  onSearchChange,
  slots,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: CommandProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createCommandStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>((defaultOpen ?? false) as boolean);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpenValue = useCallback((next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }, [controlledOpen, onOpenChange]);

  const [uncontrolledSearch, setUncontrolledSearch] = useState<string>((defaultSearch ?? "") as string);
  const search = controlledSearch ?? uncontrolledSearch;
  const setSearchValue = useCallback((next: string) => {
    if (controlledSearch === undefined) setUncontrolledSearch(next);
    onSearchChange?.(next);
  }, [controlledSearch, onSearchChange]);

  return (
    <Modal
      visible={Boolean(open)}
      transparent
      animationType="fade"
      onRequestClose={() => setOpenValue(false)}
    >
<MotionPartScope>{motionParts => (
      <View
        testID={testID}
        style={[styles.root, style]}
        accessibilityLabel={accessibilityLabel}
        accessibilityLabelledBy={accessibilityLabelledBy}
      >
        {open ? (
<MotionPart projection={motionParts["overlay"]} style={styles.overlay}>
        <Pressable
          style={styles.overlay}
          onPress={() => setOpenValue(false)}
          accessible={false}
        />
</MotionPart>
        ) : null}
        {open ? (
        <View
          style={styles.dialog}
          accessibilityLabel={label}
        >
          <View
            style={styles.inputWrapper}
          >
            <Icon
              name="search"
              size="sm"
            />
            <TextInput
              style={styles.input}
              accessibilityLabel={searchLabel}
              placeholder={placeholder}
              value={String(search ?? "")}
              onChangeText={(next: string) => setSearchValue(next)}
              accessibilityState={{ expanded: String(open) === "true" }}
            />
          </View>
          <View
            style={styles.list}
          >
            <View
              style={styles.empty}
            />
            {slots?.items}
<MotionPart projection={motionParts["separator"]} style={styles.separator}>
            <View
              style={styles.separator}
              accessible={false}
            />
</MotionPart>
          </View>
        </View>
        ) : null}
      </View>
)}</MotionPartScope>
    </Modal>
  );
}
// @generated:end
