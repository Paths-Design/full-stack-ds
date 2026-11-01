// @generated:start imports
import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";
import { type ReactNode, useMemo } from "react";
import { renderTextChildren } from "../../primitives/text-children";
import { useFsdsTheme } from "../../tokens";
import { createProfileFlagStyles } from "./ProfileFlag.styles";
// @generated:end

// @generated:start types
export type ProfileFlagData = { id: string; username: string; full_name: string; first_name: string | null; last_name: string | null; avatar_url: string | null; bio: string; occupation: string | null; account_status: string; created_at: string; updated_at: string | null };
// @generated:end

// @generated:start props
export interface ProfileFlagProps {
  profile?: ProfileFlagData;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityLabelledBy?: string | string[];
}
// @generated:end

// @generated:start component
export function ProfileFlag({
  children,
  style,
  testID,
  accessibilityLabel,
  accessibilityLabelledBy,
}: ProfileFlagProps) {
  const fsdsTheme = useFsdsTheme();
  const styles = useMemo(() => createProfileFlagStyles(fsdsTheme), [fsdsTheme]);
  return (
    <View
      testID={testID}
      style={[styles.root, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityLabelledBy={accessibilityLabelledBy}
    >
      {renderTextChildren(children, { style: styles.rootText })}
    </View>
  );
}
// @generated:end
