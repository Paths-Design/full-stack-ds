// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text as RNText, View } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useTransferList } from "../../primitives/hooks/useTransferList";
import { useFsdsTheme } from "../../tokens";
import { createShuttleStyles } from "./Shuttle.styles";
import { useFsdsMessages } from "../../primitives/messages";
// @generated:end

// @generated:start types

// @generated:end

// @generated:start props
export interface ShuttleProps {
  ariaLabel?: string;
  options?: string[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
const ShuttleMessages = { availableLabel: "Available", selectedLabel: "Selected", add: "Add", remove: "Remove" };

export function Shuttle({
  ariaLabel,
  options = ["alpha","beta","gamma","delta","epsilon"],
  value: controlledSelection,
  defaultValue = undefined,
  onValueChange,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: ShuttleProps) {
  const fsdsMessages = useFsdsMessages("Shuttle", ShuttleMessages);
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createShuttleStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledSelection, setUncontrolledSelection] = useState<string[]>((defaultValue ?? undefined) as string[]);
  const selection = controlledSelection !== undefined ? controlledSelection : uncontrolledSelection;
  const setSelectionValue = useCallback((next: string[]) => {
    if (controlledSelection === undefined) setUncontrolledSelection(next);
    onValueChange?.(next);
  }, [controlledSelection, onValueChange]);

  const transfer = useTransferList({ options: options, value: selection, onValueChange: setSelectionValue });
  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel ?? ariaLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      <View
        style={styles.list}
        accessibilityLabel={fsdsMessages.availableLabel}
      >
        {(transfer.state.available ?? []).map((item, index) => (
            <Pressable
              key={index}
              style={styles.item}
              onPress={() => transfer.toggle(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: String(item.marked) === "true" }}
            >
              <View
              >
                <RNText>{item.label}</RNText>
              </View>
            </Pressable>
          ))}
      </View>
      <View
        style={styles.controls}
      >
        <Pressable
          style={styles.add}
          disabled={transfer.state.addDisabled}
          onPress={transfer.add}
          accessibilityRole="button"
          accessibilityState={{ disabled: transfer.state.addDisabled }}
        >
          <RNText>{fsdsMessages.add}</RNText>
        </Pressable>
        <Pressable
          style={styles.remove}
          disabled={transfer.state.removeDisabled}
          onPress={transfer.remove}
          accessibilityRole="button"
          accessibilityState={{ disabled: transfer.state.removeDisabled }}
        >
          <RNText>{fsdsMessages.remove}</RNText>
        </Pressable>
      </View>
      <View
        style={styles.list}
        accessibilityLabel={fsdsMessages.selectedLabel}
      >
        {(transfer.state.selected ?? []).map((item, index) => (
            <Pressable
              key={index}
              style={styles.item}
              onPress={() => transfer.toggle(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: String(item.marked) === "true" }}
            >
              <View
              >
                <RNText>{item.label}</RNText>
              </View>
            </Pressable>
          ))}
      </View>
    </View>
  );
}
// @generated:end
