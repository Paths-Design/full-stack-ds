// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { Switch as RNSwitch } from "react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useFsdsTheme } from "../../tokens";
import { createSwitchStyles } from "./Switch.styles";
import { resolveSwitchTokens } from "./Switch.tokens";
// @generated:end

// @generated:start types
export type SwitchSize = "sm" | "md" | "lg";
// @generated:end

// @generated:start props
export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  size?: SwitchSize;
  disabled?: boolean;
  name?: string;
  value?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function Switch({
  checked: controlledChecked,
  size = "md",
  disabled,
  defaultChecked = false,
  onChange,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: SwitchProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createSwitchStyles(fsdsTheme), [fsdsTheme]);
  const tokens = useMemo(() => resolveSwitchTokens(fsdsTheme), [fsdsTheme]);
  const [uncontrolledChecked, setUncontrolledChecked] = useState<boolean>((defaultChecked ?? false) as boolean);
  const checked = controlledChecked ?? uncontrolledChecked;
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
      trackColor={{ false: (tokens.root?.["switch.color.track.background"] as string | undefined), true: (tokens.checked?.["switch.color.track.background"] as string | undefined) ?? (tokens.root?.["switch.color.track.background"] as string | undefined) }}
      ios_backgroundColor={(tokens.root?.["switch.color.track.background"] as string | undefined)}
      thumbColor={(tokens.checked?.["switch.color.thumb.background"] as string | undefined) ?? (tokens.root?.["switch.color.thumb.background"] as string | undefined)}
    />
  );
}
// @generated:end
