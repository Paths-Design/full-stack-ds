// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text as RNText, TextInput, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useFsdsTheme } from "../../tokens";
import { createSelectStyles } from "./Select.styles";
// @generated:end

// @generated:start types
export type SelectSize = "sm" | "md" | "lg";
export type SelectOption = { value: string; label: string; disabled?: boolean };
// @generated:end

// @generated:start props
export interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  defaultValue?: string | string[];
  onChange?: (value: string | string[]) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  multiple?: boolean;
  disabled?: boolean;
  triggerLabel?: string;
  size?: SelectSize;
  filterFn?: (option: SelectOption, searchTerm: string) => boolean;
  searchable?: boolean;
  empty?: boolean;
  placeholder?: string;
  searchLabel?: string;
  position?: "bottom" | "top" | "auto";
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Select({
  options = [{"value":"alpha","label":"Alpha"},{"value":"beta","label":"Beta"},{"value":"gamma","label":"Gamma"}],
  value: controlledSelection,
  open: controlledOpen,
  multiple,
  disabled,
  triggerLabel = "Select an option",
  searchable,
  empty,
  placeholder = "Select an option",
  searchLabel = "Search options",
  defaultValue = undefined,
  onChange,
  defaultOpen = false,
  onOpenChange,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: SelectProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createSelectStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledSelection, setUncontrolledSelection] = useState<string | string[]>((defaultValue ?? undefined) as string | string[]);
  const selection = controlledSelection ?? uncontrolledSelection;
  const setSelectionValue = useCallback((next: string | string[]) => {
    if (controlledSelection === undefined) setUncontrolledSelection(next);
    onChange?.(next);
  }, [controlledSelection, onChange]);

  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>((defaultOpen ?? false) as boolean);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpenValue = useCallback((next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }, [controlledOpen, onOpenChange]);

  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel ?? triggerLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
      accessibilityState={{ expanded: String(open) === "true", disabled: String(disabled) === "true" }}
    >
      <Pressable
        style={styles.trigger}
        disabled={disabled}
        accessibilityLabel={triggerLabel}
        onPress={() => setOpenValue(!open)}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled, expanded: String(open) === "true" }}
      >
        <View
          style={styles.text}
        >
          <RNText>{((options || []).filter(option => (Array.isArray(selection) ? selection : [selection]).includes(option.value)).map(option => option.label).join(', ') || placeholder)}</RNText>
        </View>
      </Pressable>
      {open ? (
      <View
        style={styles.content}
      >
        {searchable ? (
        <View
          style={styles.search}
        >
          <TextInput
            style={styles.searchInput}
            accessibilityLabel={searchLabel}
            editable={!(disabled)}
            accessibilityState={{ disabled: disabled }}
          />
        </View>
        ) : null}
        <View
          style={styles.options}
        >
          {(options ?? []).map((item, index) => (
              <Pressable
                key={index}
                style={styles.option}
                disabled={item.disabled}
                onPress={() => setSelectionValue(multiple ? ((Array.isArray(selection) ? selection : selection == null ? [] : [selection]).includes(item.value) ? (Array.isArray(selection) ? selection : selection == null ? [] : [selection]).filter((v) => v !== item.value) : [...(Array.isArray(selection) ? selection : selection == null ? [] : [selection]), item.value]) : item.value)}
                accessibilityState={{ selected: String(Array.isArray(selection) ? selection.includes(item.value) : item.value === selection) === "true", disabled: item.disabled }}
              >
                <View
                  style={styles.root}
                >
                  <RNText>{item.label}</RNText>
                </View>
              </Pressable>
            ))}
        </View>
        {empty ? (
        <View
          style={styles.emptyState}
        />
        ) : null}
      </View>
      ) : null}
    </View>
  );
}
// @generated:end
