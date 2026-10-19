// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Text as RNText, View } from "react-native";
import { type ReactNode, useMemo, useState } from "react";
import { useFsdsTheme } from "../../tokens";
import { createShuttleStyles } from "./Shuttle.styles";
// @generated:end

// @generated:start types

// @generated:end

// @generated:start props
export interface ShuttleProps {
  ariaLabel?: string;
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
export function Shuttle({
  ariaLabel,
  value: controlledSelection,
  defaultValue = undefined,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: ShuttleProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createShuttleStyles(fsdsTheme), [fsdsTheme]);
  const [uncontrolledSelection] = useState<string[]>((defaultValue ?? undefined) as string[]);
  const selection = controlledSelection !== undefined ? controlledSelection : uncontrolledSelection;

  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel ?? ariaLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      {(selection ?? []).map((item, index) => (
          <View
            key={index}
            style={styles.item}
          >
            <View
              style={styles.root}
            >
              <RNText>{item}</RNText>
            </View>
          </View>
        ))}
    </View>
  );
}
// @generated:end
