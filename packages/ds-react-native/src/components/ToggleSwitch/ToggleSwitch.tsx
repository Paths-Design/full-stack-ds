// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Switch as RNSwitch } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useFsdsTheme } from "../../tokens";
import { createToggleSwitchStyles } from "./ToggleSwitch.styles";
import { resolveToggleSwitchTokens } from "./ToggleSwitch.tokens";
// @generated:end

// @generated:start types
export type ToggleSwitchSize = "small" | "medium" | "large";
// @generated:end

// @generated:start props
export interface ToggleSwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  size?: ToggleSwitchSize;
  disabled?: boolean;
  ariaLabel?: string;
  ariaDescribedby?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function ToggleSwitch({
  checked: controlledChecked,
  size = "medium",
  disabled,
  defaultChecked = false,
  onChange,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: ToggleSwitchProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createToggleSwitchStyles(fsdsTheme), [fsdsTheme]);
  const tokens = useMemo(() => resolveToggleSwitchTokens(fsdsTheme), [fsdsTheme]);
  const [uncontrolledChecked, setUncontrolledChecked] = useState<boolean>((defaultChecked ?? false) as boolean);
  const checked = controlledChecked !== undefined ? controlledChecked : uncontrolledChecked;
  const setCheckedValue = useCallback((next: boolean) => {
    if (controlledChecked === undefined) setUncontrolledChecked(next);
    onChange?.(next);
  }, [controlledChecked, onChange]);

  return (
    <RNSwitch
      testID={testID}
      style={[styles[`root_${size}`] ?? styles.root, style]}
      value={checked}
      onValueChange={setCheckedValue}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
      accessibilityRole="switch"
      accessibilityState={{ checked: checked, disabled: disabled }}
      trackColor={{ false: (tokens.root?.["toggle-switch.color.background.default"] as string | undefined), true: (tokens.root?.["toggle-switch.color.background.checked"] as string | undefined) }}
      ios_backgroundColor={(tokens.root?.["toggle-switch.color.background.default"] as string | undefined)}
    />
  );
}
// @generated:end
